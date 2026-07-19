/**
 * Interview analysis service layer — talks to the Flask backend
 * (see /placeai-backend). Endpoint contract:
 *
 *   POST /api/interview/analyze-answer
 *     multipart/form-data: questionIndex, question, audio (file),
 *     frames (repeated field, one base64 JPEG data URL per frame)
 *     -> { transcript, confidence: {...}, correctness: {...}, overallScore }
 *
 *   POST /api/interview/complete
 *     json: { answers: AnswerAnalysis[] }
 *     -> { overallScore, strengths: string[], improvements: string[] }
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function analyzeAnswer({ questionIndex, question, audioBlob, frames }) {
  const formData = new FormData();
  formData.append('questionIndex', questionIndex);
  formData.append('question', question);
  formData.append('audio', audioBlob, 'answer.webm');
  frames.forEach((frame) => formData.append('frames', frame));

  const res = await fetch(`${API_BASE_URL}/api/interview/analyze-answer`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`analyze-answer failed: ${res.status}`);
  }
  return res.json();
}

export async function gradeAnswer({ question, answer }) {
  const res = await fetch(`${API_BASE_URL}/api/grade-answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      answer,
    }),
  });

  if (!res.ok) {
    throw new Error(`grade-answer failed: ${res.status}`);
  }
  return res.json();
}

export async function completeInterview(answers) {
  const res = await fetch(`${API_BASE_URL}/api/interview/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
  });

  if (!res.ok) {
    throw new Error(`complete failed: ${res.status}`);
  }
  return res.json();
}
