import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Real-time Azure Speech-to-Text using client-side SDK with secure token auth
 * Works on ALL browsers (Chrome, Safari, Firefox) on desktop and mobile
 * Falls back to Web Speech API if Azure SDK fails to load
 */
function useAzureRealtimeSTT() {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [useWebSpeech, setUseWebSpeech] = useState(false);
  const recognizerRef = useRef(null);
  const webSpeechRecognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const tokenExpiryRef = useRef(null);
  const refreshTimerRef = useRef(null);

  // Load Azure Speech SDK dynamically
  useEffect(() => {
    if (window.SpeechSDK) {
      setIsSDKLoaded(true);
      return;
    }

    const script = document.createElement('script');
    // Use Microsoft's CDN directly
    script.src = 'https://cdn.jsdelivr.net/npm/microsoft-cognitiveservices-speech-sdk@1.34.1/distrib/browser/microsoft.cognitiveservices.speech.sdk.bundle.min.js';
    script.crossOrigin = 'anonymous';
    
    script.onload = () => {
      console.log('[Azure Realtime STT] SDK loaded successfully');
      setIsSDKLoaded(true);
    };
    
    script.onerror = (e) => {
      console.error('[Azure Realtime STT] Failed to load SDK, falling back to Web Speech API');
      setUseWebSpeech(true);
      setIsSDKLoaded(false);
    };
    
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const startListening = useCallback(async () => {
    // Fallback to Web Speech API if Azure SDK failed to load
    if (useWebSpeech) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setError('Speech recognition not supported in this browser');
        return;
      }

      console.log('[STT] Using Web Speech API fallback');
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event) => {
        let text = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        if (text.trim()) {
          setTranscript(text.trim());
        }
      };

      recognition.onerror = (event) => {
        console.error('[STT] Error:', event.error);
        setError(`Speech recognition error: ${event.error}`);
      };

      recognition.onend = () => {
        if (shouldListenRef.current) {
          try {
            recognition.start();
          } catch (err) {
            console.log('[STT] Could not restart');
          }
        } else {
          setIsListening(false);
        }
      };

      webSpeechRecognitionRef.current = recognition;
      try {
        recognition.start();
        setIsListening(true);
        shouldListenRef.current = true;
      } catch (err) {
        setError('Could not start speech recognition');
      }
      return;
    }

    // Original Azure code
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

      // Token expires in 10 minutes, refresh at 8 minutes
      tokenExpiryRef.current = Date.now() + (10 * 60 * 1000);
      
      // Set up auto-refresh at 8 minutes
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      refreshTimerRef.current = setTimeout(() => {
        console.log('[Azure Realtime STT] Token expiring soon, refreshing...');
        // Stop and restart with new token
        if (shouldListenRef.current) {
          stopListening();
          setTimeout(() => {
            startListening();
          }, 500);
        }
      }, 8 * 60 * 1000); // Refresh at 8 minutes

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
  }, [isSDKLoaded, useWebSpeech]);

  const stopListening = useCallback(() => {
    console.log('[Azure Realtime STT] Stopping listening');
    shouldListenRef.current = false;

    // Clear refresh timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    // Stop Web Speech API if using fallback
    if (webSpeechRecognitionRef.current) {
      webSpeechRecognitionRef.current.stop();
      webSpeechRecognitionRef.current = null;
      setIsListening(false);
      return;
    }

    // Stop Azure recognizer
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
