/**
 * CREATE TABLE IF NOT EXISTS unit_checklists (...);
 */
import { query, queryOne, execute } from '../../../lib/db';
import { requireRole, getOwnerProfileId } from '../../../lib/auth';
import { withErrorHandler, sanitize } from '../../../lib/api';
import { emptyChecklist } from '../../../lib/checklist';

export default withErrorHandler(async function handler(req, res) {
  const user = await requireRole(req, 'owner');
  const ownerId = await getOwnerProfileId(user.id);
  if (!ownerId) return res.status(403).json({ error: 'Owner profile not found' });

  if (req.method === 'GET') {
    const { unit_id, type } = req.query;
    if (!unit_id || !type) return res.status(400).json({ error: 'unit_id and type required' });
    const row = await queryOne(
      `SELECT uc.* FROM unit_checklists uc
       JOIN units u ON uc.unit_id = u.id
       JOIN properties p ON u.property_id = p.id
       WHERE uc.unit_id = $1 AND uc.type = $2 AND p.owner_id = $3
       ORDER BY uc.created_at DESC LIMIT 1`,
      [unit_id, type, ownerId]
    );
    return res.json(row || null);
  }

  if (req.method === 'POST') {
    const {
      unit_id, tenant_id, type, checklist_data, condition_notes,
      deposit_deduction_usd, deduction_reason, mark_complete,
    } = req.body || {};
    if (!unit_id || !type) return res.status(400).json({ error: 'unit_id and type required' });

    const unit = await queryOne(
      'SELECT u.id FROM units u JOIN properties p ON u.property_id = p.id WHERE u.id = $1 AND p.owner_id = $2',
      [unit_id, ownerId]
    );
    if (!unit) return res.status(404).json({ error: 'Unit not found' });

    const data = { ...emptyChecklist(), ...(checklist_data || {}) };
    const { rows: [row] } = await execute(
      `INSERT INTO unit_checklists (unit_id, tenant_id, type, checklist_data, condition_notes, deposit_deduction_usd, deduction_reason, completed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        unit_id,
        tenant_id || null,
        type,
        JSON.stringify(data),
        condition_notes ? sanitize(condition_notes) : null,
        deposit_deduction_usd || 0,
        deduction_reason ? sanitize(deduction_reason) : null,
        mark_complete ? new Date() : null,
      ]
    );
    return res.status(201).json(row);
  }

  if (req.method === 'PATCH') {
    const { id, checklist_data, condition_notes, mark_complete } = req.body || {};
    const existing = await queryOne(
      `SELECT uc.id FROM unit_checklists uc
       JOIN units u ON uc.unit_id = u.id
       JOIN properties p ON u.property_id = p.id
       WHERE uc.id = $1 AND p.owner_id = $2`,
      [id, ownerId]
    );
    if (!existing) return res.status(404).json({ error: 'Checklist not found' });

    await execute(
      `UPDATE unit_checklists SET
         checklist_data = COALESCE($1, checklist_data),
         condition_notes = COALESCE($2, condition_notes),
         completed_at = CASE WHEN $3 THEN NOW() ELSE completed_at END
       WHERE id = $4`,
      [
        checklist_data ? JSON.stringify(checklist_data) : null,
        condition_notes != null ? sanitize(condition_notes) : null,
        !!mark_complete,
        id,
      ]
    );
    const updated = await queryOne('SELECT * FROM unit_checklists WHERE id = $1', [id]);
    return res.json(updated);
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
