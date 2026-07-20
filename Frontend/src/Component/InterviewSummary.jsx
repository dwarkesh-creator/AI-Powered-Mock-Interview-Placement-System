import { CheckCircle2 } from 'lucide-react';

function dedupeFeedback(points) {
  const seen = new Set();

  return points.filter((item) => {
    const key = String(item).trim().replace(/\s+/g, ' ').toLocaleLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildVisualConfidenceFeedback(turns) {
  const visualScores = turns
    .filter((turn) => !turn.degraded && !turn.pendingReEvaluation)
    .map((turn) => Number(turn.visualConfidence))
    .filter(Number.isFinite);

  if (!visualScores.length) {
    return { averageVisualConfidence: null, feedback: [] };
  }

  const averageVisualConfidence = Number((
    visualScores.reduce((total, score) => total + score, 0) / visualScores.length
  ).toFixed(1));

  let deliveryFeedback;
  if (averageVisualConfidence < 45) {
    deliveryFeedback = 'For stronger on-camera delivery, practise facing the camera, keeping a relaxed expression, and taking measured pauses.';
  } else if (averageVisualConfidence < 70) {
    deliveryFeedback = 'Your on-camera delivery was generally steady. Keep looking toward the camera and use deliberate pauses for key points.';
  } else {
    deliveryFeedback = 'Your visual delivery was steady and camera-facing. Maintain the same composed pace while answering.';
  }

  return {
    averageVisualConfidence,
    feedback: [deliveryFeedback],
  };
}

export function buildInterviewSummary(turns) {
  const scoredTurns = turns.filter((turn) => (
    !turn.degraded
    && !turn.pendingReEvaluation
    && Number.isFinite(Number(turn.score))
  ));
  const pendingCount = turns.filter((turn) => turn.degraded || turn.pendingReEvaluation).length;
  const overallScore = scoredTurns.length
    ? Number((scoredTurns.reduce((total, turn) => total + Number(turn.score), 0) / scoredTurns.length).toFixed(1))
    : 0;

  const visualConfidence = buildVisualConfidenceFeedback(scoredTurns);
  const improvements = dedupeFeedback([
    ...turns.flatMap((turn) => turn.improvements || []),
    ...visualConfidence.feedback,
  ]);

  return {
    overallScore,
    improvements,
    scoredTurnCount: scoredTurns.length,
    pendingCount,
    averageVisualConfidence: visualConfidence.averageVisualConfidence,
  };
}

export default function InterviewSummary({ summary, onDone }) {
  const hasScore = summary.scoredTurnCount > 0;

  return (
    <div className="motion-safe:animate-fade-in">
      <CheckCircle2 className="h-8 w-8 text-zinc-300" strokeWidth={1.5} />
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">That&apos;s a wrap.</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-500">
        {hasScore
          ? 'Your final score is a comprehensive evaluation of your responses and delivery.'
          : 'Some answers are still being evaluated. Your score will update if feedback arrives shortly.'}
      </p>
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Overall score</p>
        <p className="mt-2 text-4xl font-semibold text-zinc-50">
          {hasScore ? `${summary.overallScore}/10` : 'Pending'}
        </p>
        {summary.pendingCount > 0 && (
          <p className="mt-2 text-xs text-zinc-500">
            {summary.pendingCount} answer{summary.pendingCount === 1 ? '' : 's'} still being re-evaluated in the background.
          </p>
        )}
      </div>

      {summary.averageVisualConfidence !== null && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Visual delivery</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-50">
            {summary.averageVisualConfidence}/100
          </p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            Camera-confidence estimate.
          </p>
        </div>
      )}

      <div className="mt-6">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Combined feedback</p>
        {summary.improvements.length ? (
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-300">
            {summary.improvements.map((improvement) => (
              <li key={improvement} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                {improvement}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">Keep practising to build more detailed feedback.</p>
        )}
      </div>

      <button
        onClick={onDone}
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
      >
        Back to dashboard
      </button>
    </div>
  );
}
