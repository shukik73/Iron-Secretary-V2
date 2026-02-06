import React, { useState } from 'react';
import { Bot } from 'lucide-react';
import Sidebar from './components/Sidebar';
import AIAssistant from './components/AIAssistant';
import VoiceFAB from './components/VoiceFAB';
import Dashboard from './pages/Dashboard';
import Emilio from './pages/Emilio';
import Midas from './pages/Midas';
import Leads from './pages/Leads';
import Plan from './pages/Plan';
import AIWorkspace from './pages/AIWorkspace';
import NightShift from './pages/NightShift';
import Voice from './pages/Voice';

const ReviewGuard = () => (
  <div className="space-y-6 animate-fade-in">
    <h1 className="text-4xl font-bold text-white tracking-tight">ReviewGuard</h1>
    <div className="glass-card rounded-2xl p-12 text-center border border-white/5">
      <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">🛡️</span>
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">Coming Soon</h2>
      <p className="text-gray-400 max-w-md mx-auto">
        ReviewGuard will manage Google review monitoring, AI-drafted responses, and reputation tracking.
        This module is under development.
      </p>
    </div>
  </div>
);

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'emilio': return <Emilio />;
      case 'reviewguard': return <ReviewGuard />;
      case 'midas': return <Midas />;
      case 'leads': return <Leads />;
      case 'plan': return <Plan />;
      case 'ai-workspace': return <AIWorkspace />;
      case 'night-shift': return <NightShift />;
      case 'voice': return <Voice />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />
      
      <main className="flex-1 overflow-y-auto h-full w-full relative bg-[#030712]">
        {/* Background Gradients */}
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
             <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px]"></div>
             <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px]"></div>
        </div>

        <div className="relative z-10 p-4 md:p-8 lg:p-10 max-w-[1600px] mx-auto min-h-screen lg:ml-[260px]">
            {renderContent()}
        </div>
      </main>

      {/* AI Assistant Toggle/Panel */}
      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />

      {/* AI Copilot button (top of FAB stack) */}
      {!isAIOpen && (
        <button
            onClick={() => setIsAIOpen(true)}
            className="fixed bottom-24 right-8 p-3 bg-gray-800 border border-gray-700 text-gray-300 rounded-full shadow-lg hover:scale-105 hover:text-white hover:border-gray-600 transition-all z-40 group"
            aria-label="Open AI Copilot"
        >
            <Bot size={20} className="group-hover:rotate-12 transition-transform" />
            <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity pointer-events-none border border-white/10">
                Open Copilot
            </span>
        </button>
      )}

      {/* Voice FAB (primary, bottom-right) */}
      <VoiceFAB onNavigateToVoice={() => setActiveTab('voice')} />
    </div>
  );
}

export default App;