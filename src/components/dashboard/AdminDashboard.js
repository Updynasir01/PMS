import { useState, useEffect } from 'react';
import { StatCard, Card, Badge, BarChart, PageHeader, EmptyState, Spinner, fmt, apiFetch, IconBox } from '../ui';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/admin/stats').then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!data) return null;

  const { totalOwners, totalProperties, totalUnits, occupiedUnits, vacantUnits,
    revenue, openMaintenance, recentPayments, recentMaintenance, activityFeed, propertiesOccupancy } = data;

  const occupancyRate = totalUnits ? Math.round(occupiedUnits / totalUnits * 100) : 0;

  return (
    <div className="animate-up space-y-6">
      <PageHeader title="Platform Overview" subtitle={fmt.month(fmt.currentMonth())} />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard size="sm" label="Owners" value={totalOwners} color="blue"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
        <StatCard size="sm" label="Properties" value={totalProperties} sub={`${totalUnits} total units`} color="purple"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
        />
        <StatCard size="sm" label="Occupied Units" value={occupiedUnits} sub={`${vacantUnits} vacant · ${occupancyRate}%`} color="green"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>}
        />
        <StatCard size="sm" label="Open Maintenance" value={openMaintenance} color="amber"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>}
        />
      </div>

      {/* Revenue */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard size="sm" label="Collected" value={fmt.usd(revenue.collected)} color="green"
          icon={<span className="text-sm">✓</span>} />
        <StatCard size="sm" label="Pending" value={fmt.usd(revenue.pending)} color="amber"
          icon={<span className="text-sm">⏳</span>} />
        <StatCard size="sm" label="Overdue" value={fmt.usd(revenue.overdue)} color="red"
          icon={<span className="text-sm">⚠</span>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Property Occupancy */}
        <Card>
          <h3 className="font-display text-[20px] text-text-1 mb-5">Property Occupancy</h3>
          {propertiesOccupancy.length ? (
            <BarChart
              items={propertiesOccupancy.map(p => ({
                label: p.name,
                meta: `${p.occupied_count}/${p.unit_count}`,
                value: +p.occupied_count,
                color: +p.occupied_count / (+p.unit_count || 1) > 0.7 ? 'green' : +p.occupied_count / (+p.unit_count || 1) > 0.4 ? 'purple' : 'amber',
              }))}
            />
          ) : <EmptyState title="No properties" />}
        </Card>

        {/* Activity Feed */}
        <Card>
          <h3 className="font-display text-[20px] text-text-1 mb-5">Recent Activity</h3>
          <div className="space-y-3">
            {activityFeed.slice(0, 8).map(a => (
              <div key={a.id} className="flex gap-3">
                <IconBox tint="purple" className="!w-8 !h-8 text-[11px] font-display">
                  {fmt.initials(a.full_name)}
                </IconBox>
                <div>
                  <div className="text-[14px] text-text-1">{a.description || a.action}</div>
                  <div className="text-[13px] text-text-3">{fmt.timeAgo(a.created_at)} · {a.full_name}</div>
                </div>
              </div>
            ))}
            {!activityFeed.length && <EmptyState title="No activity" />}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <Card>
          <h3 className="font-display text-[20px] text-text-1 mb-5">Recent Payments</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b-[0.5px] border-border">
                  <th className="text-left py-2 label-ui">Tenant</th>
                  <th className="text-left py-2 label-ui">Amount</th>
                  <th className="text-left py-2 label-ui">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.slice(0, 6).map(p => (
                  <tr key={p.id} className="border-b-[0.5px] border-border hover:bg-surface transition-colors duration-200">
                    <td className="py-2.5">
                      <div className="font-medium text-text-1">{p.tenant_name}</div>
                      <div className="text-[13px] text-text-3">{p.unit_number}</div>
                    </td>
                    <td className="py-2.5 font-semibold text-text-1">{fmt.usd(p.amount_usd)}</td>
                    <td className="py-2.5"><Badge status={p.status} /></td>
                  </tr>
                ))}
                {!recentPayments.length && (
                  <tr><td colSpan="3" className="text-center py-6 text-text-3">No payments</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Recent Maintenance */}
        <Card>
          <h3 className="font-display text-[20px] text-text-1 mb-5">Open Maintenance</h3>
          <div className="space-y-2">
            {recentMaintenance.slice(0, 5).map(m => (
              <div key={m.id} className="flex items-center gap-3 p-3 bg-surface rounded-sm border-[0.5px] border-border transition-all duration-200 hover:-translate-y-0.5">
                <IconBox tint="amber"><span className="text-base">{fmt.mrIcon(m.type)}</span></IconBox>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold truncate text-text-1">{m.title}</div>
                  <div className="text-[13px] text-text-3">{m.tenant_name} · {m.unit_number}</div>
                </div>
                <Badge status={m.status} />
              </div>
            ))}
            {!recentMaintenance.length && <EmptyState title="No open requests" icon="🎉" />}
          </div>
        </Card>
      </div>
    </div>
  );
}
