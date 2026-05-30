/**
 * CREATE TABLE IF NOT EXISTS unit_photos (
 *   id SERIAL PRIMARY KEY,
 *   unit_id INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
 *   photo_url TEXT NOT NULL,
 *   caption VARCHAR(100),
 *   is_primary BOOLEAN DEFAULT false,
 *   uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 */
import { query, queryOne, execute } from '../../../lib/db';
import { requireRole, getOwnerProfileId } from '../../../lib/auth';
import { withErrorHandler, sanitize } from '../../../lib/api';
import { processUnitPhotoBase64 } from '../../../lib/imageUpload';

const MAX_PHOTOS = 10;

async function assertUnitOwner(unitId, ownerId) {
  const unit = await queryOne(
    'SELECT id FROM units u JOIN properties p ON u.property_id = p.id WHERE u.id = $1 AND p.owner_id = $2',
    [unitId, ownerId]
  );
  if (!unit) throw Object.assign(new Error('Unit not found'), { statusCode: 404 });
}

export default withErrorHandler(async function handler(req, res) {
  const user = await requireRole(req, 'owner', 'superadmin');
  let ownerId = await getOwnerProfileId(user.id);
  if (user.role === 'superadmin' && req.query.owner_id) {
    ownerId = parseInt(req.query.owner_id, 10);
  }
  if (!ownerId) return res.status(403).json({ error: 'Owner profile not found' });

  if (req.method === 'GET') {
    const unitId = parseInt(req.query.unit_id, 10);
    if (!unitId) return res.status(400).json({ error: 'unit_id required' });
    await assertUnitOwner(unitId, ownerId);
    const photos = await query(
      'SELECT * FROM unit_photos WHERE unit_id = $1 ORDER BY is_primary DESC, uploaded_at ASC',
      [unitId]
    );
    return res.json(photos);
  }

  if (req.method === 'POST') {
    const { unit_id, image_base64, mime_type, caption } = req.body || {};
    const unitId = parseInt(unit_id, 10);
    if (!unitId || !image_base64) {
      return res.status(400).json({ error: 'unit_id and image_base64 required' });
    }
    await assertUnitOwner(unitId, ownerId);

    const { count } = await queryOne(
      'SELECT COUNT(*)::int AS count FROM unit_photos WHERE unit_id = $1',
      [unitId]
    );
    if (count >= MAX_PHOTOS) {
      return res.status(400).json({ error: `Maximum ${MAX_PHOTOS} photos per unit` });
    }

    const photoUrl = await processUnitPhotoBase64(image_base64, mime_type);
    const existing = await queryOne('SELECT id FROM unit_photos WHERE unit_id = $1 LIMIT 1', [unitId]);
    const isPrimary = !existing;

    const { rows: [photo] } = await execute(
      `INSERT INTO unit_photos (unit_id, photo_url, caption, is_primary)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [unitId, photoUrl, caption ? sanitize(caption).slice(0, 100) : null, isPrimary]
    );
    return res.status(201).json(photo);
  }

  if (req.method === 'DELETE') {
    const photoId = parseInt(req.query.id || req.body?.id, 10);
    if (!photoId) return res.status(400).json({ error: 'Photo id required' });

    const photo = await queryOne(
      `SELECT up.* FROM unit_photos up
       JOIN units u ON up.unit_id = u.id
       JOIN properties p ON u.property_id = p.id
       WHERE up.id = $1 AND p.owner_id = $2`,
      [photoId, ownerId]
    );
    if (!photo) return res.status(404).json({ error: 'Photo not found' });

    await execute('DELETE FROM unit_photos WHERE id = $1', [photoId]);
    if (photo.is_primary) {
      const next = await queryOne(
        'SELECT id FROM unit_photos WHERE unit_id = $1 ORDER BY uploaded_at ASC LIMIT 1',
        [photo.unit_id]
      );
      if (next) await execute('UPDATE unit_photos SET is_primary = true WHERE id = $1', [next.id]);
    }
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
});

export const config = {
  api: { bodyParser: { sizeLimit: '4mb' } },
};
