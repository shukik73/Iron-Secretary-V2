import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  AlertCircle,
  DollarSign,
  Wrench,
  Mail,
  Shield,
  Zap,
  Plus,
  ChevronDown,
  ChevronUp,
  Target,
  Timer,
  ArrowRight,
  Star,
  Calendar,
  BarChart3,
  Sparkles,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────

type PriorityLevel = 'must' | 'should' | 'could';

type SourceModule =
  | 'Repair'
  | 'Emilio'
  | 'Midas'
  | 'ReviewGuard'
  | 'Plan'
  | 'NightShift'
  | 'Leads'
  | 'Inventory';

interface TodayTask {
  id: string;
  title: string;
  priority: PriorityLevel;
  source: SourceModule;
  context: string;
  deadline: string | null;
  timeEstimate: number; // minutes
  revenueAtStake: number; // dollars, 0 if not applicable
  completed: boolean;
  completedAt: string | null;
}

// ── Mock Data ────────────────────────────────────────────────────────────

const initialTasks: TodayTask[] = [
  // MUST DO - Critical / overdue
  {
    id: 'st-1',
    title: 'Call back John D. about MacBook repair',
    priority: 'must',
    source: 'Repair',
    context: 'Ticket stalled 52h - MacBook Pro 2021 logic board',
    deadline: 'Overdue by 4h',
    timeEstimate: 10,
    revenueAtStake: 450,
    completed: false,
    completedAt: null,
  },
  {
    id: 'st-2',
    title: 'Respond to Midas deal: iPhone 14 Pro lot (5 units)',
    priority: 'must',
    source: 'Midas',
    context: 'Seller expires listing at 2 PM - $1,200 profit potential',
    deadline: '2:00 PM',
    timeEstimate: 15,
    revenueAtStake: 1200,
    completed: false,
    completedAt: null,
  },
  {
    id: 'st-3',
    title: 'Customer pickup: Maria S. - iPad screen',
    priority: 'must',
    source: 'Repair',
    context: 'Ready since yesterday, customer called twice',
    deadline: 'Overdue by 1d',
    timeEstimate: 5,
    revenueAtStake: 189,
    completed: false,
    completedAt: null,
  },
  {
    id: 'st-4',
    title: 'Pay supplier invoice: MobileSentrix parts order',
    priority: 'must',
    source: 'Inventory',
    context: 'Due today - 12 iPhone screens, 6 batteries',
    deadline: 'Today EOD',
    timeEstimate: 10,
    revenueAtStake: 0,
    completed: false,
    completedAt: null,
  },

  // SHOULD DO - Important but not critical
  {
    id: 'st-5',
    title: 'Follow up on aging debt: Carlos R. ($340)',
    priority: 'should',
    source: 'Leads',
    context: 'Samsung S23 Ultra repair - unpaid 12 days',
    deadline: null,
    timeEstimate: 10,
    revenueAtStake: 340,
    completed: false,
    completedAt: null,
  },
  {
    id: 'st-6',
    title: 'Reply to 3 Emilio warm leads',
    priority: 'should',
    source: 'Emilio',
    context: 'B2B prospects replied overnight - bulk repair inquiry',
    deadline: null,
    timeEstimate: 20,
    revenueAtStake: 800,
    completed: false,
    completedAt: null,
  },
  {
    id: 'st-7',
    title: 'Approve 4 ReviewGuard draft responses',
    priority: 'should',
    source: 'ReviewGuard',
    context: '2 positive, 1 neutral, 1 negative (3-star) review',
    deadline: null,
    timeEstimate: 15,
    revenueAtStake: 0,
    completed: false,
    completedAt: null,
  },
  {
    id: 'st-8',
    title: 'Order replacement parts for backlog repairs',
    priority: 'should',
    source: 'Inventory',
    context: '3 repairs waiting on parts: 2x Pixel 8 screens, 1x iPad battery',
    deadline: null,
    timeEstimate: 15,
    revenueAtStake: 520,
    completed: false,
    completedAt: null,
  },

  // COULD DO - Nice to have
  {
    id: 'st-9',
    title: 'Review Night Shift blog post drafts',
    priority: 'could',
    source: 'NightShift',
    context: '2 SEO posts ready: MacBook battery cost + iPhone screen guide',
    deadline: null,
    timeEstimate: 20,
    revenueAtStake: 0,
    completed: false,
    completedAt: null,
  },
  {
    id: 'st-10',
    title: 'Update Google Business Profile hours for holiday',
    priority: 'could',
    source: 'Plan',
    context: 'Presidents Day hours not updated yet',
    deadline: null,
    timeEstimate: 5,
    revenueAtStake: 0,
    completed: false,
    completedAt: null,
  },
  {
    id: 'st-11',
    title: 'Run quick inventory count on high-value items',
    priority: 'could',
    source: 'Inventory',
    context: 'Last count was 9 days ago - reconcile MacBook + iPhone stock',
    deadline: null,
    timeEstimate: 25,
    revenueAtStake: 0,
    completed: false,
    completedAt: null,
  },
  {
    id: 'st-12',
    title: 'Document new Samsung teardown process for S24',
    priority: 'could',
    source: 'Plan',
    context: 'Process improvement - first S24 repair took 20% longer than expected',
    deadline: null,
    timeEstimate: 30,
    revenueAtStake: 0,
    completed: false,
    completedAt: null,
  },

  // Already completed today
  {
    id: 'st-c1',
    title: 'Check Midas overnight alerts',
    priority: 'must',
    source: 'Midas',
    context: '2 new deals found, 1 expired',
    deadline: null,
    timeEstimate: 5,
    revenueAtStake: 0,
    completed: true,
    completedAt: '7:12 AM',
  },
  {
    id: 'st-c2',
    title: 'Morning Emilio inbox scan',
    priority: 'should',
    source: 'Emilio',
    context: '8 new replies, 3 need action',
    deadline: null,
    timeEstimate: 10,
    revenueAtStake: 0,
    completed: true,
    completedAt: '7:28 AM',
  },
  {
    id: 'st-c3',
    title: 'Complete iPhone 13 screen repair - Walk-in',
    priority: 'must',
    source: 'Repair',
    context: 'Customer: Alex P. - paid $149',
    deadline: null,
    timeEstimate: 30,
    revenueAtStake: 149,
    completed: true,
    completedAt: '9:45 AM',
  },
  {
    id: 'st-c4',
    title: 'Approve Midas listing: MacBook Air M1 refurb',
    priority: 'should',
    source: 'Midas',
    context: 'Listed at $689 - projected $210 margin',
    deadline: null,
    timeEstimate: 5,
    revenueAtStake: 210,
    completed: true,
    completedAt: '10:03 AM',
  },
];

