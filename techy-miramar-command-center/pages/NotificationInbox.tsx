import React, { useState, useMemo, useCallback } from 'react';
import {
  Inbox,
  Bell,
  BellOff,
  AlertTriangle,
  DollarSign,
  Wrench,
  Bot,
  Settings,
  CheckCircle2,
  Clock,
  Filter,
  MailOpen,
  Trash2,
  ArrowRight,
  X,
  AlertCircle,
  MessageSquare,
  Zap,
  Shield,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────────

type NotificationType = 'critical' | 'money' | 'repair' | 'ai' | 'system';
type FilterTab = 'all' | NotificationType;

interface NotificationAction {
  label: string;
  variant?: 'default' | 'primary' | 'danger';
}

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  actions?: NotificationAction[];
}

// ── Type Config ─────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<NotificationType, {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
}> = {
  critical: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500',
    label: 'Critical',
  },
  money: {
    icon: DollarSign,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500',
    label: 'Money',
  },
  repair: {
    icon: Wrench,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500',
    label: 'Repairs',
  },
  ai: {
    icon: Bot,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500',
    label: 'AI',
  },
  system: {
    icon: Settings,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500',
    label: 'System',
  },
};

// ── Filter Tabs ─────────────────────────────────────────────────────────

const FILTER_TABS: { key: FilterTab; label: string; icon: React.ElementType }[] = [
  { key: 'all', label: 'All', icon: Inbox },
  { key: 'critical', label: 'Critical', icon: AlertTriangle },
  { key: 'money', label: 'Money', icon: DollarSign },
  { key: 'repair', label: 'Repairs', icon: Wrench },
  { key: 'ai', label: 'AI', icon: Bot },
  { key: 'system', label: 'System', icon: Settings },
];

// ── Mock Data ───────────────────────────────────────────────────────────

const now = new Date();

function minutesAgo(m: number): Date {
  return new Date(now.getTime() - m * 60 * 1000);
}

function hoursAgo(h: number): Date {
  return new Date(now.getTime() - h * 60 * 60 * 1000);
}

