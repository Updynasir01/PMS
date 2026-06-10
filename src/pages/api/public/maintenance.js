import { query, queryOne, execute } from '../../../lib/db';
import { withErrorHandler, sanitize } from '../../../lib/api';
import { resolveQrToken } from '../../../lib/qrPortal';
import { notifyMaintenanceNew, notifyMaintenanceMessage } from '../../../lib/notifications';

const VALID_TYPES = ['electricity', 'plumbing', 'painting', 'ac_cooling', 'other'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

export default withErrorHandler(async function handler(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token required' });

  const ctx = await resolveQrToken(token);
  if (!ctx) return res.status(404).json({ error: 'Unit not found' });

  if (req.method === 'GET') {
    if (!ctx.tenant_id) return res.json([]);
    const requests = await query(
      'SELECT * FROM maintenance_requests WHERE tenant_id=$1 ORDER BY created_at DESC',
      [ctx.tenant_id]
    );
    return res.json(requests);
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { type, title, description, priority } = req.body || {};
  if (!type || !title || !description) {
    return res.status(400).json({ error: 'Type, title, and description are required' });
  }
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid maintenance type' });
  if (priority && !VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: 'Invalid priority' });
  }
  if (!ctx.tenant_id) {
    return res.status(400).json({ error: 'No tenant assigned to this unit' });
  }

  const { rows: [mr] } = await execute(
    `INSERT INTO maintenance_requests (tenant_id, unit_id, property_id, owner_id, type, title, description, priority)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      ctx.tenant_id,
      ctx.unit_id,
      ctx.property_id,
      ctx.owner_id,
      type,
      sanitize(title.trim()),
      sanitize(description.trim()),
      priority || 'medium',
    ]
  );

  const tenant = await queryOne(
    'SELECT u.full_name FROM tenants t JOIN users u ON t.user_id = u.id WHERE t.id = $1',
    [ctx.tenant_id]
  );
  await notifyMaintenanceNew(mr.id, sanitize(title.trim()), tenant?.full_name);

  res.status(201).json({ success: true, requestId: mr.id });
});
