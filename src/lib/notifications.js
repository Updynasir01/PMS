'use strict';

import { execute, query, queryOne } from './db';

/**
 * @param {number} userId
 * @param {{ type: string, title: string, body?: string, link?: string, refKey?: string }} n
 */
export async function createNotification(userId, n) {
  if (!userId || !n?.type || !n?.title) return;
  try {
    if (n.refKey) {
      await execute(
        `INSERT INTO notifications (user_id, type, title, body, link, ref_key)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, ref_key) DO NOTHING`,
        [userId, n.type, n.title, n.body || null, n.link || null, n.refKey]
      );
    } else {
      await execute(
        `INSERT INTO notifications (user_id, type, title, body, link)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, n.type, n.title, n.body || null, n.link || null]
      );
    }
  } catch (err) {
    console.error('createNotification failed:', err.message);
  }
}

export async function notifyUsers(userIds, n) {
  const ids = [...new Set(userIds.filter(Boolean))];
  await Promise.all(ids.map((id) => createNotification(id, n)));
}

export async function notifyAdmins(n) {
  const admins = await query("SELECT id FROM users WHERE role = 'superadmin' AND is_active = true");
  await notifyUsers(admins.map((a) => a.id), n);
}

async function getMaintenanceContext(requestId) {
  return queryOne(
    `SELECT mr.*, tu.id AS tenant_user_id, tu.full_name AS tenant_name,
            ou.id AS owner_user_id
     FROM maintenance_requests mr
     JOIN tenants t ON mr.tenant_id = t.id
     JOIN users tu ON t.user_id = tu.id
     JOIN owners o ON mr.owner_id = o.id
     JOIN users ou ON o.user_id = ou.id
     WHERE mr.id = $1`,
    [requestId]
  );
}

async function caretakerUserIdsForProperty(ownerId, propertyId) {
  const rows = await query(
    `SELECT u.id FROM caretakers c
     JOIN users u ON c.user_id = u.id
     WHERE c.owner_id = $1 AND $2 = ANY(c.property_ids) AND u.is_active = true`,
    [ownerId, propertyId]
  );
  return rows.map((r) => r.id);
}

export async function notifyMaintenanceNew(requestId, title, tenantName) {
  const ctx = await getMaintenanceContext(requestId);
  if (!ctx) return;
  const body = `${tenantName || ctx.tenant_name}: ${title}`;
  await createNotification(ctx.owner_user_id, {
    type: 'maintenance_new',
    title: 'New maintenance request',
    body,
    link: `/maintenance/${requestId}`,
    refKey: `mr_new_${requestId}`,
  });
  const caretakers = await caretakerUserIdsForProperty(ctx.owner_id, ctx.property_id);
  await notifyUsers(caretakers, {
    type: 'maintenance_new',
    title: 'New maintenance request',
    body,
    link: `/maintenance/${requestId}`,
    refKey: `mr_new_${requestId}_ct`,
  });
}

export async function notifyMaintenanceStatus(requestId, status) {
  const ctx = await getMaintenanceContext(requestId);
  if (!ctx || !status) return;
  const label = status.replace(/_/g, ' ');
  await createNotification(ctx.tenant_user_id, {
    type: 'maintenance_status',
    title: 'Maintenance update',
    body: `"${ctx.title}" is now ${label}`,
    link: `/maintenance/${requestId}`,
    refKey: `mr_status_${requestId}_${status}`,
  });
}

export async function notifyMaintenanceMessage(requestId, senderUserId, senderRole) {
  const ctx = await getMaintenanceContext(requestId);
  if (!ctx) return;
  const preview = `"${ctx.title}" — new message`;
  const link = `/maintenance/${requestId}`;

  if (senderRole === 'tenant') {
    await createNotification(ctx.owner_user_id, {
      type: 'maintenance_message',
      title: 'New maintenance message',
      body: preview,
      link,
    });
    const caretakers = await caretakerUserIdsForProperty(ctx.owner_id, ctx.property_id);
    await notifyUsers(
      caretakers.filter((id) => id !== senderUserId),
      { type: 'maintenance_message', title: 'New maintenance message', body: preview, link }
    );
  } else {
    if (ctx.tenant_user_id !== senderUserId) {
      await createNotification(ctx.tenant_user_id, {
        type: 'maintenance_message',
        title: 'New maintenance message',
        body: preview,
        link,
      });
    }
  }
}

async function leaseUserIds(tenantId, ownerId) {
  const tenant = await queryOne('SELECT user_id FROM tenants WHERE id = $1', [tenantId]);
  const owner = await queryOne('SELECT user_id FROM owners WHERE id = $1', [ownerId]);
  return { tenantUserId: tenant?.user_id, ownerUserId: owner?.user_id };
}

export async function notifyLeaseCreated(doc, payload) {
  const { tenantUserId } = await leaseUserIds(doc.tenant_id, doc.owner_id);
  const unit = payload?.unit?.unit_number;
  await createNotification(tenantUserId, {
    type: 'lease_created',
    title: 'New lease to sign',
    body: unit ? `Your landlord created a lease for Unit ${unit}` : 'Your landlord created a lease agreement',
    link: '/',
    refKey: `lease_${doc.id}_created`,
  });
}

export async function notifyLeaseSigned(doc, party, payload, fullySigned) {
  const { tenantUserId, ownerUserId } = await leaseUserIds(doc.tenant_id, doc.owner_id);
  const unit = payload?.unit?.unit_number;
  const tenantName = payload?.tenant?.full_name || 'Tenant';
  const unitLabel = unit ? ` · Unit ${unit}` : '';

  if (party === 'landlord') {
    await createNotification(tenantUserId, {
      type: 'lease_sign',
      title: 'Landlord signed lease',
      body: `Please sign your lease${unitLabel}`,
      link: '/',
      refKey: `lease_${doc.id}_landlord_signed`,
    });
  }

  if (party === 'tenant') {
    await createNotification(ownerUserId, {
      type: 'lease_sign',
      title: 'Tenant signed lease',
      body: `${tenantName} signed the lease${unitLabel}`,
      link: '/tenants',
      refKey: `lease_${doc.id}_tenant_signed`,
    });
  }

  if (fullySigned) {
    await createNotification(tenantUserId, {
      type: 'lease_complete',
      title: 'Lease fully signed',
      body: `Your lease is complete${unitLabel}`,
      link: '/',
      refKey: `lease_${doc.id}_done_tenant`,
    });
    await createNotification(ownerUserId, {
      type: 'lease_complete',
      title: 'Lease fully signed',
      body: `Lease with ${tenantName} is complete${unitLabel}`,
      link: '/tenants',
      refKey: `lease_${doc.id}_done_owner`,
    });
  }
}

export async function notifyPaymentStatusChange(payment, newStatus, oldStatus) {
  if (!payment || newStatus === oldStatus) return;
  const tenant = await queryOne('SELECT user_id FROM tenants WHERE id = $1', [payment.tenant_id]);
  const owner = await queryOne('SELECT user_id FROM owners WHERE id = $1', [payment.owner_id]);
  const month = payment.payment_month;
  const amount = Number(payment.amount_usd || 0).toFixed(2);

  if (newStatus === 'overdue') {
    await createNotification(tenant?.user_id, {
      type: 'payment_overdue',
      title: 'Rent overdue',
      body: `${month} — $${amount}`,
      link: '/payments',
      refKey: `pay_${payment.id}_overdue_t`,
    });
    await createNotification(owner?.user_id, {
      type: 'payment_overdue',
      title: 'Tenant rent overdue',
      body: `${month} — $${amount}`,
      link: '/payments',
      refKey: `pay_${payment.id}_overdue_o`,
    });
  }

  if (newStatus === 'paid') {
    await createNotification(tenant?.user_id, {
      type: 'payment_paid',
      title: 'Rent marked paid',
      body: `${month} — $${amount}`,
      link: '/payments',
      refKey: `pay_${payment.id}_paid_t`,
    });
  }
}

export async function notifyPaymentGenerated(tenantId, ownerId, month, amountUsd) {
  const tenant = await queryOne('SELECT user_id FROM tenants WHERE id = $1', [tenantId]);
  await createNotification(tenant?.user_id, {
    type: 'payment_due',
    title: 'New rent record',
    body: `${month} — $${Number(amountUsd).toFixed(2)} due`,
    link: '/payments',
    refKey: `pay_gen_${tenantId}_${month}`,
  });
}

export async function ensureDailyAlerts(user) {
  const today = new Date().toISOString().slice(0, 10);

  if (user.role === 'superadmin') {
    const stats = await queryOne(`
      SELECT COUNT(*)::int AS cnt,
             COALESCE(SUM(amount_usd), 0) AS total
      FROM payments WHERE status = 'overdue'
    `);
    if (stats?.cnt > 0) {
      await createNotification(user.id, {
        type: 'admin_overdue',
        title: `${stats.cnt} overdue payment${stats.cnt === 1 ? '' : 's'}`,
        body: `$${Number(stats.total).toFixed(2)} overdue platform-wide`,
        link: '/payments',
        refKey: `admin_overdue_${today}`,
      });
    }
  }

  if (user.role === 'owner') {
    const owner = await queryOne('SELECT id, trial_end, plan_status FROM owners WHERE user_id = $1', [user.id]);
    if (owner?.plan_status === 'trial' && owner.trial_end) {
      const end = String(owner.trial_end).slice(0, 10);
      const days = Math.ceil((new Date(end) - new Date(today)) / 86400000);
      if (days >= 0 && days <= 7) {
        await createNotification(user.id, {
          type: 'trial_ending',
          title: days === 0 ? 'Trial ends today' : `Trial ends in ${days} day${days === 1 ? '' : 's'}`,
          body: `Your PropSync trial ends ${end}`,
          link: '/',
          refKey: `trial_${today}`,
        });
      }
    }
  }
}

export async function listNotifications(userId, limit = 30) {
  return query(
    `SELECT id, type, title, body, link, read_at, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
}

export async function countUnread(userId) {
  const row = await queryOne(
    'SELECT COUNT(*)::int AS cnt FROM notifications WHERE user_id = $1 AND read_at IS NULL',
    [userId]
  );
  return row?.cnt || 0;
}

export async function markRead(userId, { id, all }) {
  if (all) {
    await execute(
      'UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL',
      [userId]
    );
    return;
  }
  if (id) {
    await execute(
      'UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
  }
}
