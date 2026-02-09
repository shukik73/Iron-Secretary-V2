/**
 * Supabase Edge Function: telegram-bot
 *
 * Jay (The PM) — Lives in Telegram, reads Supabase, nudges Shuki.
 *
 * Webhook endpoint for Telegram Bot API. Handles:
 *   /status  — System health across all projects
 *   /today   — Today's tasks for all agents
 *   /tasks   — Filter tasks by project or assignee
 *   /nudge   — Manually trigger overdue check
 *
 * Also exposes POST /notify for internal agents to send messages.
 *
 * Required Supabase secrets:
 *   TELEGRAM_BOT_TOKEN  — From @BotFather
 *   SUPABASE_URL        — Auto-set by Supabase
 *   SUPABASE_SERVICE_ROLE_KEY — Auto-set by Supabase
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── Telegram API helpers ─────────────────────────────────────

async function sendTelegram(chatId: number | bigint, text: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN not set');
    return false;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    console.error('Telegram send failed:', await res.text());
  }
  return res.ok;
}

// ── Command handlers ─────────────────────────────────────────

async function handleStatus(chatId: number): Promise<void> {
  const { data: projects } = await supabase
    .from('projects')
    .select('name, slug, status');

  const { data: tasks } = await supabase
    .from('agent_tasks')
    .select('assignee, status, priority, due_date, project_id');

  const now = new Date();
  const activeTasks = tasks?.filter(t => t.status !== 'done' && t.status !== 'cancelled') ?? [];
  const overdue = activeTasks.filter(t => t.due_date && new Date(t.due_date) < now);
  const blocked = activeTasks.filter(t => t.status === 'blocked');
  const inProgress = activeTasks.filter(t => t.status === 'in_progress');

  // Per-agent breakdown
  const agents = ['shuki', 'cc', 'jay', 'gemini', 'ag'];
  const agentLines = agents.map(a => {
    const mine = activeTasks.filter(t => t.assignee === a);
    if (mine.length === 0) return `  ${agentEmoji(a)} ${agentLabel(a)}: idle`;
    const ip = mine.filter(t => t.status === 'in_progress').length;
    const pend = mine.filter(t => t.status === 'pending').length;
    return `  ${agentEmoji(a)} ${agentLabel(a)}: ${ip} active, ${pend} pending`;
  }).join('\n');

  // Project summary
  const projectLines = (projects ?? []).map(p => {
    const projectTasks = activeTasks.filter(t => {
      // We'd need project_id mapping — for now show all
      return true;
    });
    const icon = p.status === 'active' ? '🟢' : p.status === 'paused' ? '🟡' : '🔴';
    return `  ${icon} ${p.name}`;
  }).join('\n');

  const msg = `<b>Iron Secretary — System Health</b>
━━━━━━━━━━━━━━━━━━━━━━

<b>Projects</b>
${projectLines || '  No projects found'}

<b>Tasks Overview</b>
  📋 Active: ${activeTasks.length}
  🔥 In Progress: ${inProgress.length}
  🚨 Overdue: ${overdue.length}
  🚫 Blocked: ${blocked.length}

<b>Agent Status</b>
${agentLines}

${overdue.length > 0 ? `\n⚠️ <b>${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}!</b> Use /today to see details.` : '✅ No overdue tasks.'}`;

  await sendTelegram(chatId, msg);
}

async function handleToday(chatId: number): Promise<void> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // Get all active tasks
  const { data: tasks } = await supabase
    .from('agent_tasks')
    .select('title, assignee, status, priority, due_date, blocker_notes')
    .in('status', ['pending', 'in_progress', 'review', 'blocked'])
    .order('priority')
    .order('due_date');

  if (!tasks?.length) {
    await sendTelegram(chatId, '📭 No active tasks. Enjoy the quiet — or create some work!\n\nUse /tasks to see completed ones.');
    return;
  }

  const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < now);
  const dueToday = tasks.filter(t => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date);
    return d >= todayStart && d <= todayEnd;
  });
  const upcoming = tasks.filter(t => {
    if (!t.due_date) return true; // no date = still active
    return new Date(t.due_date) > todayEnd;
  });

  let msg = `<b>📅 Today's Battle Plan</b>\n━━━━━━━━━━━━━━━━━━━━━━\n`;

  if (overdue.length > 0) {
    msg += `\n🚨 <b>OVERDUE</b>\n`;
    msg += overdue.map(t => formatTask(t)).join('\n');
  }

  if (dueToday.length > 0) {
    msg += `\n\n📌 <b>DUE TODAY</b>\n`;
    msg += dueToday.map(t => formatTask(t)).join('\n');
  }

  if (upcoming.length > 0) {
    msg += `\n\n📋 <b>UPCOMING</b>\n`;
    msg += upcoming.slice(0, 10).map(t => formatTask(t)).join('\n');
    if (upcoming.length > 10) {
      msg += `\n  ... and ${upcoming.length - 10} more`;
    }
  }

  await sendTelegram(chatId, msg);
}

async function handleTasks(chatId: number, args: string): Promise<void> {
  const filter = args.trim().toLowerCase();

  let query = supabase
    .from('agent_tasks')
    .select('title, assignee, status, priority, due_date, project_id')
    .order('created_at', { ascending: false })
    .limit(15);

  // Filter by assignee
  const agents = ['shuki', 'cc', 'jay', 'gemini', 'ag'];
  if (agents.includes(filter)) {
    query = query.eq('assignee', filter);
  }

  // Filter by status
  const statuses = ['pending', 'in_progress', 'review', 'done', 'blocked'];
  if (statuses.includes(filter)) {
    query = query.eq('status', filter);
  }

  const { data: tasks } = await query;

  if (!tasks?.length) {
    await sendTelegram(chatId, `📭 No tasks found${filter ? ` for "${filter}"` : ''}.\n\nTry: /tasks cc, /tasks pending, or /tasks done`);
    return;
  }

  const msg = `<b>📋 Tasks${filter ? ` (${filter})` : ''}</b>\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    tasks.map(t => formatTask(t)).join('\n');

  await sendTelegram(chatId, msg);
}

async function handleNudge(chatId: number): Promise<void> {
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  // Check overdue tasks
  const { data: overdue } = await supabase
    .from('agent_tasks')
    .select('title, assignee, due_date, priority')
    .lt('due_date', now.toISOString())
    .in('status', ['pending', 'in_progress'])
    .order('due_date');

  // Check stale agent context (writing for >2 hours)
  const { data: staleAgents } = await supabase
    .from('agent_context')
    .select('agent_id, current_file_path, action_type, heartbeat')
    .lt('heartbeat', twoHoursAgo.toISOString())
    .is('ended_at', null);

  // Check cold leads (new leads not touched in 2+ hours)
  const { data: coldLeads } = await supabase
    .from('leads')
    .select('name, device_type, created_at')
    .eq('status', 'new')
    .lt('created_at', twoHoursAgo.toISOString())
    .limit(5);

  let msg = `<b>🔔 Nudge Report</b>\n━━━━━━━━━━━━━━━━━━━━━━\n`;
  let hasIssues = false;

  if (overdue?.length) {
    hasIssues = true;
    msg += `\n🚨 <b>${overdue.length} Overdue Task${overdue.length > 1 ? 's' : ''}</b>\n`;
    msg += overdue.map(t =>
      `  • ${priorityEmoji(t.priority)} ${t.title} → ${agentEmoji(t.assignee)} ${agentLabel(t.assignee)}`
    ).join('\n');
  }

  if (staleAgents?.length) {
    hasIssues = true;
    msg += `\n\n⏰ <b>Stale Agent Sessions</b>\n`;
    msg += staleAgents.map(a =>
      `  • ${agentEmoji(a.agent_id)} ${agentLabel(a.agent_id)} has been ${a.action_type} <code>${a.current_file_path ?? 'unknown'}</code> for 2+ hours`
    ).join('\n');
  }

  if (coldLeads?.length) {
    hasIssues = true;
    msg += `\n\n❄️ <b>${coldLeads.length} Cold Lead${coldLeads.length > 1 ? 's' : ''}</b>\n`;
    msg += coldLeads.map(l =>
      `  • ${l.name} — ${l.device_type ?? 'unknown device'}`
    ).join('\n');
    msg += `\n  <i>These leads are getting cold. Call now.</i>`;
  }

  if (!hasIssues) {
    msg += `\n✅ All clear. No overdue tasks, no stale sessions, no cold leads.`;
  }

  await sendTelegram(chatId, msg);
}

async function handleHelp(chatId: number): Promise<void> {
  const msg = `<b>🤖 Jay — Iron Secretary PM</b>
━━━━━━━━━━━━━━━━━━━━━━

<b>Commands</b>
  /status — System health across all projects
  /today — Today's tasks for all agents
  /tasks — List recent tasks (filter: /tasks cc, /tasks pending)
  /nudge — Check for overdue tasks, cold leads, stale sessions
  /help — This message

<b>Notification Levels</b>
  🔴 Level 1 (Urgent) — Instant push
  🟡 Level 2 (Status) — Batched every 4 hours
  🟢 Level 3 (Info) — Morning briefing only

<b>Team</b>
  👔 Shuki (CEO) · 🔨 CC (Builder)
  📋 Jay (PM) · 🧠 Gemini (CTO) · 🎨 AG (Designer)`;

  await sendTelegram(chatId, msg);
}

// ── Internal notify endpoint ─────────────────────────────────
// Other edge functions or cron jobs call this to send notifications.

async function handleNotify(req: Request): Promise<Response> {
  const { chat_id, message, level = 1 } = await req.json();

  if (!chat_id || !message) {
    return new Response(
      JSON.stringify({ error: 'chat_id and message required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (level === 1) {
    // Urgent — send immediately
    const sent = await sendTelegram(chat_id, message);
    return new Response(
      JSON.stringify({ sent }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Level 2/3 — queue for batch delivery
  const { error } = await supabase.from('notification_queue').insert({
    channel: 'telegram',
    level,
    title: 'Notification',
    body: message,
    source_agent: 'system',
  });

  return new Response(
    JSON.stringify({ queued: !error }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

// ── Formatting helpers ───────────────────────────────────────

function formatTask(t: any): string {
  const status = statusEmoji(t.status);
  const priority = priorityEmoji(t.priority);
  const agent = agentEmoji(t.assignee);
  const due = t.due_date
    ? new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'no date';
  return `  ${status} ${priority} ${t.title}\n      ${agent} ${agentLabel(t.assignee)} · ${due}`;
}

function statusEmoji(status: string): string {
  const map: Record<string, string> = {
    pending: '⬜', in_progress: '🔵', review: '🟡',
    done: '✅', blocked: '🚫', cancelled: '⚪',
  };
  return map[status] ?? '❓';
}

function priorityEmoji(priority: string): string {
  const map: Record<string, string> = {
    critical: '🔴', high: '🟠', medium: '🟡', low: '🟢',
  };
  return map[priority] ?? '⚪';
}

function agentEmoji(agent: string): string {
  const map: Record<string, string> = {
    shuki: '👔', cc: '🔨', jay: '📋', gemini: '🧠', ag: '🎨',
  };
  return map[agent] ?? '🤖';
}

function agentLabel(agent: string): string {
  const map: Record<string, string> = {
    shuki: 'Shuki', cc: 'CC', jay: 'Jay', gemini: 'Gemini', ag: 'AG',
  };
  return map[agent] ?? agent;
}

// ── Main handler ─────────────────────────────────────────────

serve(async (req) => {
  try {
    const url = new URL(req.url);

    // Internal notify endpoint (called by other functions/cron)
    if (url.pathname.endsWith('/notify') && req.method === 'POST') {
      return handleNotify(req);
    }

    // Telegram webhook (POST from Telegram servers)
    if (req.method === 'POST') {
      const body = await req.json();
      const message = body.message;

      if (!message?.text || !message?.chat?.id) {
        return new Response('ok');
      }

      const chatId = message.chat.id;
      const text = message.text.trim();

      // Parse command and arguments
      const [command, ...argParts] = text.split(' ');
      const args = argParts.join(' ');

      switch (command.toLowerCase().replace(/@.*$/, '')) {
        case '/status':
          await handleStatus(chatId);
          break;
        case '/today':
          await handleToday(chatId);
          break;
        case '/tasks':
          await handleTasks(chatId, args);
          break;
        case '/nudge':
          await handleNudge(chatId);
          break;
        case '/help':
        case '/start':
          await handleHelp(chatId);
          break;
        default:
          // Unknown command — Jay acknowledges but doesn't spam
          if (text.startsWith('/')) {
            await sendTelegram(chatId, `Unknown command: ${command}\nUse /help to see available commands.`);
          }
          break;
      }

      return new Response('ok');
    }

    // GET — health check
    return new Response(
      JSON.stringify({ status: 'Jay is online', version: '1.0.0' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Jay error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
