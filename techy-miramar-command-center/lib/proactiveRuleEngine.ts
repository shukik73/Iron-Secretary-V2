/**
 * Proactive Rule Engine — ported from Iron Secretary V1
 *
 * CRITICAL: Iron may ONLY speak when one of the 10 triggers fires.
 * Outside these cases, Iron MUST remain silent.
 *
 * Triggers (priority order):
 *  3. Unsafe action detection (real-time)
 *  1. Overdue commitments
 *  2. Aging money owed (3+ days)
 *  4. Blocking tasks (parts not ordered)
 *  5. Customer-facing delays (pickup > 4 days)
 *  6. New info invalidates plans
 *  7. End of day closeout
 *  8. Costly patterns (3+ supplier issues in 30 days)
 *  9. Actionable summary request
 * 10. Quiet day (10% chance when nothing pending)
 */

import { supabase } from './supabase';

// ── Types ───────────────────────────────────────────────────

export type InterruptionPriority = 'critical' | 'high' | 'medium' | 'low' | 'immediate';

export interface Interruption {
  id: string;
  trigger: string;
  message: string;
  priority: InterruptionPriority;
  expectsResponse: boolean;
  data: Record<string, any>;
  action?: string;
  summaryType?: string;
  synchronous?: boolean;
  blocking?: boolean;
  timestamp: string;
}

export interface EvaluationContext {
  command?: string;
  pendingAction?: {
    action: string;
    entities?: Record<string, any>;
  };
  recentEvents?: Array<Record<string, any>>;
}

// ── Engine ──────────────────────────────────────────────────

class ProactiveRuleEngine {
  private userId: string;
  private activeInterruptions = new Set<string>();
  private firedTimestamps = new Map<string, Date>();

  constructor(userId: string) {
    this.userId = userId;
  }

  async evaluate(context: EvaluationContext = {}): Promise<Interruption | null> {
    if (!supabase) return null; // No DB connection → silent

    const now = new Date();
    const triggers = [
      () => this.checkUnsafeAction(context),
      () => this.checkOverdueCommitments(now),
      () => this.checkAgingDebts(now),
      () => this.checkBlockingTasks(),
      () => this.checkCustomerDelays(now),
      () => this.checkInvalidatedPlans(context),
      () => this.checkEndOfDay(context, now),
      () => this.checkCostlyPatterns(),
      () => this.checkActionableSummary(context),
      () => this.checkQuietDay(now),
    ];

    for (const trigger of triggers) {
      const result = await trigger();
      if (result && result.id && !this.hasRecentlyFired(result.id)) {
        return this.formatInterruption(result);
      }
    }

    return null; // SILENCE — no triggers fired
  }

  // ── Trigger 1: Overdue commitments ──────────────────────

  private async checkOverdueCommitments(now: Date): Promise<Partial<Interruption> | null> {
    const { data: reminders, error } = await supabase!
      .from('reminders')
      .select('*')
      .eq('user_id', this.userId)
      .eq('fired', false)
      .lte('remind_at', now.toISOString())
      .order('remind_at')
      .limit(1);

    if (error || !reminders?.length) return null;

    const reminder = reminders[0];
    const overdue = new Date(reminder.remind_at) < now;

    return {
      id: `commitment_${reminder.id}`,
      trigger: 'OVERDUE_COMMITMENT',
      priority: overdue ? 'high' : 'medium',
      message: overdue
        ? `You asked me to remind you to ${reminder.message}. That's overdue.`
        : `You asked me to remind you to ${reminder.message}. That's due now.`,
      data: reminder,
      action: 'mark_reminder_fired',
    };
  }

  // ── Trigger 2: Aging debts ──────────────────────────────

  private async checkAgingDebts(now: Date): Promise<Partial<Interruption> | null> {
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const { data: debts, error } = await supabase!
      .from('memory_events')
      .select('*')
      .eq('user_id', this.userId)
      .eq('event_type', 'debt')
      .eq('direction', 'owed_to_me')
      .lt('created_at', threeDaysAgo.toISOString())
      .order('created_at')
      .limit(1);

    if (error || !debts?.length) return null;

    const debt = debts[0];
    const daysSince = Math.floor((now.getTime() - new Date(debt.created_at).getTime()) / (24 * 60 * 60 * 1000));

    return {
      id: `aging_debt_${debt.person}_${debt.created_at}`,
      trigger: 'AGING_DEBT',
      priority: 'medium',
      message: `${debt.person} still owes you $${debt.amount}. It's been ${daysSince} days. Want to follow up?`,
      data: debt,
      expectsResponse: true,
    };
  }

  // ── Trigger 3: Unsafe actions (real-time) ───────────────

