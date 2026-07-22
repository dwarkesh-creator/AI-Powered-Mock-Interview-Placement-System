import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Real-time Azure Speech-to-Text using client-side SDK with secure token auth
 * Works on ALL browsers (Chrome, Safari, Firefox) on desktop and mobile
 */
function useAzureRealtimeSTT() {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const recognizerRef = useRef(null);
  const shouldListenRef = useRef(false);

  // Load Azure Speech SDK dynamically
  useEffect(() => {
    if (window.SpeechSDK) {
      setIsSDKLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://aka.ms/csspeech/jsbrowserpackage-1.32.0.min.js';
    script.onload = () => {
      console.log('[Azure Realtime STT] SDK loaded');
      setIsSDKLoaded(true);
    };
    script.onerror = () => {
      console.error('[Azure Realtime STT] Failed to load SDK');
      setError('Failed to load speech recognition SDK');
    };
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const startListening = useCallback(async () => {
    if (!isSDKLoaded || !window.SpeechSDK) {
      setError('Speech SDK not loaded yet');
      return;
    }

    setError(null);
    setTranscript('');
    shouldListenRef.current = true;

    try {
      console.log('[Azure Realtime STT] Requesting token...');
      
      // Get temporary token from backend
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE}/api/speech/token`);
      
      if (!response.ok) {
        throw new Error(`Token request failed: ${response.status}`);
      }

      const { token, region } = await response.json();
      console.log('[Azure Realtime STT] Token received, region:', region);

      // Configure Azure Speech with token (not API key!)
      const speechConfig = window.SpeechSDK.SpeechConfig.fromAuthorizationToken(token, region);
      speechConfig.speechRecognitionLanguage = 'en-US';

      // Use default microphone
      const audioConfig = window.SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();

      // Create recognizer
      const recognizer = new window.SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
      recognizerRef.current = recognizer;

      // Real-time interim results
      recognizer.recognizing = (s, e) => {
        if (e.result.reason === window.SpeechSDK.ResultReason.RecognizingSpeech) {
          console.log('[Azure Realtime STT] Interim:', e.result.text);
          setTranscript(e.result.text);
        }
      };

      // Final results
      recognizer.recognized = (s, e) => {
        if (e.result.reason === window.SpeechSDK.ResultReason.RecognizedSpeech) {
          console.log('[Azure Realtime STT] Final:', e.result.text);
          setTranscript(e.result.text);
        } else if (e.result.reason === window.SpeechSDK.ResultReason.NoMatch) {
          console.log('[Azure Realtime STT] No speech detected');
        }
      };

      // Error handling
      recognizer.canceled = (s, e) => {
        console.error('[Azure Realtime STT] Canceled:', e.reason);
        if (e.reason === window.SpeechSDK.CancellationReason.Error) {
          setError(`Recognition error: ${e.errorDetails}`);
        }
        setIsListening(false);
        shouldListenRef.current = false;
      };

      recognizer.sessionStopped = (s, e) => {
        console.log('[Azure Realtime STT] Session stopped');
        setIsListening(false);
      };

      // Start continuous recognition
      recognizer.startContinuousRecognitionAsync(
        () => {
          console.log('[Azure Realtime STT] Started listening');
          setIsListening(true);
        },
        (err) => {
          console.error('[Azure Realtime STT] Start error:', err);
          setError(`Could not start recognition: ${err}`);
          setIsListening(false);
          shouldListenRef.current = false;
        }
      );
    } catch (err) {
      console.error('[Azure Realtime STT] Setup error:', err);
      setError(`Setup failed: ${err.message}`);
      setIsListening(false);
      shouldListenRef.current = false;
    }
  }, [isSDKLoaded]);

  const stopListening = useCallback(() => {
    console.log('[Azure Realtime STT] Stopping listening');
    shouldListenRef.current = false;

    if (recognizerRef.current) {
      recognizerRef.current.stopContinuousRecognitionAsync(
        () => {
          console.log('[Azure Realtime STT] Stopped');
          recognizerRef.current.close();
          recognizerRef.current = null;
          setIsListening(false);
        },
        (err) => {
          console.error('[Azure Realtime STT] Stop error:', err);
          setIsListening(false);
        }
      );
    } else {
      setIsListening(false);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  return { transcript, isListening, error, startListening, stopListening, resetTranscript };
}

export default useAzureRealtimeSTT;
