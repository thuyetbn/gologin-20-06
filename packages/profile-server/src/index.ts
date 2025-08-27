import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import profilesRouter from './routes/profiles.js';
import cookiesRouter from './routes/cookies.js';
import groupsRouter from './routes/groups.js';

const app = express();
app.use(express.json({ limit: '10mb' }));

const origin = process.env.CORS_ORIGIN || 'http://localhost:4444';
app.use(cors({ origin, credentials: true }));

app.get('/v1/health', (_req, res) => res.json({ ok: true }));
app.use('/v1/profiles', profilesRouter);
app.use('/v1/profiles', cookiesRouter); // nested: /:id/cookies
app.use('/v1/groups', groupsRouter);

const port = Number(process.env.PORT || 5055);
app.listen(port, () => {
  console.log(`Profile Server listening on http://localhost:${port}`);
});

