import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

// ── Voice Command Types ─────────────────────────────────────────────────

interface VoiceCommand {
  type: string;
  patterns: string[];
  description: string;
}

const VOICE_COMMANDS: VoiceCommand[] = [
  { type: 'add_lead', patterns: ['add a lead', 'new lead', 'add lead', 'new walk-in', 'add customer', 'new customer'], description: 'Add a new lead/customer' },
  { type: 'check_repairs', patterns: ['what repairs are pending', 'pending repairs', "what's in the shop", 'how many repairs', 'active tickets', 'what needs attention'], description: 'Check active repairs' },
  { type: 'schedule_pickup', patterns: ['schedule pickup', 'ready for pickup', 'mark as done', 'repair done', 'finished repair'], description: 'Mark repair as complete' },
  { type: 'check_midas', patterns: ['check midas', 'midas alerts', 'any deals', 'any midas', 'check deals', "what's on midas"], description: 'Check Midas deal alerts' },
  { type: 'emilio_stats', patterns: ['emilio stats', 'how many emails', 'email stats', 'cold email update', 'emilio update'], description: 'Get Emilio email stats' },
  { type: 'check_revenue', patterns: ['revenue this month', 'show revenue', 'how much money', 'monthly revenue', 'how are we doing'], description: 'Check monthly revenue' },
  { type: 'check_reviews', patterns: ['pending reviews', 'any reviews', 'review guard', 'reviews waiting'], description: 'Check pending reviews' },
  { type: 'queue_task', patterns: ['queue a claude task', 'add night task', 'claude assignment', 'overnight task', 'queue task'], description: 'Queue a Night Shift task' },
  { type: 'read_alerts', patterns: ['read alerts', 'critical alerts', "what's urgent", 'any alerts', "today's alerts"], description: 'Read critical alerts' },
];

// ── Mock Responses ──────────────────────────────────────────────────────

const MOCK_RESPONSES: Record<string, string> = {
  add_lead: 'Lead #248 created for Maria — Samsung Galaxy S24 — Won\'t charge. Telegram alert sent.',
  check_repairs: '4 active repairs. 1 urgent: John D\'s iPhone 14 has been in diagnosing for 52 hours.',
  schedule_pickup: 'Marked MacBook Pro for Sarah as done. Pickup notification will send automatically.',
  check_midas: '1 hot deal: MacBook Pro 15" 2015 on eBay for $95 — estimated margin $215. Buy rules pass.',
  emilio_stats: '247 sent this week. 34% open rate, 4.2% reply rate. 3 demos booked.',
  check_revenue: '$13,200 this month — 101% of $13,000 target. Repair: $10,400. Refurb: $2,800.',
  check_reviews: '3 reviews waiting for response approval. 2 positive (5-star), 1 negative (2-star).',
  queue_task: 'What type of task? Code, content, research, or audit? Say the type to continue.',
  read_alerts: '2 alerts. Critical: John D ticket stalled over 48 hours. Warning: ReviewGuard demo in 15 minutes.',
};

// ── Quick Commands ──────────────────────────────────────────────────────

const QUICK_COMMANDS = [
  { label: 'Add a new lead', command: 'add a new lead' },
  { label: 'What repairs are pending?', command: 'what repairs are pending' },
  { label: 'Check Midas alerts', command: 'check midas alerts' },
  { label: 'How many emails sent today?', command: 'how many emails sent today' },
  { label: 'Schedule a pickup', command: 'schedule a pickup' },
  { label: 'Show revenue this month', command: 'show revenue this month' },
  { label: 'Queue a Claude task', command: 'queue a claude task' },
  { label: "Read me today's critical alerts", command: 'read me today\'s critical alerts' },
];

// ── Mock Voice Logs ─────────────────────────────────────────────────────

