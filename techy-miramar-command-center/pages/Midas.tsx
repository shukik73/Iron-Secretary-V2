import React from 'react';
import { ShoppingCart, AlertTriangle, CheckCircle, ExternalLink, Zap } from 'lucide-react';
import StatCard from '../components/StatCard';
import { MIDAS_BUY_RULES } from '../constants';

const alerts = [
  {
    id: '1',
    device: 'MacBook Pro 15" 2015',
    price: 95,
    listingYield: 310,
    margin: 215,
    platform: 'eBay',
    url: '#',
    status: 'hot'
  },
  {
    id: '2',
    device: 'iMac 27" 2019 5K',
    price: 180,
    listingYield: 400,
    margin: 220,
    platform: 'FB Marketplace',
    url: '#',
    status: 'watch'
  }
];

const Midas: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center">
                <span className="text-amber-500 mr-2">⚡</span>
                Midas
            </h1>
            <p className="text-gray-400 mt-1">Parts Arbitrage & Harvesting Engine</p>
        </div>
        <button className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
            Log Purchase
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Deals Alerted" value="12" icon={Zap} trend="up" color="amber" />
        <StatCard title="Purchased (Mo)" value="2" icon={ShoppingCart} trend="neutral" color="blue" />
        <StatCard title="Est. Margin" value="$380" icon={CheckCircle} trend="up" color="emerald" />
        <StatCard title="Open Buys" value="2/3" subValue="Limit Reached Soon" icon={AlertTriangle} color="rose" />
      </div>

      {/* Live Alerts Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Live Deal Alerts</h2>
            {alerts.map((deal) => (
                <div key={deal.id} className="bg-gray-900 border border-gray-800 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between hover:border-gray-700 transition-all shadow-lg shadow-black/40">
                    <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                            <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${deal.status === 'hot' ? 'bg-rose-500 text-white animate-pulse' : 'bg-blue-500 text-white'}`}>
                                {deal.status === 'hot' ? '🔥 HOT BUY' : 'WATCH'}
                            </span>
                            <span className="text-gray-500 text-sm">{deal.platform}</span>
                        </div>
                        <h3 className="text-lg font-bold text-white">{deal.device}</h3>
                        <div className="flex items-center space-x-4 mt-2 text-sm">
                            <span className="text-gray-300">Price: <span className="font-mono text-white text-base">${deal.price}</span></span>
                            <span className="text-gray-500">→</span>
                            <span className="text-gray-300">Est. Yield: <span className="font-mono text-emerald-400 text-base">${deal.listingYield}</span></span>
                        </div>
                    </div>
                    
                    <div className="mt-4 md:mt-0 md:text-right md:pl-6 border-l border-gray-800 md:border-l-0">
                        <div className="text-sm text-gray-400 mb-1">Proj. Margin</div>
                        <div className="text-2xl font-bold text-emerald-400 mb-3">+${deal.margin}</div>
                        <div className="flex space-x-2">
                             <a href={deal.url} className="p-2 bg-gray-800 rounded hover:bg-gray-700 text-gray-300 transition-colors">
                                <ExternalLink size={18} />
                             </a>
                             <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium transition-colors">
                                BUY NOW
                             </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* Rules Sidebar */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl h-fit">
            <h3 className="text-lg font-bold text-white mb-4">Active Buy Rules</h3>
            <div className="space-y-4">
                {Object.entries(MIDAS_BUY_RULES).slice(0, 4).map(([key, rule]) => (
                    <div key={key} className="pb-3 border-b border-gray-800 last:border-0">
                        <p className="text-sm font-medium text-amber-500 mb-1 capitalize">
                            {key.replace(/_/g, ' ')}
                        </p>
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>Max Buy: ${rule.maxBuy}</span>
                            <span>Min Yield: ${rule.minYield}</span>
                        </div>
                    </div>
                ))}
            </div>
            <button className="w-full mt-4 text-xs text-center text-gray-500 hover:text-white transition-colors">
                View All Rules in Settings
            </button>
        </div>
      </div>
    </div>
  );
};

export default Midas;