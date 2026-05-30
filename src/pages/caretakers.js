import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { Card, Button, Modal, Input, Checkbox, Spinner, apiFetch, toast } from '../components/ui';
import { useTranslation } from '../context/LanguageContext';
import Head from 'next/head';

export default function CaretakersPage() {
  const t = useTranslation();
  const [caretakers, setCaretakers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: '', username: '', password: '', phone: '', property_ids: [] });

  async function load() {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([
        apiFetch('/api/owner/caretakers'),
        apiFetch('/api/owner/properties'),
      ]);
      setCaretakers(c);
      setProperties(p);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function toggleProp(id) {
    setForm((f) => ({
      ...f,
      property_ids: f.property_ids.includes(id)
        ? f.property_ids.filter((x) => x !== id)
        : [...f.property_ids, id],
    }));
  }

  async function handleCreate() {
    try {
      await apiFetch('/api/owner/caretakers', { method: 'POST', body: form });
      toast.success('Caretaker created');
      setOpen(false);
      load();
    } catch (e) { toast.error(e.message); }
  }

  return (
    <>
      <Head><title>PropSync — {t.caretakers}</title></Head>
      <Layout title={t.caretakers}>
        <div className="animate-up space-y-6">
          <div className="flex justify-between">
            <h2 className="font-display text-2xl font-bold">{t.caretakers}</h2>
            <Button onClick={() => setOpen(true)}>+ Add caretaker</Button>
          </div>
          {loading ? <Spinner /> : caretakers.map((c) => (
            <Card key={c.id}>
              <div className="flex justify-between">
                <div>
                  <h3 className="font-bold">{c.full_name}</h3>
                  <p className="text-sm text-text-3">@{c.username}</p>
                  <p className="text-xs text-text-3 mt-2">
                    Properties: {(c.assigned_properties || []).map((p) => p.name).join(', ') || 'None'}
                  </p>
                </div>
                <Button size="xs" variant="danger" onClick={async () => {
                  await apiFetch(`/api/owner/caretakers?id=${c.id}`, { method: 'DELETE' });
                  load();
                }}>{t.delete}</Button>
              </div>
            </Card>
          ))}
        </div>
        <Modal open={open} onClose={() => setOpen(false)} title="Add caretaker" large
          footer={<><Button variant="secondary" onClick={() => setOpen(false)}>{t.cancel}</Button><Button onClick={handleCreate}>{t.save}</Button></>}>
          <Input label={t.name} value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
          <Input label="Username" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
          <Input label="Password" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          <Input label={t.phone} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          <p className="label-ui mt-4">Assign properties</p>
          {properties.map((p) => (
            <Checkbox key={p.id} label={p.name} checked={form.property_ids.includes(p.id)} onChange={() => toggleProp(p.id)} />
          ))}
        </Modal>
      </Layout>
    </>
  );
}
