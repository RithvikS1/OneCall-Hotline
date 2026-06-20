import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function upsertCaller(phone: string, zipCode?: string) {
  const { data, error } = await supabase
    .from('callers')
    .upsert({ phone, ...(zipCode ? { zip_code: zipCode, updated_at: new Date().toISOString() } : {}) }, { onConflict: 'phone' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createCallSession(params: {
  callerId: string;
  twilioCallSid: string;
  fromPhone: string;
  toPhone: string;
}) {
  const { data, error } = await supabase
    .from('call_sessions')
    .insert({
      caller_id: params.callerId,
      twilio_call_sid: params.twilioCallSid,
      from_phone: params.fromPhone,
      to_phone: params.toPhone,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCallSession(id: string, updates: Record<string, unknown>) {
  const { error } = await supabase
    .from('call_sessions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function getCallSessionByCallSid(callSid: string) {
  const { data, error } = await supabase
    .from('call_sessions')
    .select('*, callers(*)')
    .eq('twilio_call_sid', callSid)
    .single();

  if (error) return null;
  return data;
}

export async function saveMessage(params: {
  callSessionId: string;
  role: string;
  channel: string;
  content: string;
}) {
  const { error } = await supabase.from('messages').insert({
    call_session_id: params.callSessionId,
    role: params.role,
    channel: params.channel,
    content: params.content,
  });

  if (error) console.error('Failed to save message:', error.message);
}

export async function saveSearchResults(
  callSessionId: string,
  query: string,
  results: Array<{
    title: string;
    url: string;
    snippet: string;
    extractedName?: string | null;
    extractedPhone?: string | null;
    extractedAddress?: string | null;
    extractedWebsite?: string | null;
    extractedDescription?: string | null;
    sourceDomain?: string;
    confidenceScore?: number;
  }>
) {
  const rows = results.map((r) => ({
    call_session_id: callSessionId,
    query,
    title: r.title,
    url: r.url,
    snippet: r.snippet,
    extracted_name: r.extractedName ?? null,
    extracted_phone: r.extractedPhone ?? null,
    extracted_address: r.extractedAddress ?? null,
    extracted_website: r.extractedWebsite ?? null,
    extracted_description: r.extractedDescription ?? null,
    source_domain: r.sourceDomain ?? null,
    confidence_score: r.confidenceScore ?? null,
  }));

  const { error } = await supabase.from('live_search_results').insert(rows);
  if (error) console.error('Failed to save search results:', error.message);
}

export async function saveReferrals(
  callerId: string,
  callSessionId: string | null,
  resources: Array<{
    title: string;
    url: string;
    phone?: string | null;
    address?: string | null;
  }>
) {
  const rows = resources.map((r) => ({
    caller_id: callerId,
    call_session_id: callSessionId,
    resource_title: r.title,
    resource_url: r.url,
    resource_phone: r.phone ?? null,
    resource_address: r.address ?? null,
    status: 'sent',
  }));

  const { error } = await supabase.from('referrals').insert(rows);
  if (error) console.error('Failed to save referrals:', error.message);
}

export async function getCallerByPhone(phone: string) {
  const { data } = await supabase
    .from('callers')
    .select('*')
    .eq('phone', phone)
    .single();
  return data;
}

// ── ElevenLabs helpers ────────────────────────────────────────────────────────

export async function saveConversationTurn(params: {
  callerId: string;
  elevenLabsSessionId?: string | null;
  role: string;
  content: string;
  channel?: string;
}) {
  const { error } = await supabase.from('conversation_turns').insert({
    caller_id: params.callerId,
    elevenlabs_session_id: params.elevenLabsSessionId ?? null,
    role: params.role,
    content: params.content,
    channel: params.channel ?? 'elevenlabs',
  });
  if (error) console.error('[DB] saveConversationTurn failed:', error.message);
}

export interface LastResource {
  name: string;
  phone: string | null;
  address: string | null;
  description: string | null;
  url: string;
  score: number;
  category: string;
  zip_code: string;
}

export async function saveLastResources(
  callerId: string,
  category: string,
  zipCode: string,
  resources: Array<{ name: string; phone: string | null; address: string | null; description: string | null; url: string; score: number }>
) {
  // Delete existing last_resources for this caller then re-insert
  await supabase.from('last_resources').delete().eq('caller_id', callerId);

  const rows = resources.slice(0, 3).map((r, i) => ({
    caller_id: callerId,
    resource_index: i,
    name: r.name,
    phone: r.phone,
    address: r.address,
    description: r.description,
    url: r.url,
    score: r.score,
    category,
    zip_code: zipCode,
  }));

  const { error } = await supabase.from('last_resources').insert(rows);
  if (error) console.error('[DB] saveLastResources failed:', error.message);
}

export async function getLastResources(callerId: string): Promise<LastResource[]> {
  const { data, error } = await supabase
    .from('last_resources')
    .select('*')
    .eq('caller_id', callerId)
    .order('resource_index', { ascending: true });

  if (error) {
    console.error('[DB] getLastResources failed:', error.message);
    return [];
  }
  return (data ?? []) as LastResource[];
}

export async function createElevenLabsSession(callerId: string, params?: {
  conversationId?: string | null;
  detectedCategory?: string | null;
  zipCode?: string | null;
  fromPhone?: string | null;
}) {
  const { data, error } = await supabase
    .from('elevenlabs_sessions')
    .insert({
      caller_id: callerId,
      elevenlabs_conversation_id: params?.conversationId ?? null,
      status: 'active',
      detected_category: params?.detectedCategory ?? null,
      zip_code: params?.zipCode ?? null,
      from_phone: params?.fromPhone ?? null,
    })
    .select()
    .single();
  if (error) console.error('[DB] createElevenLabsSession failed:', error.message);
  return data;
}

export async function updateElevenLabsSession(id: string, updates: Record<string, unknown>) {
  const { error } = await supabase
    .from('elevenlabs_sessions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.error('[DB] updateElevenLabsSession failed:', error.message);
}
