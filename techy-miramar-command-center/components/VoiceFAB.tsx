import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, X, ExternalLink, CheckCircle2, Loader, RotateCcw } from 'lucide-react';
import { matchCommand, getResponse } from '../lib/voiceCommands';

interface VoiceFABProps {
  onNavigateToVoice?: () => void;
}

type ModalState = 'idle' | 'listening' | 'processing' | 'done' | 'error';

const VoiceFAB: React.FC<VoiceFABProps> = ({ onNavigateToVoice }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [state, setState] = useState<ModalState>('idle');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const stateRef = useRef<ModalState>('idle');
  const transcriptRef = useRef('');

  // Keep refs in sync so callbacks always see current values
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  const processCommand = useCallback((text: string) => {
    setState('processing');
    const match = matchCommand(text);

    setTimeout(() => {
      const responseText = getResponse(match?.type ?? null, text);
      setResponse(responseText);
      setState('done');

      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(responseText);
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    }, 500);
  }, []);

  const startListening = useCallback(() => {
    setModalOpen(true);
    setState('listening');
    setTranscript('');
    setResponse('');

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setState('error');
      setResponse('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
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
        setResponse(`Error: ${event.error}. Please try again.`);
      };

      recognition.onend = () => {
        // Use refs to avoid stale closure
        if (stateRef.current === 'listening' && !transcriptRef.current) {
          setState('idle');
          setModalOpen(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setState('error');
      setResponse('Could not start speech recognition. Check microphone permissions.');
    }
  }, [processCommand]);

  const handleClose = useCallback(() => {
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
  }, []);

  const handleRetry = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setState('listening');
    setTranscript('');
    setResponse('');

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    try {
      const recognition = new SpeechRecognitionAPI();
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
        setResponse(`Error: ${event.error}. Please try again.`);
      };

      recognition.onend = () => {
        if (stateRef.current === 'listening' && !transcriptRef.current) {
          setState('idle');
          setModalOpen(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setState('error');
      setResponse('Could not restart speech recognition.');
    }
  }, [processCommand]);

  // Escape key closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalOpen) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen, handleClose]);

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
        aria-label="Open voice command"
      >
        <Mic size={24} className="group-hover:scale-110 transition-transform" />
        <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity pointer-events-none border border-white/10">
          Voice Command
        </span>
      </button>

      {/* Modal Overlay */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-label="Voice command modal"
        >
          <div
            className="glass-panel rounded-2xl w-full max-w-sm p-6 text-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-1 text-gray-500 hover:text-white transition-colors"
              aria-label="Close voice modal"
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
                  onClick={handleClose}
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
                  <button
                    onClick={handleRetry}
                    className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1"
                    aria-label="Try another voice command"
                  >
                    <RotateCcw size={12} /> Try Again
                  </button>
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
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleRetry}
                    className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1"
                    aria-label="Try again"
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
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceFAB;
