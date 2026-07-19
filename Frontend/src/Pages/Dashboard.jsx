import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, MessageSquareText, Award, TrendingUp, ListChecks, ArrowRight, Loader2 } from 'lucide-react';
import StatCard from '../Component/StatCard.jsx';
import { useAuth } from '../Context/AuthContext.jsx';
import { fetchSessions } from '../Hooks/apiClient.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const isGuest = auth?.isGuest;
  const firstName = isGuest ? 'Guest' : auth?.email?.split('@')[0] || 'Student';

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth?.userId || isGuest) { setLoading(false); return; }

    fetchSessions(auth.userId)
      .then((data) => setSessions(data))
      .catch(() => setSessions([]))   // no sessions yet — that's fine
      .finally(() => setLoading(false));
  }, [auth?.userId]);

  // Compute stats from real sessions
  const interviewsCompleted = sessions.length;
  const latestScore = sessions.length > 0 ? sessions[0].final_score ?? 0 : 0;
  const prevScore = sessions.length > 1 ? sessions[1].final_score ?? 0 : 0;
  const scoreTrend = sessions.length > 1 ? latestScore - prevScore : 0;

  // Simple placement probability estimate based on average score
  const avgScore = sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => sum + (s.final_score ?? 0), 0) / sessions.length)
    : 0;
  const placementProb = sessions.length > 0 ? Math.min(100, Math.round(avgScore * 1.1)) : 0;
  const placementLabel = placementProb >= 75 ? 'High' : placementProb >= 50 ? 'Medium' : 'Building';

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 lg:px-12 lg:py-14">
      <header className="mb-10">
        <p className="text-sm text-zinc-500">{isGuest ? 'Welcome' : 'Welcome back'}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50">
          {isGuest
            ? 'Try a mock interview — no account needed.'
            : `${firstName} — here's where prep stands.`}
        </h1>
        {isGuest && (
          <p className="mt-2 text-sm text-zinc-500">
            You're browsing as a guest. Sign up to save your scores and track progress.
          </p>
        )}
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={Award}
          label="Latest score"
          value={latestScore}
          suffix="/100"
          trend={scoreTrend}
          hint="vs last attempt"
        />
        <StatCard
          icon={TrendingUp}
          label="Placement probability"
          value={placementProb}
          suffix="%"
          trend={null}
          hint={placementLabel}
        />
        <StatCard
          icon={ListChecks}
          label="Interviews completed"
          value={interviewsCompleted}
          hint="total sessions"
        />
      </div>

      {/* Quick actions */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <button
          onClick={() => navigate('/interview-setup')}
          className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white p-6 text-left text-black transition-colors hover:bg-zinc-200"
        >
          <div>
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4" strokeWidth={1.75} />
              <span className="text-sm font-medium">Start a mock interview</span>
            </div>
            <p className="mt-1 text-xs text-zinc-700">5 questions · camera &amp; mic required</p>
          </div>
          <ArrowRight
            className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
            strokeWidth={1.75}
          />
        </button>

        <button
          onClick={() => navigate('/placement')}
          className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-left transition-colors hover:border-white/20"
        >
          <div>
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-zinc-300" strokeWidth={1.75} />
              <span className="text-sm font-medium text-zinc-100">Talk to the career bot</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">Placement odds &amp; prep guidance</p>
          </div>
          <ArrowRight
            className="h-4 w-4 shrink-0 text-zinc-500 transition-transform group-hover:translate-x-0.5"
            strokeWidth={1.75}
          />
        </button>
      </div>

      {/* Recent activity */}
      <section className="mt-10">
        <h2 className="mb-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Recent interviews
        </h2>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          {sessions.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-zinc-500">
              {isGuest
                ? 'Guest sessions are not saved. Start a mock interview above to try it out!'
                : 'No interviews yet. Start your first mock interview above!'}
            </div>
          ) : (
            sessions.slice(0, 6).map((session, i) => (
              <div
                key={session.session_id}
                className={`flex items-center justify-between px-5 py-3.5 ${
                  i !== Math.min(sessions.length, 6) - 1 ? 'border-b border-white/10' : ''
                }`}
              >
                <div>
                  <p className="text-sm text-zinc-200">{session.role || 'Mock Interview'}</p>
                  <p className="text-xs text-zinc-500">
                    {new Date(session.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </p>
                </div>
                <span className="font-data text-sm text-zinc-400">
                  {session.final_score ?? '—'}/100
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
