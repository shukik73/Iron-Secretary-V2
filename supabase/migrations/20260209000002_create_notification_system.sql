-- ============================================================
-- Migration: Notification Queue & Scheduling System
--
-- Implements Gemini's 3-tier notification strategy:
--   Level 1 (urgent)  → Immediate Telegram push
--   Level 2 (status)  → Batched every 4 hours
--   Level 3 (info)    → Morning briefing only
--
-- Also adds telegram_config for bot settings per user.
-- ============================================================

-- ── TELEGRAM CONFIG ──────────────────────────────────────────
-- Stores per-user bot settings. Jay reads this to know where to send.

CREATE TABLE IF NOT EXISTS telegram_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() UNIQUE,
  chat_id BIGINT NOT NULL,
  bot_enabled BOOLEAN DEFAULT true,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '07:00',
  timezone TEXT DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── NOTIFICATION QUEUE ───────────────────────────────────────
-- All outbound notifications land here. Level 1 = sent immediately.
-- Level 2/3 = batched by the cron job.

CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  channel TEXT NOT NULL DEFAULT 'telegram'
    CHECK (channel IN ('telegram', 'browser', 'both')),
  level INT NOT NULL DEFAULT 2
    CHECK (level BETWEEN 1 AND 3),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  project_slug TEXT,
  task_id UUID REFERENCES agent_tasks(id) ON DELETE SET NULL,
  source_agent TEXT
    CHECK (source_agent IN ('shuki', 'cc', 'jay', 'gemini', 'ag', 'system')),
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  batch_key TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── BRIEFING LOG ─────────────────────────────────────────────
-- Track when briefings were sent to avoid duplicates.

CREATE TABLE IF NOT EXISTS briefing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  briefing_type TEXT NOT NULL
    CHECK (briefing_type IN ('morning', 'midday', 'evening', 'weekly')),
  content TEXT NOT NULL,
  sent_via TEXT DEFAULT 'telegram',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── INDEXES ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_notif_queue_unsent
  ON notification_queue(level, created_at)
  WHERE sent = false;

CREATE INDEX IF NOT EXISTS idx_notif_queue_user
  ON notification_queue(user_id)
  WHERE sent = false;

CREATE INDEX IF NOT EXISTS idx_notif_queue_batch
  ON notification_queue(batch_key)
  WHERE sent = false AND level >= 2;

CREATE INDEX IF NOT EXISTS idx_telegram_config_user
  ON telegram_config(user_id);

CREATE INDEX IF NOT EXISTS idx_briefing_log_user_type
  ON briefing_log(user_id, briefing_type, created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE telegram_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefing_log ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'telegram_config', 'notification_queue', 'briefing_log'
  ])
  LOOP
    EXECUTE format(
      'CREATE POLICY "Users own data" ON %I FOR ALL USING (auth.uid() = user_id)',
      tbl
    );
  END LOOP;
END $$;

-- ── TRIGGERS ─────────────────────────────────────────────────

CREATE TRIGGER update_telegram_config_updated_at
  BEFORE UPDATE ON telegram_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
