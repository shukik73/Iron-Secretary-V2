import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, MicOff, X, ExternalLink, CheckCircle2, Loader, RotateCcw, Sparkles } from 'lucide-react';
import { sendChatMessage, ChatMessage } from '../lib/aiChat';

interface VoiceFABProps {
  onNavigateToVoice?: () => void;
}

type ModalState = 'idle' | 'listening' | 'processing' | 'done' | 'error';

const VoiceFAB: React.FC<VoiceFABProps> = ({ onNavigateToVoice }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [state, setState] = useState<ModalState>('idle');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const stateRef = useRef(state);
  const transcriptRef = useRef(transcript);

  // Keep refs in sync to avoid stale closures in speech callbacks
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  const processCommand = useCallback(async (text: string) => {
    setState('processing');

    // Build conversation with the new user message
    const newMessages: ChatMessage[] = [
      ...conversationHistory,
      { role: 'user', content: text },
    ];

    try {
      const aiResponse = await sendChatMessage(newMessages);
      setResponse(aiResponse);
      setState('done');

      // Update conversation history (keep last 10 exchanges)
      setConversationHistory(prev => [
        ...prev,
        { role: 'user' as const, content: text },
        { role: 'assistant' as const, content: aiResponse },
      ].slice(-20));

      // Speak the response
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(aiResponse);
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      setState('error');
      setResponse('Failed to get AI response. Please try again.');
    }
  }, [conversationHistory]);

  const startListening = useCallback(() => {
    setModalOpen(true);
    setState('listening');
    setTranscript('');
    setResponse('');

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const SpeechRecognitionApi = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionApi) {
      setState('error');
      setResponse('Speech recognition is not supported in this browser. Try Chrome.');
      return;
    }

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
        setState('error');
        setResponse(`Error: ${event.error}`);
      };

      recognition.onend = () => {
        if (stateRef.current === 'listening' && !transcriptRef.current) {
          setState('idle');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setState('error');
      setResponse('Failed to start speech recognition. Check microphone permissions.');
    }
  }, [processCommand]);

  const handleClose = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setModalOpen(false);
    setState('idle');
    setTranscript('');
    setResponse('');
  };

  const handleCancel = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setState('idle');
    setTranscript('');
    setResponse('');
  };

  // Close on Escape
  useEffect(() => {
    if (!modalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen]);

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
        aria-label="Voice Command"
        className="fixed bottom-8 right-8 p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full shadow-2xl shadow-purple-500/30 hover:scale-105 transition-transform z-40 group"
        title="Voice Assistant"
      >
        <Mic size={24} className="group-hover:scale-110 transition-transform" />
        <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity pointer-events-none border border-white/10">
          Voice Assistant
        </span>
      </button>

      {/* Modal Overlay */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-label="Voice Assistant"
        >
          <div className="glass-panel rounded-2xl w-full max-w-sm p-6 text-center relative" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button
              onClick={handleClose}
              aria-label="Close voice assistant"
              className="absolute top-4 right-4 p-1 text-gray-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            {/* Idle state */}
            {state === 'idle' && (
              <>
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center opacity-60">
                  <Mic size={32} className="text-white" />
                </div>
                <p className="text-white font-semibold mb-2">Ready to listen</p>
                <p className="text-gray-400 text-sm mb-4">Tap below or speak a command</p>
                <button
                  onClick={startListening}
                  className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Start Listening
                </button>
              </>
            )}

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
                  <p className="text-gray-300 text-sm mb-4">&quot;{transcript}&quot;</p>
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
                <div className="relative w-20 h-20 mx-auto mb-4">
                  <Loader size={32} className="text-purple-400 mx-auto animate-spin" />
                  <Sparkles size={16} className="text-indigo-400 absolute top-0 right-2 animate-pulse" />
                </div>
                <p className="text-white font-semibold mb-2">Thinking...</p>
                <p className="text-gray-400 text-sm">&quot;{transcript}&quot;</p>
              </>
            )}

            {/* Done state */}
            {state === 'done' && (
              <>
                <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-4" />
                <p className="text-white font-semibold mb-3">Iron Secretary</p>
                <p className="text-gray-300 text-sm mb-6 text-left">{response}</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={startListening}
                    className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1"
                  >
                    <Mic size={12} /> Continue
                  </button>
                  {onNavigateToVoice && (
                    <button
                      onClick={() => {
                        handleClose();
                        onNavigateToVoice();
                      }}
                      className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1"
                    >
                      <ExternalLink size={12} /> Full View
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
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={startListening}
                    className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1"
                  >
                    <RotateCcw size={12} /> Try Again
                  </button>
                  <button
                    onClick={handleClose}
                    className="text-xs bg-white/10 hover:bg-white/20 text-white px-4 py-1.5 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </>
            )}

            {/* Conversation indicator */}
            {conversationHistory.length > 0 && state !== 'idle' && (
              <div className="mt-4 pt-3 border-t border-white/5">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                  Conversation: {Math.floor(conversationHistory.length / 2)} exchanges
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceFAB;
