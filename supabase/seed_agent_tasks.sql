-- ============================================================
-- Iron Secretary V2 — Initial Agent Tasks
-- Paste this into Supabase SQL Editor to populate the task board.
-- ============================================================

-- First, get the project IDs
DO $$
DECLARE
  p_iron UUID;
  p_rg UUID;
  p_lc UUID;
BEGIN

SELECT id INTO p_iron FROM projects WHERE slug = 'iron-secretary' LIMIT 1;
SELECT id INTO p_rg FROM projects WHERE slug = 'reviewguard' LIMIT 1;
SELECT id INTO p_lc FROM projects WHERE slug = 'leadcatcher' LIMIT 1;

-- ── SHUKI (CEO) ──────────────────────────────────────────────

INSERT INTO agent_tasks (project_id, title, description, assignee, status, priority, due_date, created_by, acceptance_criteria) VALUES
(p_iron, 'Deploy migrations to Supabase',
 'Run migrations 20260209000001, 000002, 000003 via supabase db push',
 'shuki', 'pending', 'critical', now() + interval '1 day', 'cc',
 'All 3 migrations applied. Tables visible in Supabase Dashboard.'),

(p_iron, 'Reconnect Jay to Telegram',
 'Set webhook URL and verify bot token via @BotFather',
 'shuki', 'pending', 'critical', now() + interval '1 day', 'cc',
 'Sending /status to bot returns system health response.'),

(p_iron, 'Enable pg_cron and pg_net extensions',
 'Go to Database > Extensions in Supabase Dashboard and enable both',
 'shuki', 'pending', 'high', now() + interval '1 day', 'cc',
 'Both extensions show as enabled in Dashboard.'),

(p_iron, 'Configure app.settings for pg_cron',
 'Set supabase_url and service_role_key via ALTER DATABASE in SQL Editor',
 'shuki', 'pending', 'high', now() + interval '1 day', 'cc',
 'Jay cron jobs can call edge functions successfully.'),

(p_iron, 'Deploy edge functions',
 'Run: supabase functions deploy telegram-bot && supabase functions deploy jay-cron',
 'shuki', 'pending', 'high', now() + interval '1 day', 'cc',
 'Both functions return 200 on GET health check.'),

(p_iron, 'Register Telegram chat_id',
 'Insert chat_id into telegram_config table so Jay knows where to send messages',
 'shuki', 'pending', 'high', now() + interval '1 day', 'cc',
 'Jay morning briefing arrives in Telegram.');

-- ── GEMINI (CTO) ─────────────────────────────────────────────

INSERT INTO agent_tasks (project_id, title, description, assignee, status, priority, due_date, created_by, acceptance_criteria) VALUES
(p_iron, 'Audit multi-agent migrations for security',
 'Review RLS policies, audit trigger logic, and seed data in migrations 000001-000003',
 'gemini', 'pending', 'high', now() + interval '2 days', 'cc',
 'Written audit report confirming no security gaps or recommending fixes.'),

(p_iron, 'Review telegram-bot Edge Function for edge cases',
 'Check rate limiting, auth on /notify endpoint, input validation, error handling',
 'gemini', 'pending', 'medium', now() + interval '3 days', 'cc',
 'List of issues or sign-off that code is production-ready.'),

(p_iron, 'Define acceptance criteria for Dashboard UI',
 'What metrics matter on the agent health panel? What actions should be available?',
 'gemini', 'pending', 'medium', now() + interval '3 days', 'cc',
 'Written spec for Dashboard v2 improvements.'),

(p_iron, 'Design notification escalation rules',
 'Define when Level 2 notifications should be promoted to Level 1',
 'gemini', 'pending', 'medium', now() + interval '5 days', 'cc',
 'Documented escalation rules with specific thresholds.'),

(p_rg, 'ReviewGuard architecture review',
 'Review overall ReviewGuard technical approach — API design, Google integration, pricing model',
 'gemini', 'pending', 'medium', now() + interval '7 days', 'cc',
 'Architecture document or recommendations for ReviewGuard MVP.'),

(p_lc, 'LeadCatcher architecture review',
 'Define LeadCatcher technical approach — lead capture flow, notification triggers, integrations',
 'gemini', 'pending', 'medium', now() + interval '7 days', 'cc',
 'Architecture document or recommendations for LeadCatcher MVP.');

-- ── JAY (PM) ─────────────────────────────────────────────────

INSERT INTO agent_tasks (project_id, title, description, assignee, status, priority, due_date, created_by, acceptance_criteria) VALUES
(p_iron, 'Test /status, /today, /tasks, /nudge commands',
 'Once reconnected to Telegram, verify all bot commands return correct data from Supabase',
 'jay', 'pending', 'high', now() + interval '2 days', 'cc',
 'All 4 commands return formatted responses. Screenshot proof.'),

