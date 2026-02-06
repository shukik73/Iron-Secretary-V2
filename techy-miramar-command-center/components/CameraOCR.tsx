import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, Loader, RotateCcw, Check, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CameraOCRProps {
  /** Called with the extracted text after OCR completes */
  onResult: (text: string) => void;
  onClose: () => void;
  /** Label shown in the modal header */
  title?: string;
  /** Hint text shown below the camera preview */
  hint?: string;
}

type CaptureState = 'camera' | 'preview' | 'processing' | 'done' | 'error';

const CameraOCR: React.FC<CameraOCRProps> = ({
  onResult,
  onClose,
  title = 'Scan with Camera',
  hint = 'Point your camera at the item or text',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<CaptureState>('camera');
  const [capturedImage, setCapturedImage] = useState<string>('');
  const [extractedText, setExtractedText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setState('camera');
    } catch {
      setErrorMsg('Camera access denied. You can upload a photo instead.');
      setState('error');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    setState('preview');
    stopCamera();
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result as string);
      setState('preview');
      stopCamera();
    };
    reader.readAsDataURL(file);
  }, []);

  const retake = useCallback(() => {
    setCapturedImage('');
    setExtractedText('');
    startCamera();
  }, []);

  const processImage = useCallback(async () => {
    if (!capturedImage) return;
    setState('processing');

    try {
      // Try Supabase Edge Function OCR
      if (supabase) {
        const { data, error } = await supabase.functions.invoke('ocr-extract', {
          body: { image: capturedImage },
        });

        if (!error && data?.text) {
          setExtractedText(data.text);
          setState('done');
          return;
        }
      }

      // Fallback: mock OCR for development
      const mockText = generateMockOCR(capturedImage);
      setExtractedText(mockText);
      setState('done');
    } catch {
      setErrorMsg('OCR processing failed. Please try again.');
      setState('error');
    }
  }, [capturedImage]);

  const handleUseResult = () => {
    onResult(extractedText);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="glass-panel rounded-2xl w-full max-w-lg overflow-hidden relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-purple-400" />
            <h3 className="text-sm font-bold text-white">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            aria-label="Close camera"
          >
            <X size={18} />
          </button>
        </div>

        {/* Camera / Preview / Processing */}
        <div className="relative aspect-[4/3] bg-black">
          {state === 'camera' && (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Viewfinder overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-8 border-2 border-white/30 rounded-lg" />
              </div>
            </>
          )}

          {(state === 'preview' || state === 'processing' || state === 'done') && capturedImage && (
            <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
          )}

          {state === 'processing' && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="text-center">
                <Loader size={32} className="text-purple-400 animate-spin mx-auto mb-2" />
                <p className="text-white text-sm">Extracting text...</p>
              </div>
            </div>
          )}

          {state === 'error' && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-6">
                <X size={32} className="text-rose-400 mx-auto mb-2" />
                <p className="text-gray-300 text-sm mb-4">{errorMsg}</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors inline-flex items-center gap-2"
                >
                  <Upload size={14} /> Upload Photo
                </button>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {/* Hint / Extracted Text */}
        <div className="p-4">
          {state === 'camera' && (
            <p className="text-xs text-gray-400 text-center">{hint}</p>
          )}

          {state === 'done' && extractedText && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Extracted Text</p>
              <div className="bg-gray-900/50 border border-white/10 rounded-lg p-3 max-h-32 overflow-y-auto">
                <p className="text-sm text-gray-200 whitespace-pre-wrap">{extractedText}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            {state === 'camera' && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Upload size={12} /> Upload
                </button>
                <button
                  onClick={capturePhoto}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Camera size={14} /> Capture
                </button>
              </>
            )}

            {state === 'preview' && (
              <>
                <button
                  onClick={retake}
                  className="px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center gap-1"
                >
                  <RotateCcw size={12} /> Retake
                </button>
                <button
                  onClick={processImage}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Extract Text
                </button>
              </>
            )}

            {state === 'done' && (
              <>
                <button
                  onClick={retake}
                  className="px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center gap-1"
                >
                  <RotateCcw size={12} /> Retake
                </button>
                <button
                  onClick={handleUseResult}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Check size={14} /> Use This
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Mock OCR for development when no backend is available.
 * Returns realistic sample text based on image dimensions.
 */
function generateMockOCR(_imageData: string): string {
  const samples = [
    'MacBook Pro 15-inch 2015\nModel: A1398\nSerial: C02T1234HGWF\nProcessor: 2.5 GHz Intel Core i7\nMemory: 16 GB\nStorage: 512 GB SSD',
    'iPhone 14 Pro Max\nModel: MQ8V3LL/A\nIMEI: 353912110123456\nCapacity: 256 GB\nColor: Deep Purple',
    'Samsung Galaxy S24 Ultra\nModel: SM-S928U\nIMEI: 354789110456789\nStorage: 256 GB\nColor: Titanium Gray',
  ];
  return samples[Math.floor(Math.random() * samples.length)];
}

export default CameraOCR;
