/**
 * Audio Feedback System — ported from Iron Secretary V1
 *
 * Provides earcon sounds and TTS for voice-first interactions.
 * Uses Web Audio API for earcons and Web Speech API for TTS.
 */

type Priority = 'critical' | 'high' | 'medium' | 'low' | 'immediate';

interface SpeakOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  cancel?: boolean;
}

class AudioFeedback {
  private sounds: Record<string, HTMLAudioElement | null> = {
    success: null,
    error: null,
    thinking: null,
  };
  private ttsEnabled = true;
  private ttsRate = 1.2;

  constructor() {
    // Audio elements are created lazily to avoid errors in non-browser environments
    if (typeof window !== 'undefined') {
      this.sounds = {
        success: new Audio('/sounds/chime.mp3'),
        error: new Audio('/sounds/buzz.mp3'),
        thinking: new Audio('/sounds/thinking.mp3'),
      };
      Object.values(this.sounds).forEach(audio => {
        if (audio) audio.volume = 0.5;
      });
    }
  }

  playSuccess(): void {
    this.sounds.success?.play().catch(() => {});
  }

  playError(): void {
    this.sounds.error?.play().catch(() => {});
  }

  playThinking(): void {
    this.sounds.thinking?.play().catch(() => {});
  }

  confirmMoney(amount: number, type = 'logged'): void {
    if (!this.ttsEnabled || !('speechSynthesis' in window)) return;

    const spokenAmount = amount.toFixed(2).replace('.', ' point ');
    this.speak(`${spokenAmount} dollars ${type}`);
  }

  speak(message: string, options: SpeakOptions = {}): void {
    if (!this.ttsEnabled || !('speechSynthesis' in window)) return;

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = options.rate ?? this.ttsRate;
    utterance.pitch = options.pitch ?? 1.0;
    utterance.volume = options.volume ?? 0.8;

    if (options.cancel !== false) {
      speechSynthesis.cancel();
    }
    speechSynthesis.speak(utterance);
  }

  confirmIntent(intent: string, entities: Record<string, any>): void {
    this.playSuccess();

    switch (intent) {
      case 'LOG_TIP':
        if (entities.amount) {
          this.confirmMoney(entities.amount, 'tip logged');
        }
        break;
      case 'LOG_DEBT':
        if (entities.amount && entities.person) {
          const direction = entities.direction === 'i_owe' ? 'you owe' : 'owes you';
          this.speak(`${entities.person} ${direction} ${entities.amount} dollars`);
        }
        break;
      case 'RESOLVE_DEBT':
        if (entities.person) {
          this.speak(`${entities.person} payment recorded`);
        }
        break;
      case 'SET_REMINDER':
        this.speak('Reminder set');
        break;
      default:
        break;
    }
  }

  confirmError(message = 'Sorry, try again'): void {
    this.playError();
    this.speak(message, { rate: 1.0 });
  }

  askClarification(question: string): void {
    this.playThinking();
    this.speak(question, { rate: 1.0 });
  }

  askConfirmation(question: string): void {
    this.playThinking();
    this.speak(question, { rate: 1.0 });
  }

  interrupt(message: string, priority: Priority = 'medium'): void {
    const options: SpeakOptions = {
      rate: priority === 'critical' ? 0.9 : 1.0,
      pitch: priority === 'critical' ? 0.95 : 1.0,
      volume: priority === 'low' ? 0.7 : 0.9,
      cancel: true,
    };

    if (priority === 'critical') {
      this.playError();
    } else if (priority === 'high') {
      this.playThinking();
    }

    this.speak(message, options);
  }

  setTTSEnabled(enabled: boolean): void {
    this.ttsEnabled = enabled;
  }

  setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    Object.values(this.sounds).forEach(audio => {
      if (audio) audio.volume = clamped;
    });
  }

  setTTSRate(rate: number): void {
    this.ttsRate = Math.max(0.5, Math.min(2, rate));
  }
}

export const audioFeedback = new AudioFeedback();
export type { Priority, SpeakOptions };