(p_iron, 'Define morning briefing template',
 'What should Shuki see at 7am? Overdue tasks, revenue at stake, cold leads, agent activity?',
 'jay', 'pending', 'medium', now() + interval '3 days', 'gemini',
 'Written template approved by Shuki.'),

(p_iron, 'Set up telegram_config with Shuki chat_id and timezone',
 'Insert Shuki Telegram chat_id and timezone (America/New_York) into telegram_config table',
 'jay', 'pending', 'high', now() + interval '2 days', 'cc',
 'Row exists in telegram_config with correct chat_id.'),

(p_iron, 'Start daily briefings',
 'Once connected, begin sending morning (7am) and evening (6pm) briefings via Telegram',
 'jay', 'pending', 'medium', now() + interval '4 days', 'cc',
 'Shuki receives at least one morning and one evening briefing.'),

(p_iron, 'Populate agent_tasks with ongoing work',
 'As new tasks come up in conversations, add them to agent_tasks table with proper fields',
 'jay', 'pending', 'medium', now() + interval '5 days', 'gemini',
 'New tasks appearing in Command Center dashboard as they are created.');

-- ── CC (BUILDER) ─────────────────────────────────────────────

INSERT INTO agent_tasks (project_id, title, description, assignee, status, priority, due_date, created_by, acceptance_criteria) VALUES
(p_iron, 'Build Phase 4 Dashboard UI',
 'Agent health panel, shared task board, agent comms feed — CommandCenter page',
 'cc', 'done', 'high', now(), 'cc',
 'Page renders with agent cards, task board with filters, message feed. Build passes.'),

(p_iron, 'Build Telegram bot Edge Function (Phase 2)',
 'Webhook handler with /status, /today, /tasks, /nudge commands + /notify endpoint',
 'cc', 'done', 'high', now(), 'cc',
 'Edge function deployed. All commands return formatted Telegram messages.'),

(p_iron, 'Build jay-cron Edge Function (Phase 3)',
 'Proactive monitoring: lead-check, dev-check, flush-batch, briefings',
 'cc', 'done', 'high', now(), 'cc',
 'Edge function deployed. Cron jobs call it on schedule.'),

(p_iron, 'Create deployment script',
 'Interactive deploy.sh that walks through all setup steps',
 'cc', 'done', 'medium', now(), 'cc',
 'Script runs end-to-end. All services configured.'),

(p_iron, 'Write tests for CommandCenter component',
 'Add Vitest tests for the Command Center page — mock data rendering, filters, agent cards',
 'cc', 'pending', 'medium', now() + interval '3 days', 'cc',
 'Tests pass. Coverage on key UI logic.'),

(p_rg, 'Build ReviewGuard MVP backend',
 'Supabase Edge Functions for Google review polling, AI response generation, approval flow',
 'cc', 'pending', 'high', now() + interval '14 days', 'gemini',
 'Edge function fetches reviews, generates responses, stores in reviewguard_reviews table.'),

(p_lc, 'Build LeadCatcher MVP backend',
 'Lead capture webhook, auto-follow-up sequences, notification triggers',
 'cc', 'pending', 'high', now() + interval '14 days', 'gemini',
 'Leads captured via webhook, follow-up SMS/email sent automatically.');

-- ── AG (DESIGNER) ────────────────────────────────────────────

INSERT INTO agent_tasks (project_id, title, description, assignee, status, priority, due_date, created_by, acceptance_criteria) VALUES
(p_iron, 'Review and polish Command Center UI',
 'Review layout, colors, spacing, responsiveness of the new CommandCenter page',
 'ag', 'pending', 'medium', now() + interval '4 days', 'cc',
 'Visual improvements committed. Mobile and desktop look clean.'),

(p_iron, 'Audit frontend component structure',
 'Review overall component organization, ensure consistency across all pages',
 'ag', 'pending', 'low', now() + interval '7 days', 'cc',
 'Report on inconsistencies or PR with fixes.'),

(p_rg, 'Design ReviewGuard customer dashboard',
 'UI for ReviewGuard customers to see their reviews, approve responses, manage settings',
 'ag', 'pending', 'medium', now() + interval '14 days', 'gemini',
 'Mockup or implemented page for ReviewGuard customer portal.'),

(p_lc, 'Design LeadCatcher setup wizard',
 'UI for LeadCatcher onboarding — connect Google Business, set notification preferences',
 'ag', 'pending', 'medium', now() + interval '14 days', 'gemini',
 'Mockup or implemented wizard flow.');

END $$;
