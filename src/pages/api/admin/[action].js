import bcrypt from 'bcryptjs';
import { query, queryOne, execute } from '../../../lib/db';
import { requireRole } from '../../../lib/auth';
import { withErrorHandler, logActivity, sanitize } from '../../../lib/api';
import { getPlan, computeTrialEnd, nextPlanKey, PLAN_KEYS } from '../../../lib/plans';

export default withErrorHandler(async function handler(req, res) {
  const user = await requireRole(req, 'superadmin');
  const { action } = req.query;

  const routes = {
    GET: {
      stats: () => getStats(res),
      owners: () => getOwners(res),
      payments: () => getPayments(req, res),
      maintenance: () => getMaintenance(res),
      tenants: () => getAllTenants(res),
    },
    POST: {
      owners: () => createOwner(req, res, user),
    },
    PATCH: {
      'owners-toggle': () => toggleOwner(req, res, user),
      'owners-plan': () => updateOwnerPlan(req, res, user),
      'payments-update': () => updatePayment(req, res, user),
    },
  };

  const handler2 = routes[req.method]?.[action];
  if (!handler2) return res.status(404).json({ error: 'Not found' });
  await handler2();
});

async function getStats(res) {
  const month = new Date().toISOString().slice(0, 7);

  const [
    { total_owners }, { total_properties }, { total_units }, { occupied_units }, { vacant_units }
  ] = await Promise.all([
    queryOne('SELECT COUNT(*) as total_owners FROM owners'),
    queryOne('SELECT COUNT(*) as total_properties FROM properties'),
    queryOne('SELECT COUNT(*) as total_units FROM units'),
    queryOne("SELECT COUNT(*) as occupied_units FROM units WHERE status='occupied'"),
    queryOne("SELECT COUNT(*) as vacant_units FROM units WHERE status='vacant'"),
  ]);

  const revenue = await queryOne(`
    SELECT
      COALESCE(SUM(CASE WHEN status='paid' THEN amount_usd ELSE 0 END),0) as collected,
      COALESCE(SUM(CASE WHEN status='pending' THEN amount_usd ELSE 0 END),0) as pending,
      COALESCE(SUM(CASE WHEN status='overdue' THEN amount_usd ELSE 0 END),0) as overdue
    FROM payments WHERE payment_month=$1
  `, [month]);

  const { open_maintenance } = await queryOne(
    "SELECT COUNT(*) as open_maintenance FROM maintenance_requests WHERE status!='completed'"
  );

  const recentPayments = await query(`
    SELECT p.*, u.full_name as tenant_name, un.unit_number, pr.name as property_name
    FROM payments p
    JOIN tenants t ON p.tenant_id=t.id
    JOIN users u ON t.user_id=u.id
    JOIN units un ON p.unit_id=un.id
    JOIN properties pr ON p.property_id=pr.id
    ORDER BY p.updated_at DESC LIMIT 10
  `);

  const recentMaintenance = await query(`
    SELECT mr.*, u.full_name as tenant_name, un.unit_number, pr.name as property_name
    FROM maintenance_requests mr
    JOIN tenants t ON mr.tenant_id=t.id
    JOIN users u ON t.user_id=u.id
    JOIN units un ON mr.unit_id=un.id
    JOIN properties pr ON mr.property_id=pr.id
    ORDER BY mr.created_at DESC LIMIT 8
  `);

  const activityFeed = await query(`
    SELECT al.*, u.full_name, u.role
    FROM activity_log al JOIN users u ON al.user_id=u.id
    ORDER BY al.created_at DESC LIMIT 15
  `);

  const propertiesOccupancy = await query(`
    SELECT p.*, ou.full_name as owner_name,
      COUNT(un.id) as unit_count,
      COUNT(CASE WHEN un.status='occupied' THEN 1 END) as occupied_count
    FROM properties p
    JOIN owners o ON p.owner_id=o.id
    JOIN users ou ON o.user_id=ou.id
    LEFT JOIN units un ON un.property_id=p.id
    GROUP BY p.id, ou.full_name
    ORDER BY p.created_at DESC
  `);

  res.json({
    totalOwners: +total_owners, totalProperties: +total_properties,
    totalUnits: +total_units, occupiedUnits: +occupied_units, vacantUnits: +vacant_units,
    revenue: { collected: +revenue.collected, pending: +revenue.pending, overdue: +revenue.overdue },
    openMaintenance: +open_maintenance,
    recentPayments, recentMaintenance, activityFeed, propertiesOccupancy,
  });
}

async function getOwners(res) {
  const owners = await query(`
    SELECT o.*, u.full_name, u.username, u.phone, u.email, u.is_active, u.created_at as user_created,
      COUNT(DISTINCT p.id) as property_count,
      COUNT(DISTINCT un.id)::int as unit_count
    FROM owners o
    JOIN users u ON o.user_id=u.id
    LEFT JOIN properties p ON p.owner_id=o.id
    LEFT JOIN units un ON un.property_id=p.id
    GROUP BY o.id, u.id
    ORDER BY o.created_at DESC
  `);
  res.json(owners);
}