  private checkUnsafeAction(context: EvaluationContext): Partial<Interruption> | null {
    if (!context.pendingAction) return null;
    const { action, entities = {} } = context.pendingAction;

    if (entities.needsReference && !entities.resolved) {
      return {
        id: `unsafe_reference_${Date.now()}`,
        trigger: 'UNSAFE_ACTION',
        priority: 'critical',
        message: "I want to be careful — I'm not sure which customer you mean.",
        blocking: true,
      };
    }

    if (action === 'LOG_TIP' && entities.amount > 500 && !entities.confirmed) {
      return {
        id: `unsafe_amount_${Date.now()}`,
        trigger: 'UNSAFE_ACTION',
        priority: 'critical',
        message: `That's a large amount - $${entities.amount}. Let me confirm that's correct.`,
        blocking: true,
      };
    }

    if (action === 'DRAFT_SMS' && !entities.person && !entities.personResolved) {
      return {
        id: `unsafe_sms_${Date.now()}`,
        trigger: 'UNSAFE_ACTION',
        priority: 'critical',
        message: 'I need to know which customer to message first.',
        blocking: true,
      };
    }

    return null;
  }

  // ── Trigger 4: Blocking tasks ───────────────────────────

  private async checkBlockingTasks(): Promise<Partial<Interruption> | null> {
    const { data: waitingRepairs, error } = await supabase!
      .from('repairs')
      .select('*')
      .eq('user_id', this.userId)
      .eq('status', 'waiting_parts')
      .order('created_at');

    if (error || !waitingRepairs?.length) return null;

    if (waitingRepairs.length >= 2) {
      return {
        id: `blocking_parts_${waitingRepairs.length}`,
        trigger: 'BLOCKING_TASK',
        priority: 'high',
        message: `${waitingRepairs.length} repairs are waiting for parts. Check if anything needs ordering.`,
        data: { count: waitingRepairs.length },
      };
    }

    return null;
  }

  // ── Trigger 5: Customer-facing delays ───────────────────

  private async checkCustomerDelays(now: Date): Promise<Partial<Interruption> | null> {
    const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);

    const { data: uncollected, error } = await supabase!
      .from('repairs')
      .select('*, lead:leads(*)')
      .eq('user_id', this.userId)
      .eq('status', 'done')
      .lt('completed_at', fourDaysAgo.toISOString())
      .order('completed_at')
      .limit(1);

    if (error || !uncollected?.length) return null;

    const repair = uncollected[0];
    const daysSince = Math.floor((now.getTime() - new Date(repair.completed_at).getTime()) / (24 * 60 * 60 * 1000));

