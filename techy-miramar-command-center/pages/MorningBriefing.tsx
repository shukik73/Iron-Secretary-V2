import React, { useMemo } from 'react';
import {
  Sun,
  Moon,
  Coffee,
  Clock,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Bell,
  ArrowRight,
  Zap,
  Mail,
  ShieldCheck,
  Users,
  Calendar,
  Sunrise,
  CloudSun,
  Sunset,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────

function getGreeting(): { text: string; icon: typeof Sun; iconColor: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good morning', icon: Sunrise, iconColor: 'text-amber-400' };
  if (hour < 17) return { text: 'Good afternoon', icon: CloudSun, iconColor: 'text-sky-400' };
  if (hour < 21) return { text: 'Good evening', icon: Sunset, iconColor: 'text-orange-400' };
  return { text: 'Good evening', icon: Moon, iconColor: 'text-indigo-400' };
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  const m = minute.toString().padStart(2, '0');
  return `${h}:${m} ${period}`;
}

// ── Mock Data ──────────────────────────────────────────────────────────

const overnightSummary = {
  nightShift: {
    tasksRun: 2,
    completed: 2,
    failed: 0,
    results: [
      { title: '2 SEO blog posts drafted', status: 'completed' as const, detail: 'MacBook battery cost + iPhone screen repair guides' },
      { title: 'Weekly site audit completed', status: 'warning' as const, detail: '1 critical issue: contact form emails not receiving' },
    ],
  },
  newLeads: 3,
  newLeadDetails: [
    { name: 'Maria G.', device: 'iPhone 15 Pro Max', issue: 'Cracked screen', source: 'Google' },
    { name: 'David R.', device: 'MacBook Air M2', issue: 'Battery swelling', source: 'Yelp' },
    { name: 'Unknown Caller', device: 'Samsung S24', issue: 'Charging port', source: 'Phone call' },
  ],
  emailsReceived: 14,
  emailsNeedingReply: 4,
  missedCalls: 1,
};

const priorityStack = [
  {
    id: 'p1',
    title: 'Overdue reminder: Follow up with John D.',
    module: 'Reminders',
    urgency: 'critical' as const,
    detail: 'Repair ticket stalled 52 hours. Customer waiting for callback.',
    icon: Bell,
    color: 'rose',
  },
  {
    id: 'p2',
    title: 'iPad Pro screen arrived — repair ready',
    module: 'Repairs',
    urgency: 'high' as const,
    detail: 'Parts delivered yesterday. Customer expects pickup today.',
    icon: CheckCircle2,
    color: 'amber',
  },
  {
    id: 'p3',
    title: '4 Emilio replies need attention',
    module: 'Emilio',
    urgency: 'high' as const,
    detail: '2 warm leads showed interest, 1 pricing question, 1 meeting request.',
    icon: Mail,
    color: 'blue',
  },
  {
    id: 'p4',
    title: '3 ReviewGuard responses pending approval',
    module: 'ReviewGuard',
    urgency: 'medium' as const,
    detail: '2 positive review replies, 1 negative review response drafted.',
    icon: ShieldCheck,
    color: 'purple',
  },
  {
    id: 'p5',
    title: 'Midas deal expiring: MacBook Pro 2015 — $95',
    module: 'Midas',
    urgency: 'medium' as const,
    detail: 'eBay listing ends in 6 hours. Est. margin $215. Buy/pass decision needed.',
    icon: Zap,
    color: 'amber',
  },
];

const moneySnapshot = {
  yesterdayTips: 47,
  outstandingDebts: 280,
  debtors: [
    { name: 'Carlos M.', amount: 150, daysOld: 12 },
    { name: 'Tech Solutions LLC', amount: 130, daysOld: 5 },
  ],
  weekRevenue: 4820,
  weekTarget: 5000,
  weekPercent: 96,
  reviewGuardMRR: 1250,
  reviewGuardClients: 8,
  yesterdayRepairs: 7,
  avgTicket: 89,
};

const schedule = [
  { id: 's1', time: { hour: 7, minute: 0 }, title: 'Check Midas alerts (Telegram)', tag: 'Routine', tagColor: 'text-amber-400 bg-amber-400/10' },
  { id: 's2', time: { hour: 7, minute: 15 }, title: 'Inbox scan: Emilio replies', tag: 'Sales', tagColor: 'text-blue-400 bg-blue-400/10' },
  { id: 's3', time: { hour: 7, minute: 30 }, title: 'ReviewGuard approvals', tag: 'Ops', tagColor: 'text-purple-400 bg-purple-400/10' },
  { id: 's4', time: { hour: 8, minute: 0 }, title: 'Missed call / lead follow-up', tag: 'Service', tagColor: 'text-emerald-400 bg-emerald-400/10' },
  { id: 's5', time: { hour: 9, minute: 30 }, title: 'Client pickup: iPad Pro screen repair', tag: 'Repair', tagColor: 'text-sky-400 bg-sky-400/10' },
  { id: 's6', time: { hour: 11, minute: 0 }, title: 'Call back John D. — overdue ticket', tag: 'Urgent', tagColor: 'text-rose-400 bg-rose-400/10' },
  { id: 's7', time: { hour: 14, minute: 0 }, title: 'ReviewGuard demo with prospect (Zoom)', tag: 'Sales', tagColor: 'text-blue-400 bg-blue-400/10' },
  { id: 's8', time: { hour: 16, minute: 30 }, title: 'End-of-day inventory check', tag: 'Ops', tagColor: 'text-purple-400 bg-purple-400/10' },
];

// ── Urgency helpers ────────────────────────────────────────────────────

const urgencyConfig = {
  critical: { label: 'Critical', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30', dot: 'bg-rose-500' },
  high: { label: 'High', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-500' },
  medium: { label: 'Medium', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', dot: 'bg-blue-500' },
  low: { label: 'Low', bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30', dot: 'bg-gray-500' },
};

const colorMap: Record<string, { iconBg: string; iconText: string; border: string }> = {
  rose: { iconBg: 'bg-rose-500/20', iconText: 'text-rose-400', border: 'border-rose-500' },
  amber: { iconBg: 'bg-amber-500/20', iconText: 'text-amber-400', border: 'border-amber-500' },
  blue: { iconBg: 'bg-blue-500/20', iconText: 'text-blue-400', border: 'border-blue-500' },
  purple: { iconBg: 'bg-purple-500/20', iconText: 'text-purple-400', border: 'border-purple-500' },
  emerald: { iconBg: 'bg-emerald-500/20', iconText: 'text-emerald-400', border: 'border-emerald-500' },
  indigo: { iconBg: 'bg-indigo-500/20', iconText: 'text-indigo-400', border: 'border-indigo-500' },
};

// ── Component ──────────────────────────────────────────────────────────

const MorningBriefing: React.FC = () => {
  const greeting = useMemo(() => getGreeting(), []);
  const dateStr = useMemo(() => formatDate(), []);
  const GreetingIcon = greeting.icon;

  // Determine the current schedule position based on time of day
  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();

  return (
    <div className="space-y-8 animate-fade-in pb-10">

      {/* ── Greeting Header ───────────────────────────────────────── */}
      <div className="border-b border-gray-800/50 pb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <GreetingIcon className={`w-6 h-6 ${greeting.iconColor}`} />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              {greeting.text}, Boss.
            </h1>
            <p className="text-gray-400 flex items-center mt-1">
              <Calendar className="w-4 h-4 mr-2" />
              {dateStr} &mdash; Morning Briefing
            </p>
          </div>
        </div>
        <p className="text-gray-500 text-sm mt-3 max-w-2xl">
          Here is your daily summary. {overnightSummary.nightShift.tasksRun} Night Shift tasks completed,{' '}
          {overnightSummary.newLeads} new leads came in, and you have{' '}
          {priorityStack.filter((p) => p.urgency === 'critical' || p.urgency === 'high').length} high-priority
          items to address.
        </p>
      </div>

      {/* ── Main Grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Left Column (2/3) ─────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-8">

          {/* ── 1. Overnight Summary ──────────────────────────────────── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Overnight Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Night Shift stat */}
              <div className="glass-card p-5 rounded-2xl relative overflow-hidden group cursor-pointer border border-white/5 hover:border-purple-500/50 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Moon size={60} />
                </div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Night Shift</p>
                <h3 className="text-2xl font-bold text-white mb-1">
                  {overnightSummary.nightShift.completed}/{overnightSummary.nightShift.tasksRun} Done
                </h3>
                <p className="text-sm text-emerald-400">
                  {overnightSummary.nightShift.failed === 0 ? 'All tasks succeeded' : `${overnightSummary.nightShift.failed} failed`}
                </p>
              </div>
              {/* New Leads stat */}
              <div className="glass-card p-5 rounded-2xl relative overflow-hidden group cursor-pointer border border-white/5 hover:border-emerald-500/50 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Users size={60} />
                </div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">New Leads</p>
                <h3 className="text-2xl font-bold text-white mb-1">{overnightSummary.newLeads} Leads</h3>
                <p className="text-sm text-emerald-400">Since yesterday</p>
              </div>
              {/* Emails stat */}
              <div className="glass-card p-5 rounded-2xl relative overflow-hidden group cursor-pointer border border-white/5 hover:border-blue-500/50 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Mail size={60} />
                </div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Email</p>
                <h3 className="text-2xl font-bold text-white mb-1">{overnightSummary.emailsReceived} Received</h3>
                <p className="text-sm text-amber-400">{overnightSummary.emailsNeedingReply} need reply</p>
              </div>
            </div>

            {/* Night Shift results detail */}
            <div className="glass-card rounded-2xl p-6 border-t-4 border-purple-500">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center mr-3">
                  <Moon className="w-4 h-4 text-purple-400" />
                </div>
                <h3 className="font-bold text-white">Night Shift Results</h3>
                <span className="ml-auto text-xs text-gray-500">{overnightSummary.nightShift.tasksRun} tasks ran overnight</span>
              </div>
              <ul className="space-y-3">
                {overnightSummary.nightShift.results.map((result, i) => (
                  <li key={i} className="flex items-start text-sm">
                    {result.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 mr-3 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 mr-3 flex-shrink-0" />
                    )}
                    <div>
                      <span className="text-white font-medium">{result.title}</span>
                      <p className="text-gray-400 mt-0.5">{result.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
              {overnightSummary.missedCalls > 0 && (
                <div className="mt-4 flex items-center gap-2 text-xs text-amber-400/80 bg-amber-400/5 px-3 py-2 rounded-lg">
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  <span>{overnightSummary.missedCalls} missed call{overnightSummary.missedCalls > 1 ? 's' : ''} overnight</span>
                </div>
              )}
            </div>

            {/* New leads detail */}
            {overnightSummary.newLeadDetails.length > 0 && (
              <div className="glass-card rounded-2xl p-6 mt-4">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center mr-3">
                    <Users className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h3 className="font-bold text-white">New Leads</h3>
                </div>
                <div className="space-y-3">
                  {overnightSummary.newLeadDetails.map((lead, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white">
                          {lead.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm text-white font-medium">{lead.name}</p>
                          <p className="text-xs text-gray-400">{lead.device} &mdash; {lead.issue}</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-gray-400 bg-gray-400/10">
                        {lead.source}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ── 2. Today's Priority Stack ─────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Today's Priority Stack</h2>
              <span className="text-xs text-gray-500">{priorityStack.length} items ranked by urgency</span>
            </div>
            <div className="space-y-3">
              {priorityStack.map((item, idx) => {
                const Icon = item.icon;
                const colors = colorMap[item.color] || colorMap.blue;
                const urgency = urgencyConfig[item.urgency];
                return (
                  <div
                    key={item.id}
                    className={`glass-card rounded-2xl p-5 border-l-4 ${colors.border} hover:bg-white/5 cursor-pointer transition-all`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-lg font-bold text-gray-600 w-6 text-right">{idx + 1}</span>
                        <div className={`w-10 h-10 rounded-xl ${colors.iconBg} flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${colors.iconText}`} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-white font-medium">{item.title}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${urgency.bg} ${urgency.text}`}>
                            {urgency.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">{item.detail}</p>
                        <span className="text-xs text-gray-500 mt-1 inline-block">{item.module}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-600 flex-shrink-0 mt-1" />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── 3. Schedule ───────────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Today's Schedule</h2>
              <span className="text-xs text-gray-500">{schedule.length} items</span>
            </div>
            <div className="glass-card rounded-2xl p-1 overflow-hidden">
              {schedule.map((item) => {
                const isPast =
                  item.time.hour < currentHour ||
                  (item.time.hour === currentHour && item.time.minute <= currentMinute);
                const isCurrent =
                  item.time.hour === currentHour &&
                  item.time.minute > currentMinute - 30 &&
                  item.time.minute <= currentMinute;
                const isNext =
                  !isPast &&
                  !isCurrent &&
                  schedule.findIndex(
                    (s) =>
                      s.time.hour > currentHour ||
                      (s.time.hour === currentHour && s.time.minute > currentMinute)
                  ) === schedule.indexOf(item);
                return (
                  <div
                    key={item.id}
                    className={`group flex items-center p-4 rounded-xl transition-all border-b border-transparent last:border-0 cursor-pointer ${
                      isPast
                        ? 'opacity-50 hover:opacity-75'
                        : isNext
                          ? 'bg-white/5 border-white/5'
                          : 'hover:bg-white/5 hover:border-white/5'
                    }`}
                  >
                    <div className="w-20 text-sm font-medium text-gray-400 font-mono">
                      {formatTime(item.time.hour, item.time.minute)}
                    </div>
                    <div
                      className={`w-1 h-10 rounded-full mx-4 transition-colors ${
                        isNext ? 'bg-brand-primary' : isPast ? 'bg-gray-800' : 'bg-gray-700 group-hover:bg-brand-primary'
                      }`}
                    />
                    <div className="flex-1">
                      <h3 className={`font-medium text-lg ${isPast ? 'text-gray-500 line-through' : 'text-white'}`}>
                        {item.title}
                      </h3>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${item.tagColor}`}
                    >
                      {item.tag}
                    </span>
                    {isPast ? (
                      <CheckCircle2 className="ml-4 w-4 h-4 text-emerald-500/50" />
                    ) : isNext ? (
                      <span className="ml-4 flex items-center gap-1 text-xs text-brand-primary font-medium">
                        <Clock size={12} /> Next
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* ── Right Column (1/3) ────────────────────────────────────── */}
        <div className="space-y-8">

          {/* ── 4. Money Snapshot ──────────────────────────────────────── */}
          <section className="glass-card rounded-2xl p-6 border-t-4 border-emerald-500">
            <div className="flex items-center mb-5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center mr-3">
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="font-bold text-white">Money Snapshot</h3>
            </div>

            {/* Week Revenue Progress */}
            <div className="mb-5">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">This Week's Revenue</span>
                <span className="text-white font-bold">${moneySnapshot.weekRevenue.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2 mb-1">
                <div
                  className="h-2 rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(moneySnapshot.weekPercent, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{moneySnapshot.weekPercent}% of target</span>
                <span>${moneySnapshot.weekTarget.toLocaleString()} goal</span>
              </div>
            </div>

            {/* Key figures */}
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-amber-400" />
                  <span className="text-sm text-gray-300">Yesterday's Tips</span>
                </div>
                <span className="text-sm font-bold text-white">${moneySnapshot.yesterdayTips}</span>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-gray-300">Repairs Yesterday</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-white">{moneySnapshot.yesterdayRepairs}</span>
                  <p className="text-xs text-gray-500">avg ${moneySnapshot.avgTicket}/ticket</p>
                </div>
              </div>

              <div className="py-3 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span className="text-sm text-gray-300">Outstanding Debts</span>
                  </div>
                  <span className="text-sm font-bold text-rose-400">${moneySnapshot.outstandingDebts}</span>
                </div>
                <div className="mt-2 space-y-1">
                  {moneySnapshot.debtors.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs text-gray-500 pl-6">
                      <span>{d.name}</span>
                      <span>${d.amount} ({d.daysOld}d ago)</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-gray-300">ReviewGuard MRR</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-emerald-400">${moneySnapshot.reviewGuardMRR.toLocaleString()}</span>
                  <p className="text-xs text-gray-500">{moneySnapshot.reviewGuardClients} clients</p>
                </div>
              </div>
            </div>
          </section>

          {/* ── 5. Quick Actions ──────────────────────────────────────── */}
          <section className="glass-card rounded-2xl p-6 border-t-4 border-indigo-500">
            <div className="flex items-center mb-5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center mr-3">
                <Zap className="w-4 h-4 text-indigo-400" />
              </div>
              <h3 className="font-bold text-white">Quick Actions</h3>
            </div>
            <div className="space-y-3">
              <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20">
                <Sun className="w-4 h-4" />
                Start Daily Cadence
              </button>
              <button className="w-full py-3 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
                <Moon className="w-4 h-4" />
                Open Night Shift Report
                <ArrowRight size={14} />
              </button>
              <button className="w-full py-3 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
                <Zap className="w-4 h-4" />
                Check Midas Alerts
                <ArrowRight size={14} />
              </button>
              <button className="w-full py-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
                <Mail className="w-4 h-4" />
                Scan Emilio Inbox
                <ArrowRight size={14} />
              </button>
              <button className="w-full py-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
                <Users className="w-4 h-4" />
                Review New Leads ({overnightSummary.newLeads})
                <ArrowRight size={14} />
              </button>
            </div>
          </section>

          {/* ── AI Insight ────────────────────────────────────────────── */}
          <section className="glass-card rounded-2xl p-6 border-t-4 border-sky-500">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center mr-3">
                <Coffee className="w-4 h-4 text-sky-400" />
              </div>
              <h3 className="font-bold text-white">Morning Insight</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed mb-3">
              Your week is at <span className="text-white font-semibold">{moneySnapshot.weekPercent}% of revenue target</span> with
              2 days left. Closing the Emilio warm leads and the Midas MacBook deal would put you{' '}
              <span className="text-emerald-400 font-semibold">$395 over target</span>. Prioritize those today.
            </p>
            <p className="text-gray-300 text-sm leading-relaxed">
              The site audit found a contact form issue. Customers may not be reaching you. Address the{' '}
              <span className="text-amber-400 font-semibold">critical Night Shift finding</span> before 9 AM.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default MorningBriefing;
