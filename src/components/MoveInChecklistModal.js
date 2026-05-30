import { useState } from 'react';
import { Modal, Button, Input, Textarea, Checkbox, apiFetch, toast } from './ui';
import { CHECKLIST_LABELS, emptyChecklist } from '../lib/checklist';

export default function MoveInChecklistModal({ open, onClose, unitId, tenantId, type = 'move_in' }) {
  const [data, setData] = useState(emptyChecklist());
  const [notes, setNotes] = useState('');
  const [deduction, setDeduction] = useState('');
  const [deductionReason, setDeductionReason] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await apiFetch('/api/owner/checklist', {
        method: 'POST',
        body: {
          unit_id: unitId,
          tenant_id: tenantId,
          type,
          checklist_data: data,
          condition_notes: notes,
          deposit_deduction_usd: type === 'move_out' ? deduction : 0,
          deduction_reason: deductionReason,
          mark_complete: true,
        },
      });
      toast.success('Checklist saved');
      onClose(true);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => onClose(false)}
      title={type === 'move_in' ? 'Move-in checklist' : 'Move-out checklist'}
      large
      footer={
        <>
          <Button variant="secondary" onClick={() => onClose(false)}>Skip</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save checklist'}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto">
        {Object.keys(CHECKLIST_LABELS).filter((k) => k !== 'meter_reading').map((key) => (
          <Checkbox
            key={key}
            label={CHECKLIST_LABELS[key]}
            checked={!!data[key]}
            onChange={(e) => setData((d) => ({ ...d, [key]: e.target.checked }))}
          />
        ))}
      </div>
      <Input
        label="Meter reading"
        value={data.meter_reading}
        onChange={(e) => setData((d) => ({ ...d, meter_reading: e.target.value }))}
      />
      <Textarea label="Condition notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      {type === 'move_out' && (
        <>
          <Input label="Deposit deduction (USD)" type="number" value={deduction} onChange={(e) => setDeduction(e.target.value)} />
          <Textarea label="Deduction reason" value={deductionReason} onChange={(e) => setDeductionReason(e.target.value)} />
        </>
      )}
    </Modal>
  );
}
