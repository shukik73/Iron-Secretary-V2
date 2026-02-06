import React, { useState } from 'react';
import { Sparkles, Send, X, Bot, CheckCircle2 } from 'lucide-react';

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'ai', text: 'Good afternoon. I noticed 3 new high-value MacBook leads on Midas. Should we adjust the buy rules for 2015 models?' },
    { id: 2, sender: 'user', text: 'Yes, let\'s cap it at $150.' },
    { id: 3, sender: 'ai', text: 'Done. Updated maxBuy for macbook_pro_15_2015 to $150. Anything else?' },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { id: Date.now(), sender: 'user', text: input }]);
    setInput('');
    setTimeout(() => {
        setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: 'I\'ve added that to your task list and prioritized it.' }]);
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-screen w-96 bg-[#09090b]/95 backdrop-blur-xl border-l border-white/10 shadow-2xl z-50 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="p-5 border-b border-white/5 flex justify-between items-center">
        <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
                <h3 className="text-sm font-bold text-white">Neural Copilot</h3>
                <p className="text-xs text-green-400 flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5"></span>
                    Online
                </p>
            </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={18} />
        </button>
      </div>

      {/* Suggested Actions */}
      <div className="p-5 pb-0">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Suggested Actions</p>
        <div className="space-y-2">
            <button className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all group">
                <div className="flex items-start">
                    <Bot className="w-4 h-4 text-purple-400 mt-0.5 mr-3" />
                    <div>
                        <p className="text-sm text-gray-200 group-hover:text-white">Review Emilio draft for "Repair Shops"</p>
                        <p className="text-xs text-gray-500 mt-1">Due Today</p>
                    </div>
                </div>
            </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.sender === 'ai' && (
                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex-shrink-0 flex items-center justify-center mr-2 mt-1">
                        <Sparkles size={12} className="text-indigo-400" />
                    </div>
                )}
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    msg.sender === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-gray-800 text-gray-200 rounded-bl-none border border-white/5'
                }`}>
                    {msg.text}
                </div>
            </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/5 bg-black/20">
        <div className="relative">
            <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask Copilot to organize tasks..."
                className="w-full bg-gray-900/50 border border-white/10 rounded-xl pl-4 pr-10 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
            />
            <button 
                onClick={handleSend}
                className="absolute right-2 top-2 p-1.5 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-white transition-colors"
            >
                <Send size={14} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;