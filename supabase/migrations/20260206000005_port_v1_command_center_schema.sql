-- ============================================================
-- Migration: Port V1 Command Center schema to V2
-- Adds tables for Emilio, ReviewGuard, Midas, Leads/Repairs,
-- Plan tracking, and memory events from Iron Secretary V1.
-- ============================================================

-- ── EMILIO (Cold Email Engine) ──────────────────────────────

CREATE TABLE IF NOT EXISTS emilio_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  business_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  city TEXT,
  state TEXT,
  source TEXT DEFAULT 'scraped',
  status TEXT DEFAULT 'new'
    CHECK (status IN ('new', 'warming', 'contacted', 'replied', 'demo_scheduled', 'customer', 'dead')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS emilio_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  lead_id UUID REFERENCES emilio_leads(id) ON DELETE CASCADE,
  sequence_number INT NOT NULL CHECK (sequence_number BETWEEN 1 AND 3),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  bounced BOOLEAN DEFAULT false,
  spam_reported BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'opened', 'clicked', 'replied', 'bounced')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS emilio_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  week_number INT NOT NULL,
  emails_sent INT DEFAULT 0,
  emails_opened INT DEFAULT 0,
  emails_clicked INT DEFAULT 0,
  emails_replied INT DEFAULT 0,
  emails_bounced INT DEFAULT 0,
  spam_reports INT DEFAULT 0,
  demos_booked INT DEFAULT 0,
  open_rate DECIMAL(5,2),
  reply_rate DECIMAL(5,2),
  bounce_rate DECIMAL(5,2),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── REVIEWGUARD (SaaS Product) ──────────────────────────────

CREATE TABLE IF NOT EXISTS reviewguard_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  business_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  google_place_id TEXT,
  plan TEXT DEFAULT 'trial'
    CHECK (plan IN ('trial', 'active', 'churned', 'cancelled')),
  trial_start DATE,
  trial_end DATE,
  subscription_start DATE,
  monthly_price DECIMAL(10,2) DEFAULT 49.00,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  brand_voice_notes TEXT,
  auto_send_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviewguard_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  customer_id UUID REFERENCES reviewguard_customers(id) ON DELETE CASCADE,
  google_review_id TEXT,
  reviewer_name TEXT,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  review_date TIMESTAMPTZ,
  response_draft TEXT,
  response_final TEXT,
  response_status TEXT DEFAULT 'pending'
    CHECK (response_status IN ('pending', 'approved', 'sent', 'rejected')),
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviewguard_mrr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  month DATE NOT NULL,
  active_customers INT DEFAULT 0,
  new_customers INT DEFAULT 0,
  churned_customers INT DEFAULT 0,
  mrr DECIMAL(10,2) DEFAULT 0,
  reviews_processed INT DEFAULT 0,
  responses_sent INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── MIDAS (Parts Arbitrage) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS midas_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  platform TEXT NOT NULL,
  listing_url TEXT,
  device_type TEXT NOT NULL,
  device_description TEXT,
  listing_price DECIMAL(10,2) NOT NULL,
  max_buy_price DECIMAL(10,2),
  estimated_yield DECIMAL(10,2),
  estimated_margin DECIMAL(10,2),
  condition_notes TEXT,
  status TEXT DEFAULT 'alert'
    CHECK (status IN ('alert', 'watching', 'purchased', 'harvesting', 'sold', 'passed')),
  alert_sent BOOLEAN DEFAULT false,
  alert_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS midas_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  deal_id UUID REFERENCES midas_deals(id),
  device_type TEXT NOT NULL,
  purchase_price DECIMAL(10,2) NOT NULL,
  purchase_date DATE NOT NULL,
  seller_info TEXT,
  parts_pulled JSONB DEFAULT '[]',
  total_parts_revenue DECIMAL(10,2) DEFAULT 0,
  actual_margin DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'purchased'
    CHECK (status IN ('purchased', 'harvesting', 'complete')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── LEADS & REPAIRS (Customer Lifecycle) ────────────────────

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  device_type TEXT,
  issue_description TEXT,
  source TEXT DEFAULT 'walk_in'
    CHECK (source IN ('walk_in', 'qr_code', 'phone', 'website', 'referral', 'missed_call')),
  status TEXT DEFAULT 'new'
    CHECK (status IN ('new', 'ticket_created', 'in_repair', 'done', 'picked_up', 'no_show')),
  ticket_number SERIAL,
  welcome_text_sent BOOLEAN DEFAULT false,
  welcome_text_sent_at TIMESTAMPTZ,
  followup_text_sent BOOLEAN DEFAULT false,
  followup_text_sent_at TIMESTAMPTZ,
  pickup_text_sent BOOLEAN DEFAULT false,
  pickup_text_sent_at TIMESTAMPTZ,
  pickup_reminder_sent BOOLEAN DEFAULT false,
  review_request_sent BOOLEAN DEFAULT false,
  review_request_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS repairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL,
  issue TEXT NOT NULL,
  diagnosis TEXT,
  parts_needed JSONB DEFAULT '[]',
  parts_cost DECIMAL(10,2) DEFAULT 0,
  labor_cost DECIMAL(10,2) DEFAULT 0,
  total_price DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'intake'
    CHECK (status IN ('intake', 'diagnosing', 'waiting_parts', 'in_progress', 'done', 'picked_up')),
  technician TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── PLAN TRACKING ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS plan_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  phase_number INT NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed', 'killed')),
  start_date DATE,
  target_end_date DATE,
  actual_end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  phase_id UUID REFERENCES plan_phases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium'
    CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status TEXT DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'done', 'blocked', 'killed')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  blocker_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan_weekly_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  repair_revenue DECIMAL(10,2),
  refurb_revenue DECIMAL(10,2),
  reviewguard_mrr DECIMAL(10,2),
  midas_margin DECIMAL(10,2),
  total_revenue DECIMAL(10,2),
  emilio_emails_sent INT,
  emilio_open_rate DECIMAL(5,2),
  emilio_reply_rate DECIMAL(5,2),
  emilio_demos_booked INT,
  rg_active_customers INT,
  rg_reviews_processed INT,
  rg_responses_sent INT,
  midas_deals_alerted INT,
  midas_deals_purchased INT,
  midas_margin_this_week DECIMAL(10,2),
  new_leads INT,
  repairs_completed INT,
  reviews_requested INT,
  blog_posts_published INT,
  gbp_updated BOOLEAN DEFAULT false,
  wins TEXT,
  blockers TEXT,
  next_week_priorities TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan_monthly_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  month DATE NOT NULL,
  repair_revenue_target DECIMAL(10,2),
  repair_revenue_actual DECIMAL(10,2),
  refurb_revenue_target DECIMAL(10,2),
  refurb_revenue_actual DECIMAL(10,2),
  reviewguard_mrr_target DECIMAL(10,2),
  reviewguard_mrr_actual DECIMAL(10,2),
  midas_margin_target DECIMAL(10,2),
  midas_margin_actual DECIMAL(10,2),
  total_revenue_target DECIMAL(10,2),
  total_revenue_actual DECIMAL(10,2),
  total_emilio_emails INT,
  total_rg_customers INT,
  total_midas_purchases INT,
  total_blog_posts INT,
  kill_criteria_notes TEXT,
  decisions_made TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── MEMORY / ENTITIES (V1 Core) ─────────────────────────────

