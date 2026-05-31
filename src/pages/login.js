import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './_app';
import { Button, Input, Spinner, ToastContainer, ThemeToggle } from '../components/ui';
import Head from 'next/head';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUser } = useAuth();
  const router = useRouter();

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    if (!username || !password) return setError('Enter your username and password');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Login failed');
      setUser(data.user);
      router.push('/');
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head><title>PropSync — Login</title></Head>
      <div className="min-h-screen surface-page flex items-center justify-center p-edge relative overflow-hidden">
        <div className="absolute top-5 right-5 z-20">
          <ThemeToggle />
        </div>

        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 right-0 w-[560px] h-[380px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(ellipse, var(--accent), transparent 70%)' }}
          />
        </div>

        <div className="w-full max-w-md relative z-10 animate-up">
          <div className="text-center mb-8">
            <div className="font-display text-display-hero mb-2">
              <span className="text-text-1">Prop</span>
              <span className="text-accent">Sync</span>
            </div>
            <p className="label-ui">Mogadishu Property Management</p>
          </div>

          <form onSubmit={handleLogin} className="surface-card rounded-xl shadow-2xl">
            <Input
              label="Username"
              id="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="your username"
              autoComplete="username"
              autoCapitalize="none"
            />
            <Input
              label="Password"
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />

            {error && (
              <div className="mb-4 px-4 py-3 bg-status-red-dim border-[0.5px] border-status-red/25 rounded-sm text-status-red text-[13px]">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full justify-center !py-3">
              {loading ? <><Spinner size="sm" /> Signing in...</> : 'Sign In'}
            </Button>
          </form>
        </div>
      </div>
      <ToastContainer />
    </>
  );
}
