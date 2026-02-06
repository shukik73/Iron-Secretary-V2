-- ============================================================
-- Migration: Add RLS policies, user_id columns, triggers, and
-- check constraints to secure all tables.
-- ============================================================

-- ── 1. Add user_id columns ──────────────────────────────────

ALTER TABLE voice_logs
  ADD COLUMN user_id UUID NOT NULL DEFAULT auth.uid();

ALTER TABLE workspace_tasks
  ADD COLUMN user_id UUID NOT NULL DEFAULT auth.uid();

ALTER TABLE workspace_activity
  ADD COLUMN user_id UUID NOT NULL DEFAULT auth.uid();

ALTER TABLE night_shift_tasks
  ADD COLUMN user_id UUID NOT NULL DEFAULT auth.uid();

ALTER TABLE night_shift_recurring
  ADD COLUMN user_id UUID NOT NULL DEFAULT auth.uid();

-- ── 2. Enable RLS on all tables ─────────────────────────────

ALTER TABLE voice_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE night_shift_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE night_shift_recurring ENABLE ROW LEVEL SECURITY;

-- ── 3. RLS Policies ─────────────────────────────────────────

-- voice_logs
CREATE POLICY "Users can view own voice logs"
  ON voice_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own voice logs"
  ON voice_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- workspace_tasks
CREATE POLICY "Users can view own workspace tasks"
  ON workspace_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workspace tasks"
  ON workspace_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workspace tasks"
  ON workspace_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workspace tasks"
  ON workspace_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- workspace_activity
CREATE POLICY "Users can view own workspace activity"
  ON workspace_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workspace activity"
  ON workspace_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- night_shift_tasks
CREATE POLICY "Users can view own night shift tasks"
  ON night_shift_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own night shift tasks"
  ON night_shift_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own night shift tasks"
  ON night_shift_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own night shift tasks"
  ON night_shift_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- night_shift_recurring
CREATE POLICY "Users can view own recurring tasks"
  ON night_shift_recurring FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recurring tasks"
  ON night_shift_recurring FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recurring tasks"
  ON night_shift_recurring FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recurring tasks"
  ON night_shift_recurring FOR DELETE
  USING (auth.uid() = user_id);

-- ── 4. Auto-update updated_at triggers ──────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_workspace_tasks_updated_at
  BEFORE UPDATE ON workspace_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_night_shift_tasks_updated_at
  BEFORE UPDATE ON night_shift_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 5. Check constraints on status and priority columns ─────

ALTER TABLE voice_logs
  ALTER COLUMN command_type SET DEFAULT 'unknown';

ALTER TABLE workspace_tasks
  ADD CONSTRAINT workspace_tasks_status_check
    CHECK (status IN ('pending', 'in_progress', 'done', 'failed')),
  ADD CONSTRAINT workspace_tasks_priority_check
    CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  ADD CONSTRAINT workspace_tasks_assigned_to_check
    CHECK (assigned_to IN ('you', 'ai'));

ALTER TABLE night_shift_tasks
  ADD CONSTRAINT night_shift_tasks_status_check
    CHECK (status IN ('queued', 'running', 'completed', 'failed', 'reviewed', 'rejected')),
  ADD CONSTRAINT night_shift_tasks_review_status_check
    CHECK (review_status IS NULL OR review_status IN ('approved', 'rejected', 'needs_changes'));

-- Normalize priority: change night_shift_tasks.priority from INT to TEXT
-- to match workspace_tasks (audit finding: inconsistent priority types)
-- NOTE: If data already exists, values 1/2/3 map to high/medium/low
ALTER TABLE night_shift_tasks
  ALTER COLUMN priority TYPE TEXT USING
    CASE priority
      WHEN 1 THEN 'high'
      WHEN 2 THEN 'medium'
      WHEN 3 THEN 'low'
      ELSE 'medium'
    END,
  ALTER COLUMN priority SET DEFAULT 'medium';

ALTER TABLE night_shift_tasks
  ADD CONSTRAINT night_shift_tasks_priority_check
    CHECK (priority IN ('critical', 'high', 'medium', 'low'));

-- ── 6. Indexes on user_id for efficient RLS queries ─────────

CREATE INDEX idx_voice_logs_user_id ON voice_logs(user_id);
CREATE INDEX idx_workspace_tasks_user_id ON workspace_tasks(user_id);
CREATE INDEX idx_workspace_activity_user_id ON workspace_activity(user_id);
CREATE INDEX idx_night_shift_tasks_user_id ON night_shift_tasks(user_id);
CREATE INDEX idx_night_shift_recurring_user_id ON night_shift_recurring(user_id);
