-- TaskFlow Nexus Enterprise PostgreSQL Schema

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  username VARCHAR(255) UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  avatar_url TEXT DEFAULT '',
  password_hash VARCHAR(255),
  role VARCHAR(50) DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  key VARCHAR(50) NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  color VARCHAR(50) NOT NULL DEFAULT '#4f46e5',
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, planning, on_track, at_risk, completed, archived
  priority VARCHAR(50) NOT NULL DEFAULT 'medium', -- critical, high, medium, low
  health VARCHAR(50) NOT NULL DEFAULT 'on_track', -- on_track, at_risk, delayed
  lead VARCHAR(255) NOT NULL DEFAULT 'Om Thakkar',
  owner_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  start_date TIMESTAMPTZ,
  deadline TIMESTAMPTZ,
  progress INTEGER DEFAULT 0,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_members (
  id VARCHAR(255) PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member', -- owner, lead, developer, designer, reviewer, viewer
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_project_member UNIQUE (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS project_invitations (
  id VARCHAR(255) PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  inviter_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member', -- owner, lead, developer, designer, reviewer, viewer
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, accepted, declined, revoked, expired
  message TEXT DEFAULT '',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_project_invite
ON project_invitations (project_id, LOWER(recipient_email))
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_invitations_token_hash ON project_invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_invitations_project_id ON project_invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_invitations_recipient ON project_invitations(LOWER(recipient_email));

CREATE TABLE IF NOT EXISTS milestones (
  id VARCHAR(255) PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  target_date TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, completed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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
  identifier VARCHAR(50), -- e.g. 'NEX-101'
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id VARCHAR(255) REFERENCES projects(id) ON DELETE SET NULL,
  project_name VARCHAR(255),
  project_color VARCHAR(50),
  assignee_id VARCHAR(255),
  assignee_name VARCHAR(255),
  assignee_role VARCHAR(255),
  assignee_initials VARCHAR(10),
  reviewer_id VARCHAR(255),
  reviewer_name VARCHAR(255),
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  type VARCHAR(50) NOT NULL DEFAULT 'task', -- feature, bug, task, improvement
  status VARCHAR(50) NOT NULL DEFAULT 'backlog', -- backlog, ready, in_progress, in_review, blocked, completed
  priority VARCHAR(50) NOT NULL DEFAULT 'medium', -- critical, high, medium, low
  blocked_reason TEXT DEFAULT '',
  start_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  estimated_hours NUMERIC DEFAULT 0,
  actual_hours NUMERIC DEFAULT 0,
  estimate VARCHAR(50) DEFAULT '3 pts',
  tags JSONB DEFAULT '[]'::jsonb,
  subtasks JSONB DEFAULT '[]'::jsonb,
  acceptance_criteria JSONB DEFAULT '[]'::jsonb,
  milestone_id VARCHAR(255) REFERENCES milestones(id) ON DELETE SET NULL,
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

CREATE TABLE IF NOT EXISTS task_dependencies (
  id VARCHAR(255) PRIMARY KEY,
  task_id VARCHAR(255) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id VARCHAR(255) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type VARCHAR(50) NOT NULL DEFAULT 'blocks', -- 'blocks', 'blocked_by', 'related'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_task_dep UNIQUE (task_id, depends_on_task_id, dependency_type)
);

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
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  author VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  mentions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id VARCHAR(255),
  actor_name VARCHAR(255) NOT NULL DEFAULT 'System',
  type VARCHAR(50) NOT NULL, -- 'assignment', 'mention', 'review', 'deadline', 'system'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  entity_type VARCHAR(50), -- 'task', 'project', 'milestone'
  entity_id VARCHAR(255),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activities (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id VARCHAR(255) REFERENCES projects(id) ON DELETE SET NULL,
  task_id VARCHAR(255) NOT NULL,
  task_title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_progress_updates (
  id VARCHAR(255) PRIMARY KEY,
  task_id VARCHAR(255) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  progress_percent INTEGER NOT NULL DEFAULT 0,
  work_completed TEXT NOT NULL,
  work_remaining TEXT DEFAULT '',
  blockers TEXT DEFAULT '',
  next_steps TEXT DEFAULT '',
  time_spent_hours NUMERIC DEFAULT 0,
  evidence_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_reviews (
  id VARCHAR(255) PRIMARY KEY,
  task_id VARCHAR(255) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  reviewer_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewer_name VARCHAR(255) NOT NULL,
  progress_update_id VARCHAR(255) REFERENCES task_progress_updates(id) ON DELETE SET NULL,
  decision VARCHAR(50) NOT NULL, -- 'approved', 'changes_requested'
  feedback TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent schema migrations for existing databases
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'member';
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'local';
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS priority VARCHAR(50) NOT NULL DEFAULT 'medium';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS health VARCHAR(50) NOT NULL DEFAULT 'on_track';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS identifier VARCHAR(50);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reviewer_id VARCHAR(255);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reviewer_name VARCHAR(255);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'task';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS blocked_reason TEXT DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_hours NUMERIC DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS acceptance_criteria JSONB DEFAULT '[]'::jsonb;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS milestone_id VARCHAR(255) REFERENCES milestones(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_trash BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence VARCHAR(50) DEFAULT 'none';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS focus_time_seconds INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS list_id VARCHAR(255);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS list_name VARCHAR(255);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS list_color VARCHAR(50);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_progress_update_at TIMESTAMPTZ;

ALTER TABLE project_invitations ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255) DEFAULT '';
ALTER TABLE project_invitations ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]'::jsonb;
ALTER TABLE project_invitations ADD COLUMN IF NOT EXISTS designation VARCHAR(255) DEFAULT '';

ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS mentions JSONB DEFAULT '[]'::jsonb;

ALTER TABLE activities ADD COLUMN IF NOT EXISTS project_id VARCHAR(255) REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;

ALTER TABLE task_progress_updates ADD COLUMN IF NOT EXISTS github_url TEXT DEFAULT '';
ALTER TABLE task_progress_updates ADD COLUMN IF NOT EXISTS deployment_url TEXT DEFAULT '';
ALTER TABLE task_progress_updates ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE task_progress_updates ADD COLUMN IF NOT EXISTS submission_status VARCHAR(50) DEFAULT 'submitted';
ALTER TABLE task_progress_updates ADD COLUMN IF NOT EXISTS project_id VARCHAR(255) REFERENCES projects(id) ON DELETE SET NULL;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submission_status VARCHAR(50) DEFAULT 'none';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS github_url TEXT DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deployment_url TEXT DEFAULT '';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_reviewer_id ON tasks(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_milestone_id ON tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_task_deps_task ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_deps_target ON task_dependencies(depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_progress_task ON task_progress_updates(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_progress_user ON task_progress_updates(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_reviews_task ON task_reviews(task_id, created_at DESC);


