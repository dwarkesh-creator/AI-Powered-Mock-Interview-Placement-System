"""
feedback_generator.py

Generates interview feedback text from a transcript and a scores dict.

Behavior
--------
- If ANTHROPIC_API_KEY is set in the environment, calls Anthropic's API to
  produce natural-language feedback grounded in the transcript + scores.
- Else if OPENAI_API_KEY is set, calls OpenAI's API instead.
- If neither key is set, OR the API call raises for any reason, falls back
  to a deterministic, template-based feedback string built purely from
  `scores`. This fallback path makes no network calls and costs nothing,
  so the whole module stays testable in CI with zero credentials.

Public API
----------
    generate_feedback(transcript: str, scores: dict) -> str
"""

import os


def _build_template_feedback(scores: dict) -> str:
    """
    Deterministic, offline feedback generator.

    Builds a structured feedback string purely from the scores dict — no
    network calls, no randomness — so it's safe to run in tests / CI.

    Expected `scores` shape (all keys optional, extra keys ignored,
    non-numeric values ignored):
        {
            "technical": 7.5,
            "communication": 6.0,
            "problem_solving": 8.0,
            "confidence": 5.5,
            ...
        }
    Values are assumed to be on a 0-10 scale.
    """
    if not scores:
        return "No scores were provided, so no feedback could be generated."

    lines = ["Interview Feedback Summary", "=" * 27]

    numeric_scores = {k: v for k, v in scores.items() if isinstance(v, (int, float))}

    if numeric_scores:
        avg = sum(numeric_scores.values()) / len(numeric_scores)
        lines.append(f"\nOverall score: {avg:.1f}/10\n")

        lines.append("Breakdown:")
        for k, v in numeric_scores.items():
            lines.append(f"  - {k.replace('_', ' ').title()}: {v}/10")

        strengths = [k for k, v in numeric_scores.items() if v >= 7]
        weaknesses = [k for k, v in numeric_scores.items() if v < 5]

        if strengths:
            pretty = ", ".join(s.replace("_", " ") for s in strengths)
            lines.append(f"\nStrengths: {pretty}. Keep leaning on these.")
        if weaknesses:
            pretty = ", ".join(s.replace("_", " ") for s in weaknesses)
            lines.append(f"\nAreas to improve: {pretty}. Focus your prep here.")
        if not strengths and not weaknesses:
            lines.append("\nScores are fairly even across the board — no single standout area yet.")
    else:
        lines.append("\nNo numeric scores were found to summarize.")

    lines.append(
        "\n(Note: this is an automated fallback summary generated without an LLM. "
        "Set ANTHROPIC_API_KEY or OPENAI_API_KEY for richer, narrative feedback.)"
    )
    return "\n".join(lines)


def _build_prompt(transcript: str, scores: dict) -> str:
    return (
        "You are an interview coach. Given the interview transcript and scores "
        "below, write concise, constructive feedback (150-250 words) covering "
        "strengths, weaknesses, and specific next steps.\n\n"
        f"Scores: {scores}\n\n"
        f"Transcript:\n{transcript}\n"
    )


def _call_anthropic(transcript: str, scores: dict, api_key: str) -> str:
    """Real network call to Anthropic. Only imported/executed when a key is present."""
    import anthropic  # local import: keeps this optional at install time

    client = anthropic.Anthropic(api_key=api_key)
    prompt = _build_prompt(transcript, scores)
    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=600,
        messages=[{"role": "user", "content": prompt}],
    )
    return "".join(
        block.text for block in response.content if getattr(block, "type", None) == "text"
    ).strip()


def _call_openai(transcript: str, scores: dict, api_key: str) -> str:
    """Real network call to OpenAI. Only imported/executed when a key is present."""
    from openai import OpenAI  # local import: keeps this optional at install time

    client = OpenAI(api_key=api_key)
    prompt = _build_prompt(transcript, scores)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=600,
    )
    return response.choices[0].message.content.strip()


def generate_feedback(transcript: str, scores: dict) -> str:
    """
    Generate interview feedback text.

    Tries a real LLM call first if a supported API key is present in the
    environment (ANTHROPIC_API_KEY takes priority over OPENAI_API_KEY).
    Falls back to a deterministic, offline template built from `scores`
    if no key is set, or if the API call raises for any reason.

    Args:
        transcript: the interview transcript text.
        scores: dict of score_name -> numeric score (0-10 scale expected).

    Returns:
        Feedback text as a string.
    """
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")

    if anthropic_key:
        try:
            return _call_anthropic(transcript, scores, anthropic_key)
        except Exception:
            pass  # fall through to template

    if openai_key:
        try:
            return _call_openai(transcript, scores, openai_key)
        except Exception:
            pass  # fall through to template

    return _build_template_feedback(scores)
