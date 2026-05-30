import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { StatCard, Card, Badge, ProgressBar, PageHeader, EmptyState, Spinner, fmt, apiFetch, IconBox, Button, Modal, Input } from '../ui';
import { generateWhatsAppLink, leaseExpiryMessage } from '../../lib/whatsapp';
import { useTranslation } from '../../context/LanguageContext';

export default function OwnerDashboard() {
  const t = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [renewLease, setRenewLease] = useState(null);
  const [renewDate, setRenewDate] = useState('');
  const router = useRouter();

  useEffect(() => {
    apiFetch('/api/owner/dashboard').then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!data) return null;

  const { properties, revenue, expenseSummary, leaseAlerts, pendingMaintenance, tenants } = data;
  const totalUnits = properties.reduce((s, p) => s + +p.total_units, 0);
  const occupiedUnits = properties.reduce((s, p) => s + +p.occupied_units, 0);
  const occupancyRate = totalUnits ? Math.round(occupiedUnits / totalUnits * 100) : 0;

  return (
    <div className="animate-up space-y-6">
      <PageHeader title="My Dashboard" subtitle={`${properties.length} properties · ${fmt.month(fmt.currentMonth())}`} />

      {leaseAlerts?.length > 0 && (
        <div className="p-4 rounded-lg bg-status-amber-dim border border-status-amber/30 text-sm">
          ⚠️ {leaseAlerts.length} {t.leaseExpiring}
          <button type="button" className="ml-2 text-accent underline" onClick={() => document.getElementById('lease-alerts')?.scrollIntoView({ behavior: 'smooth' })}>View</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard size="sm" label="Collected" value={fmt.usd(revenue.collected)} color="green"
          icon={<span className="text-sm font-bold">$</span>} />
        <StatCard size="sm" label="Pending" value={fmt.usd(revenue.pending)} color="amber"
          icon={<span className="text-sm">⏳</span>} />
        <StatCard size="sm" label="Overdue" value={fmt.usd(revenue.overdue)} color="red"
          icon={<span className="text-sm">⚠</span>} />
        <StatCard size="sm" label="Occupancy" value={`${occupancyRate}%`} sub={`${occupiedUnits}/${totalUnits} units`} color="purple"
          icon={<span className="text-sm">▦</span>} />
        {expenseSummary && (
          <StatCard size="sm" label={t.netProfit} value={fmt.usd(expenseSummary.netProfit)} color={expenseSummary.netProfit >= 0 ? 'green' : 'red'}
            icon={<span className="text-sm">📊</span>} />
        )}
      </div>

      {leaseAlerts?.length > 0 && (
        <Card id="lease-alerts">
          <h3 className="font-display font-bold mb-4">{t.leaseExpiring}</h3>
          <div className="space-y-2">
            {leaseAlerts.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-surface rounded-sm border border-border text-sm">
                <div>
                  <span className="font-semibold">{l.tenant_name}</span>
                  <span className="text-text-3"> · {l.property_name} · Unit {l.unit_number}</span>
                  <div className={`text-xs mt-1 ${l.days_remaining < 7 ? 'text-status-red' : 'text-status-amber'}`}>
                    Ends {fmt.date(l.end_date)} ({l.days_remaining} days)
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="xs" variant="secondary" onClick={() => { setRenewLease(l); setRenewDate(l.end_date?.slice?.(0, 10) || ''); }}>{t.renewLease}</Button>
                  {l.tenant_phone && generateWhatsAppLink(l.tenant_phone, leaseExpiryMessage({ tenantName: l.tenant_name, endDate: fmt.date(l.end_date) })) && (
                    <a href={generateWhatsAppLink(l.tenant_phone, leaseExpiryMessage({ tenantName: l.tenant_name, endDate: fmt.date(l.end_date) }))} target="_blank" rel="noreferrer">
                      <Button size="xs" variant="ghost">WhatsApp</Button>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={!!renewLease} onClose={() => setRenewLease(null)} title={t.renewLease}
        footer={<><Button variant="secondary" onClick={() => setRenewLease(null)}>{t.cancel}</Button><Button onClick={async () => {
          await apiFetch('/api/owner/renew-lease', { method: 'PATCH', body: { lease_id: renewLease.id, end_date: renewDate } });
          setRenewLease(null);
          apiFetch('/api/owner/dashboard').then(setData);
        }}>{t.save}</Button></>}>
        <Input label={t.leaseEnd} type="date" value={renewDate} onChange={(e) => setRenewDate(e.target.value)} />
      </Modal>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Properties */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold">Properties</h3>
            <button onClick={() => router.push('/properties')}
              className="label-ui text-accent hover:underline normal-case">Manage →</button>
          </div>
          <div className="space-y-4">
            {properties.map(p => (
              <div key={p.id} className="flex items-center gap-3 cursor-pointer hover:bg-surface p-2 rounded-sm -mx-2 transition-all duration-200"
                onClick={() => router.push(`/properties?id=${p.id}`)}>
                <div className="min-w-0 flex-[0_0_150px]">
                  <div className="text-sm font-semibold truncate">{p.name}</div>
                  <div className="text-[13px] text-text-3">{p.district}</div>
                </div>
                <div className="flex-1">
                  <ProgressBar value={+p.occupied_units} max={+p.total_units} />
                </div>
                <div className="text-[13px] text-text-3 flex-shrink-0">
                  {p.occupied_units}/{p.total_units}
                </div>
              </div>
            ))}
            {!properties.length && <EmptyState title="No properties yet" description="Add your first property" />}
          </div>
        </Card>

        {/* Open Maintenance */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold">Open Maintenance</h3>
            <button onClick={() => router.push('/maintenance')}
              className="text-xs text-accent hover:underline">View All →</button>
          </div>
          <div className="space-y-2">
            {pendingMaintenance.slice(0, 5).map(m => (
              <div key={m.id}
                onClick={() => router.push(`/maintenance/${m.id}`)}
                className="flex items-center gap-3 p-3 bg-surface rounded-sm border-[0.5px] border-border cursor-pointer hover:-translate-y-0.5 transition-all duration-200">
                <IconBox tint="amber"><span className="text-base">{fmt.mrIcon(m.type)}</span></IconBox>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{m.title}</div>
                  <div className="text-[13px] text-text-3">{m.tenant_name} · {m.unit_number}</div>
                </div>
                <Badge status={m.priority} />
              </div>
            ))}
            {!pendingMaintenance.length && <EmptyState icon="🎉" title="No open requests" />}
          </div>
        </Card>
      </div>

      {/* Tenant Payment Status */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold">Tenant Payment Status — {fmt.month(fmt.currentMonth())}</h3>
          <button onClick={() => router.push('/payments')}
            className="text-xs text-accent hover:underline">All Payments →</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-[0.5px] border-border">
                {['Tenant','Unit','Property','Rent','Status'].map(h => (
                  <th key={h} className="text-left py-2 label-ui pb-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id} className="border-b-[0.5px] border-border hover:bg-surface transition-colors duration-200">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <IconBox tint="purple" className="!w-8 !h-8 text-[11px] font-display">{fmt.initials(t.full_name)}</IconBox>
                      <span className="font-medium text-text-1">{t.full_name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-text-2">{t.unit_number || '—'}</td>
                  <td className="py-3 text-text-2">{t.property_name || '—'}</td>
                  <td className="py-3 font-semibold">{t.monthly_rent_usd ? fmt.usd(t.monthly_rent_usd) : '—'}</td>
                  <td className="py-3"><Badge status={t.current_payment_status || 'pending'} /></td>
                </tr>
              ))}
              {!tenants.length && (
                <tr><td colSpan="5" className="text-center py-8 text-text-3">No tenants yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
