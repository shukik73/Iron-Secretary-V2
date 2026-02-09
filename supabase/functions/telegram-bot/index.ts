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
 *   /add     — Create a new task
 *   /done    — Mark a task as completed
 *   /assign  — Create and assign a task to an agent
 *   /block   — Mark a task as blocked
 *   /start   — Mark a task as in progress
 *   /note    — Send a message to an agent
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

<b>📖 Read Commands</b>
  /status — System health across all projects
  /today — Today's tasks for all agents
  /tasks — List tasks (filter: /tasks cc, /tasks pending)
  /nudge — Check overdue tasks, cold leads, stale sessions

<b>✏️ Write Commands</b>
  /add — Create task: <code>/add [cc:high] Fix login</code>
  /done — Complete task: <code>/done 3</code> or <code>/done deploy</code>
  /start — Begin task: <code>/start 2</code>
  /assign — Assign/reassign: <code>/assign cc Fix bug</code>
  /block — Block task: <code>/block 3 Waiting on API key</code>
  /note — Message agent: <code>/note cc Push the PR</code>

<b>Notification Levels</b>
  🔴 Level 1 (Urgent) — Instant push
  🟡 Level 2 (Status) — Batched every 4 hours
  🟢 Level 3 (Info) — Morning briefing only

<b>Team</b>
  👔 Shuki · 🔨 CC · 📋 Jay · 🧠 Gemini · 🎨 AG`;

  await sendTelegram(chatId, msg);
}

// ── Write commands ───────────────────────────────────────────

const VALID_AGENTS = ['shuki', 'cc', 'jay', 'gemini', 'ag'];

async function findTaskByKeyword(keyword: string): Promise<any | null> {
  // Try exact number match first (task index from /today listing)
  const { data: tasks } = await supabase
    .from('agent_tasks')
    .select('*')
    .in('status', ['pending', 'in_progress', 'review', 'blocked'])
    .order('priority')
    .order('due_date');

  if (!tasks?.length) return null;

  // If keyword is a number, use it as 1-based index
  const index = parseInt(keyword);
  if (!isNaN(index) && index >= 1 && index <= tasks.length) {
    return tasks[index - 1];
  }

  // Otherwise search by title substring (case-insensitive)
  const lower = keyword.toLowerCase();
  return tasks.find(t => t.title.toLowerCase().includes(lower)) ?? null;
}

async function handleAdd(chatId: number, args: string): Promise<void> {
  if (!args.trim()) {
    await sendTelegram(chatId, `Usage:\n  <code>/add Deploy new feature</code>\n  <code>/add [cc] Fix the login bug</code>\n  <code>/add [gemini:high] Review security</code>\n\nFormat: /add [agent:priority] title`);
    return;
  }

  // Parse optional [agent] or [agent:priority] prefix
  let assignee = 'shuki';
  let priority = 'medium';
  let title = args.trim();

  const bracketMatch = title.match(/^\[(\w+)(?::(\w+))?\]\s*(.+)$/);
  if (bracketMatch) {
    const parsedAgent = bracketMatch[1].toLowerCase();
    const parsedPriority = bracketMatch[2]?.toLowerCase();
    const parsedTitle = bracketMatch[3];

    if (VALID_AGENTS.includes(parsedAgent)) {
      assignee = parsedAgent;
    }
    if (parsedPriority && ['critical', 'high', 'medium', 'low'].includes(parsedPriority)) {
      priority = parsedPriority;
    }
    title = parsedTitle;
  }

  const { data, error } = await supabase
    .from('agent_tasks')
    .insert({
      title,
      assignee,
      priority,
      status: 'pending',
      created_by: 'jay',
    })
    .select()
    .single();

  if (error) {
    await sendTelegram(chatId, `❌ Failed to create task: ${error.message}`);
    return;
  }

  await sendTelegram(chatId, `✅ Task created:\n\n  ${priorityEmoji(priority)} <b>${title}</b>\n  → ${agentEmoji(assignee)} ${agentLabel(assignee)} · ${priority}\n\nUse /today to see all tasks.`);
}

async function handleDone(chatId: number, args: string): Promise<void> {
  if (!args.trim()) {
    await sendTelegram(chatId, `Usage:\n  <code>/done Deploy migrations</code>\n  <code>/done 1</code> (task number from /today)\n\nMarks the matching task as completed.`);
    return;
  }

  const task = await findTaskByKeyword(args.trim());
  if (!task) {
    await sendTelegram(chatId, `❌ No active task matching "${args.trim()}".\n\nUse /today to see task numbers.`);
    return;
  }

  const { error } = await supabase
    .from('agent_tasks')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('id', task.id);

  if (error) {
    await sendTelegram(chatId, `❌ Failed to update: ${error.message}`);
    return;
  }

  await sendTelegram(chatId, `✅ Done: <b>${task.title}</b>\n  (was assigned to ${agentEmoji(task.assignee)} ${agentLabel(task.assignee)})`);
}

async function handleAssign(chatId: number, args: string): Promise<void> {
  const parts = args.trim().split(/\s+/);
  if (parts.length < 2) {
    await sendTelegram(chatId, `Usage:\n  <code>/assign cc Fix the login bug</code>\n  <code>/assign gemini 3</code> (reassign task #3)\n\nAgents: shuki, cc, jay, gemini, ag`);
    return;
  }

  const targetAgent = parts[0].toLowerCase();
  if (!VALID_AGENTS.includes(targetAgent)) {
    await sendTelegram(chatId, `❌ Unknown agent: "${parts[0]}"\n\nValid agents: ${VALID_AGENTS.join(', ')}`);
    return;
  }

  const rest = parts.slice(1).join(' ');

  // Check if it's a reassignment of existing task
  const existingTask = await findTaskByKeyword(rest);
  if (existingTask) {
    const { error } = await supabase
      .from('agent_tasks')
      .update({ assignee: targetAgent })
      .eq('id', existingTask.id);

    if (error) {
      await sendTelegram(chatId, `❌ Failed to reassign: ${error.message}`);
      return;
    }

    await sendTelegram(chatId, `🔄 Reassigned: <b>${existingTask.title}</b>\n  → ${agentEmoji(targetAgent)} ${agentLabel(targetAgent)}`);

    // Send a handoff message
    await supabase.from('agent_messages').insert({
      from_agent: 'jay',
      to_agent: targetAgent,
      message_type: 'handoff',
      subject: `Task reassigned to you`,
      body: `"${existingTask.title}" has been assigned to you by Shuki via Jay.`,
    });
    return;
  }

  // Otherwise create a new task
  const { error } = await supabase
    .from('agent_tasks')
    .insert({
      title: rest,
      assignee: targetAgent,
      priority: 'medium',
      status: 'pending',
      created_by: 'jay',
    });

  if (error) {
    await sendTelegram(chatId, `❌ Failed to create task: ${error.message}`);
    return;
  }

  await sendTelegram(chatId, `✅ New task assigned:\n\n  <b>${rest}</b>\n  → ${agentEmoji(targetAgent)} ${agentLabel(targetAgent)}`);
}

