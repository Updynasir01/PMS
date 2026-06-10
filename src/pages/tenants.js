import { useState, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import { Card, Badge, EmptyState, Spinner, Avatar, fmt, apiFetch, toast } from '../components/ui';
import { useAuth } from './_app';
import Head from 'next/head';
import { Button } from '../components/ui';
import { Modal } from '../components/ui';
import LeaseSignPanel from '../components/LeaseSignPanel';
import { useTranslation } from '../context/LanguageContext';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

export default function TenantsPage() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leaseTenantId, setLeaseTenantId] = useState(null);

  const t = useTranslation();
  const isAdmin = user?.role === 'superadmin';
  const isOwner = user?.role === 'owner';

  const loadTenants = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const endpoint = isAdmin ? '/api/admin/tenants' : '/api/owner/tenants';
    try {
      setTenants(await apiFetch(endpoint));
    } catch (e) { if (!silent) toast.error(e.message); }
    finally { if (!silent) setLoading(false); }
  }, [isAdmin]);

  useAutoRefresh((silent) => loadTenants(silent), [loadTenants]);

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
                      {['Tenant','Unit','Property', isAdmin && 'Owner','Rent','This Month','Phone', isOwner && 'Actions'].filter(Boolean).map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs text-text-3 font-semibold uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((row) => (
                      <tr key={row.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={row.full_name} size="sm" />
                            <div>
                              <div className="font-semibold">{row.full_name}</div>
                              <div className="text-xs text-text-3">QR portal access</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-text-2">{row.unit_number || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="text-text-2">{row.property_name || '—'}</div>
                          {row.district && <div className="text-xs text-text-3">{row.district}</div>}
                        </td>
                        {isAdmin && <td className="px-4 py-3 text-text-2">{row.owner_name || '—'}</td>}
                        <td className="px-4 py-3 font-semibold">{row.monthly_rent_usd ? fmt.usd(row.monthly_rent_usd) + '/mo' : '—'}</td>
                        <td className="px-4 py-3"><Badge status={row.current_month_status || 'pending'} /></td>
                        <td className="px-4 py-3 text-text-3 text-xs">{row.phone || '—'}</td>
                        {isOwner && (
                          <td className="px-4 py-3">
                            <Button size="xs" variant="secondary" onClick={() => setLeaseTenantId(row.id)}>
                              Lease & sign
                            </Button>
                          </td>
                        )}
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
        <Modal open={!!leaseTenantId} onClose={() => setLeaseTenantId(null)} title="Lease agreement (cloud)" large>
          {leaseTenantId && (
            <LeaseSignPanel tenantId={leaseTenantId} role="owner" apiBase="/api/owner/lease-document" />
          )}
        </Modal>
      </Layout>
    </>
  );
}
