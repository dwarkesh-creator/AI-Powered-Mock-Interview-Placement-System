"""
main.py — Backend API Server
AI-Powered Mock Interview & Placement System

Endpoints:
    GET  /                       — health check
    POST /api/auth/signup        — register a new user
    POST /api/auth/login         — login and get a token
    POST /api/sessions           — save a completed interview session
    GET  /api/sessions/{user_id} — get all sessions for a user
    POST /api/grade-answer       — grade a candidate's answer (NLP module)
    POST /api/feedback           — generate session feedback (LLM module)
    POST /api/generate-questions — generate interview questions from resume + role
"""

import hashlib
import os
import sqlite3
import sys
import uuid
from contextlib import asynccontextmanager, contextmanager
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

# ── AI module imports ──────────────────────────────────────────────────────────
# Resolve sibling directories so this file can be run from any cwd.
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_BASE_DIR)

sys.path.insert(0, os.path.join(_PROJECT_ROOT, "Ai_Module", "NLP"))
sys.path.insert(0, os.path.join(_PROJECT_ROOT, "Ai_Module", "llm"))

from answer_grader import grade_answer  # noqa: E402  (Ai_Module/NLP/answer_grader.py)
from feedback_generator import generate_feedback  # noqa: E402  (Ai_Module/llm/feedback_generator.py)

# ── DB setup ───────────────────────────────────────────────────────────────────
_DEFAULT_DB_PATH = os.path.join(_PROJECT_ROOT, "Database", "placeai.db")

# ── In-memory stores (fast path for sessions & auth tokens in this version) ───
SESSIONS_STORE: Dict[str, List[Dict[str, Any]]] = {}   # user_id -> [session, ...]
TOKENS: Dict[str, str] = {}                             # token -> user_id


def _get_db_path() -> str:
    """Read at call time so monkeypatching PLACEAI_DB_PATH in tests works."""
    return os.environ.get("PLACEAI_DB_PATH", _DEFAULT_DB_PATH)


