'use strict';

import { queryOne } from './db';
import { formatMaxUnits } from './plans';

const UNIT_LIMIT_MSG =
  'You have reached your plan unit limit. Contact PropSync admin to upgrade your subscription.';

export async function getOwnerUnitUsage(ownerId) {
  const row = await queryOne(
    `SELECT o.max_units, o.plan, o.plan_status,
      (SELECT COUNT(*)::int FROM units u
       JOIN properties p ON u.property_id = p.id
       WHERE p.owner_id = o.id) AS unit_count
     FROM owners o WHERE o.id = $1`,
    [ownerId]
  );
  return row;
}

export async function assertOwnerCanAddUnit(ownerId) {
  const owner = await getOwnerUnitUsage(ownerId);
  if (!owner) return { ok: false, error: 'Owner profile not found' };
  const used = Number(owner.unit_count) || 0;
  const max = Number(owner.max_units) || 0;
  if (used >= max) {
    return {
      ok: false,
      error: `${UNIT_LIMIT_MSG} (${used}/${formatMaxUnits(max)} units used).`,
    };
  }
  return { ok: true, used, max };
}
