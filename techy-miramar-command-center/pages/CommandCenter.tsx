import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  Filter,
  Hammer,
  MessageSquare,
  RefreshCw,
  Send,
  Users,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ── Types ────────────────────────────────────────────────────────────

interface AgentTask {
  id: string;
  title: string;
  description: string | null;
  assignee: string;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  blocker_notes: string | null;
  created_by: string;
  created_at: string;
  project_id: string | null;
}

interface AgentContextRow {
  id: string;
  agent_id: string;
  current_file_path: string | null;
  action_type: string;
  heartbeat: string;
  ended_at: string | null;
  session_notes: string | null;
}

interface AgentMessage {
  id: string;
  from_agent: string;
  to_agent: string;
  message_type: string;
  subject: string | null;
  body: string;
  read_at: string | null;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  slug: string;
  status: string;
}

// ── Agent Config ─────────────────────────────────────────────────────

const AGENTS = [
  { id: 'shuki', label: 'Shuki', role: 'CEO', emoji: '👔', color: 'blue' },
  { id: 'cc', label: 'CC', role: 'Builder', emoji: '🔨', color: 'emerald' },
  { id: 'jay', label: 'Jay', role: 'PM', emoji: '📋', color: 'amber' },
  { id: 'gemini', label: 'Gemini', role: 'CTO', emoji: '🧠', color: 'purple' },
  { id: 'ag', label: 'AG', role: 'Designer', emoji: '🎨', color: 'rose' },
] as const;

const agentMap = Object.fromEntries(AGENTS.map(a => [a.id, a]));

// ── Helpers ──────────────────────────────────────────────────────────

function statusEmoji(status: string): string {
  const map: Record<string, string> = {
    pending: '⬜', in_progress: '🔵', review: '🟡',
    done: '✅', blocked: '🚫', cancelled: '⚪',
  };
  return map[status] ?? '❓';
}

