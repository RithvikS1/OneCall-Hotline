import { supabase } from './supabase';
import { zipToState } from './zipToState';

export type AvailabilityStatus = 'online' | 'degraded' | 'offline';

export interface CallsOverTimePoint {
  date: string;
  count: number;
}

export interface ActivityEntry {
  state: string | null;
  category: string | null;
  label: string;
  at: string;
}

export interface StateBreakdown {
  state: string;
  calls: number;
  resources: number;
}

export interface HourlyBreakdown {
  hour: number;
  label: string;
  count: number;
}

export interface DayOfWeekBreakdown {
  day: string;
  count: number;
}

export interface OutcomeBreakdown {
  outcome: string;
  label: string;
  count: number;
}

export interface ChannelBreakdown {
  channel: string;
  label: string;
  count: number;
}

export interface CategoryBreakdown {
  category: string;
  label: string;
  description: string;
  count: number;
}

export interface TopResource {
  title: string;
  count: number;
  phone: string | null;
}

export interface TopZipCode {
  zip: string;
  state: string;
  count: number;
}

export interface ImpactStats {
  callsAssisted: number;
  resourcesShared: number;
  statesReached: number | null;
  avgGuidanceTimeSeconds: number | null;
  matchRate: number | null;
  availability: AvailabilityStatus;
  hotlineNumber: string | null;
  hotlineDisplay: string;
  callsToday: number;
  callsThisWeek: number;
  callsByState: StateBreakdown[];
  categoryBreakdown: CategoryBreakdown[];
  callsOverTime: CallsOverTimePoint[];
  resourcesOverTime: CallsOverTimePoint[];
  callsByHour: HourlyBreakdown[];
  callsByDayOfWeek: DayOfWeekBreakdown[];
  outcomeBreakdown: OutcomeBreakdown[];
  channelBreakdown: ChannelBreakdown[];
  avgResourcesPerCall: number | null;
  callsLastWeek: number;
  recentActivity: ActivityEntry[];
  lastCallAt: string | null;
  updatedAt: string;
  uniqueCallers: number | null;
  topResources: TopResource[];
  topZipCodes: TopZipCode[];
}

const CATEGORY_LABELS: Record<string, string> = {
  housing: 'Connected caller to housing resources',
  food: 'Shared food assistance programs',
  healthcare: 'Shared healthcare resources',
  benefits: 'Connected caller to benefits programs',
  transportation: 'Shared transportation assistance',
  legal: 'Connected caller to legal aid resources',
  emergency: 'Directed caller to emergency services',
  crisis: 'Directed caller to crisis support',
  other: 'Connected caller to local resources',
};

const CATEGORY_META: Record<string, { label: string; description: string }> = {
  housing: { label: 'Housing & shelter', description: 'Rent help, eviction, shelters' },
  food: { label: 'Food assistance', description: 'Food banks, SNAP, meals' },
  healthcare: { label: 'Healthcare', description: 'Medical, dental, clinics' },
  benefits: { label: 'Benefits programs', description: 'Unemployment, disability, TANF' },
  transportation: { label: 'Transportation', description: 'Rides, transit, mobility' },
  legal: { label: 'Legal aid', description: 'Tenant rights, immigration' },
  family: { label: 'Family support', description: 'Childcare, parenting, DV resources' },
  education: { label: 'Education', description: 'Schools, training, GED' },
  employment: { label: 'Employment', description: 'Job training, workforce programs' },
  mental_health: { label: 'Mental health', description: 'Counseling, wellness (non-crisis)' },
  utilities: { label: 'Utilities assistance', description: 'Electric, gas, water bills' },
  emergency: { label: 'Emergency routing', description: 'Directed to 911' },
  crisis: { label: 'Crisis routing', description: 'Directed to 988' },
  other: { label: 'Other local needs', description: 'Community resources near you' },
};

const ALL_PUBLIC_CATEGORIES = [
  'housing', 'food', 'healthcare', 'benefits', 'transportation', 'legal',
  'family', 'education', 'employment', 'mental_health', 'utilities', 'other',
] as const;

const OUTCOME_LABELS: Record<string, string> = {
  resources_sent: 'Resources matched',
  no_results: 'Fallback guidance',
  classified: 'Need identified',
  searching: 'Search in progress',
  sms_search: 'Text assistance',
  emergency: 'Emergency routing',
  crisis: 'Crisis routing',
  started: 'Call started',
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
});

