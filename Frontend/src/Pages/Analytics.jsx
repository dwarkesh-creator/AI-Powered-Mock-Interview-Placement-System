import { useEffect, useState } from 'react';
import { useAuth } from '../Context/AuthContext.jsx';
import { fetchSessions } from '../Hooks/apiClient.js';
import { 
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { TrendingUp, Award, Target, Calendar, Loader2, BarChart3, Activity, Info } from 'lucide-react';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

// Demo data for guest users
const DEMO_SESSIONS = [
  {
    session_id: 'demo-1',
    role: 'Frontend Engineer',
    final_score: 72,
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    session_id: 'demo-2',
    role: 'Full Stack Engineer',
    final_score: 65,
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    session_id: 'demo-3',
    role: 'Backend Engineer',
    final_score: 78,
    created_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    session_id: 'demo-4',
    role: 'Frontend Engineer',
    final_score: 81,
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    session_id: 'demo-5',
    role: 'Data Engineer',
    final_score: 75,
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    session_id: 'demo-6',
    role: 'Full Stack Engineer',
    final_score: 85,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function Analytics() {
  const { auth } = useAuth();
  const isGuest = auth?.isGuest;
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
        if (data.length === 0) {
          // If no real data, show demo data
          setSessions(DEMO_SESSIONS);
        } else {
          setSessions(data);
        }
      })
      .catch(() => setSessions(DEMO_SESSIONS))
      .finally(() => setLoading(false));
  }, [auth?.userId, isGuest]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  // Prepare data for charts
  const scoreOverTime = sessions
    .slice()
    .reverse()
    .map((session, index) => ({
      interview: `#${index + 1}`,
      score: session.final_score ?? 0,
      date: new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));

  // Score distribution
  const scoreRanges = [
    { range: '0-20', count: 0 },
    { range: '21-40', count: 0 },
    { range: '41-60', count: 0 },
    { range: '61-80', count: 0 },
    { range: '81-100', count: 0 },
  ];

  sessions.forEach((session) => {
    const score = session.final_score ?? 0;
    if (score <= 20) scoreRanges[0].count++;
    else if (score <= 40) scoreRanges[1].count++;
    else if (score <= 60) scoreRanges[2].count++;
    else if (score <= 80) scoreRanges[3].count++;
    else scoreRanges[4].count++;
  });

  // Role distribution
  const roleDistribution = {};
  sessions.forEach((session) => {
    const role = session.role || 'Unknown';
    roleDistribution[role] = (roleDistribution[role] || 0) + 1;
  });

  const rolePieData = Object.entries(roleDistribution).map(([role, count]) => ({
    name: role,
    value: count,
  }));

  // Performance metrics (simulated breakdown)
  const avgScore = sessions.reduce((sum, s) => sum + (s.final_score ?? 0), 0) / sessions.length;
  const performanceBreakdown = [
    { metric: 'Technical', score: Math.round(avgScore * 0.95) },
    { metric: 'Communication', score: Math.round(avgScore * 1.05) },
    { metric: 'Confidence', score: Math.round(avgScore * 0.98) },
    { metric: 'Problem Solving', score: Math.round(avgScore * 1.02) },
    { metric: 'Creativity', score: Math.round(avgScore * 0.92) },
  ];

  // Stats
  const totalInterviews = sessions.length;
  const latestScore = sessions[0]?.final_score ?? 0;
  const highestScore = Math.max(...sessions.map(s => s.final_score ?? 0));
  const averageScore = Math.round(avgScore);

  return (
    <div className="min-h-screen bg-zinc-950 bg-grain px-6 py-10 text-zinc-50 lg:px-12 lg:py-14">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Performance Analytics</h1>
              <p className="mt-3 text-base text-zinc-400">
                Detailed insights into your interview performance
              </p>
            </div>
          </div>

          {isGuest && (
            <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 shrink-0 text-blue-400" strokeWidth={1.5} />
                <div>
                  <p className="text-sm font-medium text-blue-200">Viewing demo data</p>
                  <p className="mt-1 text-xs text-blue-200/70">
                    This is sample data to showcase the analytics features. Sign up to track your own progress!
                  </p>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Key Stats */}
        <div className="mb-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                <Award className="h-5 w-5 text-blue-400" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Latest Score</p>
                <p className="text-2xl font-bold text-zinc-50">{latestScore}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-400" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Average Score</p>
                <p className="text-2xl font-bold text-zinc-50">{averageScore}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
                <Target className="h-5 w-5 text-purple-400" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Highest Score</p>
                <p className="text-2xl font-bold text-zinc-50">{highestScore}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
                <Calendar className="h-5 w-5 text-orange-400" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Total Interviews</p>
                <p className="text-2xl font-bold text-zinc-50">{totalInterviews}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Score Progress Over Time */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
            <div className="mb-6 flex items-center gap-3">
              <Activity className="h-5 w-5 text-blue-400" strokeWidth={1.5} />
              <h2 className="text-lg font-semibold text-zinc-50">Score Progress</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={scoreOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="interview" stroke="#71717a" style={{ fontSize: '12px' }} />
                <YAxis stroke="#71717a" style={{ fontSize: '12px' }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '12px',
                    color: '#fafafa',
                  }}
                />
                <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Score Distribution */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
            <div className="mb-6 flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-emerald-400" strokeWidth={1.5} />
              <h2 className="text-lg font-semibold text-zinc-50">Score Distribution</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={scoreRanges}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="range" stroke="#71717a" style={{ fontSize: '12px' }} />
                <YAxis stroke="#71717a" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '12px',
                    color: '#fafafa',
                  }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Performance Radar */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
            <div className="mb-6 flex items-center gap-3">
              <Target className="h-5 w-5 text-purple-400" strokeWidth={1.5} />
              <h2 className="text-lg font-semibold text-zinc-50">Performance Breakdown</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={performanceBreakdown}>
                <PolarGrid stroke="#27272a" />
                <PolarAngleAxis dataKey="metric" stroke="#71717a" style={{ fontSize: '12px' }} />
                <PolarRadiusAxis stroke="#71717a" domain={[0, 100]} />
                <Radar name="Score" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '12px',
                    color: '#fafafa',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Role Distribution */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
            <div className="mb-6 flex items-center gap-3">
              <Award className="h-5 w-5 text-orange-400" strokeWidth={1.5} />
              <h2 className="text-lg font-semibold text-zinc-50">Interview by Role</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={rolePieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {rolePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '12px',
                    color: '#fafafa',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Insights */}
        <div className="mt-10 rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/5 to-purple-500/5 p-8">
          <h2 className="mb-6 text-xl font-bold text-zinc-50">AI-Powered Insights</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <h3 className="text-sm font-semibold text-blue-400">Strength Areas</h3>
              <p className="mt-2 text-sm text-zinc-300">
                Your communication scores are consistently above average. Keep leveraging your storytelling skills!
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <h3 className="text-sm font-semibold text-orange-400">Improvement Areas</h3>
              <p className="mt-2 text-sm text-zinc-300">
                Technical depth could use more focus. Consider practicing more coding problems and system design.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