function priorityColor(priority: string): string {
  const map: Record<string, string> = {
    critical: 'text-rose-400 bg-rose-400/10',
    high: 'text-orange-400 bg-orange-400/10',
    medium: 'text-amber-400 bg-amber-400/10',
    low: 'text-emerald-400 bg-emerald-400/10',
  };
  return map[priority] ?? 'text-gray-400 bg-gray-400/10';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function agentColor(agentId: string): string {
  return agentMap[agentId]?.color ?? 'gray';
}

function agentBorderClass(color: string): string {
  const map: Record<string, string> = {
    blue: 'border-blue-500/40',
    emerald: 'border-emerald-500/40',
    amber: 'border-amber-500/40',
    purple: 'border-purple-500/40',
    rose: 'border-rose-500/40',
  };
  return map[color] ?? 'border-gray-500/40';
}

function agentBgClass(color: string): string {
  const map: Record<string, string> = {
    blue: 'bg-blue-500/10',
    emerald: 'bg-emerald-500/10',
    amber: 'bg-amber-500/10',
    purple: 'bg-purple-500/10',
    rose: 'bg-rose-500/10',
  };
  return map[color] ?? 'bg-gray-500/10';
}

function agentTextClass(color: string): string {
  const map: Record<string, string> = {
    blue: 'text-blue-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    purple: 'text-purple-400',
    rose: 'text-rose-400',
  };
  return map[color] ?? 'text-gray-400';
}

// ── Mock data (used when Supabase is not connected) ──────────────────

const MOCK_TASKS: AgentTask[] = [
  { id: '1', title: 'Deploy multi-agent task system migration', assignee: 'shuki', status: 'pending', priority: 'critical', due_date: new Date().toISOString(), description: 'Run migrations 20260209000001-000003 against Supabase', completed_at: null, blocker_notes: null, created_by: 'cc', created_at: new Date().toISOString(), project_id: null },
  { id: '2', title: 'Reconnect Jay to Telegram', assignee: 'shuki', status: 'pending', priority: 'high', due_date: new Date(Date.now() + 86400000).toISOString(), description: 'Set webhook URL, verify bot token', completed_at: null, blocker_notes: null, created_by: 'cc', created_at: new Date().toISOString(), project_id: null },
  { id: '3', title: 'Audit new migrations for security', assignee: 'gemini', status: 'pending', priority: 'high', due_date: new Date(Date.now() + 86400000).toISOString(), description: 'Review RLS policies, audit trigger, seed data', completed_at: null, blocker_notes: null, created_by: 'cc', created_at: new Date().toISOString(), project_id: null },
  { id: '4', title: 'Build Phase 4 Dashboard UI', assignee: 'cc', status: 'done', priority: 'high', due_date: new Date().toISOString(), description: 'Agent health panel + shared task board', completed_at: new Date().toISOString(), blocker_notes: null, created_by: 'cc', created_at: new Date().toISOString(), project_id: null },
  { id: '5', title: 'Test /status, /today, /tasks commands', assignee: 'jay', status: 'pending', priority: 'medium', due_date: new Date(Date.now() + 172800000).toISOString(), description: 'Verify Telegram bot reads new tables correctly', completed_at: null, blocker_notes: null, created_by: 'cc', created_at: new Date().toISOString(), project_id: null },
  { id: '6', title: 'Review Phase 4 UI polish', assignee: 'ag', status: 'pending', priority: 'medium', due_date: new Date(Date.now() + 172800000).toISOString(), description: 'Layout, colors, responsiveness review', completed_at: null, blocker_notes: null, created_by: 'cc', created_at: new Date().toISOString(), project_id: null },
  { id: '7', title: 'Define morning briefing template', assignee: 'jay', status: 'pending', priority: 'medium', due_date: null, description: 'What does Shuki need to see at 7am', completed_at: null, blocker_notes: null, created_by: 'gemini', created_at: new Date().toISOString(), project_id: null },
  { id: '8', title: 'Review telegram-bot for edge cases', assignee: 'gemini', status: 'pending', priority: 'medium', due_date: null, description: 'Rate limiting, auth on /notify endpoint', completed_at: null, blocker_notes: null, created_by: 'cc', created_at: new Date().toISOString(), project_id: null },
];

const MOCK_CONTEXT: AgentContextRow[] = [
  { id: '1', agent_id: 'cc', current_file_path: 'pages/CommandCenter.tsx', action_type: 'writing', heartbeat: new Date().toISOString(), ended_at: null, session_notes: 'Building Phase 4 Dashboard' },
  { id: '2', agent_id: 'jay', current_file_path: null, action_type: 'idle', heartbeat: new Date(Date.now() - 3600000).toISOString(), ended_at: null, session_notes: 'Waiting for Telegram reconnection' },
];

const MOCK_MESSAGES: AgentMessage[] = [
  { id: '1', from_agent: 'cc', to_agent: 'shuki', message_type: 'handoff', subject: 'Phase 2+3 Complete', body: 'Telegram bot and cron jobs are built. Need you to deploy migrations and reconnect Jay.', read_at: null, created_at: new Date().toISOString() },
  { id: '2', from_agent: 'gemini', to_agent: 'all', message_type: 'briefing', subject: 'CTO Advisory', body: 'Notification fatigue risk: ensure Level 2 messages are batched every 4 hours, not sent individually.', read_at: null, created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: '3', from_agent: 'cc', to_agent: 'gemini', message_type: 'status_update', subject: null, body: 'Migration 20260209000001 includes auto-audit trigger on agent_tasks. Every state change is logged.', read_at: new Date().toISOString(), created_at: new Date(Date.now() - 10800000).toISOString() },
];

const MOCK_PROJECTS: Project[] = [
  { id: '1', name: 'Iron Secretary', slug: 'iron-secretary', status: 'active' },
  { id: '2', name: 'ReviewGuard', slug: 'reviewguard', status: 'active' },
  { id: '3', name: 'LeadCatcher', slug: 'leadcatcher', status: 'active' },
];

// ── Agent Health Card ────────────────────────────────────────────────

const AgentCard: React.FC<{
  agent: typeof AGENTS[number];
  context: AgentContextRow | undefined;
  taskCount: number;
  activeCount: number;
}> = ({ agent, context, taskCount, activeCount }) => {
  const color = agent.color;
  const isOnline = context && !context.ended_at && context.action_type !== 'idle';
  const lastSeen = context?.heartbeat ? timeAgo(context.heartbeat) : 'never';

  return (
    <div className={`glass-card rounded-xl p-4 border-l-4 ${agentBorderClass(color)} hover:bg-white/5 transition-all`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${agentBgClass(color)} flex items-center justify-center text-lg`}>
            {agent.emoji}
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">{agent.label}</h3>
            <p className="text-gray-500 text-xs">{agent.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isOnline ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-gray-600" />
          )}
          <span className={`text-[10px] font-bold uppercase tracking-wider ${isOnline ? 'text-emerald-400' : 'text-gray-600'}`}>
            {isOnline ? 'active' : 'idle'}
          </span>
        </div>
      </div>

      {/* Current activity */}
      {context && !context.ended_at && context.action_type !== 'idle' && (
        <div className="mb-3 p-2 rounded-lg bg-white/5">
          <p className="text-xs text-gray-400">
            <span className={`${agentTextClass(color)} font-medium`}>{context.action_type}</span>
            {context.current_file_path && (
              <> <code className="text-gray-500">{context.current_file_path}</code></>
            )}
          </p>
          {context.session_notes && (
            <p className="text-xs text-gray-600 mt-1">{context.session_notes}</p>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex gap-3">
          <span className="text-gray-500">
            <span className="text-white font-medium">{activeCount}</span> active
          </span>
          <span className="text-gray-500">
            <span className="text-white font-medium">{taskCount}</span> total
          </span>
        </div>
        <span className="text-gray-600">
          <Clock className="w-3 h-3 inline mr-1" />
          {lastSeen}
        </span>
      </div>
    </div>
  );
};

// ── Task Row ─────────────────────────────────────────────────────────

const TaskRow: React.FC<{ task: AgentTask }> = ({ task }) => {
  const agent = agentMap[task.assignee];
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done' && task.status !== 'cancelled';

  return (
    <div className={`flex items-center p-3 rounded-lg hover:bg-white/5 transition-all group ${task.status === 'done' ? 'opacity-50' : ''}`}>
      <span className="text-sm mr-3">{statusEmoji(task.status)}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-gray-600' : 'text-white'}`}>
            {task.title}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${priorityColor(task.priority)}`}>
            {task.priority}
          </span>
        </div>
        {task.description && (
          <p className="text-xs text-gray-600 mt-0.5 truncate">{task.description}</p>
        )}
      </div>

      <div className="flex items-center gap-3 ml-3 flex-shrink-0">
        {/* Assignee badge */}
        {agent && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${agentTextClass(agent.color)} ${agentBgClass(agent.color)}`}>
            {agent.emoji} {agent.label}
          </span>
        )}

        {/* Due date */}
        {task.due_date && task.status !== 'done' && (
          <span className={`hidden sm:flex items-center gap-1 text-xs ${isOverdue ? 'text-rose-400' : 'text-gray-500'}`}>
            <Clock size={11} />
            {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}

        {task.status === 'done' && task.completed_at && (
          <span className="hidden sm:flex items-center gap-1 text-xs text-gray-600">
            <CheckCircle2 size={11} />
            {timeAgo(task.completed_at)}
          </span>
        )}
      </div>
    </div>
  );
};

