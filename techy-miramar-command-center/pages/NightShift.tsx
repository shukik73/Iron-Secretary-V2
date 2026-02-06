import React, { useState, useEffect, useCallback } from 'react';
import {
  Moon,
  Plus,
  Code,
  PenTool,
  Search,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronUp,
  Trash2,
  Edit3,
  FileText,
  Eye,
  ThumbsDown,
  Wrench,
  RotateCcw,
  X,
} from 'lucide-react';
import StatCard from '../components/StatCard';

// ── Night Shift Templates ──────────────────────────────────────────────

const NIGHT_SHIFT_TEMPLATES: Record<string, Omit<NightShiftTask, 'id' | 'status' | 'started_at' | 'completed_at' | 'duration_minutes' | 'output_text' | 'output_files' | 'ai_notes' | 'error_message' | 'reviewed_at' | 'review_status' | 'review_notes' | 'redo_queued' | 'created_at' | 'updated_at' | 'schedule_date'>> = {
  weekly_audit: {
    task_type: 'audit',
    title: 'Weekly site audit for techymiramar.com',
    prompt: `Run full site audit for techymiramar.com:
- Lighthouse audit (performance, accessibility, SEO scores)
- Check all links for 404s
- Submit contact form with test data, verify email received
- Screenshot homepage + top 3 pages
- Compare screenshots to last week (flag visual changes)`,
    output_path: '/audits/weekly/YYYY-MM-DD.md',
    restrictions: 'Do NOT modify any live code, push changes, or update dependencies.',
    priority: 'high',
    scope: '',
    git_branch: '',
  },
  blog_posts: {
    task_type: 'content',
    title: 'Write SEO blog posts',
    prompt: `Write blog posts for techymiramar.com:

Topics:
• [TOPIC 1]
• [TOPIC 2]

Rules:
- 800-1200 words each
- Include Miramar, Broward County, and South Florida references naturally
- Mention nearby landmarks (Miramar Town Center, Pembroke Lakes Mall) where relevant
- Natural conversational tone — not AI-sounding
- Include a clear call-to-action at the end
- SEO: use target keyword in title, first paragraph, and 2-3 subheadings`,
    output_path: '/content/blog/drafts/',
    restrictions: 'Do NOT publish directly. Save as drafts for review.',
    priority: 'high',
    scope: '',
    git_branch: '',
  },
  review_responses: {
    task_type: 'content',
    title: 'Draft ReviewGuard responses',
    prompt: `Draft responses for all pending Google reviews:

Response rules:
- Positive reviews: Thank by name, mention device + location naturally
- Negative reviews: Acknowledge, don't argue, offer to make it right
- Always vary phrasing — never sound templated
- Include device type AND city naturally for SEO
- Keep under 3 sentences`,
    output_path: 'reviewguard_reviews.response_draft',
    restrictions: 'Draft only — do NOT send responses. Queue for approval.',
    priority: 'high',
    scope: '',
    git_branch: '',
  },
  competitor_research: {
    task_type: 'research',
    title: 'Competitor analysis',
    prompt: `Research competitor/topic:

Analyze:
- Pricing for common repairs (screen, battery, charging port)
- Google review count and average rating
- Service area coverage
- Website quality and SEO signals
- Unique selling propositions

Output: Structured comparison table + actionable insights for Techy Miramar`,
    output_path: '/research/',
    restrictions: '',
    priority: 'medium',
    scope: '',
    git_branch: '',
  },
  service_area_pages: {
    task_type: 'content',
    title: 'Draft service area landing pages',
    prompt: `Create SEO landing pages for service areas:

Pages needed:
• /laptop-repair-miramar
• /computer-repair-pembroke-pines
• /phone-repair-hollywood-fl

Rules:
- Each page MUST have unique content (not city-name swaps)
- Include real driving directions from that city to the shop
- Reference hyper-local landmarks (malls, major streets, zip codes)
- Include Google Maps embed placeholder
- Target keyword in title, H1, first paragraph, 2-3 H2s
- 600-800 words per page`,
    output_path: '/content/pages/drafts/',
    restrictions: 'Do NOT publish. Save for review.',
    priority: 'medium',
    scope: '',
    git_branch: '',
  },
  emilio_pitch_refinement: {
    task_type: 'research',
    title: 'Analyze Emilio email performance',
    prompt: `Analyze cold email performance data:

Pull from emilio_metrics and emilio_emails tables:
- Which subject lines got highest open rates?
- Which email body variants got replies?
- What time of day/day of week performs best?
- Any patterns in bounced/spam-reported emails?

Output:
- Top 3 performing subject lines
- Recommended changes to underperforming sequences
- A/B test suggestions for next week`,
    output_path: '/research/emilio-analysis/',
    restrictions: '',
    priority: 'high',
    scope: '',
    git_branch: '',
  },
};

