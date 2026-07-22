import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, MessageSquareText, Award, TrendingUp, ListChecks, ArrowRight, Loader2, Sparkles, Target, Calendar } from 'lucide-react';
import StatCard from '../Component/StatCard.jsx';
import { useAuth } from '../Context/AuthContext.jsx';
import { fetchSessions } from '../Hooks/apiClient.js';

// Demo sessions for guest users
const DEMO_SESSIONS = [
  {
    session_id: 'demo-1',
    role: 'Frontend Engineer',
    final_score: 85,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    session_id: 'demo-2',
    role: 'Full Stack Engineer',
    final_score: 78,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    session_id: 'demo-3',
    role: 'Backend Engineer',
    final_score: 72,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const isGuest = auth?.isGuest;
  const firstName = isGuest ? 'Guest' : auth?.email?.split('@')[0] || 'Student';

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isGuest) {
      // Use demo data for guests
      setSessions(DEMO_SESSIONS);
      setLoading(false);
      return;
    }

    if (!auth?.userId) { 
      setLoading(false); 
      return; 
    }

    fetchSessions(auth.userId)
      .then((data) => {
        // Always show real data for logged-in users, even if empty
        setSessions(data);
      })
      .catch(() => {
        // On error, show empty array instead of demo data
        setSessions([]);
      })
      .finally(() => setLoading(false));
  }, [auth?.userId, isGuest]);

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
    <div className="min-h-screen bg-zinc-950 bg-grain px-6 py-10 text-zinc-50 lg:px-12 lg:py-14">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="mb-12">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-bold tracking-tight">
                  {isGuest ? 'Welcome to PrepBuddy' : `Welcome back, ${firstName}`}
                </h1>
                {!isGuest && <Sparkles className="h-6 w-6 text-yellow-400" strokeWidth={1.5} />}
              </div>
              <p className="mt-3 text-base text-zinc-400">
                {isGuest
                  ? 'Start your interview prep journey — no account needed'
                  : 'Your personalized interview prep dashboard'}
              </p>
            </div>
          </div>

          {isGuest && (
            <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4">
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 shrink-0 text-yellow-400" strokeWidth={1.5} />
                <div>
                  <p className="text-sm font-medium text-yellow-200">You're browsing as a guest with demo data</p>
                  <p className="mt-1 text-xs text-yellow-200/70">
                    Sign up to save your actual progress, track real scores, and unlock advanced features
                  </p>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Stats Grid */}
        <div className="mb-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
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
            hint={isGuest ? 'demo sessions' : 'total sessions'}
          />
        </div>

        {/* Quick Actions - Highlighted Cards */}
        <section className="mb-12">
          <h2 className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
            Quick actions
          </h2>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Start Interview - Primary CTA */}
            <button
              onClick={() => navigate('/interview-setup')}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white to-zinc-100 p-8 text-left shadow-2xl transition-all hover:scale-[1.02] hover:shadow-3xl"
            >
              <div className="relative z-10">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black">
                    <Video className="h-6 w-6 text-white" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-black">Start mock interview</h3>
                    <p className="text-sm text-zinc-700">AI-powered practice session</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-zinc-600">
                  5 tailored questions • Real-time feedback • Company-specific prep
                </p>
                <div className="mt-6 flex items-center gap-2 text-sm font-medium text-black">
                  Begin now
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    strokeWidth={2}
                  />
                </div>
              </div>
              {/* Decorative gradient */}
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-2xl" />
            </button>

            {/* Career Bot */}
            <button
              onClick={() => navigate('/placement')}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-800 p-8 text-left shadow-xl transition-all hover:scale-[1.02] hover:border-white/20"
            >
              <div className="relative z-10">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                    <MessageSquareText className="h-6 w-6 text-zinc-100" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-zinc-50">Career guidance bot</h3>
                    <p className="text-sm text-zinc-400">AI mentor for placement prep</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-zinc-400">
                  Get personalized advice • Placement strategies • Resume tips
                </p>
                <div className="mt-6 flex items-center gap-2 text-sm font-medium text-zinc-100">
                  Chat now
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    strokeWidth={2}
                  />
                </div>
              </div>
              {/* Decorative gradient */}
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-emerald-400/10 to-cyan-400/10 blur-2xl" />
            </button>
          </div>
        </section>

        {/* Recent Activity */}
        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
              Recent interviews
            </h2>
            {sessions.length > 0 && (
              <button 
                onClick={() => navigate('/analytics')}
                className="text-xs text-zinc-400 transition-colors hover:text-zinc-200"
              >
                View analytics
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
            {sessions.length === 0 ? (
              <div className="px-8 py-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
                  <Calendar className="h-8 w-8 text-zinc-500" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-medium text-zinc-300">No interview data yet</p>
                <p className="mt-2 text-xs text-zinc-500">
                  Start your first mock interview to begin tracking your progress
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {sessions.slice(0, 6).map((session) => (
                  <div
                    key={session.session_id}
                    className="group flex items-center justify-between px-6 py-4 transition-colors hover:bg-white/[0.02]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
                        <Video className="h-5 w-5 text-zinc-400" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-200">
                          {session.role || 'Mock Interview'}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {new Date(session.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-base font-semibold text-zinc-100">
                        {session.final_score ?? '—'}/100
                      </span>
                      <ArrowRight
                        className="h-4 w-4 text-zinc-600 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100"
                        strokeWidth={1.75}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
