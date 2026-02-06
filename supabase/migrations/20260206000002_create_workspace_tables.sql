-- AI Workspace: shared task board between human and AI
CREATE TABLE workspace_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT NOT NULL DEFAULT 'you', -- 'you' or 'ai'
  priority TEXT DEFAULT 'medium', -- critical, high, medium, low
  status TEXT DEFAULT 'pending', -- pending, in_progress, done, failed
  task_type TEXT, -- blog_post, research, email_reply, analysis, social_media, review_response, custom
  input_data JSONB,
  output_text TEXT,
  output_path TEXT,
  error_message TEXT,
  due_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE workspace_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor TEXT NOT NULL, -- 'you' or 'ai'
  action TEXT NOT NULL, -- 'created', 'started', 'completed', 'failed', 'assigned', 'commented'
  task_id UUID REFERENCES workspace_tasks(id) ON DELETE SET NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_workspace_tasks_status ON workspace_tasks(status);
CREATE INDEX idx_workspace_tasks_assigned ON workspace_tasks(assigned_to);
CREATE INDEX idx_workspace_activity_created ON workspace_activity(created_at DESC);
