import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, MicOff, X, ExternalLink, CheckCircle2, Loader } from 'lucide-react';

// ── Command matching (shared logic) ─────────────────────────────────────

const VOICE_PATTERNS: { type: string; patterns: string[] }[] = [
  { type: 'add_lead', patterns: ['add a lead', 'new lead', 'add lead', 'new walk-in', 'add customer', 'new customer'] },
  { type: 'check_repairs', patterns: ['what repairs are pending', 'pending repairs', "what's in the shop", 'how many repairs', 'active tickets', 'what needs attention'] },
  { type: 'schedule_pickup', patterns: ['schedule pickup', 'ready for pickup', 'mark as done', 'repair done', 'finished repair'] },
  { type: 'check_midas', patterns: ['check midas', 'midas alerts', 'any deals', 'any midas', 'check deals', "what's on midas"] },
  { type: 'emilio_stats', patterns: ['emilio stats', 'how many emails', 'email stats', 'cold email update', 'emilio update'] },
  { type: 'check_revenue', patterns: ['revenue this month', 'show revenue', 'how much money', 'monthly revenue', 'how are we doing'] },
  { type: 'check_reviews', patterns: ['pending reviews', 'any reviews', 'review guard', 'reviews waiting'] },
  { type: 'queue_task', patterns: ['queue a claude task', 'add night task', 'claude assignment', 'overnight task', 'queue task'] },
  { type: 'read_alerts', patterns: ['read alerts', 'critical alerts', "what's urgent", 'any alerts', "today's alerts"] },
];

const MOCK_RESPONSES: Record<string, string> = {
  add_lead: 'Lead #248 created for Maria — Samsung Galaxy S24 — Won\'t charge. Telegram alert sent.',
  check_repairs: '4 active repairs. 1 urgent: John D\'s iPhone 14 has been in diagnosing for 52 hours.',
  schedule_pickup: 'Marked MacBook Pro for Sarah as done. Pickup notification will send automatically.',
  check_midas: '1 hot deal: MacBook Pro 15" 2015 on eBay for $95 — estimated margin $215.',
  emilio_stats: '247 sent this week. 34% open rate, 4.2% reply rate. 3 demos booked.',
  check_revenue: '$13,200 this month — 101% of $13,000 target.',
  check_reviews: '3 reviews waiting for response approval.',
  queue_task: 'What type of task? Code, content, research, or audit?',
  read_alerts: '2 alerts. Critical: John D ticket stalled over 48 hours. Warning: ReviewGuard demo in 15 minutes.',
};

function matchCommand(transcript: string): string | null {
  const lower = transcript.toLowerCase().trim();
  for (const cmd of VOICE_PATTERNS) {
    for (const pattern of cmd.patterns) {
      if (lower.includes(pattern)) return cmd.type;
    }
  }
  return null;
}

// ── VoiceFAB Component ──────────────────────────────────────────────────

interface VoiceFABProps {
  onNavigateToVoice?: () => void;
}

type ModalState = 'idle' | 'listening' | 'processing' | 'done' | 'error';

const VoiceFAB: React.FC<VoiceFABProps> = ({ onNavigateToVoice }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [state, setState] = useState<ModalState>('idle');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    setModalOpen(true);
    setState('listening');
    setTranscript('');
    setResponse('');

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setState('error');
      setResponse('Speech recognition is not supported in this browser.');
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
      setState('error');
      setResponse(`Error: ${event.error}`);
    };

    recognition.onend = () => {
      if (state === 'listening' && !transcript) {
        setState('idle');
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const processCommand = useCallback((text: string) => {
    setState('processing');
    const matched = matchCommand(text);

    setTimeout(() => {
      if (matched) {
        setResponse(MOCK_RESPONSES[matched] || 'Command recognized.');
        setState('done');
      } else {
        setResponse(`I heard: "${text}" but I'm not sure what to do. Try the Voice page for more options.`);
        setState('done');
      }

      // TTS
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(
          matched ? MOCK_RESPONSES[matched] || 'Done.' : 'I\'m not sure what to do.'
        );
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    }, 500);
  }, []);

  const handleClose = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setModalOpen(false);
    setState('idle');
    setTranscript('');
    setResponse('');
  };

  const handleCancel = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setState('idle');
    setTranscript('');
    setResponse('');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={startListening}
        className="fixed bottom-8 right-8 p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full shadow-2xl shadow-purple-500/30 hover:scale-105 transition-transform z-40 group"
        title="Voice Assistant"
      >
        <Mic size={24} className="group-hover:scale-110 transition-transform" />
        <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity pointer-events-none border border-white/10">
          Voice Command
        </span>
      </button>

      {/* Modal Overlay */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-panel rounded-2xl w-full max-w-sm p-6 text-center relative">
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-1 text-gray-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            {/* Listening state */}
            {state === 'listening' && (
              <>
                <div className="relative w-20 h-20 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center">
                    <Mic size={32} className="text-white" />
                  </div>
                </div>
                <p className="text-white font-semibold mb-2">Listening...</p>
                {transcript && (
                  <p className="text-gray-300 text-sm mb-4">"{transcript}"</p>
                )}
                <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden mb-4">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
                <button
                  onClick={handleCancel}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </>
            )}

            {/* Processing state */}
            {state === 'processing' && (
              <>
                <Loader size={32} className="text-purple-400 mx-auto mb-4 animate-spin" />
                <p className="text-white font-semibold mb-2">Processing...</p>
                <p className="text-gray-400 text-sm">"{transcript}"</p>
              </>
            )}

            {/* Done state */}
            {state === 'done' && (
              <>
                <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-4" />
                <p className="text-white font-semibold mb-3">Done</p>
                <p className="text-gray-300 text-sm mb-6">{response}</p>
                <div className="flex gap-3 justify-center">
                  {onNavigateToVoice && (
                    <button
                      onClick={() => {
                        handleClose();
                        onNavigateToVoice();
                      }}
                      className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1"
                    >
                      <ExternalLink size={12} /> View Details
                    </button>
                  )}
                  <button
                    onClick={handleClose}
                    className="text-xs bg-white/10 hover:bg-white/20 text-white px-4 py-1.5 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </>
            )}

            {/* Error state */}
            {state === 'error' && (
              <>
                <X size={32} className="text-rose-400 mx-auto mb-4" />
                <p className="text-white font-semibold mb-2">Error</p>
                <p className="text-gray-400 text-sm mb-4">{response}</p>
                <button
                  onClick={handleClose}
                  className="text-xs bg-white/10 hover:bg-white/20 text-white px-4 py-1.5 rounded-lg transition-colors"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceFAB;
