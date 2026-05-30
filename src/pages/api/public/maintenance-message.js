import { queryOne, execute } from '../../../lib/db';
import { withErrorHandler, sanitize } from '../../../lib/api';
import { resolveQrToken } from '../../../lib/qrPortal';

export default withErrorHandler(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token } = req.query;
  const { request_id, message } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Token required' });
  if (!request_id || !message?.trim()) return res.status(400).json({ error: 'Request id and message required' });

  const ctx = await resolveQrToken(token);
  if (!ctx) return res.status(404).json({ error: 'Unit not found' });
  if (!ctx.tenant_id || !ctx.tenant_user_id) {
    return res.status(400).json({ error: 'No tenant assigned to this unit' });
  }

  const mr = await queryOne(
    'SELECT id FROM maintenance_requests WHERE id=$1 AND tenant_id=$2',
    [request_id, ctx.tenant_id]
  );
  if (!mr) return res.status(404).json({ error: 'Request not found' });

  await execute(
    "INSERT INTO maintenance_messages (request_id, sender_id, sender_role, message) VALUES ($1, $2, 'tenant', $3)",
    [request_id, ctx.tenant_user_id, sanitize(message.trim())]
  );
  await execute('UPDATE maintenance_requests SET updated_at=NOW() WHERE id=$1', [request_id]);

  res.status(201).json({ success: true });
});
