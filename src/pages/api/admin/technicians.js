/** Admin: add global technicians visible to all owners */
import { query, execute } from '../../../lib/db';
import { requireRole } from '../../../lib/auth';
import { withErrorHandler, sanitize } from '../../../lib/api';

const SPECIALTIES = ['electricity', 'plumbing', 'painting', 'ac_cooling', 'general', 'other'];

export default withErrorHandler(async function handler(req, res) {
  await requireRole(req, 'superadmin');

  if (req.method === 'GET') {
    return res.json(await query(
      'SELECT * FROM technicians WHERE is_global = true ORDER BY specialty, name'
    ));
  }

  if (req.method === 'POST') {
    const { name, specialty, phone, whatsapp, notes } = req.body || {};
    if (!name || !specialty || !phone) {
      return res.status(400).json({ error: 'Name, specialty and phone required' });
    }
    const { rows: [row] } = await execute(
      `INSERT INTO technicians (owner_id, is_global, name, specialty, phone, whatsapp, notes)
       VALUES (NULL, true, $1, $2, $3, $4, $5) RETURNING *`,
      [
        sanitize(name.trim()), specialty, sanitize(phone.trim()),
        whatsapp ? sanitize(whatsapp.trim()) : null,
        notes ? sanitize(notes) : null,
      ]
    );
    return res.status(201).json(row);
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
