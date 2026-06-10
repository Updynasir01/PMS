import { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { StatCard, Card, Badge, PageHeader, EmptyState, Spinner, fmt, apiFetch, FeaturePill } from '../ui';
import LeaseSignPanel from '../LeaseSignPanel';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

export default function TenantDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setData(await apiFetch('/api/tenant/dashboard'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useAutoRefresh(load, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!data) return null;

  const { unit, lease, currentPayment, paymentHistory, maintenanceRequests } = data;

  if (!unit) return (
    <div className="flex items-center justify-center py-20">
      <Card className="text-center max-w-sm">
        <div className="text-4xl mb-3">🏠</div>
        <h3 className="font-display font-bold mb-2">No Unit Assigned</h3>
        <p className="text-[14px] text-text-3">Your landlord will assign you to a unit. Contact them for help.</p>
      </Card>
    </div>
  );

  const totalPaid = paymentHistory.filter(p => p.status === 'paid').reduce((s, p) => s + +p.amount_usd, 0);
  const totalOwed = paymentHistory.filter(p => p.status !== 'paid').reduce((s, p) => s + +p.amount_usd, 0);

  return (
    <div className="animate-up space-y-6">
      <PageHeader title="My Home" subtitle={`${unit.unit_number} · ${unit.property_name}`} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unit Details */}
        <Card>
          <h3 className="font-display font-bold mb-4">Unit Details</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-surface rounded-sm p-3 border-[0.5px] border-border">
              <div className="label-ui mb-1">Property</div>
              <div className="font-semibold text-[14px] text-text-1">{unit.property_name}</div>
              <div className="text-[13px] text-text-3">{unit.district} · {unit.address}</div>
            </div>
            <div className="bg-surface rounded-sm p-3 border-[0.5px] border-border">
              <div className="label-ui mb-1">Monthly Rent</div>
              <div className="font-display text-display-lg text-accent">{fmt.usd(unit.monthly_rent_usd)}</div>
            </div>
            <div className="bg-surface rounded-sm p-3 border-[0.5px] border-border">
              <div className="label-ui mb-1">Bedrooms</div>
              <div className="font-semibold text-text-1">🛏 {unit.bedrooms} bedroom{unit.bedrooms !== 1 ? 's' : ''}</div>
            </div>
            <div className="bg-surface rounded-sm p-3 border-[0.5px] border-border">
              <div className="label-ui mb-1">Bathrooms</div>
              <div className="font-semibold">🚿 {unit.toilets} toilet{unit.toilets !== 1 ? 's' : ''}</div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <FeaturePill icon="🍳" variant={unit.has_kitchen ? 'kitchen' : 'off'}>{unit.has_kitchen ? 'Has kitchen' : 'No kitchen'}</FeaturePill>
            <FeaturePill icon="🪑" variant={unit.is_furnished ? 'furnished' : 'off'}>{unit.is_furnished ? 'Furnished' : 'Unfurnished'}</FeaturePill>
          </div>
          {lease && (
            <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-3">Lease Start</span>
                <span className="font-medium">{fmt.date(lease.start_date)}</span>
              </div>
              {lease.end_date && (
                <div className="flex justify-between">
                  <span className="text-text-3">Lease End</span>
                  <span className="font-medium">{fmt.date(lease.end_date)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text-3">Security Deposit</span>
                <span className="font-medium">{fmt.usd(lease.deposit_usd)}</span>
              </div>
            </div>
          )}
        </Card>

        {/* Current Month Payment */}
        <Card>
          <h3 className="font-display font-bold mb-4">This Month — {fmt.month(fmt.currentMonth())}</h3>
          {currentPayment ? (
            <div className="text-center py-4">
              <div className="text-6xl mb-3">
                {currentPayment.status === 'paid' ? '✅' : currentPayment.status === 'overdue' ? '⚠️' : '⏳'}
              </div>
              <div className="font-display text-display-lg text-accent mb-3">{fmt.usd(currentPayment.amount_usd)}</div>
              <div className="flex justify-center mb-3"><Badge status={currentPayment.status} /></div>
              <div className="text-sm text-text-3">Due: {fmt.date(currentPayment.due_date)}</div>
              {currentPayment.paid_date && (
                <div className="text-sm text-text-3">Paid: {fmt.date(currentPayment.paid_date)}</div>
              )}
              {currentPayment.payment_method && (
                <div className="text-sm text-text-3 mt-1">via {fmt.payMethod(currentPayment.payment_method)}</div>
              )}
              {currentPayment.status !== 'paid' && (
                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs">
                  💳 Pay via EVC Plus, Zaad, Sahal, or Cash. Contact landlord to confirm receipt.
                </div>
              )}
            </div>
          ) : (
            <EmptyState icon="📋" title="No payment record" description="Contact your landlord to generate this month's payment" />
          )}
        </Card>
      </div>

      {lease && (
        <Card>
          <h3 className="font-display font-bold mb-2">Lease agreement</h3>
          <p className="text-sm text-text-3 mb-4">Sign in the browser — your signature is stored in the cloud. Download the final PDF anytime.</p>
          <LeaseSignPanel role="tenant" />
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment History */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold">Payment History</h3>
            <button onClick={() => router.push('/payments')} className="text-xs text-accent hover:underline">View All →</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Month','Amount','Method','Status'].map(h => (
                    <th key={h} className="text-left py-2 text-xs text-text-3 font-semibold uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paymentHistory.slice(0, 6).map(p => (
                  <tr key={p.id} className="border-b border-border/50">
                    <td className="py-2.5 font-medium">{fmt.month(p.payment_month)}</td>
                    <td className="py-2.5 font-semibold">{fmt.usd(p.amount_usd)}</td>
                    <td className="py-2.5 text-text-3 text-xs">{fmt.payMethod(p.payment_method)}</td>
                    <td className="py-2.5"><Badge status={p.status} /></td>
                  </tr>
                ))}
                {!paymentHistory.length && (
                  <tr><td colSpan="4" className="text-center py-6 text-text-3">No payment history</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Maintenance Requests */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold">Maintenance Requests</h3>
            <button onClick={() => router.push('/maintenance')} className="text-xs text-accent hover:underline">New Request →</button>
          </div>
          <div className="space-y-2">
            {maintenanceRequests.slice(0, 4).map(r => (
              <div key={r.id}
                onClick={() => router.push(`/maintenance/${r.id}`)}
                className="flex items-center gap-3 p-3 bg-surface rounded-sm border-[0.5px] border-border cursor-pointer hover:-translate-y-0.5 transition-all duration-200 transition-colors">
                <span className="text-lg">{fmt.mrIcon(r.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{r.title}</div>
                  <div className="text-xs text-text-3">{fmt.timeAgo(r.created_at)}</div>
                </div>
                <Badge status={r.status} />
              </div>
            ))}
            {!maintenanceRequests.length && <EmptyState title="No requests yet" description="Submit a request if something needs fixing" />}
          </div>
        </Card>
      </div>
    </div>
  );
}
