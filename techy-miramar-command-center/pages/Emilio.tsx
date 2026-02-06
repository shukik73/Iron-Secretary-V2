import React from 'react';
import { Mail, MessageSquare, UserCheck, Trash2, Send } from 'lucide-react';
import StatCard from '../components/StatCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const funnelData = [
  { name: 'Sent', value: 247, color: '#3b82f6' },
  { name: 'Opened', value: 71, color: '#8b5cf6' },
  { name: 'Replied', value: 8, color: '#10b981' },
  { name: 'Booked', value: 2, color: '#f59e0b' },
];

const recentReplies = [
  { id: 1, name: "Mike's Phone Fix", message: "Interesting, tell me more about pricing.", time: "2h ago", sentiment: "positive" },
  { id: 2, name: "QuickFix Tampa", message: "What's the price?", time: "1d ago", sentiment: "neutral" },
  { id: 3, name: "iRepair Miami", message: "Remove me from list.", time: "1d ago", sentiment: "negative" },
];

const Emilio: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-4xl font-bold text-white tracking-tight">Emilio Engine</h1>
      
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <StatCard title="Sent" value="247" icon={Send} color="blue" />
         <StatCard title="Open Rate" value="29%" subValue="Target: 25%" icon={Mail} trend="up" color="purple" />
         <StatCard title="Reply Rate" value="3.2%" subValue="Target: 1%" icon={MessageSquare} trend="up" color="emerald" />
         <StatCard title="Demos" value="2" icon={UserCheck} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel Chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Weekly Funnel</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelData} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" stroke="#9ca3af" width={60} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#f3f4f6' }}
                            cursor={{fill: '#1f2937'}}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {funnelData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Kill Criteria Check */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <Trash2 size={100} />
             </div>
             <h3 className="text-lg font-semibold text-white mb-4">Kill Criteria Check</h3>
             
             <div className="space-y-6">
                <div>
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-300">Volume (500 Emails)</span>
                        <span className="text-gray-400">247 / 500</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '49%' }}></div>
                    </div>
                </div>

                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <p className="text-sm text-emerald-400 font-semibold mb-1">Status: GREEN LIGHT</p>
                    <p className="text-xs text-gray-400">Current reply rate (3.2%) exceeds kill threshold (1%). Continue scaling.</p>
                </div>

                <div className="p-4 bg-gray-800 rounded-lg text-sm text-gray-300">
                    <p className="font-medium mb-1">Next Milestone:</p>
                    Scale to 50 emails/day starting next Monday if spam complaints remain &lt; 0.1%.
                </div>
             </div>
        </div>
      </div>

      {/* Recent Replies */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Replies</h3>
        <div className="space-y-3">
            {recentReplies.map((reply) => (
                <div key={reply.id} className="flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors border border-gray-700/50">
                    <div className="flex items-center space-x-4">
                        <div className={`w-2 h-2 rounded-full ${
                            reply.sentiment === 'positive' ? 'bg-emerald-500' : 
                            reply.sentiment === 'negative' ? 'bg-rose-500' : 'bg-gray-500'
                        }`} />
                        <div>
                            <p className="font-medium text-white">{reply.name}</p>
                            <p className="text-sm text-gray-400 truncate max-w-md">{reply.message}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="text-xs text-gray-500">{reply.time}</span>
                        <button className="px-3 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white text-sm rounded transition-all">
                            Respond
                        </button>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Emilio;