import { useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const SAMPLE_INTERVAL_MS = 450;
const WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_ASSET_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task';

// These weights intentionally favor visible, camera-facing posture. Tune them
// here instead of changing the scoring formula below.
const HEAD_POSE_WEIGHT = 0.5;
const BLINK_WEIGHT = 0.2;
const EXPRESSION_WEIGHT = 0.3;

const MAX_YAW_DEGREES = 30;
const MAX_PITCH_DEGREES = 22;
const IDEAL_BLINKS_PER_MINUTE = 15;
const BLINK_CLOSED_THRESHOLD = 0.55;
const BLINK_RATE_WARMUP_MS = 15_000;
const MILD_SMILE_TARGET = 0.35;
const HEAVY_SMILE_THRESHOLD = 0.7;

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function degrees(radians) {
  return (radians * 180) / Math.PI;
}

function blendshapeValue(categories, name) {
  return categories.find((category) => category.categoryName === name)?.score || 0;
}

function headPoseScore(matrix) {
  const values = matrix?.data || matrix;
  if (!values || values.length < 16) return 70;

  // The facial transformation matrix contains the head rotation. We only need
  // rough yaw/pitch here; this is a lightweight delivery heuristic, not a pose
  // estimation system.
  const yaw = Math.abs(degrees(Math.atan2(values[8], values[10])));
  const pitch = Math.abs(degrees(Math.atan2(-values[9], Math.hypot(values[0], values[5]))));
  const yawPenalty = clamp((yaw / MAX_YAW_DEGREES) * 100);
  const pitchPenalty = clamp((pitch / MAX_PITCH_DEGREES) * 100);

  return clamp(100 - ((yawPenalty * 0.6) + (pitchPenalty * 0.4)));
}

function expressionScore(categories) {
  const smile = (blendshapeValue(categories, 'mouthSmileLeft') + blendshapeValue(categories, 'mouthSmileRight')) / 2;
  const browTension = (blendshapeValue(categories, 'browDownLeft') + blendshapeValue(categories, 'browDownRight')) / 2;
  const smileBoost = clamp((smile / MILD_SMILE_TARGET) * 35, 0, 35);
  const heavySmilePenalty = smile > HEAVY_SMILE_THRESHOLD
    ? ((smile - HEAVY_SMILE_THRESHOLD) / (1 - HEAVY_SMILE_THRESHOLD)) * 15
    : 0;

  // A relaxed neutral expression is acceptable; a mild smile helps while brow
  // tension lowers the delivery signal.
  return clamp(65 + smileBoost - (browTension * 70) - heavySmilePenalty);
}

/**
 * Samples the existing interview webcam and derives a non-diagnostic visual
 * delivery estimate. A null liveConfidence means no face was found in the
 * most recent frame; those frames are excluded from the running average.
 */
export default function useConfidenceDetector(videoRef, isActive) {
  const [liveConfidence, setLiveConfidence] = useState(null);
  const [averageConfidence, setAverageConfidence] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const detectorRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastSampleAtRef = useRef(0);
  const scoreTotalRef = useRef(0);
  const scoreCountRef = useRef(0);
  const startedAtRef = useRef(0);
  const blinkTimestampsRef = useRef([]);
  const eyesClosedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let landmarker = null;

    function resetTracking() {
      lastSampleAtRef.current = 0;
      scoreTotalRef.current = 0;
      scoreCountRef.current = 0;
      startedAtRef.current = 0;
      blinkTimestampsRef.current = [];
      eyesClosedRef.current = false;
      setLiveConfidence(null);
      setAverageConfidence(null);
      setIsTracking(false);
    }

    function blinkScore(categories, timestamp) {
      const blinkAmount = (
        blendshapeValue(categories, 'eyeBlinkLeft')
        + blendshapeValue(categories, 'eyeBlinkRight')
      ) / 2;
      const eyesClosed = blinkAmount >= BLINK_CLOSED_THRESHOLD;

      if (eyesClosed && !eyesClosedRef.current) {
        blinkTimestampsRef.current.push(timestamp);
      }
      eyesClosedRef.current = eyesClosed;
      blinkTimestampsRef.current = blinkTimestampsRef.current.filter(
        (blinkAt) => timestamp - blinkAt <= 60_000,
      );

      const elapsed = timestamp - startedAtRef.current;
      if (elapsed < BLINK_RATE_WARMUP_MS) {
        return blinkAmount > 0.85 ? 30 : 80;
      }

      const observedWindowMs = Math.min(elapsed, 60_000);
      const blinksPerMinute = blinkTimestampsRef.current.length / (observedWindowMs / 60_000);
      return clamp(100 - ((Math.abs(blinksPerMinute - IDEAL_BLINKS_PER_MINUTE) / IDEAL_BLINKS_PER_MINUTE) * 100));
    }

    function scoreFrame(result, timestamp) {
      const categories = result.faceBlendshapes?.[0]?.categories;
      if (!categories) {
        setLiveConfidence(null);
        return;
      }

      const pose = headPoseScore(result.facialTransformationMatrixes?.[0]);
      const blink = blinkScore(categories, timestamp);
      const expression = expressionScore(categories);
      const confidence = Math.round(
        (pose * HEAD_POSE_WEIGHT)
        + (blink * BLINK_WEIGHT)
        + (expression * EXPRESSION_WEIGHT),
      );

      scoreTotalRef.current += confidence;
      scoreCountRef.current += 1;
      setLiveConfidence(confidence);
      setAverageConfidence(Math.round(scoreTotalRef.current / scoreCountRef.current));
    }

    async function startTracking() {
      if (!isActive || !videoRef?.current) return;

      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
        landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_ASSET_URL },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
        });

        if (cancelled) {
          landmarker.close();
          return;
        }

        detectorRef.current = landmarker;
        startedAtRef.current = performance.now();
        setIsTracking(true);

        const sample = (timestamp) => {
          if (cancelled) return;

          if (timestamp - lastSampleAtRef.current >= SAMPLE_INTERVAL_MS) {
            lastSampleAtRef.current = timestamp;
            const video = videoRef.current;

            if (video?.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
              try {
                scoreFrame(landmarker.detectForVideo(video, timestamp), timestamp);
              } catch (error) {
                // A video frame can change while MediaPipe is reading it; skip
                // that frame and continue sampling instead of breaking the interview.
                console.debug('Confidence detector skipped a frame:', error);
              }
            }
          }

          animationFrameRef.current = window.requestAnimationFrame(sample);
        };

        animationFrameRef.current = window.requestAnimationFrame(sample);
      } catch (error) {
        console.warn('Facial confidence detector could not start:', error);
        resetTracking();
      }
    }

    if (isActive) {
      resetTracking();
      startTracking();
    } else {
      resetTracking();
    }

    return () => {
      cancelled = true;
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (detectorRef.current === landmarker) {
        detectorRef.current = null;
      }
      landmarker?.close();
      resetTracking();
    };
  }, [isActive, videoRef]);

  return { liveConfidence, averageConfidence, isTracking };
}
