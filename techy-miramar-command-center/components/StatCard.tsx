import React from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subValue?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: string; // Tailwind color class base (e.g., 'blue')
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  subValue, 
  icon: Icon, 
  trend, 
  trendValue,
  color = 'blue' 
}) => {
  const getColorClasses = () => {
    switch(color) {
      case 'purple': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'amber': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'emerald': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'rose': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default: return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
        </div>
        <div className={`p-3 rounded-lg ${getColorClasses()}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      
      {(subValue || trend) && (
        <div className="flex items-center text-sm">
          {trend === 'up' && <ArrowUpRight className="w-4 h-4 text-emerald-500 mr-1" />}
          {trend === 'down' && <ArrowDownRight className="w-4 h-4 text-rose-500 mr-1" />}
          {trendValue && (
            <span className={`font-medium mr-2 ${trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-rose-500' : 'text-gray-400'}`}>
              {trendValue}
            </span>
          )}
          {subValue && <span className="text-gray-500">{subValue}</span>}
        </div>
      )}
    </div>
  );
};

export default StatCard;