import React, { useState, useEffect } from 'react';
import {
  Bot,
  User,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Circle,
  Loader,
  ChevronDown,
  FileText,
  X,
} from 'lucide-react';
import StatCard from '../components/StatCard';

// ── Types ───────────────────────────────────────────────────────────────

interface WorkspaceTask {
  id: string;
  title: string;
  description: string;
  assigned_to: 'you' | 'ai';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'done' | 'failed';
  task_type: string;
  output_text: string | null;
  output_path: string | null;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface ActivityEntry {
  id: string;
  actor: 'you' | 'ai';
  action: string;
  details: string;
  created_at: string;
}

// ── Quick Assign Templates ──────────────────────────────────────────────

const QUICK_TEMPLATES = [
  { label: 'Draft a blog post about...', task_type: 'blog_post', placeholder: 'Enter topic...' },
  { label: 'Research a topic...', task_type: 'research', placeholder: 'Enter topic to research...' },
  { label: 'Write email reply to...', task_type: 'email_reply', placeholder: 'Enter lead name...' },
  { label: 'Analyze this week\'s metrics', task_type: 'analysis', placeholder: '' },
  { label: 'Create social media post for...', task_type: 'social_media', placeholder: 'Enter topic...' },
  { label: 'Draft review response for...', task_type: 'review_response', placeholder: 'Enter review details...' },
];

// ── Mock Data ───────────────────────────────────────────────────────────

const initialMyTasks: WorkspaceTask[] = [
  {
    id: 'wt-1',
    title: "Reply to Mike's Phone Fix email",
    description: 'Customer waiting on screen replacement quote',
    assigned_to: 'you',
    priority: 'high',
    status: 'pending',
    task_type: 'custom',
    output_text: null,
    output_path: null,
    due_date: 'Today',
    started_at: null,
    completed_at: null,
    created_at: '2026-02-06T09:00:00Z',
  },
  {
    id: 'wt-2',
    title: 'Update Google Business Profile photos',
    description: 'Add new shop interior photos from renovation',
    assigned_to: 'you',
    priority: 'medium',
    status: 'pending',
    task_type: 'custom',
    output_text: null,
    output_path: null,
    due_date: 'This week',
    started_at: null,
    completed_at: null,
    created_at: '2026-02-06T09:05:00Z',
  },
  {
    id: 'wt-3',
    title: 'Call supplier about MacBook screens',
    description: 'Check pricing on bulk 13" and 15" Retina displays',
    assigned_to: 'you',
    priority: 'low',
    status: 'pending',
    task_type: 'custom',
    output_text: null,
    output_path: null,
    due_date: 'This week',
    started_at: null,
    completed_at: null,
    created_at: '2026-02-06T09:10:00Z',
  },
];

const initialAITasks: WorkspaceTask[] = [
  {
    id: 'wt-ai-1',
    title: 'Drafting blog post: "MacBook Battery Cost in 2025"',
    description: 'SEO-optimized blog post targeting local search traffic',
    assigned_to: 'ai',
    priority: 'medium',
    status: 'in_progress',
    task_type: 'blog_post',
    output_text: null,
    output_path: null,
    due_date: null,
    started_at: '2026-02-06T14:15:00Z',
    completed_at: null,
    created_at: '2026-02-06T14:10:00Z',
  },
];

const initialDoneTasks: WorkspaceTask[] = [
  {
    id: 'wt-d1',
    title: 'Research competitor pricing',
    description: 'Analysis of QuickFix Tampa, iFixit Miami, and UBreakiFix pricing',
    assigned_to: 'ai',
    priority: 'medium',
    status: 'done',
    task_type: 'research',
    output_text: 'Completed pricing comparison across 3 competitors.',
    output_path: '/research/competitor-pricing-feb.md',
    due_date: null,
    started_at: '2026-02-06T13:30:00Z',
    completed_at: '2026-02-06T13:45:00Z',
    created_at: '2026-02-06T13:25:00Z',
  },
  {
    id: 'wt-d2',
    title: 'Weekly site audit',
    description: 'Full Lighthouse + link check + form test',
    assigned_to: 'ai',
    priority: 'high',
    status: 'done',
    task_type: 'analysis',
    output_text: '1 Critical, 3 Warnings, 5 Passed',
    output_path: null,
    due_date: null,
    started_at: '2026-02-06T11:00:00Z',
    completed_at: '2026-02-06T11:18:00Z',
    created_at: '2026-02-06T10:55:00Z',
  },
  {
    id: 'wt-d3',
    title: 'Respond to QuickFix Tampa inquiry',
    description: 'Draft partnership response email',
    assigned_to: 'you',
    priority: 'high',
    status: 'done',
    task_type: 'custom',
    output_text: null,
    output_path: null,
    due_date: null,
    started_at: null,
    completed_at: '2026-02-06T13:30:00Z',
    created_at: '2026-02-06T12:00:00Z',
  },
];

const mockActivity: ActivityEntry[] = [
  { id: 'a1', actor: 'ai', action: 'started', details: 'Claude started "Draft blog post"', created_at: '2026-02-06T14:15:00Z' },
  { id: 'a2', actor: 'you', action: 'assigned', details: 'You assigned "Draft blog post" to Claude', created_at: '2026-02-06T14:10:00Z' },
  { id: 'a3', actor: 'ai', action: 'completed', details: 'Claude completed "Research competitor pricing" — Output: /research/competitor-pricing-feb.md', created_at: '2026-02-06T13:45:00Z' },
  { id: 'a4', actor: 'you', action: 'completed', details: 'You completed "Respond to QuickFix Tampa"', created_at: '2026-02-06T13:30:00Z' },
  { id: 'a5', actor: 'ai', action: 'completed', details: 'Claude completed "Weekly site audit" — 1 Critical, 3 Warnings, 5 Passed', created_at: '2026-02-06T11:18:00Z' },
];

// ── Helper Components ───────────────────────────────────────────────────

const priorityColor: Record<string, string> = {
  critical: 'text-rose-400 bg-rose-400/10',
  high: 'text-amber-400 bg-amber-400/10',
  medium: 'text-blue-400 bg-blue-400/10',
  low: 'text-gray-400 bg-gray-400/10',
};

const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'pending':
      return <Circle size={16} className="text-gray-500" />;
    case 'in_progress':
      return <Loader size={16} className="text-blue-400 animate-spin" />;
    case 'done':
      return <CheckCircle2 size={16} className="text-emerald-400" />;
    case 'failed':
      return <XCircle size={16} className="text-rose-400" />;
    default:
      return <Circle size={16} className="text-gray-500" />;
  }
};

