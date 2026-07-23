import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { useInterviewRecorder } from '../Hooks/useInterviewRecorder.js';
import { createSession } from '../Hooks/apiClient.js';
import { useAuth } from '../Context/AuthContext.jsx';
import AnswerRecorder from '../Component/AnswerRecorder.jsx';
import Avatar2D from '../Component/Avatar2D.jsx';
import InterviewSummary, { buildInterviewSummary } from '../Component/InterviewSummary.jsx';
import BuiltBy from '../Component/BuiltBy.jsx';
import { createInterviewOrchestrator } from '../services/interviewOrchestrator.js';

const DEFAULT_INTERVIEW_CONFIG = {
  role: 'Software Engineer',
  topic: 'software engineering fundamentals and project experience',
  difficulty: 'medium',
  totalQuestions: 5,
};

const LOADING_PHRASES = [
  "Preparing your personalized interview...",
  "Success is where preparation meets opportunity.",
  "Every expert was once a beginner. You've got this!",
  "Confidence comes from preparation and practice.",
  "Your future self will thank you for practicing today.",
  "The expert in anything was once a beginner.",
  "Practice isn't the thing you do once you're good. It's what makes you good.",
  "Loading your next career milestone...",
];

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function withTurnId(turn, transcript) {
  return {
    id: crypto.randomUUID(),
    ...turn,
    transcript,
  };
}

