import { withErrorHandler } from '../../../lib/api';
import { resolveQrToken, getPortalDashboard } from '../../../lib/qrPortal';

export default withErrorHandler(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token required' });

  const ctx = await resolveQrToken(token);
  if (!ctx) return res.status(404).json({ error: 'Unit not found' });

  res.json(await getPortalDashboard(ctx));
});
