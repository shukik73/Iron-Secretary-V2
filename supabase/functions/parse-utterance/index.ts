/**
 * Parse Utterance — Supabase Edge Function
 * Ported from Iron Secretary V1
 *
 * Receives a voice transcript and returns structured intent + entities.
 * Uses OpenAI GPT for NLP, with regex fallback for common patterns.
 *
 * Intents: LOG_TIP, LOG_DEBT, RESOLVE_DEBT, SET_REMINDER, CREATE_ORDER,
 *          DRAFT_SMS, SEARCH_PARTS, LOG_CASH_SALE, QUERY
 *
 * Setup:
 *   supabase secrets set OPENAI_API_KEY=sk-...
 *   supabase functions deploy parse-utterance
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabaseAdmin = createClient(
  SUPABASE_URL ?? 'http://localhost',
  SUPABASE_SERVICE_ROLE_KEY ?? 'missing-service-role-key'
);

interface ParseResult {
  intent: string;
  entities: Record<string, any>;
  confidence: number;
  requiresConfirmation: boolean;
  requiresClarification: boolean;
  clarificationQuestion?: string;
}

async function requireAuth(req: Request): Promise<Response | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY secret' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const authorization = req.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const token = authorization.slice('Bearer '.length);
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return null;
}

// ── Pattern matching fallback ───────────────────────────────
const PATTERNS: Array<{ regex: RegExp; intent: string; extract: (m: RegExpMatchArray) => Record<string, any> }> = [
  {
    regex: /(got|received|made)\s+(?:one\s+)?\$?(\d+(?:\.\d{2})?)\s*(?:in\s+)?tip/i,
    intent: 'LOG_TIP',
    extract: (m) => ({ amount: parseFloat(m[2]) }),
  },
  {
    regex: /(\w+)\s+owes?\s+(?:me\s+)?\$?(\d+(?:\.\d{2})?)/i,
    intent: 'LOG_DEBT',
    extract: (m) => ({ person: m[1], amount: parseFloat(m[2]), direction: 'owed_to_me' }),
  },
  {
    regex: /i\s+owe\s+(\w+)\s+\$?(\d+(?:\.\d{2})?)/i,
    intent: 'LOG_DEBT',
    extract: (m) => ({ person: m[1], amount: parseFloat(m[2]), direction: 'i_owe' }),
  },
  {
    regex: /(\w+)\s+paid\s+(?:me\s+)?\$?(\d+(?:\.\d{2})?)/i,
    intent: 'RESOLVE_DEBT',
    extract: (m) => ({ person: m[1], amount: parseFloat(m[2]) }),
  },
  {
    regex: /remind\s+me\s+(.+)/i,
    intent: 'SET_REMINDER',
    extract: (m) => ({ rawReminder: m[1] }),
  },
  {
    regex: /(?:text|message|sms)\s+(\w+)\s+(.+)/i,
    intent: 'DRAFT_SMS',
    extract: (m) => ({ person: m[1], message: m[2] }),
  },
  {
    regex: /search\s+(?:for\s+)?(.+)/i,
    intent: 'SEARCH_PARTS',
    extract: (m) => ({ query: m[1] }),
  },
];

function patternMatch(transcript: string): ParseResult | null {
  for (const { regex, intent, extract } of PATTERNS) {
    const match = transcript.match(regex);
    if (match) {
      const entities = extract(match);
      const requiresConfirmation = ['LOG_TIP', 'LOG_DEBT', 'RESOLVE_DEBT', 'DRAFT_SMS'].includes(intent);
      return {
        intent,
        entities,
        confidence: 0.85,
        requiresConfirmation,
        requiresClarification: false,
      };
    }
  }
  return null;
}

// ── OpenAI parsing ──────────────────────────────────────────
async function parseWithAI(transcript: string): Promise<ParseResult> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    return {
      intent: 'QUERY',
      entities: { raw: transcript },
      confidence: 0.5,
      requiresConfirmation: false,
      requiresClarification: true,
      clarificationQuestion: 'AI parsing unavailable. What would you like me to do?',
    };
  }

  const systemPrompt = `You are a repair shop assistant parser. Given a voice transcript, extract:
- intent: LOG_TIP, LOG_DEBT, RESOLVE_DEBT, SET_REMINDER, CREATE_ORDER, DRAFT_SMS, SEARCH_PARTS, LOG_CASH_SALE, QUERY
- entities: amount (number), person (string), direction (owed_to_me|i_owe), rawReminder (string), query (string)
- confidence: 0-1
- requiresConfirmation: true for money/messaging actions
- requiresClarification: true if missing key info
- clarificationQuestion: what to ask if unclear
Return valid JSON only.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: Deno.env.get('AI_MODEL') ?? 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript },
      ],
      temperature: 0.1,
      max_tokens: 300,
    }),
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  try {
    return JSON.parse(content);
  } catch {
    return {
      intent: 'QUERY',
      entities: { raw: transcript },
      confidence: 0.3,
      requiresConfirmation: false,
      requiresClarification: true,
      clarificationQuestion: "I didn't understand that. Could you rephrase?",
    };
  }
}

// ── Handler ─────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const authError = await requireAuth(req);
    if (authError) return authError;

    const { transcript } = await req.json();

    if (!transcript || typeof transcript !== 'string' || transcript.length > 1000) {
      return new Response(
        JSON.stringify({ error: 'Invalid transcript' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Try pattern matching first (fast, no API cost)
    const patternResult = patternMatch(transcript);
    if (patternResult && patternResult.confidence >= 0.8) {
      return new Response(
        JSON.stringify(patternResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Fall back to AI parsing
    const aiResult = await parseWithAI(transcript);

    return new Response(
      JSON.stringify(aiResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
