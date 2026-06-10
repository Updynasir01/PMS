import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query, queryOne, execute } from '../../../lib/db';
import { requireRole, getOwnerProfileId } from '../../../lib/auth';
import { withErrorHandler, logActivity, sanitize } from '../../../lib/api';
import { generateQrToken } from '../../../lib/qrToken';
import { assertOwnerCanAddUnit } from '../../../lib/ownerLimits';
import { makeUniqueTenantUsername } from '../../../lib/tenantCredentials';
import {
  notifyMaintenanceMessage,
  notifyMaintenanceStatus,
  notifyPaymentStatusChange,
  notifyPaymentGenerated,
} from '../../../lib/notifications';

export default withErrorHandler(async function handler(req, res) {
  const user = await requireRole(req, 'superadmin', 'owner');

  let ownerId;
  if (user.role === 'superadmin') {
    ownerId = req.query.owner_id ? parseInt(req.query.owner_id) : null;
  } else {
    ownerId = await getOwnerProfileId(user.id);
    if (!ownerId) return res.status(403).json({ error: 'Owner profile not found' });
  }

  const { action } = req.query;
  const routes = {
    GET: {
      dashboard: () => getDashboard(res, ownerId),
      properties: () => getProperties(res, ownerId),
      units: () => getUnits(req, res, ownerId),
      tenants: () => getTenants(res, ownerId),
      payments: () => getPayments(req, res, ownerId),
      maintenance: () => getMaintenance(res, ownerId),
      'maintenance-detail': () => getMaintenanceDetail(req, res, ownerId),
    },
    POST: {
      properties: () => createProperty(req, res, user, ownerId),
      units: () => createUnit(req, res, user, ownerId),
      tenants: () => createTenant(req, res, user, ownerId),
      'generate-payments': () => generatePayments(req, res, user, ownerId),
      'generate-qr-token': () => generateUnitQrToken(req, res, user, ownerId),
      'maintenance-message': () => sendMessage(req, res, user, ownerId),
    },
    PATCH: {
      payments: () => updatePayment(req, res, user, ownerId),
      maintenance: () => updateMaintenance(req, res, user, ownerId),
      'renew-lease': () => renewLease(req, res, user, ownerId),
    },
  };

  const h = routes[req.method]?.[action];
  if (!h) return res.status(404).json({ error: 'Not found' });
  await h();
});

async function getDashboard(res, ownerId) {
  const month = new Date().toISOString().slice(0, 7);
  const properties = await query(`
    SELECT p.*,
      COUNT(un.id) as total_units,
      COUNT(CASE WHEN un.status='occupied' THEN 1 END) as occupied_units,
      COUNT(CASE WHEN un.status='vacant' THEN 1 END) as vacant_units
    FROM properties p LEFT JOIN units un ON un.property_id=p.id
    WHERE p.owner_id=$1 GROUP BY p.id ORDER BY p.created_at DESC
  `, [ownerId]);

  const revenue = await queryOne(`
    SELECT
      COALESCE(SUM(CASE WHEN status='paid' THEN amount_usd ELSE 0 END),0) as collected,
      COALESCE(SUM(CASE WHEN status='pending' THEN amount_usd ELSE 0 END),0) as pending,
      COALESCE(SUM(CASE WHEN status='overdue' THEN amount_usd ELSE 0 END),0) as overdue
    FROM payments WHERE owner_id=$1 AND payment_month=$2
  `, [ownerId, month]);

  const pendingMaintenance = await query(`
    SELECT mr.*, u.full_name as tenant_name, un.unit_number, pr.name as property_name
    FROM maintenance_requests mr
    JOIN tenants t ON mr.tenant_id=t.id
    JOIN users u ON t.user_id=u.id
    JOIN units un ON mr.unit_id=un.id
    JOIN properties pr ON mr.property_id=pr.id
    WHERE mr.owner_id=$1 AND mr.status!='completed'
    ORDER BY mr.created_at DESC LIMIT 10
  `, [ownerId]);

  const tenants = await query(`
    SELECT t.*, u.full_name, u.phone, un.unit_number, un.monthly_rent_usd, pr.name as property_name,
      (SELECT status FROM payments WHERE tenant_id=t.id AND payment_month=$2 ORDER BY created_at DESC LIMIT 1) as current_payment_status
    FROM tenants t
    JOIN users u ON t.user_id=u.id
    LEFT JOIN units un ON t.unit_id=un.id
    LEFT JOIN properties pr ON un.property_id=pr.id
    WHERE t.owner_id=$1 ORDER BY u.full_name
  `, [ownerId, month]);

  const expenseRow = await queryOne(
    `SELECT COALESCE(SUM(amount_usd), 0) AS total
     FROM expenses WHERE owner_id = $1 AND to_char(expense_date, 'YYYY-MM') = $2`,
    [ownerId, month]
  );

  const leaseAlerts = await query(
    `SELECT l.id, l.end_date, u.full_name AS tenant_name, un.unit_number, pr.name AS property_name,
            (l.end_date - CURRENT_DATE) AS days_remaining
     FROM leases l
     JOIN tenants t ON l.tenant_id = t.id
     JOIN users u ON t.user_id = u.id
     JOIN units un ON l.unit_id = un.id
     JOIN properties pr ON un.property_id = pr.id
     WHERE t.owner_id = $1 AND l.status = 'active' AND l.end_date IS NOT NULL
       AND l.end_date <= CURRENT_DATE + INTERVAL '30 days'
     ORDER BY l.end_date ASC LIMIT 10`,
    [ownerId]
  );

  const collected = +revenue.collected;
  const totalExpenses = +expenseRow.total;

  res.json({
    properties,
    revenue: { collected, pending: +revenue.pending, overdue: +revenue.overdue },
    expenseSummary: { totalExpenses, netProfit: collected - totalExpenses },
    leaseAlerts: leaseAlerts.map((l) => ({ ...l, days_remaining: Number(l.days_remaining) })),
    pendingMaintenance,
    tenants,
  });
}

