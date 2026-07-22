-- PrepBuddy SQLite Schema
-- Run this manually if you need to (re)create the DB from scratch.
-- The FastAPI app (Backend/main.py) auto-runs this on startup via _init_db().

CREATE TABLE IF NOT EXISTS users (
    user_id    TEXT PRIMARY KEY,       -- same as email for simplicity
    email      TEXT UNIQUE NOT NULL,
    pw_hash    TEXT NOT NULL,          -- SHA-256 hex digest
    created_at TEXT NOT NULL           -- ISO-8601 UTC timestamp
);

CREATE TABLE IF NOT EXISTS sessions (
    session_id  TEXT PRIMARY KEY,      -- UUID4
    user_id     TEXT NOT NULL,
    role        TEXT,                  -- e.g. "Software Engineer"
    final_score INTEGER,               -- 0-100
    created_at  TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Optional: index for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
