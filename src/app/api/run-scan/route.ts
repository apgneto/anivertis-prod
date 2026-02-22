import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

export const runtime = 'nodejs';

async function getDb() {
  const dbPath = path.join(process.cwd(), 'data', 'anivertis.db');
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS scan_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      items_coletados INTEGER NOT NULL DEFAULT 0,
      briefings_generated INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  return db;
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
    }
  }

  const db = await getDb();

  try {
    const result = await db.run(
      `INSERT INTO scan_runs (items_coletados, briefings_generated) VALUES (?, ?)`,
      [0, 0]
    );

    const data = await db.get(`SELECT * FROM scan_runs WHERE id = ?`, [result.lastID]);

    return NextResponse.json({ status: 'ok', data });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  } finally {
    await db.close();
  }
}
