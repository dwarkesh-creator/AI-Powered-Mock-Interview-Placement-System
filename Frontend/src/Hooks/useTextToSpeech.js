// Hooks/useTextToSpeech.js
//
// Free, built-in browser Text-to-Speech hook.
// No npm install needed, no API key needed — uses the browser's
// native window.speechSynthesis feature.
//
// Usage in a component:
//   import useTextToSpeech from '../Hooks/useTextToSpeech';
//   const { speak, stopSpeaking, isSpeaking } = useTextToSpeech();
//   speak("Tell me about yourself");

import { useState, useEffect, useCallback } from 'react';

function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState([]);

  // Load available voices (some browsers load these asynchronously)
  useEffect(() => {
    function loadVoices() {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) {
        setVoices(available);
      }
    }

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = useCallback((text, options = {}) => {
    if (!text) return;

    // Cancel any speech currently in progress to avoid overlap
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.lang || 'en-US';
    utterance.rate = options.rate || 1;
    utterance.pitch = options.pitch || 1;
    utterance.volume = options.volume || 1;

    // Try to use a natural-sounding voice if one is available
    if (voices.length > 0) {
      const preferred =
        voices.find((v) => v.name.includes('Google') && v.lang === utterance.lang) ||
        voices.find((v) => v.lang === utterance.lang);
      if (preferred) utterance.voice = preferred;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [voices]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return { speak, stopSpeaking, isSpeaking, voices };
}

export default useTextToSpeech;
