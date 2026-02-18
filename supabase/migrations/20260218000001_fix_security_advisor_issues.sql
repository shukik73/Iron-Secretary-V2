-- ============================================================
-- Migration: Fix Supabase Security Advisor issues
--
-- Fixes 5 security errors detected by Supabase Security Advisor:
--
--   1. invoke_jay_cron: SECURITY DEFINER without restricted search_path,
--      callable by anon/authenticated (critical: exposes service role key)
--   2. log_agent_task_changes: trigger function callable by anon/public
--   3. update_updated_at_column: trigger function callable by anon/public
--   4-5. Default EXECUTE privilege on public functions granted to anon
--
-- Supabase grants EXECUTE on all public.* functions to anon and
-- authenticated roles by default. This migration revokes that access
-- on sensitive functions and sets search_path on SECURITY DEFINER
-- functions to prevent search_path injection attacks.
-- ============================================================

-- ── 1. Fix invoke_jay_cron ─────────────────────────────────────
-- CRITICAL: This function uses SECURITY DEFINER and reads
-- app.settings.service_role_key. Without restricted search_path
-- and revoked public access, any anonymous user could trigger
-- edge functions with the service role key.

CREATE OR REPLACE FUNCTION invoke_jay_cron(job_name TEXT)
RETURNS void AS $$
DECLARE
  supabase_url TEXT;
  service_key TEXT;
BEGIN
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_key := current_setting('app.settings.service_role_key', true);

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
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = '';

-- Revoke access from public roles — only postgres/service_role should call this
REVOKE EXECUTE ON FUNCTION invoke_jay_cron(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION invoke_jay_cron(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION invoke_jay_cron(TEXT) FROM authenticated;

-- ── 2. Fix log_agent_task_changes ──────────────────────────────
-- Trigger function — should not be directly callable by users.

REVOKE EXECUTE ON FUNCTION log_agent_task_changes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION log_agent_task_changes() FROM anon;
REVOKE EXECUTE ON FUNCTION log_agent_task_changes() FROM authenticated;

-- ── 3. Fix update_updated_at_column ────────────────────────────
-- Trigger function — should not be directly callable by users.

REVOKE EXECUTE ON FUNCTION update_updated_at_column() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION update_updated_at_column() FROM anon;
REVOKE EXECUTE ON FUNCTION update_updated_at_column() FROM authenticated;

-- ── 4. Revoke default function privileges for future protection ─
-- Prevents newly created functions from being auto-executable by anon.
-- (Does not affect existing functions — those are handled above.)

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
