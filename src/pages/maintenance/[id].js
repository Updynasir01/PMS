import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/layout/Layout';
import { Card, Badge, Button, Select, Input, Spinner, fmt, apiFetch, toast } from '../../components/ui';
import { generateWhatsAppLink, maintenanceContactMessage } from '../../lib/whatsapp';
import { useAuth } from '../_app';
import { useMaintenanceChatPoll } from '../../hooks/useMaintenanceChatPoll';
import Head from 'next/head';

export default function MaintenanceDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [updateForm, setUpdateForm] = useState({ status: '', assigned_technician: '' });
  const [updating, setUpdating] = useState(false);
  const [technicians, setTechnicians] = useState([]);
  const [waMessage, setWaMessage] = useState('');

  const isTenant = user?.role === 'tenant';
  const isCaretaker = user?.role === 'caretaker';
  const isAdmin = user?.role === 'superadmin';
  const canManage = !isTenant;

  const detailEndpoint = id
    ? (isTenant ? `/api/tenant/maintenance-detail?id=${id}`
      : isCaretaker ? `/api/caretaker/maintenance-detail?id=${id}`
      : `/api/owner/maintenance-detail?id=${id}`)
    : null;

  const fetchDetail = useCallback(async () => {
    if (!detailEndpoint) return null;
    return apiFetch(detailEndpoint);
  }, [detailEndpoint]);

  const { chatRef, scrollToBottom, pollNow } = useMaintenanceChatPoll({
    enabled: !!id && !!data && !loading,
    fetchDetail,
    onUpdate: (d) => {
      setData(d);
      setUpdateForm((f) => ({
        status: d.status,
        assigned_technician: d.assigned_technician || f.assigned_technician,
      }));
    },
  });

  useEffect(() => {
    if (canManage && data?.type) {
      apiFetch(`/api/owner/technicians?specialty=${data.type}`)
        .then(setTechnicians)
        .catch(() => setTechnicians([]));
    }
  }, [canManage, data?.type]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const d = await fetchDetail();
        if (cancelled) return;
        setData(d);
        setUpdateForm({ status: d.status, assigned_technician: d.assigned_technician || '' });
        requestAnimationFrame(() => scrollToBottom(true));
      } catch (e) {
        if (!cancelled) {
          toast.error(e.message);
          router.push('/maintenance');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, fetchDetail, router, scrollToBottom]);

  async function handleSendMessage() {
    if (!message.trim()) return;
    setSending(true);
    try {
      const endpoint = isTenant ? '/api/tenant/maintenance-message'
        : isCaretaker ? '/api/caretaker/maintenance-message'
        : '/api/owner/maintenance-message';
      await apiFetch(endpoint, { method: 'POST', body: { request_id: id, message: message.trim() } });
      setMessage('');
      await pollNow();
      scrollToBottom(true);
    } catch (e) { toast.error(e.message); }
    finally { setSending(false); }
  }

  async function handleUpdate() {
    setUpdating(true);
    try {
      const patchUrl = isCaretaker ? '/api/caretaker/maintenance' : '/api/owner/maintenance';
      await apiFetch(patchUrl, { method: 'PATCH', body: { id, ...updateForm } });
      toast.success('Request updated!');
      await pollNow();
    } catch (e) { toast.error(e.message); }
    finally { setUpdating(false); }
  }

  if (loading) return (
    <Layout title="Maintenance">
      <div className="flex justify-center py-20"><Spinner size="lg" /></div>
    </Layout>
  );

  if (!data) return null;

  return (
    <>
      <Head><title>PropSync — {data.title}</title></Head>
      <Layout title="Maintenance Detail">
        <div className="animate-up">
          {/* Back */}
          <button onClick={() => router.push('/maintenance')}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 mb-6 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
            Back to Requests
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Request Info */}
            <div className="space-y-4">
              <Card>
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-4xl">{fmt.mrIcon(data.type)}</span>
                  <div>
                    <h2 className="font-display text-xl font-bold">{data.title}</h2>
                    <div className="flex gap-2 mt-1">
                      <Badge status={data.priority} />
                      <Badge status={data.status} />
                    </div>
                  </div>
                </div>

                <div className="bg-surface rounded-sm p-4 mb-4 border-[0.5px] border-border">
                  <p className="text-text-1 text-[14px] leading-relaxed">{data.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between col-span-2">
                    <span className="text-zinc-600">Type</span>
                    <span className="font-medium">{fmt.mrType(data.type)}</span>
                  </div>
                  {!isTenant && (
                    <>
                      <div className="flex justify-between col-span-2">
                        <span className="text-zinc-600">Tenant</span>
                        <span className="font-medium">{data.tenant_name}</span>
                      </div>
                      <div className="flex justify-between col-span-2">
                        <span className="text-zinc-600">Unit</span>
                        <span className="font-medium">{data.unit_number} · {data.property_name}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between col-span-2">
                    <span className="text-zinc-600">Submitted</span>
                    <span className="font-medium">{fmt.date(data.created_at)}</span>
                  </div>
                  {data.assigned_technician && (
                    <div className="flex justify-between col-span-2">
                      <span className="text-zinc-600">Technician</span>
                      <span className="font-medium">👷 {data.assigned_technician}</span>
                    </div>
                  )}
                </div>

                {/* Status indicators */}
                {data.status === 'in_progress' && (
                  <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/20 rounded-lg text-blue-400 text-xs">
                    🔨 Your request is being worked on. Message your landlord for updates.
                  </div>
                )}
                {data.status === 'completed' && (
                  <div className="mt-4 p-3 bg-green-900/20 border border-green-500/20 rounded-lg text-green-400 text-xs">
                    ✅ This request has been completed. Submit a new request if the issue persists.
                  </div>
                )}
              </Card>

              {/* Update Panel — owner/admin only */}
              {canManage && (
                <Card>
                  <h3 className="font-display font-bold mb-4">Update Request</h3>
                  <Select label="Status" value={updateForm.status} onChange={e => setUpdateForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </Select>
                  {technicians.length > 0 && (
                    <Select label="Technician directory" value="" onChange={(e) => {
                      const tech = technicians.find((x) => String(x.id) === e.target.value);
                      if (tech) setUpdateForm((f) => ({ ...f, assigned_technician: tech.name }));
                    }}>
                      <option value="">— Pick from directory —</option>
                      {technicians.map((tech) => (
                        <option key={tech.id} value={tech.id}>{tech.name} ({tech.phone})</option>
                      ))}
                    </Select>
                  )}
                  <Input label="Assign Technician" value={updateForm.assigned_technician}
                    onChange={e => setUpdateForm(f => ({ ...f, assigned_technician: e.target.value }))}
                    placeholder="e.g. Ahmed Electrician" />
                  <Button onClick={handleUpdate} disabled={updating} className="w-full justify-center">
                    {updating ? 'Updating...' : 'Update Status'}
                  </Button>
                  {data.tenant_phone && (
                    <>
                      <Input label="WhatsApp message" value={waMessage} onChange={(e) => setWaMessage(e.target.value)} className="mt-4" />
                      <a className="block mt-2" href={generateWhatsAppLink(data.tenant_phone, maintenanceContactMessage({
                        tenantName: data.tenant_name,
                        title: data.title,
                        customMessage: waMessage,
                      })) || '#'} target="_blank" rel="noreferrer">
                        <Button variant="ghost" className="w-full justify-center">Contact via WhatsApp</Button>
                      </a>
                    </>
                  )}
                </Card>
              )}
            </div>

            {/* Chat Thread */}
            <Card className="flex flex-col h-[600px]">
              <h3 className="font-display font-bold mb-4">
                {isTenant ? 'Messages with Landlord' : 'Messages'}
              </h3>

              {/* Messages */}
              <div ref={chatRef} className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 rounded-lg bg-page border-[0.5px] border-border p-3">
                {data.messages.length ? data.messages.map(m => {
                  const isMe = m.sender_id === user?.id || (isTenant && m.sender_role === 'tenant') || (!isTenant && m.sender_role !== 'tenant');
                  const avatarClass =
                    m.sender_role === 'tenant' ? 'bg-status-blue-dim text-status-blue'
                    : m.sender_role === 'superadmin' ? 'bg-status-amber-dim text-status-amber'
                    : 'bg-accent-dim text-accent';
                  return (
                    <div key={m.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 border-[0.5px] border-border ${avatarClass}`}>
                        {fmt.initials(m.full_name)}
                      </div>
                      <div className="max-w-[75%]">
                        <div className={`rounded-lg px-3.5 py-2.5 text-[14px] leading-relaxed border-[0.5px] ${isMe
                          ? 'bg-accent text-white border-accent/30'
                          : 'bg-surface text-text-1 border-border'}`}>
                          {m.message}
                        </div>
                        <div className={`text-[11px] text-text-3 mt-1.5 ${isMe ? 'text-right' : ''}`}>
                          {isMe ? 'You' : m.full_name} · {fmt.timeAgo(m.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-text-3">
                      <div className="text-3xl mb-2">💬</div>
                      <div className="text-[14px]">No messages yet</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              {(data.status !== 'completed' || !isTenant) && (
                <div className="border-t-[0.5px] border-border pt-4">
                  <div className="flex gap-2">
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                      placeholder="Type a message... (Enter to send)"
                      rows={2}
                      className="flex-1 bg-input border-[0.5px] border-border rounded-sm px-3 py-2 text-[14px] text-text-1 resize-none focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-dim transition-all duration-200"
                    />
                    <Button onClick={handleSendMessage} disabled={sending || !message.trim()} className="self-end">
                      {sending ? '...' : 'Send'}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </Layout>
    </>
  );
}
