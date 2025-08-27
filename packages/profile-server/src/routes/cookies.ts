import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { encryptAesGcm, decryptAesGcm } from '../lib/crypto.js';

const r = Router();

// GET /v1/profiles/:id/cookies (JSON)
r.get('/:id/cookies', async (req, res) => {
  const id = req.params.id;
  const row = await prisma.profileCookies.findUnique({ where: { profileId: id } });
  if (!row) return res.json({ cookies: [] });

  const buf = Buffer.from(row.dataEncrypted);
  // layout: [iv(12)][tag(16)][enc]
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  try {
    const dec = decryptAesGcm(iv, enc, tag);
    const json = JSON.parse(dec.toString('utf8'));
    return res.json({ cookies: json, updatedAt: row.updatedAt });
  } catch (e) {
    return res.status(500).json({ error: 'Decrypt failed' });
  }
});

// PUT /v1/profiles/:id/cookies { cookies: [] }
r.put('/:id/cookies', async (req, res) => {
  const id = req.params.id;
  const cookies = req.body?.cookies;
  if (!Array.isArray(cookies)) return res.status(400).json({ error: 'cookies array required' });

  const plaintext = Buffer.from(JSON.stringify(cookies), 'utf8');
  const { iv, enc, tag } = encryptAesGcm(plaintext);
  const payload = Buffer.concat([iv, tag, enc]);

  await prisma.profileCookies.upsert({
    where: { profileId: id },
    create: { profileId: id, dataEncrypted: payload },
    update: { dataEncrypted: payload },
  });
  res.json({ ok: true });
});

export default r;

