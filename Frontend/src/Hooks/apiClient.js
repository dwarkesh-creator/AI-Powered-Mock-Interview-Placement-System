/**
 * Central API client for communicating with the FastAPI backend.
 * All API calls go through here so the base URL and error handling
 * are consistent across the entire frontend.
 */

// Backend API URL - configured in vite.config.js for production builds
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function apiFetch(path, options = {}) {
  const { body, method = 'POST', token } = options;

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = data.detail || data.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export function apiSignup(email, password) {
  return apiFetch('/api/auth/signup', { body: { email, password } });
}

export function apiLogin(email, password) {
  return apiFetch('/api/auth/login', { body: { email, password } });
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export function fetchSessions(userId) {
  return apiFetch(`/api/sessions/${encodeURIComponent(userId)}`, { method: 'GET' });
}

export function createSession({ userId, role, finalScore }) {
  return apiFetch('/api/sessions', {
    body: { user_id: userId, role, final_score: finalScore },
  });
}

// ── AI: Grading ───────────────────────────────────────────────────────────────

export function gradeAnswer({ question, answer }) {
  return apiFetch('/api/grade-answer', { body: { question, answer } });
}

// ── AI: Question Generation ───────────────────────────────────────────────────

export function generateQuestions({ role, resumeText, numQuestions = 5 }) {
  return apiFetch('/api/generate-questions', {
    body: { role, resume_text: resumeText || '', num_questions: numQuestions },
  });
}

// ── AI: Career Bot Chat ───────────────────────────────────────────────────────

export function chatWithBot(message, context = {}, history = []) {
  return apiFetch('/api/chat', { body: { message, context, history } });
}

// ── AI: Feedback ──────────────────────────────────────────────────────────────

export function generateFeedback(transcript, scores) {
  return apiFetch('/api/feedback', { body: { transcript, scores } });
}
