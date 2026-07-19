import { useEffect, useRef, useState } from 'react';
import useSpeechToText from '../Hooks/useSpeechToText';
import useTextToSpeech from '../Hooks/useTextToSpeech';
import { gradeAnswer } from '../Hooks/apiClient';

function detectEmotion(text) {
  const normalized = (text || '').toLowerCase();
  if (/(confident|great|excited|happy|love|awesome|sure)/.test(normalized)) return 'positive';
  if (/(nervous|worried|confused|sad|scared|bad|difficult)/.test(normalized)) return 'negative';
  return 'neutral';
}

function AnswerRecorder({ question, onSubmit }) {
  const { transcript, isListening, error, startListening, stopListening, resetTranscript } = useSpeechToText();
  const { speak, stopSpeaking } = useTextToSpeech();
  const [status, setStatus] = useState('Preparing...');
  const [result, setResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const silenceTimerRef = useRef(null);

  useEffect(() => {
    if (!question) return;

    setStatus('AI is speaking the question...');
    speak(question, { rate: 1.02 });

    const readyTimer = window.setTimeout(() => {
      setStatus('Listening for your answer...');
      startListening();
    }, 1200);

    return () => {
      window.clearTimeout(readyTimer);
      clearTimeout(silenceTimerRef.current);
      stopSpeaking();
      stopListening();
    };
  }, [question, speak, startListening, stopListening, stopSpeaking]);

  useEffect(() => {
    if (!transcript?.trim() || !isListening || isProcessing) return;

    clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = window.setTimeout(async () => {
      const finalText = transcript.trim();
      if (!finalText) return;

      setIsProcessing(true);
      setStatus('Analyzing your response...');
      stopListening();

      let payload;
      try {
        const gradingResult = await gradeAnswer({ question, answer: finalText });
        const emotion = detectEmotion(finalText);
        payload = { ...gradingResult, transcript: finalText, emotion };
      } catch (err) {
        console.error('Grading failed:', err);
        // Build a fallback result so the interview still advances
        const emotion = detectEmotion(finalText);
        payload = {
          score: 50,
          feedback: 'Grading service was unavailable — score is estimated.',
          transcript: finalText,
          emotion,
        };
      }

      setResult(payload);
      onSubmit?.(payload);
      resetTranscript();
      setIsProcessing(false);
      setStatus('Answer recorded.');
    }, 2200);

    return () => clearTimeout(silenceTimerRef.current);
  }, [transcript, isListening, isProcessing, question, stopListening, resetTranscript, onSubmit]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-400">{status}</p>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Your answer</p>
        <p className="mt-2 text-sm text-zinc-200">{transcript || 'Waiting for your voice...'}</p>
      </div>

      {result && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Feedback</p>
          <p className="mt-1 text-sm text-emerald-100">{result.feedback}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-zinc-300">
            <span>Score: {result.score}/100</span>
            <span>Emotion: {result.emotion}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnswerRecorder;
