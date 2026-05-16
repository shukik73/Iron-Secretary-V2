-- ============================================================
-- Migration: Hermes Bridge Command-Bus Tables
--
-- Adds the three neutral protocol tables that connect the React
-- cockpit (Iron Secretary UI) to the Jay operator loop:
--
--   quick_captures   — raw inbox of every typed/voice/Telegram capture
--   jay_actions      — log of what Jay attempted and outcomes
--   business_events  — neutral event stream (lead_stale, review_received...)
--
-- Plus:
--   leads.last_nudged_at  — idempotency column for cold-lead nudges
--   close_lead_stale_on_status_change()  — trigger to auto-close
--                                         lead_stale events when a lead
--                                         transitions out of 'new'
-- ============================================================

-- ── QUICK_CAPTURES ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quick_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  raw_text TEXT NOT NULL CHECK (char_length(raw_text) BETWEEN 1 AND 2000),
  capture_type TEXT DEFAULT 'unknown'
    CHECK (capture_type IN ('note', 'task', 'reminder', 'lead', 'money', 'search', 'review', 'unknown')),
  parsed_intent JSONB,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'parsed', 'converted', 'ignored', 'failed')),
  source TEXT NOT NULL DEFAULT 'web'
    CHECK (source IN ('web', 'voice', 'telegram', 'cron')),
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_quick_captures_pending
  ON quick_captures (user_id, status, created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_quick_captures_history
  ON quick_captures (user_id, created_at DESC);

-- ── JAY_ACTIONS ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jay_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  action_type TEXT NOT NULL
    CHECK (action_type IN (
      'create_task', 'send_telegram', 'parse_capture',
      'lead_nudge', 'morning_briefing', 'review_draft', 'agent_handoff'
    )),
  source_table TEXT,
  source_id UUID,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'done', 'failed')),
  input JSONB,
  output JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_jay_actions_status
  ON jay_actions (status, created_at);

CREATE INDEX IF NOT EXISTS idx_jay_actions_source
  ON jay_actions (source_table, source_id);

-- ── BUSINESS_EVENTS ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS business_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'lead_created', 'lead_stale', 'review_received', 'bad_review_received',
      'repair_overdue', 'revenue_milestone', 'task_completed', 'agent_blocked'
    )),
  entity_type TEXT,
  entity_id UUID,
  severity TEXT NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info', 'attention', 'urgent')),
  payload JSONB,
  handled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Partial unique index: only one open (unhandled) event per (user, type, entity).
-- Lets jay-cron INSERT ... ON CONFLICT DO NOTHING for idempotent nudges.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_open_business_event
  ON business_events (user_id, event_type, entity_type, entity_id)
  WHERE handled_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_business_events_inbox
  ON business_events (severity, handled_at, created_at DESC);

-- ── LEADS: nudge idempotency column ──────────────────────────

ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_nudged_at TIMESTAMPTZ;

-- ── ROW LEVEL SECURITY ───────────────────────────────────────

ALTER TABLE quick_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE jay_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_events ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['quick_captures', 'jay_actions', 'business_events'])
  LOOP
    EXECUTE format(
      'CREATE POLICY "Users own data" ON %I FOR ALL USING (auth.uid() = user_id)',
      tbl
    );
  END LOOP;
END $$;

-- ── TRIGGER: auto-close lead_stale events when lead moves out of 'new' ──

CREATE OR REPLACE FUNCTION close_lead_stale_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'new' AND OLD.status = 'new' THEN
    UPDATE business_events
      SET handled_at = now()
      WHERE event_type = 'lead_stale'
        AND entity_type = 'lead'
        AND entity_id = NEW.id
        AND handled_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lead_status_closes_stale_event ON leads;
CREATE TRIGGER lead_status_closes_stale_event
  AFTER UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION close_lead_stale_on_status_change();
