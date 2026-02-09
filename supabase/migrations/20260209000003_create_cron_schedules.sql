-- ============================================================
-- Migration: pg_cron schedules for Jay's proactive monitoring
--
-- Schedules (all times in America/New_York):
--   Every 30 min  → lead-check (cold leads)
--   Every 30 min  → dev-check (stale agent sessions)
--   Every 4 hours → flush-batch (Level 2 digest)
--   Daily 7:00am  → morning-briefing
--   Daily 6:00pm  → evening-recap
--
-- IMPORTANT: pg_cron must be enabled in Supabase Dashboard:
--   Database > Extensions > pg_cron → Enable
--
-- The cron jobs call the jay-cron Edge Function via pg_net.
-- pg_net must also be enabled for HTTP calls from SQL.
-- ============================================================

-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── Helper: invoke jay-cron edge function ────────────────────
-- Wraps the HTTP call so cron jobs stay clean.

CREATE OR REPLACE FUNCTION invoke_jay_cron(job_name TEXT)
RETURNS void AS $$
DECLARE
  supabase_url TEXT;
  service_key TEXT;
BEGIN
  -- These come from Supabase vault or app.settings
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_key := current_setting('app.settings.service_role_key', true);

  -- Skip if not configured (local dev / no secrets)
  IF supabase_url IS NULL OR service_key IS NULL THEN
    RAISE NOTICE 'jay-cron skipped: supabase_url or service_role_key not configured';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/jay-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object('job', job_name)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Schedule the jobs ────────────────────────────────────────

-- Lead check: every 30 minutes during business hours (8am-8pm ET)
SELECT cron.schedule(
  'jay-lead-check',
  '*/30 8-20 * * *',
  $$SELECT invoke_jay_cron('lead-check')$$
);

-- Dev check: every 30 minutes during work hours
SELECT cron.schedule(
  'jay-dev-check',
  '*/30 8-22 * * *',
  $$SELECT invoke_jay_cron('dev-check')$$
);

-- Flush Level 2 batch: every 4 hours
SELECT cron.schedule(
  'jay-flush-batch',
  '0 */4 * * *',
  $$SELECT invoke_jay_cron('flush-batch')$$
);

-- Morning briefing: daily at 7:00am
SELECT cron.schedule(
  'jay-morning-briefing',
  '0 7 * * *',
  $$SELECT invoke_jay_cron('morning-briefing')$$
);

-- Evening recap: daily at 6:00pm
SELECT cron.schedule(
  'jay-evening-recap',
  '0 18 * * *',
  $$SELECT invoke_jay_cron('evening-recap')$$
);
