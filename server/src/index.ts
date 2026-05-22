import express from 'express';
import cors from 'cors';
import { initDb } from './db/database';
import { universitiesRouter } from './routes/universities';
import { programsRouter } from './routes/programs';
import { leadsRouter } from './routes/leads';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }));
app.use(express.json());

app.use('/api/universities', universitiesRouter);
app.use('/api/programs',     programsRouter);
app.use('/api/leads',        leadsRouter);
app.get('/api/health', (_req, res) => res.json({ ok: true }));

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 NajmUni API running at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to init DB:', err);
  process.exit(1);
});
