import React from 'react';
import { 
  CheckSquare, 
  Flag, 
  AlertTriangle, 
  ArrowRight, 
  Calendar, 
  Database, 
  Server, 
  ShieldAlert,
  Target,
  ChevronRight,
  Lock,
  Zap
} from 'lucide-react';
import { REVENUE_TARGETS, KILL_CRITERIA } from '../constants';

const phases = [
  {
    id: 1,
    name: 'Phase 1: Emilio',
    weeks: 'Weeks 1–4',
    focus: 'Cold Email & Warm-up',
    status: 'active',
    items: ['Domain Warm-up', '3-Email Drip (n8n)', 'Scale to 50/day', 'Get 5 warm replies'],
    color: 'border-blue-500 text-blue-400'
  },
  {
    id: 2,
    name: 'Phase 2: ReviewGuard',
    weeks: 'Weeks 5–8',
    focus: 'Sales & MVP',
    status: 'pending',
    items: ['Sales-Ready MVP', 'Landing Page', 'First 5 Customers', 'Stripe Integration'],
    color: 'border-purple-500 text-purple-400'
  },
  {
    id: 3,
    name: 'Phase 3: Midas + Lead Catcher',
    weeks: 'Weeks 9–16',
    focus: 'Core Revenue Boost',
    status: 'pending',
    items: ['Daily Midas Alerts', 'Digital Intake Form', 'Lifecycle Automations', 'Purchase Log'],
    color: 'border-amber-500 text-amber-400'
  },
  {
    id: 4,
    name: 'Phase 4: Iron Secretary',
    weeks: 'Q3–Q4',
    focus: 'Voice Automation',
    status: 'locked',
    items: ['Voice Pipeline', 'Supabase Tickets', 'Call Scoring', 'Dashboard v1'],
    color: 'border-gray-600 text-gray-500'
  }
];

const immediateActions = [
  { id: 1, text: "Buy cold-email domain (repairshopgrowth.com)", done: false, tag: "Today" },
  { id: 2, text: "Print QR code → Google Form for counter", done: false, tag: "Today" },
  { id: 3, text: "Configure Gmail MCP server", done: false, tag: "This Week" },
  { id: 4, text: "Build Emilio 3-email drip in n8n", done: false, tag: "This Week" },
  { id: 5, text: "Start warming domain (10 sends/day)", done: false, tag: "This Week" },
];

const risks = [
  { risk: "Emilio emails land in spam", impact: "High", mitigation: "Separate domain. Warm 2 weeks. Volume <50/day." },
  { risk: "Burnout from 5 projects", impact: "Critical", mitigation: "Sequence execution. Don't skip phases." },
  { risk: "ReviewGuard API Changes", impact: "Medium", mitigation: "Manual fallback process ready." },
];

