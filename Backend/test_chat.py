"""Focused tests for the career-bot prompt builder; no API key or network needed."""

import os
import sys

import pytest

_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_BACKEND_DIR)
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from Backend import main  # noqa: E402


def test_chat_prompt_includes_profile_and_recent_follow_up_context():
    body = main.ChatRequest(
        message="but how?",
        context={"cgpa": 8, "skills": ["Python", "React"], "targetRole": "SDE"},
        history=[
            {"role": "user", "content": "Is 8 CGPA enough for placements?"},
            {"role": "bot", "content": "Yes, pair it with projects and DSA practice."},
        ],
    )

    prompt = main._build_chat_prompt(body)

    assert "CGPA: 8/10" in prompt
    assert "Skills: Python, React" in prompt
    assert "STUDENT: Is 8 CGPA enough for placements?" in prompt
    assert "COACH: Yes, pair it with projects and DSA practice." in prompt
    assert prompt.endswith("CURRENT STUDENT MESSAGE:\nbut how?")


def test_chat_prompt_rejects_blank_message():
    with pytest.raises(main.HTTPException) as exc_info:
        main._build_chat_prompt(main.ChatRequest(message="   "))

    assert exc_info.value.status_code == 422


def test_chat_endpoint_passes_bounded_prompt_to_gemini(monkeypatch):
    captured = {}
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")

    def fake_generate(api_key, prompt):
        captured["api_key"] = api_key
        captured["prompt"] = prompt
        return "Start with one project, then practise DSA daily."

    monkeypatch.setattr(main, "_generate_gemini_chat_reply", fake_generate)
    response = main.chat_endpoint(
        main.ChatRequest(message="How do I begin?", history=[{"role": "bot", "content": "Build projects."}])
    )

    assert response.reply.startswith("Start with one project")
    assert captured["api_key"] == "test-key"
    assert "COACH: Build projects." in captured["prompt"]
