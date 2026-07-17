import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Mic, AlertTriangle, Loader2 } from 'lucide-react';
import { useInterviewRecorder } from '../hooks/useInterviewRecorder.js';
import { useSpeechToText } from '../hooks/useSpeechToText.js';
import { analyzeAnswer, completeInterview } from '../services/interviewApi.js';
import { interviewQuestions } from '../data/mockData.js';

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function InterviewRoom() {
  const navigate = useNavigate();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [finalReport, setFinalReport] = useState(null);

  const {
    transcript,
    isListening,
    isSupported: isSttSupported,
    startListening,
    stopListening,
  } = useSpeechToText();

  const { videoRef, permissionState, isRecording, elapsedSeconds, startRecording, stopRecording } =
    useInterviewRecorder({
      onAnswerRecorded: async ({ audioBlob, frames }) => {
        // The live on-screen transcript above comes from the browser's
        // Web Speech API (UX only). The AUTHORITATIVE transcript used
        // for scoring comes back from the backend's own Whisper pass
        // over `audioBlob` — that's why it isn't sent here.
        try {
          const analysis = await analyzeAnswer({
            questionIndex,
            question: interviewQuestions[questionIndex],
            audioBlob,
            frames,
          });
          setAnswers((prev) => [...prev, analysis]);
        } catch (err) {
          console.error('[InterviewRoom] analyze-answer failed:', err);
          setAnalysisError(
            'Could not reach the analysis service — make sure the Flask backend is running on port 5000.'
          );
          setIsAnalyzing(false);
        }
      },
    });

  const isFinished = finalReport !== null;

  // Session clock — runs for the whole interview, independent of the
  // per-answer recording timer shown next to the controls.
  useEffect(() => {
    if (isFinished) return;
    const interval = setInterval(() => setSessionSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isFinished]);

  // `answers` growing is the single source of truth for progression —
  // advance to the next question, or wrap up once every question has
  // been analyzed. Avoids juggling index state inside the async
  // onAnswerRecorded callback above.
  useEffect(() => {
    if (answers.length === 0) return;
    if (answers.length < interviewQuestions.length) {
      setQuestionIndex(answers.length);
      setIsAnalyzing(false);
    } else {
      completeInterview(answers)
        .then((report) => {
          setFinalReport(report);
          setIsAnalyzing(false);
        })
        .catch((err) => {
          console.error('[InterviewRoom] complete failed:', err);
          setAnalysisError(
            'Could not generate the final report — make sure the Flask backend is running.'
          );
          setIsAnalyzing(false);
        });
    }
  }, [answers]);

  function handleStartAnswering() {
    startRecording();
    startListening();
  }

  function handleSubmitAnswer() {
    stopRecording();
    stopListening();
    setIsAnalyzing(true);
  }

  function retry() {
    setAnalysisError(null);
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 bg-grain text-zinc-50">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-200"
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
          Exit interview
        </button>
        {!isFinished && (
          <span className="font-data text-xs text-zinc-500">
            Question {questionIndex + 1} of {interviewQuestions.length}
          </span>
        )}
        <span className="font-data w-16 text-right text-xs text-zinc-500">
          {formatTime(sessionSeconds)}
        </span>
      </header>

      {/* Split screen */}
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Left: AI question + recording controls */}
        <section className="flex flex-1 flex-col justify-center border-b border-white/10 px-8 py-12 lg:w-[42%] lg:flex-none lg:border-b-0 lg:border-r lg:px-12">
          {isFinished ? (
            <div className="motion-safe:animate-fade-in">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Interview complete
              </span>
              <p className="font-data mt-3 text-6xl font-semibold text-zinc-50">
                {finalReport.overallScore}
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                Avg correctness{' '}
                {Math.round(
                  answers.reduce((s, a) => s + a.correctness.score, 0) / answers.length
                )}
                % · Avg confidence{' '}
                {Math.round(
                  answers.reduce((s, a) => s + a.confidence.score, 0) / answers.length
                )}
                %
              </p>

              <div className="mt-6 max-h-64 space-y-2 overflow-y-auto pr-1">
                {answers.map((a, i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <p className="text-xs text-zinc-400">
                      Q{i + 1} · {a.correctness.score}% correct · {a.confidence.label} confidence
                    </p>
                    <p className="mt-1 text-xs italic text-zinc-500">&ldquo;{a.transcript}&rdquo;</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate('/dashboard')}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
              >
                Back to dashboard
              </button>
            </div>
          ) : analysisError ? (
            <div className="motion-safe:animate-fade-in">
              <AlertTriangle className="h-6 w-6 text-red-400" strokeWidth={1.75} />
              <p className="mt-4 text-sm text-zinc-400">{analysisError}</p>
              <button
                onClick={retry}
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-white/20 hover:text-white"
              >
                Try again
              </button>
            </div>
          ) : isAnalyzing ? (
            <div className="motion-safe:animate-fade-in">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-500" strokeWidth={1.75} />
              <p className="mt-4 text-sm text-zinc-400">
                Analyzing your answer — transcribing speech and scoring confidence…
              </p>
            </div>
          ) : (
            <div key={questionIndex} className="motion-safe:animate-fade-in">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                AI Question
              </span>
              <h1 className="mt-4 text-2xl font-medium leading-snug tracking-tight text-zinc-50 lg:text-[28px]">
                {interviewQuestions[questionIndex]}
              </h1>
              <p className="mt-4 text-sm text-zinc-500">
                Speak naturally, as you would in a real interview. Aim for under two minutes.
              </p>

              <div className="mt-10 flex items-center gap-4">
                {!isRecording ? (
                  <button
                    onClick={handleStartAnswering}
                    disabled={permissionState !== 'granted'}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Mic className="h-4 w-4" strokeWidth={2} />
                    Start Answering
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitAnswer}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
                  >
                    <span className="h-2.5 w-2.5 rounded-sm bg-black" />
                    Submit Answer
                  </button>
                )}

                {isRecording && (
                  <span className="inline-flex items-center gap-2 text-xs text-zinc-500">
                    <span className="h-2 w-2 rounded-full bg-red-500 motion-safe:animate-pulse" />
                    <span className="font-data">{formatTime(elapsedSeconds)}</span>
                  </span>
                )}
              </div>

              {(isListening || transcript) && (
                <div className="mt-6 rounded-xl border border-white/10 bg-zinc-900/50 p-4">
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Live transcript
                  </p>
                  <p className="text-sm leading-relaxed text-zinc-300">
                    {transcript || 'Listening…'}
                  </p>
                </div>
              )}

              {!isSttSupported && (
                <p className="mt-3 text-xs text-zinc-600">
                  Live captions aren't supported in this browser — audio is still recorded
                  normally.
                </p>
              )}

              {permissionState === 'denied' && (
                <p className="mt-6 flex items-start gap-2 text-xs text-red-400/90">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                  Camera and microphone access was blocked. Enable it in your browser's site
                  settings and reload to answer.
                </p>
              )}
            </div>
          )}
        </section>

        {/* Right: live video feed */}
        <section className="relative flex flex-1 items-center justify-center bg-zinc-950 p-8 lg:p-12">
          <div className="relative aspect-video w-full max-w-2xl">
            {isRecording && (
              <div className="absolute -inset-3 rounded-[28px] bg-white/[0.06] blur-xl motion-safe:animate-breathe" />
            )}

            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="h-full w-full scale-x-[-1] object-cover"
              />

              {permissionState === 'pending' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900">
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
                  <span className="text-xs text-zinc-500">Requesting camera access…</span>
                </div>
              )}

              {permissionState === 'denied' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900 px-6 text-center">
                  <AlertTriangle className="h-5 w-5 text-zinc-600" strokeWidth={1.5} />
                  <span className="text-xs text-zinc-500">Camera unavailable</span>
                </div>
              )}

              {permissionState === 'granted' && (
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-medium text-zinc-200 backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  LIVE
                </span>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
