import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { Card, Badge, Button, Modal, Input, EmptyState, Spinner, Avatar, fmt, apiFetch, toast } from '../components/ui';
import { useAuth } from './_app';
import Head from 'next/head';

export default function OwnersPage() {
  const { user } = useAuth();
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ username:'', password:'', full_name:'', phone:'', email:'', company_name:'', address:'' });

  useEffect(() => { loadOwners(); }, []);

  async function loadOwners() {
    setLoading(true);
    try { setOwners(await apiFetch('/api/admin/owners')); }
    catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  async function handleCreate() {
    if (!form.username || !form.password || !form.full_name) return toast.error('Username, password and name are required');
    setSaving(true);
    try {
      await apiFetch('/api/admin/owners', { method: 'POST', body: form });
      toast.success(`${form.full_name} created! They can log in with @${form.username}`);
      setAddOpen(false);
      setForm({ username:'', password:'', full_name:'', phone:'', email:'', company_name:'', address:'' });
      loadOwners();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function handleToggle(id, isActive) {
    try {
      await apiFetch('/api/admin/owners-toggle', { method: 'PATCH', body: { id } });
      toast.success(isActive ? 'Owner disabled' : 'Owner enabled');
      loadOwners();
    } catch (e) { toast.error(e.message); }
  }

  return (
    <>
      <Head><title>PropSync — Owners</title></Head>
      <Layout title="Property Owners">
        <div className="animate-up space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold">Property Owners</h2>
              <p className="text-text-3 text-sm">{owners.length} registered owners</p>
            </div>
            <Button onClick={() => setAddOpen(true)}><span>+</span> Add Owner</Button>
          </div>

          {loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : (
            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface">
                      {['Owner','Company','Contact','Properties','Units','Status','Actions'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs text-text-3 font-semibold uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {owners.map(o => (
                      <tr key={o.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={o.full_name} size="sm" />
                            <div>
                              <div className="font-semibold">{o.full_name}</div>
                              <div className="text-xs text-text-3">@{o.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-text-2">{o.company_name || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="text-sm">{o.phone || '—'}</div>
                          <div className="text-xs text-text-3">{o.email || ''}</div>
                        </td>
                        <td className="px-4 py-3 font-bold">{o.property_count}</td>
                        <td className="px-4 py-3 font-bold">{o.unit_count}</td>
                        <td className="px-4 py-3">
                          <Badge status={o.is_active ? 'occupied' : 'overdue'} />
                        </td>
                        <td className="px-4 py-3">
                          <Button size="xs" variant={o.is_active ? 'danger' : 'success'}
                            onClick={() => handleToggle(o.id, o.is_active)}>
                            {o.is_active ? 'Disable' : 'Enable'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {!owners.length && (
                      <tr><td colSpan="7" className="text-center py-12 text-text-3">No owners yet. Add the first one.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Property Owner" large
          footer={<><Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving}>{saving ? 'Creating...' : 'Create Owner'}</Button></>}>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name *" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Abdirahman Hassan" />
            <Input label="Username *" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="abdirahman" autoComplete="off" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Password *" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 characters" autoComplete="new-password" />
            <Input label="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+252615..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="owner@email.com" />
            <Input label="Company Name" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Hassan Properties" />
          </div>
          <Input label="Address / Location" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="KM4, Mogadishu or London, UK (diaspora)" />
        </Modal>
      </Layout>
    </>
  );
}
