import { useState, useCallback, useRef } from 'react';
import Head from 'next/head';
import Layout from '../components/layout/Layout';
import { Card, Button, Modal, Input, Spinner, apiFetch, toast } from '../components/ui';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

const emptyForm = {
  name: '',
  website_url: '',
  sort_order: 0,
  is_active: true,
};

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function LandingCustomersPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [imageBase64, setImageBase64] = useState(null);
  const [mimeType, setMimeType] = useState(null);
  const [preview, setPreview] = useState(null);
  const [clearLogo, setClearLogo] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setList(await apiFetch('/api/admin/landing-customers'));
    } catch (e) {
      if (!silent) toast.error(e.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useAutoRefresh((silent) => load(silent), [load]);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setImageBase64(null);
    setMimeType(null);
    setPreview(null);
    setClearLogo(false);
    setOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({
      name: row.name || '',
      website_url: row.website_url || '',
      sort_order: row.sort_order ?? 0,
      is_active: row.is_active !== false,
    });
    setImageBase64(null);
    setMimeType(null);
    setPreview(row.logo_url || null);
    setClearLogo(false);
    setOpen(true);
  }

  async function onPickFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      toast.error('Only JPG or PNG');
      return;
    }
    const dataUrl = await fileToBase64(file);
    setImageBase64(dataUrl);
    setMimeType(file.type);
    setPreview(dataUrl);
    setClearLogo(false);
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        website_url: form.website_url.trim() || null,
        sort_order: Number(form.sort_order) || 0,
        is_active: !!form.is_active,
      };
      if (imageBase64) {
        body.image_base64 = imageBase64;
        body.mime_type = mimeType;
      }
      if (editing) {
        body.id = editing.id;
        if (clearLogo) body.clear_logo = true;
        await apiFetch('/api/admin/landing-customers', { method: 'PATCH', body });
        toast.success('Customer updated');
      } else {
        await apiFetch('/api/admin/landing-customers', { method: 'POST', body });
        toast.success('Customer added');
      }
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row) {
    if (!confirm(`Remove “${row.name}” from the landing page?`)) return;
    try {
      await apiFetch(`/api/admin/landing-customers?id=${row.id}`, { method: 'DELETE' });
      toast.success('Removed');
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function toggleActive(row) {
    try {
      await apiFetch('/api/admin/landing-customers', {
        method: 'PATCH',
        body: { id: row.id, is_active: !row.is_active },
      });
      load(true);
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <>
      <Head><title>eNuzul — Landing customers</title></Head>
      <Layout title="Landing customers">
        <div className="animate-up space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold">Landing customers</h2>
              <p className="text-sm text-text-2 mt-1">
                Names and logos shown under the homepage hero (“Trusted by”).
              </p>
            </div>
            <Button onClick={openAdd}>+ Add customer</Button>
          </div>

          {loading ? <Spinner /> : list.length === 0 ? (
            <Card>
              <p className="text-sm text-text-2">No customers yet. Add your first logo or name.</p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {list.map((row) => (
                <Card key={row.id} className="flex flex-wrap items-center gap-4 justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-16 h-10 rounded-sm bg-surface border border-border flex items-center justify-center overflow-hidden shrink-0">
                      {row.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.logo_url} alt="" className="max-h-8 max-w-full object-contain" />
                      ) : (
                        <span className="text-[10px] text-text-3 px-1 truncate">{row.name}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{row.name}</p>
                      <p className="text-xs text-text-2">
                        Order {row.sort_order}
                        {row.website_url ? ` · ${row.website_url}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleActive(row)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-sm ${
                        row.is_active
                          ? 'bg-status-green-dim text-status-green'
                          : 'bg-surface text-text-2'
                      }`}
                    >
                      {row.is_active ? 'Visible' : 'Hidden'}
                    </button>
                    <Button variant="ghost" onClick={() => openEdit(row)}>Edit</Button>
                    <Button variant="ghost" onClick={() => handleDelete(row)}>Delete</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title={editing ? 'Edit customer' : 'Add customer'}
        >
          <div className="space-y-4">
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Company or customer name"
            />
            <Input
              label="Website (optional)"
              value={form.website_url}
              onChange={(e) => setForm((f) => ({ ...f, website_url: e.target.value }))}
              placeholder="https://"
            />
            <Input
              label="Sort order"
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              Show on landing page
            </label>

            <div>
              <p className="label-ui mb-2">Logo (optional)</p>
              {preview && !clearLogo && (
                <div className="mb-2 p-3 rounded-sm bg-surface border border-border inline-flex">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="" className="max-h-12 max-w-[160px] object-contain" />
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={onPickFile}
                />
                <Button type="button" variant="ghost" onClick={() => fileRef.current?.click()}>
                  Upload logo
                </Button>
                {(preview || editing?.logo_url) && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setClearLogo(true);
                      setImageBase64(null);
                      setPreview(null);
                    }}
                  >
                    Remove logo
                  </Button>
                )}
              </div>
              <p className="text-xs text-text-2 mt-1">PNG or JPG. Name shows if no logo.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save' : 'Add'}
              </Button>
            </div>
          </div>
        </Modal>
      </Layout>
    </>
  );
}
