-- ============================================================
-- Migration: Add RLS policies, user_id columns, triggers, and
-- check constraints to secure all tables.
--
-- IMPORTANT: This migration is intentionally idempotent because
-- newer schemas already include some of these columns/constraints.
-- ============================================================

-- ── 1. Add user_id columns (safe if already present) ────────
DO $$
BEGIN
  IF to_regclass('public.voice_logs') IS NOT NULL THEN
    ALTER TABLE voice_logs
      ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();
  END IF;

  IF to_regclass('public.workspace_tasks') IS NOT NULL THEN
    ALTER TABLE workspace_tasks
      ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();
  END IF;

  IF to_regclass('public.workspace_activity') IS NOT NULL THEN
    ALTER TABLE workspace_activity
      ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();
  END IF;

  IF to_regclass('public.night_shift_tasks') IS NOT NULL THEN
    ALTER TABLE night_shift_tasks
      ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();
  END IF;

  IF to_regclass('public.night_shift_recurring') IS NOT NULL THEN
    ALTER TABLE night_shift_recurring
      ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();
  END IF;
END
$$;

-- ── 2. Enable RLS on all tables ─────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.voice_logs') IS NOT NULL THEN
    ALTER TABLE voice_logs ENABLE ROW LEVEL SECURITY;
  END IF;

  IF to_regclass('public.workspace_tasks') IS NOT NULL THEN
    ALTER TABLE workspace_tasks ENABLE ROW LEVEL SECURITY;
  END IF;

  IF to_regclass('public.workspace_activity') IS NOT NULL THEN
    ALTER TABLE workspace_activity ENABLE ROW LEVEL SECURITY;
  END IF;

  IF to_regclass('public.night_shift_tasks') IS NOT NULL THEN
    ALTER TABLE night_shift_tasks ENABLE ROW LEVEL SECURITY;
  END IF;

  IF to_regclass('public.night_shift_recurring') IS NOT NULL THEN
    ALTER TABLE night_shift_recurring ENABLE ROW LEVEL SECURITY;
  END IF;
END
$$;

-- ── 3. RLS Policies (create only when missing) ──────────────
DO $$
BEGIN
  IF to_regclass('public.voice_logs') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'voice_logs' AND policyname = 'Users can view own voice logs'
    ) THEN
      CREATE POLICY "Users can view own voice logs"
        ON voice_logs FOR SELECT
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'voice_logs' AND policyname = 'Users can insert own voice logs'
    ) THEN
      CREATE POLICY "Users can insert own voice logs"
        ON voice_logs FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;
  END IF;

  IF to_regclass('public.workspace_tasks') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'workspace_tasks' AND policyname = 'Users can view own workspace tasks'
    ) THEN
      CREATE POLICY "Users can view own workspace tasks"
        ON workspace_tasks FOR SELECT
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'workspace_tasks' AND policyname = 'Users can insert own workspace tasks'
    ) THEN
      CREATE POLICY "Users can insert own workspace tasks"
        ON workspace_tasks FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'workspace_tasks' AND policyname = 'Users can update own workspace tasks'
    ) THEN
      CREATE POLICY "Users can update own workspace tasks"
        ON workspace_tasks FOR UPDATE
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'workspace_tasks' AND policyname = 'Users can delete own workspace tasks'
    ) THEN
      CREATE POLICY "Users can delete own workspace tasks"
        ON workspace_tasks FOR DELETE
        USING (auth.uid() = user_id);
    END IF;
  END IF;

  IF to_regclass('public.workspace_activity') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'workspace_activity' AND policyname = 'Users can view own workspace activity'
    ) THEN
      CREATE POLICY "Users can view own workspace activity"
        ON workspace_activity FOR SELECT
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'workspace_activity' AND policyname = 'Users can insert own workspace activity'
    ) THEN
      CREATE POLICY "Users can insert own workspace activity"
        ON workspace_activity FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;
  END IF;

  IF to_regclass('public.night_shift_tasks') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'night_shift_tasks' AND policyname = 'Users can view own night shift tasks'
    ) THEN
      CREATE POLICY "Users can view own night shift tasks"
        ON night_shift_tasks FOR SELECT
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'night_shift_tasks' AND policyname = 'Users can insert own night shift tasks'
    ) THEN
      CREATE POLICY "Users can insert own night shift tasks"
        ON night_shift_tasks FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'night_shift_tasks' AND policyname = 'Users can update own night shift tasks'
    ) THEN
      CREATE POLICY "Users can update own night shift tasks"
        ON night_shift_tasks FOR UPDATE
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'night_shift_tasks' AND policyname = 'Users can delete own night shift tasks'
    ) THEN
      CREATE POLICY "Users can delete own night shift tasks"
        ON night_shift_tasks FOR DELETE
        USING (auth.uid() = user_id);
    END IF;
  END IF;

  IF to_regclass('public.night_shift_recurring') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'night_shift_recurring' AND policyname = 'Users can view own recurring tasks'
    ) THEN
      CREATE POLICY "Users can view own recurring tasks"
        ON night_shift_recurring FOR SELECT
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'night_shift_recurring' AND policyname = 'Users can insert own recurring tasks'
    ) THEN
      CREATE POLICY "Users can insert own recurring tasks"
        ON night_shift_recurring FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'night_shift_recurring' AND policyname = 'Users can update own recurring tasks'
    ) THEN
      CREATE POLICY "Users can update own recurring tasks"
        ON night_shift_recurring FOR UPDATE
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'night_shift_recurring' AND policyname = 'Users can delete own recurring tasks'
    ) THEN
      CREATE POLICY "Users can delete own recurring tasks"
        ON night_shift_recurring FOR DELETE
        USING (auth.uid() = user_id);
    END IF;
  END IF;
