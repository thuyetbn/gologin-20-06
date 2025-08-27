import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const r = Router();

r.get('/', async (_req, res) => {
  const groups = await prisma.group.findMany({ orderBy: { sort: 'asc' } });
  res.json({ items: groups });
});

r.post('/', async (req, res) => {
  const { name, sort = 0 } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const g = await prisma.group.create({ data: { name, sort } });
  res.status(201).json({ id: g.id });
});

export default r;