// ── Message Row ──────────────────────────────────────────────────────

const MessageRow: React.FC<{ msg: AgentMessage }> = ({ msg }) => {
  const from = agentMap[msg.from_agent];
  const to = agentMap[msg.to_agent];
  const isUnread = !msg.read_at;

  const typeIcon: Record<string, string> = {
    handoff: '🔄', nudge: '👊', conflict: '⚠️', status_update: '📊',
    question: '❓', answer: '💬', briefing: '📝', escalation: '🚨',
  };

  return (
    <div className={`p-3 rounded-lg ${isUnread ? 'bg-white/5 border border-white/10' : ''} hover:bg-white/5 transition-all`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-sm">{typeIcon[msg.message_type] ?? '💬'}</span>
          {from && (
            <span className={`text-xs font-semibold ${agentTextClass(from.color)}`}>
              {from.emoji} {from.label}
            </span>
          )}
          <ArrowRight className="w-3 h-3 text-gray-600" />
          <span className="text-xs text-gray-400">
            {msg.to_agent === 'all' ? '📢 All' : to ? `${to.emoji} ${to.label}` : msg.to_agent}
          </span>
          {isUnread && (
            <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
          )}
        </div>
        <span className="text-[10px] text-gray-600">{timeAgo(msg.created_at)}</span>
      </div>
      {msg.subject && (
        <p className="text-xs text-white font-medium mb-0.5">{msg.subject}</p>
      )}
      <p className="text-xs text-gray-400 leading-relaxed">{msg.body}</p>
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────

const CommandCenter: React.FC = () => {
  const [tasks, setTasks] = useState<AgentTask[]>(MOCK_TASKS);
  const [context, setContext] = useState<AgentContextRow[]>(MOCK_CONTEXT);
  const [messages, setMessages] = useState<AgentMessage[]>(MOCK_MESSAGES);
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [messagesExpanded, setMessagesExpanded] = useState(true);

  // ── Data fetching ──────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const [tasksRes, contextRes, messagesRes, projectsRes] = await Promise.all([
        supabase.from('agent_tasks').select('*').order('priority').order('due_date'),
        supabase.from('agent_context').select('*').is('ended_at', null),
        supabase.from('agent_messages').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('projects').select('*'),
      ]);

      if (tasksRes.data) setTasks(tasksRes.data);
      if (contextRes.data) setContext(contextRes.data);
      if (messagesRes.data) setMessages(messagesRes.data);
      if (projectsRes.data) setProjects(projectsRes.data);
      setIsLive(true);
    } catch {
      // Stay on mock data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Derived data ───────────────────────────────────────────

  const activeTasks = useMemo(() => {
    let filtered = tasks;

    if (filterStatus === 'active') {
      filtered = filtered.filter(t => t.status !== 'done' && t.status !== 'cancelled');
    } else if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus);
    }

    if (filterAgent !== 'all') {
      filtered = filtered.filter(t => t.assignee === filterAgent);
    }

    return filtered;
  }, [tasks, filterAgent, filterStatus]);

  const overdueTasks = useMemo(() =>
    tasks.filter(t =>
      t.due_date &&
      new Date(t.due_date) < new Date() &&
      t.status !== 'done' && t.status !== 'cancelled'
    ), [tasks]);

  const blockedTasks = useMemo(() =>
    tasks.filter(t => t.status === 'blocked'), [tasks]);

  const inProgressTasks = useMemo(() =>
    tasks.filter(t => t.status === 'in_progress'), [tasks]);

  const completedToday = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return tasks.filter(t =>
      t.status === 'done' &&
      t.completed_at &&
      new Date(t.completed_at) >= todayStart
    );
  }, [tasks]);

  const unreadMessages = useMemo(() =>
    messages.filter(m => !m.read_at), [messages]);

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-800/50 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold text-white tracking-tight">Command Center</h1>
            {isLive ? (
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-500/10 px-2.5 py-1 rounded-full">
                Mock Data
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm flex items-center">
            <Users className="w-4 h-4 mr-2" />
            {AGENTS.length} agents &middot; {projects.length} projects &middot; {tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').length} active tasks
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 glass-card rounded-lg text-sm text-gray-300 hover:text-white transition-all mt-4 md:mt-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Stats Row ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">In Progress</p>
          <p className="text-2xl font-bold text-white">{inProgressTasks.length}</p>
        </div>
        <div className={`glass-card rounded-xl p-4 border ${overdueTasks.length > 0 ? 'border-rose-500/30' : 'border-white/5'}`}>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Overdue</p>
          <p className={`text-2xl font-bold ${overdueTasks.length > 0 ? 'text-rose-400' : 'text-white'}`}>{overdueTasks.length}</p>
        </div>
        <div className={`glass-card rounded-xl p-4 border ${blockedTasks.length > 0 ? 'border-amber-500/30' : 'border-white/5'}`}>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Blocked</p>
          <p className={`text-2xl font-bold ${blockedTasks.length > 0 ? 'text-amber-400' : 'text-white'}`}>{blockedTasks.length}</p>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Done Today</p>
          <p className="text-2xl font-bold text-emerald-400">{completedToday.length}</p>
        </div>
      </div>

      {/* ── Main Grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Agent Health + Task Board */}
        <div className="lg:col-span-2 space-y-6">

          {/* Agent Health Panel */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Agent Health
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {AGENTS.map(agent => {
                const agentContext = context.find(c => c.agent_id === agent.id);
                const agentTasks = tasks.filter(t => t.assignee === agent.id && t.status !== 'done' && t.status !== 'cancelled');
                const activeTasks = tasks.filter(t => t.assignee === agent.id && t.status === 'in_progress');
                return (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    context={agentContext}
                    taskCount={agentTasks.length}
                    activeCount={activeTasks.length}
                  />
                );
              })}
            </div>
          </section>

          {/* Shared Task Board */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Hammer className="w-4 h-4 text-amber-400" />
                Shared Task Board
              </h2>
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-gray-500" />
                <select
                  value={filterAgent}
                  onChange={e => setFilterAgent(e.target.value)}
                  className="bg-black/30 border border-white/10 text-xs text-gray-300 rounded-lg px-2 py-1 focus:outline-none"
                >
                  <option value="all">All Agents</option>
                  {AGENTS.map(a => (
                    <option key={a.id} value={a.id}>{a.emoji} {a.label}</option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="bg-black/30 border border-white/10 text-xs text-gray-300 rounded-lg px-2 py-1 focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">In Review</option>
                  <option value="blocked">Blocked</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>

            <div className="glass-card rounded-xl divide-y divide-white/5 overflow-hidden">
              {activeTasks.length === 0 ? (
                <div className="p-8 text-center">
                  <Circle className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No tasks match this filter.</p>
                </div>
              ) : (
                activeTasks.map(task => (
                  <TaskRow key={task.id} task={task} />
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right: Messages + Projects */}
        <div className="space-y-6">

          {/* Agent Messages */}
          <section>
            <button
              onClick={() => setMessagesExpanded(prev => !prev)}
              className="flex items-center justify-between w-full mb-3"
            >
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                Agent Comms
                {unreadMessages.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-blue-500/15 text-blue-400">
                    {unreadMessages.length} new
                  </span>
                )}
              </h2>
              {messagesExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {messagesExpanded && (
              <div className="space-y-2">
                {messages.length === 0 ? (
                  <div className="glass-card rounded-xl p-6 text-center">
                    <Send className="w-6 h-6 text-gray-700 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No messages yet.</p>
                  </div>
                ) : (
                  messages.slice(0, 10).map(msg => (
                    <MessageRow key={msg.id} msg={msg} />
                  ))
                )}
              </div>
            )}
          </section>

          {/* Project Health */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-purple-400" />
              Projects
            </h2>
            <div className="space-y-2">
              {projects.map(project => {
                const projectTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled');
                const icon = project.status === 'active' ? '🟢' : project.status === 'paused' ? '🟡' : '🔴';
                return (
                  <div key={project.id} className="glass-card rounded-xl p-4 hover:bg-white/5 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{icon}</span>
                        <h3 className="text-sm font-medium text-white">{project.name}</h3>
                      </div>
                      <span className="text-xs text-gray-500">{project.slug}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Quick Info */}
          <section className="glass-card rounded-xl p-4 border border-indigo-500/20">
            <div className="flex items-start gap-2">
              <Activity className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-300">
                  <span className="text-indigo-400 font-semibold">Jay Status:</span>{' '}
                  Telegram bot is built. Reconnect via @BotFather to go live.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  /status /today /tasks /nudge ready when connected.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CommandCenter;
