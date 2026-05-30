import { queryOne } from '../../../lib/db';
import { requireRole, getOwnerProfileId } from '../../../lib/auth';
import { withErrorHandler } from '../../../lib/api';

export default withErrorHandler(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireRole(req, 'owner');
  const ownerId = await getOwnerProfileId(user.id);
  const { tenant_id } = req.query;
  if (!tenant_id) return res.status(400).json({ error: 'tenant_id required' });

  const row = await queryOne(
    `SELECT t.id AS tenant_id, t.national_id, tu.full_name AS tenant_name, tu.phone AS tenant_phone,
            ou.full_name AS landlord_name, ou.phone AS landlord_phone,
            o.company_name, o.address AS owner_address,
            un.unit_number, un.floor, un.bedrooms, un.toilets, un.has_kitchen, un.is_furnished,
            pr.name AS property_name, pr.district, pr.address AS property_address,
            l.start_date, l.end_date, l.monthly_rent_usd, l.deposit_usd
     FROM tenants t
     JOIN users tu ON t.user_id = tu.id
     JOIN owners o ON t.owner_id = o.id
     JOIN users ou ON o.user_id = ou.id
     LEFT JOIN units un ON t.unit_id = un.id
     LEFT JOIN properties pr ON un.property_id = pr.id
     LEFT JOIN LATERAL (
       SELECT start_date, end_date, monthly_rent_usd, deposit_usd
       FROM leases WHERE tenant_id = t.id AND status = 'active'
       ORDER BY created_at DESC LIMIT 1
     ) l ON true
     WHERE t.id = $1 AND t.owner_id = $2`,
    [tenant_id, ownerId]
  );

  if (!row) return res.status(404).json({ error: 'Tenant not found' });

  res.json({
    contractDate: new Date().toISOString().slice(0, 10),
    landlord: {
      full_name: row.landlord_name,
      company_name: row.company_name,
      phone: row.landlord_phone,
      address: row.owner_address,
    },
    tenant: {
      full_name: row.tenant_name,
      national_id: row.national_id,
      phone: row.tenant_phone,
    },
    property: {
      name: row.property_name,
      district: row.district,
      address: row.property_address,
    },
    unit: {
      unit_number: row.unit_number,
      floor: row.floor,
      bedrooms: row.bedrooms,
      toilets: row.toilets,
      has_kitchen: row.has_kitchen,
      is_furnished: row.is_furnished,
    },
    lease: {
      start_date: row.start_date,
      end_date: row.end_date,
      monthly_rent_usd: row.monthly_rent_usd,
      deposit_usd: row.deposit_usd,
    },
  });
});