// ── Types ───────────────────────────────────────────────────────────────

interface NightShiftTask {
  id: string;
  task_type: string;
  title: string;
  prompt: string;
  scope: string;
  output_path: string;
  git_branch: string;
  restrictions: string;
  priority: 'high' | 'medium' | 'low';
  schedule_date: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  duration_minutes: number | null;
  output_text: string | null;
  output_files: { path: string; size: string; description: string }[];
  ai_notes: string | null;
  error_message: string | null;
  reviewed_at: string | null;
  review_status: string | null;
  review_notes: string | null;
  redo_queued: boolean;
  created_at: string;
  updated_at: string;
}

// ── Mock Data ───────────────────────────────────────────────────────────

const initialQueue: NightShiftTask[] = [
  {
    id: 'ns-1',
    task_type: 'content',
    title: 'Write 2 SEO blog posts',
    prompt: 'Topics:\n• "How Much Does MacBook Battery Replacement Cost in 2026?"\n• "iPhone Screen Repair vs Replace: What You Need to Know"\n\nRules:\n• 800-1200 words each\n• Include Miramar/Broward County references\n• Natural tone, not AI-sounding\n• Output to /content/blog/drafts/',
    scope: '',
    output_path: '/content/blog/drafts/',
    git_branch: '',
    restrictions: 'Do NOT publish directly. Save as drafts for review.',
    priority: 'high',
    schedule_date: '2026-02-06',
    status: 'queued',
    started_at: null,
    completed_at: null,
    duration_minutes: null,
    output_text: null,
    output_files: [],
    ai_notes: null,
    error_message: null,
    reviewed_at: null,
    review_status: null,
    review_notes: null,
    redo_queued: false,
    created_at: '2026-02-06T14:00:00Z',
    updated_at: '2026-02-06T14:00:00Z',
  },
  {
    id: 'ns-2',
    task_type: 'audit',
    title: 'Weekly site audit for techymiramar.com',
    prompt: 'Run full site audit:\n• Lighthouse audit (perf, a11y, SEO)\n• Check all links for 404s\n• Submit test contact form, verify email\n• Screenshot homepage + top 3 pages\n• Compare to last week\'s screenshots',
    scope: '',
    output_path: '/audits/weekly/2026-02-06.md',
    git_branch: '',
    restrictions: 'Do NOT modify live code, push changes, or update dependencies.',
    priority: 'medium',
    schedule_date: '2026-02-06',
    status: 'queued',
    started_at: null,
    completed_at: null,
    duration_minutes: null,
    output_text: null,
    output_files: [],
    ai_notes: null,
    error_message: null,
    reviewed_at: null,
    review_status: null,
    review_notes: null,
    redo_queued: false,
    created_at: '2026-02-06T14:05:00Z',
    updated_at: '2026-02-06T14:05:00Z',
  },
];

