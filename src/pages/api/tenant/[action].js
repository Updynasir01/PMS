import { query, queryOne, execute } from '../../../lib/db';
import { requireRole, getTenantProfile } from '../../../lib/auth';
import { withErrorHandler, logActivity, sanitize } from '../../../lib/api';
import { notifyMaintenanceNew, notifyMaintenanceMessage } from '../../../lib/notifications';

export default withErrorHandler(async function handler(req, res) {
  const user = await requireRole(req, 'tenant');
  const tenantProfile = await getTenantProfile(user.id);
  if (!tenantProfile) return res.status(403).json({ error: 'Tenant profile not found' });

  const { action } = req.query;
  const routes = {
    GET: {
      dashboard: () => getDashboard(res, tenantProfile),
      payments: () => getPayments(res, tenantProfile),
      maintenance: () => getMaintenance(res, tenantProfile),
      'maintenance-detail': () => getMaintenanceDetail(req, res, tenantProfile),
    },
    POST: {
      maintenance: () => createMaintenance(req, res, user, tenantProfile),
      'maintenance-message': () => sendMessage(req, res, user, tenantProfile),
    },
  };

  const h = routes[req.method]?.[action];
  if (!h) return res.status(404).json({ error: 'Not found' });
  await h();
});

async function getDashboard(res, tenant) {
  const month = new Date().toISOString().slice(0, 7);

  const unit = tenant.unit_id ? await queryOne(`
    SELECT u.*, p.name as property_name, p.district, p.address
    FROM units u JOIN properties p ON u.property_id=p.id WHERE u.id=$1
  `, [tenant.unit_id]) : null;

  const lease = await queryOne(
    "SELECT * FROM leases WHERE tenant_id=$1 AND status='active' ORDER BY created_at DESC LIMIT 1",
    [tenant.id]
  );

  const currentPayment = await queryOne(
    'SELECT * FROM payments WHERE tenant_id=$1 AND payment_month=$2 ORDER BY created_at DESC LIMIT 1',
    [tenant.id, month]
  );

  const paymentHistory = await query(
    'SELECT * FROM payments WHERE tenant_id=$1 ORDER BY due_date DESC LIMIT 24',
    [tenant.id]
  );

  const maintenanceRequests = await query(
    'SELECT * FROM maintenance_requests WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 20',
    [tenant.id]
  );

  res.json({ unit, lease, currentPayment, paymentHistory, maintenanceRequests });
}

async function getPayments(res, tenant) {
  const payments = await query(`
    SELECT p.*, un.unit_number, pr.name as property_name
    FROM payments p
    JOIN units un ON p.unit_id=un.id
    JOIN properties pr ON p.property_id=pr.id
    WHERE p.tenant_id=$1 ORDER BY p.due_date DESC
  `, [tenant.id]);
  res.json(payments);
}

async function getMaintenance(res, tenant) {
  const requests = await query(
    'SELECT * FROM maintenance_requests WHERE tenant_id=$1 ORDER BY created_at DESC',
    [tenant.id]
  );
  res.json(requests);
}

async function createMaintenance(req, res, user, tenant) {
  const { type, title, description, priority } = req.body || {};
  if (!type || !title || !description) return res.status(400).json({ error: 'Type, title, description required' });
  if (!tenant.unit_id) return res.status(400).json({ error: 'No unit assigned' });

  const unit = await queryOne('SELECT property_id FROM units WHERE id=$1', [tenant.unit_id]);
  const { rows: [mr] } = await execute(
    `INSERT INTO maintenance_requests (tenant_id,unit_id,property_id,owner_id,type,title,description,priority)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [tenant.id, tenant.unit_id, unit.property_id, tenant.owner_id,
     type, sanitize(title.trim()), sanitize(description.trim()), priority || 'medium']
  );
  await logActivity(user.id, 'create', 'maintenance', mr.id, `Submitted request: ${title}`);
  await notifyMaintenanceNew(mr.id, title, user.full_name);
  res.status(201).json({ success: true, requestId: mr.id });
}

async function getMaintenanceDetail(req, res, tenant) {
  const { id } = req.query;
  const request = await queryOne(
    'SELECT * FROM maintenance_requests WHERE id=$1 AND tenant_id=$2', [id, tenant.id]
  );
  if (!request) return res.status(404).json({ error: 'Request not found' });

  const messages = await query(`
    SELECT mm.*, u.full_name, u.role
    FROM maintenance_messages mm JOIN users u ON mm.sender_id=u.id
    WHERE mm.request_id=$1 ORDER BY mm.created_at ASC
  `, [id]);
  res.json({ ...request, messages });
}

async function sendMessage(req, res, user, tenant) {
  const { request_id, message } = req.body || {};
  if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

  const mr = await queryOne(
    'SELECT id FROM maintenance_requests WHERE id=$1 AND tenant_id=$2', [request_id, tenant.id]
  );
  if (!mr) return res.status(404).json({ error: 'Request not found' });

  await execute(
    "INSERT INTO maintenance_messages (request_id,sender_id,sender_role,message) VALUES ($1,$2,'tenant',$3)",
    [request_id, user.id, sanitize(message.trim())]
  );
  await execute('UPDATE maintenance_requests SET updated_at=NOW() WHERE id=$1', [request_id]);
  await notifyMaintenanceMessage(request_id, user.id, 'tenant');
  res.status(201).json({ success: true });
}
