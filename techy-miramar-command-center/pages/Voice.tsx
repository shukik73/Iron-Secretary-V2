import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, CheckCircle2, AlertCircle, Sparkles, MessageSquare, Trash2 } from 'lucide-react';
import { VOICE_COMMANDS, QUICK_COMMANDS } from '../lib/voiceCommands';
import { sendChatMessage, ChatMessage } from '../lib/aiChat';

// ── Types ────────────────────────────────────────────────────────────────

interface VoiceLog {
  id: string;
  transcript: string;
  response: string;
  success: boolean;
  created_at: string;
}

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const mockLogs: VoiceLog[] = [
  {
    id: 'vl-1',
    transcript: 'Add lead John, iPhone 15, cracked screen, 305-555-1234',
    response: 'Lead #247 created',
    success: true,
    created_at: '2026-02-06T09:42:00Z',
  },
  {
    id: 'vl-2',
    transcript: "What's my revenue this month?",
    response: '$13,200 — 101% of target',
    success: true,
    created_at: '2026-02-06T09:15:00Z',
  },
  {
    id: 'vl-3',
    transcript: 'Any Midas alerts?',
    response: '1 hot deal: MacBook Pro 15 2015, $95 on eBay, est. margin $215',
    success: true,
    created_at: '2026-02-06T08:50:00Z',
  },
];

// ── Main Component ───────────────────────────────────────────────────────

