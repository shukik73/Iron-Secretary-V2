/**
 * Quick Capture — Supabase Edge Function
 *
 * Front door for the Hermes Bridge. Accepts a raw text capture from
 * the React UI (or voice / Telegram), parses intent via parse-utterance,
 * and — if the intent is a task or reminder — creates an agent_tasks
 * row, drops an agent_messages note to Jay, and logs the attempt to
 * jay_actions.
 *
 * Request:  POST { text: string, source?: 'web' | 'voice' | 'telegram' }
 * Auth:     Authorization: Bearer <user JWT>
 * Response: { capture_id, task_id?, message_id?, capture_type, message }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

type ParseResult = {
  intent: string;
  entities: Record<string, unknown>;
  confidence: number;
  requiresConfirmation: boolean;
  requiresClarification: boolean;
  clarificationQuestion?: string;
};

type CaptureType = 'note' | 'task' | 'reminder' | 'lead' | 'money' | 'search' | 'review' | 'unknown';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function localHeuristicType(text: string): CaptureType {
  const lower = text.toLowerCase().trim();
  if (lower.startsWith('task:') || /\b(task|todo)\b/.test(lower)) return 'task';
  if (/\bremind/.test(lower)) return 'reminder';
  if (lower.startsWith('$') || /\btip\b/.test(lower)) return 'money';
  if (/\b(search|find)\b/.test(lower)) return 'search';
  if (/\breview\b/.test(lower)) return 'review';
  return 'note';
}

function mapIntentToCaptureType(parse: ParseResult | null, text: string): CaptureType {
  // Local override takes precedence — matches existing FE heuristic.
  const lower = text.toLowerCase().trim();
  if (lower.startsWith('task:') || /\b(task|todo)\b/.test(lower)) return 'task';

  if (!parse) return localHeuristicType(text);

  switch (parse.intent) {
    case 'SET_REMINDER':
      return 'reminder';
    case 'LOG_TIP':
    case 'LOG_DEBT':
    case 'LOG_CASH_SALE':
    case 'RESOLVE_DEBT':
      return 'money';
    case 'DRAFT_SMS':
    case 'CREATE_ORDER':
      return 'task';
    case 'SEARCH_PARTS':
      return 'search';
    case 'QUERY':
    default:
      return localHeuristicType(text);
  }
}

async function callParseUtterance(userJwt: string, text: string): Promise<ParseResult | null> {
  if (!SUPABASE_URL) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/parse-utterance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userJwt}`,
      },
      body: JSON.stringify({ transcript: text }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as ParseResult;
    if (typeof data?.confidence !== 'number' || data.confidence < 0.5) return null;
    return data;
  } catch {
    return null;
  }
}

function buildTaskTitle(text: string): string {
  let title = text.trim();
  if (/^task:\s*/i.test(title)) title = title.replace(/^task:\s*/i, '');
  if (title.length > 200) title = title.slice(0, 197) + '...';
  return title;
}

async function failJayAction(
  admin: SupabaseClient,
  jayActionId: string | null,
  message: string,
): Promise<void> {
  if (!jayActionId) return;
  await admin
    .from('jay_actions')
    .update({ status: 'failed', error: message, completed_at: new Date().toISOString() })
    .eq('id', jayActionId);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'Missing Supabase secrets' }, 500);
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }
  const userJwt = authHeader.slice('Bearer '.length);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: userData, error: userErr } = await admin.auth.getUser(userJwt);
  if (userErr || !userData?.user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }
  const userId = userData.user.id;

  let body: { text?: unknown; source?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text || text.length > 2000) {
    return jsonResponse({ error: 'Invalid text (must be 1-2000 chars)' }, 400);
  }

  const sourceCandidate = typeof body.source === 'string' ? body.source : 'web';
  const source = (['web', 'voice', 'telegram'] as const).includes(sourceCandidate as never)
    ? (sourceCandidate as 'web' | 'voice' | 'telegram')
    : 'web';

  // User-scoped client so RLS applies to inserts.
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${userJwt}` } },
  });

  // 1. Insert the raw capture row.
  const { data: capture, error: captureErr } = await userClient
    .from('quick_captures')
    .insert({ raw_text: text, source, status: 'pending', capture_type: 'unknown' })
    .select('id')
    .single();

  if (captureErr || !capture) {
    return jsonResponse({ error: 'Failed to record capture' }, 500);
  }
  const captureId = capture.id as string;

  // 2. Open the jay_action ledger entry (service role — Jay's writes are not user-driven).
  const { data: action, error: actionErr } = await admin
    .from('jay_actions')
    .insert({
      user_id: userId,
      action_type: 'parse_capture',
      status: 'running',
      source_table: 'quick_captures',
      source_id: captureId,
      input: { text, source },
    })
    .select('id')
    .single();

  const jayActionId = (action?.id as string | undefined) ?? null;
  if (actionErr) {
    console.warn('quick-capture: jay_actions insert failed', actionErr.message);
  }

  try {
    // 3. Parse intent.
    const parse = await callParseUtterance(userJwt, text);
    const captureType = mapIntentToCaptureType(parse, text);

    // 4. Record parsed state.
    await userClient
      .from('quick_captures')
      .update({
        parsed_intent: parse,
        capture_type: captureType,
        status: 'parsed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', captureId);

    let taskId: string | null = null;
    let messageId: string | null = null;

    // 5. If actionable, create the task + nudge Jay.
    if (captureType === 'task' || captureType === 'reminder') {
      const title = buildTaskTitle(text);
      const description = text.length > title.length ? text : null;

      const { data: task, error: taskErr } = await userClient
        .from('agent_tasks')
        .insert({
          title,
          description,
          assignee: 'shuki',
          created_by: 'shuki',
          priority: 'medium',
          status: 'pending',
        })
        .select('id')
        .single();

      if (taskErr || !task) {
        throw new Error(`agent_tasks insert failed: ${taskErr?.message ?? 'unknown'}`);
      }
      taskId = task.id as string;

      const { data: message, error: msgErr } = await userClient
        .from('agent_messages')
        .insert({
          task_id: taskId,
          from_agent: 'shuki',
          to_agent: 'jay',
          message_type: 'status_update',
          subject: 'New capture',
          body: text,
        })
        .select('id')
        .single();

      if (msgErr) {
        console.warn('quick-capture: agent_messages insert failed', msgErr.message);
      } else {
        messageId = (message?.id as string | undefined) ?? null;
      }

      await userClient
        .from('quick_captures')
        .update({ status: 'converted' })
        .eq('id', captureId);
    }

    // 6. Close the jay_action ledger.
    if (jayActionId) {
      await admin
        .from('jay_actions')
        .update({
          status: 'done',
          completed_at: new Date().toISOString(),
          output: { capture_id: captureId, task_id: taskId, message_id: messageId, capture_type: captureType },
        })
        .eq('id', jayActionId);
    }

    return jsonResponse({
      capture_id: captureId,
      task_id: taskId,
      message_id: messageId,
      capture_type: captureType,
      message: 'Captured',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('quick-capture error:', msg);
    await userClient.from('quick_captures').update({ status: 'failed' }).eq('id', captureId);
    await failJayAction(admin, jayActionId, msg);
    return jsonResponse({ error: 'Capture processing failed', capture_id: captureId }, 500);
  }
});
