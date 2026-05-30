import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter } from 'next/router';
import { ThemeProvider } from '../context/ThemeContext';
import { Spinner } from '../components/ui';
import '../styles/globals.css';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export default function App({ Component, pageProps }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;
    if (router.pathname.startsWith('/tenant-portal')) {
      setLoading(false);
      return;
    }
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user) {
          setUser(data.user);
          if (router.pathname === '/login') router.push('/');
        } else {
          if (router.pathname !== '/login') router.push('/login');
        }
      })
      .catch(() => {
        if (router.pathname !== '/login') router.push('/login');
      })
      .finally(() => setLoading(false));
  }, [router.isReady, router.pathname]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    router.push('/login');
  };

  if (loading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center surface-page">
          <div className="text-center animate-fade">
            <Spinner size="lg" />
            <div className="font-display text-[32px] text-text-1 mt-6">
              Prop<span className="text-accent">Sync</span>
            </div>
            <p className="label-ui mt-2 normal-case">Loading</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <AuthContext.Provider value={{ user, setUser, logout }}>
        <Component {...pageProps} />
      </AuthContext.Provider>
    </ThemeProvider>
  );
}