// ── Source Badge Config ──────────────────────────────────────────────────

const sourceConfig: Record<SourceModule, { color: string; bg: string; icon: typeof Wrench }> = {
  Repair:      { color: 'text-blue-400',    bg: 'bg-blue-400/15',    icon: Wrench },
  Emilio:      { color: 'text-cyan-400',    bg: 'bg-cyan-400/15',    icon: Mail },
  Midas:       { color: 'text-amber-400',   bg: 'bg-amber-400/15',   icon: Zap },
  ReviewGuard: { color: 'text-purple-400',  bg: 'bg-purple-400/15',  icon: Shield },
  Plan:        { color: 'text-indigo-400',  bg: 'bg-indigo-400/15',  icon: Target },
  NightShift:  { color: 'text-violet-400',  bg: 'bg-violet-400/15',  icon: Sparkles },
  Leads:       { color: 'text-emerald-400', bg: 'bg-emerald-400/15', icon: Star },
  Inventory:   { color: 'text-orange-400',  bg: 'bg-orange-400/15',  icon: BarChart3 },
};

// ── Priority Section Config ─────────────────────────────────────────────

const priorityConfig: Record<PriorityLevel, {
  label: string;
  subtitle: string;
  borderColor: string;
  iconColor: string;
  icon: typeof AlertCircle;
  headerBg: string;
}> = {
  must: {
    label: 'Must Do',
    subtitle: 'Critical and overdue items - handle these first',
    borderColor: 'border-rose-500/60',
    iconColor: 'text-rose-400',
    icon: AlertCircle,
    headerBg: 'bg-rose-500/5',
  },
  should: {
    label: 'Should Do',
    subtitle: 'Important for revenue and operations',
    borderColor: 'border-amber-500/60',
    iconColor: 'text-amber-400',
    icon: AlertTriangle,
    headerBg: 'bg-amber-500/5',
  },
  could: {
    label: 'Could Do',
    subtitle: 'Improvements and maintenance if time allows',
    borderColor: 'border-blue-500/60',
    iconColor: 'text-blue-400',
    icon: Star,
    headerBg: 'bg-blue-500/5',
  },
};

// ── Helper: format minutes ──────────────────────────────────────────────

