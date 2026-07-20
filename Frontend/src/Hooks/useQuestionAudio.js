import { useCallback, useEffect, useRef, useState } from 'react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

// Keep one context for all interviewer questions. A MediaElementAudioSourceNode
// can only be created once for a given <audio> element, but every question gets
// its own element, analyser, and source node.
let appAudioContext = null;

function getAppAudioContext() {
  if (typeof window === 'undefined') return null;

  if (!appAudioContext || appAudioContext.state === 'closed') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    appAudioContext = new AudioContextClass();
  }

  return appAudioContext;
}

function connectPlaybackAnalyser(audio) {
  const context = getAppAudioContext();
  if (!context) return null;

  let sourceNode;
  try {
    sourceNode = context.createMediaElementSource(audio);
    const analyserNode = context.createAnalyser();
    analyserNode.fftSize = 512;
    analyserNode.smoothingTimeConstant = 0.7;

    // The analyser stays in the live playback path: media element -> analyser -> speakers.
    sourceNode.connect(analyserNode);
    analyserNode.connect(context.destination);

    return { context, sourceNode, analyserNode };
  } catch (err) {
    // Creating a media source reroutes output away from the element. Preserve
    // audible playback if an analyser graph cannot be completed.
    if (sourceNode) sourceNode.connect(context.destination);
    throw err;
  }
}

function disconnectPlaybackGraph(graph) {
  if (!graph) return;
  graph.sourceNode.disconnect();
  graph.analyserNode.disconnect();
}

function resolveAudioUrl(audioUrl) {
  if (!audioUrl) return null;
  if (/^https?:\/\//i.test(audioUrl)) return audioUrl;
  return `${API_BASE}/${audioUrl.replace(/^\//, '')}`;
}

function describeMediaError(audio) {
  const code = audio?.error?.code;
  const messages = {
    1: 'Audio loading was aborted.',
    2: 'Network error while loading interviewer audio.',
    3: 'Interviewer audio decoding failed.',
    4: 'Interviewer audio format is not supported.',
  };
  return messages[code] || audio?.error?.message || 'Unknown media playback error.';
}

/** Plays a Gemini PCM response that the backend has wrapped as a WAV file. */
export default function useQuestionAudio() {
  const audioRef = useRef(null);
  const playbackRef = useRef(null);
  const [audioAnalyser, setAudioAnalyser] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const finishPlayback = useCallback((completed, result = { success: completed }) => {
    const playback = playbackRef.current;
    if (!playback) return result;

    playbackRef.current = null;
    const {
      audio,
      graph,
      onEnded,
      onError,
      onPause,
      resolve,
    } = playback;
    audio.removeEventListener('ended', onEnded);
    audio.removeEventListener('error', onError);
    audio.removeEventListener('pause', onPause);
    if (!audio.paused) audio.pause();
    disconnectPlaybackGraph(graph);
    if (audioRef.current === audio) audioRef.current = null;
    setAudioAnalyser((current) => (current === graph?.analyserNode ? null : current));
    setIsPlaying(false);
    resolve(result);
    return result;
  }, []);

  const stopAudio = useCallback(() => {
    finishPlayback(false, { success: false, reason: 'stopped' });
  }, [finishPlayback]);

  const playAudio = useCallback(async (audioUrl) => {
    const source = resolveAudioUrl(audioUrl);
    if (!source) {
      const result = {
        success: false,
        reason: 'missing_url',
        message: 'The backend did not return interviewer audio (Gemini TTS likely failed during question generation).',
      };
      console.error('[useQuestionAudio] Missing audio URL from interview turn.', result);
      return result;
    }

    stopAudio();

    try {
      const probe = await fetch(source, { method: 'HEAD' });
      if (!probe.ok) {
        const result = {
          success: false,
          reason: 'http_error',
          httpStatus: probe.status,
          url: source,
          message: probe.status === 404
            ? `Interviewer audio file was not found at ${source}.`
            : `Interviewer audio request failed with HTTP ${probe.status} from ${source}.`,
        };
        console.error('[useQuestionAudio] Audio endpoint check failed.', result);
        return result;
      }
    } catch (err) {
      const result = {
        success: false,
        reason: 'network_error',
        url: source,
        message: `Could not reach the backend audio endpoint at ${source}. Is the FastAPI server running on ${API_BASE}?`,
        error: err,
      };
      console.error('[useQuestionAudio] Could not reach audio endpoint.', result);
      return result;
    }

    return new Promise((resolve) => {
      const audio = new Audio(source);
      let graph = null;

      try {
        graph = connectPlaybackAnalyser(audio);
      } catch (err) {
        // Audio must still be able to play if a browser does not expose Web Audio.
        // The avatar will remain in its silent pose in that unsupported case.
        console.warn('[useQuestionAudio] Could not attach playback analyser.', err);
      }

      const onEnded = () => finishPlayback(true, { success: true, url: source });
      const onError = () => {
        const result = {
          success: false,
          reason: 'media_error',
          url: source,
          message: describeMediaError(audio),
          mediaError: audio.error,
        };
        console.error('[useQuestionAudio] Audio element failed to load or play.', result);
        finishPlayback(false, result);
      };
      const onPause = () => {
        if (!audio.ended) {
          finishPlayback(false, { success: false, reason: 'paused', url: source });
        }
      };

      playbackRef.current = {
        audio,
        graph,
        onEnded,
        onError,
        onPause,
        resolve,
      };
      audioRef.current = audio;
      setAudioAnalyser(graph?.analyserNode || null);
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);
      audio.addEventListener('pause', onPause);

      audio.play()
        .then(async () => {
          if (graph?.context?.state === 'suspended') {
            try {
              await graph.context.resume();
            } catch (err) {
              console.warn('[useQuestionAudio] Audio is playing but its analyser context is suspended.', err);
            }
          }
          if (playbackRef.current?.audio === audio) setIsPlaying(true);
        })
        .catch((err) => {
          const result = {
            success: false,
            reason: 'play_rejected',
            url: source,
            message: err?.name === 'NotAllowedError'
              ? 'Browser blocked interviewer audio playback. Click the page once, then retry.'
              : `Browser refused to play interviewer audio: ${err?.message || 'unknown error'}`,
            error: err,
          };
          console.error('[useQuestionAudio] audio.play() rejected.', result);
          finishPlayback(false, result);
        });
    });
  }, [finishPlayback, stopAudio]);

  useEffect(() => stopAudio, [stopAudio]);

  return {
    audioAnalyser,
    isPlaying,
    playAudio,
    stopAudio,
  };
}
