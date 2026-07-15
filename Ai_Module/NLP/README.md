# Ai_Module/NLP — Answer Grader

Grades a candidate's interview answer against a small local reference bank using
TF-IDF cosine similarity. **No LLM call, no network request, no API key** — the
core score is pure scikit-learn running locally.

## Files

| File | Purpose |
|---|---|
| `answer_grader.py` | Public function `grade_answer(question, answer, ideal_keypoints=None) -> dict` |
| `reference_bank.json` | 13 sample Q&A pairs (question, ideal answer, keypoints) used as the scoring reference |
| `test_answer_grader.py` | Pure unit tests — no network, no mocking needed (nothing external to mock) |
| `requirements.txt` | Deps (`scikit-learn`, `pytest`) |

## How it works

```python
from answer_grader import grade_answer

result = grade_answer(
    question="What is a REST API?",
    answer="REST APIs use HTTP methods like GET and POST to work with resources over URLs, returning JSON.",
)
print(result)
# {
#   "score": 62,
#   "word_count": 17,
#   "matched_keypoints": ["http methods", "resources", "url", "json"],
#   "feedback": "Decent answer, but missing some depth or key details. Covered: ... Missing: stateless."
# }
```

**Scoring steps:**

1. Empty/whitespace `answer` → score `0` immediately, no TF-IDF work done.
2. `question` is looked up in `reference_bank.json` (exact, case-insensitive match).
   - **Match found** → that entry's ideal answer + keypoints become the grading reference.
   - **No match** → the answer is compared against *every* entry in the bank and the
     best (highest) similarity is used, so questions outside the bank still get a
     reasonable score instead of erroring out.
3. A TF-IDF vectorizer is fit over the reference bank's answers + the candidate answer,
   and cosine similarity is computed between them (`scikit-learn`).
4. Keypoints — from `ideal_keypoints` if you pass them explicitly, otherwise from the
   matched reference entry — are checked via case-insensitive substring match against
   the answer → `matched_keypoints`.
5. Final `score` (0–100) blends similarity and keypoint coverage 60/40 when keypoints
   exist, or is just the similarity score when they don't.

### `ideal_keypoints` override

Pass your own list to grade against something not in the reference bank, or to
override the bank's default keypoints for a known question:

```python
grade_answer(
    question="Describe your project's architecture.",
    answer="We used a microservices setup with a message queue between services.",
    ideal_keypoints=["microservices", "message queue", "scalability"],
)
```

## Known limitation

TF-IDF rewards **vocabulary overlap**, not meaning. A correct answer phrased with
different words than the reference bank (e.g. "REST stands for representational
state transfer..." instead of "REST is an architectural style...") can score lower
than its actual quality deserves, even though the keypoint-matching step helps
compensate for that. This is the expected tradeoff of a zero-cost, no-LLM scorer —
if you need semantic (not just lexical) matching later, that's a natural place to
swap in sentence embeddings or an LLM-graded pass as an upgrade, not a rewrite.

## Running the tests

```bash
pip install -r requirements.txt
pytest test_answer_grader.py -v
```

All 13 tests run against the real `grade_answer()` function — no mocking, since
there's nothing external to mock (no network, no API). Covers:
- A near-verbatim strong answer scoring high (≥70).
- Empty string, whitespace-only, and `None` answers all scoring `0`.
- Keyword overlap: present keypoints matched, absent ones excluded.
- Explicit `ideal_keypoints` overriding the reference bank.
- A weak answer scoring lower than a strong one for the same question.
- Word count accuracy, output shape, and reference bank integrity (10–15 entries,
  required fields present).

## Notes / next steps

- `reference_bank.json` currently has 13 entries covering common technical
  interview topics (OOP, REST, Big O, SQL joins, TCP/UDP, exceptions, Git, testing,
  Agile, indexing, closures, race conditions, list vs tuple). Add more entries as
  your question bank grows — no code changes needed, just extend the JSON.
- The 60/40 similarity/keypoint blend in `grade_answer()` is a reasonable starting
  weighting — tune it once you have real grading data to compare against.
- This module intentionally mirrors the structure used in `Ai_Module/llm`
  (core module + tests + `requirements.txt` + `README.md`) — let me know if your
  `vision` module already established a different layout you'd like this to match
  instead.