const formatMinutes = (mins: number): string => {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

// ── Source Badge Component ───────────────────────────────────────────────

const SourceBadge: React.FC<{ source: SourceModule }> = ({ source }) => {
  const config = sourceConfig[source];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${config.color} ${config.bg}`}>
      <Icon size={10} />
      {source}
    </span>
  );
};

// ── Task Item Component ─────────────────────────────────────────────────

interface TaskItemProps {
  task: TodayTask;
  onToggle: (id: string) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle }) => {
  const isOverdue = task.deadline?.startsWith('Overdue');

  return (
    <div
      className={`flex items-center p-4 glass-card rounded-xl mb-2 group hover:bg-white/5 transition-all ${
        task.completed ? 'opacity-60' : ''
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        className={`w-5 h-5 rounded border-2 mr-4 cursor-pointer flex items-center justify-center flex-shrink-0 transition-all ${
          task.completed
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-gray-600 hover:border-gray-400'
        }`}
        aria-label={task.completed ? `Mark "${task.title}" incomplete` : `Mark "${task.title}" complete`}
      >
        {task.completed && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium ${task.completed ? 'line-through text-gray-600' : 'text-white'}`}>
            {task.title}
          </span>
          <SourceBadge source={task.source} />
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className={`text-xs ${task.completed ? 'text-gray-700' : 'text-gray-500'}`}>
            {task.context}
          </span>
        </div>
      </div>

      {/* Right side: deadline / time estimate / revenue */}
      <div className="flex items-center gap-3 ml-4 flex-shrink-0">
        {task.revenueAtStake > 0 && !task.completed && (
          <span className="hidden sm:flex items-center gap-1 text-xs text-emerald-400 font-medium">
            <DollarSign size={12} />
            {task.revenueAtStake.toLocaleString()}
          </span>
        )}

        {!task.completed && (
          <span className="hidden sm:flex items-center gap-1 text-xs text-gray-500">
            <Timer size={12} />
            {formatMinutes(task.timeEstimate)}
          </span>
        )}

        {task.deadline && !task.completed && (
          <span
            className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
              isOverdue
                ? 'text-rose-400 bg-rose-400/10'
                : 'text-amber-400 bg-amber-400/10'
            }`}
          >
            <Clock size={11} />
            {task.deadline}
          </span>
        )}

        {task.completed && task.completedAt && (
          <span className="flex items-center gap-1 text-xs text-gray-600">
            <CheckCircle2 size={12} />
            {task.completedAt}
          </span>
        )}

        {/* Hover action arrow */}
        {!task.completed && (
          <button className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-all">
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

// ── Day Progress Ring ───────────────────────────────────────────────────

const ProgressRing: React.FC<{ completed: number; total: number }> = ({ completed, total }) => {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="3"
        />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke={pct >= 100 ? '#10b981' : pct >= 50 ? '#3b82f6' : '#f59e0b'}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-[11px] font-bold text-white">
        {Math.round(pct)}%
      </span>
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────────────────

const SmartToday: React.FC = () => {
  const [tasks, setTasks] = useState<TodayTask[]>(initialTasks);
  const [completedExpanded, setCompletedExpanded] = useState(false);

  // Derived data
  const activeTasks = useMemo(() => tasks.filter((t) => !t.completed), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((t) => t.completed), [tasks]);

  const mustDo = useMemo(() => activeTasks.filter((t) => t.priority === 'must'), [activeTasks]);
  const shouldDo = useMemo(() => activeTasks.filter((t) => t.priority === 'should'), [activeTasks]);
  const couldDo = useMemo(() => activeTasks.filter((t) => t.priority === 'could'), [activeTasks]);

  const totalTasks = tasks.length;
  const completedCount = completedTasks.length;
  const remainingCount = activeTasks.length;

  const totalTimeRemaining = useMemo(
    () => activeTasks.reduce((sum, t) => sum + t.timeEstimate, 0),
    [activeTasks]
  );

  const revenueAtStake = useMemo(
    () => activeTasks.reduce((sum, t) => sum + t.revenueAtStake, 0),
    [activeTasks]
  );

  const handleToggle = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const nowCompleted = !t.completed;
        return {
          ...t,
          completed: nowCompleted,
          completedAt: nowCompleted
            ? new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
            : null,
        };
      })
    );
  };

  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // Priority sections to render
  const sections: { key: PriorityLevel; tasks: TodayTask[] }[] = [
    { key: 'must', tasks: mustDo },
    { key: 'should', tasks: shouldDo },
    { key: 'could', tasks: couldDo },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-800/50 pb-6">
        <div className="flex items-center gap-5">
          <ProgressRing completed={completedCount} total={totalTasks} />
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight mb-1">Today</h1>
            <p className="text-gray-400 flex items-center text-sm">
              <Calendar className="w-4 h-4 mr-2" />
              {dateString}
              <span className="mx-2 text-gray-700">|</span>
              <span className="text-white font-medium">{completedCount} of {totalTasks}</span>
              <span className="ml-1">tasks done</span>
            </p>
          </div>
        </div>
        <button className="bg-white text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors flex items-center shadow-[0_0_15px_rgba(255,255,255,0.1)] mt-4 md:mt-0">
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </button>
      </div>

      {/* ── Stats Bar ───────────────────────────────────────────── */}
      <div className="glass-card rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
            <Target className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Remaining</p>
            <p className="text-lg font-bold text-white">{remainingCount} tasks</p>
          </div>
        </div>

        <div className="hidden sm:block w-px h-8 bg-gray-800" />

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <Timer className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Est. Time</p>
            <p className="text-lg font-bold text-white">{formatMinutes(totalTimeRemaining)}</p>
          </div>
        </div>

        <div className="hidden sm:block w-px h-8 bg-gray-800" />

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Revenue at Stake</p>
            <p className="text-lg font-bold text-white">${revenueAtStake.toLocaleString()}</p>
          </div>
        </div>

        <div className="hidden sm:block w-px h-8 bg-gray-800" />

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-500/15 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Must Do</p>
            <p className="text-lg font-bold text-white">{mustDo.length} critical</p>
          </div>
        </div>
      </div>

      {/* ── AI Suggestion Banner ─────────────────────────────────── */}
      <div className="glass-card rounded-xl p-4 border border-indigo-500/20 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-300">
            <span className="text-indigo-400 font-semibold">Smart suggestion:</span>{' '}
            Handle the Midas iPhone 14 Pro lot first -- the listing expires at 2 PM and has the highest
            revenue potential ($1,200). Then knock out the two overdue items before lunch.
          </p>
        </div>
        <button className="text-xs text-indigo-400 hover:text-indigo-300 font-medium whitespace-nowrap px-3 py-1.5 rounded-lg hover:bg-indigo-500/10 transition-colors flex-shrink-0">
          Got it
        </button>
      </div>

      {/* ── Priority Sections ────────────────────────────────────── */}
      {sections.map(({ key, tasks: sectionTasks }) => {
        const config = priorityConfig[key];
        const SectionIcon = config.icon;
        const sectionRevenue = sectionTasks.reduce((s, t) => s + t.revenueAtStake, 0);
        const sectionTime = sectionTasks.reduce((s, t) => s + t.timeEstimate, 0);

        if (sectionTasks.length === 0) return null;

        return (
          <section key={key}>
            {/* Section Header */}
            <div className={`flex items-center justify-between mb-3 p-3 rounded-xl border-l-4 ${config.borderColor} ${config.headerBg}`}>
              <div className="flex items-center gap-3">
                <SectionIcon className={`w-5 h-5 ${config.iconColor}`} />
                <div>
                  <h2 className="text-base font-bold text-white">{config.label}</h2>
                  <p className="text-xs text-gray-500">{config.subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="hidden sm:flex items-center gap-1">
                  <Circle size={10} />
                  {sectionTasks.length} {sectionTasks.length === 1 ? 'task' : 'tasks'}
                </span>
                <span className="hidden sm:flex items-center gap-1">
                  <Timer size={10} />
                  {formatMinutes(sectionTime)}
                </span>
                {sectionRevenue > 0 && (
                  <span className="hidden sm:flex items-center gap-1 text-emerald-500">
                    <DollarSign size={10} />
                    {sectionRevenue.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Task Items */}
            <div>
              {sectionTasks.map((task) => (
                <TaskItem key={task.id} task={task} onToggle={handleToggle} />
              ))}
            </div>
          </section>
        );
      })}

      {/* ── Completed Section (Collapsible) ──────────────────────── */}
      {completedTasks.length > 0 && (
        <section>
          <button
            onClick={() => setCompletedExpanded((prev) => !prev)}
            className="flex items-center justify-between w-full p-3 rounded-xl glass-card hover:bg-white/5 transition-all group"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="text-base font-bold text-gray-400 group-hover:text-white transition-colors">
                Completed Today
              </span>
              <span className="text-xs text-gray-600 font-medium bg-white/5 px-2 py-0.5 rounded-full">
                {completedTasks.length}
              </span>
            </div>
            {completedExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {completedExpanded && (
            <div className="mt-2">
              {completedTasks.map((task) => (
                <TaskItem key={task.id} task={task} onToggle={handleToggle} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Day Complete Motivator (when all done) ───────────────── */}
      {remainingCount === 0 && (
        <div className="glass-card rounded-2xl p-8 text-center border border-emerald-500/20">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">All done for today!</h2>
          <p className="text-gray-400">
            You knocked out all {totalTasks} tasks. Revenue secured: ${revenueAtStake.toLocaleString()}.
          </p>
        </div>
      )}
    </div>
  );
};

export default SmartToday;
