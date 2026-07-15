"""A small, dependency-free first-pass grader for interview answers.

The module deliberately works from only a question and an answer.  It can judge
signals such as relevance, completeness, clarity, and specificity, but it
cannot verify that a technically plausible answer is factually correct.  Add a
reference answer or an LLM later if factual grading is required.

Use it from Python:

    from answer_grader import grade_answer
    result = grade_answer({"question": "What is an API?", "answer": "..."})

Or run it directly:

    python answer_grader.py --demo
    python answer_grader.py --json "{\"question\": \"What is an API?\", \"answer\": \"...\"}"
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections.abc import Mapping, Sequence
from typing import Any


# These lists intentionally stay small and transparent.  The grader uses no
# model or downloaded NLP data, so it remains easy to run in a fresh checkout.
STOP_WORDS = frozenset(
    {
        "a",
        "an",
        "and",
        "are",
        "as",
        "at",
        "be",
        "between",
        "by",
        "each",
        "for",
        "from",
        "has",
        "have",
        "if",
        "in",
        "into",
        "is",
        "it",
        "of",
        "on",
        "one",
        "or",
        "that",
        "the",
        "their",
        "then",
        "there",
        "these",
        "this",
        "to",
        "using",
        "was",
        "were",
        "what",
        "when",
        "where",
        "which",
        "who",
        "why",
        "with",
        "would",
        "you",
        "your",
    }
)

QUESTION_DIRECTIVES = frozenset(
    {
        "answer",
        "compare",
        "contrast",
        "define",
        "describe",
        "difference",
        "different",
        "discuss",
        "distinguish",
        "explain",
        "example",
        "give",
        "how",
        "illustrate",
        "list",
        "provide",
        "share",
        "summarize",
        "tell",
        "walk",
    }
)

CONTRAST_MARKERS = (
    "compared with",
    "compared to",
    "contrast",
    "different from",
    "however",
    "in contrast",
    "on the other hand",
    "unlike",
    "versus",
    "whereas",
)

EXAMPLE_MARKERS = (
    "e.g.",
    "for example",
    "for instance",
    "such as",
    "to illustrate",
)

EXPLANATION_MARKERS = (
    "as a result",
    "because",
    "by ",
    "for example",
    "for instance",
    "so that",
    "therefore",
    "this means",
    "which allows",
    "which means",
)

STAR_MARKERS = ("situation", "task", "action", "result")

TECHNICAL_TERMS = frozenset(
    {
        "algorithm",
        "api",
        "cache",
        "database",
        "deployment",
        "index",
        "latency",
        "model",
        "performance",
        "query",
        "schema",
        "sql",
        "testing",
        "tradeoff",
    }
)

# A compact synonym map catches common interview terminology when a good answer
# uses a related term instead of repeating the question verbatim.  It is not a
# replacement for semantic retrieval, but improves the most common technical
# cases while keeping the script dependency-free and inspectable.
RELATED_TERMS: dict[str, frozenset[str]] = {
    "api": frozenset(
        {"authentication", "cache", "endpoint", "http", "request", "response", "rest", "versioning"}
    ),
    "database": frozenset(
        {"database", "execution", "filter", "index", "join", "query", "schema", "table"}
    ),
    "learning": frozenset(
        {"classification", "feature", "model", "prediction", "regression", "training"}
    ),
    "machine": frozenset(
        {"classification", "feature", "model", "prediction", "regression", "training"}
    ),
    "optimize": frozenset(
        {"benchmark", "cache", "index", "latency", "measure", "performance", "profile"}
    ),
    "performance": frozenset(
        {"benchmark", "cache", "latency", "measure", "optimize", "profile", "throughput"}
    ),
    "query": frozenset(
        {"database", "execution", "explain", "filter", "index", "join", "schema", "select", "table"}
    ),
    "sql": frozenset(
        {
            "database",
            "execution",
            "explain",
            "filter",
            "index",
            "join",
            "latency",
            "plan",
            "schema",
            "select",
            "table",
        }
    ),
    "supervised": frozenset(
        {"classification", "label", "labelled", "labeled", "regression", "target", "training"}
    ),
    "teamwork": frozenset(
        {"collaboration", "communicate", "communication", "coordinate", "team", "teammate"}
    ),
    "unsupervised": frozenset(
        {"cluster", "clustering", "pattern", "segment", "segmentation", "unlabelled", "unlabeled"}
    ),
}

TOKEN_PATTERN = re.compile(r"[A-Za-z][A-Za-z0-9_+-]*")
SENTENCE_PATTERN = re.compile(r"[.!?]+")
NUMBER_PATTERN = re.compile(r"\b\d+(?:\.\d+)?%?\b")


def grade_answer(
    question: str | Mapping[str, Any], answer: str | None = None
) -> dict[str, Any]:
    """Return a 0-100 heuristic score and an explanation for an answer.

    Both call forms are supported so the function is convenient in a notebook
    and when receiving a JSON-style payload:

        grade_answer("What is an API?", "An API is ...")
        grade_answer({"question": "What is an API?", "answer": "An API is ..."})

    The returned ``reasoning`` is intentionally explicit about the signals
    that were found.  It is not a statement of factual correctness.
    """

    question_text, answer_text = _unpack_pair(question, answer)

    if not question_text:
        return _empty_result("No question was provided, so the answer cannot be graded.")
    if not answer_text:
        return _empty_result("No answer was provided.")

    answer_tokens = _tokens(answer_text)
    if not answer_tokens:
        return _empty_result("No answer was provided.")

    question_keywords = _question_keywords(question_text)
    answer_token_set = {_normalize(token) for token in answer_tokens}
    question_keyword_set = {_normalize(keyword) for keyword in question_keywords}
    matched_keywords = [
        keyword for keyword in question_keywords if _normalize(keyword) in answer_token_set
    ]
    related_terms = {
        _normalize(term)
        for keyword in question_keyword_set
        for term in RELATED_TERMS.get(keyword, frozenset())
    }
    related_matches = sorted((answer_token_set & related_terms) - question_keyword_set)

    coverage = (
        len(matched_keywords) / len(question_keywords)
        if question_keywords
        else 0.5
    )
    relevance = _score_relevance(
        coverage,
        len(answer_tokens),
        bool(matched_keywords),
        len(related_matches),
    )

    sentence_count = _sentence_count(answer_text)
    lower_answer = answer_text.lower()
    requirements = _question_requirements(question_text)
    has_example = _contains_any(lower_answer, EXAMPLE_MARKERS)
    has_contrast = _contains_any(lower_answer, CONTRAST_MARKERS)
    has_explanation = _contains_any(lower_answer, EXPLANATION_MARKERS)
    star_count = sum(marker in lower_answer for marker in STAR_MARKERS)

    completeness = _score_completeness(
        word_count=len(answer_tokens),
        sentence_count=sentence_count,
        has_explanation=has_explanation,
        asks_for_example=requirements["example"],
        has_example=has_example,
        asks_for_comparison=requirements["comparison"],
        has_contrast=has_contrast,
        asks_for_behavioral_example=requirements["behavioral"],
        star_count=star_count,
    )
    clarity = _score_clarity(answer_tokens, sentence_count, lower_answer)
    specificity = _score_specificity(answer_text, answer_token_set, has_example)

    # A lengthy but off-topic response should not achieve a high score merely
    # because it is well written.  This cap is deliberately gentle for a
    # question whose useful keywords are difficult to express verbatim.
    if question_keywords and not matched_keywords:
        completeness = min(completeness, 8)
        specificity = min(specificity, 5)
    elif coverage < 0.34:
        completeness = min(completeness, 18)

    score = min(100, relevance + completeness + clarity + specificity)
    reasoning, feedback = _build_reasoning(
        score=score,
        relevance=relevance,
        completeness=completeness,
        clarity=clarity,
        specificity=specificity,
        word_count=len(answer_tokens),
        sentence_count=sentence_count,
        question_keywords=question_keywords,
        matched_keywords=matched_keywords,
        related_matches=related_matches,
        requirements=requirements,
        has_example=has_example,
        has_contrast=has_contrast,
        star_count=star_count,
    )

    return {
        "score": score,
        "reasoning": reasoning,
        "feedback": feedback,
        "breakdown": {
            "relevance": relevance,
            "completeness": completeness,
            "clarity": clarity,
            "specificity": specificity,
        },
        "metrics": {
            "word_count": len(answer_tokens),
            "sentence_count": sentence_count,
            "question_keywords": question_keywords,
            "matched_keywords": matched_keywords,
            "related_terms_matched": related_matches,
        },
    }


def _unpack_pair(
    question: str | Mapping[str, Any], answer: str | None
) -> tuple[str, str]:
    if isinstance(question, Mapping):
        if answer is not None:
            raise ValueError("Pass either a payload mapping or separate question and answer strings.")
        question_value = question.get("question", "")
        answer_value = question.get("answer", "")
    else:
        question_value = question
        answer_value = answer

    return _clean_text(question_value), _clean_text(answer_value)


def _clean_text(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def _empty_result(reason: str) -> dict[str, Any]:
    return {
        "score": 0,
        "reasoning": reason,
        "feedback": [reason],
        "breakdown": {
            "relevance": 0,
            "completeness": 0,
            "clarity": 0,
            "specificity": 0,
        },
        "metrics": {
            "word_count": 0,
            "sentence_count": 0,
            "question_keywords": [],
            "matched_keywords": [],
            "related_terms_matched": [],
        },
    }


def _tokens(text: str) -> list[str]:
    return TOKEN_PATTERN.findall(text.lower())


def _normalize(token: str) -> str:
    """Apply a deliberately conservative suffix normalization for matching."""

    token = token.lower()
    if token.endswith("ies") and len(token) > 4:
        return token[:-3] + "y"
    if token.endswith(("ches", "shes", "xes", "zes", "ses")) and len(token) > 5:
        return token[:-2]
    if token.endswith("ing") and len(token) > 5:
        return token[:-3]
    if token.endswith("ed") and len(token) > 5:
        return token[:-2]
    if token.endswith("s") and len(token) > 4 and not token.endswith("ss"):
        return token[:-1]
    return token


def _question_keywords(question: str) -> list[str]:
    keywords: list[str] = []
    seen: set[str] = set()
    for token in _tokens(question):
        normalized = _normalize(token)
        if (
            normalized in STOP_WORDS
            or normalized in QUESTION_DIRECTIVES
            or len(normalized) < 3
            or normalized in seen
        ):
            continue
        seen.add(normalized)
        keywords.append(token)
    return keywords[:8]


def _question_requirements(question: str) -> dict[str, bool]:
    normalized = question.lower()
    return {
        "comparison": bool(
            re.search(r"\b(compare|contrast|difference|different|distinguish|versus|vs)\b", normalized)
        ),
        "example": bool(
            re.search(r"\b(example|instance|illustrate|scenario|case)\b", normalized)
        ),
        "behavioral": bool(
            re.search(
                r"\b(tell me about|describe a time|give an example of a time|have you|situation)\b",
                normalized,
            )
        ),
    }


def _contains_any(text: str, markers: Sequence[str]) -> bool:
    return any(marker in text for marker in markers)


def _sentence_count(text: str) -> int:
    sentences = [part for part in SENTENCE_PATTERN.split(text) if part.strip()]
    return max(1, len(sentences))


def _score_relevance(
    coverage: float, word_count: int, has_match: bool, related_match_count: int
) -> int:
    if not has_match:
        score = 5 if word_count >= 12 else 2
    else:
        score = round(35 * coverage)
    if word_count < 6:
        ceiling = 14
    elif word_count < 15:
        ceiling = 22
    elif word_count < 35:
        ceiling = 30
    else:
        ceiling = 35
    score += min(24, related_match_count * 3)
    return max(5, min(ceiling, score))


def _score_completeness(
    *,
    word_count: int,
    sentence_count: int,
    has_explanation: bool,
    asks_for_example: bool,
    has_example: bool,
    asks_for_comparison: bool,
    has_contrast: bool,
    asks_for_behavioral_example: bool,
    star_count: int,
) -> int:
    if word_count < 5:
        score = 0
    elif word_count < 15:
        score = 4
    elif word_count < 35:
        score = 9
    elif word_count < 70:
        score = 14
    elif word_count < 140:
        score = 17
    else:
        score = 15

    if sentence_count >= 2:
        score += 3
    if sentence_count >= 3:
        score += 2
    if has_explanation:
        score += 3
    if asks_for_example:
        score += 4 if has_example else -3
    if asks_for_comparison:
        score += 4 if has_contrast else -3
    if asks_for_behavioral_example:
        score += min(4, star_count)
    return min(30, score)


def _score_clarity(answer_tokens: list[str], sentence_count: int, lower_answer: str) -> int:
    word_count = len(answer_tokens)
    if word_count < 5:
        return 1

    score = 4
    average_sentence_length = word_count / sentence_count
    if 5 <= average_sentence_length <= 30:
        score += 5
    elif average_sentence_length <= 40:
        score += 2

    if 2 <= sentence_count <= 5:
        score += 3
    elif sentence_count == 1 and word_count >= 10:
        score += 1

    if _contains_any(lower_answer, CONTRAST_MARKERS + EXPLANATION_MARKERS):
        score += 3

    unique_ratio = len(set(_normalize(token) for token in answer_tokens)) / word_count
    if unique_ratio >= 0.6:
        score += 3
    elif unique_ratio < 0.35:
        score -= 2
    return max(0, min(20, score))


def _score_specificity(answer: str, answer_token_set: set[str], has_example: bool) -> int:
    score = 0
    if has_example:
        score += 5
    if NUMBER_PATTERN.search(answer):
        score += 3
    technical_term_count = len(answer_token_set & TECHNICAL_TERMS)
    score += min(5, technical_term_count * 2)

    # Longer, concrete words are a weak but useful signal of detail.  Cap this
    # contribution so jargon alone cannot dominate the grade.
    long_word_count = sum(len(token) >= 9 for token in answer_token_set)
    score += min(3, long_word_count)
    return min(15, score)


def _build_reasoning(
    *,
    score: int,
    relevance: int,
    completeness: int,
    clarity: int,
    specificity: int,
    word_count: int,
    sentence_count: int,
    question_keywords: list[str],
    matched_keywords: list[str],
    related_matches: list[str],
    requirements: Mapping[str, bool],
    has_example: bool,
    has_contrast: bool,
    star_count: int,
) -> tuple[str, list[str]]:
    feedback: list[str] = []

    if question_keywords:
        feedback.append(
            f"It matches {len(matched_keywords)} of {len(question_keywords)} main question keywords."
        )
    else:
        feedback.append("The question has few extractable topic keywords, so relevance is estimated conservatively.")

    if related_matches:
        feedback.append(
            f"It also uses {len(related_matches)} relevant related term(s): {', '.join(related_matches[:4])}."
        )

    if word_count < 15:
        feedback.append("The response is very brief; add an explanation or supporting detail.")
    elif sentence_count >= 2:
        feedback.append(f"It develops the response over {sentence_count} sentences.")

    if requirements["example"]:
        feedback.append(
            "It includes a concrete example." if has_example else "The question asks for an example, but none was signposted."
        )
    if requirements["comparison"]:
        feedback.append(
            "It clearly signals a comparison." if has_contrast else "Make the contrast between the ideas more explicit."
        )
    if requirements["behavioral"] and star_count:
        feedback.append(f"It uses {star_count} STAR-style structure marker(s).")

    feedback.append("This is a heuristic quality score; it does not verify factual accuracy.")
    summary = (
        f"Score {score}/100: relevance {relevance}/35, completeness {completeness}/30, "
        f"clarity {clarity}/20, and specificity {specificity}/15. "
        + " ".join(feedback)
    )
    return summary, feedback


DEMO_QUESTION = (
    "Explain the difference between supervised and unsupervised learning, "
    "and give one example of each."
)

DEMO_ANSWERS = {
    "great": (
        "Supervised learning trains on labelled examples, so each input has a known target. "
        "For example, a spam classifier can learn from emails marked spam or not spam. "
        "Unsupervised learning instead looks for structure in unlabelled data, such as customer "
        "segments. The key difference is that supervised learning predicts a target, whereas "
        "unsupervised learning discovers patterns without one."
    ),
    "mediocre": (
        "Supervised and unsupervised learning both use data for AI. They are useful methods, "
        "but I do not know much more about them."
    ),
    "blank": "",
}


def _print_result(result: Mapping[str, Any]) -> None:
    print(json.dumps(result, indent=2, ensure_ascii=False))


def _run_demo() -> None:
    print(f"Question: {DEMO_QUESTION}\n")
    for label, answer in DEMO_ANSWERS.items():
        print(f"--- {label.upper()} ANSWER ---")
        _print_result(grade_answer({"question": DEMO_QUESTION, "answer": answer}))
        print()


def _parse_payload(raw_payload: str) -> Mapping[str, Any]:
    try:
        payload = json.loads(raw_payload)
    except json.JSONDecodeError as error:
        raise ValueError(f"Input must be valid JSON: {error.msg}.") from error
    if not isinstance(payload, Mapping):
        raise ValueError("Input JSON must be an object with 'question' and 'answer' fields.")
    return payload


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Score an interview answer without starting a server."
    )
    parser.add_argument("--question", help="Interview question text.")
    parser.add_argument("--answer", help="Candidate answer text.")
    parser.add_argument("--json", dest="json_payload", help="JSON object with question and answer fields.")
    parser.add_argument("--stdin", action="store_true", help="Read one JSON object from standard input.")
    parser.add_argument("--demo", action="store_true", help="Run strong, mediocre, and blank sample answers.")
    args = parser.parse_args(argv)

    input_modes = sum(
        [
            bool(args.json_payload),
            args.stdin,
            args.question is not None or args.answer is not None,
        ]
    )
    if args.demo or input_modes == 0:
        if input_modes:
            parser.error("--demo cannot be combined with an input mode.")
        _run_demo()
        return 0
    if input_modes > 1:
        parser.error("Use exactly one input mode: --json, --stdin, or --question with --answer.")

    try:
        if args.json_payload:
            payload = _parse_payload(args.json_payload)
            result = grade_answer(payload)
        elif args.stdin:
            result = grade_answer(_parse_payload(sys.stdin.read()))
        else:
            if args.question is None or args.answer is None:
                parser.error("--question and --answer must be supplied together.")
            result = grade_answer(args.question, args.answer)
    except ValueError as error:
        parser.error(str(error))

    _print_result(result)
    return 0
