import { useState, useRef, useCallback } from 'react';

const RECOVERABLE_ERRORS = new Set(['no-speech', 'aborted']);

function useSpeechToText() {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition is only supported in Chrome and Edge.');
      return;
    }

    setError(null);
    setTranscript('');
    shouldListenRef.current = true;

    function createRecognition() {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let text = '';
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        setTranscript(text.trim());
      };

      recognition.onerror = (event) => {
        if (RECOVERABLE_ERRORS.has(event.error)) return;
        setError(`Error: ${event.error}`);
        shouldListenRef.current = false;
        setIsListening(false);
      };

      recognition.onend = () => {
        if (shouldListenRef.current) {
          try {
            recognition.start();
          } catch {
            // Recognition may already be restarting; ignore.
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
    } catch {
      setError('Could not start speech recognition. Please reload and try again.');
      shouldListenRef.current = false;
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => setTranscript(''), []);

  return { transcript, isListening, error, startListening, stopListening, resetTranscript };
}

export default useSpeechToText;
