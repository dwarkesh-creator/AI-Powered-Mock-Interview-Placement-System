"""
vision_analyzer.py
-------------------
Standalone facial-emotion analysis module for PlaceAI.

This is the Python/OpenCV counterpart to the browser-based face-api.js
pipeline used in Frontend/interview.html. The browser version runs
face-api.js live inside interview.html for zero-latency, in-session
proctoring. This module exists for everything that doesn't happen live
in a browser tab: batch-analyzing recorded footage, offline evaluation,
CI test coverage for the vision pipeline, or a future server-side
proctoring endpoint.

Pipeline
    1. Face detection -> OpenCV Haar Cascade (ships with opencv-python,
       no download required).
    2. Emotion model   -> a 93 KB quantized TFLite CNN trained on FER2013,
       vendored from the open-source `fer` project (MIT License — see
       THIRD_PARTY_NOTICES.md for the full attribution).
    3. Scoring          -> mirrors the confidence formula used client-side
       in interview.html's computeFinalScores():
           confidence = 0.7 * (happy + neutral) + 0.3 * presence_rate
       so a session scored by this module and one scored in the browser
       are directly comparable.
"""

import os
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np
import tensorflow as tf

EMOTION_LABELS = ["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"]
_DEFAULT_MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "emotion_model_quantized.tflite")


@dataclass
class FrameResult:
    """Result of analyzing a single frame."""
    face_found: bool
    emotions: Dict[str, float] = field(default_factory=dict)
    dominant_emotion: Optional[str] = None
    box: Optional[Tuple[int, int, int, int]] = None  # (x, y, w, h)


@dataclass
class SessionSummary:
    """Aggregate result across every frame seen since the last reset."""
    frames_analyzed: int
    frames_with_face: int
    presence_rate: float
    avg_emotions: Dict[str, float]
    confidence_score: int  # 0-100, same scale/formula as the browser version
    dominant_emotions: List[Tuple[str, int]]  # top 3 as (label, pct)


def compute_confidence_score(avg_emotions: Dict[str, float], presence_rate: float) -> int:
    """Pure scoring function, isolated so it can be unit-tested without
    touching the camera, OpenCV, or TensorFlow at all.

    Matches computeFinalScores() in Frontend/interview.html:
        emotionScore = min(100, confident*100*0.7 + presenceRate*100*0.3)
        where confident = avg.happy + avg.neutral
    """
    confident = avg_emotions.get("happy", 0.0) + avg_emotions.get("neutral", 0.0)
    score = confident * 100 * 0.7 + presence_rate * 100 * 0.3
    return round(min(100, max(0, score)))


class VisionAnalyzer:
    """Detects a face in a frame and classifies its emotion, then lets you
    roll many frames up into one session-level confidence score.
    """

    def __init__(self, cascade_path: Optional[str] = None, model_path: str = _DEFAULT_MODEL_PATH):
        cascade_file = cascade_path or os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")
        self.face_detector = cv2.CascadeClassifier(cascade_file)
        if self.face_detector.empty():
            raise RuntimeError(f"Could not load Haar cascade from: {cascade_file}")

        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"Emotion model not found at {model_path}. "
                "Did you check out the models/ directory with the repo?"
            )
        self.interpreter = tf.lite.Interpreter(model_path=model_path)
        self.interpreter.allocate_tensors()
        self._input_details = self.interpreter.get_input_details()
        self._output_details = self.interpreter.get_output_details()

        self._reset_session()

    def _reset_session(self) -> None:
        self._frame_count = 0
        self._face_count = 0
        self._emotion_totals = {label: 0.0 for label in EMOTION_LABELS}

    def analyze_frame(self, frame_bgr: np.ndarray) -> FrameResult:
        """Run face detection + emotion classification on a single BGR frame
        (as returned by cv2.VideoCapture.read() or cv2.imread()).
        """
        self._frame_count += 1
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        faces = self.face_detector.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60)
        )

        if len(faces) == 0:
            return FrameResult(face_found=False)

        # if more than one face is in frame, score the largest (closest to camera)
        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
        face_roi = gray[y:y + h, x:x + w]
        emotions = self._classify(face_roi)

        self._face_count += 1
        for label, score in emotions.items():
            self._emotion_totals[label] += score

        dominant = max(emotions, key=emotions.get)
        return FrameResult(face_found=True, emotions=emotions, dominant_emotion=dominant, box=(x, y, w, h))

    def _classify(self, face_gray: np.ndarray) -> Dict[str, float]:
        face = cv2.resize(face_gray, (64, 64)).astype("float32")
        face = (face / 255.0 - 0.5) * 2.0  # normalize to [-1, 1], matches training preprocessing
        face = face.reshape(1, 64, 64, 1)

        self.interpreter.set_tensor(self._input_details[0]["index"], face)
        self.interpreter.invoke()
        output = self.interpreter.get_tensor(self._output_details[0]["index"])[0]

        return {label: round(float(score), 4) for label, score in zip(EMOTION_LABELS, output)}

    def summarize_session(self) -> SessionSummary:
        """Roll up everything seen since the last reset into one score, then
        reset for the next question/session.
        """
        presence_rate = self._face_count / self._frame_count if self._frame_count else 0.0
        avg_emotions = (
            {k: round(v / self._face_count, 4) for k, v in self._emotion_totals.items()}
            if self._face_count else {label: 0.0 for label in EMOTION_LABELS}
        )

        confidence_score = compute_confidence_score(avg_emotions, presence_rate)

        ranked = sorted(avg_emotions.items(), key=lambda kv: kv[1], reverse=True)
        dominant_emotions = [(label, round(score * 100)) for label, score in ranked[:3] if score > 0.01]

        summary = SessionSummary(
            frames_analyzed=self._frame_count,
            frames_with_face=self._face_count,
            presence_rate=round(presence_rate, 3),
            avg_emotions=avg_emotions,
            confidence_score=confidence_score,
            dominant_emotions=dominant_emotions,
        )
        self._reset_session()
        return summary
