-- ============================================================
-- Migration: pg_cron schedule for the process-captures safety net
--
-- Sweeps quick_captures rows stuck in 'pending' status. The
-- quick-capture Edge Function handles the happy path synchronously;
-- this cron exists for captures inserted via Telegram/voice or
-- captures that failed mid-flight inside the function.
--
-- Depends on invoke_jay_cron() defined in 20260209000003.
-- ============================================================

SELECT cron.schedule(
  'jay-process-captures',
  '*/5 * * * *',
  $$SELECT invoke_jay_cron('process-captures')$$
);
