import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import useConfidenceDetector from '../Hooks/useConfidenceDetector';
import useQuestionAudio from '../Hooks/useQuestionAudio';
import useSpeechToText from '../Hooks/useSpeechToText';
import useTextToSpeech from '../Hooks/useTextToSpeech';

function AnswerRecorder({
  question,
  questionAudio,
  onSubmit,
  videoRef,
  isTransitioning = false,
  onAudioAnalyserChange,
  onInterviewerSpeakingChange,
  onListeningChange,
}) {
  const { transcript, isListening, error, startListening, stopListening, resetTranscript } = useSpeechToText();
  const {
    audioAnalyser,
    isPlaying,
    playAudio,
    stopAudio,
  } = useQuestionAudio();
  const { speak, stopSpeaking, isSpeaking } = useTextToSpeech();
  const { liveConfidence, averageConfidence, isTracking } = useConfidenceDetector(videoRef, isListening);
  const [status, setStatus] = useState('Preparing...');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInputReady, setIsInputReady] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);
  const silenceTimerRef = useRef(null);
  const submittedRef = useRef(false);

  const latest = useRef({});
  latest.current = {
    startListening,
    stopListening,
    playAudio,
    stopAudio,
    speak,
    stopSpeaking,
    resetTranscript,
    onSubmit,
    isProcessing,
    isInputReady,
    isTransitioning,
    averageConfidence,
    question,
    transcript,
  };

  useEffect(() => {
    onAudioAnalyserChange?.(audioAnalyser);
  }, [audioAnalyser, onAudioAnalyserChange]);

  useEffect(() => {
    onInterviewerSpeakingChange?.(isPlaying || isSpeaking);
    return () => onInterviewerSpeakingChange?.(false);
  }, [isPlaying, isSpeaking, onInterviewerSpeakingChange]);

  useEffect(() => {
    onListeningChange?.(isListening);
    return () => onListeningChange?.(false);
  }, [isListening, onListeningChange]);

  async function submitAnswer(finalText) {
    const text = finalText?.trim();
    if (
      !text
      || submittedRef.current
      || latest.current.isProcessing
      || !latest.current.isInputReady
      || latest.current.isTransitioning
    ) return;

    submittedRef.current = true;
    clearTimeout(silenceTimerRef.current);
    setIsProcessing(true);
    setSubmissionError(null);
    setStatus('Interviewer is thinking...');
    const visualConfidence = latest.current.averageConfidence;
    latest.current.stopListening();

    try {
      const turn = await latest.current.onSubmit?.({ transcript: text, visualConfidence });
      if (!turn) throw new Error('The interview service returned no next step.');

      latest.current.resetTranscript();
    } catch (err) {
      console.error('Interview turn failed:', err);
      setSubmissionError(err.message || 'Could not evaluate your answer.');
      setStatus('Evaluation failed.');
      submittedRef.current = false;
    } finally {
      setIsProcessing(false);
    }
  }

  useEffect(() => {
    if (!question) return;

    submittedRef.current = false;
    setIsProcessing(false);
    setIsInputReady(false);
    setSubmissionError(null);

    let cancelled = false;

    async function beginQuestion() {
      window.speechSynthesis?.cancel();
      setStatus('NilGen is speaking the question...');

      const playback = await latest.current.playAudio(questionAudio?.audioUrl);
      if (cancelled) return;

      if (!playback?.success) {
        const backendReason = questionAudio?.audioError
          ? ` Backend TTS error: ${questionAudio.audioError}`
          : '';
        const detail = playback?.message || 'Interviewer audio could not be loaded.';
        console.error('[AnswerRecorder] Saved interviewer audio unavailable.', {
          playback,
          questionAudio,
        });

        if (latest.current.question) {
          console.warn('[AnswerRecorder] Falling back to browser text-to-speech.');
          setStatus('Saved voice unavailable — using browser speech instead...');
          await latest.current.speak(latest.current.question, { rate: 1.02 });
          if (cancelled) return;
        } else {
          setSubmissionError(`${detail}${backendReason}`);
          setStatus('Interviewer audio unavailable.');
          return;
        }
      }

      setStatus('Listening for your answer...');
      latest.current.startListening();
      setIsInputReady(true);
    }

    beginQuestion();

    return () => {
      cancelled = true;
      clearTimeout(silenceTimerRef.current);
      window.speechSynthesis?.cancel();
      latest.current.stopSpeaking();
      latest.current.stopAudio();
      latest.current.stopListening();
    };
  }, [question, questionAudio]);

  useEffect(() => {
    if (
      !transcript?.trim()
      || submittedRef.current
      || latest.current.isProcessing
      || !latest.current.isInputReady
      || latest.current.isTransitioning
    ) return;

    clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = window.setTimeout(() => {
      submitAnswer(latest.current.transcript);
    }, 2200);

    return () => clearTimeout(silenceTimerRef.current);
  }, [transcript]);

  const submitDisabled = (
    isProcessing
    || isTransitioning
    || !isInputReady
    || submittedRef.current
  );

  return (
    <div className="space-y-3">
      {isTransitioning ? (
        <div className="flex items-center gap-2 py-3 text-sm text-zinc-500" role="status" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
          <span>Interviewer is thinking<span className="animate-pulse">...</span></span>
        </div>
      ) : (
        <>
          <p className="text-sm text-zinc-400">{status}</p>

          {isListening && (
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1.5 text-xs text-sky-100">
              <span className={`h-1.5 w-1.5 rounded-full ${isTracking ? 'bg-sky-300 animate-pulse' : 'bg-zinc-500'}`} />
              {isTracking
                ? (liveConfidence == null
                  ? 'Confidence: no face detected'
                  : `Confidence: ${liveConfidence} — analyzing...`)
                : 'Confidence: starting analysis...'}
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
          {submissionError && <p className="text-sm text-red-400">{submissionError}</p>}

          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Your answer</p>
            <p className="mt-2 text-sm text-zinc-200">
              {transcript || (isListening ? 'Listening... speak your answer.' : 'Waiting for your voice...')}
            </p>
          </div>

          {transcript?.trim() && (
            <button
              type="button"
              onClick={() => submitAnswer(transcript)}
              disabled={submitDisabled}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing ? 'Submitting answer...' : (submissionError ? 'Retry evaluation' : "I'm done - submit answer")}
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default AnswerRecorder;
