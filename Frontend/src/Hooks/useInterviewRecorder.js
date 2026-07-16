import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Encapsulates camera/mic acquisition, live video preview, and
 * audio-only answer recording for the interview room.
 *
 * - Requests camera + mic together in one getUserMedia call, so the
 *   live preview and the recorded answer always come from the same
 *   permission grant (one prompt, not two).
 * - MediaRecorder is deliberately given an AUDIO-ONLY sub-stream
 *   (`new MediaStream(stream.getAudioTracks())`), since the spec calls
 *   for an audio Blob, not a video recording. The camera track keeps
 *   feeding the <video> preview regardless of recording state.
 * - Pass `onAnswerRecorded(blob)` to do something with the result —
 *   swap it for a real upload call once the backend endpoint exists.
 */
export function useInterviewRecorder({ onAnswerRecorded } = {}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

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
    };
  }, []);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || isRecording) return;

    const audioOnlyStream = new MediaStream(stream.getAudioTracks());
    const recorder = new MediaRecorder(audioOnlyStream);
    chunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.start();
    recorderRef.current = recorder;
    setIsRecording(true);
    setElapsedSeconds(0);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    recorder.onstop = () => {
      const audioBlob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      onAnswerRecorded?.(audioBlob);
    };

    recorder.stop();
    clearInterval(timerRef.current);
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
