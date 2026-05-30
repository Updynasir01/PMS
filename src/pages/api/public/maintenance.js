import { queryOne, execute } from '../../../lib/db';
import { withErrorHandler, sanitize } from '../../../lib/api';

const VALID_TYPES = ['electricity', 'plumbing', 'painting', 'ac_cooling', 'other'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

export default withErrorHandler(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token } = req.query;
  const { type, title, description, priority } = req.body || {};

  if (!token) return res.status(400).json({ error: 'Token required' });
  if (!type || !title || !description) {
    return res.status(400).json({ error: 'Type, title, and description are required' });
  }
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid maintenance type' });
  if (priority && !VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: 'Invalid priority' });
  }

  const unit = await queryOne(
    `SELECT u.id AS unit_id, u.property_id, t.id AS tenant_id, t.owner_id
     FROM units u
     LEFT JOIN tenants t ON t.unit_id = u.id
     WHERE u.qr_token = $1`,
    [token]
  );

  if (!unit) return res.status(404).json({ error: 'Unit not found' });
  if (!unit.tenant_id) {
    return res.status(400).json({ error: 'No tenant assigned to this unit' });
  }

  const { rows: [mr] } = await execute(
    `INSERT INTO maintenance_requests (tenant_id, unit_id, property_id, owner_id, type, title, description, priority)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      unit.tenant_id,
      unit.unit_id,
      unit.property_id,
      unit.owner_id,
      type,
      sanitize(title.trim()),
      sanitize(description.trim()),
      priority || 'medium',
    ]
  );

  res.status(201).json({ success: true, requestId: mr.id });
});
