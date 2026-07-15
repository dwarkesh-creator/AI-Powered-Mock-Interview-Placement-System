"""
test_feedback_generator.py

- TestFallbackFeedback: exercises the deterministic offline template path
  for real. No network calls, no API keys, no mocking of the code under
  test — this is the path CI runs by default and it costs nothing.

- TestApiPathIsMocked: confirms generate_feedback() picks the right
  provider when a key is present, WITHOUT ever hitting the network.
  _call_anthropic / _call_openai are patched out entirely, and a failure
  in either is confirmed to fall back to the template.

Written with unittest.TestCase so it runs identically under `python -m
unittest` and under `pytest` (pytest auto-discovers TestCase classes) —
no pytest-only syntax is used.
"""

import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import feedback_generator as fg  # noqa: E402


class TestFallbackFeedback(unittest.TestCase):
    """Exercises the deterministic, offline fallback path for real."""

    def setUp(self):
        # Ensure no API keys leak in from the host environment during these tests,
        # so the fallback path is genuinely exercised (zero network, zero cost).
        self._removed = {}
        for key in ("ANTHROPIC_API_KEY", "OPENAI_API_KEY"):
            if key in os.environ:
                self._removed[key] = os.environ.pop(key)

    def tearDown(self):
        os.environ.update(self._removed)

    def test_empty_scores_returns_message(self):
        result = fg.generate_feedback("some transcript", {})
        self.assertIn("No scores were provided", result)

    def test_template_includes_all_score_keys(self):
        scores = {"technical": 8, "communication": 4, "confidence": 6}
        result = fg.generate_feedback("transcript text", scores)
        self.assertIn("Technical", result)
        self.assertIn("Communication", result)
        self.assertIn("Confidence", result)
        self.assertIn("8/10", result)
        self.assertIn("4/10", result)

    def test_overall_average_is_correct(self):
        scores = {"technical": 8, "communication": 4}
        result = fg.generate_feedback("t", scores)
        self.assertIn("Overall score: 6.0/10", result)

    def test_strengths_and_weaknesses_flagged(self):
        scores = {"technical": 9, "communication": 3}
        result = fg.generate_feedback("t", scores)
        self.assertIn("Strengths:", result)
        self.assertIn("technical", result.lower())
        self.assertIn("Areas to improve:", result)
        self.assertIn("communication", result.lower())

    def test_non_numeric_scores_ignored_gracefully(self):
        scores = {"notes": "did well", "technical": 7}
        result = fg.generate_feedback("t", scores)
        self.assertIn("Technical", result)
        self.assertIn("7/10", result)

    def test_deterministic_same_input_same_output(self):
        scores = {"technical": 5, "communication": 5}
        r1 = fg.generate_feedback("t", scores)
        r2 = fg.generate_feedback("t", scores)
        self.assertEqual(r1, r2)


class TestApiPathIsMocked(unittest.TestCase):
    """
    Confirms provider selection logic without ever making a real network call.
    Both _call_anthropic and _call_openai are patched out.
    """

    def setUp(self):
        self._removed = {}
        for key in ("ANTHROPIC_API_KEY", "OPENAI_API_KEY"):
            if key in os.environ:
                self._removed[key] = os.environ.pop(key)

    def tearDown(self):
        os.environ.update(self._removed)

    @patch("feedback_generator._call_anthropic")
    def test_anthropic_used_when_key_present(self, mock_call):
        mock_call.return_value = "mocked anthropic feedback"
        os.environ["ANTHROPIC_API_KEY"] = "fake-key-for-test"
        result = fg.generate_feedback("t", {"technical": 7})
        mock_call.assert_called_once()
        self.assertEqual(result, "mocked anthropic feedback")

    @patch("feedback_generator._call_openai")
    def test_openai_used_when_only_openai_key_present(self, mock_call):
        mock_call.return_value = "mocked openai feedback"
        os.environ["OPENAI_API_KEY"] = "fake-key-for-test"
        result = fg.generate_feedback("t", {"technical": 7})
        mock_call.assert_called_once()
        self.assertEqual(result, "mocked openai feedback")

    @patch("feedback_generator._call_openai")
    @patch("feedback_generator._call_anthropic")
    def test_anthropic_takes_priority_over_openai(self, mock_anthropic, mock_openai):
        mock_anthropic.return_value = "anthropic wins"
        os.environ["ANTHROPIC_API_KEY"] = "fake-anthropic-key"
        os.environ["OPENAI_API_KEY"] = "fake-openai-key"
        result = fg.generate_feedback("t", {"technical": 7})
        mock_anthropic.assert_called_once()
        mock_openai.assert_not_called()
        self.assertEqual(result, "anthropic wins")

    @patch("feedback_generator._call_anthropic", side_effect=RuntimeError("simulated API failure"))
    def test_falls_back_to_template_if_api_call_raises(self, mock_call):
        os.environ["ANTHROPIC_API_KEY"] = "fake-key"
        result = fg.generate_feedback("t", {"technical": 7})
        self.assertIn("Interview Feedback Summary", result)


if __name__ == "__main__":
    unittest.main()
