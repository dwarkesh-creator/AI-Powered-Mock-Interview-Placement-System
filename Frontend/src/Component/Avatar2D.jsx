import { useEffect, useRef } from 'react';

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function readAmplitude(analyserNode, samples) {
  analyserNode.getByteTimeDomainData(samples);

  let sumOfSquares = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const normalized = (samples[index] - 128) / 128;
    sumOfSquares += normalized * normalized;
  }

  const rms = Math.sqrt(sumOfSquares / samples.length);
  return clamp((rms - 0.012) / 0.16, 0, 1);
}

function updateMouth(mouth, pulse, amplitude) {
  if (!mouth || !pulse) return;

  const openness = clamp(amplitude, 0, 1);
  mouth.style.width = `${17 + (openness * 8)}px`;
  mouth.style.height = `${3 + (openness * 12)}px`;
  mouth.style.transform = `translateX(-50%) scale(${1 + (openness * 0.08)})`;
  pulse.style.transform = `scale(${1 + (openness * 0.14)})`;
  pulse.style.opacity = String(0.25 + (openness * 0.5));
}

/** Compact emoji interviewer with a mouth driven from the active audio analyser. */
export default function Avatar2D({ analyserNode, isSpeaking = false, isListening = false }) {
  const mouthRef = useRef(null);
  const pulseRef = useRef(null);
  const smoothedAmplitudeRef = useRef(0);

  useEffect(() => {
    const samples = analyserNode ? new Uint8Array(analyserNode.fftSize) : null;
    let frameId = null;

    const animate = (timestamp) => {
      let targetAmplitude = 0;
      if (isSpeaking && analyserNode && samples) {
        targetAmplitude = readAmplitude(analyserNode, samples);
      } else if (isSpeaking) {
        // Browser speech-synthesis fallback has no readable audio node. Keep a
        // subtle talking motion rather than leaving the interviewer frozen.
        targetAmplitude = 0.22 + (Math.sin(timestamp / 95) * 0.12);
      }

      const smoothing = isSpeaking ? 0.4 : 1;
      smoothedAmplitudeRef.current += (targetAmplitude - smoothedAmplitudeRef.current) * smoothing;
      updateMouth(mouthRef.current, pulseRef.current, smoothedAmplitudeRef.current);
      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);
    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      smoothedAmplitudeRef.current = 0;
      updateMouth(mouthRef.current, pulseRef.current, 0);
    };
  }, [analyserNode, isSpeaking]);

  const status = isSpeaking ? 'Speaking' : (isListening ? 'Listening' : 'AI');

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 flex flex-col items-center gap-1" aria-label={`AI interviewer: ${status}`}>
      <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-violet-300/25 bg-violet-400/10 shadow-lg shadow-black/30 backdrop-blur-sm">
        <span
          ref={pulseRef}
          className="absolute inset-1 rounded-full bg-violet-400/30 transition-transform duration-75"
        />
        <span className="relative select-none text-5xl leading-none" aria-hidden="true">🤖</span>
        <span
          ref={mouthRef}
          className="absolute bottom-[15px] left-1/2 rounded-full bg-zinc-950 shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
        />
        <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border border-zinc-950 bg-emerald-400" />
      </div>
      <span className="rounded-full bg-zinc-950/80 px-2 py-0.5 text-[10px] font-medium text-zinc-300 backdrop-blur-sm">{status}</span>
    </div>
  );
}
