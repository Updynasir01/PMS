import { query } from '../../../lib/db';
import { requireRole, getOwnerProfileId } from '../../../lib/auth';
import { withErrorHandler } from '../../../lib/api';

export default withErrorHandler(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireRole(req, 'owner');
  const ownerId = await getOwnerProfileId(user.id);
  if (!ownerId) return res.status(403).json({ error: 'Owner profile not found' });

  const leases = await query(
    `SELECT l.*, t.id AS tenant_id, u.full_name AS tenant_name, u.phone AS tenant_phone,
            un.unit_number, pr.name AS property_name,
            (l.end_date - CURRENT_DATE) AS days_remaining
     FROM leases l
     JOIN tenants t ON l.tenant_id = t.id
     JOIN users u ON t.user_id = u.id
     JOIN units un ON l.unit_id = un.id
     JOIN properties pr ON un.property_id = pr.id
     WHERE t.owner_id = $1
       AND l.status = 'active'
       AND l.end_date IS NOT NULL
       AND l.end_date <= CURRENT_DATE + INTERVAL '30 days'
     ORDER BY l.end_date ASC`,
    [ownerId]
  );

  res.json(leases.map((l) => ({
    ...l,
    days_remaining: Number(l.days_remaining),
  })));
});
