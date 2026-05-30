import { useRouter } from 'next/router';
import Head from 'next/head';
import { ThemeProvider } from '../../context/ThemeContext';
import PortalApp from '../../components/tenant-portal/PortalApp';

export default function TenantPortalPage() {
  const router = useRouter();
  const token = typeof router.query.token === 'string' ? router.query.token : '';

  return (
    <ThemeProvider>
      <Head>
        <title>PropSync — My Unit</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="robots" content="noindex" />
      </Head>
      <div className="min-h-screen surface-page px-4 py-5">
        <div className="max-w-lg mx-auto animate-up">
          {token ? <PortalApp token={token} /> : null}
        </div>
        <p className="text-center text-[11px] text-text-3 uppercase tracking-wide pt-6 max-w-lg mx-auto">
          Powered by PropSync
        </p>
      </div>
    </ThemeProvider>
  );
}
