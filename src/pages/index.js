import { useEffect } from 'react';
import { useAuth } from './_app';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import OwnerDashboard from '../components/dashboard/OwnerDashboard';
import TenantDashboard from '../components/dashboard/TenantDashboard';
import CaretakerDashboard from '../components/dashboard/CaretakerDashboard';
import Layout from '../components/layout/Layout';
import { Spinner } from '../components/ui';
import Head from 'next/head';

export default function HomePage() {
  const { user } = useAuth();
  if (!user) return null;

  const dashboards = {
    superadmin: <AdminDashboard />,
    owner: <OwnerDashboard />,
    tenant: <TenantDashboard />,
    caretaker: <CaretakerDashboard />,
  };

  return (
    <>
      <Head><title>PropSync — Dashboard</title></Head>
      <Layout title="Dashboard">
        {dashboards[user.role] || <div className="text-text-3">Unknown role</div>}
      </Layout>
    </>
  );
}
