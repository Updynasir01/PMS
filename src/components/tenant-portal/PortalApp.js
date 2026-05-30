import { useState, useEffect, useCallback } from 'react';
import {
  Badge, Button, Select, Input, Textarea, Spinner, fmt, FeaturePill, EmptyState, Card,
} from '../ui';
import { useMaintenanceChatPoll } from '../../hooks/useMaintenanceChatPoll';

const MR_TYPES = [
  { value: 'electricity', label: 'Electricity' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'painting', label: 'Painting' },
  { value: 'ac_cooling', label: 'AC / Cooling' },
  { value: 'other', label: 'Other' },
];

const TABS = [
  { id: 'home', label: 'My Home', icon: '🏠' },
  { id: 'payments', label: 'Payments', icon: '💳' },
  { id: 'maintenance', label: 'Maintenance', icon: '🔧' },
];

function portalFetch(token, path, options = {}) {
  const sep = path.includes('?') ? '&' : '?';
  const url = `${path}${sep}token=${encodeURIComponent(token)}`;
  return fetch(url, {
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  }).then(async (r) => {
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Request failed');
    return d;
  });
}

export default function PortalApp({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('home');
  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({ type: 'plumbing', title: '', description: '', priority: 'medium' });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!detailId || !token) return null;
    return portalFetch(token, `/api/public/maintenance-detail?id=${detailId}`);
  }, [detailId, token]);

  const { chatRef, scrollToBottom, pollNow } = useMaintenanceChatPoll({
    enabled: !!detailId && !!detail && !detailLoading,
    fetchDetail,
    onUpdate: setDetail,
  });

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await portalFetch(token, '/api/public/dashboard');
      setData(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { if (token) loadDashboard(); }, [token, loadDashboard]);

  useEffect(() => {
    if (!detailId || !token) return undefined;
    let cancelled = false;
    setDetailLoading(true);
    portalFetch(token, `/api/public/maintenance-detail?id=${detailId}`)
      .then((d) => {
        if (!cancelled) {
          setDetail(d);
          requestAnimationFrame(() => scrollToBottom(true));
        }
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [detailId, token, scrollToBottom]);

  async function handleNewRequest(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    setSubmitting(true);
    try {
      await portalFetch(token, '/api/public/maintenance', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setNewOpen(false);
      setForm({ type: 'plumbing', title: '', description: '', priority: 'medium' });
      await loadDashboard();
      setTab('maintenance');
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendMessage() {
    if (!message.trim() || !detailId) return;
    setSending(true);
    try {
      await portalFetch(token, '/api/public/maintenance-message', {
        method: 'POST',
        body: JSON.stringify({ request_id: detailId, message: message.trim() }),
      });
      setMessage('');
      await pollNow();
      scrollToBottom(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (error && !data) {
    return (
      <div className="surface-card text-center py-10 px-4">
        <p className="text-status-red text-[14px]">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { unit, property, tenant, lease, currentPayment, paymentHistory, maintenanceRequests } = data;
  const hasTenant = !!tenant;

  if (detailId) {
    return (
      <div className="space-y-4 pb-8">
        <button
          type="button"
          onClick={() => { setDetailId(null); setDetail(null); setTab('maintenance'); }}
          className="flex items-center gap-2 text-sm text-text-3 hover:text-text-1"
        >
          ← Back to requests
        </button>
        {detailLoading || !detail ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <>
            <Card>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{fmt.mrIcon(detail.type)}</span>
                <div>
                  <h2 className="font-display font-bold text-lg">{detail.title}</h2>
                  <div className="flex gap-2 mt-1">
                    <Badge status={detail.priority} compact />
                    <Badge status={detail.status} compact />
                  </div>
                </div>
              </div>
              <p className="text-[14px] text-text-2 leading-relaxed">{detail.description}</p>
              <p className="text-xs text-text-3 mt-3">{fmt.timeAgo(detail.created_at)}</p>
            </Card>
            <Card>
              <p className="label-ui mb-3">Conversation</p>
              <div
                ref={chatRef}
                className="max-h-[50vh] overflow-y-auto space-y-3 mb-4 pr-1 rounded-lg bg-page border border-border p-3"
              >
                {detail.messages?.length ? detail.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.sender_role === 'tenant' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-[13px] ${
                        m.sender_role === 'tenant'
                          ? 'bg-accent text-white'
                          : 'bg-surface text-text-1 border border-border'
                      }`}
                    >
                      <p className="text-[10px] opacity-80 mb-0.5">{m.full_name}</p>
                      <p>{m.message}</p>
                      <p className="text-[10px] opacity-70 mt-1">{fmt.timeAgo(m.created_at)}</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-center text-text-3 text-sm py-4">No messages yet</p>
                )}
              </div>
              {detail.status !== 'completed' && (
                <div className="flex gap-2">
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-input border border-border rounded-sm px-3 py-2 text-[14px] text-text-1"
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                  />
                  <Button onClick={handleSendMessage} disabled={sending || !message.trim()}>
                    {sending ? '…' : 'Send'}
                  </Button>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="pb-24">
      {error && (
        <div className="mb-3 px-3 py-2 bg-status-red-dim text-status-red text-[13px] rounded-sm">{error}</div>
      )}

      <header className="text-center mb-4">
        <div className="font-display text-[26px] text-text-1">
          Prop<span className="text-accent">Sync</span>
        </div>
        <h1 className="font-display text-[20px] text-text-1 mt-2">Unit {unit.unit_number}</h1>
        <p className="text-[13px] text-text-2">{property.name} · {property.district}</p>
        {hasTenant && (
          <p className="text-[12px] text-text-3 mt-1">Welcome, {tenant.full_name}</p>
        )}
        <p className="text-[11px] text-accent mt-2">No login required — scan to access your portal</p>
      </header>

      {!hasTenant && (
        <div className="surface-card mb-4 text-center py-6">
          <p className="text-[14px] text-text-2">No tenant assigned to this unit yet.</p>
          <p className="text-[13px] text-text-3 mt-1">Contact your landlord for access.</p>
        </div>
      )}

      {tab === 'home' && (
        <div className="space-y-4">
          <section className="surface-card">
            <p className="label-ui mb-3">Unit details</p>
            <div className="flex flex-wrap gap-2 mb-3">
              <FeaturePill icon="🛏" variant="bedroom">{unit.bedrooms} bed{unit.bedrooms !== 1 ? 's' : ''}</FeaturePill>
              <FeaturePill icon="🚿" variant="bath">{unit.toilets} bath</FeaturePill>
              <FeaturePill icon="🍳" variant={unit.has_kitchen ? 'kitchen' : 'off'}>
                {unit.has_kitchen ? 'Kitchen' : 'No kitchen'}
              </FeaturePill>
              <FeaturePill icon="🪑" variant={unit.is_furnished ? 'furnished' : 'off'}>
                {unit.is_furnished ? 'Furnished' : 'Unfurnished'}
              </FeaturePill>
              <FeaturePill variant="neutral">Floor {unit.floor}</FeaturePill>
            </div>
            <p className="text-[13px] text-text-3">{property.address}</p>
            <p className="font-display text-[22px] text-accent mt-3">{fmt.usd(unit.monthly_rent_usd)}<span className="text-[12px] text-text-3 font-sans"> / month</span></p>
          </section>

          {lease && (
            <section className="surface-card text-sm space-y-2">
              <p className="label-ui mb-2">Lease</p>
              <div className="flex justify-between"><span className="text-text-3">Start</span><span>{fmt.date(lease.start_date)}</span></div>
              {lease.end_date && (
                <div className="flex justify-between"><span className="text-text-3">End</span><span>{fmt.date(lease.end_date)}</span></div>
              )}
              <div className="flex justify-between"><span className="text-text-3">Deposit</span><span>{fmt.usd(lease.deposit_usd)}</span></div>
            </section>
          )}

          {hasTenant && (
            <section className="surface-card">
              <p className="label-ui mb-2">This month — {fmt.month(data.currentMonth)}</p>
              {currentPayment ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-display text-[32px] text-accent">{fmt.usd(currentPayment.amount_usd)}</span>
                    <Badge status={currentPayment.status} />
                  </div>
                  <p className="text-sm text-text-3 mt-2">Due: {fmt.date(currentPayment.due_date)}</p>
                  {currentPayment.paid_date && <p className="text-sm text-text-3">Paid: {fmt.date(currentPayment.paid_date)}</p>}
                  {currentPayment.payment_method && (
                    <p className="text-sm text-text-3">via {fmt.payMethod(currentPayment.payment_method)}</p>
                  )}
                  {currentPayment.status !== 'paid' && (
                    <p className="mt-3 text-[12px] text-status-amber bg-status-amber-dim border border-status-amber/20 rounded-sm px-3 py-2">
                      Pay via EVC Plus, Zaad, Sahal, or Cash. Contact your landlord to confirm.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-[14px] text-text-3">No payment record this month</p>
              )}
            </section>
          )}

          {hasTenant && maintenanceRequests.length > 0 && (
            <section className="surface-card">
              <div className="flex justify-between items-center mb-3">
                <p className="label-ui mb-0">Recent maintenance</p>
                <button type="button" className="text-xs text-accent" onClick={() => setTab('maintenance')}>See all →</button>
              </div>
              <div className="space-y-2">
                {maintenanceRequests.slice(0, 3).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setDetailId(r.id)}
                    className="w-full flex items-center gap-3 p-3 bg-surface rounded-sm border border-border text-left"
                  >
                    <span>{fmt.mrIcon(r.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{r.title}</div>
                      <div className="text-xs text-text-3">{fmt.timeAgo(r.created_at)}</div>
                    </div>
                    <Badge status={r.status} compact />
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {tab === 'payments' && hasTenant && (
        <section className="surface-card overflow-x-auto">
          <p className="label-ui mb-3">All payments</p>
          {paymentHistory.length ? (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border">
                  {['Month', 'Amount', 'Method', 'Status'].map((h) => (
                    <th key={h} className="text-left py-2 text-[10px] text-text-3 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((p) => (
                  <tr key={p.id} className="border-b border-border/50">
                    <td className="py-2">{fmt.month(p.payment_month)}</td>
                    <td className="py-2 font-semibold">{fmt.usd(p.amount_usd)}</td>
                    <td className="py-2 text-text-3 text-xs">{fmt.payMethod(p.payment_method)}</td>
                    <td className="py-2"><Badge status={p.status} compact /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="No payments yet" description="Your landlord will add payment records" />
          )}
        </section>
      )}

      {tab === 'payments' && !hasTenant && (
        <EmptyState icon="💳" title="Payments unavailable" description="Assign a tenant to this unit first" />
      )}

      {tab === 'maintenance' && (
        <div className="space-y-3">
          {hasTenant && (
            <Button className="w-full justify-center" onClick={() => setNewOpen(true)}>
              + New request
            </Button>
          )}
          {newOpen && hasTenant && (
            <section className="surface-card">
              <p className="label-ui mb-3">New maintenance request</p>
              <form onSubmit={handleNewRequest}>
                <Select label="Type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                  {MR_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
                <Input label="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Brief summary" />
                <Textarea label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
                <Select label="Priority" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Select>
                <div className="flex gap-2 mt-2">
                  <Button type="submit" disabled={submitting} className="flex-1 justify-center">{submitting ? '…' : 'Submit'}</Button>
                  <Button type="button" variant="secondary" onClick={() => setNewOpen(false)}>Cancel</Button>
                </div>
              </form>
            </section>
          )}
          {!hasTenant ? (
            <EmptyState icon="🔧" title="Maintenance unavailable" description="No tenant on this unit" />
          ) : maintenanceRequests.length ? (
            maintenanceRequests.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setDetailId(r.id)}
                className="w-full surface-card text-left hover:border-accent/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{fmt.mrIcon(r.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{r.title}</div>
                    <p className="text-xs text-text-3 truncate">{r.description}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge status={r.priority} compact />
                      <Badge status={r.status} compact />
                    </div>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <EmptyState title="No requests yet" description="Tap + New request when something needs fixing" />
          )}
        </div>
      )}

      {!detailId && (
        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-page/95 backdrop-blur-md">
          <div className="max-w-lg mx-auto flex">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setTab(t.id); setError(''); }}
                className={`flex-1 py-3 text-center text-[11px] font-medium transition-colors ${
                  tab === t.id ? 'text-accent' : 'text-text-3'
                }`}
              >
                <span className="block text-lg mb-0.5">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
