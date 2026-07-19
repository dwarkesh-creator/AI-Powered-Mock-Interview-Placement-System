"""
Confidence-scoring service — the visual half of the confidence score
(speaking pace, the other half, is computed in routes/interview.py
from the transcript + audio duration).

MediaPipe Face Mesh extracts per-frame landmarks; a couple of simple,
well-established geometric features are computed per frame and
combined across the whole answer.

This is a RULE-BASED v1, not a trained model — same spirit as the
GymAI pose classifier, but here we skip the LSTM step since a
"confidence" label is subjective and there's no labeled dataset to
train one on yet. `analyze_visual_confidence` is the swap point if
you build one later — feed it the same per-frame landmark features.

Note: `_face_mesh` is a single shared instance for simplicity. It is
NOT thread-safe for truly concurrent requests — fine for one student
at a time during dev/testing; give each request its own instance (or
add a lock) before running this under a multi-worker server.
"""
import base64

try:
    import numpy as np
    import cv2
    import mediapipe as mp
except ImportError:  # pragma: no cover - optional dependency
    np = None
    cv2 = None
    mp = None

if mp is not None and cv2 is not None and np is not None:
    try:
        _face_mesh = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
        )
    except Exception as _exc:
        import warnings as _w
        _w.warn(f"FaceMesh init failed ({_exc}); visual confidence scoring disabled.", RuntimeWarning)
        _face_mesh = None
else:
    _face_mesh = None

# Standard 6-point eye landmark sets used for Eye Aspect Ratio (EAR),
# a well-documented formula for eye-openness/blink detection.
_RIGHT_EYE = [33, 160, 158, 133, 153, 144]
_LEFT_EYE = [362, 385, 387, 263, 373, 380]
_NOSE_TIP = 1


def _decode_frame(data_url: str):
    """Decodes a base64 JPEG data URL (as sent by the frontend) into a BGR image."""
    if np is None or cv2 is None:
        return None

    try:
        _header, encoded = data_url.split(",", 1)
        img_bytes = base64.b64decode(encoded)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        return cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    except (ValueError, AttributeError):
        return None


def _eye_aspect_ratio(landmarks, eye_indices, w, h):
    if np is None:
        return 0.0

    pts = [(landmarks[i].x * w, landmarks[i].y * h) for i in eye_indices]
    p1, p2, p3, p4, p5, p6 = pts
    vertical = np.linalg.norm(np.array(p2) - np.array(p6)) + np.linalg.norm(
        np.array(p3) - np.array(p5)
    )
    horizontal = np.linalg.norm(np.array(p1) - np.array(p4))
    return vertical / (2.0 * horizontal) if horizontal else 0.0


def _extract_frame_features(data_url: str):
    if _face_mesh is None or np is None or cv2 is None:
        return None

    frame = _decode_frame(data_url)
    if frame is None:
        return None

    h, w = frame.shape[:2]
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    result = _face_mesh.process(rgb)

    if not result.multi_face_landmarks:
        return None  # no face detected in this frame (looked away, out of frame, etc.)

    landmarks = result.multi_face_landmarks[0].landmark
    nose = landmarks[_NOSE_TIP]
    ear = (
        _eye_aspect_ratio(landmarks, _RIGHT_EYE, w, h)
        + _eye_aspect_ratio(landmarks, _LEFT_EYE, w, h)
    ) / 2.0

    return {"nose_xy": (nose.x * w, nose.y * h), "ear": ear}


def analyze_visual_confidence(frames: list) -> dict:
    """
    `frames` is a list of base64 JPEG data URLs, sampled during
    recording by useInterviewRecorder on the frontend.

    Returns: { eyeContact: 0-100, steadiness: 0-100, facePresence: 0-100 }
    `pace` (the third breakdown key the frontend expects) is added by
    the route handler, since it comes from the transcript, not frames.
    """
    if not frames:
        return {"eyeContact": 30, "steadiness": 30, "facePresence": 0}

    if np is None:
        return {"eyeContact": 30, "steadiness": 30, "facePresence": 0}

    frame_features = [_extract_frame_features(f) for f in frames]
    detected = [f for f in frame_features if f is not None]
    presence_rate = len(detected) / len(frame_features)

    if not detected:
        return {"eyeContact": 30, "steadiness": 30, "facePresence": 0}

    nose_positions = np.array([f["nose_xy"] for f in detected])
    steadiness_raw = np.std(nose_positions, axis=0).mean()
    # Lower head movement = higher steadiness. Tuned for the 160x120
    # sampled frame size used by the frontend; ~15px std ~ "very steady".
    steadiness_score = float(np.clip(100 - steadiness_raw * 4, 0, 100))

    avg_ear = np.mean([f["ear"] for f in detected])
    # Typical open-eye EAR is roughly 0.25-0.35; scale into a 0-100 band.
    eye_score = float(np.clip((avg_ear - 0.15) / 0.20 * 100, 0, 100))

    # Frames where no face was found drag both scores down proportionally
    # to how often that happened, without fully zeroing out on a few
    # missed frames.
    dampener = 0.5 + 0.5 * presence_rate

    return {
        "eyeContact": round(eye_score * dampener),
        "steadiness": round(steadiness_score * dampener),
        "facePresence": round(presence_rate * 100),
    }
