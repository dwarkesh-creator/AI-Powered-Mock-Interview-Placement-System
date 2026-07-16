import { useNavigate } from 'react-router-dom';
import { Video, MessageSquareText, Award, TrendingUp, ListChecks, ArrowRight } from 'lucide-react';
import StatCard from '../Component/StatCard.jsx';
import { currentUser, dashboardStats, recentInterviews } from '../Mockdata/Mockdata.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const firstName = currentUser.name.split(' ')[0];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 lg:px-12 lg:py-14">
      <header className="mb-10">
        <p className="text-sm text-zinc-500">Welcome back</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50">
          {firstName} — here's where prep stands.
        </h1>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={Award}
          label="Latest score"
          value={dashboardStats.latestScore.value}
          suffix={`/${dashboardStats.latestScore.outOf}`}
          trend={dashboardStats.latestScore.trend}
          hint="vs last attempt"
        />
        <StatCard
          icon={TrendingUp}
          label="Placement probability"
          value={dashboardStats.placementProbability.value}
          suffix="%"
          trend={dashboardStats.placementProbability.trend}
          hint={dashboardStats.placementProbability.label}
        />
        <StatCard
          icon={ListChecks}
          label="Interviews completed"
          value={dashboardStats.interviewsCompleted.value}
          hint="this semester"
        />
      </div>

      {/* Quick actions */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <button
          onClick={() => navigate('/interview')}
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
          {recentInterviews.map((interview, i) => (
            <div
              key={interview.id}
              className={`flex items-center justify-between px-5 py-3.5 ${
                i !== recentInterviews.length - 1 ? 'border-b border-white/10' : ''
              }`}
            >
              <div>
                <p className="text-sm text-zinc-200">{interview.role}</p>
                <p className="text-xs text-zinc-500">{interview.date}</p>
              </div>
              <span className="font-data text-sm text-zinc-400">{interview.score}/100</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
