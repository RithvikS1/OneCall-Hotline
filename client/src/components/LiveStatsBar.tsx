import { Radio } from 'lucide-react';
import type { ImpactStats } from '../types/impact';
import { CountUp } from './CountUp';

interface LiveStatsBarProps {
  stats: ImpactStats | null;
  loading: boolean;
  refreshing: boolean;
  secondsSinceUpdate: number;
}

function StatBlock({
  label,
  value,
  suffix,
  loading,
  empty,
}: {
  label: string;
  value: number | null | undefined;
  suffix?: string;
  loading: boolean;
  empty?: boolean;
}) {
  return (
    <div className="text-center sm:text-left">
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-stone-900 sm:text-3xl">
        {loading ? (
          <span className="inline-block h-8 w-12 animate-pulse rounded bg-stone-200" />
        ) : empty || value == null ? (
          <span className="text-lg font-normal text-stone-400">—</span>
        ) : (
          <CountUp value={value} suffix={suffix} />
        )}
      </p>
    </div>
  );
}

export function LiveStatsBar({ stats, loading, refreshing, secondsSinceUpdate }: LiveStatsBarProps) {
  const statusLabel =
    stats?.availability === 'online'
      ? 'Hotline online'
      : stats?.availability === 'degraded'
        ? 'Limited service'
        : 'Offline';

  const statusColor =
    stats?.availability === 'online'
      ? 'bg-emerald-500'
      : stats?.availability === 'degraded'
        ? 'bg-amber-500'
        : 'bg-rose-500';

  return (
    <div className="section-card overflow-hidden border-teal-200/60">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 bg-teal-50/40 px-5 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-teal-brand px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
            <Radio className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Live
          </span>
          <span className="flex items-center gap-1.5 text-sm text-stone-600">
            <span className={`status-dot h-2 w-2 rounded-full ${statusColor}`} />
            {loading ? 'Checking…' : statusLabel}
          </span>
        </div>
        <p className="text-xs text-stone-500">
          {refreshing
            ? 'Updating now…'
            : secondsSinceUpdate < 5
              ? 'Just updated'
              : `Updated ${secondsSinceUpdate}s ago`}{' '}
          · refreshes every 15s
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6 px-5 py-8 sm:grid-cols-3 sm:px-6 lg:grid-cols-6">
        <StatBlock label="Calls today" value={stats?.callsToday} loading={loading} />
        <StatBlock label="This week" value={stats?.callsThisWeek} loading={loading} />
        <StatBlock label="Total assisted" value={stats?.callsAssisted} loading={loading} />
        <StatBlock
          label="States reached"
          value={stats?.statesReached}
          loading={loading}
          empty={stats?.statesReached == null}
        />
        <StatBlock label="Resources shared" value={stats?.resourcesShared} loading={loading} />
        <StatBlock
          label="Match rate"
          value={stats?.matchRate != null ? stats.matchRate * 100 : null}
          suffix="%"
          loading={loading}
          empty={stats?.matchRate == null}
        />
      </div>
    </div>
  );
}
