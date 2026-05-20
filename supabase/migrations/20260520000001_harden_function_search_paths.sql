-- ============================================================
-- Migration: Harden function search_path
--
-- Fixes Supabase security advisor WARN-level lint
-- function_search_path_mutable on three trigger functions.
--
-- Setting search_path = '' with fully-qualified references
-- prevents search_path-injection attacks. pg_catalog is always
-- implicitly searched so unqualified built-ins (now(), lower(),
-- COALESCE, etc.) continue to resolve.
--
-- (The pg_net extension_in_public lint cannot be fixed without
-- a DROP/recreate cycle that would interrupt active cron jobs,
-- so it is intentionally left as-is.)
-- ============================================================

-- ── 1. log_agent_task_changes ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_agent_task_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  changed TEXT[];
BEGIN
  changed := ARRAY[]::TEXT[];
  IF TG_OP = 'UPDATE' THEN
    IF OLD.title IS DISTINCT FROM NEW.title THEN changed := changed || 'title'; END IF;
    IF OLD.description IS DISTINCT FROM NEW.description THEN changed := changed || 'description'; END IF;
    IF OLD.assignee IS DISTINCT FROM NEW.assignee THEN changed := changed || 'assignee'; END IF;
    IF OLD.status IS DISTINCT FROM NEW.status THEN changed := changed || 'status'; END IF;
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN changed := changed || 'priority'; END IF;
    IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN changed := changed || 'due_date'; END IF;
    IF OLD.version_tag IS DISTINCT FROM NEW.version_tag THEN changed := changed || 'version_tag'; END IF;
    IF OLD.blocker_notes IS DISTINCT FROM NEW.blocker_notes THEN changed := changed || 'blocker_notes'; END IF;
  END IF;

  INSERT INTO public.audit_logs (
    user_id, table_name, record_id, agent_id,
    action, previous_state, new_state, changed_fields
  ) VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    'agent_tasks',
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.assignee, OLD.assignee),
    lower(TG_OP),
    CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD)::JSONB ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW)::JSONB ELSE NULL END,
    CASE WHEN TG_OP = 'UPDATE' THEN changed ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- ── 2. update_updated_at_column ────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- ── 3. close_lead_stale_on_status_change ───────────────────────
CREATE OR REPLACE FUNCTION public.close_lead_stale_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM 'new' AND OLD.status = 'new' THEN
    UPDATE public.business_events
      SET handled_at = now()
      WHERE event_type = 'lead_stale'
        AND entity_type = 'lead'
        AND entity_id = NEW.id
        AND handled_at IS NULL;
  END IF;
  RETURN NEW;
END;
$function$;
