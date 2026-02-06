// ── Shared Voice Command definitions & matching ─────────────────────────

export interface VoiceCommandDef {
  type: string;
  patterns: string[];
  description: string;
}

export const VOICE_COMMANDS: VoiceCommandDef[] = [
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

export const MOCK_RESPONSES: Record<string, string> = {
  add_lead: "Lead #248 created for Maria — Samsung Galaxy S24 — Won't charge. Telegram alert sent.",
  check_repairs: "4 active repairs. 1 urgent: John D's iPhone 14 has been in diagnosing for 52 hours.",
  schedule_pickup: 'Marked MacBook Pro for Sarah as done. Pickup notification will send automatically.',
  check_midas: '1 hot deal: MacBook Pro 15" 2015 on eBay for $95 — estimated margin $215. Buy rules pass.',
  emilio_stats: '247 sent this week. 34% open rate, 4.2% reply rate. 3 demos booked.',
  check_revenue: '$13,200 this month — 101% of $13,000 target. Repair: $10,400. Refurb: $2,800.',
  check_reviews: '3 reviews waiting for response approval. 2 positive (5-star), 1 negative (2-star).',
  queue_task: 'What type of task? Code, content, research, or audit? Say the type to continue.',
  read_alerts: '2 alerts. Critical: John D ticket stalled over 48 hours. Warning: ReviewGuard demo in 15 minutes.',
};

export interface MatchResult {
  type: string;
  confidence: number;
}

export function matchCommand(transcript: string): MatchResult | null {
  const lower = transcript.toLowerCase().trim();
  if (!lower) return null;

  let bestMatch: MatchResult | null = null;

  for (const cmd of VOICE_COMMANDS) {
    for (const pattern of cmd.patterns) {
      if (lower.includes(pattern)) {
        const confidence = Math.min(pattern.length / lower.length, 1);
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { type: cmd.type, confidence };
        }
      }
    }
  }

  return bestMatch;
}

export function getResponse(matchType: string | null, transcript: string): string {
  if (matchType) {
    return MOCK_RESPONSES[matchType] || 'Command recognized but no handler available yet.';
  }
  return `I heard: "${transcript}". I'm not sure what action to take. Try one of the quick commands, or rephrase your request.`;
}

export const QUICK_COMMANDS = [
  { label: 'Add a new lead', command: 'add a new lead' },
  { label: 'What repairs are pending?', command: 'what repairs are pending' },
  { label: 'Check Midas alerts', command: 'check midas alerts' },
  { label: 'How many emails sent today?', command: 'how many emails sent today' },
  { label: 'Schedule a pickup', command: 'schedule a pickup' },
  { label: 'Show revenue this month', command: 'show revenue this month' },
  { label: 'Queue a Claude task', command: 'queue a claude task' },
  { label: "Read me today's critical alerts", command: "read me today's critical alerts" },
];
