import { useState, useRef, useCallback } from 'react';

/**
 * Azure Speech-to-Text hook for reliable mobile transcription
 * Works on all browsers and devices (unlike Web Speech API)
 */
function useAzureSpeechToText() {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const shouldListenRef = useRef(false);

  const startListening = useCallback(async () => {
    setError(null);
    setTranscript('');
    shouldListenRef.current = true;
    audioChunksRef.current = [];

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (!shouldListenRef.current) return;

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());

        // Create audio blob and send to Azure
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await sendToAzure(audioBlob);
      };

      mediaRecorder.start();
      setIsListening(true);
      console.log('[Azure STT] Started listening');
    } catch (err) {
      console.error('[Azure STT] Error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone permission denied. Please allow microphone access.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found on this device.');
      } else {
        setError(`Microphone error: ${err.message}`);
      }
      setIsListening(false);
      shouldListenRef.current = false;
    }
  }, []);

  const sendToAzure = useCallback(async (audioBlob) => {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.wav');

      const response = await fetch(`${API_BASE}/api/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const recognizedText = data.transcript || '';

      if (recognizedText.trim()) {
        setTranscript(recognizedText);
        console.log('[Azure STT] Transcribed:', recognizedText);
      } else {
        setError('Could not understand audio. Please try again.');
      }
    } catch (err) {
      console.error('[Azure STT] Send error:', err);
      setError(`Transcription failed: ${err.message}`);
    } finally {
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    console.log('[Azure STT] Stopping listening');
    shouldListenRef.current = false;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    audioChunksRef.current = [];
  }, []);

  return { transcript, isListening, error, startListening, stopListening, resetTranscript };
}

export default useAzureSpeechToText;
