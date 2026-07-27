import { Router, Request, Response } from 'express';
import { getDb, saveDb } from '../db/database';

export const leadsRouter = Router();

leadsRouter.post('/', async (req: Request, res: Response) => {
  const { phone, name, source = 'landing' } = req.body as { phone?: string; name?: string; source?: string };

  if (!phone || !/^\+?[0-9\s-]{7,20}$/.test(phone)) {
    return res.status(400).json({ error: 'Valid phone number required' });
  }

  try {
    const db = await getDb();
    const existing = db.exec('SELECT id FROM leads WHERE phone = ?', [phone]);
    if (existing.length && existing[0].values.length) {
      return res.json({ ok: true, existing: true });
    }

    db.run('INSERT INTO leads (phone, name, source) VALUES (?, ?, ?)', [phone, name ?? null, source]);
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
