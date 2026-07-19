"""
answer_grader.py

Grades a candidate's interview answer using TF-IDF cosine similarity against
a small local reference bank of sample Q&A pairs. No LLM call, no network
request, no API key required — everything runs locally with scikit-learn.

Public API
----------
    grade_answer(question: str, answer: str, ideal_keypoints: list[str] | None = None) -> dict

    Returns:
        {
            "score": int,               # 0-100
            "word_count": int,
            "matched_keypoints": list,  # keypoints found in the answer
            "feedback": str,
        }

How scoring works
------------------
1. If `answer` is empty/whitespace, return a score of 0 immediately.
2. Look up `question` in the local reference bank (reference_bank.json).
   - Exact match (case-insensitive) -> use that entry's ideal answer + keypoints.
   - No match -> compare the answer against every entry in the bank and use
     the best (max) similarity as the score basis, so unknown/novel questions
     still get a reasonable grade instead of failing.
3. Fit a TF-IDF vectorizer over the reference bank's answers (+ the candidate
   answer) and compute cosine similarity between the candidate answer and the
   relevant reference answer.
4. Keypoints (from `ideal_keypoints` if provided, else from the matched
   reference entry) are checked for case-insensitive substring presence in
   the answer -> `matched_keypoints`.
5. Final score blends similarity and keypoint coverage (60/40) when keypoints
   are available, or is just the similarity score (0-100) when they aren't.
"""

import json
import math
import os
import re
from typing import Any

TfidfVectorizer: Any
cosine_similarity: Any
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
except ImportError:
    TfidfVectorizer = None
    cosine_similarity = None

_BANK_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reference_bank.json")

with open(_BANK_PATH, "r", encoding="utf-8") as _f:
    REFERENCE_BANK = json.load(_f)


def _find_reference_entry(question: str):
    """Exact (case-insensitive) question match against the reference bank, or None."""
    if not question:
        return None
    q_norm = question.strip().lower()
    for entry in REFERENCE_BANK:
        if entry["question"].strip().lower() == q_norm:
            return entry
    return None


def _compute_similarity(answer: str, reference_entry) -> float:
    """
    TF-IDF cosine similarity between `answer` and either the matched reference
    entry's ideal answer, or (if no entry matched) the closest answer in the
    whole reference bank. Returns 0.0 on any degenerate input (e.g. an answer
    made up entirely of stop words, which leaves TF-IDF with an empty vocab).
    """
    corpus = [entry["answer"] for entry in REFERENCE_BANK]
    if TfidfVectorizer is None or cosine_similarity is None:
        return _compute_similarity_without_sklearn(answer, corpus, reference_entry)

    try:
        vectorizer = TfidfVectorizer(stop_words="english")
        matrix: Any = vectorizer.fit_transform(corpus + [answer])
    except ValueError:
        # e.g. "empty vocabulary" when the answer is only stop words/punctuation
        return 0.0

    answer_vec = matrix.getrow(matrix.shape[0] - 1)
    sims = [
        float(cosine_similarity(answer_vec, matrix.getrow(index))[0][0])
        for index in range(matrix.shape[0] - 1)
    ]

    if reference_entry is not None:
        idx = REFERENCE_BANK.index(reference_entry)
        return float(sims[idx])
    return max(sims, default=0.0)


_TOKEN_PATTERN = re.compile(r"[A-Za-z][A-Za-z0-9']*")
_FALLBACK_STOP_WORDS = frozenset(
    {
        "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
        "has", "have", "in", "into", "is", "it", "of", "on", "or", "that",
        "the", "this", "to", "was", "were", "which", "with",
    }
)


