import { Generated, Insertable, Selectable, Updateable } from 'kysely';

// Database schema types
export interface Database {
  users: UsersTable;
  projects: ProjectsTable;
  diagrams: DiagramsTable;
  diagram_versions: DiagramVersionsTable;
  chat_messages: ChatMessagesTable;
}

// Users table
export interface UsersTable {
  id: Generated<number>;
  email: string;
  password_hash: string;
  name: string;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export type User = Selectable<UsersTable>;
export type NewUser = Insertable<UsersTable>;
export type UserUpdate = Updateable<UsersTable>;

// Projects table
export interface ProjectsTable {
  id: Generated<number>;
  user_id: number;
  name: string;
  description: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export type Project = Selectable<ProjectsTable>;
export type NewProject = Insertable<ProjectsTable>;
export type ProjectUpdate = Updateable<ProjectsTable>;

// Diagrams table (each diagram can have multiple versions)
export interface DiagramsTable {
  id: Generated<number>;
  project_id: number;
  name: string;
  description: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export type Diagram = Selectable<DiagramsTable>;
export type NewDiagram = Insertable<DiagramsTable>;
export type DiagramUpdate = Updateable<DiagramsTable>;

// Diagram versions table (version history for each diagram)
export interface DiagramVersionsTable {
  id: Generated<number>;
  diagram_id: number;
  version: number;
  mermaid_code: string;
  created_at: Generated<string>;
}

export type DiagramVersion = Selectable<DiagramVersionsTable>;
export type NewDiagramVersion = Insertable<DiagramVersionsTable>;

// Chat messages table
export interface ChatMessagesTable {
  id: Generated<number>;
  project_id: number;
  diagram_id: number | null;  // Now per-diagram instead of per-project
  role: 'user' | 'assistant';
  content: string;
  created_at: Generated<string>;
}

export type ChatMessage = Selectable<ChatMessagesTable>;
export type NewChatMessage = Insertable<ChatMessagesTable>;
