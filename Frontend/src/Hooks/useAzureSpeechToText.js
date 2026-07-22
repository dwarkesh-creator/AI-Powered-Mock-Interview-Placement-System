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
  const recordingTimerRef = useRef(null);

  const sendToAzure = useCallback(async (audioBlob) => {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    try {
      console.log('[Azure STT] Sending audio blob to backend...', audioBlob.size, 'bytes');
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.wav');

      const response = await fetch(`${API_BASE}/api/transcribe`, {
        method: 'POST',
        body: formData,
      });

      console.log('[Azure STT] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Azure STT] Error response:', errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[Azure STT] Response data:', data);
      
      const recognizedText = data.transcript || '';

      if (recognizedText.trim()) {
        setTranscript(recognizedText);
        setError(null);
        console.log('[Azure STT] Transcribed successfully:', recognizedText);
      } else {
        console.warn('[Azure STT] No text recognized');
        setError(data.error || 'Could not understand audio. Please try again.');
      }
    } catch (err) {
      console.error('[Azure STT] Send error:', err);
      setError(`Transcription failed: ${err.message}`);
    } finally {
      setIsListening(false);
    }
  }, []);

  const startListening = useCallback(async () => {
    setError(null);
    setTranscript('');
    shouldListenRef.current = true;
    audioChunksRef.current = [];

    try {
      console.log('[Azure STT] Requesting microphone access...');
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      streamRef.current = stream;
      console.log('[Azure STT] Microphone access granted');

      // Create MediaRecorder with fallback to default format
      let mediaRecorder;
      const mimeTypes = [
        'audio/webm',
        'audio/webm;codecs=opus',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        ''  // Let browser choose
      ];
      
      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (!mimeType || MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          console.log('[Azure STT] Using MIME type:', mimeType || 'browser default');
          break;
        }
      }
      
      if (selectedMimeType) {
        mediaRecorder = new MediaRecorder(stream, { mimeType: selectedMimeType });
      } else {
        mediaRecorder = new MediaRecorder(stream);
      }
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('[Azure STT] Audio chunk received:', event.data.size, 'bytes');
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('[Azure STT] Recording stopped, processing...');
        
        if (!shouldListenRef.current) {
          console.log('[Azure STT] Listening stopped, discarding audio');
          return;
        }

        // Stop all tracks
        stream.getTracks().forEach((track) => {
          track.stop();
          console.log('[Azure STT] Stopped track:', track.kind);
        });

        // Create audio blob and send to Azure
        if (audioChunksRef.current.length === 0) {
          console.warn('[Azure STT] No audio data recorded');
          setError('No audio recorded. Please try again.');
          setIsListening(false);
          return;
        }

        console.log('[Azure STT] Creating blob from', audioChunksRef.current.length, 'chunks');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('[Azure STT] Blob created:', audioBlob.size, 'bytes');
        
        await sendToAzure(audioBlob);
      };

      mediaRecorder.onerror = (event) => {
        console.error('[Azure STT] MediaRecorder error:', event.error);
        setError(`Recording error: ${event.error}`);
        setIsListening(false);
        shouldListenRef.current = false;
      };

      mediaRecorder.start();
      setIsListening(true);
      console.log('[Azure STT] Started listening');
      
      // Auto-stop after 10 seconds to send audio to Azure
      recordingTimerRef.current = setTimeout(() => {
        console.log('[Azure STT] Auto-stopping after 10 seconds');
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      }, 10000);
    } catch (err) {
      console.error('[Azure STT] Startup error:', err);
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
  }, [sendToAzure]);

  const stopListening = useCallback(() => {
    console.log('[Azure STT] Stopping listening');
    shouldListenRef.current = false;
    
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.log('[Azure STT] Stopping recorder in state:', mediaRecorderRef.current.state);
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log('[Azure STT] Stopped track from stream');
      });
    }

    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
    audioChunksRef.current = [];
  }, []);

  return { transcript, isListening, error, startListening, stopListening, resetTranscript };
}

export default useAzureSpeechToText;
