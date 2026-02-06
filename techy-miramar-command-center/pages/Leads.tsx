import React from 'react';
import { User, Clock, CheckCircle, Phone, MessageCircle } from 'lucide-react';
import StatCard from '../components/StatCard';

const leads = [
  { id: 1, name: 'John D.', device: 'iPhone 13', issue: 'Broken Screen', status: 'In Repair', time: '52h', color: 'blue' },
  { id: 2, name: 'Maria S.', device: 'MacBook Air', issue: 'Battery', status: 'Ready', time: '26h', color: 'emerald' },
  { id: 3, name: 'Guest 244', device: 'Samsung S22', issue: 'Port', status: 'New', time: '10m', color: 'gray' },
];

const Leads: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white tracking-tight">Leads & Repairs</h1>
        <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium">
            + New Walk-in
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="New Today" value="3" icon={User} color="blue" />
        <StatCard title="In Repair" value="7" icon={Clock} color="amber" />
        <StatCard title="Ready" value="2" icon={CheckCircle} color="emerald" />
        <StatCard title="Awaiting Pickup" value="1" icon={Phone} trend="down" color="rose" />
      </div>

      {/* Pipeline Visual */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
        <h3 className="text-gray-400 uppercase text-xs font-bold tracking-wider mb-6">Customer Lifecycle Pipeline</h3>
        <div className="relative">
             <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-800 -translate-y-1/2 z-0"></div>
             <div className="relative z-10 flex justify-between">
                {[
                    { label: 'New', count: 3, active: true },
                    { label: 'Ticket', count: 12, active: true },
                    { label: 'In Repair', count: 7, active: true },
                    { label: 'Done', count: 2, active: true },
                    { label: 'Picked Up', count: 15, active: false }
                ].map((step, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 border-4 ${step.active ? 'bg-blue-600 border-gray-900 text-white' : 'bg-gray-800 border-gray-900 text-gray-500'}`}>
                            {step.count}
                        </div>
                        <span className={`text-sm font-medium ${step.active ? 'text-blue-400' : 'text-gray-600'}`}>{step.label}</span>
                    </div>
                ))}
             </div>
        </div>
      </div>

      {/* Needs Attention & Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center space-x-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                <h3 className="text-lg font-semibold text-white">Needs Attention</h3>
            </div>
            
            <div className="space-y-4">
                <div className="p-4 bg-gray-800/50 rounded-lg border-l-4 border-rose-500">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h4 className="font-bold text-white">John D. — iPhone 13</h4>
                            <p className="text-sm text-gray-400">52 hours in shop. No repair started.</p>
                        </div>
                        <span className="text-xs bg-rose-500/20 text-rose-400 px-2 py-1 rounded">Stalled</span>
                    </div>
                    <div className="flex space-x-2 mt-2">
                        <button className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded">Text Client</button>
                        <button className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded">Start Ticket</button>
                    </div>
                </div>

                <div className="p-4 bg-gray-800/50 rounded-lg border-l-4 border-amber-500">
                    <div className="flex justify-between items-start mb-2">
                         <div>
                            <h4 className="font-bold text-white">Maria S. — MacBook</h4>
                            <p className="text-sm text-gray-400">Done 26h ago. Not picked up.</p>
                        </div>
                         <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded">Ready</span>
                    </div>
                    <div className="flex space-x-2 mt-2">
                         <button className="flex items-center text-xs bg-emerald-600/20 text-emerald-400 px-3 py-1 rounded border border-emerald-600/30">
                            <CheckCircle size={12} className="mr-1" /> Reminder Sent
                         </button>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Active Tickets</h3>
            <table className="w-full text-left">
                <thead>
                    <tr className="text-xs text-gray-500 border-b border-gray-800 uppercase">
                        <th className="pb-2">Customer</th>
                        <th className="pb-2">Device</th>
                        <th className="pb-2">Status</th>
                        <th className="pb-2 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {leads.map(lead => (
                        <tr key={lead.id} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/50">
                            <td className="py-3 text-white font-medium">{lead.name}</td>
                            <td className="py-3 text-gray-400">{lead.device}</td>
                            <td className="py-3">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium 
                                    ${lead.color === 'blue' ? 'bg-blue-500/10 text-blue-400' : 
                                      lead.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-700 text-gray-300'}
                                `}>
                                    {lead.status}
                                </span>
                            </td>
                            <td className="py-3 text-right">
                                <button className="text-gray-500 hover:text-white">
                                    <MessageCircle size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default Leads;