    return {
      id: `uncollected_${repair.id}`,
      trigger: 'CUSTOMER_DELAY',
      priority: 'high',
      message: `A ${repair.device_type} repair has been done for ${daysSince} days and not picked up. Want to text the customer?`,
      data: repair,
      expectsResponse: true,
    };
  }

  // ── Trigger 6: Invalidated plans ────────────────────────

  private async checkInvalidatedPlans(context: EvaluationContext): Promise<Partial<Interruption> | null> {
    if (!context.recentEvents?.length) return null;

    for (const event of context.recentEvents.slice(0, 5)) {
      if (event.type === 'missed_call' && event.caller) {
        const { data: debts } = await supabase!
          .from('memory_events')
          .select('*')
          .eq('user_id', this.userId)
          .eq('event_type', 'debt')
          .eq('person', event.caller)
          .eq('direction', 'owed_to_me')
          .limit(1);

        if (debts?.length && debts[0].amount > 0) {
          return {
            id: `missed_call_debt_${event.caller}_${event.timestamp}`,
            trigger: 'INVALIDATED_PLAN',
            priority: 'medium',
            message: `You missed a call from ${event.caller}. They still owe $${debts[0].amount}. Want to call back?`,
            data: { event, debt: debts[0] },
            expectsResponse: true,
          };
        }
      }
    }

    return null;
  }

  // ── Trigger 7: End of day ───────────────────────────────

  private async checkEndOfDay(context: EvaluationContext, now: Date): Promise<Partial<Interruption> | null> {
    const hour = now.getHours();
    const isCloseout = context.command === 'closeout' || context.command === 'end day' || hour === 18;
    if (!isCloseout) return null;

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const { data: tips } = await supabase!
      .from('memory_events')
      .select('amount')
      .eq('user_id', this.userId)
      .eq('event_type', 'tip')
      .gte('created_at', todayStart.toISOString());

    const tipTotal = tips?.reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;

    const { data: openRepairs } = await supabase!
      .from('repairs')
      .select('id')
      .eq('user_id', this.userId)
      .in('status', ['intake', 'diagnosing', 'waiting_parts', 'in_progress']);

    const openCount = openRepairs?.length ?? 0;

    let message = `Today: $${tipTotal} in tips.`;
    if (openCount > 0) {
      message += ` ${openCount === 1 ? 'One repair is' : `${openCount} repairs are`} still open.`;
    }

    return {
      id: `closeout_${now.toISOString().split('T')[0]}`,
      trigger: 'END_OF_DAY',
      priority: 'medium',
      message,
      data: { tips: tipTotal, openRepairs: openCount },
    };
  }

  // ── Trigger 8: Costly patterns ──────────────────────────

  private async checkCostlyPatterns(): Promise<Partial<Interruption> | null> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const { data: issues } = await supabase!
      .from('memory_events')
      .select('*')
      .eq('user_id', this.userId)
      .eq('event_type', 'supplier_issue')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (!issues || issues.length < 3) return null;

    const bySupplier: Record<string, number> = {};
    for (const issue of issues) {
      const supplier = issue.entities?.supplier;
      if (supplier) {
        bySupplier[supplier] = (bySupplier[supplier] || 0) + 1;
      }
    }

    for (const [supplier, count] of Object.entries(bySupplier)) {
      if (count >= 3) {
        return {
          id: `pattern_supplier_${supplier}`,
          trigger: 'COSTLY_PATTERN',
          priority: 'medium',
          message: `This is the ${count === 3 ? 'third' : count + 'th'} time ${supplier} sent the wrong part.`,
          data: { supplier, issueCount: count },
        };
      }
    }

    return null;
  }

  // ── Trigger 9: Actionable summary ───────────────────────

  private checkActionableSummary(context: EvaluationContext): Partial<Interruption> | null {
    if (!context.command) return null;

    const summaryCommands: Record<string, string> = {
      'how much did i make': 'tips',
      'who owes me money': 'debts',
      "what's still open": 'open_repairs',
      'what do i have to do': 'tasks',
    };

    const requested = summaryCommands[context.command.toLowerCase()];
    if (!requested) return null;

    return {
      id: `summary_${requested}_${Date.now()}`,
      trigger: 'ACTIONABLE_SUMMARY',
      priority: 'immediate',
      summaryType: requested,
      synchronous: true,
    };
  }

  // ── Trigger 10: Quiet day ───────────────────────────────

  private async checkQuietDay(now: Date): Promise<Partial<Interruption> | null> {
    const hour = now.getHours();
    if (hour < 10 || hour > 16) return null;

    const { data: pendingReminders } = await supabase!
      .from('reminders')
      .select('id')
      .eq('user_id', this.userId)
      .eq('fired', false)
      .gte('remind_at', now.toISOString())
      .limit(1);

    const { data: openRepairs } = await supabase!
      .from('repairs')
      .select('id')
      .eq('user_id', this.userId)
      .in('status', ['intake', 'in_progress'])
      .limit(1);

    const hasWork = (pendingReminders?.length ?? 0) > 0 || (openRepairs?.length ?? 0) > 0;

    if (!hasWork && Math.random() < 0.1) {
      return {
        id: `quiet_${now.toISOString()}`,
        trigger: 'QUIET_DAY',
        priority: 'low',
        message: "Nothing urgent right now. Anything you want me to remember?",
        expectsResponse: true,
      };
    }

    return null;
  }

  // ── Helpers ─────────────────────────────────────────────

  private formatInterruption(result: Partial<Interruption>): Interruption {
    this.activeInterruptions.add(result.id!);

    return {
      id: result.id!,
      trigger: result.trigger!,
      message: result.message ?? '',
      priority: result.priority ?? 'medium',
      expectsResponse: result.expectsResponse ?? false,
      data: result.data ?? {},
      action: result.action,
      summaryType: result.summaryType,
      synchronous: result.synchronous,
      blocking: result.blocking,
      timestamp: new Date().toISOString(),
    };
  }

  private hasRecentlyFired(id: string): boolean {
    const lastFired = this.firedTimestamps.get(id);
    const now = new Date();

    if (lastFired && now.getTime() - lastFired.getTime() < 60 * 60 * 1000) {
      return true;
    }

    this.firedTimestamps.set(id, now);
    return false;
  }

  markHandled(interruptionId: string): void {
    this.activeInterruptions.delete(interruptionId);
  }
}

// Singleton factory
let engineInstance: ProactiveRuleEngine | null = null;

export function getProactiveEngine(userId: string): ProactiveRuleEngine {
  if (!engineInstance || (engineInstance as any).userId !== userId) {
    engineInstance = new ProactiveRuleEngine(userId);
  }
  return engineInstance;
}
