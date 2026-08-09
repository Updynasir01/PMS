import AdminDashboard from '../components/dashboard/AdminDashboard';
import OwnerDashboard from '../components/dashboard/OwnerDashboard';
import TenantDashboard from '../components/dashboard/TenantDashboard';
import CaretakerDashboard from '../components/dashboard/CaretakerDashboard';
import Layout from '../components/layout/Layout';
import { useAuth } from './_app';
import Head from 'next/head';

export default function AppDashboardPage() {
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
      <Head><title>eNuzul — Dashboard</title></Head>
      <Layout title="Dashboard">
        {dashboards[user.role] || <div className="text-text-3">Unknown role</div>}
      </Layout>
    </>
  );
}