const mockCompleted: NightShiftTask[] = [
  {
    id: 'ns-c1',
    task_type: 'content',
    title: 'Write 2 SEO blog posts',
    prompt: '',
    scope: '',
    output_path: '/content/blog/drafts/',
    git_branch: '',
    restrictions: '',
    priority: 'high',
    schedule_date: '2026-02-05',
    status: 'completed',
    started_at: '2026-02-06T02:13:00Z',
    completed_at: '2026-02-06T02:47:00Z',
    duration_minutes: 34,
    output_text: 'Completed 2 blog posts with local SEO optimization.',
    output_files: [
      { path: 'macbook-battery-cost-2026.md', size: '1,047 words', description: 'MacBook battery replacement cost guide' },
      { path: 'iphone-screen-repair-vs-replace.md', size: '923 words', description: 'iPhone screen repair decision guide' },
    ],
    ai_notes: 'Included Miramar Parkway and Pembroke Lakes Mall references. Second post mentions Broward County 4 times naturally.',
    error_message: null,
    reviewed_at: null,
    review_status: null,
    review_notes: null,
    redo_queued: false,
    created_at: '2026-02-05T22:00:00Z',
    updated_at: '2026-02-06T02:47:00Z',
  },
  {
    id: 'ns-c2',
    task_type: 'audit',
    title: 'Weekly site audit for techymiramar.com',
    prompt: '',
    scope: '',
    output_path: '/audits/weekly/2026-02-06.md',
    git_branch: '',
    restrictions: '',
    priority: 'medium',
    schedule_date: '2026-02-05',
    status: 'completed',
    started_at: '2026-02-06T02:54:00Z',
    completed_at: '2026-02-06T03:12:00Z',
    duration_minutes: 18,
    output_text: '1 Critical issue, 2 Warnings, 8 Passed checks.',
    output_files: [
      { path: '/audits/weekly/2026-02-06.md', size: '3.2 KB', description: 'Full audit report' },
    ],
    ai_notes: 'Contact form email not received within 5 min window. Image lazy-load issue on /services page. LCP at 3.8s on mobile.',
    error_message: null,
    reviewed_at: null,
    review_status: null,
    review_notes: null,
    redo_queued: false,
    created_at: '2026-02-05T22:05:00Z',
    updated_at: '2026-02-06T03:12:00Z',
  },
];

const mockHistory = [
  { id: 'h1', date: 'Feb 5', status: 'completed', type: 'Content', title: '3 Google review responses' },
  { id: 'h2', date: 'Feb 4', status: 'completed', type: 'Research', title: 'Competitor pricing analysis' },
  { id: 'h3', date: 'Feb 3', status: 'completed', type: 'Audit', title: 'Weekly site audit' },
  { id: 'h4', date: 'Feb 2', status: 'failed', type: 'Code', title: 'Optimize image loading', error: 'Exceeded scope — needs config change' },
  { id: 'h5', date: 'Feb 1', status: 'completed', type: 'Content', title: 'Service area page drafts' },
];

// ── Helper: capitalize first letter ─────────────────────────────────────

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ── Helper Components ───────────────────────────────────────────────────

const typeConfig: Record<string, { icon: typeof Code; color: string; label: string }> = {
  code: { icon: Code, color: 'text-blue-400 bg-blue-400/10', label: 'Code' },
  content: { icon: PenTool, color: 'text-emerald-400 bg-emerald-400/10', label: 'Content' },
  research: { icon: Search, color: 'text-amber-400 bg-amber-400/10', label: 'Research' },
  audit: { icon: Shield, color: 'text-purple-400 bg-purple-400/10', label: 'Audit' },
};