function daysAgo(d: number): Date {
  return new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  // Today - recent
  {
    id: 'n-1',
    type: 'critical',
    title: 'Repair stalled: iPhone 14 Pro Max screen replacement',
    description: 'John D\'s ticket has been in "Waiting for Parts" for 52 hours. Customer was promised 48h turnaround. Risk of negative review.',
    timestamp: minutesAgo(2),
    read: false,
    actions: [
      { label: 'View Ticket', variant: 'primary' },
      { label: 'Message Customer' },
    ],
  },
  {
    id: 'n-2',
    type: 'money',
    title: '$45 tip logged from Maria S.',
    description: 'iPad Air 5 screen replacement completed. Customer left $45 cash tip. Total job revenue: $294.',
    timestamp: minutesAgo(8),
    read: false,
  },
  {
    id: 'n-3',
    type: 'ai',
    title: 'Night Shift completed: 2 blog posts drafted',
    description: '"MacBook Battery Replacement Cost in Miramar 2026" and "iPhone Water Damage: What to Do First" are ready for your review.',
    timestamp: minutesAgo(23),
    read: false,
    actions: [
      { label: 'Review Drafts', variant: 'primary' },
      { label: 'Dismiss' },
    ],
  },
  {
    id: 'n-4',
    type: 'repair',
    title: 'Parts arrived: Samsung Galaxy S24 Ultra display',
    description: 'OLED display assembly (SM-S928B) received from supplier. Repair #R-2847 can now proceed. Customer: Alex T.',
    timestamp: minutesAgo(47),
    read: false,
    actions: [
      { label: 'Start Repair', variant: 'primary' },
      { label: 'Notify Customer' },
    ],
  },
  {
    id: 'n-5',
    type: 'critical',
    title: 'Overdue pickup: MacBook Pro 16" ready since yesterday',
    description: 'Customer "Lisa M." was notified at 3:15 PM yesterday. No response to text or call. Device sitting in completed shelf for 26 hours.',
    timestamp: hoursAgo(1),
    read: false,
    actions: [
      { label: 'Send Reminder', variant: 'primary' },
      { label: 'Mark Attempted' },
    ],
  },
  {
    id: 'n-6',
    type: 'money',
    title: 'Midas Alert: MacBook Air M1 below buy threshold',
    description: 'OfferUp listing found: MacBook Air M1 8GB/256GB for $340. Your buy limit is $400. Estimated flip profit: $185 after repair.',
    timestamp: hoursAgo(2),
    read: true,
    actions: [
      { label: 'View Deal', variant: 'primary' },
      { label: 'Pass' },
    ],
  },
  {
    id: 'n-7',
    type: 'ai',
    title: 'Proactive insight: Screen protector upsell opportunity',
    description: 'You\'ve completed 4 screen replacements today without selling protectors. Historical attach rate is 62%. Estimated missed revenue: ~$80.',
    timestamp: hoursAgo(3),
    read: true,
  },
  // Yesterday
  {
    id: 'n-8',
    type: 'repair',
    title: 'Customer message: "Is my iPad ready yet?"',
    description: 'Diana R. sent a text about repair #R-2831 (iPad Pro 12.9 battery replacement). Currently in diagnostics queue.',
    timestamp: hoursAgo(18),
    read: true,
    actions: [
      { label: 'Reply', variant: 'primary' },
      { label: 'View Repair' },
    ],
  },
  {
    id: 'n-9',
    type: 'money',
    title: 'Debt aging: Carlos P. owes $175 (14 days)',
    description: 'iPhone 13 back glass repair completed 14 days ago. Customer agreed to pay "next week" but no payment received. Balance: $175.',
    timestamp: hoursAgo(22),
    read: true,
    actions: [
      { label: 'Send Invoice', variant: 'primary' },
      { label: 'Call Customer' },
    ],
  },
  {
    id: 'n-10',
    type: 'system',
    title: 'Nightly backup completed successfully',
    description: 'All databases backed up at 3:00 AM. Backup size: 2.4 GB. No anomalies detected. Next backup scheduled for tomorrow 3:00 AM.',
    timestamp: hoursAgo(26),
    read: true,
  },
  // Earlier this week
  {
    id: 'n-11',
    type: 'system',
    title: 'Supabase sync: 3 new leads imported',
    description: 'Automated sync pulled 3 new leads from the website contact form. All assigned to "New" pipeline stage. 1 flagged as high-intent (mentioned "bulk repair").',
    timestamp: daysAgo(2),
    read: true,
    actions: [
      { label: 'View Leads', variant: 'primary' },
    ],
  },
  {
    id: 'n-12',
    type: 'ai',
    title: 'ReviewGuard: New 4-star review needs response',
    description: 'Mike L. left a 4-star review: "Great repair but parking was tough." AI has drafted a response acknowledging the parking situation and thanking for the visit.',
    timestamp: daysAgo(3),
    read: true,
    actions: [
      { label: 'Approve Response', variant: 'primary' },
      { label: 'Edit Draft' },
    ],
  },
];

// ── Relative Time Formatter ─────────────────────────────────────────────

function formatRelativeTime(date: Date): string {
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Date Group Helper ───────────────────────────────────────────────────

function getDateGroup(date: Date): string {
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return 'This Week';
}

function groupByDate(notifications: Notification[]): { label: string; items: Notification[] }[] {
  const groups: Map<string, Notification[]> = new Map();
  const order = ['Today', 'Yesterday', 'This Week'];

  for (const n of notifications) {
    const group = getDateGroup(n.timestamp);
    if (!groups.has(group)) {
      groups.set(group, []);
    }
    groups.get(group)!.push(n);
  }

  return order
    .filter((label) => groups.has(label))
    .map((label) => ({
      label,
      items: groups.get(label)!.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
    }));
}

// ── Notification Card ───────────────────────────────────────────────────

interface NotificationCardProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onAction: (id: string, action: string) => void;
}

