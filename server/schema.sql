-- TaskFlow Enterprise PostgreSQL Schema

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  username VARCHAR(255) UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  avatar_url TEXT DEFAULT '',
  password_hash VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  key VARCHAR(50) NOT NULL,
  description TEXT DEFAULT '',
  color VARCHAR(50) NOT NULL DEFAULT '#6366f1',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  lead VARCHAR(255) NOT NULL DEFAULT 'Om Thakkar',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(255) NOT NULL,
  avatar_url TEXT DEFAULT '',
  initials VARCHAR(10) NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id VARCHAR(255) REFERENCES projects(id) ON DELETE SET NULL,
  project_name VARCHAR(255),
  project_color VARCHAR(50),
  assignee_id VARCHAR(255),
  assignee_name VARCHAR(255),
  assignee_role VARCHAR(255),
  assignee_initials VARCHAR(10),
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  priority VARCHAR(50) NOT NULL DEFAULT 'medium',
  due_date TIMESTAMPTZ,
  estimate VARCHAR(50) DEFAULT '3 pts',
  tags JSONB DEFAULT '[]'::jsonb,
  subtasks JSONB DEFAULT '[]'::jsonb,
  is_bookmarked BOOLEAN NOT NULL DEFAULT FALSE,
  is_trash BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  recurrence VARCHAR(50) DEFAULT 'none',
  focus_time_seconds INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  list_id VARCHAR(255),
  list_name VARCHAR(255),
  list_color VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safe migrations for existing databases
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_trash BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence VARCHAR(50) DEFAULT 'none';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS focus_time_seconds INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS list_id VARCHAR(255);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS list_name VARCHAR(255);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS list_color VARCHAR(50);

CREATE TABLE IF NOT EXISTS lists (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(50) NOT NULL DEFAULT '#6366f1',
  icon VARCHAR(50) DEFAULT 'list',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_comments (
  id VARCHAR(255) PRIMARY KEY,
  task_id VARCHAR(255) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activities (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id VARCHAR(255) NOT NULL,
  task_title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_is_trash ON tasks(is_trash);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_lists_user_id ON lists(user_id);