def _get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(_get_db_path(), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def _db():
    conn = _get_db_connection()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def _init_db() -> None:
    db_path = _get_db_path()
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    with _db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                user_id   TEXT PRIMARY KEY,
                email     TEXT UNIQUE NOT NULL,
                pw_hash   TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sessions (
                session_id  TEXT PRIMARY KEY,
                user_id     TEXT NOT NULL,
                role        TEXT,
                final_score INTEGER,
                created_at  TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            );
            """
        )


# ── App factory ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(application: FastAPI):
    _init_db()
    yield


app = FastAPI(
    title="PlaceAI — Mock Interview API",
    description="AI-Powered Mock Interview & Placement System backend.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic schemas ───────────────────────────────────────────────────────────

class AuthRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class AuthResponse(BaseModel):
    user_id: str
    token: str


class SessionCreate(BaseModel):
    user_id: str
    role: Optional[str] = None
    final_score: Optional[int] = Field(default=None, ge=0, le=100)


class SessionResponse(BaseModel):
    session_id: str
    user_id: str
    role: Optional[str]
    final_score: Optional[int]
    created_at: str


class GradeRequest(BaseModel):
    question: str
    answer: str
    ideal_keypoints: Optional[List[str]] = None


class GradeResponse(BaseModel):
    score: int
    feedback: str
    word_count: Optional[int] = None
    matched_keypoints: Optional[List[str]] = None


class FeedbackRequest(BaseModel):
    transcript: str
    scores: Dict[str, Any]


class FeedbackResponse(BaseModel):
    feedback: str


class QuestionRequest(BaseModel):
    role: str
    resume_text: Optional[str] = None
    num_questions: int = Field(default=5, ge=1, le=20)


class QuestionResponse(BaseModel):
    questions: List[str]


# ── Helpers ────────────────────────────────────────────────────────────────────

def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def _generate_token() -> str:
    return str(uuid.uuid4())


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/", tags=["health"])
def health_check():
    return {"status": "ok", "service": "PlaceAI Backend"}


# ── Auth ───────────────────────────────────────────────────────────────────────

@app.post("/api/auth/signup", status_code=status.HTTP_201_CREATED, response_model=AuthResponse, tags=["auth"])
def signup(body: AuthRequest):
    with _db() as conn:
        existing = conn.execute(
            "SELECT user_id FROM users WHERE email = ?", (body.email,)
        ).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="Email already registered.")

        user_id = body.email
        pw_hash = _hash_password(body.password)
        conn.execute(
            "INSERT INTO users (user_id, email, pw_hash, created_at) VALUES (?, ?, ?, ?)",
            (user_id, body.email, pw_hash, datetime.now(timezone.utc).isoformat()),
        )

    token = _generate_token()
    TOKENS[token] = user_id
    return AuthResponse(user_id=user_id, token=token)


@app.post("/api/auth/login", response_model=AuthResponse, tags=["auth"])
def login(body: AuthRequest):
    with _db() as conn:
        row = conn.execute(
            "SELECT user_id, pw_hash FROM users WHERE email = ?", (body.email,)
        ).fetchone()

    if not row or row["pw_hash"] != _hash_password(body.password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = _generate_token()
    TOKENS[token] = row["user_id"]
    return AuthResponse(user_id=row["user_id"], token=token)


# ── Sessions ───────────────────────────────────────────────────────────────────

@app.post("/api/sessions", status_code=status.HTTP_201_CREATED, response_model=SessionResponse, tags=["sessions"])
def create_session(body: SessionCreate):
    session_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()

    with _db() as conn:
        conn.execute(
            "INSERT INTO sessions (session_id, user_id, role, final_score, created_at) VALUES (?,?,?,?,?)",
            (session_id, body.user_id, body.role, body.final_score, created_at),
        )

    session = SessionResponse(
        session_id=session_id,
        user_id=body.user_id,
        role=body.role,
        final_score=body.final_score,
        created_at=created_at,
    )

    SESSIONS_STORE.setdefault(body.user_id, []).append(session.model_dump())
    return session


@app.get("/api/sessions/{user_id}", response_model=List[SessionResponse], tags=["sessions"])
def get_sessions(user_id: str):
    with _db() as conn:
        rows = conn.execute(
            "SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC", (user_id,)
        ).fetchall()

    if not rows:
        raise HTTPException(status_code=404, detail=f"No sessions found for user '{user_id}'.")

    return [
        SessionResponse(
            session_id=r["session_id"],
            user_id=r["user_id"],
            role=r["role"],
            final_score=r["final_score"],
            created_at=r["created_at"],
        )
        for r in rows
    ]


# ── Grading ────────────────────────────────────────────────────────────────────

@app.post("/api/grade-answer", response_model=GradeResponse, tags=["ai"])
def grade_answer_endpoint(body: GradeRequest):
    result = grade_answer(body.question, body.answer, body.ideal_keypoints)
    return GradeResponse(
        score=result["score"],
        feedback=result["feedback"],
        word_count=result.get("word_count"),
        matched_keypoints=result.get("matched_keypoints"),
    )


# ── Feedback ───────────────────────────────────────────────────────────────────

@app.post("/api/feedback", response_model=FeedbackResponse, tags=["ai"])
def feedback_endpoint(body: FeedbackRequest):
    feedback_text = generate_feedback(body.transcript, body.scores)
    return FeedbackResponse(feedback=feedback_text)


# ── Question generation ────────────────────────────────────────────────────────

def _generate_questions_heuristic(role: str, resume_text: str, num: int) -> List[str]:
    """
    Offline question generator — no network, no LLM required.
    Produces role-tailored questions using keyword matching + templates.
    Replace this with an LLM call by setting ANTHROPIC_API_KEY or OPENAI_API_KEY.
    """
    role_lower = role.lower()

    bank: Dict[str, List[str]] = {
        "software": [
            "Explain the difference between a stack and a queue, and give a real-world use case for each.",
            "How would you design a URL-shortening service like bit.ly?",
            "What is the time complexity of binary search, and when would you prefer it over linear search?",
            "Describe a situation where you had to debug a production issue. What was your process?",
            "What are SOLID principles? Give an example of applying one in a project.",
            "How does garbage collection work in your primary language?",
            "Explain REST vs GraphQL — when would you choose one over the other?",
            "How do you ensure your code is testable and maintainable?",
            "Describe your experience with version control and branching strategies.",
            "What is a race condition and how would you prevent it?",
        ],
        "data": [
            "Explain the bias-variance tradeoff with an example.",
            "What is the difference between supervised and unsupervised learning?",
            "How would you handle missing data in a dataset?",
            "Describe a machine learning project you worked on end-to-end.",
            "What metrics would you use to evaluate a classification model?",
            "Explain how gradient descent works.",
            "What is overfitting and how do you prevent it?",
            "How would you perform feature selection for a high-dimensional dataset?",
            "Compare decision trees and random forests.",
            "What is cross-validation and why is it important?",
        ],
        "product": [
            "How do you prioritize features when you have limited engineering bandwidth?",
            "Describe a product you admire and explain what makes it successful.",
            "How would you measure the success of a new feature?",
            "Walk me through how you would conduct user research for a new product.",
            "Tell me about a time you made a product decision with incomplete data.",
            "How do you balance user needs with business objectives?",
            "What metrics would you track for a B2B SaaS product?",
            "Describe how you would launch a product in a new market.",
            "How do you work with engineering and design to ship features on time?",
            "Tell me about a product failure you experienced. What did you learn?",
        ],
        "general": [
            "Tell me about yourself and why you are interested in this role.",
            "Describe a challenging project you completed and what you learned from it.",
            "How do you stay up to date with developments in your field?",
            "Tell me about a time you disagreed with a team member. How did you resolve it?",
            "Where do you see yourself in five years?",
            "What is your greatest professional strength? Give an example.",
            "Describe a time you had to meet a tight deadline. How did you manage it?",
            "How do you handle feedback and criticism?",
            "Tell me about a time you showed leadership, even without a formal title.",
            "Why are you leaving your current role (or graduating)?",
        ],
    }

    matched_key = next(
        (k for k in bank if k in role_lower),
        "general",
    )

    questions = bank[matched_key][:num]

    # pad with general questions if needed
    if len(questions) < num:
        for q in bank["general"]:
            if q not in questions:
                questions.append(q)
                if len(questions) == num:
                    break

    # personalise with resume keywords if provided
    if resume_text:
        resume_words = [w for w in resume_text.split() if len(w) > 5][:5]
        if resume_words:
            extra = (
                f"Based on your experience with {', '.join(resume_words[:3])}, "
                f"how have you applied these skills in a real project?"
            )
            questions.insert(0, extra)
            questions = questions[:num]

    return questions


def _generate_questions_llm(role: str, resume_text: str, num: int) -> List[str]:
    """Call an LLM to generate bespoke questions. Falls back to heuristic on any error."""
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")

    prompt = (
        f"You are an expert interviewer. Generate exactly {num} interview questions for a "
        f"'{role}' role. "
    )
    if resume_text:
        prompt += f"The candidate's resume summary is: {resume_text[:500]}. "
    prompt += (
        "Return ONLY a JSON array of strings, no extra text. "
        'Example: ["Q1?", "Q2?"]'
    )

    if anthropic_key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=anthropic_key)
            msg = client.messages.create(
                model=os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-5"),
                max_tokens=800,
                messages=[{"role": "user", "content": prompt}],
            )
            import json, re
            text = "".join(b.text for b in msg.content if getattr(b, "type", None) == "text")
            arr = json.loads(re.search(r"\[.*\]", text, re.DOTALL).group(0))
            return [str(q) for q in arr[:num]]
        except Exception:
            pass

    if openai_key:
        try:
            from openai import OpenAI
            import json, re
            client = OpenAI(api_key=openai_key)
            resp = client.chat.completions.create(
                model=os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
                messages=[{"role": "user", "content": prompt}],
                max_tokens=800,
            )
            text = resp.choices[0].message.content.strip()
            arr = json.loads(re.search(r"\[.*\]", text, re.DOTALL).group(0))
            return [str(q) for q in arr[:num]]
        except Exception:
            pass

    return _generate_questions_heuristic(role, resume_text or "", num)


@app.post("/api/generate-questions", response_model=QuestionResponse, tags=["ai"])
def generate_questions_endpoint(body: QuestionRequest):
    questions = _generate_questions_llm(
        role=body.role,
        resume_text=body.resume_text or "",
        num=body.num_questions,
    )
    return QuestionResponse(questions=questions)


# ── Dev entrypoint ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
