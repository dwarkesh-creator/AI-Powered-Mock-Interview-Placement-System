"""
Answer-correctness grading via an LLM rubric prompt.

Requires ANTHROPIC_API_KEY in the environment. If it's missing, this
falls back to a neutral placeholder score instead of crashing, so the
rest of the pipeline (transcription + confidence) still works while
you're setting up API access.
"""
import os
import json

try:
    import anthropic
except ImportError:  # pragma: no cover - optional dependency
    anthropic = None

_client = anthropic.Anthropic() if anthropic and os.getenv("ANTHROPIC_API_KEY") else None

_GRADING_PROMPT = """You are grading a student's spoken answer in a mock technical interview. Be encouraging but honest.

Question: {question}
Student's answer (transcribed from speech): {transcript}

Respond with ONLY a JSON object, no other text, in this exact shape:
{{"score": <integer 0-100>, "feedback": "<one or two sentence, second-person feedback>"}}
"""


def _strip_code_fence(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.startswith("json"):
            raw = raw[4:]
    return raw.strip()


def grade_answer(question: str, transcript: str) -> dict:
    if _client is None or not transcript.strip():
        return {
            "score": 60,
            "feedback": "Set ANTHROPIC_API_KEY to enable real grading — this is a placeholder score.",
        }

    message = _client.messages.create(
        model="claude-sonnet-5",
        max_tokens=200,
        messages=[
            {
                "role": "user",
                "content": _GRADING_PROMPT.format(question=question, transcript=transcript),
            }
        ],
    )

    try:
        raw = _strip_code_fence(message.content[0].text)
        result = json.loads(raw)
        return {"score": int(result["score"]), "feedback": str(result["feedback"])}
    except (json.JSONDecodeError, KeyError, IndexError, ValueError):
        return {
            "score": 60,
            "feedback": "Could not parse the grading response — check the LLM output format.",
        }