function formatHotlineDisplay(phone: string | undefined | null): string {
  if (!phone) return '1-800-555-ONECALL';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    const area = digits.slice(1, 4);
    const prefix = digits.slice(4, 7);
    const line = digits.slice(7);
    return `1-${area}-${prefix}-${line}`;
  }
  if (digits.length === 10) {
    return `1-${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

function toTelLink(phone: string | undefined | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) return `tel:+${digits.startsWith('1') ? digits : '1' + digits}`;
  return null;
}
const MATCH_STATUSES = ['resources_sent', 'no_results'] as const;
const ASSISTED_STATUSES = [
  'classified',
  'searching',
  'no_results',
  'resources_sent',
  'sms_search',
  'emergency',
  'crisis',
] as const;

function getAvailability(): AvailabilityStatus {
  const hasSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasTwilio = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_PHONE_NUMBER);
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);

  if (hasSupabase && hasTwilio && hasOpenAI) return 'online';
  if (hasSupabase && (hasTwilio || hasOpenAI)) return 'degraded';
  return 'offline';
}

function formatDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function buildActivityLabel(category: string | null, status: string | null): string {
  if (category && CATEGORY_LABELS[category]) return CATEGORY_LABELS[category];
  if (status === 'resources_sent') return 'Shared local resources with caller';
  if (status === 'no_results') return 'Provided fallback guidance to caller';
  return 'Assisted caller with resource navigation';
}

export async function getImpactStats(): Promise<ImpactStats> {
  const [
    sessionsResult,
    referralsResult,
    sessionsDataResult,
    elevenLabsDataResult,
    recentSessionsResult,
    recentReferralsResult,
    recentElevenLabsResult,
    callersResult,
  ] = await Promise.all([
    supabase.from('call_sessions').select('id', { count: 'exact', head: true }),
    supabase.from('referrals').select('id', { count: 'exact', head: true }),
    supabase
      .from('call_sessions')
      .select('id, status, detected_category, zip_code, created_at, updated_at, twilio_call_sid')
      .order('created_at', { ascending: false })
      .limit(5000),
    supabase
      .from('elevenlabs_sessions')
      .select('id, status, detected_category, zip_code, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(5000),
    supabase
      .from('call_sessions')
      .select('detected_category, zip_code, status, created_at')
      .in('status', [...ASSISTED_STATUSES])
      .order('created_at', { ascending: false })
      .limit(15),
    supabase
      .from('referrals')
      .select('created_at, call_session_id')
      .order('created_at', { ascending: false })
      .limit(15),
    supabase
      .from('elevenlabs_sessions')
      .select('detected_category, zip_code, status, created_at')
      .in('status', ['resources_sent', 'no_results'])
      .order('created_at', { ascending: false })
      .limit(15),
    supabase.from('callers').select('id', { count: 'exact', head: true }),
  ]);

  if (sessionsResult.error) throw sessionsResult.error;
  if (referralsResult.error) throw referralsResult.error;
  if (sessionsDataResult.error) throw sessionsDataResult.error;

  const sessions = sessionsDataResult.data ?? [];
  const elevenLabsSessions = (elevenLabsDataResult.error ? [] : (elevenLabsDataResult.data ?? []))
    .map(s => ({ ...s, twilio_call_sid: null as string | null }));
  const allSessions = [...sessions, ...elevenLabsSessions];

  const callSessionCount = sessionsResult.count ?? 0;
  const elevenLabsCount = elevenLabsSessions.length;
  const callsAssisted = callSessionCount + elevenLabsCount;
  const resourcesShared = referralsResult.count ?? 0;

  const stateSet = new Set<string>();
  const callsByStateMap = new Map<string, { calls: number; resources: number }>();
  const categoryMap = new Map<string, number>();
  const outcomeMap = new Map<string, number>();
  const channelMap = new Map<string, number>();
  const hourCounts = Array.from({ length: 24 }, (_, h) => ({ hour: h, label: HOUR_LABELS[h], count: 0 }));
  const dayCounts = DAY_LABELS.map((day) => ({ day, count: 0 }));

  const todayKey = formatDateKey(new Date().toISOString());
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 13);
  let callsToday = 0;
  let callsThisWeek = 0;
  let callsLastWeek = 0;

  for (const row of allSessions) {
    const state = zipToState(row.zip_code);
    if (state && state !== 'Armed Forces') {
      stateSet.add(state);
      const entry = callsByStateMap.get(state) ?? { calls: 0, resources: 0 };
      entry.calls += 1;
      callsByStateMap.set(state, entry);
    }

    if (row.detected_category) {
      categoryMap.set(row.detected_category, (categoryMap.get(row.detected_category) ?? 0) + 1);
    }

    if (row.status) {
      outcomeMap.set(row.status, (outcomeMap.get(row.status) ?? 0) + 1);
    }

    const channel = row.twilio_call_sid == null ? 'elevenlabs'
      : row.twilio_call_sid.startsWith('sms-') ? 'sms'
      : 'voice';
    channelMap.set(channel, (channelMap.get(channel) ?? 0) + 1);

    const created = new Date(row.created_at);
    hourCounts[created.getUTCHours()].count += 1;
    dayCounts[created.getUTCDay()].count += 1;

    const sessionDate = formatDateKey(row.created_at);
    if (sessionDate === todayKey) callsToday += 1;
    if (created >= weekAgo) callsThisWeek += 1;
    else if (created >= twoWeeksAgo) callsLastWeek += 1;
  }

  const statesReached = stateSet.size > 0 ? stateSet.size : null;

  // TODO: Replace proxy with real call duration once Twilio CallDuration or ended_at is stored.
  const completedSessions = allSessions.filter((s) => s.status === 'resources_sent' && s.updated_at && s.created_at);
  let avgGuidanceTimeSeconds: number | null = null;
  if (completedSessions.length >= 3) {
    const totalSeconds = completedSessions.reduce((sum, s) => {
      const ms = new Date(s.updated_at).getTime() - new Date(s.created_at).getTime();
      return sum + Math.max(0, ms / 1000);
    }, 0);
    avgGuidanceTimeSeconds = Math.round(totalSeconds / completedSessions.length);
  }

  const matchSessions = allSessions.filter((s) =>
    (MATCH_STATUSES as readonly string[]).includes(s.status ?? '')
  );
  const resourcesSentCount = matchSessions.filter((s) => s.status === 'resources_sent').length;
  const noResultsCount = matchSessions.filter((s) => s.status === 'no_results').length;
  const matchDenominator = resourcesSentCount + noResultsCount;
  const matchRate =
    matchDenominator >= 5 ? Math.round((resourcesSentCount / matchDenominator) * 100) / 100 : null;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  const countsByDate = new Map<string, number>();

  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(thirtyDaysAgo.getDate() + i);
    countsByDate.set(formatDateKey(d.toISOString()), 0);
  }

  for (const row of allSessions) {
    const key = formatDateKey(row.created_at);
    if (countsByDate.has(key)) countsByDate.set(key, (countsByDate.get(key) ?? 0) + 1);
  }

  const callsOverTime: CallsOverTimePoint[] = Array.from(countsByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const resourcesByDate = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(thirtyDaysAgo.getDate() + i);
    resourcesByDate.set(formatDateKey(d.toISOString()), 0);
  }

  const recentSessions = [
    ...(recentSessionsResult.data ?? []),
    ...(recentElevenLabsResult.error ? [] : (recentElevenLabsResult.data ?? [])),
  ];

  const sessionCategoryById = new Map(
    sessions.map((s) => [s.id, { category: s.detected_category, zip: s.zip_code, status: s.status }])
  );

  const activityEntries: ActivityEntry[] = [];

  for (const session of recentSessions) {
    activityEntries.push({
      state: zipToState(session.zip_code),
      category: session.detected_category,
      label: buildActivityLabel(session.detected_category, session.status),
      at: session.created_at,
    });
  }

  for (const referral of recentReferralsResult.data ?? []) {
    if (!referral.call_session_id || activityEntries.length >= 20) continue;
    const meta = sessionCategoryById.get(referral.call_session_id);
    if (!meta) continue;
    activityEntries.push({
      state: zipToState(meta.zip),
      category: meta.category,
      label: meta.category
        ? CATEGORY_LABELS[meta.category] ?? 'Shared local resources with caller'
        : 'Shared local resources with caller',
      at: referral.created_at,
    });
  }

  activityEntries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const seen = new Set<string>();
  const recentActivity = activityEntries
    .filter((entry) => {
      const key = `${entry.at}-${entry.label}-${entry.state}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10)
    .map((entry) => ({
      ...entry,
      state: entry.state ?? 'Nationwide',
    }));

  // Attribute referrals to states via session lookup
  const { data: allReferrals } = await supabase
    .from('referrals')
    .select('call_session_id, created_at, resource_title, resource_phone')
    .limit(5000);

  for (const ref of allReferrals ?? []) {
    const refDate = ref.created_at ? formatDateKey(ref.created_at) : null;
    if (refDate && resourcesByDate.has(refDate)) {
      resourcesByDate.set(refDate, (resourcesByDate.get(refDate) ?? 0) + 1);
    }

    if (!ref.call_session_id) continue;
    const meta = sessionCategoryById.get(ref.call_session_id);
    if (!meta?.zip) continue;
    const state = zipToState(meta.zip);
    if (!state || state === 'Armed Forces') continue;
    const entry = callsByStateMap.get(state) ?? { calls: 0, resources: 0 };
    entry.resources += 1;
    callsByStateMap.set(state, entry);
  }

  const callsByState = Array.from(callsByStateMap.entries())
    .map(([state, data]) => ({ state, ...data }))
    .sort((a, b) => b.calls - a.calls);

  const categoryBreakdown = ALL_PUBLIC_CATEGORIES.map((cat) => {
    const meta = CATEGORY_META[cat];
    // Map AI categories: healthcare counts can include mental health bucket for display split is optional
    let count = categoryMap.get(cat) ?? 0;
    if (cat === 'mental_health') count = 0; // reserved; surfaced when AI adds explicit category
    if (cat === 'family' || cat === 'education' || cat === 'employment') count = categoryMap.get(cat) ?? 0;
    return {
      category: cat,
      label: meta.label,
      description: meta.description,
      count,
    };
  }).sort((a, b) => b.count - a.count);

  const outcomeBreakdown = Array.from(outcomeMap.entries())
    .map(([outcome, count]) => ({
      outcome,
      label: OUTCOME_LABELS[outcome] ?? outcome,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const channelBreakdown = [
    { channel: 'voice', label: 'Phone calls', count: channelMap.get('voice') ?? 0 },
    { channel: 'sms', label: 'Text messages', count: channelMap.get('sms') ?? 0 },
    { channel: 'elevenlabs', label: 'AI voice calls', count: channelMap.get('elevenlabs') ?? 0 },
  ].filter((c) => c.count > 0);

  const resourcesOverTime: CallsOverTimePoint[] = Array.from(resourcesByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const matchedCalls = resourcesSentCount;
  const avgResourcesPerCall =
    matchedCalls >= 3 ? Math.round((resourcesShared / matchedCalls) * 10) / 10 : null;

  const resourceTitleMap = new Map<string, { count: number; phone: string | null }>();
  for (const ref of allReferrals ?? []) {
    if (!ref.resource_title) continue;
    const existing = resourceTitleMap.get(ref.resource_title) ?? { count: 0, phone: null };
    existing.count += 1;
    if (!existing.phone && ref.resource_phone) existing.phone = ref.resource_phone;
    resourceTitleMap.set(ref.resource_title, existing);
  }
  const topResources = Array.from(resourceTitleMap.entries())
    .map(([title, data]) => ({ title, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const zipCountMap = new Map<string, number>();
  for (const row of allSessions) {
    if (row.zip_code) zipCountMap.set(row.zip_code, (zipCountMap.get(row.zip_code) ?? 0) + 1);
  }
  const topZipCodes = Array.from(zipCountMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([zip, count]) => ({ zip, state: zipToState(zip) ?? 'Unknown', count }));

  const uniqueCallers = callersResult.error ? null : (callersResult.count ?? null);

  const twilioPhone = process.env.TWILIO_PHONE_NUMBER ?? null;
  const lastCallAt = allSessions.length > 0
    ? allSessions.reduce((a, b) => a.created_at > b.created_at ? a : b).created_at
    : null;

  return {
    callsAssisted,
    resourcesShared,
    statesReached,
    avgGuidanceTimeSeconds,
    matchRate,
    availability: getAvailability(),
    hotlineNumber: toTelLink(twilioPhone),
    hotlineDisplay: formatHotlineDisplay(twilioPhone),
    callsToday,
    callsThisWeek,
    callsLastWeek,
    callsByState,
    categoryBreakdown,
    callsOverTime,
    resourcesOverTime,
    callsByHour: hourCounts,
    callsByDayOfWeek: dayCounts,
    outcomeBreakdown,
    channelBreakdown,
    avgResourcesPerCall,
    recentActivity,
    lastCallAt,
    updatedAt: new Date().toISOString(),
    uniqueCallers,
    topResources,
    topZipCodes,
  };
}
