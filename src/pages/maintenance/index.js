import { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/layout/Layout';
import { Card, Badge, Button, Modal, Select, Input, Textarea, EmptyState, Spinner, fmt, apiFetch, toast, IconBox, PageHeader } from '../../components/ui';
import {
  MrTypeIcon, IconPlus, IconUser, IconBuilding, IconClock, IconWorker, IconWrench,
} from '../../components/Icons';
import { useAuth } from '../_app';
import Head from 'next/head';
import { useAutoRefresh, dispatchLiveRefresh } from '../../hooks/useAutoRefresh';

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

  const loadRequests = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const endpoint = isAdmin ? '/api/admin/maintenance'
        : isTenant ? '/api/tenant/maintenance'
        : isCaretaker ? '/api/caretaker/maintenance'
        : '/api/owner/maintenance';
      setRequests(await apiFetch(endpoint));
    } catch (e) { if (!silent) toast.error(e.message); }
    finally { if (!silent) setLoading(false); }
  }, [isAdmin, isTenant, isCaretaker]);

  useAutoRefresh((silent) => loadRequests(silent), [loadRequests]);

  async function handleSubmitRequest() {
    if (!form.title || !form.description) return toast.error('Title and description are required');
    setSaving(true);
    try {
      await apiFetch('/api/tenant/maintenance', { method: 'POST', body: form });
      toast.success('Request submitted! Your landlord will be notified.');
      setNewOpen(false);
      setForm({ type: 'electricity', title: '', description: '', priority: 'medium' });
      loadRequests();
      dispatchLiveRefresh();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  const open = requests.filter(r => r.status !== 'completed').length;

  return (
    <>
      <Head><title>eNuzul — Maintenance</title></Head>
      <Layout title="Maintenance">
        <div className="animate-up space-y-6">
          <PageHeader
            title="Maintenance"
            subtitle={`${open} open · ${requests.length} total`}
            action={
              isTenant ? (
                <Button onClick={() => setNewOpen(true)}>
                  <IconPlus size={16} /> New Request
                </Button>
              ) : null
            }
          />

          {loading ? (
            <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          ) : (
            <div className="space-y-2">
              {requests.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => router.push(`/maintenance/${r.id}`)}
                  className="w-full text-left rounded-sm border-[0.5px] border-border bg-card p-4 cursor-pointer hover:border-accent/30 hover:bg-surface transition-all duration-200"
                >
                  <div className="flex items-start gap-4">
                    <IconBox tint="purple" className="!w-10 !h-10 shrink-0">
                      <MrTypeIcon type={r.type} size={18} />
                    </IconBox>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-display text-[17px] text-text-1">{r.title}</span>
                        <Badge status={r.priority} compact />
                        <Badge status={r.status} compact />
                      </div>
                      <p className="text-text-3 text-[13px] truncate">{r.description}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-[12px] text-text-3">
                        {!isTenant && (
                          <span className="inline-flex items-center gap-1">
                            <IconUser size={12} className="opacity-60" />
                            {r.tenant_name} · {r.unit_number}
                          </span>
                        )}
                        {!isTenant && r.property_name && (
                          <span className="inline-flex items-center gap-1">
                            <IconBuilding size={12} className="opacity-60" />
                            {r.property_name}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <IconClock size={12} className="opacity-60" />
                          {fmt.timeAgo(r.created_at)}
                        </span>
                        {r.assigned_technician && (
                          <span className="inline-flex items-center gap-1">
                            <IconWorker size={12} className="opacity-60" />
                            {r.assigned_technician}
                          </span>
                        )}
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-text-3 flex-shrink-0 mt-2 opacity-50" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                </button>
              ))}
              {!requests.length && (
                <div className="rounded-sm border-[0.5px] border-border bg-card p-6">
                  <EmptyState
                    icon={<IconWrench size={22} />}
                    title="No maintenance requests"
                    description={isTenant ? 'Submit a request if something needs fixing in your unit' : 'No requests from tenants yet'}
                    action={isTenant ? <Button onClick={() => setNewOpen(true)}>Submit Request</Button> : null}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <Modal open={newOpen} onClose={() => setNewOpen(false)} title="New Maintenance Request"
          footer={<><Button variant="secondary" onClick={() => setNewOpen(false)}>Cancel</Button><Button onClick={handleSubmitRequest} disabled={saving}>{saving ? 'Submitting...' : 'Submit Request'}</Button></>}>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Type *" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="electricity">Electricity</option>
              <option value="plumbing">Plumbing</option>
              <option value="painting">Painting</option>
              <option value="ac_cooling">AC / Cooling</option>
              <option value="other">Other</option>
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
