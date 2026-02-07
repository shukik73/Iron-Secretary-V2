import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wrench,
  Mail,
  Shield,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Target,
  BarChart3,
  Users,
  Star,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Edit3,
  Plus,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';

// ─── Types ──────────────────────────────────────────────────────────────────

interface RevenueItem {
  label: string;
  target: number;
  actual: number;
  color: string;
}

interface MetricItem {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
}

interface ComparisonItem {
  label: string;
  current: number;
  previous: number;
  format: 'currency' | 'number' | 'percent';
}

interface ActionItem {
  id: number;
  text: string;
  checked: boolean;
  priority: 'high' | 'medium' | 'low';
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const revenueBreakdown: RevenueItem[] = [
  { label: 'Repair Revenue', target: 2800, actual: 3120, color: '#3b82f6' },
  { label: 'Refurb / Midas', target: 1200, actual: 985, color: '#f59e0b' },
  { label: 'ReviewGuard MRR', target: 400, actual: 420, color: '#a855f7' },
];

const dailyRevenue = [
  { day: 'Mon', amount: 580 },
  { day: 'Tue', amount: 720 },
  { day: 'Wed', amount: 490 },
  { day: 'Thu', amount: 830 },
  { day: 'Fri', amount: 910 },
  { day: 'Sat', amount: 595 },
  { day: 'Sun', amount: 400 },
];

const operationsMetrics: MetricItem[] = [
  { label: 'Repairs Completed', value: '23', icon: Wrench, color: 'blue' },
  { label: 'Avg Repair Time', value: '2.4h', icon: Clock, color: 'amber' },
  { label: 'New Leads', value: '18', icon: Users, color: 'emerald' },
  { label: 'Conversion Rate', value: '38%', icon: Target, color: 'purple' },
  { label: 'Parts Ordered', value: '14', icon: BarChart3, color: 'rose' },
  { label: 'Avg Rating', value: '4.8', icon: Star, color: 'yellow' },
];

const emilioMetrics: MetricItem[] = [
  { label: 'Emails Sent', value: '247', icon: Mail, color: 'blue' },
  { label: 'Open Rate', value: '29%', icon: ArrowUpRight, color: 'purple' },
  { label: 'Reply Rate', value: '3.2%', icon: TrendingUp, color: 'emerald' },
  { label: 'Demos Booked', value: '2', icon: Calendar, color: 'amber' },
];

const reviewGuardMetrics: MetricItem[] = [
  { label: 'New Customers', value: '3', icon: Users, color: 'purple' },
  { label: 'Reviews Processed', value: '47', icon: Shield, color: 'blue' },
  { label: 'Responses Sent', value: '42', icon: CheckCircle2, color: 'emerald' },
];

const midasMetrics: MetricItem[] = [
  { label: 'Deals Alerted', value: '11', icon: Zap, color: 'amber' },
  { label: 'Deals Purchased', value: '4', icon: DollarSign, color: 'emerald' },
  { label: 'Margin Earned', value: '$785', icon: TrendingUp, color: 'green' },
];

const weekComparisons: ComparisonItem[] = [
  { label: 'Total Revenue', current: 4525, previous: 4180, format: 'currency' },
  { label: 'Repairs Done', current: 23, previous: 19, format: 'number' },
  { label: 'New Leads', current: 18, previous: 22, format: 'number' },
  { label: 'Conversion Rate', current: 38, previous: 31, format: 'percent' },
  { label: 'Avg Rating', current: 4.8, previous: 4.6, format: 'number' },
  { label: 'Emilio Replies', current: 8, previous: 5, format: 'number' },
  { label: 'ReviewGuard MRR', current: 420, previous: 380, format: 'currency' },
  { label: 'Midas Margin', current: 785, previous: 640, format: 'currency' },
];

const initialActionItems: ActionItem[] = [
  { id: 1, text: 'Follow up on 3 aging debts (>30 days)', checked: false, priority: 'high' },
  { id: 2, text: '2 repairs still waiting for parts (Samsung screens)', checked: false, priority: 'high' },
  { id: 3, text: 'Schedule demo with QuickFix Tampa (Emilio reply)', checked: false, priority: 'medium' },
  { id: 4, text: 'Restock iPhone 13 screens (below 3 units)', checked: false, priority: 'medium' },
  { id: 5, text: 'Reply to iRepair Miami unsubscribe request', checked: true, priority: 'low' },
  { id: 6, text: 'Review and approve 5 pending ReviewGuard responses', checked: false, priority: 'medium' },
  { id: 7, text: 'List refurbished MacBook Pro on eBay (Midas flip)', checked: false, priority: 'medium' },
  { id: 8, text: 'Send weekly thank-you texts to 5 completed repairs', checked: true, priority: 'low' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function getWeekRange(date: Date): { start: Date; end: Date } {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }),
    end: endOfWeek(date, { weekStartsOn: 1 }),
  };
}

