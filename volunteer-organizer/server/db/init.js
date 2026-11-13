// Cree les tables : npm run db:init
import { readFile } from 'node:fs/promises';
import { pool } from './pool.js';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing: create server/.env from .env.example');
  process.exit(1);
}

try {
  const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await pool.query(sql);

  const { rows } = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
  console.log('Tables ready:', rows.map((r) => r.table_name).join(', '));
} catch (err) {
  console.error('db:init failed:', err);
  process.exitCode = 1;
} finally {
  await pool.end();
}