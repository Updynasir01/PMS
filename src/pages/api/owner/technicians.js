/**
 * CREATE TABLE IF NOT EXISTS technicians (...);
 */
import { query, queryOne, execute } from '../../../lib/db';
import { requireRole, getOwnerProfileId } from '../../../lib/auth';
import { withErrorHandler, sanitize } from '../../../lib/api';

const SPECIALTIES = ['electricity', 'plumbing', 'painting', 'ac_cooling', 'general', 'other'];

export default withErrorHandler(async function handler(req, res) {
  const user = await requireRole(req, 'owner');
  const ownerId = await getOwnerProfileId(user.id);
  if (!ownerId) return res.status(403).json({ error: 'Owner profile not found' });

  if (req.method === 'GET') {
    const { specialty } = req.query;
    let q = `
      SELECT * FROM technicians
      WHERE is_global = true OR owner_id = $1
    `;
    const params = [ownerId];
    if (specialty) {
      params.push(specialty);
      q += ` AND specialty = $${params.length}`;
    }
    q += ' ORDER BY is_global DESC, rating DESC, name ASC';
    return res.json(await query(q, params));
  }

  if (req.method === 'POST') {
    const { name, specialty, phone, whatsapp, notes, rating } = req.body || {};
    if (!name || !specialty || !phone) {
      return res.status(400).json({ error: 'Name, specialty and phone required' });
    }
    if (!SPECIALTIES.includes(specialty)) {
      return res.status(400).json({ error: 'Invalid specialty' });
    }
    const { rows: [row] } = await execute(
      `INSERT INTO technicians (owner_id, is_global, name, specialty, phone, whatsapp, notes, rating)
       VALUES ($1, false, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        ownerId,
        sanitize(name.trim()),
        specialty,
        sanitize(phone.trim()),
        whatsapp ? sanitize(whatsapp.trim()) : null,
        notes ? sanitize(notes) : null,
        Math.min(5, Math.max(1, Number(rating) || 5)),
      ]
    );
    return res.status(201).json(row);
  }

  if (req.method === 'PATCH') {
    const { id, rating } = req.body || {};
    const tech = await queryOne(
      'SELECT * FROM technicians WHERE id = $1 AND owner_id = $2 AND is_global = false',
      [id, ownerId]
    );
    if (!tech) return res.status(404).json({ error: 'Technician not found' });
    await execute('UPDATE technicians SET rating = $1 WHERE id = $2', [
      Math.min(5, Math.max(1, Number(rating) || 5)), id,
    ]);
    return res.json({ success: true });
  }

  if (req.method === 'DELETE') {
    const id = parseInt(req.query.id || req.body?.id, 10);
    const tech = await queryOne(
      'SELECT id FROM technicians WHERE id = $1 AND owner_id = $2 AND is_global = false',
      [id, ownerId]
    );
    if (!tech) return res.status(404).json({ error: 'Cannot delete this technician' });
    await execute('DELETE FROM technicians WHERE id = $1', [id]);
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
