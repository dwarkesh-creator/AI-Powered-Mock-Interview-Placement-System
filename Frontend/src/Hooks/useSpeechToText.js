import { useState, useRef, useCallback } from 'react';

const RECOVERABLE_ERRORS = new Set(['no-speech', 'aborted', 'audio-capture']);

function useSpeechToText() {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const restartCounterRef = useRef(0);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition is only supported in Chrome and Edge.');
      return;
    }

    setError(null);
    setTranscript('');
    shouldListenRef.current = true;
    restartCounterRef.current = 0;

    function createRecognition() {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      // Important: Set maxAlternatives to allow better transcription
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('[STT] Recognition started');
      };

      recognition.onresult = (event) => {
        let text = '';
        // Combine all results (interim and final)
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          text += transcript;
          // Log if final
          if (event.results[i].isFinal) {
            console.log('[STT] Final result:', transcript);
          }
        }
        if (text.trim()) {
          setTranscript(text.trim());
        }
      };

      recognition.onerror = (event) => {
        console.error('[STT] Error:', event.error);
        
        if (RECOVERABLE_ERRORS.has(event.error)) {
          // Auto-restart on recoverable errors (especially on mobile)
          if (shouldListenRef.current && restartCounterRef.current < 3) {
            restartCounterRef.current++;
            console.log('[STT] Auto-restarting after', event.error);
            return;
          }
          return;
        }
        
        // Handle permission denied specifically
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setError('Microphone permission denied. Please allow microphone access in browser settings.');
        } else if (event.error === 'network') {
          setError('Network error. Check your internet connection.');
        } else {
          setError(`Speech recognition error: ${event.error}`);
        }
        shouldListenRef.current = false;
        setIsListening(false);
      };

      recognition.onend = () => {
        console.log('[STT] Recognition ended');
        if (shouldListenRef.current && restartCounterRef.current < 3) {
          // Auto-restart on mobile when recognition naturally ends
          try {
            restartCounterRef.current++;
            console.log('[STT] Auto-restarting (attempt', restartCounterRef.current, ')');
            recognition.start();
          } catch (err) {
            console.log('[STT] Could not restart:', err);
          }
          return;
        }
        setIsListening(false);
      };

      return recognition;
    }

    const recognition = createRecognition();
    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
      console.log('[STT] Started listening');
    } catch (err) {
      console.error('[STT] Start error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow microphone access in your browser settings.');
      } else {
        setError('Could not start speech recognition. Please reload and try again.');
      }
      shouldListenRef.current = false;
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    console.log('[STT] Stopping listening');
    shouldListenRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    restartCounterRef.current = 0;
  }, []);

  return { transcript, isListening, error, startListening, stopListening, resetTranscript };
}

export default useSpeechToText;