// ── Task Card ───────────────────────────────────────────────────────────

const TaskCard: React.FC<{ task: WorkspaceTask }> = ({ task }) => (
  <div className="glass-card rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors group">
    <div className="flex items-start gap-3">
      <StatusIcon status={task.status} />
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-white leading-tight">{task.title}</h4>
        {task.description && (
          <p className="text-xs text-gray-500 mt-1 truncate">{task.description}</p>
        )}
        <div className="flex items-center gap-3 mt-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${priorityColor[task.priority]}`}>
            {task.priority}
          </span>
          {task.due_date && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock size={10} />
              {task.due_date}
            </span>
          )}
          {task.status === 'in_progress' && task.started_at && (
            <span className="text-xs text-blue-400">
              Started: {new Date(task.started_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
        </div>
        {task.output_path && (
          <div className="flex items-center gap-1 mt-2 text-xs text-purple-400">
            <FileText size={10} />
            <span>{task.output_path}</span>
          </div>
        )}
      </div>
    </div>
  </div>
);

// ── New Task Modal ──────────────────────────────────────────────────────

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: WorkspaceTask) => void;
}

const NewTaskModal: React.FC<NewTaskModalProps> = ({ isOpen, onClose, onAddTask }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState<'you' | 'ai'>('ai');
  const [priority, setPriority] = useState<'medium' | 'critical' | 'high' | 'low'>('medium');
  const [showTemplates, setShowTemplates] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isTitleEmpty = title.trim().length === 0;

  const handleCreate = () => {
    if (isTitleEmpty) return;
    const newTask: WorkspaceTask = {
      id: `wt-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      assigned_to: assignedTo,
      priority,
      status: assignedTo === 'ai' ? 'in_progress' : 'pending',
      task_type: 'custom',
      output_text: null,
      output_path: null,
      due_date: null,
      started_at: assignedTo === 'ai' ? new Date().toISOString() : null,
      completed_at: null,
      created_at: new Date().toISOString(),
    };
    onAddTask(newTask);
    setTitle('');
    setDescription('');
    setAssignedTo('ai');
    setPriority('medium');
    setShowTemplates(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="glass-panel rounded-2xl w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Add Shared Task</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Quick Templates Dropdown */}
        <div className="mb-4">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 mb-2"
            aria-label="Toggle quick templates"
          >
            <ChevronDown size={12} className={`transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
            Quick templates
          </button>
          {showTemplates && (
            <div className="grid grid-cols-1 gap-1 mb-3 bg-black/20 rounded-lg p-2 border border-white/5">
              {QUICK_TEMPLATES.map((t, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setTitle(t.label);
                    setAssignedTo('ai');
                    setShowTemplates(false);
                  }}
                  className="text-left text-sm text-gray-300 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Assigned to */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Assign to</label>
          <div className="flex gap-2">
            <button
              onClick={() => setAssignedTo('you')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                assignedTo === 'you' ? 'bg-white/10 text-white ring-1 ring-white/20' : 'text-gray-400 hover:bg-white/5'
              }`}
            >
              <User size={16} /> You
            </button>
            <button
              onClick={() => setAssignedTo('ai')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                assignedTo === 'ai' ? 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/30' : 'text-gray-400 hover:bg-white/5'
              }`}
            >
              <Bot size={16} /> Claude
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50"
            placeholder="What needs to be done?"
          />
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={3}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-y"
            placeholder="Add details, context, or instructions..."
          />
        </div>

        {/* Priority */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Priority</label>
          <div className="flex gap-2">
            {(['critical', 'high', 'medium', 'low'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  priority === p ? priorityColor[p] + ' ring-1 ring-white/10' : 'text-gray-500 hover:bg-white/5'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
          <button onClick={onClose} className="px-6 py-2.5 text-gray-400 hover:text-white text-sm font-medium transition-colors">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isTitleEmpty}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
          >
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────────────────

const AIWorkspace: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [myTasks, setMyTasks] = useState<WorkspaceTask[]>(initialMyTasks);
  const [aiTasks, setAiTasks] = useState<WorkspaceTask[]>(initialAITasks);
  const [doneTasks, setDoneTasks] = useState<WorkspaceTask[]>(initialDoneTasks);

  const handleAddTask = (task: WorkspaceTask) => {
    if (task.assigned_to === 'you') {
      setMyTasks((prev) => [...prev, task]);
    } else {
      setAiTasks((prev) => [...prev, task]);
    }
  };

  const pendingCount = myTasks.filter(t => t.status === 'pending').length + aiTasks.filter(t => t.status === 'pending').length;
  const inProgressCount = aiTasks.filter(t => t.status === 'in_progress').length + myTasks.filter(t => t.status === 'in_progress').length;
  const doneCount = doneTasks.length;
  const failedCount = [...myTasks, ...aiTasks, ...doneTasks].filter(t => t.status === 'failed').length;

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end border-b border-gray-800/50 pb-6">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2 flex items-center gap-3">
            <Bot className="w-9 h-9 text-blue-400" />
            AI Workspace
          </h1>
          <p className="text-gray-400">Shared task board between you and your AI assistant</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-white text-black px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors flex items-center shadow-[0_0_15px_rgba(255,255,255,0.1)] mt-4 md:mt-0"
          aria-label="Add a shared task"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add a shared task
        </button>
      </div>

      {/* Status Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 border border-white/5 flex items-center gap-3">
          <Circle size={18} className="text-gray-500" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Pending</p>
            <p className="text-2xl font-bold text-white">{pendingCount}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-blue-500/20 flex items-center gap-3">
          <Loader size={18} className="text-blue-400" />
          <div>
            <p className="text-xs text-blue-400 uppercase tracking-wider font-semibold">In Progress</p>
            <p className="text-2xl font-bold text-white">{inProgressCount}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-emerald-500/20 flex items-center gap-3">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <div>
            <p className="text-xs text-emerald-400 uppercase tracking-wider font-semibold">Done Today</p>
            <p className="text-2xl font-bold text-white">{doneCount}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5 flex items-center gap-3">
          <XCircle size={18} className="text-rose-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Failed</p>
            <p className="text-2xl font-bold text-white">{failedCount}</p>
          </div>
        </div>
      </div>

      {/* Two Column Task Board */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* My Tasks */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <User size={18} className="text-gray-400" />
            <h2 className="text-lg font-semibold text-white">My Tasks</h2>
            <span className="text-sm text-gray-500 ml-1">{myTasks.length}</span>
          </div>
          <div className="space-y-3">
            {myTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
            {myTasks.length === 0 && (
              <div className="glass-card rounded-xl p-6 border border-dashed border-white/10 text-center">
                <User size={24} className="text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No tasks assigned to you</p>
                <button
                  onClick={() => setModalOpen(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 mt-2"
                >
                  Add a task for yourself
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Claude's Tasks */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Bot size={18} className="text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Claude's Tasks</h2>
            <span className="text-sm text-gray-500 ml-1">{aiTasks.length}</span>
          </div>
          <div className="space-y-3">
            {aiTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
            {aiTasks.length === 0 && (
              <div className="glass-card rounded-xl p-6 border border-dashed border-white/10 text-center">
                <Bot size={24} className="text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No active AI tasks</p>
                <button
                  onClick={() => setModalOpen(true)}
                  className="text-xs text-purple-400 hover:text-purple-300 mt-2"
                >
                  Assign something to Claude
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Done Today */}
      {doneTasks.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={18} className="text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Completed Today</h2>
            <span className="text-sm text-gray-500 ml-1">{doneTasks.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {doneTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}

      {/* Activity Log */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Activity Log</h2>
        <div className="glass-card rounded-2xl overflow-hidden">
          {mockActivity.map((entry, idx) => (
            <div
              key={entry.id}
              className={`flex items-start px-6 py-4 hover:bg-white/5 transition-colors ${
                idx < mockActivity.length - 1 ? 'border-b border-white/5' : ''
              }`}
            >
              <span className="text-xs text-gray-500 w-20 flex-shrink-0 pt-0.5 font-mono">
                {new Date(entry.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </span>
              {entry.actor === 'ai' ? (
                <Bot size={16} className="text-purple-400 mr-3 mt-0.5 flex-shrink-0" />
              ) : (
                <User size={16} className="text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
              )}
              <p className="text-sm text-gray-300">{entry.details}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Modal */}
      <NewTaskModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onAddTask={handleAddTask} />
    </div>
  );
};

export default AIWorkspace;
