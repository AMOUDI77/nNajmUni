import { Router, Request, Response } from 'express';
import { getDb, saveDb } from '../db/database';

export const universitiesRouter = Router();

universitiesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { type, q } = req.query as Record<string, string>;

    let sql = 'SELECT * FROM universities WHERE 1=1';
    const params: (string | number | null)[] = [];

    if (type) { sql += ' AND type = ?'; params.push(type); }
    if (q)    {
      sql += ' AND (name LIKE ? OR abbr LIKE ? OR description LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    sql += ' ORDER BY CASE WHEN qs_ranking IS NULL THEN 9999 ELSE qs_ranking END ASC, name ASC';

    const result = db.exec(sql, params);
    const rows = result.length ? resultToObjects(result[0]) : [];

    const total = (db.exec('SELECT COUNT(*) as c FROM universities')[0].values[0][0] as number);
    res.json({ data: rows, total });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

universitiesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const uniResult = db.exec('SELECT * FROM universities WHERE id = ?', [parseInt(req.params.id)]);
    if (!uniResult.length) return res.status(404).json({ error: 'Not found' });

    const uni = resultToObjects(uniResult[0])[0];
    const progResult = db.exec(
      'SELECT * FROM programs WHERE university_id = ? ORDER BY level, name',
      [parseInt(req.params.id)]
    );
    const programs = progResult.length ? resultToObjects(progResult[0]) : [];
    res.json({ ...uni, programs });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resultToObjects(result: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (result.values as any[][]).map((row: any[]) =>
    Object.fromEntries((result.columns as string[]).map((col: string, i: number) => [col, row[i]]))
  );
}