CREATE TABLE IF NOT EXISTS memory_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  event_type TEXT NOT NULL,
  amount DECIMAL(10,2),
  person TEXT,
  direction TEXT,
  raw_text TEXT,
  entities JSONB DEFAULT '{}',
  confidence DECIMAL(3,2),
  model_used TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  entity_type TEXT NOT NULL
    CHECK (entity_type IN ('person', 'supplier', 'customer', 'business')),
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  message TEXT NOT NULL,
  remind_at TIMESTAMPTZ NOT NULL,
  fired BOOLEAN DEFAULT false,
  fired_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── INDEXES ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_emilio_leads_status ON emilio_leads(status);
CREATE INDEX IF NOT EXISTS idx_emilio_leads_user ON emilio_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_emilio_emails_lead_id ON emilio_emails(lead_id);
CREATE INDEX IF NOT EXISTS idx_emilio_emails_status ON emilio_emails(status);
CREATE INDEX IF NOT EXISTS idx_reviewguard_reviews_customer ON reviewguard_reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviewguard_reviews_status ON reviewguard_reviews(response_status);
CREATE INDEX IF NOT EXISTS idx_midas_deals_status ON midas_deals(status);
CREATE INDEX IF NOT EXISTS idx_midas_deals_user ON midas_deals(user_id);
CREATE INDEX IF NOT EXISTS idx_midas_purchases_deal ON midas_purchases(deal_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_user ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_repairs_lead ON repairs(lead_id);
CREATE INDEX IF NOT EXISTS idx_repairs_status ON repairs(status);
CREATE INDEX IF NOT EXISTS idx_plan_tasks_phase ON plan_tasks(phase_id);
CREATE INDEX IF NOT EXISTS idx_plan_tasks_status ON plan_tasks(status);
CREATE INDEX IF NOT EXISTS idx_memory_events_user ON memory_events(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_events_type ON memory_events(event_type);
CREATE INDEX IF NOT EXISTS idx_entities_user ON entities(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON reminders(remind_at) WHERE fired = false;

-- ── ROW LEVEL SECURITY ──────────────────────────────────────

ALTER TABLE emilio_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE emilio_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE emilio_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviewguard_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviewguard_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviewguard_mrr ENABLE ROW LEVEL SECURITY;
ALTER TABLE midas_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE midas_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_weekly_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_monthly_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies: user_id-based access
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'emilio_leads', 'emilio_emails', 'emilio_metrics',
    'reviewguard_customers', 'reviewguard_reviews', 'reviewguard_mrr',
    'midas_deals', 'midas_purchases',
    'leads', 'repairs',
    'plan_phases', 'plan_tasks', 'plan_weekly_metrics', 'plan_monthly_metrics',
    'memory_events', 'entities', 'reminders'
  ])
  LOOP
    EXECUTE format('CREATE POLICY "Users own data" ON %I FOR ALL USING (auth.uid() = user_id)', tbl);
  END LOOP;
END $$;

-- ── UPDATED_AT TRIGGERS ─────────────────────────────────────
-- (reuses update_updated_at_column() from migration 0004)

CREATE TRIGGER update_emilio_leads_updated_at
  BEFORE UPDATE ON emilio_leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviewguard_customers_updated_at
  BEFORE UPDATE ON reviewguard_customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_midas_deals_updated_at
  BEFORE UPDATE ON midas_deals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_midas_purchases_updated_at
  BEFORE UPDATE ON midas_purchases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_repairs_updated_at
  BEFORE UPDATE ON repairs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plan_phases_updated_at
  BEFORE UPDATE ON plan_phases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plan_tasks_updated_at
  BEFORE UPDATE ON plan_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_entities_updated_at
  BEFORE UPDATE ON entities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