const Voice: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<VoiceLog[]>(mockLogs);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll conversation
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const processCommand = useCallback(async (text: string) => {
    setIsProcessing(true);

    // Add user message to conversation UI
    const userMsg: ConversationMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setConversation(prev => [...prev, userMsg]);

    // Build messages for AI
    const newMessages: ChatMessage[] = [
      ...chatHistory,
      { role: 'user', content: text },
    ];

    try {
      const aiResponse = await sendChatMessage(newMessages);
      setResponse(aiResponse);
      setIsProcessing(false);

      // Add AI message to conversation UI
      const aiMsg: ConversationMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
      };
      setConversation(prev => [...prev, aiMsg]);

      // Update chat history (keep last 20 messages)
      setChatHistory(prev => [
        ...prev,
        { role: 'user' as const, content: text },
        { role: 'assistant' as const, content: aiResponse },
      ].slice(-20));

      // Add to logs
      setLogs(prev => [{
        id: `vl-${Date.now()}`,
        transcript: text,
        response: aiResponse,
        success: true,
        created_at: new Date().toISOString(),
      }, ...prev]);

      // Speak the response
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(aiResponse);
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      setIsProcessing(false);
      setResponse('Failed to get AI response. Please try again.');
    }
  }, [chatHistory]);

  const startListening = useCallback(() => {
    const SpeechRecognitionApi = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionApi) {
      setResponse('Speech recognition is not supported in this browser. Try Chrome.');
      return;
    }

    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    try {
      const recognition = new SpeechRecognitionApi();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }
        setTranscript(finalTranscript || interimTranscript);
        if (finalTranscript) {
          processCommand(finalTranscript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false);
        setResponse(`Error: ${event.error}. Please try again.`);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      setTranscript('');
      setResponse('');
    } catch {
      setResponse('Failed to start speech recognition. Check microphone permissions.');
    }
  }, [processCommand]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsListening(false);
  }, []);

  const handleQuickCommand = useCallback((command: string) => {
    setTranscript(command);
    processCommand(command);
  }, [processCommand]);

  const clearConversation = useCallback(() => {
    setConversation([]);
    setChatHistory([]);
    setTranscript('');
    setResponse('');
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Header */}
      <div className="border-b border-gray-800/50 pb-6">
        <h1 className="text-4xl font-bold text-white tracking-tight mb-2 flex items-center gap-3">
          <Mic className="w-9 h-9 text-purple-400" />
          Voice Assistant
        </h1>
        <p className="text-gray-400">Talk to Iron Secretary — AI-powered, hands-free</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Voice + Conversation */}
        <div className="lg:col-span-2 space-y-6">
          {/* Mic Button */}
          <div className="flex flex-col items-center py-6">
            <button
              onClick={isListening ? stopListening : startListening}
              aria-label={isListening ? 'Stop listening' : 'Start listening'}
              className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 ${
                isListening
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 shadow-[0_0_60px_rgba(147,51,234,0.5)] scale-110'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 shadow-[0_0_30px_rgba(147,51,234,0.2)] hover:scale-105'
              }`}
            >
              {isListening && (
                <>
                  <span className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />
                  <span className="absolute inset-[-8px] rounded-full border-2 border-purple-500/30 animate-pulse" />
                </>
              )}
              {isListening ? (
                <MicOff size={36} className="text-white relative z-10" />
              ) : (
                <Mic size={36} className="text-white relative z-10" />
              )}
            </button>

            <p className="mt-3 text-sm text-gray-400">
              {isListening ? 'Listening... Tap to stop' : isProcessing ? 'AI is thinking...' : 'Tap to start talking'}
            </p>

            {/* Live transcript */}
            {transcript && !response && (
              <div className="mt-4 w-full max-w-xl">
                <div className="glass-card rounded-xl p-3 border border-white/5">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">You said</p>
                  <p className="text-white">&quot;{transcript}&quot;</p>
                </div>
              </div>
            )}
          </div>

          {/* Conversation Thread */}
          {conversation.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MessageSquare size={18} className="text-purple-400" />
                  Conversation
                </h2>
                <button
                  onClick={clearConversation}
                  className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
                >
                  <Trash2 size={12} /> Clear
                </button>
              </div>
              <div className="glass-card rounded-2xl p-4 max-h-[400px] overflow-y-auto space-y-3">
                {conversation.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex-shrink-0 flex items-center justify-center mr-2 mt-0.5">
                        <Sparkles size={12} className="text-white" />
                      </div>
                    )}
                    <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-gray-800 text-gray-200 rounded-bl-none border border-white/5'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex-shrink-0 flex items-center justify-center mr-2">
                      <Sparkles size={12} className="text-white animate-pulse" />
                    </div>
                    <div className="bg-gray-800 text-gray-400 rounded-2xl rounded-bl-none border border-white/5 px-4 py-2.5 text-sm">
                      Thinking...
                    </div>
                  </div>
                )}
                <div ref={conversationEndRef} />
              </div>
            </section>
          )}

          {/* Latest response (shown when no conversation) */}
          {conversation.length === 0 && response && (
            <div className="w-full max-w-xl mx-auto">
              <div className="glass-card rounded-xl p-4 border-l-4 border-purple-500">
                <div className="flex items-center gap-2 mb-1">
                  <Volume2 size={14} className="text-purple-400" />
                  <p className="text-xs text-purple-400 uppercase tracking-wider font-semibold">Response</p>
                </div>
                <p className="text-gray-200">{response}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Quick Commands + Info */}
        <div className="space-y-6">
          {/* Quick Commands */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Quick Commands</h2>
            <div className="space-y-2">
              {QUICK_COMMANDS.map((cmd, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickCommand(cmd.command)}
                  className="w-full glass-card rounded-xl px-4 py-3 text-left text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-all border border-white/5 hover:border-purple-500/30"
                >
                  {cmd.label}
                </button>
              ))}
            </div>
          </section>

          {/* Available Commands */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Available Commands</h2>
            <div className="space-y-2">
              {VOICE_COMMANDS.map((cmd) => (
                <div key={cmd.type} className="glass-card rounded-xl p-3 border border-white/5">
                  <p className="text-sm font-medium text-white mb-0.5">{cmd.description}</p>
                  <p className="text-xs text-gray-500">Say: &quot;{cmd.patterns[0]}&quot;</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Recent Voice Logs */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">Recent Voice Logs</h2>
        <div className="glass-card rounded-2xl overflow-hidden">
          {logs.length === 0 && (
            <div className="px-6 py-8 text-center">
              <Mic size={24} className="text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No voice logs yet. Try a voice command!</p>
            </div>
          )}
          {logs.slice(0, 10).map((log, idx) => (
            <div
              key={log.id}
              className={`px-6 py-4 hover:bg-white/5 transition-colors ${
                idx < Math.min(logs.length, 10) - 1 ? 'border-b border-white/5' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xs text-gray-500 w-20 flex-shrink-0 pt-0.5 font-mono">
                  {new Date(log.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-white">&quot;{log.transcript}&quot;</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-gray-500">&rarr;</span>
                    <p className="text-sm text-gray-400">{log.response}</p>
                    {log.success ? (
                      <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                    ) : (
                      <AlertCircle size={14} className="text-amber-400 flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Voice;
