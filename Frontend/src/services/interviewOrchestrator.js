import { interviewQuestions as fallbackQuestions } from '../Mockdata/Mockdata.js';
import { getGeminiModelChain } from './geminiConfig.js';
import { callGeminiResilient } from './geminiResilientClient.js';

function makeTurn(role, text) {
  return { role, parts: [{ text }] };
}

function buildInterviewDegradedFallback(payload) {
  const totalQuestions = payload.total_questions || 5;
  const history = payload.history || [];
  const userTurns = history.filter((turn) => turn.role === 'user');
  const isStart = userTurns.length === 1
    && userTurns[0]?.parts?.[0]?.text === '[START_INTERVIEW]';
  const answeredCount = isStart ? 0 : userTurns.length - 1;
  const isLast = answeredCount >= totalQuestions;

  if (isStart) {
    return {
      feedback: '',
      score: 0,
      improvements: [],
      next_question: fallbackQuestions[0] || 'Tell me about yourself and a recent project.',
      is_last_question: false,
      pendingReEvaluation: false,
    };
  }

  return {
    feedback: "Got it — let's move to the next question. Your detailed feedback is being generated and will appear in your summary shortly.",
    score: null,
    improvements: [],
    next_question: isLast
      ? ''
      : fallbackQuestions[answeredCount % fallbackQuestions.length],
    is_last_question: isLast,
    pendingReEvaluation: true,
  };
}

function normalizeTurn(payload) {
  if (payload?.degraded) {
    const score = payload.score == null ? null : Number(payload.score);
    return {
      feedback: String(payload.feedback || ''),
      score: Number.isFinite(score) ? score : null,
      improvements: Array.isArray(payload.improvements)
        ? payload.improvements.filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
        : [],
      next_question: String(payload.next_question || ''),
      is_last_question: payload.is_last_question === true,
      degraded: true,
      pendingReEvaluation: payload.pendingReEvaluation === true,
    };
  }

  const required = ['feedback', 'score', 'improvements', 'next_question', 'is_last_question'];
  if (!payload || !required.every((key) => Object.hasOwn(payload, key))) {
    throw new Error('The interview service returned an incomplete response.');
  }

  const score = Number(payload.score);
  if (!Number.isFinite(score) || score < 0 || score > 10 || !Array.isArray(payload.improvements)) {
    throw new Error('The interview service returned invalid feedback.');
  }

  return {
    feedback: String(payload.feedback || ''),
    score,
    improvements: payload.improvements
      .filter((item) => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean),
    next_question: String(payload.next_question || ''),
    is_last_question: payload.is_last_question === true,
    degraded: false,
    pendingReEvaluation: false,
  };
}

async function requestTurn(payload) {
  const raw = await callGeminiResilient(payload, {
    endpoint: '/api/interview/next-turn',
    modelChain: getGeminiModelChain(),
    degradedFallback: buildInterviewDegradedFallback,
  });

  return normalizeTurn(raw);
}

/**
 * Keeps a Gemini-compatible history entirely in the browser while Gemini calls
 * remain safely routed through the existing backend configuration.
 */
export function createInterviewOrchestrator({
  role = 'Software Engineer',
  topic = '',
  difficulty = 'medium',
  totalQuestions = 5,
} = {}) {
  let history = [];

  function buildPayload(historySlice, visualConfidence) {
    const payload = {
      role,
      topic,
      difficulty,
      total_questions: totalQuestions,
      history: historySlice,
    };

    if (Number.isFinite(Number(visualConfidence))) {
      payload.visual_confidence = Math.min(100, Math.max(0, Number(visualConfidence)));
    }

    return payload;
  }

  async function getNextTurn(previousAnswerTranscript, visualConfidence = null) {
    const userText = previousAnswerTranscript == null
      ? '[START_INTERVIEW]'
      : String(previousAnswerTranscript).trim();

    if (!userText) throw new Error('Your answer could not be transcribed. Please try again.');

    const pendingHistory = [...history, makeTurn('user', userText)];
    const turn = await requestTurn(buildPayload(pendingHistory, visualConfidence));
    history = [...pendingHistory, makeTurn('model', JSON.stringify(turn))];
    return turn;
  }

  async function reevaluateTurn(answerIndex) {
    const responseTurnIndex = 3 + (answerIndex * 2);
    if (responseTurnIndex >= history.length) return null;

    const historyPrefix = history.slice(0, responseTurnIndex);
    if (historyPrefix.at(-1)?.role !== 'user') return null;

    const turn = await requestTurn(buildPayload(historyPrefix));
    if (turn.degraded) return turn;

    history = [
      ...historyPrefix,
      makeTurn('model', JSON.stringify(turn)),
      ...history.slice(responseTurnIndex + 1),
    ];
    return turn;
  }

  return {
    getNextTurn,
    reevaluateTurn,
    reset: () => { history = []; },
    getHistory: () => history.map((turn) => ({ ...turn, parts: [...turn.parts] })),
  };
}
