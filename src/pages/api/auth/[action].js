import bcrypt from 'bcryptjs';
import { queryOne } from '../../../lib/db';
import { signToken, setAuthCookie, clearAuthCookie, authenticate } from '../../../lib/auth';
import { withErrorHandler, rateLimit, logActivity, logAudit } from '../../../lib/api';

export default withErrorHandler(async function handler(req, res) {
  if (req.method === 'POST' && req.url.includes('/login')) return login(req, res);
  if (req.method === 'POST' && req.url.includes('/logout')) return logout(req, res);
  if (req.method === 'GET') return me(req, res);
  res.status(405).json({ error: 'Method not allowed' });
});

async function login(req, res) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  rateLimit(`login:${ip}`, 10, 15 * 60 * 1000);

  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const user = await queryOne(
    'SELECT * FROM users WHERE username = $1 AND is_active = true',
    [username.toLowerCase().trim()]
  );

  if (!user) return res.status(401).json({ error: 'Invalid username or password' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid username or password' });

  const token = signToken({ userId: user.id, role: user.role });
  setAuthCookie(res, token);

  await logActivity(user.id, 'login', 'user', user.id, `${user.role} logged in: ${user.username}`);

  res.json({
    success: true,
    user: { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
  });
}

async function logout(req, res) {
  try {
    const user = await authenticate(req);
    await logActivity(user.id, 'logout', 'user', user.id, 'User logged out');
  } catch (_) {}
  clearAuthCookie(res);
  res.json({ success: true });
}

async function me(req, res) {
  const user = await authenticate(req);
  const fullUser = await queryOne(
    'SELECT id, username, role, full_name, phone, email FROM users WHERE id = $1',
    [user.id]
  );

  let profile = null;
  if (user.role === 'owner') {
    profile = await queryOne('SELECT * FROM owners WHERE user_id = $1', [user.id]);
  } else if (user.role === 'tenant') {
    profile = await queryOne(`
      SELECT t.*, u.unit_number, u.monthly_rent_usd, u.bedrooms, u.has_kitchen, u.toilets, u.is_furnished,
             p.name as property_name, p.district, p.address
      FROM tenants t
      LEFT JOIN units u ON t.unit_id = u.id
      LEFT JOIN properties p ON u.property_id = p.id
      WHERE t.user_id = $1
    `, [user.id]);
  }

  res.json({ user: fullUser, profile });
}
