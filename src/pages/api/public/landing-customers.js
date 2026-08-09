import { query } from '../../../lib/db';
import { withErrorHandler } from '../../../lib/api';

/** Public list of active landing customers (logos / names under hero) */
export default withErrorHandler(async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rows = await query(
    `SELECT id, name, logo_url, website_url
     FROM landing_customers
     WHERE is_active = true
     ORDER BY sort_order ASC, id ASC`
  );
  return res.json(rows);
});
