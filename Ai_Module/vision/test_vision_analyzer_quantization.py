"""
test_vision_analyzer_quantization.py

Covers quantize_input / dequantize_output in isolation -- these are the
two functions that were silently wrong before (fixed dtype mismatch /
missing scale-zero_point handling for quantized TFLite models).

No camera, no .tflite file, no OpenCV/TensorFlow model loading required --
just numpy and the two pure functions.
"""

import os
import sys

import numpy as np
import pytest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from vision_analyzer import quantize_input, dequantize_output, EMOTION_LABELS


def test_quantize_input_passes_through_unchanged_for_float_models():
    face = np.array([[-1.0, 0.0, 1.0]], dtype="float32")
    detail = {"dtype": np.float32, "quantization": (0.0, 0)}
    result = quantize_input(face, detail)
    assert result.dtype == np.float32
    assert np.allclose(result, face)


def test_quantize_input_converts_to_uint8_using_scale_and_zero_point():
    face = np.array([[-0.9, 0.0, 0.9]], dtype="float32")
    # scale/zero_point for a symmetric [-1, 1] range (a common scheme for
    # quantized models whose float version expected [-1, 1] inputs)
    detail = {"dtype": np.uint8, "quantization": (1 / 127, 127)}
    result = quantize_input(face, detail)
    assert result.dtype == np.uint8
    recovered = (result.astype("float32") - 127) * (1 / 127)
    assert np.allclose(recovered, face, atol=1 / 127)


def test_quantize_input_handles_missing_quantization_info_gracefully():
    face = np.array([[-1.0, 0.0, 1.0]], dtype="float32")
    detail = {"dtype": np.uint8, "quantization": (0.0, 0)}  # (0.0, 0) == "not actually quantized"
    result = quantize_input(face, detail)
    assert result.dtype == np.uint8  # doesn't crash dividing by zero


def test_dequantize_output_recovers_probability_like_floats():
    # scale=1/255, zero_point=0 -- a typical uint8 quantization scheme
    raw_output = np.array([5, 10, 5, 200, 10, 5, 20], dtype=np.uint8)
    detail = {"dtype": np.uint8, "quantization": (1 / 255, 0)}
    scores = dequantize_output(raw_output, detail)
    assert scores.dtype == np.float32
    assert scores.sum() == pytest.approx(1.0, abs=0.01)
    # "happy" is index 3 in EMOTION_LABELS and has the largest raw value (200)
    assert EMOTION_LABELS[int(scores.argmax())] == "happy"


def test_dequantize_output_passes_through_unchanged_for_float_models():
    raw_output = np.array([0.1, 0.05, 0.05, 0.6, 0.05, 0.05, 0.1], dtype=np.float32)
    detail = {"dtype": np.float32, "quantization": (0.0, 0)}
    scores = dequantize_output(raw_output, detail)
    assert np.allclose(scores, raw_output)


def test_quantize_input_rounds_to_nearest_instead_of_truncating():
    # 0.512 truncates to 0 but should round to 1; truncation silently
    # biases every pixel downward instead of to the nearest representable value.
    face = np.array([[-0.996]], dtype="float32")
    detail = {"dtype": np.uint8, "quantization": (0.0078125, 128)}
    result = quantize_input(face, detail)
    assert result[0, 0] == 1  # (-0.996/0.0078125 + 128) = 0.512 -> rounds to 1


def test_quantize_input_clips_out_of_range_values_instead_of_wrapping():
    # Inputs a little outside the calibrated [-1, 1] range must clip to the
    # dtype's valid range (0/255 for uint8), not silently overflow/wrap
    # (e.g. -25.6 wrapping to 231, or 275.2 wrapping to 19) into a
    # completely different, garbage pixel value.
    face = np.array([[-1.2, 0.0, 1.15]], dtype="float32")
    detail = {"dtype": np.uint8, "quantization": (0.0078125, 128)}
    result = quantize_input(face, detail)
    assert list(result[0]) == [0, 128, 255]


def test_quantize_input_clips_int8_range_too():
    face = np.array([[-5.0, 5.0]], dtype="float32")
    detail = {"dtype": np.int8, "quantization": (1 / 127, 0)}
    result = quantize_input(face, detail)
    assert result.dtype == np.int8
    assert list(result[0]) == [-128, 127]


def test_quantize_then_dequantize_round_trip_is_close_to_original():
    original = np.array([[0.02, 0.02, 0.02, 0.78, 0.06, 0.02, 0.08]], dtype="float32")
    detail = {"dtype": np.uint8, "quantization": (1 / 255, 0)}
    quantized = quantize_input(original, detail)
    recovered = dequantize_output(quantized[0], detail)
    assert np.allclose(recovered, original[0], atol=1 / 255)
