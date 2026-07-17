"""
answer_grader.py — Ai_Module/nlp (Phase 1)

grade_answer(question, answer) -> dict

NOTE ON PROVENANCE: this file did not exist anywhere visible in this
conversation before the Backend phase referenced it as "Phase 1". It's
scaffolded here, mirroring the exact same LLM + deterministic-fallback
pattern as Ai_Module/llm/feedback_generator.py (Phase 2), so
/api/grade-answer has a real, working, testable module to call. If a
Phase 1 module already exists elsewhere in the actual repo, swap this
file out for it -- just keep the grade_answer(question, answer) -> dict
signature so Backend/main.py doesn't need to change.

Returns a dict shaped like:
    {"score": int (0-100), "feedback": str}
"""

import json
import os
import re
import warnings
from typing import Any, Dict

_SYSTEM_PROMPT = (
    "You are grading a candidate's answer to a mock interview question. "
    "Score the answer from 0 to 100 based on relevance, clarity, and depth. "
    "Respond with ONLY a JSON object, no other text, shaped exactly like: "
    '{"score": <int 0-100>, "feedback": "<one or two sentence critique>"}'
)

_DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5"
_DEFAULT_OPENAI_MODEL = "gpt-5.5"

_FILLER_WORDS = ("um", "uh", "like", "you know", "sort of", "kind of", "basically")


def grade_answer(question: str, answer: str) -> Dict[str, Any]:
    """
    Grade a candidate's answer to an interview question.

    Args:
        question: The interview question that was asked.
        answer: The candidate's answer text.

    Returns:
        {"score": int in [0, 100], "feedback": str}
        Never raises on a missing/failed LLM call or a malformed LLM
        response; always degrades to the deterministic heuristic instead.
    """
    if os.environ.get("ANTHROPIC_API_KEY"):
        try:
            return _grade_with_anthropic(question, answer)
        except Exception as exc:  # pragma: no cover - network/SDK failures
            warnings.warn(f"Anthropic grading call failed, falling back: {exc}", RuntimeWarning)
    elif os.environ.get("OPENAI_API_KEY"):
        try:
            return _grade_with_openai(question, answer)
        except Exception as exc:  # pragma: no cover - network/SDK failures
            warnings.warn(f"OpenAI grading call failed, falling back: {exc}", RuntimeWarning)

    return _grade_fallback(question, answer)


# ---------------------------------------------------------------------
# Real LLM paths
# ---------------------------------------------------------------------

def _build_prompt(question: str, answer: str) -> str:
    return f"Question: {question}\n\nCandidate's answer: {answer}"


def _parse_llm_json(text: str) -> Dict[str, Any]:
    """LLMs sometimes wrap JSON in prose or code fences even when told not
    to -- pull out the first {...} block rather than assuming the whole
    response is clean JSON.
    """
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON object found in LLM response: {text!r}")
    data = json.loads(match.group(0))
    score = int(max(0, min(100, round(float(data["score"])))))
    feedback = str(data.get("feedback", "")).strip()
    return {"score": score, "feedback": feedback}


def _grade_with_anthropic(question: str, answer: str) -> Dict[str, Any]:
    try:
        import importlib

        anthropic = importlib.import_module("anthropic")
    except Exception:  # pragma: no cover - optional SDK
        raise RuntimeError("anthropic package not installed")

    client = anthropic.Anthropic()
    model = os.environ.get("ANTHROPIC_MODEL", _DEFAULT_ANTHROPIC_MODEL)
    message = client.messages.create(
        model=model,
        max_tokens=300,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": _build_prompt(question, answer)}],
    )
    parts = [block.text for block in message.content if getattr(block, "type", None) == "text"]
    return _parse_llm_json("".join(parts))


def _grade_with_openai(question: str, answer: str) -> Dict[str, Any]:
    try:
        import importlib

        openai = importlib.import_module("openai")
    except Exception:  # pragma: no cover - optional SDK
        raise RuntimeError("openai package not installed")

    client = openai.OpenAI()
    model = os.environ.get("OPENAI_MODEL", _DEFAULT_OPENAI_MODEL)
    response = client.responses.create(
        model=model,
        instructions=_SYSTEM_PROMPT,
        input=_build_prompt(question, answer),
    )
    return _parse_llm_json(response.output_text)


# ---------------------------------------------------------------------
# Deterministic fallback -- zero network, zero cost, fully testable
# ---------------------------------------------------------------------

def _grade_fallback(question: str, answer: str) -> Dict[str, Any]:
    """A simple, transparent heuristic -- NOT real language understanding.
    It rewards answers that are substantive and penalizes very short or
    filler-heavy ones, purely so /api/grade-answer has deterministic,
    zero-cost behavior to fall back on. Same input always gives the same
    output.
    """
    answer = (answer or "").strip()
    if not answer:
        return {"score": 0, "feedback": "No answer was given."}

    words = answer.split()
    word_count = len(words)
    lower = answer.lower()
    filler_count = sum(lower.count(f) for f in _FILLER_WORDS)

    if word_count < 10:
        length_score = 30
        length_note = "The answer is quite short — try to expand with a specific example."
    elif word_count <= 150:
        length_score = 80
        length_note = "The answer is a reasonable length."
    else:
        length_score = 65
        length_note = "The answer runs long — aim to be more concise and focused."

    filler_penalty = min(20, filler_count * 4)
    score = max(0, min(100, length_score - filler_penalty))

    feedback_parts = [length_note]
    if filler_count > 0:
        feedback_parts.append(
            f"Watch filler words ({filler_count} found) — pausing briefly reads as more confident."
        )
    else:
        feedback_parts.append("No filler words detected — clean delivery.")

    return {"score": score, "feedback": " ".join(feedback_parts)}
