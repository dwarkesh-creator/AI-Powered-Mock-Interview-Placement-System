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

function updateMouth(mouth, glow, amplitude) {
  if (!mouth || !glow) return;

  const openness = clamp(amplitude, 0, 1);
  mouth.style.height = `${3 + (openness * 10)}px`;
  mouth.style.borderRadius = openness > 0.3 ? '50%' : '2px';
  glow.style.opacity = String(0.4 + (openness * 0.6));
  glow.style.transform = `scale(${1 + (openness * 0.2)})`;
}

/** Star-shaped 2D avatar with 3D lighting effects and animated mouth. */
export default function Avatar2D({ analyserNode, isSpeaking = false, isListening = false }) {
  const mouthRef = useRef(null);
  const glowRef = useRef(null);
  const smoothedAmplitudeRef = useRef(0);

  useEffect(() => {
    const samples = analyserNode ? new Uint8Array(analyserNode.fftSize) : null;
    let frameId = null;

    const animate = (timestamp) => {
      let targetAmplitude = 0;
      if (isSpeaking && analyserNode && samples) {
        targetAmplitude = readAmplitude(analyserNode, samples);
      } else if (isSpeaking) {
        targetAmplitude = 0.25 + (Math.sin(timestamp / 90) * 0.15);
      }

      const smoothing = isSpeaking ? 0.35 : 1;
      smoothedAmplitudeRef.current += (targetAmplitude - smoothedAmplitudeRef.current) * smoothing;
      updateMouth(mouthRef.current, glowRef.current, smoothedAmplitudeRef.current);
      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);
    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      smoothedAmplitudeRef.current = 0;
      updateMouth(mouthRef.current, glowRef.current, 0);
    };
  }, [analyserNode, isSpeaking]);

  const status = isSpeaking ? 'Speaking' : (isListening ? 'Listening' : 'PrepBuddy');

  return (
    <div className="inline-flex flex-col items-center gap-1.5" aria-label={`PrepBuddy interviewer: ${status}`}>
      {/* Star container with 3D lighting */}
      <div className="relative flex h-16 w-16 items-center justify-center">
        {/* Outer glow (animated when speaking) */}
        <div
          ref={glowRef}
          className="absolute inset-0 rounded-full bg-gradient-to-br from-white/50 via-zinc-100/40 to-zinc-200/30 blur-lg transition-all duration-150"
        />
        
        {/* Star shape with gradient lighting */}
        <div className="relative flex h-14 w-14 items-center justify-center">
          {/* 3D shadow layers */}
          <div className="absolute inset-0 scale-95 opacity-60">
            <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-lg">
              <defs>
                <linearGradient id="starGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                  <stop offset="50%" stopColor="#f4f4f5" stopOpacity="1" />
                  <stop offset="100%" stopColor="#e4e4e7" stopOpacity="1" />
                </linearGradient>
                <filter id="innerShadow">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                  <feOffset dx="0" dy="1" result="offsetblur"/>
                  <feComponentTransfer>
                    <feFuncA type="linear" slope="0.5"/>
                  </feComponentTransfer>
                  <feMerge>
                    <feMergeNode/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <path
                d="M50 10 L61 40 L92 40 L67 59 L77 90 L50 70 L23 90 L33 59 L8 40 L39 40 Z"
                fill="url(#starGradient)"
                filter="url(#innerShadow)"
                className="drop-shadow-[0_2px_8px_rgba(255,255,255,0.6)]"
              />
            </svg>
          </div>

          {/* Main star with top lighting highlight */}
          <svg viewBox="0 0 100 100" className="absolute h-full w-full">
            <defs>
              <radialGradient id="topLight" cx="50%" cy="20%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="50%" stopColor="#fafafa" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#f5f5f5" stopOpacity="0" />
              </radialGradient>
            </defs>
            <path
              d="M50 10 L61 40 L92 40 L67 59 L77 90 L50 70 L23 90 L33 59 L8 40 L39 40 Z"
              fill="url(#topLight)"
              className="mix-blend-overlay"
            />
          </svg>

          {/* Eyes (two small circles) */}
          <div className="absolute top-[32%] flex w-[50%] justify-between px-1">
            <div className="h-1 w-1 rounded-full bg-zinc-900 shadow-sm" />
            <div className="h-1 w-1 rounded-full bg-zinc-900 shadow-sm" />
          </div>

          {/* Animated mouth */}
          <div
            ref={mouthRef}
            className="absolute bottom-[30%] w-4 bg-zinc-900 shadow-md transition-all duration-100"
            style={{ height: '3px', borderRadius: '2px' }}
          />
        </div>

        {/* Status indicator dot */}
        <div className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-zinc-950 bg-emerald-400 shadow-lg shadow-emerald-400/50" />
      </div>

      {/* Status label */}
      <div className="rounded-full bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 px-2.5 py-0.5 shadow-lg backdrop-blur-sm">
        <span className="text-[10px] font-medium text-zinc-100">{status}</span>
      </div>
    </div>
  );
}
