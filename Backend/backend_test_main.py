"""
test_main.py  (updated)
-----------------------
Run with: pytest Backend/test_main.py -v

Tests the backend's own responsibilities:
  - Request validation, auth, session storage, status codes.
  - AI calls (grade_answer, generate_feedback, generate_questions) are
    monkeypatched so tests never need API keys or network access.
"""

import os
import sys

import pytest
from fastapi.testclient import TestClient

# Make sure Backend/ finds the project root
_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_BACKEND_DIR)
sys.path.insert(0, _PROJECT_ROOT)

import main  # noqa: E402


@pytest.fixture(autouse=True)
def isolate_state(tmp_path, monkeypatch):
    """Fresh SQLite file + empty in-memory stores for every test."""
    monkeypatch.setenv("NILGEN_DB_PATH", str(tmp_path / "test_users.db"))
    main.SESSIONS_STORE.clear()
    main.TOKENS.clear()
    # Re-run DB init so the temp DB gets the schema
    main._init_db()
    yield


@pytest.fixture
def client():
    return TestClient(main.app)


# ── Health ─────────────────────────────────────────────────────────────────────

def test_health_check(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


# ── Auth ───────────────────────────────────────────────────────────────────────

def test_signup_then_login(client):
    creds = {"email": "student@college.edu", "password": "hunter22"}
    resp = client.post("/api/auth/signup", json=creds)
    assert resp.status_code == 201
    assert resp.json()["token"]

    resp2 = client.post("/api/auth/login", json=creds)
    assert resp2.status_code == 200
    assert resp2.json()["user_id"] == "student@college.edu"


def test_signup_duplicate_email_is_409(client):
    creds = {"email": "dup@college.edu", "password": "hunter22"}
    client.post("/api/auth/signup", json=creds)
    resp = client.post("/api/auth/signup", json=creds)
    assert resp.status_code == 409


def test_login_wrong_password_is_401(client):
    client.post("/api/auth/signup", json={"email": "a@b.com", "password": "correct1"})
    resp = client.post("/api/auth/login", json={"email": "a@b.com", "password": "wrong123"})
    assert resp.status_code == 401


def test_signup_rejects_bad_email(client):
    resp = client.post("/api/auth/signup", json={"email": "not-an-email", "password": "hunter22"})
    assert resp.status_code == 422


# ── Sessions ───────────────────────────────────────────────────────────────────

def test_create_and_fetch_session(client):
    payload = {"user_id": "u1", "role": "Backend Engineer", "final_score": 82}
    resp = client.post("/api/sessions", json=payload)
    assert resp.status_code == 201
    body = resp.json()
    assert body["session_id"]
    assert body["final_score"] == 82

    resp2 = client.get("/api/sessions/u1")
    assert resp2.status_code == 200
    assert len(resp2.json()) == 1


def test_get_sessions_missing_user_is_404(client):
    resp = client.get("/api/sessions/nobody")
    assert resp.status_code == 404


def test_create_session_rejects_bad_score(client):
    resp = client.post("/api/sessions", json={"user_id": "u1", "final_score": 150})
    assert resp.status_code == 422


# ── Grading (AI mocked out) ────────────────────────────────────────────────────

def test_grade_answer_endpoint(client, monkeypatch):
    monkeypatch.setattr(
        main, "grade_answer",
        lambda q, a, kp=None: {"score": 77, "feedback": "solid", "word_count": 12, "matched_keypoints": []}
    )
    resp = client.post(
        "/api/grade-answer",
        json={"question": "Why this role?", "answer": "Because I love backend work."},
    )
    assert resp.status_code == 200
    assert resp.json()["score"] == 77


# ── Feedback (AI mocked out) ───────────────────────────────────────────────────

def test_feedback_endpoint(client, monkeypatch):
    monkeypatch.setattr(
        main, "generate_feedback",
        lambda t, s: "keep practising STAR format",
    )
    resp = client.post(
        "/api/feedback",
        json={"transcript": "Q: tell me... A: I did...", "scores": {"overall": 70}},
    )
    assert resp.status_code == 200
    assert resp.json()["feedback"] == "keep practising STAR format"


# ── Question generation (AI mocked out) ───────────────────────────────────────

def test_generate_questions_endpoint(client, monkeypatch):
    monkeypatch.setattr(
        main, "_generate_questions_llm",
        lambda role, resume_text, num: [f"Q{i}?" for i in range(1, num + 1)],
    )
    resp = client.post(
        "/api/generate-questions",
        json={"role": "Software Engineer", "num_questions": 3},
    )
    assert resp.status_code == 200
    assert len(resp.json()["questions"]) == 3


def test_generate_questions_validates_num(client):
    resp = client.post(
        "/api/generate-questions",
        json={"role": "Data Scientist", "num_questions": 99},
    )
    assert resp.status_code == 422
