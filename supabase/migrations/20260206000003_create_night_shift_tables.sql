-- Night Shift: overnight Claude task manager
CREATE TABLE night_shift_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('code', 'content', 'research', 'audit')),
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  scope TEXT,
  output_path TEXT,
  git_branch TEXT,
  restrictions TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  schedule_date DATE DEFAULT CURRENT_DATE,

  -- Execution
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'reviewed', 'rejected')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_minutes INT,

  -- Results
  output_text TEXT,
  output_files JSONB DEFAULT '[]',
  ai_notes TEXT,
  error_message TEXT,

  -- Review
  reviewed_at TIMESTAMPTZ,
  review_status TEXT CHECK (review_status IS NULL OR review_status IN ('approved', 'rejected', 'needs_changes')),
  review_notes TEXT,
  redo_queued BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Recurring tasks (templates that auto-queue)
CREATE TABLE night_shift_recurring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('code', 'content', 'research', 'audit')),
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  scope TEXT,
  output_path TEXT,
  restrictions TEXT,
  schedule TEXT NOT NULL CHECK (schedule IN ('daily', 'weekly_sunday', 'weekly_friday', 'monthly_first', 'biweekly')),
  last_queued_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_night_shift_tasks_status ON night_shift_tasks(status);
CREATE INDEX idx_night_shift_tasks_schedule ON night_shift_tasks(schedule_date);
CREATE INDEX idx_night_shift_tasks_user ON night_shift_tasks(user_id);
CREATE INDEX idx_night_shift_recurring_active ON night_shift_recurring(active) WHERE active = true;
CREATE INDEX idx_night_shift_recurring_user ON night_shift_recurring(user_id);

-- Auto-update updated_at trigger (reuse function from workspace migration)
CREATE TRIGGER night_shift_tasks_updated_at
  BEFORE UPDATE ON night_shift_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE night_shift_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE night_shift_recurring ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own night shift tasks"
  ON night_shift_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own night shift tasks"
  ON night_shift_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own night shift tasks"
  ON night_shift_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own night shift tasks"
  ON night_shift_tasks FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own recurring tasks"
  ON night_shift_recurring FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recurring tasks"
  ON night_shift_recurring FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring tasks"
  ON night_shift_recurring FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring tasks"
  ON night_shift_recurring FOR DELETE
  USING (auth.uid() = user_id);
