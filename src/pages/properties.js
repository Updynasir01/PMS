import { useState, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import { Badge, Button, Modal, Input, Select, Textarea, Checkbox, EmptyState, Spinner, ProgressBar, fmt, apiFetch, toast, FeaturePill, IconBox, PageHeader } from '../components/ui';
import {
  IconBuilding, IconHome, IconBed, IconBath, IconKitchen, IconSofa, IconUser, IconCheck, IconAlert,
  IconQr, IconPlus, IconMapPin, IconArrowRight, PROPERTY_TYPE_ICONS,
} from '../components/Icons';
import { useAuth } from './_app';
import Head from 'next/head';
import UnitPhotosModal from '../components/UnitPhotosModal';
import MoveInChecklistModal from '../components/MoveInChecklistModal';
import LeaseSignPanel from '../components/LeaseSignPanel';
import { MOGADISHU_DISTRICTS, DEFAULT_DISTRICT } from '../lib/mogadishuDistricts';
import { useAutoRefresh, dispatchLiveRefresh } from '../hooks/useAutoRefresh';

function UnitMeta({ unit }) {
  return (
    <div className="flex items-center gap-3 text-[11px] text-text-3 mt-3">
      <span className="inline-flex items-center gap-1"><IconBed size={13} />{unit.bedrooms}</span>
      <span className="inline-flex items-center gap-1"><IconBath size={13} />{unit.toilets}</span>
      {unit.has_kitchen && <span className="inline-flex items-center gap-1"><IconKitchen size={13} />Kit</span>}
      <span className="inline-flex items-center gap-1 opacity-80">
        <IconSofa size={13} />{unit.is_furnished ? 'Furn.' : 'Unfurn.'}
      </span>
    </div>
  );
}


export default function PropertiesPage() {
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProp, setSelectedProp] = useState(null);
  const [units, setUnits] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(false);

  // Modals
  const [addPropOpen, setAddPropOpen] = useState(false);
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [addTenantOpen, setAddTenantOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [qrUnit, setQrUnit] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [generatingQrId, setGeneratingQrId] = useState(null);
  const [photoUnit, setPhotoUnit] = useState(null);
  const [checklistCtx, setChecklistCtx] = useState(null);
  const [leaseTenantId, setLeaseTenantId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Forms
  const [propForm, setPropForm] = useState({ name:'', district: DEFAULT_DISTRICT, address:'', type:'apartment', description:'' });
  const [unitForm, setUnitForm] = useState({ unit_number:'', floor:1, bedrooms:2, has_kitchen:true, toilets:1, is_furnished:false, monthly_rent_usd:'', notes:'' });
  const [tenantForm, setTenantForm] = useState({ full_name:'', phone:'', email:'', unit_id:'', monthly_rent_usd:'', deposit_usd:'', start_date: new Date().toISOString().slice(0,10), end_date:'', national_id:'', emergency_contact:'' });

  const loadProperties = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setProperties(await apiFetch('/api/owner/properties'));
    } catch (e) { if (!silent) toast.error(e.message); }
    finally { if (!silent) setLoading(false); }
  }, []);

  useAutoRefresh((silent) => loadProperties(silent), [loadProperties]);

  async function loadUnits(propId) {
    setUnitsLoading(true);
    try {
      const data = await apiFetch(`/api/owner/units?property_id=${propId}`);
      setUnits(data);
    } catch (e) { toast.error(e.message); }
    finally { setUnitsLoading(false); }
  }

  function selectProperty(prop) {
    setSelectedProp(prop);
    loadUnits(prop.id);
  }

  async function handleAddProperty() {
    if (!propForm.name || !propForm.address) return toast.error('Name and address are required');
    setSaving(true);
    try {
      await apiFetch('/api/owner/properties', { method: 'POST', body: propForm });
      toast.success('Property created!');
      setAddPropOpen(false);
      setPropForm({ name:'', district: DEFAULT_DISTRICT, address:'', type:'apartment', description:'' });
      loadProperties();
      dispatchLiveRefresh();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function handleAddUnit() {
    if (!unitForm.unit_number || !unitForm.monthly_rent_usd) return toast.error('Unit number and rent are required');
    setSaving(true);
    try {
      await apiFetch('/api/owner/units', { method: 'POST', body: { ...unitForm, property_id: selectedProp.id } });
      toast.success('Unit added!');
      setAddUnitOpen(false);
      setUnitForm({ unit_number:'', floor:1, bedrooms:2, has_kitchen:true, toilets:1, is_furnished:false, monthly_rent_usd:'', notes:'' });
      loadUnits(selectedProp.id);
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function handleRegisterTenant() {
    const { full_name, unit_id, monthly_rent_usd, start_date } = tenantForm;
    if (!full_name || !unit_id || !monthly_rent_usd || !start_date) {
      return toast.error('Name, unit, rent, and lease start are required');
    }
    setSaving(true);
    try {
      const res = await apiFetch('/api/owner/tenants', { method: 'POST', body: tenantForm });
      toast.success(`${full_name} registered — share the unit QR code for portal access`);
      setAddTenantOpen(false);
      setChecklistCtx({ unitId: unit_id, tenantId: res.tenantId });
      setTenantForm({ full_name:'', phone:'', email:'', unit_id:'', monthly_rent_usd:'', deposit_usd:'', start_date: new Date().toISOString().slice(0,10), end_date:'', national_id:'', emergency_contact:'' });
      loadUnits(selectedProp.id);
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  const vacantUnits = units.filter(u => u.status === 'vacant');

  async function handleGenerateQr(unit) {
    setGeneratingQrId(unit.id);
    try {
      const data = await apiFetch('/api/owner/generate-qr-token', {
        method: 'POST',
        body: { unit_id: unit.id },
      });
      setUnits((prev) => prev.map((u) => (u.id === unit.id ? { ...u, qr_token: data.qr_token } : u)));
      toast.success(`QR token generated for unit ${unit.unit_number}`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setGeneratingQrId(null);
    }
  }

  const openQrModal = useCallback(async (unit, e) => {
    e?.stopPropagation();
    if (!unit.qr_token) {
      toast.error('Generate a QR token first');
      return;
    }
    setQrUnit(unit);
    setQrLoading(true);
    setQrDataUrl('');
    try {
      const QRCode = (await import('qrcode')).default;
      const url = `${window.location.origin}/tenant-portal/${unit.qr_token}`;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 280,
        margin: 2,
        color: { dark: '#0a0a0f', light: '#ffffff' },
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      toast.error(err.message || 'Failed to generate QR code');
      setQrUnit(null);
    } finally {
      setQrLoading(false);
    }
  }, []);

  function downloadQr() {
    if (!qrDataUrl || !qrUnit) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `unit-${qrUnit.unit_number}-qr.png`;
    a.click();
  }

  function printQr() {
    if (!qrDataUrl || !qrUnit) return;
    const w = window.open('', '_blank');
    w.document.write(`
      <html><head><title>Unit ${qrUnit.unit_number} QR</title></head>
      <body style="text-align:center;font-family:sans-serif;padding:24px">
        <h2>Unit ${qrUnit.unit_number}</h2>
        <p>${selectedProp?.name || ''}</p>
        <img src="${qrDataUrl}" style="width:280px;height:280px" />
        <p>Stick this inside unit ${qrUnit.unit_number}</p>
      </body></html>
    `);
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <>
      <Head><title>eNuzul — Properties</title></Head>
      <Layout title="Properties">
        <div className="animate-up">
          <PageHeader
            title="Properties"
            subtitle={`${properties.length} under management`}
            action={
              (user?.role === 'owner' || user?.role === 'superadmin') ? (
                <Button onClick={() => setAddPropOpen(true)}>
                  <IconPlus size={16} /> Add Property
                </Button>
              ) : null
            }
          />

          {loading ? (
            <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
              {/* Property list */}
              <div className="lg:col-span-4 space-y-2">
                {properties.map((p) => {
                  const rate = +p.total_units ? Math.round((+p.occupied_units / +p.total_units) * 100) : 0;
                  const TypeIcon = PROPERTY_TYPE_ICONS[p.type] || IconBuilding;
                  const active = selectedProp?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => selectProperty(p)}
                      className={`w-full text-left rounded-sm border-[0.5px] p-4 transition-all duration-200
                        ${active
                          ? 'border-accent/40 bg-accent-muted shadow-sm'
                          : 'border-border bg-card hover:border-accent/25 hover:bg-surface'
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <IconBox tint={active ? 'purple' : 'neutral'} className="!w-10 !h-10 shrink-0">
                          <TypeIcon size={18} />
                        </IconBox>
                        <div className="min-w-0 flex-1">
                          <div className="font-display text-[17px] text-text-1 truncate leading-tight">{p.name}</div>
                          <div className="flex items-center gap-1 mt-1 text-[12px] text-text-3 truncate">
                            <IconMapPin size={12} className="shrink-0 opacity-70" />
                            <span className="truncate">{p.district} · {p.address}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-4 text-[12px] text-text-2">
                        <span><span className="font-semibold text-text-1">{p.total_units}</span> total</span>
                        <span className="text-border-strong">·</span>
                        <span><span className="font-semibold text-accent">{p.occupied_units}</span> occupied</span>
                        <span className="text-border-strong">·</span>
                        <span><span className="font-semibold text-text-1">{p.vacant_units}</span> vacant</span>
                      </div>
                      <div className="mt-3">
                        <ProgressBar value={+p.occupied_units} max={+p.total_units || 1} color="accent" />
                        <div className="label-ui mt-1.5 normal-case tracking-normal text-text-3">{rate}% occupied</div>
                      </div>
                    </button>
                  );
                })}
                {!properties.length && (
                  <div className="rounded-sm border-[0.5px] border-border bg-card p-6">
                    <EmptyState
                      icon={<IconBuilding size={22} />}
                      title="No properties yet"
                      description="Add your first property to get started"
                    />
                  </div>
                )}
              </div>

              {/* Units panel */}
              <div className="lg:col-span-8">
                {selectedProp ? (
                  <div className="rounded-sm border-[0.5px] border-border bg-card overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-edge py-5 border-b-[0.5px] border-border">
                      <div>
                        <h3 className="font-display text-[22px] text-text-1 leading-tight">{selectedProp.name}</h3>
                        <p className="text-[13px] text-text-3 mt-0.5">{units.length} units</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => { setAddTenantOpen(true); setTenantForm((f) => ({ ...f, unit_id: '' })); }}>
                          Register Tenant
                        </Button>
                        <Button size="sm" onClick={() => setAddUnitOpen(true)}>
                          <IconPlus size={14} /> Add Unit
                        </Button>
                      </div>
                    </div>

                    {unitsLoading ? (
                      <div className="flex justify-center py-16"><Spinner /></div>
                    ) : (
                      <div className="p-edge grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {units.map((u) => (
                          <div
                            key={u.id}
                            onClick={() => setSelectedUnit(u)}
                            className="group relative rounded-sm border-[0.5px] border-border bg-page/40 p-4 cursor-pointer transition-all duration-200 hover:border-accent/30 hover:bg-surface"
                          >
                            <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full"
                              style={{
                                background: u.status === 'occupied'
                                  ? 'var(--accent)'
                                  : u.status === 'vacant'
                                    ? 'var(--status-amber)'
                                    : 'var(--status-red)',
                              }}
                            />
                            <div className="pl-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="font-display text-[18px] text-text-1 leading-none">{u.unit_number}</div>
                                <span
                                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
                                    u.move_in_checklist_done
                                      ? 'bg-status-green-dim text-status-green'
                                      : 'bg-status-amber-dim text-status-amber'
                                  }`}
                                  title={u.move_in_checklist_done ? 'Move-in checklist done' : 'Checklist pending'}
                                >
                                  {u.move_in_checklist_done ? <IconCheck size={12} /> : <IconAlert size={12} />}
                                </span>
                              </div>

                              <div className="font-display text-[20px] text-accent mt-2 leading-none">
                                {fmt.usd(u.monthly_rent_usd)}
                                <span className="text-[11px] font-sans text-text-3 ml-0.5">/mo</span>
                              </div>

                              {u.tenant_name ? (
                                <div className="flex items-center gap-1.5 text-[12px] text-text-2 mt-2 truncate">
                                  <IconUser size={13} className="shrink-0 opacity-60" />
                                  <span className="truncate">{u.tenant_name}</span>
                                </div>
                              ) : (
                                <div className="text-[12px] text-text-3 mt-2">Vacant</div>
                              )}

                              <UnitMeta unit={u} />

                              <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t-[0.5px] border-border">
                                <Badge status={u.status} compact />
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button size="xs" variant="ghost" onClick={(e) => { e.stopPropagation(); setPhotoUnit(u); }}>Photos</Button>
                                  {u.qr_token ? (
                                    <Button size="xs" variant="ghost" onClick={(e) => openQrModal(u, e)}>
                                      <IconQr size={12} /> QR
                                    </Button>
                                  ) : (
                                    <Button size="xs" variant="ghost" onClick={(e) => { e.stopPropagation(); handleGenerateQr(u); }} disabled={generatingQrId === u.id}>
                                      {generatingQrId === u.id ? '…' : 'QR'}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {!units.length && (
                          <div className="col-span-full">
                            <EmptyState
                              icon={<IconHome size={22} />}
                              title="No units yet"
                              description="Add the first unit to this property"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {!unitsLoading && units.length > 0 && (
                      <div className="border-t-[0.5px] border-border">
                        <div className="px-edge py-4 flex items-center justify-between gap-3">
                          <div>
                            <h4 className="font-display text-[16px] text-text-1">QR codes</h4>
                            <p className="text-[12px] text-text-3 mt-0.5">
                              {units.filter((u) => u.qr_token).length} of {units.length} ready
                            </p>
                          </div>
                        </div>
                        <ul className="divide-y-[0.5px] divide-border border-t-[0.5px] border-border">
                          {units.map((u) => (
                            <li key={u.id} className="flex items-center justify-between gap-3 px-edge py-3 hover:bg-surface/60 transition-colors">
                              <div className="min-w-0 flex items-center gap-3">
                                <span className="font-semibold text-[14px] text-text-1 w-10">{u.unit_number}</span>
                                <span className="text-[12px] text-text-3 truncate">{u.tenant_name || 'Vacant'}</span>
                                <Badge status={u.status} compact />
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {u.qr_token ? (
                                  <>
                                    <span className="icon-box !w-7 !h-7 bg-status-green-dim text-status-green">
                                      <IconCheck size={14} />
                                    </span>
                                    <Button size="xs" variant="secondary" onClick={(e) => openQrModal(u, e)}>
                                      View
                                    </Button>
                                  </>
                                ) : (
                                  <Button size="xs" onClick={() => handleGenerateQr(u)} disabled={generatingQrId === u.id}>
                                    {generatingQrId === u.id ? '…' : 'Generate'}
                                  </Button>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full min-h-[320px] rounded-sm border-[0.5px] border-dashed border-border bg-card/50 flex items-center justify-center">
                    <EmptyState
                      icon={<IconArrowRight size={22} />}
                      title="Select a property"
                      description="Choose a property on the left to manage units"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* QR Code Modal */}
        <Modal open={!!qrUnit} onClose={() => { setQrUnit(null); setQrDataUrl(''); }} title={`Unit ${qrUnit?.unit_number} — QR Code`}
          footer={
            <>
              <Button variant="secondary" onClick={() => { setQrUnit(null); setQrDataUrl(''); }}>Close</Button>
              <Button variant="secondary" onClick={downloadQr} disabled={!qrDataUrl}>Download</Button>
              <Button onClick={printQr} disabled={!qrDataUrl}>Print</Button>
            </>
          }>
          {qrUnit && (
            <div className="text-center">
              <p className="text-[14px] font-semibold text-text-1 mb-1">{selectedProp?.name}</p>
              <p className="label-ui mb-4 normal-case">Unit {qrUnit.unit_number}</p>
              <div className="inline-block p-4 bg-white rounded-lg border-[0.5px] border-border mb-4">
                {qrLoading ? (
                  <div className="w-[280px] h-[280px] flex items-center justify-center"><Spinner /></div>
                ) : qrDataUrl ? (
                  <img src={qrDataUrl} alt={`QR code for unit ${qrUnit.unit_number}`} width={280} height={280} className="block" />
                ) : null}
              </div>
              <p className="text-[13px] text-text-3">Tenants scan for full portal — payments, maintenance & chat. No login needed.</p>
              <p className="text-[12px] text-text-3 mt-1">Stick inside unit {qrUnit.unit_number}</p>
            </div>
          )}
        </Modal>

        {/* Unit Detail Modal */}
        <Modal open={!!selectedUnit} onClose={() => setSelectedUnit(null)} title={`Unit ${selectedUnit?.unit_number}`}>
          {selectedUnit && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-sm border-[0.5px] border-border bg-surface p-3">
                  <div className="label-ui mb-2">Status</div>
                  <Badge status={selectedUnit.status} />
                </div>
                <div className="rounded-sm border-[0.5px] border-border bg-surface p-3">
                  <div className="label-ui mb-2">Rent</div>
                  <div className="font-display text-[22px] text-accent leading-none">{fmt.usd(selectedUnit.monthly_rent_usd)}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <FeaturePill icon={<IconBed size={13} />} variant="bedroom">{selectedUnit.bedrooms} bed{selectedUnit.bedrooms !== 1 ? 's' : ''}</FeaturePill>
                <FeaturePill icon={<IconBath size={13} />} variant="bath">{selectedUnit.toilets} bath</FeaturePill>
                <FeaturePill icon={<IconKitchen size={13} />} variant={selectedUnit.has_kitchen ? 'kitchen' : 'off'}>
                  {selectedUnit.has_kitchen ? 'Kitchen' : 'No kitchen'}
                </FeaturePill>
                <FeaturePill icon={<IconSofa size={13} />} variant={selectedUnit.is_furnished ? 'furnished' : 'off'}>
                  {selectedUnit.is_furnished ? 'Furnished' : 'Unfurnished'}
                </FeaturePill>
                <FeaturePill variant="neutral">Floor {selectedUnit.floor}</FeaturePill>
              </div>

              {selectedUnit.tenant_name && (
                <div className="rounded-sm border-[0.5px] border-border bg-surface p-3 flex items-start gap-3">
                  <IconBox tint="purple" className="!w-9 !h-9">
                    <IconUser size={16} />
                  </IconBox>
                  <div>
                    <div className="label-ui mb-1">Current tenant</div>
                    <div className="font-semibold text-text-1">{selectedUnit.tenant_name}</div>
                    {selectedUnit.tenant_phone && <div className="text-[12px] text-text-3 mt-0.5">{selectedUnit.tenant_phone}</div>}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setPhotoUnit(selectedUnit)}>Photos</Button>
                <Button variant="secondary" onClick={(e) => { openQrModal(selectedUnit, e); }}>
                  <IconQr size={14} /> QR Code
                </Button>
                {selectedUnit.tenant_id && (
                  <Button variant="ghost" onClick={() => setLeaseTenantId(selectedUnit.tenant_id)}>
                    Lease & sign
                  </Button>
                )}
                {selectedUnit.status === 'vacant' && (
                  <Button className="flex-1 justify-center" onClick={() => { setSelectedUnit(null); setTenantForm((f) => ({ ...f, unit_id: selectedUnit.id, monthly_rent_usd: selectedUnit.monthly_rent_usd })); setAddTenantOpen(true); }}>
                    Register Tenant
                  </Button>
                )}
              </div>
            </div>
          )}
        </Modal>

        {/* Add Property Modal */}
        <Modal open={addPropOpen} onClose={() => setAddPropOpen(false)} title="Add Property"
          footer={<><Button variant="secondary" onClick={() => setAddPropOpen(false)}>Cancel</Button><Button onClick={handleAddProperty} disabled={saving}>{saving ? 'Saving...' : 'Create Property'}</Button></>}>
          <Input label="Property Name *" value={propForm.name} onChange={e => setPropForm(f => ({ ...f, name: e.target.value }))} placeholder="Hassan Apartments KM4" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="District *" value={propForm.district} onChange={e => setPropForm(f => ({ ...f, district: e.target.value }))}>
              {MOGADISHU_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
            </Select>
            <Select label="Type *" value={propForm.type} onChange={e => setPropForm(f => ({ ...f, type: e.target.value }))}>
              <option value="apartment">Apartment</option>
              <option value="villa">Villa</option>
              <option value="commercial">Commercial</option>
              <option value="office">Office</option>
              <option value="mixed">Mixed Use</option>
            </Select>
          </div>
          <Input label="Full Address *" value={propForm.address} onChange={e => setPropForm(f => ({ ...f, address: e.target.value }))} placeholder="Street, landmark, Mogadishu" />
          <Textarea label="Description" value={propForm.description} onChange={e => setPropForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description..." />
        </Modal>

        {/* Add Unit Modal */}
        <Modal open={addUnitOpen} onClose={() => setAddUnitOpen(false)} title="Add Unit"
          footer={<><Button variant="secondary" onClick={() => setAddUnitOpen(false)}>Cancel</Button><Button onClick={handleAddUnit} disabled={saving}>{saving ? 'Saving...' : 'Add Unit'}</Button></>}>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Unit Number *" value={unitForm.unit_number} onChange={e => setUnitForm(f => ({ ...f, unit_number: e.target.value }))} placeholder="A-101" />
            <Input label="Floor" type="number" value={unitForm.floor} onChange={e => setUnitForm(f => ({ ...f, floor: e.target.value }))} min="0" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Bedrooms *" type="number" value={unitForm.bedrooms} onChange={e => setUnitForm(f => ({ ...f, bedrooms: e.target.value }))} min="0" />
            <Input label="Toilets *" type="number" value={unitForm.toilets} onChange={e => setUnitForm(f => ({ ...f, toilets: e.target.value }))} min="0" />
          </div>
          <Input label="Monthly Rent (USD) *" type="number" value={unitForm.monthly_rent_usd} onChange={e => setUnitForm(f => ({ ...f, monthly_rent_usd: e.target.value }))} placeholder="350" />
          <div className="flex gap-6 mb-4">
            <Checkbox label="Has Kitchen" checked={unitForm.has_kitchen} onChange={e => setUnitForm(f => ({ ...f, has_kitchen: e.target.checked }))} />
            <Checkbox label="Furnished" checked={unitForm.is_furnished} onChange={e => setUnitForm(f => ({ ...f, is_furnished: e.target.checked }))} />
          </div>
          <Input label="Notes (optional)" value={unitForm.notes} onChange={e => setUnitForm(f => ({ ...f, notes: e.target.value }))} placeholder="Corner unit, great view..." />
        </Modal>

        {/* Register Tenant Modal */}
        <Modal open={addTenantOpen} onClose={() => setAddTenantOpen(false)} title="Register Tenant" large
          footer={<><Button variant="secondary" onClick={() => setAddTenantOpen(false)}>Cancel</Button><Button onClick={handleRegisterTenant} disabled={saving}>{saving ? 'Registering...' : 'Register Tenant'}</Button></>}>
          <p className="text-[13px] text-text-3 mb-4">Tenants access their portal by scanning the unit QR code — no login password needed.</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name *" value={tenantForm.full_name} onChange={e => setTenantForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Mohamed Abdi Nur" />
            <Input label="Phone" value={tenantForm.phone} onChange={e => setTenantForm(f => ({ ...f, phone: e.target.value }))} placeholder="+252618..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Unit *" value={tenantForm.unit_id} onChange={e => { const u = vacantUnits.find(u => u.id == e.target.value); setTenantForm(f => ({ ...f, unit_id: e.target.value, monthly_rent_usd: u?.monthly_rent_usd || f.monthly_rent_usd })); }}>
              <option value="">— Select Vacant Unit —</option>
              {vacantUnits.map(u => <option key={u.id} value={u.id}>{u.unit_number} — {fmt.usd(u.monthly_rent_usd)}/mo</option>)}
            </Select>
            <Input label="Monthly Rent (USD) *" type="number" value={tenantForm.monthly_rent_usd} onChange={e => setTenantForm(f => ({ ...f, monthly_rent_usd: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Lease Start *" type="date" value={tenantForm.start_date} onChange={e => setTenantForm(f => ({ ...f, start_date: e.target.value }))} />
            <Input label="Lease End" type="date" value={tenantForm.end_date} onChange={e => setTenantForm(f => ({ ...f, end_date: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Deposit (USD)" type="number" value={tenantForm.deposit_usd} onChange={e => setTenantForm(f => ({ ...f, deposit_usd: e.target.value }))} placeholder="700" />
            <Input label="National ID" value={tenantForm.national_id} onChange={e => setTenantForm(f => ({ ...f, national_id: e.target.value }))} placeholder="SOM-001-2024" />
          </div>
          <Input label="Emergency Contact" value={tenantForm.emergency_contact} onChange={e => setTenantForm(f => ({ ...f, emergency_contact: e.target.value }))} placeholder="Name (relation)" />
        </Modal>

        <UnitPhotosModal unit={photoUnit} open={!!photoUnit} onClose={() => setPhotoUnit(null)} />
        <Modal open={!!leaseTenantId} onClose={() => setLeaseTenantId(null)} title="Lease agreement" large>
          {leaseTenantId && <LeaseSignPanel tenantId={leaseTenantId} role="owner" />}
        </Modal>

        <MoveInChecklistModal
          open={!!checklistCtx}
          unitId={checklistCtx?.unitId}
          tenantId={checklistCtx?.tenantId}
          onClose={(saved) => {
            setChecklistCtx(null);
            if (saved && selectedProp) loadUnits(selectedProp.id);
          }}
        />
      </Layout>
    </>
  );
}
