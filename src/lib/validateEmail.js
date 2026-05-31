/** RFC-style practical email check (not for quoted local-parts). */
const EMAIL_RE = /^[a-z0-9](?:[a-z0-9._%+-]*[a-z0-9])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;

export function normalizeEmail(value) {
  if (value == null || String(value).trim() === '') return null;
  return String(value).trim().toLowerCase();
}

export function isValidEmail(value) {
  const email = normalizeEmail(value);
  if (!email || email.length > 100) return false;
  return EMAIL_RE.test(email);
}

/**
 * @param {string} value
 * @param {{ required?: boolean }} [opts]
 * @returns {{ ok: boolean, email: string|null, error?: string }}
 */
export function validateEmailField(value, { required = false } = {}) {
  const email = normalizeEmail(value);
  if (!email) {
    if (required) return { ok: false, email: null, error: 'Email is required' };
    return { ok: true, email: null };
  }
  if (!isValidEmail(email)) {
    return { ok: false, email: null, error: 'Enter a valid email (e.g. name@example.com)' };
  }
  return { ok: true, email };
}
