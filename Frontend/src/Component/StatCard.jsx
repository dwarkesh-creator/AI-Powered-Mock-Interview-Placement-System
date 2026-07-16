import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * Compact metric card for the dashboard. Numeric values use `font-data`
 * (tabular nums) — the app's one consistent typographic signature for
 * anything measured: scores, probabilities, counts, timers.
 */
export default function StatCard({ icon: Icon, label, value, suffix, hint, trend }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-zinc-600" strokeWidth={1.75} />}
      </div>

      <div className="mt-3 flex items-baseline gap-1">
        <span className="font-data text-3xl font-semibold text-zinc-50">{value}</span>
        {suffix && <span className="font-data text-lg text-zinc-500">{suffix}</span>}
      </div>

      {(hint || trend != null) && (
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          {trend != null && (
            <span
              className={`inline-flex items-center gap-0.5 ${
                trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-zinc-500'
              }`}
            >
              {trend > 0 && <TrendingUp className="h-3 w-3" strokeWidth={2} />}
              {trend < 0 && <TrendingDown className="h-3 w-3" strokeWidth={2} />}
              {Math.abs(trend)}
            </span>
          )}
          {hint && <span className="text-zinc-500">{hint}</span>}
        </div>
      )}
    </div>
  );
}
