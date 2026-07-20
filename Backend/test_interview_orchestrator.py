import os
import sys

from fastapi.testclient import TestClient

_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_BACKEND_DIR)
sys.path.insert(0, _PROJECT_ROOT)

from Backend import main


def test_interview_turn_uses_gemini_history_and_returns_structured_feedback(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    captured = {}

    def fake_generate(api_key, history, body):
        captured["api_key"] = api_key
        captured["history"] = history
        captured["body"] = body
        return main.InterviewTurnResponse(
            feedback="",
            score=0,
            improvements=[],
            next_question="Tell me about a project you built.",
            is_last_question=False,
        )

    monkeypatch.setattr(main, "_generate_gemini_interview_turn", fake_generate)
    monkeypatch.setattr(
        main,
        "synthesize_interview_question",
        lambda *args, **kwargs: {
            "filename": "interview-question-test.wav",
            "mouth_cues": [{"start": 0, "end": 0.5, "value": "X"}],
        },
    )
    client = TestClient(main.app)
    response = client.post(
        "/api/interview/next-turn",
        json={
            "role": "Software Engineer",
            "topic": "backend",
            "difficulty": "medium",
            "total_questions": 5,
            "history": [{"role": "user", "parts": [{"text": "[START_INTERVIEW]"}]}],
        },
    )

    assert response.status_code == 200
    assert response.json()["score"] == 0
    assert response.json()["next_question"] == "Tell me about a project you built."
    assert response.json()["audio_url"] == "/api/interview/audio/interview-question-test.wav"
    assert response.json()["mouth_cues"] == [{"start": 0, "end": 0.5, "value": "X"}]
    assert captured["api_key"] == "test-key"
    assert captured["history"] == [{"role": "user", "parts": [{"text": "[START_INTERVIEW]"}]}]


def test_interview_turn_rejects_history_without_a_final_user_turn(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    client = TestClient(main.app)
    response = client.post(
        "/api/interview/next-turn",
        json={"history": [{"role": "model", "parts": [{"text": "{}"}]}]},
    )

    assert response.status_code == 422
    assert "end with a user turn" in response.json()["detail"]
