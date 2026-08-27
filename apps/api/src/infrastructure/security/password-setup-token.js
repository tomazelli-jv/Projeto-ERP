import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { passwordSetupConfig } from '../../config/password-security.js';

export function generatePasswordSetupToken(byteLength = passwordSetupConfig.tokenBytes) {
  if (!Number.isSafeInteger(byteLength) || byteLength < 32) {
    throw new TypeError('Password setup token entropy must be at least 256 bits');
  }
  return randomBytes(byteLength).toString('base64url');
}

export function hashPasswordSetupToken(token) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function equalTokenHashes(left, right) {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