const Plan: React.FC = () => {
  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header & Philosophy */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-800/50 pb-6">
        <div>
            <div className="flex items-center space-x-2 mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white border border-white/10">v2.2</span>
                <span className="text-gray-500 text-xs font-mono uppercase">Sequenced Execution Plan</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Master Plan 2026</h1>
            <p className="text-gray-400 mt-2 max-w-2xl text-sm leading-relaxed">
                "Ship one thing at a time. Revenue before features. Kill what doesn't work."
            </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-4">
            <div className="text-right">
                <p className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Current MRR</p>
                <p className="text-xl font-bold text-white font-mono">$13,000</p>
            </div>
            <ArrowRight className="text-gray-600" size={20} />
            <div className="text-right">
                <p className="text-[10px] uppercase text-emerald-500 font-bold tracking-wider">Target MRR</p>
                <p className="text-xl font-bold text-emerald-400 font-mono">$19,000</p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Col: Roadmap (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
            
            {/* Phase Timeline */}
            <section>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Flag className="w-4 h-4 mr-2 text-blue-400" /> 
                    Sequenced Roadmap
                </h2>
                <div className="space-y-4">
                    {phases.map((phase) => (
                        <div key={phase.id} className={`glass-card p-6 rounded-xl border-l-4 ${phase.color} ${phase.status === 'locked' ? 'opacity-50 grayscale' : ''}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center space-x-3 mb-1">
                                        <h3 className="font-bold text-white text-lg">{phase.name}</h3>
                                        {phase.status === 'active' && <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase rounded animate-pulse">In Progress</span>}
                                        {phase.status === 'locked' && <Lock size={12} className="text-gray-500" />}
                                    </div>
                                    <p className="text-sm text-gray-400 font-medium">{phase.weeks} • <span className="text-gray-300">{phase.focus}</span></p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-gray-500 uppercase tracking-wider font-bold">Progress</span>
                                    <div className="w-24 h-1.5 bg-gray-800 rounded-full mt-1">
                                        <div className={`h-1.5 rounded-full ${phase.status === 'active' ? 'bg-blue-500 w-1/4' : 'w-0'}`}></div>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {phase.items.map((item, i) => (
                                    <div key={i} className="flex items-center text-sm text-gray-400">
                                        {phase.status === 'active' ? (
                                            <div className="w-4 h-4 mr-2 border border-gray-600 rounded flex items-center justify-center hover:border-blue-500 cursor-pointer"></div>
                                        ) : (
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-700 mr-2"></div>
                                        )}
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Infrastructure Health */}
            <section>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Server className="w-4 h-4 mr-2 text-purple-400" /> 
                    Infrastructure Layer
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['Claude Code (VPS)', 'n8n (VPS)', 'Supabase', 'MCP Servers'].map((item) => (
                        <div key={item} className="glass-card p-3 rounded-lg flex items-center justify-between border-l-2 border-emerald-500">
                            <span className="text-sm font-medium text-gray-300">{item}</span>
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        </div>
                    ))}
                </div>
            </section>
        </div>

        {/* Right Col: Tactical & Risks (4 cols) */}
        <div className="lg:col-span-4 space-y-8">
            
            {/* Immediate Actions */}
            <div className="glass-card p-6 rounded-xl border-t-4 border-emerald-500">
                <h3 className="font-bold text-white mb-4 flex items-center">
                    <Target className="w-4 h-4 mr-2 text-emerald-400" />
                    Immediate Actions
                </h3>
                <div className="space-y-3">
                    {immediateActions.map((action) => (
                        <div key={action.id} className="flex items-start group cursor-pointer">
                            <div className="mt-0.5 w-4 h-4 border border-gray-600 rounded flex-shrink-0 mr-3 group-hover:border-emerald-500 transition-colors"></div>
                            <div>
                                <p className="text-sm text-gray-200 group-hover:text-white transition-colors leading-snug">{action.text}</p>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${action.tag === 'Today' ? 'text-rose-400' : 'text-gray-500'}`}>
                                    {action.tag}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
                <button className="w-full mt-6 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-xs font-medium text-gray-300 transition-colors">
                    Add Action Item
                </button>
            </div>

            {/* Revenue Bridge Visual */}
            <div className="glass-card p-6 rounded-xl">
                 <h3 className="font-bold text-white mb-4 flex items-center">
                    <Zap className="w-4 h-4 mr-2 text-amber-400" />
                    Revenue Bridge
                </h3>
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-400">Current (Repair + Refurb)</span>
                            <span className="text-white font-mono">$13,000</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-2">
                            <div className="bg-gray-500 h-2 rounded-full" style={{ width: '68%' }}></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-emerald-400 font-bold">Target (Q4 2026)</span>
                            <span className="text-emerald-400 font-mono font-bold">$19,000</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-2">
                            <div className="bg-emerald-500 h-2 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]" style={{ width: '100%' }}></div>
                        </div>
                    </div>
                    <div className="pt-4 border-t border-white/5 text-xs text-gray-400 leading-relaxed">
                        Gap closure via <strong>ReviewGuard ($1.5k)</strong> and <strong>Midas ($1k)</strong>.
                    </div>
                </div>
            </div>

            {/* Kill Criteria */}
             <div className="glass-card p-6 rounded-xl">
                 <h3 className="font-bold text-white mb-4 flex items-center">
                    <ShieldAlert className="w-4 h-4 mr-2 text-rose-500" />
                    Kill Criteria Check
                </h3>
                <div className="space-y-3">
                    {KILL_CRITERIA.slice(0, 2).map((crit, i) => (
                        <div key={i} className="bg-black/20 p-3 rounded-lg border border-white/5">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-gray-300">{crit.project}</span>
                                <span className="text-[10px] text-gray-500">{crit.timeframe}</span>
                            </div>
                            <p className="text-xs text-rose-400 mb-1">{crit.signal}</p>
                            <p className="text-[10px] text-gray-500 leading-tight">Else: {crit.alternative}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Risk Register */}
             <div className="glass-card p-6 rounded-xl border-l-4 border-rose-500">
                <h3 className="font-bold text-white mb-4 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-2 text-rose-500" />
                    Top Risks
                </h3>
                <ul className="space-y-3">
                    {risks.map((r, i) => (
                        <li key={i} className="text-sm text-gray-400">
                            <span className="text-white font-medium block mb-0.5">{r.risk}</span>
                            Mitigation: {r.mitigation}
                        </li>
                    ))}
                </ul>
            </div>

        </div>
      </div>
    </div>
  );
};

export default Plan;