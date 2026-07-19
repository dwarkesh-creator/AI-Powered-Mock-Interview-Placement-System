"""
question_generator.py
---------------------
Standalone question generator module for the AI Mock Interview system.

Generates personalized interview questions from:
  - A target job role (e.g. "Software Engineer", "Data Scientist")
  - An optional resume text (used to personalize questions)
  - Number of questions desired (default 5)

Public API
----------
    generate_questions(role: str, resume_text: str = "", num: int = 5) -> list[str]

Behavior
--------
- If ANTHROPIC_API_KEY is in the environment → calls Claude for bespoke questions.
- Else if OPENAI_API_KEY is set → calls GPT.
- Otherwise → fast, offline heuristic bank (zero network, zero cost).
"""

from __future__ import annotations

import json
import os
import re
from typing import Optional

# ── Question bank (offline fallback) ──────────────────────────────────────────
_BANK: dict[str, list[str]] = {
    "software": [
        "Explain the difference between a stack and a queue with real-world examples.",
        "How would you design a URL-shortening service like bit.ly?",
        "What is the time complexity of binary search and when would you use it?",
        "Describe a production bug you debugged. Walk me through your process.",
        "What are SOLID principles? Give an example of applying one in your code.",
        "How does memory management or garbage collection work in your main language?",
        "Explain REST vs GraphQL — when would you choose one over the other?",
        "How do you ensure your code is maintainable and testable?",
        "What branching strategy do you follow in a team setting?",
        "What is a race condition, and how would you prevent it?",
    ],
    "data": [
        "Explain the bias-variance tradeoff with a concrete example.",
        "What is the difference between supervised and unsupervised learning?",
        "How do you handle missing data in a real dataset?",
        "Describe an end-to-end ML project you worked on.",
        "What evaluation metrics would you use for a binary classification problem?",
        "Explain how gradient descent works, including the role of the learning rate.",
        "What causes overfitting, and what techniques prevent it?",
        "How would you perform feature selection for a high-dimensional dataset?",
        "Compare decision trees and random forests.",
        "What is k-fold cross-validation and why is it important?",
    ],
    "product": [
        "How do you prioritize features when engineering bandwidth is limited?",
        "Describe a product you admire and explain what makes it great.",
        "How would you define and measure the success of a new feature?",
        "Walk me through how you'd conduct user research for a brand-new product.",
        "Tell me about a time you made a product decision with incomplete data.",
        "How do you balance user needs with business objectives?",
        "What metrics would you track for a B2B SaaS product?",
        "How would you plan a product launch in a new market?",
        "How do you collaborate with engineering and design to ship on time?",
        "Tell me about a product failure. What did you learn?",
    ],
    "design": [
        "Walk me through your design process from brief to final delivery.",
        "How do you incorporate user research into your design decisions?",
        "Describe a project where you had to balance aesthetics with usability.",
        "How do you handle feedback that conflicts with your design instincts?",
        "What tools do you use for prototyping and why?",
        "How do you ensure your designs are accessible?",
        "Tell me about a time a design you shipped had an unexpected impact.",
        "How do you measure whether a design solution is working?",
        "Describe your approach to responsive or adaptive design.",
        "How do you stay current with design trends without chasing them blindly?",
    ],
    "general": [
        "Tell me about yourself and why you're interested in this role.",
        "Describe the most challenging project you've completed and what you learned.",
        "How do you stay up to date in your field?",
        "Tell me about a time you disagreed with a colleague and how you resolved it.",
        "Where do you see yourself in five years?",
        "What is your greatest professional strength? Give a specific example.",
        "Describe a time you had to meet a very tight deadline.",
        "How do you handle critical feedback?",
        "Tell me about a time you showed leadership without a formal title.",
        "Why are you looking for a new opportunity?",
    ],
}


def _heuristic(role: str, resume_text: str, num: int) -> list[str]:
    role_lower = role.lower()
    key = next((k for k in _BANK if k in role_lower), "general")

    questions = list(_BANK[key])

    # Pad with general questions if bank too small
    for q in _BANK["general"]:
        if len(questions) >= num * 2:
            break
        if q not in questions:
            questions.append(q)

    # Personalise opener from resume keywords
    if resume_text:
        keywords = [w for w in resume_text.split() if len(w) > 5][:4]
        if keywords:
            opener = (
                f"Based on your experience with {', '.join(keywords[:3])}, "
                f"can you walk me through how you've applied those skills in a real project?"
            )
            questions.insert(0, opener)

    return questions[:num]


def _llm_anthropic(role: str, resume_text: str, num: int, api_key: str) -> list[str]:
    import anthropic  # lazy import — not needed for offline path

    prompt = _build_prompt(role, resume_text, num)
    client = anthropic.Anthropic(api_key=api_key)
    msg = client.messages.create(
        model=os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-5"),
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}],
    )
    text_parts = []
    for b in msg.content:
        if isinstance(b, anthropic.types.TextBlock):
            text_parts.append(b.text)
    text = "".join(text_parts)
    return _parse_json_array(text, num)


def _llm_openai(role: str, resume_text: str, num: int, api_key: str) -> list[str]:
    from openai import OpenAI  # lazy import

    prompt = _build_prompt(role, resume_text, num)
    client = OpenAI(api_key=api_key)
    resp = client.chat.completions.create(
        model=os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1000,
    )
    content = resp.choices[0].message.content or ""
    return _parse_json_array(content.strip(), num)


def _build_prompt(role: str, resume_text: str, num: int) -> str:
    p = (
        f"You are an expert interviewer. Generate exactly {num} high-quality interview "
        f"questions for a '{role}' candidate. "
    )
    if resume_text:
        p += f"The candidate's resume reads: {resume_text[:600]}. Tailor some questions to their background. "
    p += (
        "Return ONLY a valid JSON array of question strings, with no explanation or markdown. "
        'Example: ["Question one?", "Question two?"]'
    )
    return p


def _parse_json_array(text: str, num: int) -> list[str]:
    match = re.search(r"\[.*\]", text, re.DOTALL)
    if not match:
        raise ValueError("No JSON array found in LLM response.")
    arr = json.loads(match.group(0))
    return [str(q) for q in arr[:num]]


def generate_questions(
    role: str,
    resume_text: str = "",
    num: int = 5,
) -> list[str]:
    """
    Generate personalized interview questions.

    Args:
        role:        Target job role, e.g. "Software Engineer".
        resume_text: Candidate resume text (plain text, optional).
        num:         Number of questions to return (1-20).

    Returns:
        List of question strings.
    """
    num = max(1, min(20, num))

    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
    if anthropic_key:
        try:
            return _llm_anthropic(role, resume_text, num, anthropic_key)
        except Exception:
            pass

    openai_key = os.environ.get("OPENAI_API_KEY")
    if openai_key:
        try:
            return _llm_openai(role, resume_text, num, openai_key)
        except Exception:
            pass

    return _heuristic(role, resume_text, num)


# ── CLI demo ───────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Generate mock interview questions.")
    parser.add_argument("--role", default="Software Engineer")
    parser.add_argument("--resume", default="", help="Resume text (plain).")
    parser.add_argument("--num", type=int, default=5)
    args = parser.parse_args()

    qs = generate_questions(args.role, args.resume, args.num)
    for i, q in enumerate(qs, 1):
        print(f"{i}. {q}")
