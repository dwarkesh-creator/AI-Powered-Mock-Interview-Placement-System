"""
vision_analyzer.py
-------------------
Standalone facial-emotion analysis module for NilGen.

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


def quantize_input(face_float: np.ndarray, input_detail: dict) -> np.ndarray:
    """Convert a float32, [-1, 1]-normalized face image into whatever dtype
    the TFLite model actually expects.

    Quantized models (dtype uint8/int8) store an int approximation of a
    real value: real = (quantized - zero_point) * scale. To go the other
    way -- real value in, quantized value out -- invert that:
        quantized = real / scale + zero_point
    Float models (dtype float32) need no conversion at all.

    Pulled out as a standalone, pure function (no camera/model required)
    so it's unit-testable on its own, the same way compute_confidence_score
    is above.
    """
    dtype = input_detail["dtype"]
    if dtype in (np.uint8, np.int8):
        scale, zero_point = input_detail["quantization"]
        if scale == 0:  # (0.0, 0) means "no quantization info", treat as raw
            return face_float.astype(dtype)
        quantized = np.round(face_float / scale + zero_point)
        # Clip to the dtype's representable range before casting. Without
        # this, any input that lands even slightly outside what the model
        # was calibrated for (lighting, exposure, upstream preprocessing
        # drift...) silently wraps around -- e.g. -25.6 becomes 231, not 0 --
        # instead of clamping to a valid, if saturated, value.
        info = np.iinfo(dtype)
        quantized = np.clip(quantized, info.min, info.max)
        return quantized.astype(dtype)
    return face_float.astype(dtype)


def dequantize_output(output: np.ndarray, output_detail: dict) -> np.ndarray:
    """Inverse of quantize_input, applied to the model's output tensor, so
    the returned scores are always comparable floats regardless of whether
    the underlying model is quantized.
    """
    dtype = output_detail["dtype"]
    if dtype in (np.uint8, np.int8):
        scale, zero_point = output_detail["quantization"]
        if scale != 0:
            return (output.astype("float32") - zero_point) * scale
    return output.astype("float32")


class VisionAnalyzer:
    """Detects a face in a frame and classifies its emotion, then lets you
    roll many frames up into one session-level confidence score.
    """

    def __init__(self, cascade_path: Optional[str] = None, model_path: str = _DEFAULT_MODEL_PATH):
        # cv2.data is a real runtime attribute (the documented way to locate
        # bundled Haar cascades) but is missing from opencv-python's type
        # stubs, hence the ignore rather than a real fix.
        cascade_file = cascade_path or os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")  # type: ignore[attr-defined]
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

        dominant = max(emotions, key=lambda label: emotions[label])
        return FrameResult(face_found=True, emotions=emotions, dominant_emotion=dominant, box=(x, y, w, h))

    def _classify(self, face_gray: np.ndarray) -> Dict[str, float]:
        input_detail = self._input_details[0]
        _, in_h, in_w, in_c = input_detail["shape"]  # read the model's real expected size

        face = cv2.resize(face_gray, (in_w, in_h)).astype("float32")
        face = (face / 255.0 - 0.5) * 2.0  # normalize to [-1, 1], matches training preprocessing
        face = face.reshape(1, in_h, in_w, in_c)
        face = quantize_input(face, input_detail)

        self.interpreter.set_tensor(input_detail["index"], face)
        self.interpreter.invoke()

        output_detail = self._output_details[0]
        raw_output = self.interpreter.get_tensor(output_detail["index"])[0]
        output = dequantize_output(raw_output, output_detail)

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
