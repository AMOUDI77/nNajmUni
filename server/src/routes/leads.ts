import { Router, Request, Response } from 'express';
import { getDb, saveDb } from '../db/database';

export const leadsRouter = Router();

leadsRouter.post('/', async (req: Request, res: Response) => {
  const { email, name, source = 'landing' } = req.body as { email?: string; name?: string; source?: string };

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  try {
    const db = await getDb();
    const existing = db.exec('SELECT id FROM leads WHERE email = ?', [email]);
    if (existing.length && existing[0].values.length) {
      return res.json({ ok: true, existing: true });
    }

    db.run('INSERT INTO leads (email, name, source) VALUES (?, ?, ?)', [email, name ?? null, source]);
    saveDb();
    res.json({ ok: true, existing: false });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

leadsRouter.get('/count', async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const result = db.exec('SELECT COUNT(*) as c FROM leads');
    const count = result.length ? (result[0].values[0][0] as number) : 0;
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
