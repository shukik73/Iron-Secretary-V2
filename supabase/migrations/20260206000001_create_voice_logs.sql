-- Voice Assistant: voice interaction logs
CREATE TABLE voice_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transcript TEXT NOT NULL,
  command_type TEXT DEFAULT 'unknown',
  action_taken TEXT,
  response TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for recent logs queries
CREATE INDEX idx_voice_logs_created_at ON voice_logs(created_at DESC);
CREATE INDEX idx_voice_logs_user ON voice_logs(user_id);

-- Row Level Security
ALTER TABLE voice_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own voice logs"
  ON voice_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own voice logs"
  ON voice_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voice logs"
  ON voice_logs FOR DELETE
  USING (auth.uid() = user_id);
