import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { Card, Badge, Button, Modal, Select, Input, EmptyState, Spinner, fmt, apiFetch, toast } from '../components/ui';
import { useAuth } from './_app';
import Head from 'next/head';

const METHODS = [
  { value: 'evc_plus', label: 'EVC Plus' },
  { value: 'zaad', label: 'Zaad' },
  { value: 'sahal', label: 'Sahal' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
];

export default function PaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMonth, setFilterMonth] = useState(fmt.currentMonth());
  const [selected, setSelected] = useState(null);
  const [updateForm, setUpdateForm] = useState({ status: '', payment_method: '', paid_date: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [genMonth, setGenMonth] = useState(fmt.currentMonth());
  const [genOpen, setGenOpen] = useState(false);

  const isAdmin = user?.role === 'superadmin';
  const isTenant = user?.role === 'tenant';

  useEffect(() => { loadPayments(); }, [filterStatus, filterMonth]);

  async function loadPayments() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterMonth) params.set('month', filterMonth);
      const endpoint = isAdmin ? `/api/admin/payments?${params}` : isTenant ? '/api/tenant/payments' : `/api/owner/payments?${params}`;
      const data = await apiFetch(endpoint);
      setPayments(data);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  function openUpdate(p) {
    setSelected(p);
    setUpdateForm({ status: p.status, payment_method: p.payment_method || '', paid_date: p.paid_date || '', notes: p.notes || '' });
  }

  async function handleUpdate() {
    setSaving(true);
    try {
      const endpoint = isAdmin ? '/api/admin/payments-update' : '/api/owner/payments';
      await apiFetch(endpoint, { method: 'PATCH', body: { id: selected.id, ...updateForm } });
      toast.success('Payment updated!');
      setSelected(null);
      loadPayments();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function handleGeneratePayments() {
    setSaving(true);
    try {
      const data = await apiFetch('/api/owner/generate-payments', { method: 'POST', body: { month: genMonth } });
      toast.success(`Generated ${data.created} payment records for ${fmt.month(genMonth)}`);
      setGenOpen(false);
      loadPayments();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  const collected = payments.filter(p => p.status === 'paid').reduce((s, p) => s + +p.amount_usd, 0);
  const pending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + +p.amount_usd, 0);
  const overdue = payments.filter(p => p.status === 'overdue').reduce((s, p) => s + +p.amount_usd, 0);

  return (
    <>
      <Head><title>PropSync — Payments</title></Head>
      <Layout title="Payments">
        <div className="animate-up space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold">Payments</h2>
              <p className="text-text-3 text-sm">Rent collection management</p>
            </div>
            {!isTenant && (
              <div className="flex gap-2">
                {(user?.role === 'owner') && (
                  <Button variant="secondary" onClick={() => setGenOpen(true)}>Generate Month</Button>
                )}
              </div>
            )}
          </div>

          {/* Summary stats */}
          {!isTenant && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Collected', value: fmt.usd(collected), color: 'text-green-400', bg: 'bg-green-900/20' },
                { label: 'Pending', value: fmt.usd(pending), color: 'text-amber-400', bg: 'bg-amber-900/20' },
                { label: 'Overdue', value: fmt.usd(overdue), color: 'text-red-400', bg: 'bg-red-900/20' },
              ].map(s => (
                <div key={s.label} className={`${s.bg} border border-border rounded-xl p-4`}>
                  <div className={`font-display text-2xl font-extrabold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-text-3 mt-1 uppercase tracking-wide">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          {!isTenant && (
            <div className="flex gap-3 flex-wrap">
              <select className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-1 focus:outline-none focus:border-[#6c63ff]"
                value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
              <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-1 focus:outline-none focus:border-[#6c63ff]" />
            </div>
          )}

          {/* Table */}
          <Card className="p-0 overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-16"><Spinner size="lg" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface">
                      {['Month', 'Tenant', 'Property / Unit', 'Amount', 'Method', 'Paid Date', 'Status', !isTenant && 'Action'].filter(Boolean).map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs text-text-3 font-semibold uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                        <td className="px-4 py-3 font-semibold">{fmt.month(p.payment_month)}</td>
                        {!isTenant && <td className="px-4 py-3">
                          <div className="font-medium">{p.tenant_name}</div>
                        </td>}
                        <td className="px-4 py-3">
                          <div className="text-text-2">{p.unit_number || p.property_name}</div>
                          {p.property_name && p.unit_number && <div className="text-xs text-text-3">{p.property_name}</div>}
                        </td>
                        <td className="px-4 py-3 font-bold">{fmt.usd(p.amount_usd)}</td>
                        <td className="px-4 py-3 text-text-3 text-xs">{fmt.payMethod(p.payment_method)}</td>
                        <td className="px-4 py-3 text-text-3 text-xs">{p.paid_date ? fmt.date(p.paid_date) : '—'}</td>
                        <td className="px-4 py-3"><Badge status={p.status} /></td>
                        {!isTenant && (
                          <td className="px-4 py-3">
                            <Button size="xs" variant="secondary" onClick={() => openUpdate(p)}>Update</Button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {!payments.length && (
                      <tr><td colSpan="8" className="text-center py-12 text-text-3">No payments found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Update Payment Modal */}
        <Modal open={!!selected} onClose={() => setSelected(null)} title="Update Payment"
          footer={<><Button variant="secondary" onClick={() => setSelected(null)}>Cancel</Button><Button onClick={handleUpdate} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button></>}>
          {selected && (
            <div>
              <div className="p-3 bg-surface rounded-lg border border-border mb-4 text-sm">
                <div className="font-semibold">{selected.tenant_name}</div>
                <div className="text-text-3">{selected.unit_number} · {fmt.month(selected.payment_month)} · {fmt.usd(selected.amount_usd)}</div>
              </div>
              <Select label="Status" value={updateForm.status} onChange={e => setUpdateForm(f => ({ ...f, status: e.target.value }))}>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </Select>
              <Select label="Payment Method" value={updateForm.payment_method} onChange={e => setUpdateForm(f => ({ ...f, payment_method: e.target.value }))}>
                <option value="">— Select —</option>
                {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </Select>
              <Input label="Notes" value={updateForm.notes} onChange={e => setUpdateForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
            </div>
          )}
        </Modal>

        {/* Generate Payments Modal */}
        <Modal open={genOpen} onClose={() => setGenOpen(false)} title="Generate Monthly Payments"
          footer={<><Button variant="secondary" onClick={() => setGenOpen(false)}>Cancel</Button><Button onClick={handleGeneratePayments} disabled={saving}>{saving ? 'Generating...' : 'Generate'}</Button></>}>
          <p className="text-text-3 text-sm mb-4">Creates pending payment records for all active leases in the selected month.</p>
          <div>
            <label className="block text-xs font-semibold text-[#9898b0] uppercase tracking-wide mb-1.5">Month</label>
            <input type="month" value={genMonth} onChange={e => setGenMonth(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3.5 py-2.5 text-text-1 text-sm focus:outline-none focus:border-[#6c63ff]" />
          </div>
        </Modal>
      </Layout>
    </>
  );
}