async function renewLease(req, res, user, ownerId) {
  const { lease_id, end_date } = req.body || {};
  if (!lease_id || !end_date) return res.status(400).json({ error: 'lease_id and end_date required' });

  const lease = await queryOne(
    `SELECT l.* FROM leases l
     JOIN tenants t ON l.tenant_id = t.id
     WHERE l.id = $1 AND t.owner_id = $2`,
    [lease_id, ownerId]
  );
  if (!lease) return res.status(404).json({ error: 'Lease not found' });

  await execute('UPDATE leases SET end_date = $1, updated_at = NOW() WHERE id = $2', [end_date, lease_id]);
  await logActivity(user.id, 'renew_lease', 'lease', lease_id, `Lease renewed until ${end_date}`);
  res.json({ success: true, end_date });
}

async function getProperties(res, ownerId) {
  const props = await query(`
    SELECT p.*,
      COUNT(un.id) as total_units,
      COUNT(CASE WHEN un.status='occupied' THEN 1 END) as occupied_units,
      COUNT(CASE WHEN un.status='vacant' THEN 1 END) as vacant_units
    FROM properties p LEFT JOIN units un ON un.property_id=p.id
    WHERE p.owner_id=$1 GROUP BY p.id ORDER BY p.created_at DESC
  `, [ownerId]);
  res.json(props);
}

async function createProperty(req, res, user, ownerId) {
  const { name, district, address, type, description } = req.body || {};
  if (!name || !district || !address) return res.status(400).json({ error: 'Name, district, address required' });

  const { rows: [p] } = await execute(
    'INSERT INTO properties (owner_id,name,district,address,type,description) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
    [ownerId, sanitize(name.trim()), sanitize(district.trim()), sanitize(address.trim()),
     type || 'apartment', description ? sanitize(description.trim()) : null]
  );
  await logActivity(user.id, 'create', 'property', p.id, `Created property: ${name}`);
  res.status(201).json({ success: true, propertyId: p.id });
}

