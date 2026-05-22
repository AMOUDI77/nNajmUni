import { Router, Request, Response } from 'express';
import { getDb } from '../db/database';

export const programsRouter = Router();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resultToObjects(result: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (result.values as any[][]).map((row: any[]) =>
    Object.fromEntries((result.columns as string[]).map((col: string, i: number) => [col, row[i]]))
  );
}

programsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { field, level, university_id, q } = req.query as Record<string, string>;

    let sql = `
      SELECT p.*, u.name AS university_name, u.abbr AS university_abbr, u.location AS university_location
      FROM programs p
      JOIN universities u ON p.university_id = u.id
      WHERE 1=1
    `;
    const params: (string | number | null)[] = [];

    if (field)         { sql += ' AND p.field = ?';         params.push(field); }
    if (level)         { sql += ' AND p.level = ?';         params.push(level); }
    if (university_id) { sql += ' AND p.university_id = ?'; params.push(parseInt(university_id)); }
    if (q)             { sql += ' AND (p.name LIKE ? OR p.description LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }

    sql += ' ORDER BY p.tuition_per_year ASC';

    const result = db.exec(sql, params);
    const rows = result.length ? resultToObjects(result[0]) : [];

    const fieldsResult = db.exec('SELECT DISTINCT field FROM programs ORDER BY field');
    const fields = fieldsResult.length ? fieldsResult[0].values.map(r => r[0] as string) : [];

    res.json({ data: rows, fields });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
