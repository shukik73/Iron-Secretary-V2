-- Voice Assistant: voice interaction logs
CREATE TABLE voice_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript TEXT NOT NULL,
  command_type TEXT,
  action_taken TEXT,
  response TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for recent logs queries
CREATE INDEX idx_voice_logs_created_at ON voice_logs(created_at DESC);
