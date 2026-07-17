"""
test_vision_analyzer.py
------------------------
Run with: pytest test_vision_analyzer.py -v

Covers three layers on purpose:
  1. compute_confidence_score() as a pure function -- no camera, no model,
     no I/O, so this always runs fast and deterministically.
  2. VisionAnalyzer loading its cascade + TFLite model successfully.
  3. A real end-to-end pass on a bundled test image, checking the output
     shape/invariants (probabilities sum to ~1, presence rate makes sense)
     rather than an exact score, since exact CNN outputs aren't a
     meaningful thing to hardcode-assert on.
"""

import os
import sys

import cv2
import numpy as np
import pytest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from vision_analyzer import VisionAnalyzer, compute_confidence_score

TEST_IMAGE = os.path.join(os.path.dirname(__file__), "test_face.jpg")


# ---------- 1. pure scoring function ----------

def test_score_all_happy_is_high():
    score = compute_confidence_score({"happy": 0.9, "neutral": 0.05}, presence_rate=1.0)
    assert score >= 80


def test_score_all_fearful_is_low():
    score = compute_confidence_score({"fear": 0.9, "sad": 0.05}, presence_rate=1.0)
    assert score <= 30


def test_score_no_data_is_zero():
    assert compute_confidence_score({}, presence_rate=0.0) == 0


def test_score_is_clamped_0_to_100():
    score = compute_confidence_score({"happy": 1.0, "neutral": 1.0}, presence_rate=1.0)
    assert 0 <= score <= 100


# ---------- 2. model loading ----------

@pytest.fixture(scope="module")
def analyzer():
    return VisionAnalyzer()


def test_analyzer_loads_without_error(analyzer):
    assert analyzer.face_detector is not None
    assert not analyzer.face_detector.empty()


# ---------- 3. end-to-end on a real image ----------

def test_detects_face_in_sample_image(analyzer):
    if not os.path.exists(TEST_IMAGE):
        pytest.skip("test_face.jpg not present -- see README for how to fetch a sample image")
    frame = cv2.imread(TEST_IMAGE)
    result = analyzer.analyze_frame(frame)
    assert result.face_found is True
    assert result.box is not None
    assert result.dominant_emotion in result.emotions


def test_emotion_probabilities_sum_to_one(analyzer):
    if not os.path.exists(TEST_IMAGE):
        pytest.skip("test_face.jpg not present")
    frame = cv2.imread(TEST_IMAGE)
    result = analyzer.analyze_frame(frame)
    total = sum(result.emotions.values())
    assert 0.98 <= total <= 1.02


def test_blank_frame_reports_no_face(analyzer):
    blank = np.zeros((480, 640, 3), dtype="uint8")
    result = analyzer.analyze_frame(blank)
    assert result.face_found is False
    assert result.box is None


def test_session_summary_resets_after_read(analyzer):
    blank = np.zeros((480, 640, 3), dtype="uint8")
    analyzer.analyze_frame(blank)
    summary_1 = analyzer.summarize_session()
    assert summary_1.frames_analyzed >= 1

    summary_2 = analyzer.summarize_session()
    assert summary_2.frames_analyzed == 0  # confirms the session reset
