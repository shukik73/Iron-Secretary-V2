import React from 'react';
import {
  LayoutGrid,
  Mail,
  ShieldCheck,
  Zap,
  Users,
  Layers,
  Cpu,
  Settings,
  Menu,
  X,
  Command,
  Bot,
  Moon,
  Sun,
  Sunrise,
  Inbox,
  UserCircle,
  CalendarDays,
  CheckSquare,
  BarChart3,
  LogOut,
} from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  onSignOut?: () => void;
  userEmail?: string;
  userName?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isMobileOpen, setIsMobileOpen, onSignOut, userEmail, userName }) => {
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { section: 'Focus', items: [
      { id: 'dashboard', label: 'My Focus', icon: LayoutGrid },
      { id: 'morning-briefing', label: 'Morning Briefing', icon: Sunrise },
      { id: 'smart-today', label: 'Today', icon: CheckSquare },
      { id: 'timeline', label: 'Schedule', icon: CalendarDays },
      { id: 'plan', label: 'Projects & Tasks', icon: Layers },
      { id: 'ai-workspace', label: 'AI Workspace', icon: Bot },
      { id: 'night-shift', label: 'Night Shift', icon: Moon },
    ]},
    { section: 'Operations', items: [
      { id: 'emilio', label: 'Emilio', icon: Mail, badge: '3' },
      { id: 'midas', label: 'Midas', icon: Zap, badge: '1', badgeColor: 'text-amber-400 bg-amber-400/10' },
      { id: 'leads', label: 'Leads', icon: Users, badge: '2', badgeColor: 'text-rose-400 bg-rose-400/10' },
      { id: 'customer-360', label: 'Customers', icon: UserCircle },
      { id: 'reviewguard', label: 'ReviewGuard', icon: ShieldCheck },
    ]},
    { section: 'Reports', items: [
      { id: 'inbox', label: 'Inbox', icon: Inbox, badge: '5', badgeColor: 'text-blue-400 bg-blue-400/10' },
      { id: 'weekly-review', label: 'Weekly Review', icon: BarChart3 },
    ]},
  ];

  return (
    <>
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          aria-label="Toggle navigation menu"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 glass-panel rounded-lg text-white shadow-lg"
        >
          {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <aside className={`
        fixed top-0 left-0 z-40 h-screen transition-transform duration-300 ease-in-out border-r border-gray-800/50 bg-black/40 backdrop-blur-xl w-[260px] sidebar-bg
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full px-4 py-6 flex flex-col">
          <div className="flex items-center px-2 mb-10">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center mr-3 shadow-lg shadow-white/10">
              <Command className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="font-bold text-white tracking-tight">Iron Secretary</h2>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">V2 — Command Center</p>
            </div>
          </div>

          <div className="flex-1 space-y-8">
            {navItems.map((group, idx) => (
              <div key={idx}>
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{group.section}</h3>
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => {
                            setActiveTab(item.id);
                            setIsMobileOpen(false);
                          }}
                          className={`
                            w-full flex items-center px-3 py-2.5 rounded-lg group transition-all duration-200 text-sm font-medium
                            ${isActive 
                              ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/5' 
                              : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                            }
                          `}
                        >
                          <Icon className={`w-4 h-4 mr-3 transition-colors ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`} />
                          <span className="flex-1 text-left">{item.label}</span>
                          {item.badge && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${item.badgeColor || 'bg-blue-500/10 text-blue-400'}`}>
                              {item.badge}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-gray-800/50 space-y-1">
             <button
               onClick={toggleTheme}
               className="w-full flex items-center px-3 py-2.5 text-gray-400 rounded-lg hover:bg-white/5 hover:text-white transition-all text-sm font-medium"
               aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
             >
                {theme === 'dark' ? <Sun className="w-4 h-4 mr-3" /> : <Moon className="w-4 h-4 mr-3" />}
                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
             <button className="w-full flex items-center px-3 py-2.5 text-gray-400 rounded-lg hover:bg-white/5 hover:text-white transition-all text-sm font-medium">
                <Settings className="w-4 h-4 mr-3" />
                <span>Settings</span>
              </button>
             <button className="w-full flex items-center px-3 py-2.5 text-gray-400 rounded-lg hover:bg-white/5 hover:text-white transition-all text-sm font-medium">
                <Cpu className="w-4 h-4 mr-3" />
                <span>AI Configuration</span>
              </button>
          </div>

          {/* User Profile & Sign Out */}
          <div className="pt-4 border-t border-gray-800/50 mt-4">
            <div className="flex items-center px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold mr-3 flex-shrink-0">
                {(userName || userEmail || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                {userName && <p className="text-sm text-white font-medium truncate">{userName}</p>}
                <p className="text-[11px] text-gray-500 truncate">{userEmail}</p>
              </div>
            </div>
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="w-full flex items-center px-3 py-2.5 text-gray-400 rounded-lg hover:bg-rose-500/10 hover:text-rose-400 transition-all text-sm font-medium mt-1"
              >
                <LogOut className="w-4 h-4 mr-3" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </aside>
      
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;