interface VoiceLog {
  id: string;
  transcript: string;
  response: string;
  success: boolean;
  created_at: string;
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

// ── Command Matcher ─────────────────────────────────────────────────────

function matchCommand(transcript: string): { type: string; confidence: number } | null {
  const lower = transcript.toLowerCase().trim();
  let bestMatch: { type: string; confidence: number } | null = null;

  for (const cmd of VOICE_COMMANDS) {
    for (const pattern of cmd.patterns) {
      if (lower.includes(pattern)) {
        const confidence = pattern.length / lower.length;
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { type: cmd.type, confidence: Math.min(confidence, 1) };
        }
      }
    }
  }

  return bestMatch;
}

// ── Main Component ──────────────────────────────────────────────────────

const Voice: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<VoiceLog[]>(mockLogs);
  const recognitionRef = useRef<any>(null);

  // Web Speech API setup
  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setResponse('Speech recognition is not supported in this browser. Try Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
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

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
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
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const processCommand = useCallback((text: string) => {
    setIsProcessing(true);
    const match = matchCommand(text);

    // Simulate processing delay
    setTimeout(() => {
      let responseText: string;
      if (match) {
        responseText = MOCK_RESPONSES[match.type] || 'Command recognized but no handler available yet.';
      } else {
        responseText = `I heard: "${text}". I'm not sure what action to take. Try one of the quick commands below, or rephrase your request.`;
      }

      setResponse(responseText);
      setIsProcessing(false);

      // Add to logs
      setLogs(prev => [{
        id: `vl-${Date.now()}`,
        transcript: text,
        response: responseText,
        success: !!match,
        created_at: new Date().toISOString(),
      }, ...prev]);

      // TTS playback (browser-native)
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(responseText);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    }, 600);
  }, []);

  const handleQuickCommand = useCallback((command: string) => {
    setTranscript(command);
    processCommand(command);
  }, [processCommand]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
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
        <p className="text-gray-400">Hands-free command center</p>
      </div>

      {/* Main Voice Area */}
      <div className="flex flex-col items-center py-8">
        {/* Mic Button */}
        <button
          onClick={isListening ? stopListening : startListening}
          className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
            isListening
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 shadow-[0_0_60px_rgba(147,51,234,0.5)] scale-110'
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 shadow-[0_0_30px_rgba(147,51,234,0.2)] hover:scale-105'
          }`}
        >
          {/* Pulse rings when listening */}
          {isListening && (
            <>
              <span className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />
              <span className="absolute inset-[-8px] rounded-full border-2 border-purple-500/30 animate-pulse" />
            </>
          )}
          {isListening ? (
            <MicOff size={40} className="text-white relative z-10" />
          ) : (
            <Mic size={40} className="text-white relative z-10" />
          )}
        </button>

        <p className="mt-4 text-sm text-gray-400">
          {isListening ? 'Listening... Tap to stop' : isProcessing ? 'Processing...' : 'Tap to start listening'}
        </p>

        {/* Transcript */}
        {transcript && (
          <div className="mt-6 w-full max-w-xl">
            <div className="glass-card rounded-xl p-4 border border-white/5">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">You said</p>
              <p className="text-white text-lg">"{transcript}"</p>
            </div>
          </div>
        )}

        {/* Response */}
        {response && (
          <div className="mt-4 w-full max-w-xl">
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

      {/* Quick Commands */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-white">Quick Commands</h2>
          <p className="text-sm text-gray-500">Tap a command or speak it</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {QUICK_COMMANDS.map((cmd, i) => (
            <button
              key={i}
              onClick={() => handleQuickCommand(cmd.command)}
              className="glass-card rounded-xl px-5 py-4 text-left text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-all border border-white/5 hover:border-purple-500/30"
            >
              {cmd.label}
            </button>
          ))}
        </div>
      </section>

      {/* Recent Voice Logs */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">Recent Voice Logs</h2>
        <div className="glass-card rounded-2xl overflow-hidden">
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
                  <p className="text-sm text-white">"{log.transcript}"</p>
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
