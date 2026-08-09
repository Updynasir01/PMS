import { query, queryOne, execute } from '../../../lib/db';
import { requireRole } from '../../../lib/auth';
import { withErrorHandler, logActivity, sanitize } from '../../../lib/api';
import { processLogoBase64 } from '../../../lib/imageUpload';

function cleanWebsite(value) {
  if (!value || typeof value !== 'string') return null;
  let v = value.trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  return v.slice(0, 500);
}

function cleanLogoUrl(value) {
  if (!value || typeof value !== 'string') return null;
  const v = value.trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v) && !v.startsWith('data:')) return null;
  return v.slice(0, 2000000);
}

export default withErrorHandler(async function handler(req, res) {
  const user = await requireRole(req, 'superadmin');

  if (req.method === 'GET') {
    const rows = await query(
      `SELECT * FROM landing_customers
       ORDER BY sort_order ASC, id ASC`
    );
    return res.json(rows);
  }

  if (req.method === 'POST') {
    const { name, website_url, sort_order, is_active, image_base64, mime_type, logo_url } = req.body || {};
    const cleanName = sanitize(name || '').trim().slice(0, 120);
    if (!cleanName) return res.status(400).json({ error: 'Name is required' });

    let logo = cleanLogoUrl(logo_url);
    if (image_base64) {
      logo = await processLogoBase64(image_base64, mime_type);
    }

    const { rows: [row] } = await execute(
      `INSERT INTO landing_customers (name, logo_url, website_url, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        cleanName,
        logo,
        cleanWebsite(website_url),
        Number.isFinite(Number(sort_order)) ? Number(sort_order) : 0,
        is_active === false ? false : true,
      ]
    );
    await logActivity(user.id, 'create', 'landing_customer', row.id, cleanName);
    return res.status(201).json(row);
  }

  if (req.method === 'PATCH') {
    const id = parseInt(req.body?.id || req.query?.id, 10);
    if (!id) return res.status(400).json({ error: 'id required' });

    const existing = await queryOne('SELECT * FROM landing_customers WHERE id = $1', [id]);
    if (!existing) return res.status(404).json({ error: 'Customer not found' });

    const { name, website_url, sort_order, is_active, image_base64, mime_type, logo_url, clear_logo } = req.body || {};

    let nextName = existing.name;
    if (name !== undefined) {
      nextName = sanitize(name || '').trim().slice(0, 120);
      if (!nextName) return res.status(400).json({ error: 'Name is required' });
    }

    let nextLogo = existing.logo_url;
    if (clear_logo) nextLogo = null;
    else if (image_base64) nextLogo = await processLogoBase64(image_base64, mime_type);
    else if (logo_url !== undefined) nextLogo = cleanLogoUrl(logo_url);

    const nextWebsite = website_url !== undefined ? cleanWebsite(website_url) : existing.website_url;
    const nextSort = sort_order !== undefined && Number.isFinite(Number(sort_order))
      ? Number(sort_order)
      : existing.sort_order;
    const nextActive = is_active !== undefined ? !!is_active : existing.is_active;

    const { rows: [row] } = await execute(
      `UPDATE landing_customers
       SET name = $1, logo_url = $2, website_url = $3, sort_order = $4, is_active = $5, updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [nextName, nextLogo, nextWebsite, nextSort, nextActive, id]
    );
    await logActivity(user.id, 'update', 'landing_customer', id, nextName);
    return res.json(row);
  }

  if (req.method === 'DELETE') {
    const id = parseInt(req.query?.id || req.body?.id, 10);
    if (!id) return res.status(400).json({ error: 'id required' });
    const existing = await queryOne('SELECT id, name FROM landing_customers WHERE id = $1', [id]);
    if (!existing) return res.status(404).json({ error: 'Customer not found' });
    await execute('DELETE FROM landing_customers WHERE id = $1', [id]);
    await logActivity(user.id, 'delete', 'landing_customer', id, existing.name);
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
});

export const config = {
  api: { bodyParser: { sizeLimit: '3mb' } },
};
