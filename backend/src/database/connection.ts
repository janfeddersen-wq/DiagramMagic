import { Kysely, SqliteDialect } from 'kysely';
import SQLite from 'better-sqlite3';
import { Database } from './schema.js';
import { runMigrations } from './migrations.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite database
const sqlite = new SQLite(path.join(__dirname, '../../diagrammagic.db'));

// Run migrations
runMigrations(sqlite);

// Create Kysely instance
export const db = new Kysely<Database>({
  dialect: new SqliteDialect({
    database: sqlite,
  }),
});

// Export for cleanup
export function closeDatabase() {
  sqlite.close();
}
