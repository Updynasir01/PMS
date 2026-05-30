import { query, queryOne } from '../../../lib/db';
import { withErrorHandler } from '../../../lib/api';
import { resolveQrToken } from '../../../lib/qrPortal';

export default withErrorHandler(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { token, id } = req.query;
  if (!token || !id) return res.status(400).json({ error: 'Token and request id required' });

  const ctx = await resolveQrToken(token);
  if (!ctx) return res.status(404).json({ error: 'Unit not found' });
  if (!ctx.tenant_id) return res.status(400).json({ error: 'No tenant assigned to this unit' });

  const request = await queryOne(
    'SELECT * FROM maintenance_requests WHERE id=$1 AND tenant_id=$2',
    [id, ctx.tenant_id]
  );
  if (!request) return res.status(404).json({ error: 'Request not found' });

  const messages = await query(
    `SELECT mm.*, u.full_name, u.role
     FROM maintenance_messages mm
     JOIN users u ON mm.sender_id = u.id
     WHERE mm.request_id = $1
     ORDER BY mm.created_at ASC`,
    [id]
  );

  res.json({ ...request, messages });
});