async function createOwner(req, res, adminUser) {
  const {
    username, password, full_name, phone, email, company_name, address,
    plan = 'starter', trial_days = 60,
  } = req.body || {};
  if (!username || !password || !full_name) {
    return res.status(400).json({ error: 'Username, password and full name are required' });
  }

  const planKey = PLAN_KEYS.includes(plan) ? plan : 'starter';
  const planDef = getPlan(planKey);
  const trialDays = Number(trial_days);
  const hasTrial = trialDays > 0;
  const today = new Date().toISOString().slice(0, 10);
  const trialEnd = hasTrial ? computeTrialEnd(trialDays) : null;

  const existing = await queryOne('SELECT id FROM users WHERE username=$1', [username.toLowerCase().trim()]);
  if (existing) return res.status(409).json({ error: 'Username already taken' });

  const hash = await bcrypt.hash(password, 12);

  const { rows: [newUser] } = await execute(
    `INSERT INTO users (username,password_hash,role,full_name,phone,email)
     VALUES ($1,$2,'owner',$3,$4,$5) RETURNING id`,
    [sanitize(username.toLowerCase().trim()), hash, sanitize(full_name.trim()),
     phone ? sanitize(phone.trim()) : null, email ? sanitize(email.trim()) : null]
  );

  const { rows: [newOwner] } = await execute(
    `INSERT INTO owners (
       user_id, company_name, address, plan, plan_status,
       trial_start, trial_end, max_units, monthly_fee
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [
      newUser.id,
      company_name ? sanitize(company_name.trim()) : null,
      address ? sanitize(address.trim()) : null,
      planKey,
      hasTrial ? 'trial' : 'active',
      hasTrial ? today : null,
      trialEnd,
      planDef.max_units,
      planDef.monthly_fee,
    ]
  );

  await logActivity(adminUser.id, 'create', 'owner', newOwner.id,
    `Created owner: ${full_name} (${planKey}${hasTrial ? `, ${trialDays}d trial` : ''})`);
  res.status(201).json({ success: true, ownerId: newOwner.id });
}

async function updateOwnerPlan(req, res, adminUser) {
  const { id, action, plan, days = 30, months = 1 } = req.body || {};
  if (!id || !action) return res.status(400).json({ error: 'Owner id and action are required' });

  const owner = await queryOne(
    `SELECT o.*, u.full_name,
      (SELECT COUNT(*)::int FROM units u2
       JOIN properties p ON u2.property_id = p.id WHERE p.owner_id = o.id) AS unit_count
     FROM owners o JOIN users u ON o.user_id = u.id WHERE o.id = $1`,
    [id]
  );
  if (!owner) return res.status(404).json({ error: 'Owner not found' });

  const today = new Date().toISOString().slice(0, 10);
  let desc = '';

  switch (action) {
    case 'change_plan':
    case 'upgrade': {
      const planKey = action === 'upgrade'
        ? (nextPlanKey(owner.plan) || owner.plan)
        : (PLAN_KEYS.includes(plan) ? plan : owner.plan);
      const planDef = getPlan(planKey);
      if (owner.unit_count > planDef.max_units) {
        return res.status(400).json({
          error: `Cannot switch to ${planDef.label}: owner has ${owner.unit_count} units (limit ${planDef.max_units}).`,
        });
      }
      await execute(
        'UPDATE owners SET plan=$1, max_units=$2, monthly_fee=$3 WHERE id=$4',
        [planKey, planDef.max_units, planDef.monthly_fee, id]
      );
      desc = `${action === 'upgrade' ? 'Upgraded' : 'Changed'} plan to ${planKey}`;
      break;
    }
    case 'extend_trial': {
      const addDays = Math.max(1, Number(days) || 30);
      const base = owner.trial_end && String(owner.trial_end).slice(0, 10) >= today
        ? String(owner.trial_end).slice(0, 10) : today;
      const endFromBase = new Date(base + 'T12:00:00');
      endFromBase.setDate(endFromBase.getDate() + addDays);
      const trialEnd = endFromBase.toISOString().slice(0, 10);
      await execute(
        `UPDATE owners SET plan_status='trial', trial_start=COALESCE(trial_start, $1::date),
         trial_end=$2, paid_until=NULL WHERE id=$3`,
        [today, trialEnd, id]
      );
      desc = `Extended trial by ${addDays} days (ends ${trialEnd})`;
      break;
    }
    case 'mark_paid': {
      const m = Math.max(1, Number(months) || 1);
      const paidUntil = new Date();
      paidUntil.setMonth(paidUntil.getMonth() + m);
      const paidStr = paidUntil.toISOString().slice(0, 10);
      await execute(
        `UPDATE owners SET plan_status='active', paid_until=$1, trial_end=NULL WHERE id=$2`,
        [paidStr, id]
      );
      desc = `Marked paid until ${paidStr}`;
      break;
    }
    case 'suspend':
      await execute("UPDATE owners SET plan_status='suspended' WHERE id=$1", [id]);
      desc = 'Suspended account';
      break;
    case 'activate':
      await execute("UPDATE owners SET plan_status='active' WHERE id=$1", [id]);
      desc = 'Reactivated account';
      break;
    default:
      return res.status(400).json({ error: 'Unknown action' });
  }

  await logActivity(adminUser.id, 'owner_plan', 'owner', id, `${owner.full_name}: ${desc}`);
  const updated = await queryOne(
    `SELECT o.*, u.full_name, u.username, u.phone, u.email, u.is_active,
      (SELECT COUNT(*)::int FROM units u2
       JOIN properties p ON u2.property_id = p.id WHERE p.owner_id = o.id) AS unit_count
     FROM owners o JOIN users u ON o.user_id = u.id WHERE o.id = $1`,
    [id]
  );
  res.json({ success: true, owner: updated });
}

async function toggleOwner(req, res, adminUser) {
  const { id } = req.body || {};
  const owner = await queryOne(
    'SELECT o.id, u.id as uid, u.is_active FROM owners o JOIN users u ON o.user_id=u.id WHERE o.id=$1', [id]
  );
  if (!owner) return res.status(404).json({ error: 'Owner not found' });

  const newStatus = !owner.is_active;
  await execute('UPDATE users SET is_active=$1 WHERE id=$2', [newStatus, owner.uid]);
  await logActivity(adminUser.id, 'toggle', 'owner', owner.id, `${newStatus ? 'Activated' : 'Deactivated'} owner`);
  res.json({ success: true, is_active: newStatus });
}

async function getPayments(req, res) {
  const { status, month } = req.query;
  let q = `
    SELECT p.*, u.full_name as tenant_name, un.unit_number, pr.name as property_name, pr.district,
           ou.full_name as owner_name
    FROM payments p
    JOIN tenants t ON p.tenant_id=t.id
    JOIN users u ON t.user_id=u.id
    JOIN units un ON p.unit_id=un.id
    JOIN properties pr ON p.property_id=pr.id
    JOIN owners o ON p.owner_id=o.id
    JOIN users ou ON o.user_id=ou.id
    WHERE 1=1
  `;
  const params = [];
  if (status) { params.push(status); q += ` AND p.status=$${params.length}`; }
  if (month) { params.push(month); q += ` AND p.payment_month=$${params.length}`; }
  q += ' ORDER BY p.due_date DESC LIMIT 100';
  res.json(await query(q, params));
}

async function updatePayment(req, res, adminUser) {
  const { id, status, payment_method, paid_date, notes } = req.body || {};
  const payment = await queryOne('SELECT * FROM payments WHERE id=$1', [id]);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });

  const paidDate = status === 'paid' ? (paid_date || new Date().toISOString().slice(0, 10)) : null;
  await execute(
    'UPDATE payments SET status=$1,payment_method=$2,paid_date=$3,notes=$4,recorded_by=$5,updated_at=NOW() WHERE id=$6',
    [status, payment_method || null, paidDate, notes ? sanitize(notes) : null, adminUser.id, id]
  );
  await logActivity(adminUser.id, 'payment_update', 'payment', id, `Payment marked as ${status}`);
  res.json({ success: true });
}

async function getMaintenance(res) {
  const requests = await query(`
    SELECT mr.*, u.full_name as tenant_name, un.unit_number, pr.name as property_name, pr.district
    FROM maintenance_requests mr
    JOIN tenants t ON mr.tenant_id=t.id
    JOIN users u ON t.user_id=u.id
    JOIN units un ON mr.unit_id=un.id
    JOIN properties pr ON mr.property_id=pr.id
    ORDER BY mr.created_at DESC
  `);
  res.json(requests);
}

async function getAllTenants(res) {
  const tenants = await query(`
    SELECT t.*, u.full_name, u.username, u.phone, u.email, u.is_active,
           un.unit_number, un.monthly_rent_usd,
           pr.name as property_name, pr.district,
           ou.full_name as owner_name
    FROM tenants t
    JOIN users u ON t.user_id=u.id
    LEFT JOIN units un ON t.unit_id=un.id
    LEFT JOIN properties pr ON un.property_id=pr.id
    LEFT JOIN owners o ON t.owner_id=o.id
    LEFT JOIN users ou ON o.user_id=ou.id
    ORDER BY t.created_at DESC
  `);
  res.json(tenants);
}
