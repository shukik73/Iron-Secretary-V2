import React from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  MoreHorizontal,
  Plus,
  Zap,
  Mail,
  TrendingUp,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { name: 'Mon', revenue: 4000 },
  { name: 'Tue', revenue: 3000 },
  { name: 'Wed', revenue: 5000 },
  { name: 'Thu', revenue: 2780 },
  { name: 'Fri', revenue: 6890 },
  { name: 'Sat', revenue: 4390 },
  { name: 'Sun', revenue: 7490 },
];

const dailyCadence = [
  { id: 1, title: 'Check Midas Alerts (Telegram)', time: '7:00 AM', tag: 'Routine', color: 'text-amber-400 bg-amber-400/10' },
  { id: 2, title: 'Inbox Scan: Emilio Replies', time: '7:15 AM', tag: 'Sales', color: 'text-blue-400 bg-blue-400/10' },
  { id: 3, title: 'ReviewGuard Approvals', time: '7:30 AM', tag: 'Ops', color: 'text-purple-400 bg-purple-400/10' },
  { id: 4, title: 'Missed Call / Lead Check', time: '8:00 AM', tag: 'Service', color: 'text-emerald-400 bg-emerald-400/10' },
];

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-end border-b border-gray-800/50 pb-6">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Good afternoon, Boss.</h1>
          <p className="text-gray-400 flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            Tuesday, February 24 • Daily Cadence Active.
          </p>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
            <button className="glass-card px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white flex items-center">
                Filter View
            </button>
            <button className="bg-white text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors flex items-center shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                <Plus className="w-4 h-4 mr-2" />
                Add Task
            </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Agenda & Tasks */}
        <div className="lg:col-span-2 space-y-8">
            
            {/* Today's Agenda (Daily Cadence) */}
            <section>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-white">Daily Operating Cadence</h2>
                    <button className="text-sm text-gray-500 hover:text-white transition-colors">Edit Routine</button>
                </div>
                <div className="glass-card rounded-2xl p-1 overflow-hidden">
                    {dailyCadence.map((task, idx) => (
                        <div key={task.id} className="group flex items-center p-4 hover:bg-white/5 rounded-xl transition-all border-b border-transparent hover:border-white/5 last:border-0 cursor-pointer">
                            <div className="w-20 text-sm font-medium text-gray-400 font-mono">{task.time}</div>
                            <div className="w-1 h-10 rounded-full bg-gray-700 mx-4 group-hover:bg-brand-primary transition-colors"></div>
                            <div className="flex-1">
                                <h3 className="text-white font-medium text-lg">{task.title}</h3>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${task.color}`}>
                                {task.tag}
                            </span>
                            <button className="ml-4 opacity-0 group-hover:opacity-100 p-2 hover:bg-white/10 rounded-lg text-gray-400 transition-all">
                                <CheckCircle2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            {/* Quick Stats / Pulse */}
            <section>
                <h2 className="text-xl font-semibold text-white mb-4">Operational Pulse</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="glass-card p-5 rounded-2xl relative overflow-hidden group cursor-pointer border border-white/5 hover:border-amber-500/50 transition-colors">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Zap size={60} />
                        </div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Midas</p>
                        <h3 className="text-2xl font-bold text-white mb-1">2 Deals</h3>
                        <p className="text-sm text-emerald-400">+1 Hot Find (MacBook)</p>
                    </div>
                    <div className="glass-card p-5 rounded-2xl relative overflow-hidden group cursor-pointer border border-white/5 hover:border-blue-500/50 transition-colors">
                         <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Mail size={60} />
                        </div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Emilio</p>
                        <h3 className="text-2xl font-bold text-white mb-1">8 Replies</h3>
                        <p className="text-sm text-blue-400">Action Required</p>
                    </div>
                     <div className="glass-card p-5 rounded-2xl relative overflow-hidden group cursor-pointer border border-white/5 hover:border-emerald-500/50 transition-colors">
                         <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <TrendingUp size={60} />
                        </div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Revenue</p>
                        <h3 className="text-2xl font-bold text-white mb-1">$13.2k</h3>
                        <p className="text-sm text-emerald-400">101% of Target</p>
                    </div>
                </div>
            </section>

             {/* Chart */}
             <section className="glass-card p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-white">Performance Trajectory</h3>
                        <p className="text-sm text-gray-400">Revenue vs Projected</p>
                    </div>
                    <select className="bg-black/30 border border-white/10 text-xs text-gray-300 rounded-lg px-3 py-1 focus:outline-none">
                        <option>Last 7 Days</option>
                    </select>
                </div>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        </defs>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f3f4f6' }} 
                            cursor={{stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1}}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                    </AreaChart>
                    </ResponsiveContainer>
                </div>
            </section>
        </div>

        {/* Right Column: AI & Notifications */}
        <div className="space-y-8">
            <div className="glass-card rounded-2xl p-6 border-t-4 border-indigo-500">
                <div className="flex items-center mb-4">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center mr-3">
                        <Zap className="w-4 h-4 text-indigo-400" />
                    </div>
                    <h3 className="font-bold text-white">AI Insight</h3>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-4">
                    Based on recent sales, 2015 MacBook Pros are moving 20% faster than other inventory. I recommend increasing the Midas buy limit for this model.
                </p>
                <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
                    Apply Recommendation
                </button>
            </div>

            <div className="glass-card rounded-2xl p-6">
                 <h3 className="font-bold text-white mb-4">Active Sprints</h3>
                 <div className="space-y-4">
                    {[
                        { name: 'Emilio: Cold Email Scale', progress: 45, color: 'bg-blue-500' },
                        { name: 'ReviewGuard: MVP', progress: 15, color: 'bg-purple-500' },
                        { name: 'Shop: Physical QR Code', progress: 90, color: 'bg-emerald-500' }
                    ].map((proj, i) => (
                        <div key={i}>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-300 font-medium">{proj.name}</span>
                                <span className="text-gray-500">{proj.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-1.5">
                                <div className={`h-1.5 rounded-full ${proj.progress === 100 ? 'bg-emerald-500' : proj.color}`} style={{ width: `${proj.progress}%` }}></div>
                            </div>
                        </div>
                    ))}
                 </div>
                 <button className="w-full mt-6 flex items-center justify-center text-sm text-gray-500 hover:text-white transition-colors">
                    View Master Plan <ArrowRight size={14} className="ml-1" />
                 </button>
            </div>
            
            <div className="glass-card rounded-2xl p-6">
                <h3 className="font-bold text-white mb-4 flex items-center">
                    <AlertCircle className="w-4 h-4 text-rose-500 mr-2" />
                    Critical Alerts
                </h3>
                <ul className="space-y-3">
                    <li className="flex items-start text-sm text-gray-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 mr-2 flex-shrink-0"></span>
                        Client "John D" ticket stalled > 48h.
                    </li>
                    <li className="flex items-start text-sm text-gray-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 mr-2 flex-shrink-0"></span>
                        ReviewGuard demo scheduled in 15m.
                    </li>
                </ul>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;