import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  DollarSign,
  Bell,
  CheckSquare,
  Search,
  ChevronUp,
  ChevronDown,
  Clock,
  X,
  Command,
  Sparkles,
} from 'lucide-react';

interface CaptureEntry {
  id: number;
  text: string;
  type: string;
  timestamp: Date;
}

interface QuickCaptureProps {
  onCapture: (text: string, type: string) => void;
  isVisible?: boolean;
}

type CaptureType = 'tip' | 'reminder' | 'task' | 'search' | 'note';

interface TypeConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ElementType;
}

const TYPE_CONFIG: Record<CaptureType, TypeConfig> = {
  tip:      { label: 'Logging tip',       color: 'text-emerald-400', bgColor: 'bg-emerald-400/15 border-emerald-400/30', icon: DollarSign },
  reminder: { label: 'Setting reminder',  color: 'text-amber-400',   bgColor: 'bg-amber-400/15 border-amber-400/30',   icon: Bell },
  task:     { label: 'Creating task',      color: 'text-blue-400',    bgColor: 'bg-blue-400/15 border-blue-400/30',     icon: CheckSquare },
  search:   { label: 'Searching',          color: 'text-purple-400',  bgColor: 'bg-purple-400/15 border-purple-400/30', icon: Search },
  note:     { label: 'Quick note',         color: 'text-gray-400',    bgColor: 'bg-gray-400/15 border-gray-400/30',     icon: Sparkles },
};

