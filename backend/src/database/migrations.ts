import Database from 'better-sqlite3';

export function runMigrations(db: Database.Database) {
  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create projects table
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Create diagrams table
  db.exec(`
    CREATE TABLE IF NOT EXISTS diagrams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);

  // Create diagram versions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS diagram_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      diagram_id INTEGER NOT NULL,
      version INTEGER NOT NULL,
      mermaid_code TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (diagram_id) REFERENCES diagrams(id) ON DELETE CASCADE,
      UNIQUE(diagram_id, version)
    );
  `);

  // Create chat messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      diagram_id INTEGER,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (diagram_id) REFERENCES diagrams(id) ON DELETE CASCADE
    );
  `);

  // Migration: Add diagram_id column to existing chat_messages table
  // Check if the column exists, if not add it (must be done before creating indexes)
  const tableInfo = db.prepare("PRAGMA table_info(chat_messages)").all() as any[];
  const hasDiagramId = tableInfo.some((col: any) => col.name === 'diagram_id');

  if (!hasDiagramId) {
    console.log('⚙️  Adding diagram_id column to chat_messages table...');
    db.exec(`ALTER TABLE chat_messages ADD COLUMN diagram_id INTEGER REFERENCES diagrams(id) ON DELETE CASCADE;`);
    console.log('✅ diagram_id column added successfully');
  }

  // Create indexes for better performance (after ensuring all columns exist)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
    CREATE INDEX IF NOT EXISTS idx_diagrams_project_id ON diagrams(project_id);
    CREATE INDEX IF NOT EXISTS idx_diagram_versions_diagram_id ON diagram_versions(diagram_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_project_id ON chat_messages(project_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_diagram_id ON chat_messages(diagram_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);

  console.log('✅ Database migrations completed successfully');
}
