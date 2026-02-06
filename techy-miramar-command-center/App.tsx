import React, { useState } from 'react';
import { Bot } from 'lucide-react';
import Sidebar from './components/Sidebar';
import AIAssistant from './components/AIAssistant';
import Dashboard from './pages/Dashboard';
import Emilio from './pages/Emilio';
import Midas from './pages/Midas';
import Leads from './pages/Leads';
import Plan from './pages/Plan';

// Simple placeholder components for pages not fully detailed in the file list
const ReviewGuard = () => <div className="p-10 text-center text-gray-500 glass-card rounded-xl m-10">ReviewGuard Module Loading...</div>;

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
      
      {!isAIOpen && (
        <button 
            onClick={() => setIsAIOpen(true)}
            className="fixed bottom-8 right-8 p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full shadow-2xl shadow-purple-500/30 hover:scale-105 transition-transform z-40 group"
        >
            <Bot size={24} className="group-hover:rotate-12 transition-transform" />
            <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity pointer-events-none border border-white/10">
                Open Copilot
            </span>
        </button>
      )}
    </div>
  );
}

export default App;