async function getUnits(req, res, ownerId) {
  const { property_id } = req.query;
  const prop = await queryOne('SELECT id FROM properties WHERE id=$1 AND owner_id=$2', [property_id, ownerId]);
  if (!prop) return res.status(404).json({ error: 'Property not found' });

  const units = await query(`
    SELECT u.*,
      ten.id as tenant_id, usr.full_name as tenant_name, usr.phone as tenant_phone,
      (SELECT status FROM payments WHERE unit_id=u.id ORDER BY due_date DESC LIMIT 1) as last_payment_status,
      (SELECT photo_url FROM unit_photos WHERE unit_id=u.id AND is_primary=true LIMIT 1) as primary_photo,
      EXISTS(
        SELECT 1 FROM unit_checklists uc
        WHERE uc.unit_id=u.id AND uc.type='move_in' AND uc.completed_at IS NOT NULL
      ) as move_in_checklist_done
    FROM units u
    LEFT JOIN tenants ten ON ten.unit_id=u.id
    LEFT JOIN users usr ON ten.user_id=usr.id
    WHERE u.property_id=$1 ORDER BY u.unit_number
  `, [property_id]);
  res.json(units);
}

async function generateUnitQrToken(req, res, user, ownerId) {
  const { unit_id } = req.body || {};
  if (!unit_id) return res.status(400).json({ error: 'unit_id is required' });

  const unit = await queryOne(
    `SELECT u.id, u.qr_token, u.unit_number FROM units u
     JOIN properties p ON u.property_id = p.id
     WHERE u.id = $1 AND p.owner_id = $2`,
    [unit_id, ownerId]
  );
  if (!unit) return res.status(404).json({ error: 'Unit not found' });

  if (unit.qr_token) {
    return res.json({ success: true, qr_token: unit.qr_token });
  }

  const qr_token = generateQrToken();
  await execute('UPDATE units SET qr_token = $1 WHERE id = $2', [qr_token, unit_id]);
  await logActivity(user.id, 'update', 'unit', unit.id, `Generated QR token for unit ${unit.unit_number}`);
  res.json({ success: true, qr_token });
}

async function createUnit(req, res, user, ownerId) {
  const { property_id, unit_number, floor, bedrooms, has_kitchen, toilets, is_furnished, monthly_rent_usd, notes } = req.body || {};
  if (!property_id || !unit_number || !monthly_rent_usd) {
    return res.status(400).json({ error: 'Property, unit number and rent are required' });
  }
  const prop = await queryOne('SELECT id FROM properties WHERE id=$1 AND owner_id=$2', [property_id, ownerId]);
  if (!prop) return res.status(404).json({ error: 'Property not found' });

  const limit = await assertOwnerCanAddUnit(ownerId);
  if (!limit.ok) return res.status(403).json({ error: limit.error });

  try {
    const qr_token = generateQrToken();
    const { rows: [u] } = await execute(
      `INSERT INTO units (property_id,unit_number,floor,bedrooms,has_kitchen,toilets,is_furnished,monthly_rent_usd,notes,qr_token)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [property_id, sanitize(unit_number.trim()), floor || 1, bedrooms || 0,
       has_kitchen !== false, toilets || 1, !!is_furnished, monthly_rent_usd,
       notes ? sanitize(notes.trim()) : null, qr_token]
    );
    await execute(
      'UPDATE properties SET total_units=(SELECT COUNT(*) FROM units WHERE property_id=$1) WHERE id=$1',
      [property_id]
    );
    await logActivity(user.id, 'create', 'unit', u.id, `Created unit ${unit_number}`);
    res.status(201).json({ success: true, unitId: u.id });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Unit number already exists in this property' });
    throw e;
  }
}

async function getTenants(res, ownerId) {
  const month = new Date().toISOString().slice(0, 7);
  const tenants = await query(`
    SELECT t.*, u.full_name, u.username, u.phone, u.email, u.is_active,
           un.unit_number, un.monthly_rent_usd, pr.name as property_name, pr.district,
           (SELECT status FROM payments WHERE tenant_id=t.id AND payment_month=$2 ORDER BY created_at DESC LIMIT 1) as current_month_status
    FROM tenants t
    JOIN users u ON t.user_id=u.id
    LEFT JOIN units un ON t.unit_id=un.id
    LEFT JOIN properties pr ON un.property_id=pr.id
    WHERE t.owner_id=$1 ORDER BY u.full_name
  `, [ownerId, month]);
  res.json(tenants);
}

async function createTenant(req, res, user, ownerId) {
  const { full_name, phone, email, unit_id, start_date, end_date,
    monthly_rent_usd, deposit_usd, national_id, emergency_contact, emergency_phone } = req.body || {};

  if (!full_name || !unit_id || !monthly_rent_usd || !start_date) {
    return res.status(400).json({ error: 'Name, unit, rent, and lease start are required' });
  }

  const unit = await queryOne(
    'SELECT u.* FROM units u JOIN properties p ON u.property_id=p.id WHERE u.id=$1 AND p.owner_id=$2',
    [unit_id, ownerId]
  );
  if (!unit) return res.status(404).json({ error: 'Unit not found' });
  if (unit.status === 'occupied') return res.status(409).json({ error: 'Unit is already occupied' });

  const username = await makeUniqueTenantUsername(full_name);
  const hash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
  const client = (await import('../../../lib/db')).getDb();
  const conn = await client.connect();

  try {
    await conn.query('BEGIN');
    const { rows: [newUser] } = await conn.query(
      `INSERT INTO users (username, password_hash, role, full_name, phone, email, is_active)
       VALUES ($1, $2, 'tenant', $3, $4, $5, false) RETURNING id`,
      [
        username,
        hash,
        sanitize(full_name.trim()),
        phone ? sanitize(phone.trim()) : null,
        email ? String(email).trim().toLowerCase() : null,
      ]
    );
    const { rows: [tenant] } = await conn.query(
      `INSERT INTO tenants (user_id,unit_id,owner_id,national_id,emergency_contact,emergency_phone)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [newUser.id, unit_id, ownerId,
       national_id ? sanitize(national_id.trim()) : null,
       emergency_contact ? sanitize(emergency_contact.trim()) : null,
       emergency_phone ? sanitize(emergency_phone.trim()) : null]
    );
    const { rows: [lease] } = await conn.query(
      `INSERT INTO leases (tenant_id,unit_id,start_date,end_date,monthly_rent_usd,deposit_usd,status)
       VALUES ($1,$2,$3,$4,$5,$6,'active') RETURNING id`,
      [tenant.id, unit_id, start_date, end_date || null, monthly_rent_usd, deposit_usd || 0]
    );
    await conn.query("UPDATE units SET status='occupied',updated_at=NOW() WHERE id=$1", [unit_id]);
    const dueDate = start_date.slice(0, 7) + '-01';
    await conn.query(
      `INSERT INTO payments (lease_id,tenant_id,unit_id,property_id,owner_id,amount_usd,payment_month,due_date,status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending')`,
      [lease.id, tenant.id, unit_id, unit.property_id, ownerId, monthly_rent_usd, start_date.slice(0, 7), dueDate]
    );
    await conn.query('COMMIT');
    await logActivity(user.id, 'create', 'tenant', tenant.id, `Registered tenant: ${full_name}`);
    res.status(201).json({ success: true, tenantId: tenant.id });
  } catch (e) {
    await conn.query('ROLLBACK');
    throw e;
  } finally {
    conn.release();
  }
}

