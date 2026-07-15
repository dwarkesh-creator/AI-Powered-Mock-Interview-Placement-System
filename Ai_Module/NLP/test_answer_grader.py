"""
test_answer_grader.py

Pure unit tests for answer_grader.py — everything here runs locally
(TF-IDF + cosine similarity via scikit-learn), no network calls, no API keys.

Covers:
- A strong (near-verbatim) answer scores high.
- An empty/whitespace-only answer scores 0.
- Keyword overlap is detected correctly (present keypoints matched,
  absent ones excluded).
- A few supporting checks (word count accuracy, explicit keypoint override,
  weak vs strong relative scoring, unknown-question handling, output shape).
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from answer_grader import grade_answer, REFERENCE_BANK  # noqa: E402


class TestStrongAnswer(unittest.TestCase):
    def test_strong_answer_scores_high(self):
        question = "What is a REST API?"
        answer = (
            "A REST API is an architectural style for designing networked applications. "
            "It uses stateless communication and standard HTTP methods like GET, POST, PUT, "
            "and DELETE to manipulate resources, which are identified by URLs. REST APIs "
            "typically exchange data in JSON format."
        )
        result = grade_answer(question, answer)
        self.assertGreaterEqual(result["score"], 70)
        self.assertGreater(result["word_count"], 0)


class TestEmptyAnswer(unittest.TestCase):
    def test_empty_string_scores_zero(self):
        result = grade_answer("What is a REST API?", "")
        self.assertEqual(result["score"], 0)
        self.assertEqual(result["word_count"], 0)
        self.assertEqual(result["matched_keypoints"], [])
        self.assertEqual(result["feedback"], "No answer provided.")

    def test_whitespace_only_scores_zero(self):
        result = grade_answer("What is a REST API?", "     \n\t  ")
        self.assertEqual(result["score"], 0)
        self.assertEqual(result["word_count"], 0)

    def test_none_answer_scores_zero(self):
        result = grade_answer("What is a REST API?", None)
        self.assertEqual(result["score"], 0)


class TestKeywordOverlap(unittest.TestCase):
    def test_matched_keypoints_detected(self):
        question = "Explain the concept of Object-Oriented Programming."
        answer = "OOP relies on encapsulation and inheritance to organize code into reusable objects."
        result = grade_answer(question, answer)
        self.assertIn("encapsulation", result["matched_keypoints"])
        self.assertIn("inheritance", result["matched_keypoints"])
        self.assertNotIn("polymorphism", result["matched_keypoints"])
        self.assertNotIn("abstraction", result["matched_keypoints"])

    def test_explicit_ideal_keypoints_override_reference_bank(self):
        result = grade_answer(
            "Some novel question not in the bank",
            "This answer mentions apples and oranges.",
            ideal_keypoints=["apples", "bananas"],
        )
        self.assertIn("apples", result["matched_keypoints"])
        self.assertNotIn("bananas", result["matched_keypoints"])

    def test_no_keypoints_available_returns_empty_list(self):
        result = grade_answer("A totally novel question", "A totally novel answer with no reference.")
        self.assertEqual(result["matched_keypoints"], [])


class TestScoringBehavior(unittest.TestCase):
    def test_weak_answer_scores_lower_than_strong_answer(self):
        question = "What is Big O notation?"
        weak_answer = "It's like, a math thing for code speed I think."
        strong_answer = (
            "Big O notation describes the upper bound of an algorithm's time or "
            "space complexity as the input size grows, helping compare efficiency."
        )
        weak_result = grade_answer(question, weak_answer)
        strong_result = grade_answer(question, strong_answer)
        self.assertLess(weak_result["score"], strong_result["score"])

    def test_word_count_is_accurate(self):
        result = grade_answer("What is Git?", "Git is a distributed version control system.")
        self.assertEqual(result["word_count"], 7)

    def test_score_is_within_bounds(self):
        result = grade_answer("What is a race condition?", "asdkj lkasjd lkasjdlk asjdlk")
        self.assertGreaterEqual(result["score"], 0)
        self.assertLessEqual(result["score"], 100)


class TestOutputShapeAndReferenceBank(unittest.TestCase):
    def test_unknown_question_returns_valid_shape(self):
        result = grade_answer(
            "What is quantum entanglement in birds?",
            "Birds do not experience quantum entanglement in any meaningful way.",
        )
        self.assertIn("score", result)
        self.assertIn("word_count", result)
        self.assertIn("matched_keypoints", result)
        self.assertIn("feedback", result)
        self.assertIsInstance(result["score"], int)
        self.assertIsInstance(result["word_count"], int)
        self.assertIsInstance(result["matched_keypoints"], list)
        self.assertIsInstance(result["feedback"], str)

    def test_reference_bank_has_10_to_15_entries(self):
        self.assertGreaterEqual(len(REFERENCE_BANK), 10)
        self.assertLessEqual(len(REFERENCE_BANK), 15)

    def test_reference_bank_entries_have_required_fields(self):
        for entry in REFERENCE_BANK:
            self.assertIn("question", entry)
            self.assertIn("answer", entry)
            self.assertIn("keypoints", entry)


if __name__ == "__main__":
    unittest.main()
