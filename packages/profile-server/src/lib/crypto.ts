import crypto from 'crypto';

const keyB64 = process.env.MASTER_KEY_BASE64 || '';
if (!keyB64) {
  console.warn('MASTER_KEY_BASE64 is not set. Encryption will fail.');
}

export function getKey(): Buffer {
  const buf = Buffer.from(keyB64, 'base64');
  if (buf.length !== 32) {
    throw new Error('MASTER_KEY_BASE64 must be 32 bytes (Base64 of 32 bytes for AES-256-GCM)');
  }
  return buf;
}

export function encryptAesGcm(plaintext: Buffer) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv, enc, tag };
}

export function decryptAesGcm(iv: Buffer, enc: Buffer, tag: Buffer) {
  const key = getKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec;
}

