import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import { Card, Button, Modal, Select, Input, Textarea, Spinner, fmt, apiFetch, toast } from '../components/ui';
import { generateWhatsAppLink } from '../lib/whatsapp';
import { useTranslation } from '../context/LanguageContext';
import Head from 'next/head';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

const SPECIALTIES = [
  { value: 'electricity', label: 'Electricity' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'painting', label: 'Painting' },
  { value: 'ac_cooling', label: 'AC / Cooling' },
  { value: 'general', label: 'General' },
  { value: 'other', label: 'Other' },
];

export default function TechniciansPage() {
  const t = useTranslation();
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', specialty: 'general', phone: '', whatsapp: '', notes: '' });

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const q = filter ? `?specialty=${filter}` : '';
      setList(await apiFetch(`/api/owner/technicians${q}`));
    } catch (e) { if (!silent) toast.error(e.message); }
    finally { if (!silent) setLoading(false); }
  }, [filter]);

  useAutoRefresh((silent) => load(silent), [load]);

  async function handleAdd() {
    try {
      await apiFetch('/api/owner/technicians', { method: 'POST', body: form });
      setOpen(false);
      load();
    } catch (e) { toast.error(e.message); }
  }

  return (
    <>
      <Head><title>PropSync — {t.technicians}</title></Head>
      <Layout title={t.technicians}>
        <div className="animate-up space-y-6">
          <div className="flex justify-between">
            <h2 className="font-display text-2xl font-bold">{t.technicians}</h2>
            <Button onClick={() => setOpen(true)}>+ Add</Button>
          </div>
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs">
            <option value="">All specialties</option>
            {SPECIALTIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
          {loading ? <Spinner /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map((tech) => (
                <Card key={tech.id}>
                  <div className="flex justify-between">
                    <h3 className="font-bold">{tech.name}</h3>
                    {tech.is_global && <span className="text-[10px] text-accent">Global</span>}
                  </div>
                  <p className="text-sm text-text-3 capitalize">{tech.specialty}</p>
                  <p className="text-sm mt-2">{tech.phone}</p>
                  <p className="text-amber-400 text-sm">{'★'.repeat(tech.rating)}</p>
                  <div className="flex gap-2 mt-3">
                    <a href={`tel:${tech.phone}`} className="text-xs text-accent">Call</a>
                    {generateWhatsAppLink(tech.whatsapp || tech.phone) && (
                      <a href={generateWhatsAppLink(tech.whatsapp || tech.phone, 'Salaan')} target="_blank" rel="noreferrer" className="text-xs text-accent">WhatsApp</a>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
        <Modal open={open} onClose={() => setOpen(false)} title="Add technician"
          footer={<><Button variant="secondary" onClick={() => setOpen(false)}>{t.cancel}</Button><Button onClick={handleAdd}>{t.save}</Button></>}>
          <Input label={t.name} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Select label="Specialty" value={form.specialty} onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}>
            {SPECIALTIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
          <Input label={t.phone} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          <Textarea label={t.notes} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </Modal>
      </Layout>
    </>
  );
}
