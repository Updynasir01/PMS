import { query, queryOne } from '../../../lib/db';
import { withErrorHandler } from '../../../lib/api';

export default withErrorHandler(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token required' });

  const row = await queryOne(
    `SELECT u.id, u.unit_number, u.floor, u.bedrooms, u.has_kitchen, u.toilets, u.is_furnished,
            u.monthly_rent_usd, u.status, u.qr_token,
            p.name AS property_name, p.district, p.address,
            t.id AS tenant_id,
            usr.full_name AS tenant_name, usr.phone AS tenant_phone
     FROM units u
     JOIN properties p ON u.property_id = p.id
     LEFT JOIN tenants t ON t.unit_id = u.id
     LEFT JOIN users usr ON t.user_id = usr.id
     WHERE u.qr_token = $1`,
    [token]
  );

  if (!row) return res.status(404).json({ error: 'Unit not found' });

  const month = new Date().toISOString().slice(0, 7);
  let currentPayment = null;
  let paymentHistory = [];

  if (row.tenant_id) {
    currentPayment = await queryOne(
      `SELECT amount_usd, status, payment_month, due_date, paid_date, payment_method
       FROM payments
       WHERE tenant_id = $1 AND payment_month = $2
       ORDER BY created_at DESC LIMIT 1`,
      [row.tenant_id, month]
    );

    paymentHistory = await query(
      `SELECT payment_month, amount_usd, status, due_date, paid_date
       FROM payments
       WHERE tenant_id = $1
       ORDER BY payment_month DESC
       LIMIT 6`,
      [row.tenant_id]
    );
  }

  res.json({
    unit: {
      unit_number: row.unit_number,
      floor: row.floor,
      bedrooms: row.bedrooms,
      has_kitchen: row.has_kitchen,
      toilets: row.toilets,
      is_furnished: row.is_furnished,
      monthly_rent_usd: row.monthly_rent_usd,
      status: row.status,
    },
    property: {
      name: row.property_name,
      district: row.district,
      address: row.address,
    },
    tenant: row.tenant_id
      ? { full_name: row.tenant_name, phone: row.tenant_phone }
      : null,
    currentPayment,
    paymentHistory,
    currentMonth: month,
  });
});
