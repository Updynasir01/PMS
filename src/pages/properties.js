import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/layout/Layout';
import { Card, Badge, Button, Modal, Input, Select, Textarea, Checkbox, EmptyState, Spinner, ProgressBar, fmt, apiFetch, toast, FeaturePill } from '../components/ui';
import { useAuth } from './_app';
import Head from 'next/head';
import UnitPhotosModal from '../components/UnitPhotosModal';
import MoveInChecklistModal from '../components/MoveInChecklistModal';
import LeaseSignPanel from '../components/LeaseSignPanel';

const DISTRICTS = ['KM4','Airport Road','Hodan','Wadajir','Hamar Weyne','Abdiaziz','Daynile','Other'];
const TYPE_ICONS = { apartment:'🏢', villa:'🏡', commercial:'🏪', office:'🏬', mixed:'🏗️' };

export default function PropertiesPage() {
  const { user } = useAuth();
  const router = useRouter();
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
  const [propForm, setPropForm] = useState({ name:'', district:'KM4', address:'', type:'apartment', description:'' });
  const [unitForm, setUnitForm] = useState({ unit_number:'', floor:1, bedrooms:2, has_kitchen:true, toilets:1, is_furnished:false, monthly_rent_usd:'', notes:'' });
  const [tenantForm, setTenantForm] = useState({ username:'', password:'', full_name:'', phone:'', email:'', unit_id:'', monthly_rent_usd:'', deposit_usd:'', start_date: new Date().toISOString().slice(0,10), end_date:'', national_id:'', emergency_contact:'' });

  useEffect(() => { loadProperties(); }, []);

  async function loadProperties() {
    setLoading(true);
    try {
      const data = await apiFetch('/api/owner/properties');
      setProperties(data);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }

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
      setPropForm({ name:'', district:'KM4', address:'', type:'apartment', description:'' });
      loadProperties();
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
    const { username, password, full_name, unit_id, monthly_rent_usd, start_date } = tenantForm;
    if (!username || !password || !full_name || !unit_id || !monthly_rent_usd || !start_date) {
      return toast.error('All required fields must be filled');
    }
    setSaving(true);
    try {
      const res = await apiFetch('/api/owner/tenants', { method: 'POST', body: tenantForm });
      toast.success(`${full_name} registered successfully!`);
      setAddTenantOpen(false);
      setChecklistCtx({ unitId: unit_id, tenantId: res.tenantId });
      setTenantForm({ username:'', password:'', full_name:'', phone:'', email:'', unit_id:'', monthly_rent_usd:'', deposit_usd:'', start_date: new Date().toISOString().slice(0,10), end_date:'', national_id:'', emergency_contact:'' });
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
      <Head><title>PropSync — Properties</title></Head>
      <Layout title="Properties">
        <div className="animate-up">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-2xl font-bold">Properties</h2>
              <p className="text-text-3 text-sm">{properties.length} properties under management</p>
            </div>
            {(user?.role === 'owner' || user?.role === 'superadmin') && (
              <Button onClick={() => setAddPropOpen(true)}>
                <span className="text-lg">+</span> Add Property
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Property List */}
              <div className="space-y-4">
                {properties.map(p => {
                  const rate = +p.total_units ? Math.round(+p.occupied_units / +p.total_units * 100) : 0;
                  return (
                    <Card key={p.id}
                      onClick={() => selectProperty(p)}
                      className={`cursor-pointer transition-all ${selectedProp?.id === p.id ? 'border-accent bg-accent-muted' : 'hover:border-border-strong'}`}>
                      <div className="flex items-start gap-3 mb-3">
                        <span className="text-2xl">{TYPE_ICONS[p.type] || '🏢'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-display font-bold truncate">{p.name}</div>
                          <div className="text-xs text-text-3">{p.district} · {p.address}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                        <div className="bg-surface rounded-lg p-2">
                          <div className="font-display font-bold">{p.total_units}</div>
                          <div className="text-xs text-text-3">Total</div>
                        </div>
                        <div className="bg-green-900/20 rounded-lg p-2">
                          <div className="font-display font-bold text-green-400">{p.occupied_units}</div>
                          <div className="text-xs text-green-700">Occupied</div>
                        </div>
                        <div className="bg-amber-900/20 rounded-lg p-2">
                          <div className="font-display font-bold text-amber-400">{p.vacant_units}</div>
                          <div className="text-xs text-amber-700">Vacant</div>
                        </div>
                      </div>
                      <ProgressBar value={+p.occupied_units} max={+p.total_units} />
                      <div className="text-xs text-text-3 mt-1">{rate}% occupied</div>
                    </Card>
                  );
                })}
                {!properties.length && (
                  <Card>
                    <EmptyState icon="🏢" title="No properties yet" description="Add your first property to get started" />
                  </Card>
                )}
              </div>

              {/* Units Panel */}
              <div className="lg:col-span-2">
                {selectedProp ? (
                  <Card>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-display font-bold">{selectedProp.name}</h3>
                        <p className="text-text-3 text-xs">{units.length} units</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => { setAddTenantOpen(true); setTenantForm(f => ({ ...f, unit_id: '' })); }}>
                          Register Tenant
                        </Button>
                        <Button size="sm" onClick={() => setAddUnitOpen(true)}>
                          + Add Unit
                        </Button>
                      </div>
                    </div>
                    {unitsLoading ? (
                      <div className="flex justify-center py-10"><Spinner /></div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {units.map(u => (
                          <div key={u.id}
                            onClick={() => setSelectedUnit(u)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all hover:-translate-y-0.5
                              ${u.status === 'occupied' ? 'border-l-2 border-l-green-500 border-border bg-surface'
                              : u.status === 'vacant' ? 'border-l-2 border-l-amber-500 border-border bg-surface'
                              : 'border-l-2 border-l-red-500 border-border bg-surface'}`}>
                            <div className="font-display font-bold text-base mb-1 flex items-center gap-1">
                              {u.unit_number}
                              {u.move_in_checklist_done ? <span className="text-status-green text-xs" title="Move-in checklist done">✓</span> : <span className="text-status-amber text-xs" title="No checklist">!</span>}
                            </div>
                            <div className="font-semibold text-sm text-accent">{fmt.usd(u.monthly_rent_usd)}<span className="text-text-3 text-xs">/mo</span></div>
                            {u.tenant_name
                              ? <div className="text-xs text-text-3 mt-1 truncate">👤 {u.tenant_name}</div>
                              : <div className="text-xs text-text-3 mt-1">Vacant</div>
                            }
                            <div className="flex gap-1.5 mt-2 flex-wrap">
                              <FeaturePill icon="🛏" variant="bedroom">{u.bedrooms} bed{u.bedrooms !== 1 ? 's' : ''}</FeaturePill>
                              <FeaturePill icon="🚿" variant="bath">{u.toilets} bath</FeaturePill>
                              {u.has_kitchen && <FeaturePill icon="🍳" variant="kitchen">Kitchen</FeaturePill>}
                              <FeaturePill icon="🪑" variant={u.is_furnished ? 'furnished' : 'off'}>{u.is_furnished ? 'Furnished' : 'Unfurnished'}</FeaturePill>
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                              <Badge status={u.status} />
                              <Button size="xs" variant="ghost" onClick={(e) => { e.stopPropagation(); setPhotoUnit(u); }}>Photos</Button>
                              {u.qr_token ? (
                                <Button size="xs" variant="ghost" onClick={(e) => openQrModal(u, e)}>
                                  QR Code
                                </Button>
                              ) : (
                                <Button size="xs" variant="ghost" onClick={(e) => { e.stopPropagation(); handleGenerateQr(u); }} disabled={generatingQrId === u.id}>
                                  {generatingQrId === u.id ? '...' : 'Generate'}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                        {!units.length && (
                          <div className="col-span-full">
                            <EmptyState icon="🏠" title="No units yet" description="Add the first unit to this property" />
                          </div>
                        )}
                      </div>
                    )}

                    {!unitsLoading && units.length > 0 && (
                      <Card className="mt-4 !p-0 overflow-hidden">
                        <div className="px-edge py-4 border-b-[0.5px] border-border">
                          <h3 className="font-display text-[18px] text-text-1">View QR Codes</h3>
                          <p className="text-[13px] text-text-3 mt-1">
                            {units.filter((u) => u.qr_token).length} of {units.length} units have QR codes
                          </p>
                        </div>
                        <ul className="divide-y-[0.5px] divide-border">
                          {units.map((u) => (
                            <li
                              key={u.id}
                              className="flex items-center justify-between gap-3 px-edge py-3 hover:bg-surface/80 transition-colors duration-200"
                            >
                              <div className="min-w-0">
                                <div className="font-semibold text-[14px] text-text-1">{u.unit_number}</div>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className="text-[12px] text-text-3">{u.tenant_name || 'Vacant'}</span>
                                  <Badge status={u.status} />
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {u.qr_token ? (
                                  <>
                                    <span
                                      className="icon-box !w-8 !h-8 bg-status-green-dim text-status-green"
                                      title="QR token ready"
                                      aria-label="QR token ready"
                                    >
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                                        <path d="M20 6 9 17l-5-5" />
                                      </svg>
                                    </span>
                                    <Button size="xs" variant="secondary" onClick={(e) => openQrModal(u, e)}>
                                      View QR
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    size="xs"
                                    onClick={() => handleGenerateQr(u)}
                                    disabled={generatingQrId === u.id}
                                  >
                                    {generatingQrId === u.id ? '...' : 'Generate'}
                                  </Button>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </Card>
                    )}
                  </Card>
                ) : (
                  <Card className="h-full flex items-center justify-center min-h-[300px]">
                    <EmptyState icon="👈" title="Select a property" description="Click a property to view its units" />
                  </Card>
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
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface rounded-lg p-3"><div className="text-xs text-text-3 mb-1">Status</div><Badge status={selectedUnit.status} /></div>
                <div className="bg-surface rounded-lg p-3"><div className="text-xs text-text-3 mb-1">Rent</div><div className="font-display font-bold text-lg text-accent">{fmt.usd(selectedUnit.monthly_rent_usd)}</div></div>
                <div className="bg-surface rounded-lg p-3 border-[0.5px] border-border">
                  <div className="label-ui mb-2">Bedrooms</div>
                  <FeaturePill icon="🛏" variant="bedroom">{selectedUnit.bedrooms}</FeaturePill>
                </div>
                <div className="bg-surface rounded-lg p-3 border-[0.5px] border-border">
                  <div className="label-ui mb-2">Bathrooms</div>
                  <FeaturePill icon="🚿" variant="bath">{selectedUnit.toilets}</FeaturePill>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <FeaturePill icon="🛏" variant="bedroom">{selectedUnit.bedrooms} bedroom{selectedUnit.bedrooms !== 1 ? 's' : ''}</FeaturePill>
                <FeaturePill icon="🚿" variant="bath">{selectedUnit.toilets} bathroom{selectedUnit.toilets !== 1 ? 's' : ''}</FeaturePill>
                <FeaturePill icon="🍳" variant={selectedUnit.has_kitchen ? 'kitchen' : 'off'}>{selectedUnit.has_kitchen ? 'Has kitchen' : 'No kitchen'}</FeaturePill>
                <FeaturePill icon="🪑" variant={selectedUnit.is_furnished ? 'furnished' : 'off'}>{selectedUnit.is_furnished ? 'Furnished' : 'Unfurnished'}</FeaturePill>
                <FeaturePill variant="neutral">Floor {selectedUnit.floor}</FeaturePill>
              </div>
              {selectedUnit.tenant_name && (
                <div className="p-3 bg-surface rounded-lg border border-border">
                  <div className="text-xs text-text-3 mb-1">Current Tenant</div>
                  <div className="font-semibold">{selectedUnit.tenant_name}</div>
                  {selectedUnit.tenant_phone && <div className="text-xs text-text-3">{selectedUnit.tenant_phone}</div>}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setPhotoUnit(selectedUnit)}>Photos</Button>
                <Button variant="secondary" onClick={(e) => { openQrModal(selectedUnit, e); }}>
                  QR Code
                </Button>
                {selectedUnit.tenant_id && (
                  <Button variant="ghost" onClick={() => setLeaseTenantId(selectedUnit.tenant_id)}>
                    Lease & sign (cloud)
                  </Button>
                )}
                {selectedUnit.status === 'vacant' && (
                  <Button className="flex-1 justify-center" onClick={() => { setSelectedUnit(null); setTenantForm(f => ({ ...f, unit_id: selectedUnit.id, monthly_rent_usd: selectedUnit.monthly_rent_usd })); setAddTenantOpen(true); }}>
                    Register Tenant for this Unit
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
              {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
            </Select>
            <Select label="Type *" value={propForm.type} onChange={e => setPropForm(f => ({ ...f, type: e.target.value }))}>
              <option value="apartment">🏢 Apartment</option>
              <option value="villa">🏡 Villa</option>
              <option value="commercial">🏪 Commercial</option>
              <option value="office">🏬 Office</option>
              <option value="mixed">🏗️ Mixed Use</option>
            </Select>
          </div>
          <Input label="Full Address *" value={propForm.address} onChange={e => setPropForm(f => ({ ...f, address: e.target.value }))} placeholder="Near KM4 Junction, Wadajir District" />
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
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name *" value={tenantForm.full_name} onChange={e => setTenantForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Mohamed Abdi Nur" />
            <Input label="Username *" value={tenantForm.username} onChange={e => setTenantForm(f => ({ ...f, username: e.target.value }))} placeholder="mohamed" autoComplete="off" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Password *" type="password" value={tenantForm.password} onChange={e => setTenantForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 characters" autoComplete="new-password" />
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