async function getPayments(req, res, ownerId) {
  const { status, month } = req.query;
  let q = `
    SELECT p.*, u.full_name as tenant_name, u.phone as tenant_phone, un.unit_number, pr.name as property_name
    FROM payments p
    JOIN tenants t ON p.tenant_id=t.id
    JOIN users u ON t.user_id=u.id
    JOIN units un ON p.unit_id=un.id
    JOIN properties pr ON p.property_id=pr.id
    WHERE p.owner_id=$1
  `;
  const params = [ownerId];
  if (status) { params.push(status); q += ` AND p.status=$${params.length}`; }
  if (month) { params.push(month); q += ` AND p.payment_month=$${params.length}`; }
  q += ' ORDER BY p.due_date DESC LIMIT 100';
  res.json(await query(q, params));
}

async function updatePayment(req, res, user, ownerId) {
  const { id, status, payment_method, paid_date, notes } = req.body || {};
  const payment = await queryOne('SELECT * FROM payments WHERE id=$1 AND owner_id=$2', [id, ownerId]);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });

  const oldStatus = payment.status;
  const paidDate = status === 'paid' ? (paid_date || new Date().toISOString().slice(0, 10)) : null;
  await execute(
    'UPDATE payments SET status=$1,payment_method=$2,paid_date=$3,notes=$4,recorded_by=$5,updated_at=NOW() WHERE id=$6',
    [status, payment_method || null, paidDate, notes ? sanitize(notes) : null, user.id, id]
  );
  await logActivity(user.id, 'payment_update', 'payment', id, `Payment marked ${status}`);
  await notifyPaymentStatusChange(payment, status, oldStatus);
  res.json({ success: true });
}

