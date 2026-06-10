import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import { Card, Button, Modal, Select, Input, Textarea, Spinner, fmt, apiFetch, toast, StatCard } from '../components/ui';
import { useTranslation } from '../context/LanguageContext';
import Head from 'next/head';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

const CATEGORIES = [
  { value: 'generator_fuel', label: 'Generator fuel' },
  { value: 'security', label: 'Security' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'repair', label: 'Repair' },
  { value: 'water', label: 'Water' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'maintenance_parts', label: 'Maintenance parts' },
  { value: 'staff_salary', label: 'Staff salary' },
  { value: 'other', label: 'Other' },
];

export default function ExpensesPage() {
  const t = useTranslation();
  const [data, setData] = useState({ expenses: [], summary: {} });
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(fmt.currentMonth());
  const [propertyId, setPropertyId] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category: 'other', description: '', amount_usd: '', expense_date: new Date().toISOString().slice(0, 10),
    property_id: '', unit_id: '', receipt_note: '',
  });

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({ month });
      if (propertyId) params.set('property_id', propertyId);
      setData(await apiFetch(`/api/owner/expenses?${params}`));
    } catch (e) { if (!silent) toast.error(e.message); }
    finally { if (!silent) setLoading(false); }
  }, [month, propertyId]);

  useAutoRefresh((silent) => load(silent), [load]);
  useEffect(() => {
    apiFetch('/api/owner/properties').then(setProperties).catch(() => {});
  }, []);

  async function handleAdd() {
    if (!form.description || !form.amount_usd) return toast.error('Description and amount required');
    setSaving(true);
    try {
      await apiFetch('/api/owner/expenses', { method: 'POST', body: form });
      toast.success('Expense added');
      setOpen(false);
      load();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  const { summary } = data;
  const net = summary.netProfit ?? 0;

  return (
    <>
      <Head><title>PropSync — {t.expenses}</title></Head>
      <Layout title={t.expenses}>
        <div className="animate-up space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="font-display text-2xl font-bold">{t.expenses}</h2>
            <Button onClick={() => setOpen(true)}>+ Add expense</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard size="sm" label={t.totalCollected} value={fmt.usd(summary.collected)} color="green" />
            <StatCard size="sm" label={t.expenses} value={fmt.usd(summary.totalExpenses)} color="amber" />
            <StatCard size="sm" label={t.netProfit} value={fmt.usd(net)} color={net >= 0 ? 'green' : 'red'} />
          </div>
          {summary.collected > 0 && (
            <Card>
              <p className="label-ui mb-2">Income vs expenses</p>
              <div className="h-4 rounded-full bg-surface overflow-hidden flex">
                <div className="bg-status-green h-full" style={{ width: `${Math.min(100, (summary.collected / (summary.collected + summary.totalExpenses || 1)) * 100)}%` }} />
                <div className="bg-status-amber h-full flex-1" />
              </div>
            </Card>
          )}
          <div className="flex gap-3 flex-wrap">
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="bg-input border border-border rounded-sm px-3 py-2 text-sm" />
            <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className="bg-input border border-border rounded-sm px-3 py-2 text-sm">
              <option value="">All properties</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <Card className="p-0 overflow-hidden">
            {loading ? <div className="py-16 flex justify-center"><Spinner /></div> : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface">
                    {['Date', 'Category', 'Description', 'Amount', ''].map((h) => (
                      <th key={h} className="text-left px-4 py-2 text-xs text-text-3 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.expenses.map((e) => (
                    <tr key={e.id} className="border-b border-border/50">
                      <td className="px-4 py-2">{fmt.date(e.expense_date)}</td>
                      <td className="px-4 py-2">{e.category}</td>
                      <td className="px-4 py-2">{e.description}</td>
                      <td className="px-4 py-2 font-semibold">{fmt.usd(e.amount_usd)}</td>
                      <td className="px-4 py-2">
                        <Button size="xs" variant="danger" onClick={async () => {
                          await apiFetch(`/api/owner/expenses?id=${e.id}`, { method: 'DELETE' });
                          load();
                        }}>{t.delete}</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
        <Modal open={open} onClose={() => setOpen(false)} title="Add expense"
          footer={<><Button variant="secondary" onClick={() => setOpen(false)}>{t.cancel}</Button><Button onClick={handleAdd} disabled={saving}>{t.save}</Button></>}>
          <Select label="Category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
          <Input label={t.description} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <Input label={t.amount} type="number" value={form.amount_usd} onChange={(e) => setForm((f) => ({ ...f, amount_usd: e.target.value }))} />
          <Input label={t.date} type="date" value={form.expense_date} onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))} />
          <Select label={t.property} value={form.property_id} onChange={(e) => setForm((f) => ({ ...f, property_id: e.target.value }))}>
            <option value="">—</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Textarea label={t.notes} value={form.receipt_note} onChange={(e) => setForm((f) => ({ ...f, receipt_note: e.target.value }))} />
        </Modal>
      </Layout>
    </>
  );
}
