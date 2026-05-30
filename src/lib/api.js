import { execute } from './db';

function clientErrorMessage(err) {
  const msg = err?.message || '';
  if (err?.code === '28P01' || /password authentication failed/i.test(msg)) {
    return 'Database connection failed. Update DATABASE_URL in .env.local with your Supabase database password, then restart the dev server.';
  }
  if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(msg)) {
    return 'Cannot reach the database. Check DATABASE_URL and your network connection.';
  }
  return msg || 'Internal server error';
}

// Wrap API handler with error catching
export function withErrorHandler(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error('[API Error]', err.message);
      const status =
        err.message === 'Not authenticated' ? 401
        : err.message === 'Insufficient permissions' ? 403
        : err.message?.includes('not found') ? 404
        : 500;
      res.status(status).json({ error: clientErrorMessage(err) });
    }
  };
}

// Simple in-memory rate limiter
const rateLimitStore = new Map();
export function rateLimit(key, maxRequests, windowMs) {
  const now = Date.now();
  const record = rateLimitStore.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + windowMs;
  }

  record.count++;
  rateLimitStore.set(key, record);

  if (record.count > maxRequests) {
    throw new Error('Too many requests. Please try again later.');
  }
}

// Log activity
export async function logActivity(userId, action, entityType, entityId, description) {
  try {
    await execute(
      'INSERT INTO activity_log (user_id, action, entity_type, entity_id, description) VALUES ($1,$2,$3,$4,$5)',
      [userId, action, entityType, entityId, description]
    );
  } catch (_) {}
}

// Log audit
export async function logAudit(userId, action, tableName, recordId, oldValues, newValues) {
  try {
    await execute(
      'INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values) VALUES ($1,$2,$3,$4,$5,$6)',
      [userId, action, tableName, recordId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null]
    );
  } catch (_) {}
}

// XSS sanitize a string
export function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