END
$$;

-- ── 4. Auto-update updated_at triggers ──────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_workspace_tasks_updated_at ON workspace_tasks;
CREATE TRIGGER set_workspace_tasks_updated_at
  BEFORE UPDATE ON workspace_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_night_shift_tasks_updated_at ON night_shift_tasks;
CREATE TRIGGER set_night_shift_tasks_updated_at
  BEFORE UPDATE ON night_shift_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 5. Check constraints on status and priority columns ─────
DO $$
DECLARE
  night_shift_priority_type TEXT;
BEGIN
  IF to_regclass('public.voice_logs') IS NOT NULL THEN
    ALTER TABLE voice_logs
      ALTER COLUMN command_type SET DEFAULT 'unknown';
  END IF;

  IF to_regclass('public.workspace_tasks') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workspace_tasks_status_check') THEN
      ALTER TABLE workspace_tasks
        ADD CONSTRAINT workspace_tasks_status_check
          CHECK (status IN ('pending', 'in_progress', 'done', 'failed'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workspace_tasks_priority_check') THEN
      ALTER TABLE workspace_tasks
        ADD CONSTRAINT workspace_tasks_priority_check
          CHECK (priority IN ('critical', 'high', 'medium', 'low'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workspace_tasks_assigned_to_check') THEN
      ALTER TABLE workspace_tasks
        ADD CONSTRAINT workspace_tasks_assigned_to_check
          CHECK (assigned_to IN ('you', 'ai'));
    END IF;
  END IF;

  IF to_regclass('public.night_shift_tasks') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'night_shift_tasks_status_check') THEN
      ALTER TABLE night_shift_tasks
        ADD CONSTRAINT night_shift_tasks_status_check
          CHECK (status IN ('queued', 'running', 'completed', 'failed', 'reviewed', 'rejected'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'night_shift_tasks_review_status_check') THEN
      ALTER TABLE night_shift_tasks
        ADD CONSTRAINT night_shift_tasks_review_status_check
          CHECK (review_status IS NULL OR review_status IN ('approved', 'rejected', 'needs_changes'));
    END IF;

    SELECT data_type INTO night_shift_priority_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'night_shift_tasks'
      AND column_name = 'priority';

    -- Convert legacy numeric priorities only when needed.
    IF night_shift_priority_type IN ('smallint', 'integer', 'bigint', 'numeric') THEN
      ALTER TABLE night_shift_tasks
        ALTER COLUMN priority TYPE TEXT USING
          CASE priority::TEXT
            WHEN '1' THEN 'high'
            WHEN '2' THEN 'medium'
            WHEN '3' THEN 'low'
            ELSE 'medium'
          END;
    END IF;

    ALTER TABLE night_shift_tasks
      ALTER COLUMN priority SET DEFAULT 'medium';

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'night_shift_tasks_priority_check') THEN
      ALTER TABLE night_shift_tasks
        ADD CONSTRAINT night_shift_tasks_priority_check
          CHECK (priority IN ('critical', 'high', 'medium', 'low'));
    END IF;
  END IF;
END
$$;

-- ── 6. Indexes on user_id for efficient RLS queries ─────────
CREATE INDEX IF NOT EXISTS idx_voice_logs_user_id ON voice_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_tasks_user_id ON workspace_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_activity_user_id ON workspace_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_night_shift_tasks_user_id ON night_shift_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_night_shift_recurring_user_id ON night_shift_recurring(user_id);
