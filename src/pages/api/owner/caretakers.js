/**
 * CREATE TABLE IF NOT EXISTS caretakers (...);
 */
import bcrypt from 'bcryptjs';
import { query, queryOne, execute } from '../../../lib/db';
import { requireRole, getOwnerProfileId } from '../../../lib/auth';
import { withErrorHandler, sanitize, logActivity } from '../../../lib/api';

export default withErrorHandler(async function handler(req, res) {
  const user = await requireRole(req, 'owner');
  const ownerId = await getOwnerProfileId(user.id);
  if (!ownerId) return res.status(403).json({ error: 'Owner profile not found' });

  if (req.method === 'GET') {
    const rows = await query(
      `SELECT c.*, u.full_name, u.username, u.phone, u.is_active
       FROM caretakers c
       JOIN users u ON c.user_id = u.id
       WHERE c.owner_id = $1
       ORDER BY c.created_at DESC`,
      [ownerId]
    );
    const properties = await query('SELECT id, name FROM properties WHERE owner_id = $1', [ownerId]);
    const enriched = rows.map((c) => ({
      ...c,
      assigned_properties: (c.property_ids || [])
        .map((pid) => properties.find((p) => p.id === pid))
        .filter(Boolean),
    }));
    return res.json(enriched);
  }

  if (req.method === 'POST') {
    const { username, password, full_name, phone, property_ids } = req.body || {};
    if (!username || !password || !full_name) {
      return res.status(400).json({ error: 'Username, password and name required' });
    }
    const existing = await queryOne('SELECT id FROM users WHERE username = $1', [username.toLowerCase().trim()]);
    if (existing) return res.status(409).json({ error: 'Username already taken' });

    const hash = await bcrypt.hash(password, 12);
    const { rows: [newUser] } = await execute(
      `INSERT INTO users (username, password_hash, role, full_name, phone)
       VALUES ($1, $2, 'caretaker', $3, $4) RETURNING id`,
      [
        sanitize(username.toLowerCase().trim()),
        hash,
        sanitize(full_name.trim()),
        phone ? sanitize(phone.trim()) : null,
      ]
    );

    const pids = Array.isArray(property_ids) ? property_ids.map(Number).filter(Boolean) : [];
    const { rows: [caretaker] } = await execute(
      `INSERT INTO caretakers (user_id, owner_id, property_ids)
       VALUES ($1, $2, $3::int[]) RETURNING *`,
      [newUser.id, ownerId, pids]
    );

    await logActivity(user.id, 'create', 'caretaker', caretaker.id, `Created caretaker ${full_name}`);
    return res.status(201).json({ success: true, caretakerId: caretaker.id });
  }

  if (req.method === 'DELETE') {
    const id = parseInt(req.query.id || req.body?.id, 10);
    const row = await queryOne(
      'SELECT c.id, c.user_id FROM caretakers c WHERE c.id = $1 AND c.owner_id = $2',
      [id, ownerId]
    );
    if (!row) return res.status(404).json({ error: 'Caretaker not found' });
    await execute('DELETE FROM users WHERE id = $1', [row.user_id]);
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