const TaskTypeIcon: React.FC<{ type: string; size?: 'sm' | 'lg' }> = ({ type, size = 'sm' }) => {
  const config = typeConfig[type] || typeConfig.code;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${config.color}`}>
      <Icon size={size === 'lg' ? 16 : 12} />
      {config.label}
    </span>
  );
};

// ── Assignment Modal ────────────────────────────────────────────────────

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (task: NightShiftTask) => void;
  initialType?: string;
  initialTemplate?: string;
}

const AssignmentModal: React.FC<AssignmentModalProps> = ({ isOpen, onClose, onAdd, initialType, initialTemplate }) => {
  const template = initialTemplate ? NIGHT_SHIFT_TEMPLATES[initialTemplate] : null;
  const [taskType, setTaskType] = useState(template?.task_type || initialType || 'content');
  const [title, setTitle] = useState(template?.title || '');
  const [prompt, setPrompt] = useState(template?.prompt || '');
  const [outputPath, setOutputPath] = useState(template?.output_path || '');
  const [scope, setScope] = useState(template?.scope || '');
  const [gitBranch, setGitBranch] = useState(template?.git_branch || '');
  const [restrictions, setRestrictions] = useState(template?.restrictions || '');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>(template?.priority || 'high');
  const [schedule, setSchedule] = useState<'tonight' | 'tomorrow' | 'pick'>('tonight');

  // Fix #2: Reset form state when the modal reopens or props change
  useEffect(() => {
    const tpl = initialTemplate ? NIGHT_SHIFT_TEMPLATES[initialTemplate] : null;
    setTaskType(tpl?.task_type || initialType || 'content');
    setTitle(tpl?.title || '');
    setPrompt(tpl?.prompt || '');
    setOutputPath(tpl?.output_path || '');
    setScope(tpl?.scope || '');
    setGitBranch(tpl?.git_branch || '');
    setRestrictions(tpl?.restrictions || '');
    setPriority(tpl?.priority || 'high');
    setSchedule('tonight');
  }, [isOpen, initialTemplate, initialType]);

  // Fix #3: Escape key closes modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fix #5: Validation — title and prompt are required
  const isTitleEmpty = !title.trim();
  const isPromptEmpty = !prompt.trim();
  const isValid = !isTitleEmpty && !isPromptEmpty;

  // Fix #1: Wire up "Add to Queue" — build a task object and call onAdd
  const handleSubmit = useCallback(() => {
    if (!isValid) return;
    const now = new Date().toISOString();
    let scheduleDate: string;
    if (schedule === 'tomorrow') {
      const tomorrow = new Date(Date.now() + 86_400_000);
      scheduleDate = tomorrow.toISOString().split('T')[0];
    } else {
      scheduleDate = new Date().toISOString().split('T')[0];
    }

    const newTask: NightShiftTask = {
      id: `ns-${Date.now()}`,
      task_type: taskType,
      title: title.trim(),
      prompt: prompt.trim(),
      scope: scope.trim(),
      output_path: outputPath.trim(),
      git_branch: gitBranch.trim(),
      restrictions: restrictions.trim(),
      priority,
      schedule_date: scheduleDate,
      status: 'queued',
      started_at: null,
      completed_at: null,
      duration_minutes: null,
      output_text: null,
      output_files: [],
      ai_notes: null,
      error_message: null,
      reviewed_at: null,
      review_status: null,
      review_notes: null,
      redo_queued: false,
      created_at: now,
      updated_at: now,
    };
    onAdd(newTask);
    onClose();
  }, [isValid, schedule, taskType, title, prompt, scope, outputPath, gitBranch, restrictions, priority, onAdd, onClose]);

  if (!isOpen) return null;

  const typeButtons: { key: string; icon: typeof Code; label: string }[] = [
    { key: 'code', icon: Code, label: 'Code' },
    { key: 'content', icon: PenTool, label: 'Content' },
    { key: 'research', icon: Search, label: 'Research' },
    { key: 'audit', icon: Shield, label: 'Audit' },
  ];

  const priorityButtons: { key: 'high' | 'medium' | 'low'; label: string }[] = [
    { key: 'high', label: 'High - Run First' },
    { key: 'medium', label: 'Medium' },
    { key: 'low', label: 'Low - Run Last' },
  ];

  return (
    // Fix #4: Backdrop click closes modal
    // Fix #6: aria-modal and role="dialog"
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="glass-panel rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">New Night Shift Assignment</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Type selector */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Type</label>
          <div className="flex gap-2">
            {typeButtons.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setTaskType(t.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    taskType === t.key
                      ? 'bg-white/10 text-white ring-1 ring-white/20'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon size={16} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Title — Fix #5: required + maxLength */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Title <span className="text-rose-400">*</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className={`w-full bg-black/30 border rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 ${
              isTitleEmpty && title !== '' ? 'border-rose-500/50' : 'border-white/10'
            }`}
            placeholder="e.g., Write 2 SEO blog posts"
          />
        </div>

        {/* Prompt / Details — Fix #5: required + maxLength */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Assignment Details <span className="text-rose-400">*</span>
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={5000}
            rows={6}
            className={`w-full bg-black/30 border rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-y ${
              isPromptEmpty && prompt !== '' ? 'border-rose-500/50' : 'border-white/10'
            }`}
            placeholder="Write the full prompt/instructions for Claude here..."
          />
        </div>

        {/* Scope & Output */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Scope (files/modules allowed)</label>
            <input
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              maxLength={500}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50"
              placeholder="e.g., /content/, /pages/"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Output Path</label>
            <input
              value={outputPath}
              onChange={(e) => setOutputPath(e.target.value)}
              maxLength={500}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50"
              placeholder="e.g., /content/blog/drafts/"
            />
          </div>
        </div>

        {/* Git branch (code tasks) */}
        {taskType === 'code' && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Git Branch</label>
            <input
              value={gitBranch}
              onChange={(e) => setGitBranch(e.target.value)}
              maxLength={200}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50"
              placeholder="feature/..."
            />
          </div>
        )}

        {/* Restrictions */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Restrictions (DO NOT)</label>
          <textarea
            value={restrictions}
            onChange={(e) => setRestrictions(e.target.value)}
            maxLength={2000}
            rows={2}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-y"
            placeholder='e.g., "Do not modify auth, do not push to main"'
          />
        </div>

        {/* Priority — Fix #7: string-based priority */}
        <div className="flex gap-6 mb-5">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Priority</label>
            <div className="flex gap-2">
              {priorityButtons.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPriority(p.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    priority === p.key
                      ? 'bg-white/10 text-white ring-1 ring-white/20'
                      : 'text-gray-400 hover:bg-white/5'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Schedule</label>
            <div className="flex gap-2">
              {[
                { key: 'tonight' as const, label: 'Tonight' },
                { key: 'tomorrow' as const, label: 'Tomorrow' },
                { key: 'pick' as const, label: 'Pick Date' },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSchedule(s.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    schedule === s.key
                      ? 'bg-white/10 text-white ring-1 ring-white/20'
                      : 'text-gray-400 hover:bg-white/5'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions — Fix #1: submit handler with validation */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
          <button onClick={onClose} className="px-6 py-2.5 text-gray-400 hover:text-white text-sm font-medium transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className={`px-6 py-2.5 text-white text-sm font-semibold rounded-lg transition-colors shadow-lg shadow-purple-500/20 ${
              isValid
                ? 'bg-purple-600 hover:bg-purple-500'
                : 'bg-purple-600/40 cursor-not-allowed'
            }`}
          >
            Add to Queue
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────────────────

const NightShift: React.FC = () => {
  const [queue, setQueue] = useState<NightShiftTask[]>(initialQueue);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTemplate, setModalTemplate] = useState<string | undefined>();
  const [modalType, setModalType] = useState<string | undefined>();

  const handleAddTask = useCallback((task: NightShiftTask) => {
    setQueue((prev) => [...prev, task]);
  }, []);

  const openFromTemplate = (templateKey: string) => {
    setModalTemplate(templateKey);
    setModalType(undefined);
    setModalOpen(true);
  };

  const openFromType = (type: string) => {
    setModalTemplate(undefined);
    setModalType(type);
    setModalOpen(true);
  };

  const openBlank = () => {
    setModalTemplate(undefined);
    setModalType(undefined);
    setModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end border-b border-gray-800/50 pb-6">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2 flex items-center gap-3">
            <Moon className="w-9 h-9 text-purple-400" />
            Night Shift
          </h1>
          <p className="text-gray-400">Queue assignments for Claude to work on overnight</p>
        </div>
        <button
          onClick={openBlank}
          className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center shadow-lg shadow-purple-500/20 mt-4 md:mt-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Assignment
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Queued Tonight" value="2" icon={Clock} color="purple" />
        <StatCard title="Completed" value="12" icon={CheckCircle2} color="emerald" trend="up" trendValue="+3 this week" />
        <StatCard title="Failed" value="1" icon={XCircle} color="rose" subValue="last 7 days" />
        <StatCard title="Pending Review" value="2" icon={Eye} color="amber" subValue="from last night" />
      </div>

      {/* Template Quick Buttons */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Templates</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { key: 'code', icon: Code, label: 'Code', onClick: () => openFromType('code') },
            { key: 'content', icon: PenTool, label: 'Content', onClick: () => openFromType('content') },
            { key: 'research', icon: Search, label: 'Research', onClick: () => openFromType('research') },
            { key: 'audit', icon: Shield, label: 'Audit', onClick: () => openFromType('audit') },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={t.onClick}
                className="glass-card px-5 py-3 rounded-xl flex flex-col items-center gap-2 hover:bg-white/10 transition-all border border-white/5 hover:border-purple-500/30 min-w-[80px]"
              >
                <Icon size={20} className="text-gray-300" />
                <span className="text-xs font-medium text-gray-400">{t.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Tonight's Queue */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Tonight's Queue</h2>
          <span className="text-sm text-gray-500">{queue.length} tasks</span>
        </div>
        <div className="space-y-4">
          {queue.map((task, idx) => (
            <div key={task.id} className="glass-card rounded-2xl p-6 border border-white/5 hover:border-purple-500/20 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-500">{idx + 1}.</span>
                  <TaskTypeIcon type={task.task_type} size="lg" />
                  <span className="text-xs text-gray-500">Priority: {capitalize(task.priority)}</span>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">"{task.title}"</h3>
              {/* Fix #8: overflow-wrap: break-word on pre */}
              <pre className="text-sm text-gray-400 whitespace-pre-wrap font-sans mb-4 leading-relaxed" style={{ overflowWrap: 'break-word' }}>{task.prompt}</pre>
              {task.restrictions && (
                <div className="flex items-start gap-2 text-xs text-amber-400/80 bg-amber-400/5 px-3 py-2 rounded-lg mb-4">
                  <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                  <span>{task.restrictions}</span>
                </div>
              )}
              {task.output_path && (
                <p className="text-xs text-gray-500 mb-4">Output: <code className="text-gray-400">{task.output_path}</code></p>
              )}
              <div className="flex gap-2">
                <button className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1">
                  <Edit3 size={12} /> Edit
                </button>
                <button className="text-xs text-gray-400 hover:text-rose-400 px-3 py-1.5 rounded-lg hover:bg-rose-500/5 transition-colors flex items-center gap-1">
                  <Trash2 size={12} /> Remove
                </button>
                {idx > 0 && (
                  <button className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1">
                    <ChevronUp size={12} /> Move Up
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Morning Review */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Morning Review — Last Night's Results</h2>
          <span className="text-sm text-gray-500">Feb 6, 2026</span>
        </div>
        <div className="space-y-4">
          {mockCompleted.map((task) => {
            const hasCritical = task.ai_notes?.toLowerCase().includes('not received') || task.output_text?.includes('Critical');
            return (
              <div
                key={task.id}
                className={`glass-card rounded-2xl p-6 border-l-4 ${
                  hasCritical ? 'border-amber-500' : 'border-emerald-500'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle2 className="text-emerald-400" size={20} />
                  <span className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Completed</span>
                  <span className="text-gray-500 text-sm">— "{task.title}"</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    Finished: {task.completed_at ? new Date(task.completed_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'}
                  </span>
                  <span>Duration: {task.duration_minutes} min</span>
                </div>

                {/* Output files */}
                {task.output_files.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Deliverables</p>
                    <div className="space-y-1">
                      {task.output_files.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                          <FileText size={14} className="text-gray-500" />
                          <span>{f.path}</span>
                          <span className="text-gray-500">({f.size})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Notes */}
                {task.ai_notes && (
                  <div className="bg-black/20 border border-white/5 rounded-lg p-3 mb-4">
                    <p className="text-xs font-semibold text-purple-400 mb-1">AI Notes</p>
                    <p className="text-sm text-gray-300">{task.ai_notes}</p>
                  </div>
                )}

                {/* Result summary for audits */}
                {task.task_type === 'audit' && task.output_text && (
                  <div className="flex gap-3 mb-4 text-sm">
                    {task.output_text.includes('Critical') && (
                      <span className="text-rose-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        1 Critical
                      </span>
                    )}
                    <span className="text-amber-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      2 Warnings
                    </span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      8 Passed
                    </span>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  {task.task_type === 'content' && (
                    <>
                      <button className="text-xs bg-white/5 hover:bg-white/10 text-gray-300 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                        <Eye size={12} /> Read Posts
                      </button>
                      <button className="text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                        <CheckCircle2 size={12} /> Approve & Publish
                      </button>
                      <button className="text-xs bg-white/5 hover:bg-white/10 text-gray-300 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                        <Edit3 size={12} /> Edit
                      </button>
                      <button className="text-xs bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                        <ThumbsDown size={12} /> Reject + Redo Tonight
                      </button>
                    </>
                  )}
                  {task.task_type === 'audit' && (
                    <>
                      <button className="text-xs bg-white/5 hover:bg-white/10 text-gray-300 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                        <FileText size={12} /> Full Report
                      </button>
                      <button className="text-xs bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                        <Wrench size={12} /> Create Fix Task
                      </button>
                      <button className="text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                        <CheckCircle2 size={12} /> Mark Reviewed
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* History */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">History</h2>
          <div className="flex gap-2">
            <button className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
              Filter
            </button>
            <button className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
              Search
            </button>
          </div>
        </div>
        <div className="glass-card rounded-2xl overflow-hidden">
          {mockHistory.map((item, idx) => (
            <div
              key={item.id}
              className={`flex items-center px-6 py-4 hover:bg-white/5 transition-colors ${
                idx < mockHistory.length - 1 ? 'border-b border-white/5' : ''
              }`}
            >
              <span className="text-sm text-gray-500 w-16 flex-shrink-0">{item.date}</span>
              {item.status === 'completed' ? (
                <CheckCircle2 size={16} className="text-emerald-400 mr-3 flex-shrink-0" />
              ) : (
                <XCircle size={16} className="text-rose-400 mr-3 flex-shrink-0" />
              )}
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider w-20 flex-shrink-0">{item.type}</span>
              <span className="text-sm text-gray-300 flex-1">{item.title}</span>
              {item.error && (
                <span className="text-xs text-rose-400 mr-3">{item.error}</span>
              )}
              <button className="text-xs text-gray-500 hover:text-white transition-colors">View</button>
            </div>
          ))}
        </div>
        <div className="text-center mt-4">
          <button className="text-sm text-gray-500 hover:text-white transition-colors">Load More</button>
        </div>
      </section>

      {/* Modal */}
      <AssignmentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={handleAddTask}
        initialType={modalType}
        initialTemplate={modalTemplate}
      />
    </div>
  );
};

export default NightShift;
