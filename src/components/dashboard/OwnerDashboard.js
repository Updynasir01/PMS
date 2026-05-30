import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { StatCard, Card, Badge, ProgressBar, PageHeader, EmptyState, Spinner, fmt, apiFetch, IconBox } from '../ui';

export default function OwnerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    apiFetch('/api/owner/dashboard').then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!data) return null;

  const { properties, revenue, pendingMaintenance, tenants } = data;
  const totalUnits = properties.reduce((s, p) => s + +p.total_units, 0);
  const occupiedUnits = properties.reduce((s, p) => s + +p.occupied_units, 0);
  const occupancyRate = totalUnits ? Math.round(occupiedUnits / totalUnits * 100) : 0;

  return (
    <div className="animate-up space-y-6">
      <PageHeader title="My Dashboard" subtitle={`${properties.length} properties · ${fmt.month(fmt.currentMonth())}`} />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard size="lg" label="Collected" value={fmt.usd(revenue.collected)} color="green"
          icon={<span className="text-2xl font-bold">$</span>} />
        <StatCard size="lg" label="Pending" value={fmt.usd(revenue.pending)} color="amber"
          icon={<span className="text-2xl">⏳</span>} />
        <StatCard size="lg" label="Overdue" value={fmt.usd(revenue.overdue)} color="red"
          icon={<span className="text-2xl">⚠</span>} />
        <StatCard size="lg" label="Occupancy" value={`${occupancyRate}%`} sub={`${occupiedUnits}/${totalUnits} units`} color="purple"
          icon={<span className="text-2xl">▦</span>} />
      </div>

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
