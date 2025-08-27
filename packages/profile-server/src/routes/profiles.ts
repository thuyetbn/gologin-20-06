import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const r = Router();

// List profiles (basic, TODO: ETag)
r.get('/', async (_req, res) => {
  const profiles = await prisma.profile.findMany({
    select: { id: true, name: true, groupId: true, updatedAt: true, version: true },
    orderBy: { updatedAt: 'desc' },
  });
  res.json({ items: profiles });
});

// Get one profile
r.get('/:id', async (req, res) => {
  const id = req.params.id;
  const p = await prisma.profile.findUnique({ where: { id }, include: { cookies: true } });
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json({
    id: p.id,
    name: p.name,
    groupId: p.groupId,
    jsonData: p.jsonData,
    fingerprint: p.fingerprint,
    preferences: p.preferences,
    bookmarks: p.bookmarks,
    extensions: p.extensions,
    version: p.version,
    hasCookies: !!p.cookies,
    updatedAt: p.updatedAt,
  });
});

// Bundle for launching
r.get('/:id/bundle', async (req, res) => {
  const id = req.params.id;
  const p = await prisma.profile.findUnique({ where: { id } });
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json({
    id: p.id,
    jsonData: p.jsonData,
    preferences: p.preferences,
    bookmarks: p.bookmarks,
    extensions: p.extensions,
    serverVersion: p.version,
  });
});

// Create
r.post('/', async (req, res) => {
  const { id, name, groupId, jsonData, fingerprint, preferences, bookmarks, extensions } = req.body || {};
  if (!id || !name || !jsonData) return res.status(400).json({ error: 'id, name, jsonData required' });
  const created = await prisma.profile.create({ data: { id, name, groupId, jsonData, fingerprint, preferences, bookmarks, extensions } });
  res.status(201).json({ id: created.id });
});

// Update (optimistic lock by version via If-Match header)
r.put('/:id', async (req, res) => {
  const id = req.params.id;
  const ifMatch = req.headers['if-match'];
  if (!ifMatch) return res.status(428).json({ error: 'If-Match header (version) required' });
  const baseVersion = Number(ifMatch);
  const p = await prisma.profile.findUnique({ where: { id } });
  if (!p) return res.status(404).json({ error: 'Not found' });
  if (p.version !== baseVersion) return res.status(409).json({ error: 'Version conflict', current: p.version });

  const { name, groupId, jsonData, fingerprint, preferences, bookmarks, extensions } = req.body || {};
  const updated = await prisma.profile.update({
    where: { id },
    data: {
      name, groupId, jsonData, fingerprint, preferences, bookmarks, extensions,
      version: { increment: 1 },
    },
  });
  res.json({ id: updated.id, version: updated.version });
});

// Delete
r.delete('/:id', async (req, res) => {
  const id = req.params.id;
  await prisma.profile.delete({ where: { id } }).catch(() => {});
  await prisma.profileCookies.delete({ where: { profileId: id } }).catch(() => {});
  await prisma.profileLock.delete({ where: { profileId: id } }).catch(() => {});
  res.status(204).end();
});

// Lock / unlock / commit (simplified)
r.post('/:id/lock', async (req, res) => {
  const id = req.params.id;
  const { lockedBy, ttlSec = 120 } = req.body || {};
  if (!lockedBy) return res.status(400).json({ error: 'lockedBy required' });
  const expires = new Date(Date.now() + ttlSec * 1000);

  try {
    await prisma.profileLock.create({ data: { profileId: id, lockedBy, lockExpiresAt: expires } });
  } catch (e) {
    const lock = await prisma.profileLock.findUnique({ where: { profileId: id } });
    if (lock && lock.lockExpiresAt > new Date()) {
      return res.status(409).json({ error: 'Locked', lockedBy: lock.lockedBy, until: lock.lockExpiresAt });
    }
    await prisma.profileLock.upsert({
      where: { profileId: id },
      update: { lockedBy, lockExpiresAt: expires },
      create: { profileId: id, lockedBy, lockExpiresAt: expires },
    });
  }
  res.json({ ok: true, lockExpiresAt: expires });
});

r.post('/:id/heartbeat', async (req, res) => {
  const id = req.params.id;
  const { lockedBy, ttlSec = 120 } = req.body || {};
  const lock = await prisma.profileLock.findUnique({ where: { profileId: id } });
  if (!lock || lock.lockedBy !== lockedBy) return res.status(403).json({ error: 'Not lock owner' });
  const expires = new Date(Date.now() + ttlSec * 1000);
  await prisma.profileLock.update({ where: { profileId: id }, data: { lockExpiresAt: expires } });
  res.json({ ok: true, lockExpiresAt: expires });
});

r.post('/:id/unlock', async (req, res) => {
  const id = req.params.id;
  const { lockedBy } = req.body || {};
  const lock = await prisma.profileLock.findUnique({ where: { profileId: id } });
  if (lock && lock.lockedBy !== lockedBy) return res.status(403).json({ error: 'Not lock owner' });
  await prisma.profileLock.delete({ where: { profileId: id } }).catch(() => {});
  res.json({ ok: true });
});

r.post('/:id/commit', async (req, res) => {
  const id = req.params.id;
  const { baseVersion, bookmarks, preferencesPatch, cookies } = req.body || {};
  const p = await prisma.profile.findUnique({ where: { id } });
  if (!p) return res.status(404).json({ error: 'Not found' });
  if (typeof baseVersion === 'number' && p.version !== baseVersion) {
    return res.status(409).json({ error: 'Version conflict', current: p.version });
  }
  // Merge bookmarks/preferencesPatch đơn giản (giai đoạn 1: ghi đè nếu có)
  const updated = await prisma.profile.update({
    where: { id },
    data: {
      bookmarks: bookmarks ?? p.bookmarks,
      preferences: preferencesPatch ? { ...(p.preferences as any), ...preferencesPatch } : p.preferences,
      version: { increment: 1 },
    },
  });
  // Cookies sẽ được xử lý ở router cookies (PUT)
  res.json({ id: updated.id, version: updated.version });
});

export default r;

