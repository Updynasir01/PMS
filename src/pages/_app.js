import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter } from 'next/router';
import { ThemeProvider } from '../context/ThemeContext';
import { LanguageProvider } from '../context/LanguageContext';
import { Spinner } from '../components/ui';
import BrandLogo from '../components/BrandLogo';
import '../styles/globals.css';
import '../styles/marketing.css';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const PUBLIC_PATHS = ['/', '/login'];

function isPublicPath(pathname) {
  if (!pathname) return false;
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith('/tenant-portal')) return true;
  return false;
}

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
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          if (router.pathname === '/login' || router.pathname === '/') {
            router.replace('/app');
          }
        } else if (!isPublicPath(router.pathname)) {
          router.replace('/login');
        }
      })
      .catch(() => {
        if (!isPublicPath(router.pathname)) router.replace('/login');
      })
      .finally(() => setLoading(false));
  }, [router.isReady, router.pathname]);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // still clear local session
    }
    setUser(null);
    router.push('/login');
  };

  // Landing page: no branded spinner overlay for guests
  const isLanding = router.pathname === '/';
  if (loading && !isLanding) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center surface-page">
          <div className="text-center animate-fade">
            <BrandLogo height={64} className="mx-auto mb-6" priority />
            <Spinner size="lg" />
            <p className="label-ui mt-4 normal-case">Loading</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthContext.Provider value={{ user, setUser, logout }}>
          <Component {...pageProps} />
        </AuthContext.Provider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
