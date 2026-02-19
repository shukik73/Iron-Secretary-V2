import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Wrench,
  Package,
  Users,
  Bell,
  Mail,
  Video,
  Coffee,
  ArrowRight,
  MapPin,
  DollarSign,
  Timer,
  LayoutGrid,
  List,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────
type EventType = 'repair' | 'pickup' | 'demo' | 'reminder' | 'follow_up' | 'blocked';
type ViewMode = 'day' | 'week';

interface ScheduleEvent {
  id: string;
  title: string;
  type: EventType;
  startHour: number;   // 24h decimal, e.g. 9.5 = 9:30 AM
  duration: number;     // hours, e.g. 1.5
  date: string;         // ISO date string YYYY-MM-DD
  location?: string;
  revenue?: number;
  notes?: string;
  contact?: string;
}

// ── Color & icon maps ────────────────────────────────────────
const EVENT_COLORS: Record<EventType, { bg: string; border: string; text: string; badge: string }> = {
  repair:    { bg: 'bg-blue-500/15',    border: 'border-l-blue-500',    text: 'text-blue-300',    badge: 'bg-blue-500' },
  pickup:    { bg: 'bg-emerald-500/15', border: 'border-l-emerald-500', text: 'text-emerald-300', badge: 'bg-emerald-500' },
  demo:      { bg: 'bg-purple-500/15',  border: 'border-l-purple-500',  text: 'text-purple-300',  badge: 'bg-purple-500' },
  reminder:  { bg: 'bg-amber-500/15',   border: 'border-l-amber-500',   text: 'text-amber-300',   badge: 'bg-amber-500' },
  follow_up: { bg: 'bg-pink-500/15',    border: 'border-l-pink-500',    text: 'text-pink-300',    badge: 'bg-pink-500' },
  blocked:   { bg: 'bg-gray-500/15',    border: 'border-l-gray-500',    text: 'text-gray-400',    badge: 'bg-gray-500' },
};

const EVENT_ICONS: Record<EventType, React.ReactNode> = {
  repair:    <Wrench  size={14} />,
  pickup:    <Package size={14} />,
  demo:      <Video   size={14} />,
  reminder:  <Bell    size={14} />,
  follow_up: <Mail    size={14} />,
  blocked:   <Coffee  size={14} />,
};

const EVENT_LABELS: Record<EventType, string> = {
  repair:    'Repair',
  pickup:    'Pickup',
  demo:      'Demo',
  reminder:  'Reminder',
  follow_up: 'Follow-up',
  blocked:   'Blocked',
};

// ── Helpers ──────────────────────────────────────────────────
function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function getMonday(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  r.setDate(r.getDate() + diff);
  return r;
}

function formatHour(h: number): string {
  const hour = Math.floor(h);
  const mins = Math.round((h - hour) * 60);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return mins > 0 ? `${display}:${String(mins).padStart(2, '0')} ${suffix}` : `${display} ${suffix}`;
}

function formatTimeRange(start: number, duration: number): string {
  return `${formatHour(start)} - ${formatHour(start + duration)}`;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOUR_START = 7;
const HOUR_END = 20;
const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);
const ROW_HEIGHT = 64; // px per hour

