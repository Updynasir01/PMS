import { useState, useEffect, useRef } from 'react';
import { Modal, Button, Input, Spinner, toast, apiFetch } from './ui';

export default function UnitPhotosModal({ unit, open, onClose }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open || !unit?.id) return;
    setLoading(true);
    apiFetch(`/api/owner/photos?unit_id=${unit.id}`)
      .then(setPhotos)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [open, unit?.id]);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      return toast.error('Only JPG and PNG allowed');
    }
    if (file.size > 2 * 1024 * 1024) return toast.error('Max 2MB per photo');
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise((res, rej) => {
        reader.onload = () => res(reader.result);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const added = await apiFetch('/api/owner/photos', {
        method: 'POST',
        body: { unit_id: unit.id, image_base64: base64, mime_type: file.type },
      });
      setPhotos((prev) => [...prev, added]);
      toast.success('Photo uploaded');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleDelete(id) {
    try {
      await apiFetch(`/api/owner/photos?id=${id}`, { method: 'DELETE' });
      setPhotos((prev) => prev.filter((p) => p.id !== id));
      toast.success('Photo removed');
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Unit ${unit?.unit_number} — Photos`} large
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-text-3">{photos.length}/10 photos · JPG/PNG max 2MB</p>
        <label className="cursor-pointer inline-block">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleUpload} disabled={uploading || photos.length >= 10} />
          <span className="inline-flex px-4 py-2 rounded-sm bg-accent text-white text-sm font-medium">{uploading ? 'Uploading…' : '+ Upload'}</span>
        </label>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((p) => (
            <div key={p.id} className="relative rounded-lg overflow-hidden border border-border">
              {p.is_primary && (
                <span className="absolute top-2 left-2 z-10 text-[10px] bg-accent text-white px-2 py-0.5 rounded-pill">Primary</span>
              )}
              <img src={p.photo_url} alt="" className="w-full h-32 object-cover" />
              <button
                type="button"
                className="absolute bottom-2 right-2 text-xs bg-status-red text-white px-2 py-1 rounded"
                onClick={() => handleDelete(p.id)}
              >
                Delete
              </button>
            </div>
          ))}
          {!photos.length && <p className="col-span-full text-center text-text-3 py-8">No photos yet</p>}
        </div>
      )}
    </Modal>
  );
}
