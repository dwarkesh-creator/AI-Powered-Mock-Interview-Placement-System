import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Loader2, UserRound } from 'lucide-react';
import { useAuth } from '../Context/AuthContext.jsx';
import BuiltBy from '../Component/BuiltBy.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { login, signup, loginAsGuest } = useAuth();

  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignup) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-950 px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.05),_transparent_60%)]" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-white">
            <Sparkles className="h-5 w-5 text-black" strokeWidth={2} />
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-50">
            {isSignup ? 'Create your account' : 'Sign in to NilGen'}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Mock interviews &amp; placement prediction</p>
        </div>

        {/* Tab toggle */}
        <div className="mb-5 flex rounded-xl border border-white/10 bg-white/[0.02] p-1">
          <button
            type="button"
            onClick={() => { setIsSignup(false); setError(''); }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              !isSignup ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-200'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => { setIsSignup(true); setError(''); }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              isSignup ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-200'
            }`}
          >
            Sign up
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-zinc-400">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-zinc-400">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600"
              />
            </div>
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {isSignup ? 'Create account' : 'Sign in'}
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
              </>
            )}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-zinc-950 px-3 text-zinc-500">or</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            loginAsGuest();
            navigate('/dashboard');
          }}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
        >
          <UserRound className="h-4 w-4" strokeWidth={1.75} />
          Continue as Guest
        </button>
        <p className="mt-2 text-center text-xs text-zinc-600">
          Try the mock interview without creating an account
        </p>

        <div className="mt-8 text-center">
          <BuiltBy variant="footer" />
        </div>
      </div>
    </div>
  );
}
