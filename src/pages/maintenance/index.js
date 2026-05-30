import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/layout/Layout';
import { Card, Badge, Button, Modal, Select, Input, Textarea, EmptyState, Spinner, fmt, apiFetch, toast } from '../../components/ui';
import { useAuth } from '../_app';
import Head from 'next/head';

export default function MaintenancePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: 'electricity', title: '', description: '', priority: 'medium' });

  const isTenant = user?.role === 'tenant';
  const isCaretaker = user?.role === 'caretaker';
  const isAdmin = user?.role === 'superadmin';

  useEffect(() => { loadRequests(); }, []);

  async function loadRequests() {
    setLoading(true);
    try {
      const endpoint = isAdmin ? '/api/admin/maintenance'
        : isTenant ? '/api/tenant/maintenance'
        : isCaretaker ? '/api/caretaker/maintenance'
        : '/api/owner/maintenance';
      setRequests(await apiFetch(endpoint));
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  async function handleSubmitRequest() {
    if (!form.title || !form.description) return toast.error('Title and description are required');
    setSaving(true);
    try {
      await apiFetch('/api/tenant/maintenance', { method: 'POST', body: form });
      toast.success('Request submitted! Your landlord will be notified.');
      setNewOpen(false);
      setForm({ type: 'electricity', title: '', description: '', priority: 'medium' });
      loadRequests();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  const open = requests.filter(r => r.status !== 'completed').length;

  return (
    <>
      <Head><title>PropSync — Maintenance</title></Head>
      <Layout title="Maintenance">
        <div className="animate-up space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold">Maintenance Requests</h2>
              <p className="text-text-3 text-sm">{open} open · {requests.length} total</p>
            </div>
            {isTenant && (
              <Button onClick={() => setNewOpen(true)}>
                <span>+</span> New Request
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          ) : (
            <div className="space-y-3">
              {requests.map(r => (
                <div key={r.id}
                  onClick={() => router.push(`/maintenance/${r.id}`)}
                  className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-border-strong transition-all hover:-translate-y-0.5">
                  <div className="flex items-start gap-4">
                    <span className="text-2xl mt-0.5">{fmt.mrIcon(r.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-display font-bold">{r.title}</span>
                        <Badge status={r.priority} />
                        <Badge status={r.status} />
                      </div>
                      <p className="text-text-3 text-sm truncate">{r.description}</p>
                      <div className="flex gap-4 mt-2 text-xs text-text-3">
                        {!isTenant && <span>👤 {r.tenant_name} · {r.unit_number}</span>}
                        {!isTenant && r.property_name && <span>🏢 {r.property_name}</span>}
                        <span>⏱ {fmt.timeAgo(r.created_at)}</span>
                        {r.assigned_technician && <span>👷 {r.assigned_technician}</span>}
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-text-3 flex-shrink-0 mt-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                </div>
              ))}
              {!requests.length && (
                <Card>
                  <EmptyState icon="🔧" title="No maintenance requests"
                    description={isTenant ? "Submit a request if something needs fixing in your unit" : "No requests from tenants yet"}
                    action={isTenant ? <Button onClick={() => setNewOpen(true)}>Submit Request</Button> : null}
                  />
                </Card>
              )}
            </div>
          )}
        </div>

        {/* New Request Modal */}
        <Modal open={newOpen} onClose={() => setNewOpen(false)} title="New Maintenance Request"
          footer={<><Button variant="secondary" onClick={() => setNewOpen(false)}>Cancel</Button><Button onClick={handleSubmitRequest} disabled={saving}>{saving ? 'Submitting...' : 'Submit Request'}</Button></>}>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Type *" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="electricity">⚡ Electricity</option>
              <option value="plumbing">🔧 Plumbing</option>
              <option value="painting">🎨 Painting</option>
              <option value="ac_cooling">❄️ AC / Cooling</option>
              <option value="other">🔩 Other</option>
            </Select>
            <Select label="Priority *" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
          </div>
          <Input label="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Power outlet sparking in bedroom" />
          <Textarea label="Description *" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the issue in detail..." />
        </Modal>
      </Layout>
    </>
  );
}
