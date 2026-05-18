import type Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function initializeSecondBrainSchema(db: Database.Database): void {
  const sqlPath = path.resolve(
    __dirname,
    '../../../../packages/schema/001_second_brain.sql',
  );
  const fallbackPath = path.resolve(process.cwd(), '../packages/schema/001_second_brain.sql');
  const resolved = fs.existsSync(sqlPath) ? sqlPath : fallbackPath;
  if (!fs.existsSync(resolved)) {
    throw new Error(`Second Brain schema not found at ${sqlPath}`);
  }
  const sql = fs.readFileSync(resolved, 'utf-8');
  db.exec(sql);
}

export function indexEntityForSearch(
  db: Database.Database,
  entityType: string,
  entityId: string,
  title: string,
  body: string,
): void {
  db.prepare(
    `DELETE FROM brain_search WHERE entity_type = ? AND entity_id = ?`,
  ).run(entityType, entityId);
  db.prepare(
    `INSERT INTO brain_search (entity_type, entity_id, title, body) VALUES (?, ?, ?, ?)`,
  ).run(entityType, entityId, title, body);
}