function formatCurrency(n: number): string {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;
}

function formatComparisonValue(value: number, fmt: ComparisonItem['format']): string {
  if (fmt === 'currency') return `$${value.toLocaleString()}`;
  if (fmt === 'percent') return `${value}%`;
  return value.toString();
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
  blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-400',    ring: 'ring-blue-500/20' },
  amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   ring: 'ring-amber-500/20' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', ring: 'ring-emerald-500/20' },
  purple:  { bg: 'bg-purple-500/10',  text: 'text-purple-400',  ring: 'ring-purple-500/20' },
  rose:    { bg: 'bg-rose-500/10',    text: 'text-rose-400',    ring: 'ring-rose-500/20' },
  yellow:  { bg: 'bg-yellow-500/10',  text: 'text-yellow-400',  ring: 'ring-yellow-500/20' },
  green:   { bg: 'bg-emerald-500/10', text: 'text-emerald-400', ring: 'ring-emerald-500/20' },
};

// ─── Sub-Components ─────────────────────────────────────────────────────────

const ProgressBar: React.FC<{ target: number; actual: number; color: string }> = ({
  target,
  actual,
  color,
}) => {
  const pct = Math.min((actual / target) * 100, 100);
  return (
    <div className="bg-gray-800 rounded-full h-2 w-full overflow-hidden">
      <div
        className="h-2 rounded-full transition-all duration-700 ease-out"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
};

const MiniMetric: React.FC<{ metric: MetricItem }> = ({ metric }) => {
  const c = colorMap[metric.color] ?? colorMap.blue;
  const Icon = metric.icon;
  return (
    <div className="glass-card rounded-xl p-4 flex items-center space-x-3 border border-white/5">
      <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${c.text}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium truncate">{metric.label}</p>
        <p className="text-xl font-bold text-white">{metric.value}</p>
      </div>
    </div>
  );
};

const SectionHeading: React.FC<{ icon: React.ElementType; title: string; color: string }> = ({
  icon: Icon,
  title,
  color,
}) => {
  const c = colorMap[color] ?? colorMap.blue;
  return (
    <div className="flex items-center space-x-3 mb-5">
      <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center`}>
        <Icon className={`w-4 h-4 ${c.text}`} />
      </div>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

const WeeklyReview: React.FC = () => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [actionItems, setActionItems] = useState<ActionItem[]>(initialActionItems);
  const [wins, setWins] = useState('');
  const [blockers, setBlockers] = useState('');
  const [priorities, setPriorities] = useState('');

  const currentWeekDate = useMemo(() => {
    const base = new Date(2026, 1, 6); // Feb 6, 2026
    if (weekOffset > 0) return addWeeks(base, weekOffset);
    if (weekOffset < 0) return subWeeks(base, Math.abs(weekOffset));
    return base;
  }, [weekOffset]);

  const { start, end } = useMemo(() => getWeekRange(currentWeekDate), [currentWeekDate]);

  const totalRevActual = revenueBreakdown.reduce((s, r) => s + r.actual, 0);
  const totalRevTarget = revenueBreakdown.reduce((s, r) => s + r.target, 0);
  const lastWeekTotal = 4180;
  const wowChange = pctChange(totalRevActual, lastWeekTotal);

  const toggleAction = (id: number) => {
    setActionItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const completedCount = actionItems.filter((a) => a.checked).length;

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-800/50 pb-6">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Weekly Review</h1>
          <div className="flex items-center space-x-3">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400 text-sm">
              {format(start, 'MMM d')} &ndash; {format(end, 'MMM d, yyyy')}
            </span>
            {weekOffset === 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400">
                Current Week
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            aria-label="Previous week"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setWeekOffset((o) => o + 1)}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            aria-label="Next week"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ─── Revenue Section ─────────────────────────────────────── */}
      <section className="glass-card rounded-2xl p-6">
        <SectionHeading icon={DollarSign} title="Revenue" color="emerald" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue breakdown */}
          <div className="lg:col-span-2 space-y-5">
            {revenueBreakdown.map((item) => {
              const pct = Math.round((item.actual / item.target) * 100);
              const over = item.actual >= item.target;
              return (
                <div key={item.label}>
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-sm font-medium text-gray-300">{item.label}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-white">
                        ${item.actual.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500">
                        / ${item.target.toLocaleString()} target
                      </span>
                      <span
                        className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                          over
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {pct}%
                      </span>
                    </div>
                  </div>
                  <ProgressBar target={item.target} actual={item.actual} color={item.color} />
                </div>
              );
            })}

            {/* Total */}
            <div className="pt-4 border-t border-gray-800/60">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-semibold text-white">Total Revenue</span>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl font-bold text-white">
                    ${totalRevActual.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-500">
                    / ${totalRevTarget.toLocaleString()} target
                  </span>
                  <span
                    className={`flex items-center text-sm font-semibold ${
                      wowChange >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {wowChange >= 0 ? (
                      <ArrowUpRight className="w-4 h-4 mr-0.5" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 mr-0.5" />
                    )}
                    {Math.abs(wowChange)}% vs last week
                  </span>
                </div>
              </div>
              <ProgressBar
                target={totalRevTarget}
                actual={totalRevActual}
                color={totalRevActual >= totalRevTarget ? '#10b981' : '#f59e0b'}
              />
            </div>
          </div>

          {/* Daily revenue chart */}
          <div className="flex flex-col">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">
              Daily Breakdown
            </p>
            <div className="flex-1 min-h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyRevenue} barCategoryGap="20%">
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(17, 24, 39, 0.95)',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      color: '#f3f4f6',
                      fontSize: '12px',
                    }}
                    formatter={(value: number | undefined) => [`$${value ?? 0}`, 'Revenue']}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {dailyRevenue.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={entry.amount >= 700 ? '#10b981' : '#3b82f6'}
                        fillOpacity={0.7}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Operations Section ──────────────────────────────────── */}
      <section className="glass-card rounded-2xl p-6">
        <SectionHeading icon={Wrench} title="Operations" color="blue" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {operationsMetrics.map((m) => (
            <MiniMetric key={m.label} metric={m} />
          ))}
        </div>
      </section>

      {/* ─── Sales & Marketing Section ───────────────────────────── */}
      <section className="glass-card rounded-2xl p-6">
        <SectionHeading icon={BarChart3} title="Sales & Marketing" color="purple" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Emilio */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 mb-3">
              <Mail className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Emilio</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {emilioMetrics.map((m) => (
                <MiniMetric key={m.label} metric={m} />
              ))}
            </div>
          </div>

          {/* ReviewGuard */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 mb-3">
              <Shield className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                ReviewGuard
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {reviewGuardMetrics.map((m) => (
                <MiniMetric key={m.label} metric={m} />
              ))}
            </div>
          </div>

          {/* Midas */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 mb-3">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Midas</h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {midasMetrics.map((m) => (
                <MiniMetric key={m.label} metric={m} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Wins & Blockers ─────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* What went well */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              What Went Well
            </h3>
          </div>
          <textarea
            value={wins}
            onChange={(e) => setWins(e.target.value)}
            rows={6}
            className="bg-black/30 border border-gray-800 rounded-xl p-4 text-gray-300 placeholder-gray-600 w-full resize-none focus:outline-none focus:border-emerald-500/40 transition-colors text-sm leading-relaxed"
            placeholder="Record this week's wins...&#10;&#10;e.g. Landed 3 new ReviewGuard customers, cleared all repair backlog by Thursday"
          />
        </div>

        {/* What got blocked */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              What Got Blocked
            </h3>
          </div>
          <textarea
            value={blockers}
            onChange={(e) => setBlockers(e.target.value)}
            rows={6}
            className="bg-black/30 border border-gray-800 rounded-xl p-4 text-gray-300 placeholder-gray-600 w-full resize-none focus:outline-none focus:border-amber-500/40 transition-colors text-sm leading-relaxed"
            placeholder="Note blockers and friction...&#10;&#10;e.g. Samsung screen supplier delayed 4 days, Emilio bounce rate spiked"
          />
        </div>

        {/* Next week priorities */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Target className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Next Week Priorities
            </h3>
          </div>
          <textarea
            value={priorities}
            onChange={(e) => setPriorities(e.target.value)}
            rows={6}
            className="bg-black/30 border border-gray-800 rounded-xl p-4 text-gray-300 placeholder-gray-600 w-full resize-none focus:outline-none focus:border-blue-500/40 transition-colors text-sm leading-relaxed"
            placeholder="Top priorities for next week...&#10;&#10;e.g. Close QuickFix Tampa demo, launch Emilio v2 sequence, hire part-time tech"
          />
        </div>
      </section>

      {/* ─── Action Items ────────────────────────────────────────── */}
      <section className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <Edit3 className="w-4 h-4 text-rose-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Action Items</h2>
            <span className="text-xs text-gray-500 ml-2">
              {completedCount}/{actionItems.length} done
            </span>
          </div>
          <button className="flex items-center space-x-1.5 text-sm text-gray-500 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10">
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>

        {/* Progress bar for action items */}
        <div className="mb-5">
          <div className="bg-gray-800 rounded-full h-1.5 w-full overflow-hidden">
            <div
              className="h-1.5 rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${(completedCount / actionItems.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          {actionItems.map((item) => {
            const priorityColors: Record<string, string> = {
              high: 'bg-rose-500/10 text-rose-400',
              medium: 'bg-amber-500/10 text-amber-400',
              low: 'bg-gray-700/50 text-gray-500',
            };
            return (
              <div
                key={item.id}
                onClick={() => toggleAction(item.id)}
                className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all ${
                  item.checked
                    ? 'bg-white/[0.02] opacity-60'
                    : 'hover:bg-white/5'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    item.checked
                      ? 'border-emerald-500 bg-emerald-500/20'
                      : 'border-gray-600 hover:border-gray-400'
                  }`}
                >
                  {item.checked && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <span
                  className={`flex-1 text-sm ${
                    item.checked ? 'line-through text-gray-600' : 'text-gray-300'
                  }`}
                >
                  {item.text}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    priorityColors[item.priority]
                  }`}
                >
                  {item.priority}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Week-over-Week Comparison ───────────────────────────── */}
      <section className="glass-card rounded-2xl p-6">
        <SectionHeading icon={TrendingUp} title="Week-over-Week Comparison" color="emerald" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {weekComparisons.map((item) => {
            const change = pctChange(item.current, item.previous);
            const isUp = change >= 0;
            return (
              <div
                key={item.label}
                className="glass-card rounded-xl p-4 border border-white/5"
              >
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 truncate">
                  {item.label}
                </p>
                <p className="text-xl font-bold text-white mb-1">
                  {formatComparisonValue(item.current, item.format)}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">
                    was {formatComparisonValue(item.previous, item.format)}
                  </span>
                  <span
                    className={`flex items-center text-xs font-semibold ${
                      isUp ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {isUp ? (
                      <ArrowUpRight className="w-3 h-3 mr-0.5" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 mr-0.5" />
                    )}
                    {Math.abs(change)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Footer / Print Hint ─────────────────────────────────── */}
      <div className="text-center text-xs text-gray-700 pt-4">
        Iron Secretary V2 &mdash; Weekly Review generated{' '}
        {format(new Date(2026, 1, 6), 'EEEE, MMM d yyyy')}
      </div>
    </div>
  );
};

export default WeeklyReview;