const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onMarkRead,
  onDismiss,
  onAction,
}) => {
  const config = TYPE_CONFIG[notification.type];
  const IconComponent = config.icon;
  const isCritical = notification.type === 'critical';

  return (
    <div
      className={`glass-card rounded-xl p-4 hover:bg-white/5 transition-all group relative ${
        isCritical ? 'border-l-2 border-red-500' : ''
      } ${!notification.read ? 'bg-white/[0.02]' : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* Unread dot */}
        <div className="flex-shrink-0 w-2 pt-2">
          {!notification.read && (
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          )}
        </div>

        {/* Type icon */}
        <div className={`flex-shrink-0 w-9 h-9 rounded-lg ${config.bgColor} flex items-center justify-center mt-0.5`}>
          <IconComponent size={18} className={config.color} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h3 className={`text-sm font-medium leading-snug ${
              notification.read ? 'text-gray-300' : 'text-white'
            }`}>
              {notification.title}
            </h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-xs text-gray-500 whitespace-nowrap">
                <Clock size={10} className="inline mr-1 -mt-px" />
                {formatRelativeTime(notification.timestamp)}
              </span>
              {/* Quick actions on hover */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                {!notification.read && (
                  <button
                    onClick={() => onMarkRead(notification.id)}
                    title="Mark as read"
                    className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <MailOpen size={13} />
                  </button>
                )}
                <button
                  onClick={() => onDismiss(notification.id)}
                  title="Dismiss"
                  className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          </div>

          <p className={`text-xs mt-1 leading-relaxed ${
            notification.read ? 'text-gray-600' : 'text-gray-400'
          }`}>
            {notification.description}
          </p>

          {/* Action buttons */}
          {notification.actions && notification.actions.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              {notification.actions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => onAction(notification.id, action.label)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors font-medium ${
                    action.variant === 'primary'
                      ? `${config.bgColor} ${config.color} hover:brightness-125`
                      : action.variant === 'danger'
                        ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                        : 'bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Empty State ─────────────────────────────────────────────────────────

const EmptyState: React.FC<{ filter: FilterTab }> = ({ filter }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
      <BellOff size={28} className="text-gray-600" />
    </div>
    <h3 className="text-lg font-semibold text-white mb-1">You're all caught up!</h3>
    <p className="text-sm text-gray-500 max-w-xs">
      {filter === 'all'
        ? 'No notifications right now. We\'ll alert you when something needs your attention.'
        : `No ${TYPE_CONFIG[filter as NotificationType]?.label.toLowerCase() ?? filter} notifications at the moment.`}
    </p>
  </div>
);

// ── Main Component ──────────────────────────────────────────────────────

const NotificationInbox: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  // Derived counts
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    for (const n of notifications) {
      if (!n.read) {
        counts.all = (counts.all || 0) + 1;
        counts[n.type] = (counts[n.type] || 0) + 1;
      }
    }
    return counts;
  }, [notifications]);

  // Filtered + grouped
  const filtered = useMemo(() => {
    const list =
      activeFilter === 'all'
        ? notifications
        : notifications.filter((n) => n.type === activeFilter);
    return groupByDate(list);
  }, [notifications, activeFilter]);

  const isEmpty = filtered.length === 0;

  // Handlers
  const handleMarkRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const handleDismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleAction = useCallback((id: string, _action: string) => {
    // In a real app, this would route to the relevant page or trigger an API call.
    // For now, mark as read on any action click.
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const handleMarkAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-800/50 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
            <Inbox className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-white tracking-tight">Inbox</h1>
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-blue-500 text-white text-xs font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm mt-0.5">
              Alerts, updates, and action items across all systems
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 md:mt-0">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <CheckCircle2 size={14} />
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* ── Filter Tabs ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.key;
          const count = filterCounts[tab.key] || 0;
          const TabIcon = tab.icon;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white/10 text-white ring-1 ring-white/10'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              <TabIcon size={14} />
              {tab.label}
              {count > 0 && (
                <span className={`text-[10px] min-w-[16px] h-4 flex items-center justify-center rounded-full px-1 font-bold ${
                  isActive ? 'bg-white/15 text-white' : 'bg-white/5 text-gray-500'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Notification Feed ──────────────────────────────────────────── */}
      {isEmpty ? (
        <EmptyState filter={activeFilter} />
      ) : (
        <div className="space-y-6">
          {filtered.map((group) => (
            <div key={group.label}>
              {/* Date separator */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-gray-800/60" />
                <span className="text-xs text-gray-600">
                  {group.items.length} {group.items.length === 1 ? 'notification' : 'notifications'}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                {group.items.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onMarkRead={handleMarkRead}
                    onDismiss={handleDismiss}
                    onAction={handleAction}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Summary Footer ─────────────────────────────────────────────── */}
      {!isEmpty && (
        <div className="flex items-center justify-center pt-4 pb-2">
          <p className="text-xs text-gray-600">
            Showing {notifications.filter((n) => activeFilter === 'all' || n.type === activeFilter).length} notifications
            {activeFilter !== 'all' && (
              <>
                {' '}in <span className="text-gray-500">{TYPE_CONFIG[activeFilter as NotificationType]?.label}</span>
              </>
            )}
            {' '}&middot;{' '}
            <button
              onClick={() => setActiveFilter('all')}
              className="text-gray-500 hover:text-white transition-colors"
            >
              View all
            </button>
          </p>
        </div>
      )}
    </div>
  );
};

export default NotificationInbox;
