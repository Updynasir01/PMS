import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { Card, Badge, EmptyState, Spinner, Avatar, fmt, apiFetch, toast } from '../components/ui';
import { useAuth } from './_app';
import Head from 'next/head';

export default function TenantsPage() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'superadmin';

  useEffect(() => {
    const endpoint = isAdmin ? '/api/admin/tenants' : '/api/owner/tenants';
    apiFetch(endpoint).then(setTenants).catch(e => toast.error(e.message)).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Head><title>PropSync — Tenants</title></Head>
      <Layout title="Tenants">
        <div className="animate-up space-y-6">
          <div>
            <h2 className="font-display text-2xl font-bold">Tenants</h2>
            <p className="text-text-3 text-sm">{tenants.length} registered tenants</p>
          </div>

          {loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : (
            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface">
                      {['Tenant','Unit','Property', isAdmin && 'Owner','Rent','This Month','Phone'].filter(Boolean).map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs text-text-3 font-semibold uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map(t => (
                      <tr key={t.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={t.full_name} size="sm" />
                            <div>
                              <div className="font-semibold">{t.full_name}</div>
                              <div className="text-xs text-text-3">@{t.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-text-2">{t.unit_number || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="text-text-2">{t.property_name || '—'}</div>
                          {t.district && <div className="text-xs text-text-3">{t.district}</div>}
                        </td>
                        {isAdmin && <td className="px-4 py-3 text-text-2">{t.owner_name || '—'}</td>}
                        <td className="px-4 py-3 font-semibold">{t.monthly_rent_usd ? fmt.usd(t.monthly_rent_usd) + '/mo' : '—'}</td>
                        <td className="px-4 py-3"><Badge status={t.current_month_status || 'pending'} /></td>
                        <td className="px-4 py-3 text-text-3 text-xs">{t.phone || '—'}</td>
                      </tr>
                    ))}
                    {!tenants.length && (
                      <tr><td colSpan="7" className="text-center py-12 text-text-3">No tenants yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </Layout>
    </>
  );
}
