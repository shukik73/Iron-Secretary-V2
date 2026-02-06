/**
 * AI Chat client — sends user messages to a Supabase Edge Function
 * that proxies to OpenAI / Claude. Falls back to mock responses
 * when the backend isn't configured.
 */

import { supabase } from './supabase';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are Iron Secretary, a proactive AI assistant for Techy Miramar — a phone & laptop repair shop in Miami.

Your capabilities:
- Track repairs, leads, and customer tickets
- Monitor Midas (parts arbitrage alerts on eBay / Facebook Marketplace)
- Manage Emilio (cold email outreach engine)
- Queue Night Shift tasks for Claude to run overnight
- Check revenue, reviews, and daily metrics

Be concise, friendly, and action-oriented. When the user asks you to do something, confirm the action and any details. Use dollar amounts, names, and specifics from the business context. If you don't have real data, acknowledge it and suggest next steps.`;

/**
 * Send a message to the AI backend and get a streamed or full response.
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  onChunk?: (text: string) => void
): Promise<string> {
  // Try Supabase Edge Function first
  if (supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        },
      });

      if (!error && data?.response) {
        if (onChunk) onChunk(data.response);
        return data.response;
      }
    } catch {
      // Fall through to mock
    }
  }

  // Fallback: mock AI response
  return generateMockResponse(messages[messages.length - 1]?.content ?? '');
}

function generateMockResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase();

  if (lower.includes('repair') || lower.includes('ticket') || lower.includes('fix'))
    return '4 active repairs right now. John D\'s iPhone 14 Pro has been in diagnosing for 52 hours — that\'s past our 48h SLA. Want me to escalate it?';

  if (lower.includes('lead') || lower.includes('customer') || lower.includes('walk'))
    return 'I\'ll create a new lead. What\'s the customer name, device, and issue? You can also just say it all at once like "Maria, Galaxy S24, won\'t charge."';

  if (lower.includes('midas') || lower.includes('deal') || lower.includes('ebay') || lower.includes('buy'))
    return '1 hot deal right now: MacBook Pro 15" 2015 on eBay for $95. Estimated part yield is $310, giving us a $215 margin. Buy rules pass. Want me to flag it for purchase?';

  if (lower.includes('email') || lower.includes('emilio') || lower.includes('outreach'))
    return 'Emilio stats: 247 sent this week, 29% open rate (above 25% target), 3.2% reply rate. 3 warm leads in the pipeline. The "Repair Shops" campaign is performing best.';

  if (lower.includes('revenue') || lower.includes('money') || lower.includes('sales'))
    return '$13,200 this month — 101% of our $13k target. Repair revenue: $10,400. Refurb: $2,800. We\'re on track.';

  if (lower.includes('review') || lower.includes('google') || lower.includes('star'))
    return '3 Google reviews waiting for response. 2 are 5-star (from this week\'s repairs), 1 is a 2-star complaint about wait time. Want me to draft responses?';

  if (lower.includes('task') || lower.includes('night') || lower.includes('claude') || lower.includes('queue'))
    return 'I can queue a Night Shift task for Claude. What type? Code (implement features), Content (blog posts, emails), Research (market analysis), or Audit (code review)?';

  if (lower.includes('hello') || lower.includes('hey') || lower.includes('hi') || lower.includes('good'))
    return 'Hey! I\'m Iron Secretary, your AI ops assistant. I can check repairs, monitor Midas deals, review Emilio campaigns, or queue overnight tasks. What do you need?';

  return `Got it: "${userMessage}". I don't have a live backend connected yet, but once Supabase Edge Functions are deployed, I'll be able to take real actions. For now, try asking about repairs, Midas deals, Emilio stats, or revenue.`;
}