async function generatePayments(req, res, user, ownerId) {
  const { month } = req.body || {};
  if (!month) return res.status(400).json({ error: 'Month required' });

  const leases = await query(`
    SELECT l.*, un.property_id FROM leases l
    JOIN units un ON l.unit_id=un.id
    JOIN properties pr ON un.property_id=pr.id
    WHERE pr.owner_id=$1 AND l.status='active'
  `, [ownerId]);

  let created = 0;
  for (const lease of leases) {
    const existing = await queryOne('SELECT id FROM payments WHERE lease_id=$1 AND payment_month=$2', [lease.id, month]);
    if (!existing) {
      await execute(
        `INSERT INTO payments (lease_id,tenant_id,unit_id,property_id,owner_id,amount_usd,payment_month,due_date,status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending')`,
        [lease.id, lease.tenant_id, lease.unit_id, lease.property_id, ownerId,
         lease.monthly_rent_usd, month, month + '-01']
      );
      await notifyPaymentGenerated(lease.tenant_id, ownerId, month, lease.monthly_rent_usd);
      created++;
    }
  }
  res.json({ success: true, created, total: leases.length });
}

async function getMaintenance(res, ownerId) {
  const requests = await query(`
    SELECT mr.*, u.full_name as tenant_name, u.phone as tenant_phone,
           un.unit_number, pr.name as property_name
    FROM maintenance_requests mr
    JOIN tenants t ON mr.tenant_id=t.id
    JOIN users u ON t.user_id=u.id
    JOIN units un ON mr.unit_id=un.id
    JOIN properties pr ON mr.property_id=pr.id
    WHERE mr.owner_id=$1 ORDER BY mr.created_at DESC
  `, [ownerId]);
  res.json(requests);
}

async function getMaintenanceDetail(req, res, ownerId) {
  const { id } = req.query;
  const request = await queryOne(`
    SELECT mr.*, u.full_name as tenant_name, un.unit_number, pr.name as property_name
    FROM maintenance_requests mr
    JOIN tenants t ON mr.tenant_id=t.id
    JOIN users u ON t.user_id=u.id
    JOIN units un ON mr.unit_id=un.id
    JOIN properties pr ON mr.property_id=pr.id
    WHERE mr.id=$1 AND mr.owner_id=$2
  `, [id, ownerId]);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  const messages = await query(`
    SELECT mm.*, u.full_name, u.role
    FROM maintenance_messages mm JOIN users u ON mm.sender_id=u.id
    WHERE mm.request_id=$1 ORDER BY mm.created_at ASC
  `, [id]);
  res.json({ ...request, messages });
}

async function updateMaintenance(req, res, user, ownerId) {
  const { id, status, assigned_technician } = req.body || {};
  const mr = await queryOne('SELECT id, status FROM maintenance_requests WHERE id=$1 AND owner_id=$2', [id, ownerId]);
  if (!mr) return res.status(404).json({ error: 'Request not found' });

  await execute(
    `UPDATE maintenance_requests SET
      status=COALESCE($1,status),
      assigned_technician=COALESCE($2,assigned_technician),
      updated_at=NOW() WHERE id=$3`,
    [status || null, assigned_technician ? sanitize(assigned_technician.trim()) : null, id]
  );
  await logActivity(user.id, 'maintenance_update', 'maintenance', id, `Status updated to ${status}`);
  if (status && status !== mr.status) await notifyMaintenanceStatus(id, status);
  res.json({ success: true });
}

async function sendMessage(req, res, user, ownerId) {
  const { request_id, message } = req.body || {};
  if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

  const mr = await queryOne('SELECT id FROM maintenance_requests WHERE id=$1 AND owner_id=$2', [request_id, ownerId]);
  if (!mr) return res.status(404).json({ error: 'Request not found' });

  await execute(
    'INSERT INTO maintenance_messages (request_id,sender_id,sender_role,message) VALUES ($1,$2,$3,$4)',
    [request_id, user.id, user.role, sanitize(message.trim())]
  );
  await execute('UPDATE maintenance_requests SET updated_at=NOW() WHERE id=$1', [request_id]);
  await notifyMaintenanceMessage(request_id, user.id, user.role);
  res.status(201).json({ success: true });
}