// ── Mock data builder ────────────────────────────────────────
function buildMockEvents(baseDate: Date): ScheduleEvent[] {
  const today = toDateKey(baseDate);
  const tomorrow = toDateKey(addDays(baseDate, 1));
  const dayAfter = toDateKey(addDays(baseDate, 2));
  const monday = getMonday(baseDate);

  return [
    // Today's events
    {
      id: 'e1',
      title: 'iPhone 14 Screen Repair',
      type: 'repair',
      startHour: 9,
      duration: 1.5,
      date: today,
      contact: 'Maria G.',
      revenue: 180,
      notes: 'OLED panel already in stock. Customer prefers matte protector.',
      location: 'Bench 1',
    },
    {
      id: 'e2',
      title: 'Call parts supplier',
      type: 'reminder',
      startHour: 10,
      duration: 0.5,
      date: today,
      notes: 'Re-order Samsung S24 Ultra screens (3x). Ask about bulk discount.',
    },
    {
      id: 'e3',
      title: 'MacBook Pro Battery Swap',
      type: 'repair',
      startHour: 11,
      duration: 2,
      date: today,
      contact: 'David T.',
      revenue: 220,
      notes: '2019 16-inch model. Battery cycle count >1200. Customer wants data preserved.',
      location: 'Bench 2',
    },
    {
      id: 'e4',
      title: 'Lunch Break',
      type: 'blocked',
      startHour: 13,
      duration: 1,
      date: today,
    },
    {
      id: 'e5',
      title: 'John M. pickup',
      type: 'pickup',
      startHour: 14,
      duration: 0.5,
      date: today,
      contact: 'John M.',
      revenue: 150,
      notes: 'iPad Air 5 screen replacement. Payment pending - card on file.',
      location: 'Front counter',
    },
    {
      id: 'e6',
      title: 'ReviewGuard Demo - Sarah\'s Bakery',
      type: 'demo',
      startHour: 15,
      duration: 1,
      date: today,
      contact: 'Sarah K.',
      notes: 'Show automated review response flow. Highlight sentiment analysis. Bring ROI calculator.',
      location: 'Zoom',
    },
    {
      id: 'e7',
      title: 'Follow up: Lisa R. quote',
      type: 'follow_up',
      startHour: 16.5,
      duration: 0.5,
      date: today,
      contact: 'Lisa R.',
      notes: 'Sent quote for water damage repair on Galaxy S23. Follow up on decision.',
    },
    {
      id: 'e8',
      title: 'Samsung S24 Ultra Screen',
      type: 'repair',
      startHour: 17,
      duration: 1.5,
      date: today,
      contact: 'Alex P.',
      revenue: 280,
      notes: 'Customer dropping off at 5pm. High-priority same-day repair.',
      location: 'Bench 1',
    },
    // Rest of week events
    {
      id: 'e9',
      title: 'iPad Mini Digitizer',
      type: 'repair',
      startHour: 10,
      duration: 1,
      date: tomorrow,
      contact: 'Karen W.',
      revenue: 120,
    },
    {
      id: 'e10',
      title: 'Emilio: Mike\'s Auto Body reply',
      type: 'follow_up',
      startHour: 9,
      duration: 0.5,
      date: tomorrow,
      contact: 'Mike D.',
    },
    {
      id: 'e11',
      title: 'Google Pixel 8 Back Glass',
      type: 'repair',
      startHour: 13,
      duration: 1,
      date: dayAfter,
      revenue: 95,
      contact: 'Chris L.',
    },
    {
      id: 'e12',
      title: 'Midas listing photos',
      type: 'reminder',
      startHour: 15,
      duration: 1,
      date: dayAfter,
      notes: 'Photograph 3 refurbished MacBooks for eBay listing.',
    },
    {
      id: 'e13',
      title: 'Weekly team sync',
      type: 'blocked',
      startHour: 8,
      duration: 0.5,
      date: toDateKey(addDays(monday, 0)),
    },
    {
      id: 'e14',
      title: 'Customer pickup: Tablet',
      type: 'pickup',
      startHour: 11,
      duration: 0.5,
      date: toDateKey(addDays(monday, 3)),
      contact: 'James F.',
      revenue: 85,
    },
    {
      id: 'e15',
      title: 'ReviewGuard onboarding call',
      type: 'demo',
      startHour: 14,
      duration: 1,
      date: toDateKey(addDays(monday, 4)),
      contact: 'Tony\'s Pizza',
      location: 'Zoom',
    },
  ];
}

