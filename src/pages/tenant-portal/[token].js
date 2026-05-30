import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { ThemeProvider } from '../../context/ThemeContext';
import { Badge, Button, Select, Input, Textarea, Spinner, fmt, FeaturePill } from '../../components/ui';

const MR_TYPES = [
  { value: 'electricity', label: 'Electricity' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'painting', label: 'Painting' },
  { value: 'ac_cooling', label: 'AC / Cooling' },
  { value: 'other', label: 'Other' },
];

export default function TenantPortalPage() {
  const router = useRouter();
  const { token } = router.query;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ type: 'plumbing', title: '', description: '', priority: 'medium' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    fetch(`/api/public/unit?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Unit not found');
        setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/maintenance?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to submit');
      setSubmitted(true);
      setForm({ type: 'plumbing', title: '', description: '', priority: 'medium' });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ThemeProvider>
      <Head>
        <title>PropSync — Unit Portal</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="robots" content="noindex" />
      </Head>

      <div className="min-h-screen surface-page px-4 py-6 pb-10">
        <div className="max-w-lg mx-auto space-y-4 animate-up">
          <header className="text-center mb-2">
            <div className="font-display text-[28px] text-text-1">
              Prop<span className="text-accent">Sync</span>
            </div>
            {data && (
              <>
                <h1 className="font-display text-[22px] text-text-1 mt-3">Unit {data.unit.unit_number}</h1>
                <p className="text-[14px] text-text-2">{data.property.name} · {data.property.district}</p>
              </>
            )}
          </header>

          {loading && (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          )}

          {error && !loading && (
            <div className="surface-card text-center py-10">
              <p className="text-status-red text-[14px]">{error}</p>
            </div>
          )}

          {data && !loading && (
            <>
              <section className="surface-card">
                <p className="label-ui mb-2">Current tenant</p>
                {data.tenant ? (
                  <p className="text-[15px] font-semibold text-text-1">{data.tenant.full_name}</p>
                ) : (
                  <p className="text-[14px] text-text-3">No tenant assigned</p>
                )}
              </section>

              <section className="surface-card">
                <p className="label-ui mb-3">Unit details</p>
                <div className="flex flex-wrap gap-2">
                  <FeaturePill icon="🛏" variant="bedroom">{data.unit.bedrooms} bed{data.unit.bedrooms !== 1 ? 's' : ''}</FeaturePill>
                  <FeaturePill icon="🚿" variant="bath">{data.unit.toilets} bath</FeaturePill>
                  <FeaturePill icon="🍳" variant={data.unit.has_kitchen ? 'kitchen' : 'off'}>
                    {data.unit.has_kitchen ? 'Kitchen' : 'No kitchen'}
                  </FeaturePill>
                  <FeaturePill icon="🪑" variant={data.unit.is_furnished ? 'furnished' : 'off'}>
                    {data.unit.is_furnished ? 'Furnished' : 'Unfurnished'}
                  </FeaturePill>
                  <FeaturePill variant="neutral">Floor {data.unit.floor}</FeaturePill>
                </div>
                <p className="text-[13px] text-text-3 mt-3">{data.property.address}</p>
              </section>

              <section className="surface-card">
                <p className="label-ui mb-2">This month — {fmt.month(data.currentMonth)}</p>
                {data.tenant && data.currentPayment ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-display text-[28px] text-accent">{fmt.usd(data.currentPayment.amount_usd)}</span>
                    <Badge status={data.currentPayment.status} />
                  </div>
                ) : data.tenant ? (
                  <p className="text-[14px] text-text-3">No payment record for this month</p>
                ) : (
                  <p className="text-[14px] text-text-3">—</p>
                )}
              </section>

              {data.paymentHistory?.length > 0 && (
                <section className="surface-card overflow-x-auto">
                  <p className="label-ui mb-3">Payment history</p>
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b-[0.5px] border-border">
                        <th className="text-left py-2 label-ui">Month</th>
                        <th className="text-left py-2 label-ui">Amount</th>
                        <th className="text-left py-2 label-ui">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.paymentHistory.map((p, i) => (
                        <tr key={i} className="border-b-[0.5px] border-border">
                          <td className="py-2 text-text-1">{fmt.month(p.payment_month)}</td>
                          <td className="py-2 font-semibold text-text-1">{fmt.usd(p.amount_usd)}</td>
                          <td className="py-2"><Badge status={p.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}

              <section className="surface-card">
                <p className="label-ui mb-3">Submit maintenance request</p>
                {submitted ? (
                  <div className="text-center py-6">
                    <div className="text-3xl mb-2">✓</div>
                    <p className="text-[15px] font-semibold text-status-green">Request submitted successfully</p>
                    <p className="text-[13px] text-text-3 mt-2">Your landlord will be notified.</p>
                    <Button variant="ghost" className="mt-4" onClick={() => setSubmitted(false)}>Submit another</Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-1">
                    <Select label="Type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                      {MR_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </Select>
                    <Input
                      label="Title"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Brief summary"
                    />
                    <Textarea
                      label="Description"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Describe the issue..."
                      rows={4}
                    />
                    <Select label="Priority" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </Select>
                    <Button type="submit" disabled={submitting || !data.tenant} className="w-full justify-center mt-2">
                      {submitting ? 'Submitting...' : 'Submit request'}
                    </Button>
                    {!data.tenant && (
                      <p className="text-[12px] text-text-3 text-center mt-2">Maintenance requests require an assigned tenant.</p>
                    )}
                  </form>
                )}
              </section>
            </>
          )}

          <p className="text-center text-[11px] text-text-3 uppercase tracking-wide pt-4">
            Powered by PropSync
          </p>
        </div>
      </div>
    </ThemeProvider>
  );
}
