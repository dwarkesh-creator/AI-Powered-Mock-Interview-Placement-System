import { useCallback, useEffect, useRef, useState } from 'react';

const FRAME_WIDTH = 160;
const FRAME_HEIGHT = 120;

/**
 * Encapsulates camera/mic acquisition, live video preview, and
 * per-answer capture for the interview room.
 *
 * Two things get captured while recording:
 *  - AUDIO, via MediaRecorder on an audio-only sub-stream
 *    (`new MediaStream(stream.getAudioTracks())`) — sent to the
 *    backend for transcription.
 *  - FRAMES, sampled from the live <video> onto an offscreen canvas
 *    every `frameSampleMs` — this is what the backend's MediaPipe
 *    pass uses for confidence scoring (eye contact, head steadiness).
 *
 * `onAnswerRecorded({ audioBlob, frames })` fires once recording stops.
 */
export function useInterviewRecorder({ onAnswerRecorded, frameSampleMs = 1200 } = {}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const framesRef = useRef([]);
  const canvasRef = useRef(null);
  const timerRef = useRef(null);
  const frameTimerRef = useRef(null);

  const [permissionState, setPermissionState] = useState('pending'); // 'pending' | 'granted' | 'denied'
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Acquire camera + mic on mount, tear down on unmount.
  useEffect(() => {
    let cancelled = false;

    async function initMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setPermissionState('granted');
      } catch (err) {
        console.error('[useInterviewRecorder] getUserMedia failed:', err);
        if (!cancelled) setPermissionState('denied');
      }
    }

    initMedia();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      clearInterval(timerRef.current);
      clearInterval(frameTimerRef.current);
    };
  }, []);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return; // not enough data to draw yet

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = FRAME_WIDTH;
      canvasRef.current.height = FRAME_HEIGHT;
    }
    const ctx = canvasRef.current.getContext('2d');
    ctx.drawImage(video, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
    framesRef.current.push(canvasRef.current.toDataURL('image/jpeg', 0.6));
  }, []);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || isRecording) return;

    const audioOnlyStream = new MediaStream(stream.getAudioTracks());
    const recorder = new MediaRecorder(audioOnlyStream);
    chunksRef.current = [];
    framesRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.start();
    recorderRef.current = recorder;
    setIsRecording(true);
    setElapsedSeconds(0);

    timerRef.current = setInterval(() => setElapsedSeconds((prev) => prev + 1), 1000);
    captureFrame(); // grab one immediately, then keep sampling
    frameTimerRef.current = setInterval(captureFrame, frameSampleMs);
  }, [isRecording, captureFrame, frameSampleMs]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    recorder.onstop = () => {
      const audioBlob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      onAnswerRecorded?.({ audioBlob, frames: framesRef.current });
    };

    recorder.stop();
    clearInterval(timerRef.current);
    clearInterval(frameTimerRef.current);
    setIsRecording(false);
  }, [onAnswerRecorded]);

  return {
    videoRef,
    permissionState,
    isRecording,
    elapsedSeconds,
    startRecording,
    stopRecording,
  };
}