// ── Component ────────────────────────────────────────────────
const TimelineCalendar: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [currentMinute, setCurrentMinute] = useState<number>(0); // forces re-render for time indicator

  // Tick every 60 s to update current-time line
  useEffect(() => {
    setCurrentMinute(Date.now());
    const id = setInterval(() => setCurrentMinute(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const allEvents = useMemo(() => buildMockEvents(new Date()), []);

  // ── Derived data ───────────────────────────────────────────
  const todayKey = toDateKey(new Date());
  const selectedDateKey = toDateKey(selectedDate);
  const weekMonday = getMonday(selectedDate);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekMonday, i));

  const dayEvents = allEvents
    .filter((e) => e.date === selectedDateKey)
    .sort((a, b) => a.startHour - b.startHour);

  const weekEventsMap = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    weekDates.forEach((d) => map.set(toDateKey(d), []));
    allEvents.forEach((e) => {
      const bucket = map.get(e.date);
      if (bucket) bucket.push(e);
    });
    map.forEach((arr) => arr.sort((a, b) => a.startHour - b.startHour));
    return map;
  }, [allEvents, weekMonday.getTime()]);

  // ── Summary stats ──────────────────────────────────────────
  const todayEvents = allEvents.filter((e) => e.date === todayKey);
  const totalRevenue = todayEvents.reduce((sum, e) => sum + (e.revenue ?? 0), 0);
  const busiestHour = useMemo(() => {
    const counts: Record<number, number> = {};
    todayEvents.forEach((e) => {
      const h = Math.floor(e.startHour);
      counts[h] = (counts[h] || 0) + 1;
    });
    let maxH = HOUR_START;
    let maxC = 0;
    for (const [h, c] of Object.entries(counts)) {
      if (c > maxC) { maxC = c; maxH = Number(h); }
    }
    return maxH;
  }, [todayEvents]);

  const freeBlocks = useMemo(() => {
    const occupied = new Set<number>();
    todayEvents.forEach((e) => {
      const start = Math.floor(e.startHour);
      const end = Math.ceil(e.startHour + e.duration);
      for (let h = start; h < end; h++) occupied.add(h);
    });
    return HOURS.filter((h) => !occupied.has(h)).length;
  }, [todayEvents]);

  // ── Current-time position ──────────────────────────────────
  const now = new Date();
  const currentDecimalHour = now.getHours() + now.getMinutes() / 60;
  const isTimeVisible = currentDecimalHour >= HOUR_START && currentDecimalHour <= HOUR_END;
  const timeLineTop = (currentDecimalHour - HOUR_START) * ROW_HEIGHT;

  // ── Navigation ─────────────────────────────────────────────
  const goToday = () => { setSelectedDate(new Date()); setSelectedEvent(null); };
  const goPrev = () => {
    setSelectedDate((d) => addDays(d, viewMode === 'day' ? -1 : -7));
    setSelectedEvent(null);
  };
  const goNext = () => {
    setSelectedDate((d) => addDays(d, viewMode === 'day' ? 1 : 7));
    setSelectedEvent(null);
  };

  // ── Quick-add placeholder ──────────────────────────────────
  const handleSlotClick = (_hour: number, _dateKey?: string) => {
    setSelectedEvent(null);
    // TODO: open creation modal
  };

  // ── Render helpers ─────────────────────────────────────────
  const renderEventBlock = (event: ScheduleEvent, compact = false) => {
    const colors = EVENT_COLORS[event.type];
    const topPx = (event.startHour - HOUR_START) * ROW_HEIGHT;
    const heightPx = Math.max(event.duration * ROW_HEIGHT - 4, 28); // min 28px

    return (
      <div
        key={event.id}
        role="button"
        tabIndex={0}
        onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
        onKeyDown={(e) => { if (e.key === 'Enter') setSelectedEvent(event); }}
        className={`absolute left-0 right-0 mx-1 rounded-lg px-3 py-1.5 text-sm font-medium cursor-pointer
          hover:ring-2 hover:ring-white/20 transition-all border-l-[3px]
          ${colors.bg} ${colors.border} ${colors.text}
          ${selectedEvent?.id === event.id ? 'ring-2 ring-white/30 scale-[1.01]' : ''}`}
        style={{ top: `${topPx}px`, height: `${heightPx}px`, zIndex: selectedEvent?.id === event.id ? 20 : 10 }}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className="flex-shrink-0 opacity-70">{EVENT_ICONS[event.type]}</span>
          <span className="truncate">{compact ? event.title.split(' - ')[0] : event.title}</span>
        </div>
        {!compact && heightPx > 36 && (
          <p className="text-xs opacity-60 mt-0.5 truncate">
            {formatTimeRange(event.startHour, event.duration)}
            {event.revenue ? ` | $${event.revenue}` : ''}
          </p>
        )}
      </div>
    );
  };

  // ── Day View ───────────────────────────────────────────────
  const renderDayView = () => (
    <div className="relative" style={{ height: `${HOURS.length * ROW_HEIGHT}px` }}>
      {/* Hour rows */}
      {HOURS.map((h) => (
        <div
          key={h}
          className="absolute left-0 right-0 flex border-t border-gray-800/30"
          style={{ top: `${(h - HOUR_START) * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }}
        >
          <div className="text-xs text-gray-500 w-16 text-right pr-4 -mt-2.5 select-none flex-shrink-0">
            {formatHour(h)}
          </div>
          <div
            className="flex-1 hover:bg-white/[0.02] transition-colors cursor-pointer"
            onClick={() => handleSlotClick(h)}
          />
        </div>
      ))}

      {/* Events layer */}
      <div className="absolute top-0 bottom-0 left-16 right-0">
        {dayEvents.map((e) => renderEventBlock(e))}
      </div>

      {/* Current time indicator */}
      {isTimeVisible && selectedDateKey === todayKey && (
        <div
          className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
          style={{ top: `${timeLineTop}px` }}
        >
          <div className="w-16 flex justify-end pr-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
          </div>
          <div className="flex-1 border-t-2 border-red-500 opacity-80" />
        </div>
      )}
    </div>
  );

  // ── Week View ──────────────────────────────────────────────
  const renderWeekView = () => (
    <div>
      {/* Day headers */}
      <div className="flex border-b border-gray-800/50 pb-2 mb-0">
        <div className="w-16 flex-shrink-0" />
        {weekDates.map((d, i) => {
          const key = toDateKey(d);
          const isToday = key === todayKey;
          return (
            <div
              key={key}
              className={`flex-1 text-center text-sm font-semibold py-2
                ${isToday ? 'text-blue-400' : 'text-gray-400'}`}
            >
              <span className="block text-xs uppercase tracking-wider">{DAY_NAMES[i]}</span>
              <span
                className={`inline-flex items-center justify-center w-8 h-8 rounded-full mt-1
                  ${isToday ? 'bg-blue-500 text-white' : ''}`}
              >
                {d.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="relative" style={{ height: `${HOURS.length * ROW_HEIGHT}px` }}>
        {/* Hour rows */}
        {HOURS.map((h) => (
          <div
            key={h}
            className="absolute left-0 right-0 flex border-t border-gray-800/30"
            style={{ top: `${(h - HOUR_START) * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }}
          >
            <div className="text-xs text-gray-500 w-16 text-right pr-4 -mt-2.5 select-none flex-shrink-0">
              {formatHour(h)}
            </div>
            <div className="flex-1 flex">
              {weekDates.map((d) => {
                const key = toDateKey(d);
                const isToday = key === todayKey;
                return (
                  <div
                    key={key}
                    className={`flex-1 border-l border-gray-800/20 hover:bg-white/[0.02] transition-colors cursor-pointer
                      ${isToday ? 'bg-blue-500/[0.03]' : ''}`}
                    onClick={() => handleSlotClick(h, key)}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {/* Events per column */}
        <div className="absolute top-0 bottom-0 left-16 right-0 flex pointer-events-none">
          {weekDates.map((d) => {
            const key = toDateKey(d);
            const events = weekEventsMap.get(key) || [];
            return (
              <div key={key} className="flex-1 relative pointer-events-auto">
                {events.map((e) => renderEventBlock(e, true))}
              </div>
            );
          })}
        </div>

        {/* Current time indicator (week view) */}
        {isTimeVisible && (
          <div
            className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
            style={{ top: `${timeLineTop}px` }}
          >
            <div className="w-16 flex justify-end pr-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
            </div>
            <div className="flex-1 border-t-2 border-red-500 opacity-60" />
          </div>
        )}
      </div>
    </div>
  );

  // ── Side Panel: Event Details ──────────────────────────────
  const renderEventDetails = (event: ScheduleEvent) => {
    const colors = EVENT_COLORS[event.type];
    return (
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.bg} ${colors.text}`}>
              {EVENT_ICONS[event.type]}
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider ${colors.text}`}>
              {EVENT_LABELS[event.type]}
            </span>
          </div>
          <button
            onClick={() => setSelectedEvent(null)}
            className="text-xs text-gray-500 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>

        <h3 className="text-xl font-bold text-white leading-snug">{event.title}</h3>

        <div className="space-y-3 text-sm">
          <div className="flex items-center text-gray-300">
            <Clock size={14} className="mr-2 text-gray-500 flex-shrink-0" />
            {formatTimeRange(event.startHour, event.duration)}
            <span className="ml-2 text-gray-500">({event.duration}h)</span>
          </div>

          <div className="flex items-center text-gray-300">
            <Calendar size={14} className="mr-2 text-gray-500 flex-shrink-0" />
            {new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </div>

          {event.location && (
            <div className="flex items-center text-gray-300">
              <MapPin size={14} className="mr-2 text-gray-500 flex-shrink-0" />
              {event.location}
            </div>
          )}

          {event.contact && (
            <div className="flex items-center text-gray-300">
              <Users size={14} className="mr-2 text-gray-500 flex-shrink-0" />
              {event.contact}
            </div>
          )}

          {event.revenue != null && event.revenue > 0 && (
            <div className="flex items-center text-emerald-400 font-semibold">
              <DollarSign size={14} className="mr-2 flex-shrink-0" />
              ${event.revenue.toLocaleString()}
            </div>
          )}
        </div>

        {event.notes && (
          <div className="bg-black/20 rounded-xl p-4 border border-white/5">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Notes</p>
            <p className="text-sm text-gray-300 leading-relaxed">{event.notes}</p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-xs font-medium text-gray-300 transition-colors">
            Edit Event
          </button>
          <button className="flex-1 py-2 bg-white/5 hover:bg-red-500/20 border border-white/5 hover:border-red-500/30 rounded-lg text-xs font-medium text-gray-300 hover:text-red-400 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    );
  };

  // ── Side Panel: Today's Summary ────────────────────────────
  const renderSummary = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white mb-1">Today's Summary</h3>
        <p className="text-xs text-gray-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-black/20 rounded-xl p-4 border border-white/5">
          <Calendar size={16} className="text-blue-400 mb-2" />
          <p className="text-2xl font-bold text-white">{todayEvents.length}</p>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Events</p>
        </div>
        <div className="bg-black/20 rounded-xl p-4 border border-white/5">
          <DollarSign size={16} className="text-emerald-400 mb-2" />
          <p className="text-2xl font-bold text-white">${totalRevenue}</p>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Revenue</p>
        </div>
        <div className="bg-black/20 rounded-xl p-4 border border-white/5">
          <Timer size={16} className="text-amber-400 mb-2" />
          <p className="text-2xl font-bold text-white">{formatHour(busiestHour)}</p>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Busiest</p>
        </div>
        <div className="bg-black/20 rounded-xl p-4 border border-white/5">
          <Clock size={16} className="text-purple-400 mb-2" />
          <p className="text-2xl font-bold text-white">{freeBlocks}h</p>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Free Time</p>
        </div>
      </div>

      {/* Today's event list */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Schedule</p>
        <div className="space-y-2">
          {todayEvents.map((e) => {
            const colors = EVENT_COLORS[e.type];
            return (
              <div
                key={e.id}
                role="button"
                tabIndex={0}
                onClick={() => { setSelectedEvent(e); setSelectedDate(new Date()); }}
                onKeyDown={(ev) => { if (ev.key === 'Enter') setSelectedEvent(e); }}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group"
              >
                <div className={`w-1.5 h-8 rounded-full ${colors.badge} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate group-hover:text-blue-300 transition-colors">
                    {e.title}
                  </p>
                  <p className="text-xs text-gray-500">{formatHour(e.startHour)}</p>
                </div>
                <ArrowRight size={14} className="text-gray-700 group-hover:text-gray-400 transition-colors flex-shrink-0" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="pt-4 border-t border-white/5">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Legend</p>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(EVENT_LABELS) as EventType[]).map((type) => {
            const colors = EVENT_COLORS[type];
            return (
              <div key={type} className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${colors.badge}`} />
                <span className="text-xs text-gray-400">{EVENT_LABELS[type]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ── Main render ────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-800/50 pb-6 gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-white tracking-tight">Schedule</h1>

          {/* View toggle */}
          <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/5">
            <button
              onClick={() => setViewMode('day')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                ${viewMode === 'day' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <List size={14} />
              Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                ${viewMode === 'week' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <LayoutGrid size={14} />
              Week
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Date navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={goPrev}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-semibold text-white min-w-[180px] text-center">
              {viewMode === 'day'
                ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
                : `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            </span>
            <button
              onClick={goNext}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              aria-label="Next"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <button
            onClick={goToday}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/10 text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            Today
          </button>

          <button className="bg-white text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors flex items-center shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            <Plus className="w-4 h-4 mr-2" />
            Add Event
          </button>
        </div>
      </div>

      {/* Main content: Calendar + Side Panel */}
      <div className="flex gap-6">
        {/* Calendar area */}
        <div className="flex-1 glass-card rounded-2xl p-6 overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {viewMode === 'day' ? renderDayView() : renderWeekView()}
        </div>

        {/* Side Panel */}
        <div className="glass-card rounded-2xl p-6 w-80 flex-shrink-0 overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {selectedEvent ? renderEventDetails(selectedEvent) : renderSummary()}
        </div>
      </div>
    </div>
  );
};

export default TimelineCalendar;
