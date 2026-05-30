import jwt from 'jsonwebtoken';
import { parse, serialize } from 'cookie';
import { queryOne } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const COOKIE_NAME = 'propsync_token';

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function setAuthCookie(res, token) {
  const cookie = serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });
  res.setHeader('Set-Cookie', cookie);
}

export function clearAuthCookie(res) {
  const cookie = serialize(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  res.setHeader('Set-Cookie', cookie);
}

export function getTokenFromRequest(req) {
  const cookies = parse(req.headers.cookie || '');
  return cookies[COOKIE_NAME] || null;
}

// Middleware: authenticate request and return user
export async function authenticate(req) {
  const token = getTokenFromRequest(req);
  if (!token) throw new Error('Not authenticated');

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new Error('Invalid or expired token');
  }

  const user = await queryOne(
    'SELECT id, username, role, full_name, is_active FROM users WHERE id = $1',
    [payload.userId]
  );

  if (!user || !user.is_active) throw new Error('User not found or deactivated');
  return user;
}

// Middleware: require specific roles
export async function requireRole(req, ...roles) {
  const user = await authenticate(req);
  if (!roles.includes(user.role)) throw new Error('Insufficient permissions');
  return user;
}

// Get owner profile id for a user
export async function getOwnerProfileId(userId) {
  const owner = await queryOne('SELECT id FROM owners WHERE user_id = $1', [userId]);
  return owner?.id || null;
}

// Get tenant profile for a user
export async function getTenantProfile(userId) {
  return queryOne('SELECT id, unit_id, owner_id FROM tenants WHERE user_id = $1', [userId]);
}
