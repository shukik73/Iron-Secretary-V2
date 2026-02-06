-- AI Workspace: shared task board between human and AI
CREATE TABLE workspace_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT NOT NULL DEFAULT 'you' CHECK (assigned_to IN ('you', 'ai')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'failed')),
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
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor TEXT NOT NULL CHECK (actor IN ('you', 'ai')),
  action TEXT NOT NULL CHECK (action IN ('created', 'started', 'completed', 'failed', 'assigned', 'commented')),
  task_id UUID REFERENCES workspace_tasks(id) ON DELETE CASCADE,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_workspace_tasks_status ON workspace_tasks(status);
CREATE INDEX idx_workspace_tasks_assigned ON workspace_tasks(assigned_to);
CREATE INDEX idx_workspace_tasks_user ON workspace_tasks(user_id);
CREATE INDEX idx_workspace_activity_created ON workspace_activity(created_at DESC);
CREATE INDEX idx_workspace_activity_user ON workspace_activity(user_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workspace_tasks_updated_at
  BEFORE UPDATE ON workspace_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE workspace_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tasks"
  ON workspace_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
  ON workspace_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON workspace_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON workspace_tasks FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own activity"
  ON workspace_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity"
  ON workspace_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);