def _compute_similarity_without_sklearn(answer: str, corpus: list, reference_entry) -> float:
    """Compute cosine similarity without importing optional ML packages."""
    documents = [_tokens(text) for text in corpus + [answer]]
    document_count = len(documents)
    document_frequency = {}
    for document in documents:
        for token in set(document):
            document_frequency[token] = document_frequency.get(token, 0) + 1

    vectors = []
    for document in documents:
        term_frequency = {}
        for token in document:
            term_frequency[token] = term_frequency.get(token, 0) + 1
        vector = {
            token: count * (math.log((1 + document_count) / (1 + document_frequency[token])) + 1)
            for token, count in term_frequency.items()
        }
        vectors.append(vector)

    answer_vector = vectors[-1]

    def similarity(reference_vector):
        numerator = sum(value * answer_vector.get(token, 0.0) for token, value in reference_vector.items())
        reference_norm = math.sqrt(sum(value * value for value in reference_vector.values()))
        answer_norm = math.sqrt(sum(value * value for value in answer_vector.values()))
        if not reference_norm or not answer_norm:
            return 0.0
        return numerator / (reference_norm * answer_norm)

    similarities = [similarity(vector) for vector in vectors[:-1]]
    if reference_entry is not None:
        return similarities[REFERENCE_BANK.index(reference_entry)]
    return max(similarities, default=0.0)


def _tokens(text: str) -> list:
    return [
        token.lower()
        for token in _TOKEN_PATTERN.findall(text)
        if token.lower() not in _FALLBACK_STOP_WORDS
    ]


def _match_keypoints(answer: str, keypoints: list[str]) -> list[str]:
    """Case-insensitive substring match of each keypoint phrase in the answer."""
    if not keypoints:
        return []
    answer_lower = answer.lower()
    return [kp for kp in keypoints if kp.lower() in answer_lower]


def _build_feedback(
    score: int, matched_keypoints: list[str], keypoints: list[str], word_count: int
) -> str:
    if word_count == 0:
        return "No answer provided."

    if score >= 80:
        parts = ["Strong answer — closely matches the expected content."]
    elif score >= 50:
        parts = ["Decent answer, but missing some depth or key details."]
    else:
        parts = ["Weak answer — doesn't align well with the expected response."]

    if keypoints:
        missing = [kp for kp in keypoints if kp not in matched_keypoints]
        if matched_keypoints:
            parts.append(f"Covered: {', '.join(matched_keypoints)}.")
        if missing:
            parts.append(f"Missing: {', '.join(missing)}.")

    if 0 < word_count < 15:
        parts.append("Consider elaborating further — the answer is quite short.")

    return " ".join(parts)


def grade_answer(
    question: str, answer: str | None, ideal_keypoints: list[str] | None = None
) -> dict:
    """
    Grade a candidate's answer to an interview question.

    Args:
        question: the interview question text.
        answer: the candidate's answer text.
        ideal_keypoints: optional explicit list of expected keyword/phrase
            strings. If omitted, keypoints are pulled from the reference
            bank entry matching `question` (if any).

    Returns:
        dict with keys: score (0-100 int), word_count (int),
        matched_keypoints (list[str]), feedback (str).
    """
    answer = answer or ""
    word_count = len(answer.split())

    if not answer.strip():
        return {
            "score": 0,
            "word_count": 0,
            "matched_keypoints": [],
            "feedback": "No answer provided.",
        }

    reference_entry = _find_reference_entry(question)
    keypoints: list[str] = (
        ideal_keypoints
        if ideal_keypoints is not None
        else (reference_entry["keypoints"] if reference_entry else [])
    )

    matched_keypoints = _match_keypoints(answer, keypoints)
    similarity = _compute_similarity(answer, reference_entry)

    if keypoints:
        keypoint_coverage = len(matched_keypoints) / len(keypoints)
        combined = 0.6 * similarity + 0.4 * keypoint_coverage
    else:
        combined = similarity

    score = round(max(0.0, min(1.0, combined)) * 100)

    feedback = _build_feedback(score, matched_keypoints, keypoints, word_count)

    return {
        "score": score,
        "word_count": word_count,
        "matched_keypoints": matched_keypoints,
        "feedback": feedback,
    }
