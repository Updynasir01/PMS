import { query, queryOne, execute } from '../../../lib/db';
import { requireRole } from '../../../lib/auth';
import { withErrorHandler, sanitize, logActivity } from '../../../lib/api';

async function getCaretaker(userId) {
  return queryOne('SELECT * FROM caretakers WHERE user_id = $1', [userId]);
}

function propertyFilter(caretaker, alias = 'p') {
  const ids = caretaker.property_ids || [];
  if (!ids.length) return '1=0';
  return `${alias}.id = ANY('{${ids.join(',')}}'::int[])`;
}

export default withErrorHandler(async function handler(req, res) {
  const user = await requireRole(req, 'caretaker');
  const caretaker = await getCaretaker(user.id);
  if (!caretaker) return res.status(403).json({ error: 'Caretaker profile not found' });

  const { action } = req.query;
  const routes = {
    GET: {
      dashboard: () => getDashboard(res, caretaker),
      maintenance: () => getMaintenance(res, caretaker),
      'maintenance-detail': () => getMaintenanceDetail(req, res, caretaker),
      units: () => getUnits(req, res, caretaker),
    },
    POST: {
      'maintenance-message': () => sendMessage(req, res, user, caretaker),
    },
    PATCH: {
      maintenance: () => updateMaintenance(req, res, user, caretaker),
    },
  };

  const h = routes[req.method]?.[action];
  if (!h) return res.status(404).json({ error: 'Not found' });
  await h();
});

async function getDashboard(res, caretaker) {
  const properties = await query(
    `SELECT p.*,
      COUNT(un.id)::int AS total_units,
      COUNT(CASE WHEN un.status = 'occupied' THEN 1 END)::int AS occupied_units,
      COUNT(CASE WHEN un.status = 'vacant' THEN 1 END)::int AS vacant_units
     FROM properties p
     LEFT JOIN units un ON un.property_id = p.id
     WHERE p.id = ANY($1::int[])
     GROUP BY p.id ORDER BY p.name`,
    [caretaker.property_ids || []]
  );

  const openMaintenance = await query(
    `SELECT mr.id, mr.title, mr.status, mr.priority, mr.type, mr.created_at,
            u.full_name AS tenant_name, un.unit_number, pr.name AS property_name
     FROM maintenance_requests mr
     JOIN tenants t ON mr.tenant_id = t.id
     JOIN users u ON t.user_id = u.id
     JOIN units un ON mr.unit_id = un.id
     JOIN properties pr ON mr.property_id = pr.id
     WHERE mr.property_id = ANY($1::int[]) AND mr.status != 'completed'
     ORDER BY mr.created_at DESC LIMIT 15`,
    [caretaker.property_ids || []]
  );

  res.json({ properties, openMaintenance });
}

async function getUnits(req, res, caretaker) {
  const units = await query(
    `SELECT un.id, un.unit_number, un.status, un.floor, pr.name AS property_name
     FROM units un
     JOIN properties pr ON un.property_id = pr.id
     WHERE pr.id = ANY($1::int[])
     ORDER BY pr.name, un.unit_number`,
    [caretaker.property_ids || []]
  );
  res.json(units);
}

async function getMaintenance(res, caretaker) {
  const requests = await query(
    `SELECT mr.id, mr.title, mr.description, mr.type, mr.priority, mr.status,
            mr.created_at, mr.assigned_technician,
            u.full_name AS tenant_name, un.unit_number, pr.name AS property_name
     FROM maintenance_requests mr
     JOIN tenants t ON mr.tenant_id = t.id
     JOIN users u ON t.user_id = u.id
     JOIN units un ON mr.unit_id = un.id
     JOIN properties pr ON mr.property_id = pr.id
     WHERE mr.property_id = ANY($1::int[])
     ORDER BY mr.created_at DESC`,
    [caretaker.property_ids || []]
  );
  res.json(requests);
}

async function getMaintenanceDetail(req, res, caretaker) {
  const { id } = req.query;
  const request = await queryOne(
    `SELECT mr.*, u.full_name AS tenant_name, un.unit_number, pr.name AS property_name
     FROM maintenance_requests mr
     JOIN tenants t ON mr.tenant_id = t.id
     JOIN users u ON t.user_id = u.id
     JOIN units un ON mr.unit_id = un.id
     JOIN properties pr ON mr.property_id = pr.id
     WHERE mr.id = $1 AND mr.property_id = ANY($2::int[])`,
    [id, caretaker.property_ids || []]
  );
  if (!request) return res.status(404).json({ error: 'Request not found' });

  const messages = await query(
    `SELECT mm.*, u.full_name, u.role
     FROM maintenance_messages mm JOIN users u ON mm.sender_id = u.id
     WHERE mm.request_id = $1 ORDER BY mm.created_at ASC`,
    [id]
  );
  res.json({ ...request, messages });
}

async function updateMaintenance(req, res, user, caretaker) {
  const { id, status, assigned_technician } = req.body || {};
  const mr = await queryOne(
    'SELECT id FROM maintenance_requests WHERE id = $1 AND property_id = ANY($2::int[])',
    [id, caretaker.property_ids || []]
  );
  if (!mr) return res.status(404).json({ error: 'Request not found' });

  await execute(
    'UPDATE maintenance_requests SET status=$1, assigned_technician=$2, updated_at=NOW() WHERE id=$3',
    [status, assigned_technician ? sanitize(assigned_technician) : null, id]
  );
  await logActivity(user.id, 'update', 'maintenance', id, `Caretaker updated request ${id}`);
  res.json({ success: true });
}

async function sendMessage(req, res, user, caretaker) {
  const { request_id, message } = req.body || {};
  if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

  const mr = await queryOne(
    'SELECT id FROM maintenance_requests WHERE id = $1 AND property_id = ANY($2::int[])',
    [request_id, caretaker.property_ids || []]
  );
  if (!mr) return res.status(404).json({ error: 'Request not found' });

  await execute(
    "INSERT INTO maintenance_messages (request_id, sender_id, sender_role, message) VALUES ($1, $2, 'owner', $3)",
    [request_id, user.id, sanitize(message.trim())]
  );
  await execute('UPDATE maintenance_requests SET updated_at=NOW() WHERE id=$1', [request_id]);
  res.status(201).json({ success: true });
}
