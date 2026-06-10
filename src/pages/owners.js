import { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import {
  Card, Button, Modal, Input, Select, Spinner, Avatar,
  fmt, apiFetch, toast, PlanBadge, PlanStatusBadge,
} from '../components/ui';
import { PLANS, PLAN_KEYS, TRIAL_OPTIONS, getPlan, formatUnitsUsed, computeTrialEnd } from '../lib/plans';
import { validateEmailField } from '../lib/validateEmail';
import Head from 'next/head';
import { useAutoRefresh, dispatchLiveRefresh } from '../hooks/useAutoRefresh';

const defaultForm = {
  username: '', password: '', full_name: '', phone: '', email: '',
  company_name: '', address: '', plan: 'starter', trial_days: 60,
};

function formatRenewalDate(o) {
  if (o.plan_status === 'trial' && o.trial_end) {
    return `Trial ends ${fmt.date(o.trial_end)}`;
  }
  if (o.paid_until) return `Paid until ${fmt.date(o.paid_until)}`;
  if (o.trial_end) return `Trial ends ${fmt.date(o.trial_end)}`;
  return '—';
}

function formatRenewalShort(o) {
  const d = o.plan_status === 'trial' ? o.trial_end : (o.paid_until || o.trial_end);
  if (!d) return '—';
  const label = o.plan_status === 'trial' ? 'Trial' : 'Paid';
  return `${label} · ${fmt.date(d)}`;
}

export default function OwnersPage() {
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [manageOwner, setManageOwner] = useState(null);
  const [saving, setSaving] = useState(false);
  const [planAction, setPlanAction] = useState(null);
  const [changePlan, setChangePlan] = useState('starter');
  const [extendDays, setExtendDays] = useState(30);
  const [form, setForm] = useState(defaultForm);
  const [emailError, setEmailError] = useState('');

  const selectedPlan = useMemo(() => getPlan(form.plan), [form.plan]);
  const trialEndPreview = useMemo(() => {
    if (!Number(form.trial_days)) return null;
    return computeTrialEnd(Number(form.trial_days));
  }, [form.trial_days]);

  const loadOwners = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try { setOwners(await apiFetch('/api/admin/owners')); }
    catch (e) { if (!silent) toast.error(e.message); }
    finally { if (!silent) setLoading(false); }
  }, []);

  useAutoRefresh((silent) => loadOwners(silent), [loadOwners]);

  function validateOwnerForm() {
    if (!form.username || !form.password || !form.full_name) {
      toast.error('Username, password and name are required');
      return false;
    }
    const emailCheck = validateEmailField(form.email, { required: true });
    if (!emailCheck.ok) {
      setEmailError(emailCheck.error);
      toast.error(emailCheck.error);
      return false;
    }
    setEmailError('');
    return true;
  }

  async function handleCreate() {
    if (!validateOwnerForm()) return;
    setSaving(true);
    try {
      await apiFetch('/api/admin/owners', { method: 'POST', body: form });
      toast.success(`${form.full_name} created! They can log in with @${form.username}`);
      setAddOpen(false);
      setForm(defaultForm);
      loadOwners();
      dispatchLiveRefresh();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function handleToggle(id, isActive) {
    try {
      await apiFetch('/api/admin/owners-toggle', { method: 'PATCH', body: { id } });
      toast.success(isActive ? 'Owner disabled' : 'Owner enabled');
      loadOwners();
      dispatchLiveRefresh();
    } catch (e) { toast.error(e.message); }
  }

  async function runPlanAction(action, extra = {}) {
    if (!manageOwner) return;
    setPlanAction(action);
    try {
      const res = await apiFetch('/api/admin/owners-plan', {
        method: 'PATCH',
        body: { id: manageOwner.id, action, ...extra },
      });
      setManageOwner(res.owner);
      loadOwners();
      dispatchLiveRefresh();
      toast.success('Owner subscription updated');
    } catch (e) { toast.error(e.message); }
    finally { setPlanAction(null); }
  }

  function openManage(o) {
    setManageOwner(o);
    setChangePlan(o.plan || 'starter');
    setExtendDays(30);
  }

  return (
    <>
      <Head><title>PropSync — Owners</title></Head>
      <Layout title="Property Owners">
        <div className="animate-up space-y-6 min-w-0 max-w-full">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold">Property Owners</h2>
              <p className="text-text-3 text-sm">{owners.length} registered owners</p>
            </div>
            <Button onClick={() => { setAddOpen(true); setEmailError(''); }}><span>+</span> Add Owner</Button>
          </div>

          {loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : (
            <Card className="p-0 overflow-hidden">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col className="w-[32%]" />
                  <col className="w-[22%]" />
                  <col className="w-[10%]" />
                  <col className="w-[20%]" />
                  <col className="w-[16%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border bg-surface">
                    {['Owner', 'Subscription', 'Units', 'Renewal', ''].map(h => (
                      <th key={h || 'actions'} className="text-left px-3 py-2 text-[10px] text-text-3 font-semibold uppercase tracking-wide">
                        {h || <span className="sr-only">Actions</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {owners.map(o => (
                    <tr key={o.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                      <td className="px-3 py-2.5 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar name={o.full_name} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-[13px] truncate">{o.full_name}</div>
                            <div className="text-[11px] text-text-3 truncate">
                              @{o.username}
                              {o.company_name ? ` · ${o.company_name}` : ''}
                            </div>
                            <div className="text-[11px] text-text-3 truncate" title={o.email || o.phone}>
                              {o.phone || o.email || '—'}
                            </div>
                          </div>
                          <span
                            className={`shrink-0 w-2 h-2 rounded-full ${o.is_active ? 'bg-status-green' : 'bg-status-red'}`}
                            title={o.is_active ? 'Login enabled' : 'Login disabled'}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap items-center gap-1">
                          <PlanBadge plan={o.plan} compact />
                          <PlanStatusBadge status={o.plan_status} compact />
                        </div>
                        <div className="text-[10px] text-text-3 mt-0.5">${Number(o.monthly_fee || 0).toFixed(0)}/mo</div>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-[13px] tabular-nums">
                        {formatUnitsUsed(Number(o.unit_count) || 0, o.max_units)}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-text-2 leading-snug">
                        {formatRenewalShort(o)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="xs" variant="secondary" className="!px-2 !py-1 !text-[11px]" onClick={() => openManage(o)}>Manage</Button>
                          <Button size="xs" variant={o.is_active ? 'danger' : 'success'} className="!px-2 !py-1 !text-[11px]"
                            onClick={() => handleToggle(o.id, o.is_active)}>
                            {o.is_active ? 'Off' : 'On'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!owners.length && (
                    <tr><td colSpan="5" className="text-center py-12 text-text-3">No owners yet. Add the first one.</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
          )}
        </div>

        {/* Add Owner */}
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
            <div>
              <Input
                label="Email *"
                id="owner-email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={e => {
                  const v = e.target.value;
                  setForm(f => ({ ...f, email: v }));
                  if (emailError) {
                    const check = validateEmailField(v, { required: true });
                    setEmailError(check.ok ? '' : check.error);
                  }
                }}
                onBlur={() => {
                  const check = validateEmailField(form.email, { required: true });
                  setEmailError(check.ok ? '' : check.error);
                }}
                placeholder="owner@example.com"
                className={emailError ? '[&_input]:border-status-red [&_input]:focus:border-status-red' : ''}
              />
              {emailError && (
                <p className="text-status-red text-[12px] -mt-3 mb-2">{emailError}</p>
              )}
            </div>
            <Input label="Company Name" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Hassan Properties" />
          </div>
          <Input label="Address / Location" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="KM4, Mogadishu" />

          <div className="border-t border-border mt-4 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-3 mb-3">Subscription</p>
            <div className="grid grid-cols-2 gap-4">
              <Select label="Plan *" value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}>
                {PLAN_KEYS.map(key => {
                  const p = PLANS[key];
                  return (
                    <option key={key} value={key}>
                      {p.label} — {p.max_units >= 999999 ? 'Unlimited' : p.max_units} units · ${p.monthly_fee}/mo
                    </option>
                  );
                })}
              </Select>
              <Select label="Trial period" value={form.trial_days} onChange={e => setForm(f => ({ ...f, trial_days: Number(e.target.value) }))}>
                {TRIAL_OPTIONS.map(opt => (
                  <option key={opt.days} value={opt.days}>{opt.label}</option>
                ))}
              </Select>
            </div>
            <div className="text-sm text-text-2 bg-surface rounded-md px-4 py-3 border border-border">
              <span className="text-text-3">Summary: </span>
              <strong>{selectedPlan.label}</strong> — up to {selectedPlan.max_units >= 999999 ? 'unlimited' : selectedPlan.max_units} units at ${selectedPlan.monthly_fee}/month
              {trialEndPreview
                ? <span className="text-text-3"> · Trial ends {fmt.date(trialEndPreview)}</span>
                : <span className="text-text-3"> · No trial (starts active)</span>}
            </div>
          </div>
        </Modal>

        {/* Manage Owner */}
        <Modal open={!!manageOwner} onClose={() => setManageOwner(null)} title="Manage Owner" large
          footer={<Button variant="secondary" onClick={() => setManageOwner(null)}>Close</Button>}>
          {manageOwner && (
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <Avatar name={manageOwner.full_name} size="lg" />
                <div>
                  <h3 className="font-display text-xl font-bold">{manageOwner.full_name}</h3>
                  <p className="text-text-3 text-sm">@{manageOwner.username}</p>
                  <p className="text-text-2 text-sm mt-1">{manageOwner.company_name || 'No company'} · {manageOwner.phone || 'No phone'}</p>
                  <p className="text-text-3 text-sm">{manageOwner.email || ''}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="surface-card rounded-md p-3 border border-border">
                  <p className="text-[10px] uppercase text-text-3 font-semibold">Plan</p>
                  <div className="mt-2"><PlanBadge plan={manageOwner.plan} /></div>
                  <p className="text-xs text-text-3 mt-1">${Number(manageOwner.monthly_fee || 0).toFixed(2)}/mo</p>
                </div>
                <div className="surface-card rounded-md p-3 border border-border">
                  <p className="text-[10px] uppercase text-text-3 font-semibold">Status</p>
                  <div className="mt-2"><PlanStatusBadge status={manageOwner.plan_status} /></div>
                </div>
                <div className="surface-card rounded-md p-3 border border-border">
                  <p className="text-[10px] uppercase text-text-3 font-semibold">Units</p>
                  <p className="text-lg font-bold mt-2">
                    {formatUnitsUsed(Number(manageOwner.unit_count) || 0, manageOwner.max_units)}
                  </p>
                </div>
                <div className="surface-card rounded-md p-3 border border-border">
                  <p className="text-[10px] uppercase text-text-3 font-semibold">Renewal</p>
                  <p className="text-sm font-medium mt-2">{formatRenewalDate(manageOwner)}</p>
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-3">Subscription actions</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={!!planAction}
                    onClick={() => runPlanAction('upgrade')}>
                    {planAction === 'upgrade' ? '…' : 'Upgrade Plan'}
                  </Button>
                  <Button size="sm" variant="secondary" disabled={!!planAction}
                    onClick={() => runPlanAction('extend_trial', { days: extendDays })}>
                    {planAction === 'extend_trial' ? '…' : 'Extend Trial'}
                  </Button>
                  <Button size="sm" variant="success" disabled={!!planAction}
                    onClick={() => runPlanAction('mark_paid', { months: 1 })}>
                    {planAction === 'mark_paid' ? '…' : 'Mark as Paid'}
                  </Button>
                  <Button size="sm" variant="danger" disabled={!!planAction}
                    onClick={() => runPlanAction('suspend')}>
                    {planAction === 'suspend' ? '…' : 'Suspend Account'}
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select label="Extend trial by (days)" value={extendDays} onChange={e => setExtendDays(Number(e.target.value))}>
                    {[30, 60, 90].map(d => <option key={d} value={d}>{d} days</option>)}
                  </Select>
                  <div className="flex items-end gap-2">
                    <Select label="Change plan" className="flex-1 mb-0" value={changePlan} onChange={e => setChangePlan(e.target.value)}>
                      {PLAN_KEYS.map(key => {
                        const p = PLANS[key];
                        return (
                          <option key={key} value={key}>
                            {p.label} ({p.max_units >= 999999 ? '∞' : p.max_units} units)
                          </option>
                        );
                      })}
                    </Select>
                    <Button className="mb-4 shrink-0" size="sm" disabled={!!planAction}
                      onClick={() => runPlanAction('change_plan', { plan: changePlan })}>
                      Apply
                    </Button>
                  </div>
                </div>

                {manageOwner.plan_status === 'suspended' && (
                  <Button size="sm" variant="success" disabled={!!planAction}
                    onClick={() => runPlanAction('activate')}>
                    Reactivate Account
                  </Button>
                )}
              </div>

              <div className="text-xs text-text-3 border-t border-border pt-3">
                {manageOwner.property_count} properties · Login {manageOwner.is_active ? 'enabled' : 'disabled'}
              </div>
            </div>
          )}
        </Modal>
      </Layout>
    </>
  );
}
