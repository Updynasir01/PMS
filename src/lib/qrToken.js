import crypto from 'crypto';

/** 32-char alphanumeric token (16 bytes hex) for unit QR codes */
export function generateQrToken() {
  return crypto.randomBytes(16).toString('hex');
}
