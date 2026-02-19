/**
 * Supabase Edge Function: jay-cron
 *
 * Jay's autonomous brain. Called by pg_cron on a schedule.
 * Scans for issues and sends notifications at the right level:
 *
 *   Every 30 min:  Lead-Check (cold leads → Level 1 if >2h)
 *   Every 30 min:  Dev-Check (stale agent sessions → Level 2)
 *   Every 4 hours:  Flush Level 2 batch
 *   Daily 7am:  Morning briefing (Level 3)
 *   Daily 6pm:  Evening recap
 *
 * Invoked via: POST /functions/v1/jay-cron
 * Body: { "job": "lead-check" | "dev-check" | "flush-batch" | "morning-briefing" | "evening-recap" }
 *
 * Required secrets:
 *   TELEGRAM_BOT_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Security:
 *   Requires Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(
  SUPABASE_URL ?? 'http://localhost',
  SUPABASE_SERVICE_ROLE_KEY ?? 'missing-service-role-key'
);

// ── Telegram sender ──────────────────────────────────────────

async function sendTelegram(chatId: number | bigint, text: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) return false;
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
  return res.ok;
}

async function getAllChatIds(): Promise<number[]> {
  const { data } = await supabase
    .from('telegram_config')
    .select('chat_id')
    .eq('bot_enabled', true);
  return (data ?? []).map(r => r.chat_id);
}

// ── Job: Lead Check ──────────────────────────────────────────
// Level 1 (urgent) if lead is >2 hours old and untouched.

async function leadCheck(): Promise<string> {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const { data: coldLeads } = await supabase
    .from('leads')
    .select('name, device_type, phone, created_at')
    .eq('status', 'new')
    .lt('created_at', twoHoursAgo.toISOString())
    .order('created_at')
    .limit(5);

  if (!coldLeads?.length) return 'No cold leads.';

  const chatIds = await getAllChatIds();
  const msg = `🔴 <b>COLD LEADS — Action Required</b>\n\n` +
    coldLeads.map(l => {
      const mins = Math.floor((Date.now() - new Date(l.created_at).getTime()) / 60000);
      const hours = Math.floor(mins / 60);
      const age = hours > 0 ? `${hours}h ${mins % 60}m` : `${mins}m`;
      return `• <b>${l.name}</b> — ${l.device_type ?? 'unknown'}\n  📞 ${l.phone ?? 'no phone'} · Waiting ${age}`;
    }).join('\n\n') +
    `\n\n<i>These leads are getting cold. Call now.</i>`;

  for (const chatId of chatIds) {
    await sendTelegram(chatId, msg);
  }

  return `Notified about ${coldLeads.length} cold leads.`;
}

// ── Job: Dev Check ───────────────────────────────────────────
// Level 2 (status) if an agent has been writing for >2 hours without update.

async function devCheck(): Promise<string> {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const { data: stale } = await supabase
    .from('agent_context')
    .select('agent_id, current_file_path, action_type, heartbeat, task_id')
    .lt('heartbeat', twoHoursAgo.toISOString())
    .is('ended_at', null);

  if (!stale?.length) return 'No stale sessions.';

  // Queue as Level 2 (batched)
  const notifications = stale.map(s => ({
    channel: 'telegram' as const,
    level: 2,
    title: 'Stale Agent Session',
    body: `${s.agent_id} has been ${s.action_type} ${s.current_file_path ?? 'unknown file'} for 2+ hours without updating task status.`,
    source_agent: 'jay' as const,
    task_id: s.task_id,
  }));

  await supabase.from('notification_queue').insert(notifications);

  return `Queued ${stale.length} stale session alerts.`;
}

// ── Job: Flush Batch (Level 2) ───────────────────────────────
// Sends all queued Level 2 notifications as a single digest.

async function flushBatch(): Promise<string> {
  const { data: pending } = await supabase
    .from('notification_queue')
    .select('id, title, body, source_agent, created_at')
    .eq('sent', false)
    .eq('level', 2)
    .order('created_at');

  if (!pending?.length) return 'No pending Level 2 notifications.';

  const chatIds = await getAllChatIds();
  const msg = `🟡 <b>Status Digest</b> (${pending.length} update${pending.length > 1 ? 's' : ''})\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    pending.map((n, i) => {
      const agent = n.source_agent ?? 'system';
      const time = new Date(n.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      return `${i + 1}. [${agent}] ${n.body}\n   <i>${time}</i>`;
    }).join('\n\n');

  for (const chatId of chatIds) {
    await sendTelegram(chatId, msg);
  }

  // Mark as sent
  const ids = pending.map(n => n.id);
  await supabase
    .from('notification_queue')
    .update({ sent: true, sent_at: new Date().toISOString() })
    .in('id', ids);

  return `Flushed ${pending.length} notifications.`;
}

// ── Job: Morning Briefing ────────────────────────────────────
// Daily at 7am. Summarizes what's ahead.

async function morningBriefing(): Promise<string> {
  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // Today's tasks
  const { data: todayTasks } = await supabase
    .from('agent_tasks')
    .select('title, assignee, priority, due_date, status')
    .in('status', ['pending', 'in_progress', 'review', 'blocked'])
    .lte('due_date', todayEnd.toISOString())
    .order('priority');

  // Overdue
  const { data: overdue } = await supabase
    .from('agent_tasks')
    .select('title, assignee, due_date')
    .lt('due_date', now.toISOString())
    .in('status', ['pending', 'in_progress']);

  // Cold leads
  const { data: coldLeads } = await supabase
    .from('leads')
    .select('id')
    .eq('status', 'new');

  // Projects
  const { data: projects } = await supabase
    .from('projects')
    .select('name, status');

  const agents = ['shuki', 'cc', 'gemini', 'ag'];
  const agentEmojis: Record<string, string> = { shuki: '👔', cc: '🔨', jay: '📋', gemini: '🧠', ag: '🎨' };

  let msg = `☀️ <b>Morning Briefing — ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</b>\n━━━━━━━━━━━━━━━━━━━━━━\n`;

  if (overdue?.length) {
    msg += `\n🚨 <b>${overdue.length} Overdue</b>\n`;
    msg += overdue.map(t => `  • ${t.title} → ${agentEmojis[t.assignee] ?? '🤖'} ${t.assignee}`).join('\n');
  }

  if (todayTasks?.length) {
    msg += `\n\n📌 <b>Due Today (${todayTasks.length})</b>\n`;
    for (const agent of agents) {
      const mine = todayTasks.filter(t => t.assignee === agent);
      if (mine.length) {
        msg += `\n  ${agentEmojis[agent]} <b>${agent}</b>\n`;
        msg += mine.map(t => `    • ${t.title}`).join('\n');
      }
    }
  } else {
    msg += `\n📭 No tasks due today.`;
  }

  msg += `\n\n<b>Dashboard</b>`;
  msg += `\n  📬 New leads: ${coldLeads?.length ?? 0}`;
  msg += `\n  🏗️ Active projects: ${projects?.filter(p => p.status === 'active').length ?? 0}`;
  msg += `\n\n<i>Use /today for full details, /nudge to check for issues.</i>`;

  const chatIds = await getAllChatIds();
  for (const chatId of chatIds) {
    await sendTelegram(chatId, msg);
  }

  // Log briefing
  await supabase.from('briefing_log').insert({
    briefing_type: 'morning',
    content: msg,
    sent_via: 'telegram',
  });

  return 'Morning briefing sent.';
}

// ── Job: Evening Recap ───────────────────────────────────────
// Daily at 6pm. What got done, what didn't.

async function eveningRecap(): Promise<string> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // Completed today
  const { data: completed } = await supabase
    .from('agent_tasks')
    .select('title, assignee, completed_at')
    .eq('status', 'done')
    .gte('completed_at', todayStart.toISOString());

  // Still open
  const { data: stillOpen } = await supabase
    .from('agent_tasks')
    .select('title, assignee, due_date')
    .in('status', ['pending', 'in_progress', 'review', 'blocked'])
    .lte('due_date', now.toISOString());

  let msg = `🌙 <b>Evening Recap — ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</b>\n━━━━━━━━━━━━━━━━━━━━━━\n`;

  msg += `\n✅ <b>Completed Today (${completed?.length ?? 0})</b>\n`;
  if (completed?.length) {
    msg += completed.map(t => `  • ${t.title} (${t.assignee})`).join('\n');
  } else {
    msg += `  None.`;
  }

  if (stillOpen?.length) {
    msg += `\n\n⏰ <b>Rolling to Tomorrow (${stillOpen.length})</b>\n`;
    msg += stillOpen.map(t => `  • ${t.title} → ${t.assignee}`).join('\n');
  }

  msg += `\n\n<i>Good night, boss. Jay's watching overnight.</i>`;

  const chatIds = await getAllChatIds();
  for (const chatId of chatIds) {
    await sendTelegram(chatId, msg);
  }

  // Log briefing
  await supabase.from('briefing_log').insert({
    briefing_type: 'evening',
    content: msg,
    sent_via: 'telegram',
  });

  // Flush any remaining Level 2 notifications
  await flushBatch();

  return 'Evening recap sent.';
}

// ── Main handler ─────────────────────────────────────────────

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'POST required', jobs: ['lead-check', 'dev-check', 'flush-batch', 'morning-briefing', 'evening-recap'] }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY secret' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const job = typeof body?.job === 'string' ? body.job : '';

    let result: string;
    switch (job) {
      case 'lead-check':
        result = await leadCheck();
        break;
      case 'dev-check':
        result = await devCheck();
        break;
      case 'flush-batch':
        result = await flushBatch();
        break;
      case 'morning-briefing':
        result = await morningBriefing();
        break;
      case 'evening-recap':
        result = await eveningRecap();
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown job: ${job}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify({ job, result, timestamp: new Date().toISOString() }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('jay-cron error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
