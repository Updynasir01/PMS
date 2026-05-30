'use strict';

import { query, queryOne } from './db';

/** Resolve QR token to unit + optional tenant context */
export async function resolveQrToken(token) {
  if (!token || typeof token !== 'string') return null;
  return queryOne(
    `SELECT u.id AS unit_id, u.unit_number, u.floor, u.bedrooms, u.has_kitchen, u.toilets,
            u.is_furnished, u.monthly_rent_usd, u.status,
            p.id AS property_id, p.name AS property_name, p.district, p.address,
            t.id AS tenant_id, t.owner_id, t.user_id AS tenant_user_id,
            usr.full_name AS tenant_name, usr.phone AS tenant_phone
     FROM units u
     JOIN properties p ON u.property_id = p.id
     LEFT JOIN tenants t ON t.unit_id = u.id
     LEFT JOIN users usr ON t.user_id = usr.id
     WHERE u.qr_token = $1`,
    [token.trim()]
  );
}

export async function getPortalDashboard(ctx) {
  const month = new Date().toISOString().slice(0, 7);

  const unit = {
    unit_number: ctx.unit_number,
    floor: ctx.floor,
    bedrooms: ctx.bedrooms,
    has_kitchen: ctx.has_kitchen,
    toilets: ctx.toilets,
    is_furnished: ctx.is_furnished,
    monthly_rent_usd: ctx.monthly_rent_usd,
    status: ctx.status,
    property_name: ctx.property_name,
    district: ctx.district,
    address: ctx.address,
  };

  if (!ctx.tenant_id) {
    return {
      unit,
      property: { name: ctx.property_name, district: ctx.district, address: ctx.address },
      tenant: null,
      lease: null,
      currentPayment: null,
      paymentHistory: [],
      maintenanceRequests: [],
      currentMonth: month,
    };
  }

  const lease = await queryOne(
    "SELECT * FROM leases WHERE tenant_id=$1 AND status='active' ORDER BY created_at DESC LIMIT 1",
    [ctx.tenant_id]
  );

  const currentPayment = await queryOne(
    'SELECT * FROM payments WHERE tenant_id=$1 AND payment_month=$2 ORDER BY created_at DESC LIMIT 1',
    [ctx.tenant_id, month]
  );

  const paymentHistory = await query(
    `SELECT p.*, un.unit_number, pr.name AS property_name
     FROM payments p
     JOIN units un ON p.unit_id = un.id
     JOIN properties pr ON p.property_id = pr.id
     WHERE p.tenant_id = $1
     ORDER BY p.due_date DESC`,
    [ctx.tenant_id]
  );

  const maintenanceRequests = await query(
    'SELECT * FROM maintenance_requests WHERE tenant_id=$1 ORDER BY created_at DESC',
    [ctx.tenant_id]
  );

  return {
    unit,
    property: { name: ctx.property_name, district: ctx.district, address: ctx.address },
    tenant: { full_name: ctx.tenant_name, phone: ctx.tenant_phone },
    lease,
    currentPayment,
    paymentHistory,
    maintenanceRequests,
    currentMonth: month,
  };
}
