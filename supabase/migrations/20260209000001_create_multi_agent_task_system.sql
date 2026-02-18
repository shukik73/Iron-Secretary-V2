-- ============================================================
-- Migration: Multi-Agent Shared Task System ("Mission Control")
--
-- Creates the shared context layer for all agents:
--   Shuki (CEO), CC (Claude Code), Jay (ClaudeBot/PM),
--   Gemini (CTO/Architect), AG (Anti-Gravity/Designer)
--
-- Tables:
--   projects         — Scopes everything (ReviewGuard, LeadCatcher, etc.)
--   agent_tasks      — The shared To-Do list across all agents
--   agent_context    — The "Occupied" sign — who's working on what
--   agent_messages   — Cross-agent communication & handoff notes
--   audit_logs       — The "Black Box" recorder for accountability
-- ============================================================

-- ── PROJECTS ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'killed', 'completed')),
  revenue_target DECIMAL(10,2),
  kill_criteria TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── AGENT_TASKS ──────────────────────────────────────────────
-- The shared To-Do list. Every agent checks this before working.

CREATE TABLE IF NOT EXISTS agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assignee TEXT NOT NULL
    CHECK (assignee IN ('shuki', 'cc', 'jay', 'gemini', 'ag')),
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'review', 'done', 'blocked', 'cancelled')),
  priority TEXT DEFAULT 'medium'
    CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  version_tag TEXT DEFAULT '1',
  depends_on UUID REFERENCES agent_tasks(id),
  acceptance_criteria TEXT,
  blocker_notes TEXT,
  created_by TEXT NOT NULL
    CHECK (created_by IN ('shuki', 'cc', 'jay', 'gemini', 'ag')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── AGENT_CONTEXT ────────────────────────────────────────────
-- The "Occupied" sign. Before modifying a file, check here first.

CREATE TABLE IF NOT EXISTS agent_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  agent_id TEXT NOT NULL
    CHECK (agent_id IN ('shuki', 'cc', 'jay', 'gemini', 'ag')),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  current_file_path TEXT,
  action_type TEXT NOT NULL
    CHECK (action_type IN ('reading', 'writing', 'testing', 'reviewing', 'deploying', 'idle')),
  task_id UUID REFERENCES agent_tasks(id) ON DELETE SET NULL,
  session_notes TEXT,
  heartbeat TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  CONSTRAINT unique_active_agent UNIQUE (agent_id, user_id, current_file_path)
    DEFERRABLE INITIALLY DEFERRED
);

-- ── AGENT_MESSAGES ───────────────────────────────────────────
-- Cross-agent communication: handoffs, nudges, conflict alerts.

CREATE TABLE IF NOT EXISTS agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES agent_tasks(id) ON DELETE SET NULL,
  from_agent TEXT NOT NULL
    CHECK (from_agent IN ('shuki', 'cc', 'jay', 'gemini', 'ag', 'system')),
  to_agent TEXT NOT NULL
    CHECK (to_agent IN ('shuki', 'cc', 'jay', 'gemini', 'ag', 'all')),
  message_type TEXT NOT NULL
    CHECK (message_type IN (
      'handoff', 'nudge', 'conflict', 'status_update',
      'question', 'answer', 'briefing', 'escalation'
    )),
  subject TEXT,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── AUDIT_LOGS ───────────────────────────────────────────────
-- The "Black Box." Every task change is recorded with before/after.

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  agent_id TEXT NOT NULL
    CHECK (agent_id IN ('shuki', 'cc', 'jay', 'gemini', 'ag', 'system')),
  action TEXT NOT NULL
    CHECK (action IN ('insert', 'update', 'delete')),
  previous_state JSONB,
  new_state JSONB,
  changed_fields TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── INDEXES ──────────────────────────────────────────────────

-- projects
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_user_slug_unique ON projects(user_id, slug);

-- agent_tasks
CREATE INDEX IF NOT EXISTS idx_agent_tasks_user ON agent_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_project ON agent_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_assignee ON agent_tasks(assignee);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_due_date ON agent_tasks(due_date)
  WHERE status NOT IN ('done', 'cancelled');
CREATE INDEX IF NOT EXISTS idx_agent_tasks_priority ON agent_tasks(priority)
  WHERE status NOT IN ('done', 'cancelled');