async function handleBlock(chatId: number, args: string): Promise<void> {
  // Format: /block <keyword> <reason> or /block <number> <reason>
  const parts = args.trim().split(/\s+/);
  if (parts.length < 1 || !args.trim()) {
    await sendTelegram(chatId, `Usage:\n  <code>/block 3 Waiting on API key</code>\n  <code>/block deploy Need Supabase access</code>\n\nMarks a task as blocked with a reason.`);
    return;
  }

  // Try first word/number as task identifier
  const task = await findTaskByKeyword(parts[0]);
  if (!task) {
    await sendTelegram(chatId, `❌ No active task matching "${parts[0]}".\n\nUse /today to see task numbers.`);
    return;
  }

  const reason = parts.slice(1).join(' ') || 'No reason provided';

  const { error } = await supabase
    .from('agent_tasks')
    .update({ status: 'blocked', blocker_notes: reason })
    .eq('id', task.id);

  if (error) {
    await sendTelegram(chatId, `❌ Failed to update: ${error.message}`);
    return;
  }

  await sendTelegram(chatId, `🚫 Blocked: <b>${task.title}</b>\n  Reason: ${reason}\n  (${agentEmoji(task.assignee)} ${agentLabel(task.assignee)})`);
}

async function handleStart(chatId: number, args: string): Promise<void> {
  if (!args.trim()) {
    await sendTelegram(chatId, `Usage:\n  <code>/start 3</code>\n  <code>/start deploy</code>\n\nMarks a task as in progress.`);
    return;
  }

  const task = await findTaskByKeyword(args.trim());
  if (!task) {
    await sendTelegram(chatId, `❌ No active task matching "${args.trim()}".\n\nUse /today to see task numbers.`);
    return;
  }

  const { error } = await supabase
    .from('agent_tasks')
    .update({ status: 'in_progress' })
    .eq('id', task.id);

  if (error) {
    await sendTelegram(chatId, `❌ Failed to update: ${error.message}`);
    return;
  }

  await sendTelegram(chatId, `🔵 Started: <b>${task.title}</b>\n  → ${agentEmoji(task.assignee)} ${agentLabel(task.assignee)}`);
}

async function handleNote(chatId: number, args: string): Promise<void> {
  const parts = args.trim().split(/\s+/);
  if (parts.length < 2) {
    await sendTelegram(chatId, `Usage:\n  <code>/note cc Hey, push the PR when ready</code>\n  <code>/note gemini Please review the migration</code>\n  <code>/note all Standup at 10am</code>\n\nSends a message to an agent (visible in Command Center).`);
    return;
  }

  const targetAgent = parts[0].toLowerCase();
  if (!VALID_AGENTS.includes(targetAgent) && targetAgent !== 'all') {
    await sendTelegram(chatId, `❌ Unknown agent: "${parts[0]}"\n\nValid targets: ${VALID_AGENTS.join(', ')}, all`);
    return;
  }

  const body = parts.slice(1).join(' ');

  const { error } = await supabase.from('agent_messages').insert({
    from_agent: 'shuki',
    to_agent: targetAgent,
    message_type: 'nudge',
    body,
  });

  if (error) {
    await sendTelegram(chatId, `❌ Failed to send: ${error.message}`);
    return;
  }

  const target = targetAgent === 'all' ? '📢 All agents' : `${agentEmoji(targetAgent)} ${agentLabel(targetAgent)}`;
  await sendTelegram(chatId, `💬 Message sent to ${target}:\n  "${body}"`);
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

      const cmd = command.toLowerCase().replace(/@.*$/, '');
      switch (cmd) {
        // Read commands
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
          await handleHelp(chatId);
          break;
        // Write commands
        case '/add':
          await handleAdd(chatId, args);
          break;
        case '/done':
          await handleDone(chatId, args);
          break;
        case '/start':
          await handleStart(chatId, args);
          break;
        case '/assign':
          await handleAssign(chatId, args);
          break;
        case '/block':
          await handleBlock(chatId, args);
          break;
        case '/note':
          await handleNote(chatId, args);
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