function detectType(text: string): CaptureType {
  const lower = text.toLowerCase().trim();
  if (lower.startsWith('$') || lower.includes('tip')) return 'tip';
  if (lower.includes('remind')) return 'reminder';
  if (lower.includes('task') || lower.includes('todo')) return 'task';
  if (lower.includes('search') || lower.includes('find')) return 'search';
  return 'note';
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

const INITIAL_CAPTURES: CaptureEntry[] = [
  { id: 1, text: 'Got $25 tip from iPad repair',             type: 'tip',      timestamp: new Date(Date.now() - 12 * 60000) },
  { id: 2, text: 'Remind me to order iPhone 14 screens',     type: 'reminder', timestamp: new Date(Date.now() - 45 * 60000) },
  { id: 3, text: 'Task: update Midas buy rules for MacBooks', type: 'task',     timestamp: new Date(Date.now() - 2 * 3600000) },
  { id: 4, text: 'Search leads for Samsung Galaxy S24',      type: 'search',   timestamp: new Date(Date.now() - 4 * 3600000) },
  { id: 5, text: 'Customer wants a quote on water damage fix', type: 'note',    timestamp: new Date(Date.now() - 6 * 3600000) },
];

const QuickCapture: React.FC<QuickCaptureProps> = ({ onCapture, isVisible = true }) => {
  const [input, setInput] = useState('');
  const [captures, setCaptures] = useState<CaptureEntry[]>(INITIAL_CAPTURES);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const detectedType = input.trim() ? detectType(input) : null;
  const typeConfig = detectedType ? TYPE_CONFIG[detectedType] : null;

  const handleCapture = useCallback((overrideType?: CaptureType) => {
    const text = input.trim();
    if (!text) return;

    const type = overrideType || detectType(text);
    const entry: CaptureEntry = {
      id: Date.now(),
      text,
      type,
      timestamp: new Date(),
    };

    setCaptures(prev => [entry, ...prev].slice(0, 20));
    onCapture(text, type);
    setInput('');
    inputRef.current?.focus();
  }, [input, onCapture]);

  const handleQuickAction = useCallback((type: CaptureType) => {
    if (input.trim()) {
      handleCapture(type);
    } else {
      // Pre-fill a prefix so the user knows what mode they're in
      const prefixes: Record<CaptureType, string> = {
        tip: '$',
        reminder: 'Remind me to ',
        task: 'Task: ',
        search: 'Search ',
        note: '',
      };
      setInput(prefixes[type]);
      inputRef.current?.focus();
    }
  }, [input, handleCapture]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCapture();
    }
    if (e.key === 'Escape') {
      setInput('');
      inputRef.current?.blur();
    }
  }, [handleCapture]);

  const dismissCapture = useCallback((id: number) => {
    setCaptures(prev => prev.filter(c => c.id !== id));
  }, []);

  // Global keyboard shortcut: Ctrl/Cmd + K to focus the input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!isVisible) return null;

  const recentCaptures = captures.slice(0, 5);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:pl-[260px]">
      {/* Recent Captures (expandable) */}
      {isHistoryOpen && recentCaptures.length > 0 && (
        <div className="bg-black/90 backdrop-blur-xl border-t border-gray-800/50 animate-fade-in">
          <div className="max-w-5xl mx-auto px-4">
            <div className="py-2 space-y-1">
              {recentCaptures.map((entry) => {
                const cfg = TYPE_CONFIG[entry.type as CaptureType] || TYPE_CONFIG.note;
                const Icon = cfg.icon;
                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors group"
                  >
                    <div className={`p-1 rounded ${cfg.bgColor} border`}>
                      <Icon size={12} className={cfg.color} />
                    </div>
                    <span className="flex-1 text-sm text-gray-300 truncate">{entry.text}</span>
                    <span className="text-xs text-gray-600 flex items-center gap-1 shrink-0">
                      <Clock size={10} />
                      {formatRelativeTime(entry.timestamp)}
                    </span>
                    <button
                      onClick={() => dismissCapture(entry.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-gray-600 hover:text-gray-400 transition-all"
                      aria-label="Dismiss capture"
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main capture bar */}
      <div className="bg-black/80 backdrop-blur-xl border-t border-gray-800/50">
        <div className="max-w-5xl mx-auto px-4 py-3">
          {/* Type indicator badge row */}
          <div className="flex items-center justify-between mb-2 min-h-[24px]">
            <div className="flex items-center gap-2">
              {typeConfig && detectedType && (
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-all ${typeConfig.bgColor} ${typeConfig.color}`}
                >
                  <typeConfig.icon size={11} />
                  {typeConfig.label}
                </span>
              )}
              {!detectedType && isFocused && (
                <span className="text-xs text-gray-600">
                  Start typing to auto-detect capture type...
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {captures.length > 0 && (
                <button
                  onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
                >
                  <Clock size={12} />
                  <span>Recent ({Math.min(captures.length, 5)})</span>
                  {isHistoryOpen ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                </button>
              )}
            </div>
          </div>

          {/* Input row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Capture a thought, log a tip, set a reminder..."
                maxLength={500}
                className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all text-sm pr-24"
              />
              {/* Keyboard shortcut hint inside input */}
              {!input && !isFocused && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                  <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 bg-gray-800 border border-gray-700 rounded">
                    <Command size={9} />K
                  </kbd>
                </div>
              )}
              {input && (
                <button
                  onClick={() => { setInput(''); inputRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-500 hover:text-gray-300 hover:bg-white/10 transition-all"
                  aria-label="Clear input"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleQuickAction('tip')}
                className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-emerald-400 transition-all"
                title="Log a tip"
                aria-label="Log a tip"
              >
                <DollarSign size={18} />
              </button>
              <button
                onClick={() => handleQuickAction('reminder')}
                className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-amber-400 transition-all"
                title="Set a reminder"
                aria-label="Set a reminder"
              >
                <Bell size={18} />
              </button>
              <button
                onClick={() => handleQuickAction('task')}
                className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-blue-400 transition-all"
                title="Create a task"
                aria-label="Create a task"
              >
                <CheckSquare size={18} />
              </button>
              <button
                onClick={() => handleQuickAction('search')}
                className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-purple-400 transition-all"
                title="Search"
                aria-label="Search across modules"
              >
                <Search size={18} />
              </button>

              {/* Send / capture button */}
              <button
                onClick={() => handleCapture()}
                disabled={!input.trim()}
                className={`p-2 rounded-lg transition-all ml-1 ${
                  input.trim()
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                }`}
                aria-label="Send capture"
              >
                <Send size={18} />
              </button>
            </div>
          </div>

          {/* Bottom hint */}
          <div className="flex items-center justify-between mt-2">
            <p className="text-[11px] text-gray-600">
              Press <kbd className="px-1 py-0.5 text-[10px] bg-gray-800 border border-gray-700 rounded text-gray-500 font-medium">Enter</kbd> to capture
              {' '}&middot;{' '}
              <kbd className="px-1 py-0.5 text-[10px] bg-gray-800 border border-gray-700 rounded text-gray-500 font-medium">Esc</kbd> to clear
            </p>
            {captures.length > 0 && (
              <p className="text-[11px] text-gray-600">
                {captures.length} capture{captures.length !== 1 ? 's' : ''} today
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickCapture;
