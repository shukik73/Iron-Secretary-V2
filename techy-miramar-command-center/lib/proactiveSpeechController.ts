/**
 * Proactive Speech Controller — ported from Iron Secretary V1
 *
 * Orchestrates proactive speech by evaluating the rule engine every 60 seconds
 * and delivering interruptions via audio feedback.
 *
 * CRITICAL: Iron MUST remain silent unless a trigger fires.
 */

import { useState, useEffect } from 'react';
import { getProactiveEngine, type Interruption, type EvaluationContext } from './proactiveRuleEngine';
import { audioFeedback } from './audioFeedback';
import { supabase } from './supabase';

class ProactiveSpeechController {
  private userId: string;
  private engine: ReturnType<typeof getProactiveEngine>;
  private evaluationInterval: ReturnType<typeof setInterval> | null = null;
  private lastInterruption: Interruption | null = null;
  private isEnabled = true;

  constructor(userId: string) {
    this.userId = userId;
    this.engine = getProactiveEngine(userId);
  }

  startMonitoring(): void {
    if (this.evaluationInterval) return;

    this.evaluationInterval = setInterval(async () => {
      if (!this.isEnabled) return;
      await this.evaluateInterruptions();
    }, 60_000);

    // Initial evaluation
    this.evaluateInterruptions();
  }

  stopMonitoring(): void {
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
      this.evaluationInterval = null;
    }
  }

  async evaluateInterruptions(context: EvaluationContext = {}): Promise<Interruption | null> {
    const fullContext = await this.gatherContext(context);
    const interruption = await this.engine.evaluate(fullContext);

    if (!interruption) return null;
    return this.deliverInterruption(interruption);
  }

  private async deliverInterruption(interruption: Interruption): Promise<Interruption | null> {
    if (this.lastInterruption?.id === interruption.id) return null;

    this.lastInterruption = interruption;

    await this.logInterruption(interruption);
    audioFeedback.interrupt(interruption.message, interruption.priority);

    if (interruption.action) {
      await this.handleInterruptionAction(interruption);
    }

    return interruption;
  }

  async checkRealTimeEvent(event: Record<string, any>): Promise<Interruption | null> {
    if (!this.isEnabled) return null;

    const context: EvaluationContext = { pendingAction: event as any };
    const interruption = await this.engine.evaluate(context);

    if (interruption?.trigger === 'UNSAFE_ACTION') {
      return this.deliverInterruption(interruption);
    }

    return null;
  }

  async handleUserCommand(command: string): Promise<Interruption | null> {
    const context: EvaluationContext = { command };
    const interruption = await this.engine.evaluate(context);

    if (interruption?.trigger === 'ACTIONABLE_SUMMARY' && interruption.summaryType) {
      const summary = await this.generateSummary(interruption.summaryType);
      audioFeedback.speak(summary);
      return { ...interruption, message: summary };
    }

    return null;
  }

  private async gatherContext(additional: EvaluationContext = {}): Promise<EvaluationContext> {
    if (!supabase) return { ...additional };

    const { data: recentEvents } = await supabase
      .from('memory_events')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      ...additional,
      recentEvents: recentEvents ?? [],
    };
  }

  private async generateSummary(summaryType: string): Promise<string> {
    if (!supabase) return 'Database not connected.';

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    switch (summaryType) {
      case 'tips': {
        const { data: tips } = await supabase
          .from('memory_events')
          .select('amount')
          .eq('user_id', this.userId)
          .eq('event_type', 'tip')
          .gte('created_at', todayStart.toISOString());

        const total = tips?.reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;
        return `$${total} in tips today. ${tips?.length ?? 0} total.`;
      }

      case 'debts': {
        const { data: debts } = await supabase
          .from('memory_events')
          .select('*')
          .eq('user_id', this.userId)
          .eq('event_type', 'debt')
          .eq('direction', 'owed_to_me');

        if (!debts?.length) return "Nobody owes you money right now.";

        const total = debts.reduce((sum, d) => sum + Number(d.amount), 0);
        const people = debts.slice(0, 3).map(d => d.person).join(', ');
        return debts.length <= 3
          ? `${people} owe you $${total} total.`
          : `${people} and ${debts.length - 3} others owe you $${total}.`;
      }

      case 'open_repairs': {
        const { data: repairs } = await supabase
          .from('repairs')
          .select('device_type, status')
          .eq('user_id', this.userId)
          .in('status', ['intake', 'diagnosing', 'waiting_parts', 'in_progress']);

        if (!repairs?.length) return "No open repairs right now.";

        const byStatus: Record<string, number> = {};
        repairs.forEach(r => {
          byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
        });

        const parts = [];
        if (byStatus.in_progress) parts.push(`${byStatus.in_progress} in progress`);
        if (byStatus.waiting_parts) parts.push(`${byStatus.waiting_parts} waiting for parts`);
        if (byStatus.diagnosing) parts.push(`${byStatus.diagnosing} diagnosing`);
        if (byStatus.intake) parts.push(`${byStatus.intake} at intake`);

        return `${repairs.length} open repairs: ${parts.join(', ')}.`;
      }

      default:
        return "I'm not sure what you're asking about.";
    }
  }

  private async handleInterruptionAction(interruption: Interruption): Promise<void> {
    if (!supabase) return;

    switch (interruption.action) {
      case 'mark_reminder_fired':
        if (interruption.data?.id) {
          await supabase
            .from('reminders')
            .update({ fired: true, fired_at: new Date().toISOString() })
            .eq('id', interruption.data.id);
        }
        break;
    }
  }

  private async logInterruption(interruption: Interruption): Promise<void> {
    if (!supabase) return;

    await supabase.from('memory_events').insert({
      user_id: this.userId,
      event_type: 'assistant_interruption',
      entities: {
        trigger: interruption.trigger,
        message: interruption.message,
        priority: interruption.priority,
      },
      raw_text: interruption.message,
    });
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  async handleInterruptionResponse(interruptionId: string, response: string): Promise<void> {
    this.engine.markHandled(interruptionId);

    if (!supabase) return;

    await supabase.from('memory_events').insert({
      user_id: this.userId,
      event_type: 'interruption_response',
      entities: { interruption_id: interruptionId, response },
      raw_text: response,
    });
  }
}

// Singleton factory
let controllerInstance: ProactiveSpeechController | null = null;

function getController(userId: string): ProactiveSpeechController {
  if (!controllerInstance || (controllerInstance as any).userId !== userId) {
    controllerInstance = new ProactiveSpeechController(userId);
  }
  return controllerInstance;
}

/**
 * React hook for proactive speech integration.
 * Starts monitoring on mount and stops on unmount.
 */
export function useProactiveSpeech(userId: string | null) {
  const [controller, setController] = useState<ProactiveSpeechController | null>(null);
  const [lastInterruption, setLastInterruption] = useState<Interruption | null>(null);

  useEffect(() => {
    if (!userId) return;

    const ctrl = getController(userId);
    setController(ctrl);
    ctrl.startMonitoring();

    return () => {
      ctrl.stopMonitoring();
    };
  }, [userId]);

  return {
    controller,
    lastInterruption,
    checkRealTimeEvent: (event: Record<string, any>) => controller?.checkRealTimeEvent(event) ?? null,
    handleUserCommand: (command: string) => controller?.handleUserCommand(command) ?? null,
    handleResponse: (id: string, response: string) => controller?.handleInterruptionResponse(id, response),
  };
}
