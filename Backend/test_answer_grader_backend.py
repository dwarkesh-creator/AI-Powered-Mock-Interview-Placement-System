"""
test_answer_grader_backend.py
---------------------
Renamed Backend copy of `test_answer_grader` to avoid pytest collection
collision with the Ai_Module/NLP test file.
"""

import os
import sys

_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_BACKEND_DIR)
sys.path.insert(0, os.path.join(_PROJECT_ROOT, "Ai_Module", "NLP"))

import answer_grader as ag

QUESTION = "Tell me about a time you debugged a tricky production issue."
GOOD_ANSWER = (
    "Last summer our checkout API started timing out under load. I pulled "
    "the logs, noticed a slow query hitting an unindexed column, added a "
    "composite index, and load-tested it before shipping the fix."
)


# ---------------------------------------------------------------------
# Core grading behaviour
# ---------------------------------------------------------------------


def test_returns_score_and_feedback():
    result = ag.grade_answer(QUESTION, GOOD_ANSWER)
    assert isinstance(result, dict)
    assert 0 <= result["score"] <= 100
    assert isinstance(result["feedback"], str) and result["feedback"]


def test_empty_answer_scores_zero():
    result = ag.grade_answer(QUESTION, "")
    assert result["score"] == 0
    assert result["word_count"] == 0


def test_short_answer_scores_lower_than_detailed():
    short = ag.grade_answer(QUESTION, "I don't know.")
    long_result = ag.grade_answer(QUESTION, GOOD_ANSWER)
    assert short["score"] <= long_result["score"]


def test_is_deterministic():
    first = ag.grade_answer(QUESTION, GOOD_ANSWER)
    second = ag.grade_answer(QUESTION, GOOD_ANSWER)
    assert first == second


def test_none_answer_scores_zero():
    result = ag.grade_answer(QUESTION, None)  # type: ignore
    assert result["score"] == 0


# ---------------------------------------------------------------------
# Result shape
# ---------------------------------------------------------------------


def test_result_has_expected_keys():
    result = ag.grade_answer(QUESTION, GOOD_ANSWER)
    assert "score" in result
    assert "feedback" in result
    assert "word_count" in result
    assert "matched_keypoints" in result


def test_word_count_is_positive_for_nonempty():
    result = ag.grade_answer(QUESTION, GOOD_ANSWER)
    assert result["word_count"] > 0


def test_matched_keypoints_is_list():
    result = ag.grade_answer(QUESTION, GOOD_ANSWER)
    assert isinstance(result["matched_keypoints"], list)


# ---------------------------------------------------------------------
# Custom keypoints
# ---------------------------------------------------------------------


def test_custom_keypoints():
    kps = ["slow query", "index", "load-tested"]
    result = ag.grade_answer(QUESTION, GOOD_ANSWER, ideal_keypoints=kps)  # type: ignore
    # At least some keypoints should match since they appear in the answer
    assert len(result["matched_keypoints"]) > 0


def test_no_keypoints_still_scores():
    result = ag.grade_answer("What is Python?", "A programming language.", ideal_keypoints=[])  # type: ignore
    assert isinstance(result["score"], int)


# ---------------------------------------------------------------------
# Reference bank
# ---------------------------------------------------------------------


def test_reference_bank_loaded():
    assert isinstance(ag.REFERENCE_BANK, list)  # type: ignore
    assert len(ag.REFERENCE_BANK) > 0  # type: ignore
    for entry in ag.REFERENCE_BANK:  # type: ignore
        assert "question" in entry
        assert "answer" in entry