export default function InterviewRoom() {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth } = useAuth();
  const orchestratorRef = useRef(null);
  const reevaluatingRef = useRef(new Set());
  const [question, setQuestion] = useState('');
  const [questionAudio, setQuestionAudio] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isStarting, setIsStarting] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [startError, setStartError] = useState(null);
  const [evaluationError, setEvaluationError] = useState(null);
  const [interviewerAudioAnalyser, setInterviewerAudioAnalyser] = useState(null);
  const [isInterviewerSpeaking, setIsInterviewerSpeaking] = useState(false);
  const [isInterviewerListening, setIsInterviewerListening] = useState(false);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);

  const interviewConfig = useMemo(
    () => ({ ...DEFAULT_INTERVIEW_CONFIG, ...(location.state?.interviewConfig || {}) }),
    [location.state],
  );

  const { videoRef, permissionState, isRecording } = useInterviewRecorder();

  const startInterview = useCallback(async (reset = false) => {
    if (reset || !orchestratorRef.current) {
      orchestratorRef.current = createInterviewOrchestrator(interviewConfig);
    }

    setIsStarting(true);
    setStartError(null);
    try {
      const firstTurn = await orchestratorRef.current.getNextTurn(null);
      if (!firstTurn.next_question) {
        throw new Error('The interview service did not return the first question.');
      }
      setQuestionAudio({
        audioUrl: firstTurn.audioUrl,
        mouthCues: firstTurn.mouthCues || [],
        audioError: firstTurn.audioError || null,
      });
      setQuestion(firstTurn.next_question);
    } catch (err) {
      setStartError(err.message || 'Could not start the interview.');
    } finally {
      setIsStarting(false);
    }
  }, [interviewConfig]);

  useEffect(() => {
    startInterview(true);
  }, [startInterview]);

  // Rotate loading phrases while preparing first question
  useEffect(() => {
    if (!isStarting) return undefined;
    const interval = setInterval(() => {
      setLoadingPhraseIndex((prev) => (prev + 1) % LOADING_PHRASES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isStarting]);

  useEffect(() => {
    if (summary) return undefined;
    const interval = window.setInterval(() => setSessionSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(interval);
  }, [summary]);

  useEffect(() => {
    const orchestrator = orchestratorRef.current;
    if (!orchestrator) return undefined;

    const pendingAnswers = answers
      .map((answer, index) => ({ answer, index }))
      .filter(({ answer }) => answer.pendingReEvaluation);

    if (!pendingAnswers.length) return undefined;

    let cancelled = false;

    async function retryPendingEvaluations() {
      for (const { answer, index } of pendingAnswers) {
        if (cancelled || reevaluatingRef.current.has(answer.id)) continue;

        reevaluatingRef.current.add(answer.id);
        try {
          const refreshed = await orchestrator.reevaluateTurn(index);
          if (cancelled || !refreshed || refreshed.degraded || refreshed.pendingReEvaluation) continue;

          setAnswers((prev) => {
            const next = prev.map((item) => (
              item.id === answer.id
                ? {
                  ...item,
                  ...refreshed,
                  pendingReEvaluation: false,
                  degraded: false,
                }
                : item
            ));
            setSummary((current) => (current ? buildInterviewSummary(next) : current));
            return next;
          });
        } catch (err) {
          console.debug('Background interview re-evaluation failed:', err);
        } finally {
          reevaluatingRef.current.delete(answer.id);
        }
      }
    }

    retryPendingEvaluations();
    return () => { cancelled = true; };
  }, [answers, question, summary]);

  async function handleAnswerSubmitted({ transcript, visualConfidence }) {
    setEvaluationError(null);
    setIsTransitioning(true);
    try {
      const turn = await orchestratorRef.current.getNextTurn(transcript, visualConfidence);
      const completedAnswer = withTurnId({ ...turn, question, visualConfidence }, transcript);
      const completedAnswers = [...answers, completedAnswer];
      setAnswers(completedAnswers);

      if (turn.is_last_question) {
        const completedSummary = buildInterviewSummary(completedAnswers);
        setSummary(completedSummary);

        if (auth?.userId && !auth?.isGuest && completedSummary.scoredTurnCount > 0) {
          createSession({
            userId: auth.userId,
            role: `${interviewConfig.role} Mock Interview`,
            finalScore: Math.round(completedSummary.overallScore * 10),
          }).catch((err) => console.error('Failed to save session:', err));
        }
      } else {
        setQuestionAudio({
          audioUrl: turn.audioUrl,
          mouthCues: turn.mouthCues || [],
          audioError: turn.audioError || null,
        });
        setQuestion(turn.next_question);
      }

      return turn;
    } catch (err) {
      setEvaluationError(err.message || 'Could not evaluate your answer.');
      throw err;
    } finally {
      setIsTransitioning(false);
    }
  }

  const questionNumber = answers.length + 1;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 bg-grain text-zinc-50">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6 sm:py-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-200"
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
          <span className="hidden sm:inline">Exit interview</span>
          <span className="sm:hidden">Exit</span>
        </button>
        {!summary && question && (
          <span className="font-data text-[10px] text-zinc-500 sm:text-xs">
            Q{questionNumber}/{interviewConfig.totalQuestions}
          </span>
        )}
        <span className="font-data text-[10px] text-zinc-500 sm:text-xs sm:w-16 sm:text-right">{formatTime(sessionSeconds)}</span>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Interview Content Section - Full width on mobile, left side on desktop */}
        <section className={`flex flex-1 flex-col justify-center px-4 py-6 sm:px-8 sm:py-12 lg:px-10 xl:px-12 ${summary ? 'lg:w-full lg:border-r-0' : 'lg:w-[48%] lg:flex-none lg:border-r lg:border-white/10'}`}>
          {summary ? (
            <InterviewSummary summary={summary} onDone={() => navigate('/dashboard')} />
          ) : isStarting ? (
            <div className="motion-safe:animate-fade-in flex flex-col items-center text-center">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
              <p key={loadingPhraseIndex} className="mt-4 text-sm text-zinc-400 motion-safe:animate-fade-in">
                {LOADING_PHRASES[loadingPhraseIndex]}
              </p>
            </div>
          ) : startError ? (
            <div className="motion-safe:animate-fade-in">
              <AlertTriangle className="h-6 w-6 text-red-400" strokeWidth={1.75} />
              <p className="mt-4 text-sm text-zinc-400">{startError}</p>
              <button
                onClick={() => startInterview()}
                className="mt-5 rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:border-white/20"
              >
                Retry
              </button>
            </div>
          ) : (
            <div key={question} className="motion-safe:animate-fade-in">
              <div className="flex items-center gap-3">
                {interviewConfig.company && interviewConfig.company.id !== 'general' && (
                  <div
                    className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-xl sm:text-2xl"
                    title={interviewConfig.company.displayName}
                  >
                    {interviewConfig.company.logo}
                  </div>
                )}
                <div className="flex-1">
                  <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-zinc-500">
                    {interviewConfig.company && interviewConfig.company.id !== 'general'
                      ? `${interviewConfig.company.displayName} · ${interviewConfig.role} Interview`
                      : `${interviewConfig.role} Interview`}
                  </span>
                  {interviewConfig.company && interviewConfig.company.id !== 'general' && (
                    <p className="mt-0.5 text-[9px] sm:text-[10px] text-zinc-600">
                      {interviewConfig.company.interviewStyle} style
                    </p>
                  )}
                </div>
              </div>
              <h1 className="mt-4 text-2xl sm:text-3xl font-medium leading-snug tracking-tight text-zinc-50 lg:text-[32px] xl:text-4xl">
                {question}
              </h1>
              <p className="mt-3 sm:mt-4 text-sm sm:text-base text-zinc-500">
                Speak naturally, as you would in a real interview. Aim for under two minutes.
              </p>

              {/* PrepBuddy Interviewer Avatar */}
              <div className="mt-4 sm:mt-5">
                <Avatar2D
                  analyserNode={interviewerAudioAnalyser}
                  isSpeaking={isInterviewerSpeaking}
                  isListening={isInterviewerListening}
                />
              </div>

              <div className="mt-4 sm:mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-4">
                <AnswerRecorder
                  question={question}
                  questionAudio={questionAudio}
                  onSubmit={handleAnswerSubmitted}
                  videoRef={videoRef}
                  isTransitioning={isTransitioning}
                  onAudioAnalyserChange={setInterviewerAudioAnalyser}
                  onInterviewerSpeakingChange={setIsInterviewerSpeaking}
                  onListeningChange={setIsInterviewerListening}
                />
              </div>

              {evaluationError && (
                <p className="mt-3 text-xs text-red-400">{evaluationError}</p>
              )}

              {permissionState === 'denied' && (
                <p className="mt-4 sm:mt-6 flex items-start gap-2 text-xs text-red-400/90">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                  Camera and microphone access was blocked. Enable it in your browser's site settings and reload to answer.
                </p>
              )}
            </div>
          )}
        </section>

        {/* Video Section - Hidden when showing summary */}
        {!summary && (
          <section className="relative flex flex-1 items-center justify-center bg-zinc-950 p-4 sm:p-6 lg:p-8 xl:p-10">
            <div className="relative w-full max-w-lg lg:max-w-3xl xl:max-w-4xl">
              {isRecording && <div className="absolute -inset-2 sm:-inset-3 lg:-inset-4 rounded-[20px] sm:rounded-[28px] bg-white/[0.06] blur-xl motion-safe:animate-breathe" />}
              <div className="relative aspect-video w-full overflow-hidden rounded-xl sm:rounded-2xl border border-white/10 bg-zinc-900">
                <video ref={videoRef} autoPlay muted playsInline className="h-full w-full scale-x-[-1] object-cover" />
                {permissionState === 'pending' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900">
                    <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
                    <span className="text-xs text-zinc-500">Requesting camera access...</span>
                  </div>
                )}
                {permissionState === 'denied' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900 px-6 text-center">
                    <AlertTriangle className="h-5 w-5 text-zinc-600" strokeWidth={1.5} />
                    <span className="text-xs text-zinc-500">Camera unavailable</span>
                  </div>
                )}
                {permissionState === 'granted' && (
                  <span className="absolute left-2 top-2 sm:left-3 sm:top-3 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-medium text-zinc-200 backdrop-blur">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    LIVE
                  </span>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Footer - Fixed at bottom on mobile, hidden when keyboard is open */}
      <footer className="border-t border-white/10 px-4 py-2 sm:px-6 sm:py-3 text-center">
        <BuiltBy />
      </footer>
    </div>
  );
}
