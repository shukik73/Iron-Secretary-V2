import React, { useState, useCallback } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import { useAuth } from './lib/AuthContext';
import Sidebar from './components/Sidebar';
import AIAssistant from './components/AIAssistant';
import VoiceFAB from './components/VoiceFAB';
import QuickCapture from './components/QuickCapture';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Emilio from './pages/Emilio';
import Midas from './pages/Midas';
import Leads from './pages/Leads';
import Plan from './pages/Plan';
import AIWorkspace from './pages/AIWorkspace';
import NightShift from './pages/NightShift';
import Voice from './pages/Voice';
import MorningBriefing from './pages/MorningBriefing';
import NotificationInbox from './pages/NotificationInbox';
import Customer360 from './pages/Customer360';
import WeeklyReview from './pages/WeeklyReview';
import SmartToday from './pages/SmartToday';
import TimelineCalendar from './pages/TimelineCalendar';
import ReviewGuard from './pages/ReviewGuard';
import CommandCenter from './pages/CommandCenter';

function App() {
  const { user, loading, isRecovery, clearRecovery, signIn, signUp, signOut, resetPassword, updatePassword } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);

  const handleCapture = useCallback((text: string, type: string) => {
    console.log(`[QuickCapture] ${type}: ${text}`);
  }, []);

  // Show loading spinner while checking session
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#030712]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated, or reset form if in recovery mode
  if (!user || isRecovery) {
    return (
      <Login
        onAuth={() => {}}
        onSignIn={signIn}
        onSignUp={signUp}
        onResetPassword={resetPassword}
        onUpdatePassword={async (pw) => {
          const result = await updatePassword(pw);
          if (!result.error) clearRecovery();
          return result;
        }}
        forceView={isRecovery ? 'reset' : undefined}
      />
    );
  }

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'command-center': return <CommandCenter />;
      case 'morning-briefing': return <MorningBriefing />;
      case 'smart-today': return <SmartToday />;
      case 'timeline': return <TimelineCalendar />;
      case 'emilio': return <Emilio />;
      case 'reviewguard': return <ReviewGuard />;
      case 'midas': return <Midas />;
      case 'leads': return <Leads />;
      case 'customer-360': return <Customer360 />;
      case 'plan': return <Plan />;
      case 'ai-workspace': return <AIWorkspace />;
      case 'night-shift': return <NightShift />;
      case 'voice': return <Voice />;
      case 'inbox': return <NotificationInbox />;
      case 'weekly-review': return <WeeklyReview />;
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
        onSignOut={signOut}
        userEmail={user.email ?? ''}
        userName={user.user_metadata?.full_name ?? ''}
      />

      <main className="flex-1 overflow-y-auto h-full w-full relative bg-[#030712] main-bg">
        {/* Background Gradients */}
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
             <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px]"></div>
             <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px]"></div>
        </div>

        <div className="relative z-10 p-4 md:p-8 lg:p-10 pb-24 max-w-[1600px] mx-auto min-h-screen lg:ml-[260px]">
            {renderContent()}
        </div>
      </main>

      {/* AI Assistant Toggle/Panel */}
      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />

      {/* AI Copilot button (left of voice FAB) */}
      {!isAIOpen && (
        <button
            aria-label="Open copilot"
            onClick={() => setIsAIOpen(true)}
            className="fixed bottom-8 right-20 p-3 bg-gray-800 border border-gray-700 text-gray-300 rounded-full shadow-lg hover:scale-105 hover:text-white hover:border-gray-600 transition-all z-40 group"
        >
            <Bot size={20} className="group-hover:rotate-12 transition-transform" />
            <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity pointer-events-none border border-white/10">
                Open Copilot
            </span>
        </button>
      )}

      {/* Voice FAB (primary, bottom-right) */}
      <VoiceFAB onNavigateToVoice={() => setActiveTab('voice')} />

      {/* Quick Capture Bar (persistent bottom input) */}
      <QuickCapture onCapture={handleCapture} />
    </div>
  );
}

export default App;