-- agent_context
CREATE INDEX IF NOT EXISTS idx_agent_context_agent ON agent_context(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_context_heartbeat ON agent_context(heartbeat);
CREATE INDEX IF NOT EXISTS idx_agent_context_file ON agent_context(current_file_path)
  WHERE ended_at IS NULL;

-- agent_messages
CREATE INDEX IF NOT EXISTS idx_agent_messages_to ON agent_messages(to_agent);
CREATE INDEX IF NOT EXISTS idx_agent_messages_task ON agent_messages(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_unread ON agent_messages(to_agent)
  WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_agent_messages_project ON agent_messages(project_id);

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_agent ON audit_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'projects', 'agent_tasks', 'agent_context',
    'agent_messages', 'audit_logs'
  ])
  LOOP
    EXECUTE format(
      'CREATE POLICY "Users own data" ON %I FOR ALL USING (auth.uid() = user_id)',
      tbl
    );
  END LOOP;
END $$;

-- ── UPDATED_AT TRIGGERS ─────────────────────────────────────
-- (reuses update_updated_at_column() from migration 0004)

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_tasks_updated_at
  BEFORE UPDATE ON agent_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── AUDIT LOG TRIGGER ────────────────────────────────────────
-- Automatically records every change to agent_tasks.

CREATE OR REPLACE FUNCTION log_agent_task_changes()
RETURNS TRIGGER AS $$
DECLARE
  changed TEXT[];
  col TEXT;
BEGIN
  changed := ARRAY[]::TEXT[];

  -- Track which fields actually changed
  IF TG_OP = 'UPDATE' THEN
    IF OLD.title IS DISTINCT FROM NEW.title THEN changed := changed || 'title'; END IF;
    IF OLD.description IS DISTINCT FROM NEW.description THEN changed := changed || 'description'; END IF;
    IF OLD.assignee IS DISTINCT FROM NEW.assignee THEN changed := changed || 'assignee'; END IF;
    IF OLD.status IS DISTINCT FROM NEW.status THEN changed := changed || 'status'; END IF;
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN changed := changed || 'priority'; END IF;
    IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN changed := changed || 'due_date'; END IF;
    IF OLD.version_tag IS DISTINCT FROM NEW.version_tag THEN changed := changed || 'version_tag'; END IF;
    IF OLD.blocker_notes IS DISTINCT FROM NEW.blocker_notes THEN changed := changed || 'blocker_notes'; END IF;
  END IF;

  INSERT INTO audit_logs (
    user_id, table_name, record_id, agent_id,
    action, previous_state, new_state, changed_fields
  ) VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    'agent_tasks',
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.assignee, OLD.assignee),
    lower(TG_OP),
    CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD)::JSONB ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW)::JSONB ELSE NULL END,
    CASE WHEN TG_OP = 'UPDATE' THEN changed ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_agent_tasks_changes
  AFTER INSERT OR UPDATE OR DELETE ON agent_tasks
  FOR EACH ROW EXECUTE FUNCTION log_agent_task_changes();

-- ── SEED: Default Projects ───────────────────────────────────
-- Pre-populate default projects per existing user.
-- In migration context auth.uid() is NULL, so user_id must be explicit.
INSERT INTO projects (user_id, name, slug, description, status, revenue_target, kill_criteria)
SELECT
  u.id,
  p.name,
  p.slug,
  p.description,
  p.status,
  p.revenue_target,
  p.kill_criteria
FROM auth.users u
CROSS JOIN (
  VALUES
    (
      'Iron Secretary',
      'iron-secretary',
      'AI-powered command center for Techy Miramar operations',
      'active',
      NULL::DECIMAL(10,2),
      NULL::TEXT
    ),
    (
      'ReviewGuard',
      'reviewguard',
      'SaaS - Automated Google review response platform',
      'active',
      2450.00::DECIMAL(10,2),
      '<5 customers after 20 demo calls by Week 8'
    ),
    (
      'LeadCatcher',
      'leadcatcher',
      'SaaS - Automated lead capture and follow-up for local businesses',
      'active',
      NULL::DECIMAL(10,2),
      NULL::TEXT
    )
) AS p(name, slug, description, status, revenue_target, kill_criteria)
ON CONFLICT (user_id, slug) DO NOTHING;
