# Ai_Module/llm — Feedback Generator

Turns an interview `transcript` + a `scores` dict into human-readable feedback text.

## Files

| File | Purpose |
|---|---|
| `feedback_generator.py` | Public function `generate_feedback(transcript, scores) -> str` |
| `test_feedback_generator.py` | Unit tests — fallback path run for real, API paths mocked |
| `requirements.txt` | Deps (only needed for the real-LLM path + testing) |

## How it works

```python
from feedback_generator import generate_feedback

feedback = generate_feedback(
    transcript="Candidate explained recursion clearly but struggled with system design.",
    scores={"technical": 8, "communication": 6, "problem_solving": 4.5},
)
print(feedback)
```

`generate_feedback` picks a path based on environment variables, checked in this order:

1. **`ANTHROPIC_API_KEY` set** → calls Anthropic's Messages API for narrative feedback.
2. **`OPENAI_API_KEY` set** (and no Anthropic key) → calls OpenAI's Chat Completions API instead.
3. **Neither set, or the API call raises for any reason** → falls back to a deterministic,
   template-based summary built purely from `scores`. This path makes **zero network calls**
   and costs **zero dollars**, so the whole module is safe to run in CI with no credentials.

### Expected `scores` shape

```python
{
    "technical": 7.5,
    "communication": 6.0,
    "problem_solving": 8.0,
    "confidence": 5.5,
    # any other numeric keys are fine — they're picked up automatically
}
```

Values are assumed to be on a 0–10 scale. Non-numeric values (e.g. free-text notes) are
ignored by the template path rather than raising an error.

## Setting API keys

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
# or
export OPENAI_API_KEY="sk-..."
```

If neither is set, you still get usable (if less narrative) feedback from the template path —
nothing breaks, nothing costs money.

## Running the tests

```bash
pip install -r requirements.txt
pytest test_feedback_generator.py -v
```

- `TestFallbackFeedback` runs the offline template path **for real** — no mocking, no network,
  no API keys required. This is what CI should run by default.
- `TestApiPathIsMocked` patches `_call_anthropic` / `_call_openai` directly, so provider
  selection and fallback-on-error logic are verified **without ever hitting the network**,
  even though fake API keys are set in those specific tests.

The test file is written with `unittest.TestCase` (stdlib), which `pytest` auto-discovers and
runs natively — no pytest-only syntax is used, so `python -m unittest test_feedback_generator`
works identically if you ever need to run it without pytest installed.

## Notes / next steps

- The template fallback is intentionally simple (average score + strengths/weaknesses split
  at 7 and 5). Tune those thresholds once you have real scoring data from the grader.
- `_build_prompt()` is shared by both the Anthropic and OpenAI call paths — edit it once to
  change the tone/length of real LLM feedback for both providers.
- Swap in different model names in `_call_anthropic` / `_call_openai` as needed.
