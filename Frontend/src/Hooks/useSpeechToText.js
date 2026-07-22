import { useState, useRef, useCallback } from 'react';

const RECOVERABLE_ERRORS = new Set(['no-speech', 'aborted', 'audio-capture']);
const MAX_RESTART_ATTEMPTS = 5;

function useSpeechToText() {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const restartCounterRef = useRef(0);
  const lastTranscriptRef = useRef('');

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
    lastTranscriptRef.current = '';

    function createRecognition() {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('[STT] Recognition started');
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let finalText = '';
        let interimText = '';
        
        // Separate final and interim results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += transcript + ' ';
            console.log('[STT] Final result:', transcript);
          } else {
            interimText += transcript;
          }
        }

        // Update transcript with final + interim
        const fullText = (lastTranscriptRef.current + finalText + interimText).trim();
        if (fullText) {
          setTranscript(fullText);
        }
        
        // Store final text
        if (finalText) {
          lastTranscriptRef.current += finalText;
        }
      };

      recognition.onerror = (event) => {
        console.error('[STT] Error:', event.error);
        
        // Auto-restart on recoverable errors
        if (RECOVERABLE_ERRORS.has(event.error)) {
          if (shouldListenRef.current && restartCounterRef.current < MAX_RESTART_ATTEMPTS) {
            restartCounterRef.current++;
            console.log('[STT] Auto-restarting after', event.error, '(attempt', restartCounterRef.current, ')');
            setTimeout(() => {
              if (shouldListenRef.current) {
                try {
                  recognition.start();
                } catch (err) {
                  console.log('[STT] Restart failed:', err);
                }
              }
            }, 100);
          }
          return;
        }
        
        // Handle fatal errors
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setError('Microphone permission denied. Please allow microphone access.');
        } else if (event.error === 'network') {
          setError('Network error. Check your internet connection.');
        } else if (event.error === 'service-not-allowed') {
          setError('Speech service not available. Try using Chrome browser.');
        } else {
          setError(`Speech recognition error: ${event.error}`);
        }
        shouldListenRef.current = false;
        setIsListening(false);
      };

      recognition.onend = () => {
        console.log('[STT] Recognition ended');
        
        // Auto-restart if should still be listening
        if (shouldListenRef.current && restartCounterRef.current < MAX_RESTART_ATTEMPTS) {
          restartCounterRef.current++;
          console.log('[STT] Auto-restarting (attempt', restartCounterRef.current, ')');
          setTimeout(() => {
            if (shouldListenRef.current) {
              try {
                recognition.start();
              } catch (err) {
                console.log('[STT] Restart failed:', err);
                setIsListening(false);
              }
            }
          }, 100);
        } else {
          setIsListening(false);
        }
      };

      return recognition;
    }

    const recognition = createRecognition();
    recognitionRef.current = recognition;

    try {
      recognition.start();
      console.log('[STT] Started listening');
    } catch (err) {
      console.error('[STT] Start error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow microphone access.');
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
    lastTranscriptRef.current = '';
    restartCounterRef.current = 0;
  }, []);

  return { transcript, isListening, error, startListening, stopListening, resetTranscript };
}

export default useSpeechToText;
