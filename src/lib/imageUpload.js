'use strict';

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/jpg'];

/** Validate and compress base64 image; returns data URL string */
export async function processUnitPhotoBase64(imageBase64, mimeType) {
  if (!imageBase64) throw new Error('Image data required');
  const mime = (mimeType || 'image/jpeg').toLowerCase();
  if (!ALLOWED.includes(mime)) throw new Error('Only JPG and PNG images are allowed');

  const raw = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
  const buf = Buffer.from(raw, 'base64');
  if (buf.length > MAX_BYTES) throw new Error('Image must be under 2MB');

  const sharp = (await import('sharp')).default;
  const out = await sharp(buf)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();

  return `data:image/jpeg;base64,${out.toString('base64')}`;
}
