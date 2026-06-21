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
  callsLastWeek: number;
  callsByState: StateBreakdown[];
  categoryBreakdown: CategoryBreakdown[];
  callsOverTime: CallsOverTimePoint[];
  resourcesOverTime: CallsOverTimePoint[];
  callsByHour: HourlyBreakdown[];
  callsByDayOfWeek: DayOfWeekBreakdown[];
  outcomeBreakdown: OutcomeBreakdown[];
  channelBreakdown: ChannelBreakdown[];
  avgResourcesPerCall: number | null;
  recentActivity: ActivityEntry[];
  lastCallAt: string | null;
  updatedAt: string;
  uniqueCallers: number | null;
  topResources: TopResource[];
  topZipCodes: TopZipCode[];
}
