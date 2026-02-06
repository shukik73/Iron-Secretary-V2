-- Night Shift: overnight Claude task manager
CREATE TABLE night_shift_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type TEXT NOT NULL, -- code, content, research, audit
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  scope TEXT,
  output_path TEXT,
  git_branch TEXT,
  restrictions TEXT,
  priority INT DEFAULT 1,
  schedule_date DATE DEFAULT CURRENT_DATE,

  -- Execution
  status TEXT DEFAULT 'queued', -- queued, running, completed, failed, reviewed, rejected
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
  review_status TEXT, -- approved, rejected, needs_changes
  review_notes TEXT,
  redo_queued BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Recurring tasks (templates that auto-queue)
CREATE TABLE night_shift_recurring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  scope TEXT,
  output_path TEXT,
  restrictions TEXT,
  schedule TEXT NOT NULL, -- 'daily', 'weekly_sunday', 'weekly_friday', 'monthly_first', 'biweekly'
  last_queued_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_night_shift_tasks_status ON night_shift_tasks(status);
CREATE INDEX idx_night_shift_tasks_schedule ON night_shift_tasks(schedule_date);
CREATE INDEX idx_night_shift_recurring_active ON night_shift_recurring(active) WHERE active = true;
