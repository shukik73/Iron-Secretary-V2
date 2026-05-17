/**
 * Supabase Edge Function: jay-cron
 *
 * Jay's autonomous brain. Called by pg_cron on a schedule.
 * Scans for issues and sends notifications at the right level:
 *
 *   Every 5 min:   Process-Captures (safety net for stuck quick_captures)
 *   Every 30 min:  Lead-Check (cold leads → Level 1 if >2h)
 *   Every 30 min:  Dev-Check (stale agent sessions → Level 2)
 *   Every 4 hours: Flush Level 2 batch
 *   Daily 7am:     Morning briefing (Level 3)
 *   Daily 6pm:     Evening recap
 *
 * Invoked via: POST /functions/v1/jay-cron
 * Body: { "job": "lead-check" | "dev-check" | "flush-batch" | "morning-briefing" | "evening-recap" | "process-captures" }
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
// Idempotent: open business_events row gates duplicate Telegram spam,
// and last_nudged_at enforces a 4-hour cooldown between re-nudges.

async function leadCheck(): Promise<string> {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

  const { data: coldLeads } = await supabase
    .from('leads')
    .select('id, user_id, name, device_type, phone, created_at, last_nudged_at')
    .eq('status', 'new')
    .lt('created_at', twoHoursAgo.toISOString())
    .or(`last_nudged_at.is.null,last_nudged_at.lt.${fourHoursAgo}`)
    .order('created_at')
    .limit(5);

  if (!coldLeads?.length) return 'No cold leads.';

  // Reserve an open business_events row per lead. If one already exists
  // (partial unique index on user_id,event_type,entity_type,entity_id),
  // ON CONFLICT skips it — and we skip the Telegram for that lead too.
  const eventRows = coldLeads.map(l => ({
    user_id: l.user_id,
    event_type: 'lead_stale' as const,
    entity_type: 'lead',
    entity_id: l.id,
    severity: 'urgent' as const,
    payload: {
      name: l.name,
      device_type: l.device_type,
      phone: l.phone,
      age_minutes: Math.floor((Date.now() - new Date(l.created_at).getTime()) / 60000),
    },
  }));

  const { data: inserted } = await supabase
    .from('business_events')
    .upsert(eventRows, {
      onConflict: 'user_id,event_type,entity_type,entity_id',
      ignoreDuplicates: true,
    })
    .select('entity_id');

  const newlyOpened = new Set((inserted ?? []).map(r => r.entity_id as string));
  const toNudge = coldLeads.filter(l => newlyOpened.has(l.id));

  if (!toNudge.length) return 'All cold leads already have open nudges.';

  const chatIds = await getAllChatIds();
  const msg = `🔴 <b>COLD LEADS — Action Required</b>\n\n` +
    toNudge.map(l => {
      const mins = Math.floor((Date.now() - new Date(l.created_at).getTime()) / 60000);
      const hours = Math.floor(mins / 60);
      const age = hours > 0 ? `${hours}h ${mins % 60}m` : `${mins}m`;
      return `• <b>${l.name}</b> — ${l.device_type ?? 'unknown'}\n  📞 ${l.phone ?? 'no phone'} · Waiting ${age}`;
    }).join('\n\n') +
    `\n\n<i>These leads are getting cold. Call now.</i>`;

  let telegramOk = false;
  for (const chatId of chatIds) {
    const ok = await sendTelegram(chatId, msg);
    telegramOk = telegramOk || ok;
  }

  // Cooldown stamp so we don't re-nudge within 4 hours, even if the
  // business_events row is closed manually.
  await supabase
    .from('leads')
    .update({ last_nudged_at: new Date().toISOString() })
    .in('id', toNudge.map(l => l.id));

  // Audit trail.
  await supabase.from('jay_actions').insert({
    user_id: toNudge[0].user_id,
    action_type: 'lead_nudge',
    status: telegramOk ? 'done' : 'failed',
    source_table: 'leads',
    output: { lead_ids: toNudge.map(l => l.id), count: toNudge.length, telegram_ok: telegramOk },
    completed_at: new Date().toISOString(),
  });

  return `Notified about ${toNudge.length} cold leads.`;
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

  // Blocked
  const { data: blocked } = await supabase
    .from('agent_tasks')
    .select('title, assignee')
    .eq('status', 'blocked')
    .order('updated_at', { ascending: false })
    .limit(5);

  // Open urgent business events (cold leads, bad reviews, etc.)
  const { data: urgentEvents } = await supabase
    .from('business_events')
    .select('event_type, payload')
    .eq('severity', 'urgent')
    .is('handled_at', null);

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

  if (urgentEvents?.length) {
    msg += `\n🚨 <b>Urgent (${urgentEvents.length})</b>\n`;
    const byType: Record<string, number> = {};
    for (const e of urgentEvents) byType[e.event_type] = (byType[e.event_type] ?? 0) + 1;
    msg += Object.entries(byType).map(([t, n]) => `  • ${t.replace(/_/g, ' ')}: ${n}`).join('\n');
  }

  if (overdue?.length) {
    msg += `\n\n⏰ <b>${overdue.length} Overdue</b>\n`;
    msg += overdue.map(t => `  • ${t.title} → ${agentEmojis[t.assignee] ?? '🤖'} ${t.assignee}`).join('\n');
  }

  if (blocked?.length) {
    msg += `\n\n🛑 <b>Blocked (${blocked.length})</b>\n`;
    msg += blocked.slice(0, 3).map(t => `  • ${t.title} → ${agentEmojis[t.assignee] ?? '🤖'} ${t.assignee}`).join('\n');
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
    msg += `\n\n📭 No tasks due today.`;
  }

  msg += `\n\n<b>Dashboard</b>`;
  msg += `\n  📬 New leads: ${coldLeads?.length ?? 0}`;
  msg += `\n  🏗️ Active projects: ${projects?.filter(p => p.status === 'active').length ?? 0}`;
  // TODO: ReviewGuard pending count once review_events feed exists (plan section 8.4 / phase 5).
  msg += `\n  📝 ReviewGuard pending: 0`;

  // Jay recommendation — single-line heuristic so the boss has a starting move.
  let recommendation: string;
  if ((coldLeads?.length ?? 0) > 0) {
    recommendation = 'Start with cold leads before repairs pile up.';
  } else if (blocked?.length) {
    const first = blocked[0];
    recommendation = `Unblock ${first.assignee} first — they're stuck on "${first.title}".`;
  } else if (overdue?.length) {
    recommendation = 'Knock out overdue tasks before noon.';
  } else {
    recommendation = 'Day is clean. Pick the highest-priority task first.';
  }
  msg += `\n\n💡 <b>Jay recommends:</b> ${recommendation}`;
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

// ── Job: Process Captures (safety net) ───────────────────────
// quick-capture handles the happy path synchronously. This job sweeps
// any quick_captures rows that got stuck in 'pending' (failed mid-flight,
// or inserted via Telegram/voice paths that bypass the edge function).

function localCaptureType(text: string): 'note' | 'task' | 'reminder' | 'money' | 'search' | 'review' {
  const lower = text.toLowerCase().trim();
  if (lower.startsWith('task:') || /\b(task|todo)\b/.test(lower)) return 'task';
  if (/\bremind/.test(lower)) return 'reminder';
  if (lower.startsWith('$') || /\btip\b/.test(lower)) return 'money';
  if (/\b(search|find)\b/.test(lower)) return 'search';
  if (/\breview\b/.test(lower)) return 'review';
  return 'note';
}

async function processCaptures(): Promise<string> {
  const cutoff = new Date(Date.now() - 60 * 1000).toISOString();
  const { data: pending } = await supabase
    .from('quick_captures')
    .select('id, user_id, raw_text, source')
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .order('created_at')
    .limit(20);

  if (!pending?.length) return 'No pending captures.';

  let converted = 0;
  let failed = 0;
  const chatIds = await getAllChatIds();

  for (const cap of pending) {
    try {
      const captureType = localCaptureType(cap.raw_text);
      await supabase
        .from('quick_captures')
        .update({
          capture_type: captureType,
          status: 'parsed',
          processed_at: new Date().toISOString(),
        })
        .eq('id', cap.id);

      if (captureType === 'task' || captureType === 'reminder') {
        const title = cap.raw_text.replace(/^task:\s*/i, '').slice(0, 200);

        const { data: task } = await supabase
          .from('agent_tasks')
          .insert({
            user_id: cap.user_id,
            title,
            description: cap.raw_text.length > title.length ? cap.raw_text : null,
            assignee: 'shuki',
            created_by: 'shuki',
            priority: 'medium',
            status: 'pending',
          })
          .select('id')
          .single();

        if (task?.id) {
          await supabase.from('agent_messages').insert({
            user_id: cap.user_id,
            task_id: task.id,
            from_agent: 'shuki',
            to_agent: 'jay',
            message_type: 'status_update',
            subject: 'New capture (safety-net)',
            body: cap.raw_text,
          });

          await supabase
            .from('quick_captures')
            .update({ status: 'converted' })
            .eq('id', cap.id);

          for (const chatId of chatIds) {
            await sendTelegram(chatId, `📥 Captured: <b>${title}</b> → assigned to shuki`);
          }
        }

        await supabase.from('jay_actions').insert({
          user_id: cap.user_id,
          action_type: 'create_task',
          source_table: 'quick_captures',
          source_id: cap.id,
          status: 'done',
          output: { task_id: task?.id ?? null, capture_type: captureType, via: 'process-captures' },
          completed_at: new Date().toISOString(),
        });
      } else {
        await supabase.from('jay_actions').insert({
          user_id: cap.user_id,
          action_type: 'parse_capture',
          source_table: 'quick_captures',
          source_id: cap.id,
          status: 'done',
          output: { capture_type: captureType, via: 'process-captures' },
          completed_at: new Date().toISOString(),
        });
      }
      converted++;
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      await supabase
        .from('quick_captures')
        .update({ status: 'failed' })
        .eq('id', cap.id);
      await supabase.from('jay_actions').insert({
        user_id: cap.user_id,
        action_type: 'parse_capture',
        source_table: 'quick_captures',
        source_id: cap.id,
        status: 'failed',
        error: message,
        completed_at: new Date().toISOString(),
      });
    }
  }

  return `Processed ${converted} captures (${failed} failed).`;
}

// ── Main handler ─────────────────────────────────────────────

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'POST required', jobs: ['lead-check', 'dev-check', 'flush-batch', 'morning-briefing', 'evening-recap', 'process-captures'] }),
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
      case 'process-captures':
        result = await processCaptures();
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
