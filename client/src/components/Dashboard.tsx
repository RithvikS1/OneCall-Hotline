import { Activity, BarChart3, Clock, MapPinned, Phone, Share2, Target, TrendingUp, Users, CalendarDays, Building2, MapPin } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ImpactStats } from '../types/impact';
import { CategoryNeedsGrid } from './CategoryNeedsGrid';
import { LiveStatsBar } from './LiveStatsBar';
import { NationwideBanner } from './NationwideBanner';
import { UsReachMap } from './UsReachMap';

interface DashboardProps {
  stats: ImpactStats | null;
  loading: boolean;
  refreshing: boolean;
  secondsSinceUpdate: number;
  error: string | null;
  hotlineDisplay: string;
  hotlineTel: string;
}

function formatGuidanceTime(seconds: number | null): string | null {
  if (seconds === null) return null;
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-stone-200 text-sm text-stone-500">
      {message}
    </div>
  );
}

const PIE_COLORS = ['#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4', '#d6d3d1', '#a8a29e'];
const BAR_COLORS = ['#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4'];

export function Dashboard({
  stats,
  loading,
  refreshing,
  secondsSinceUpdate,
  error,
  hotlineDisplay,
  hotlineTel,
}: DashboardProps) {
  const chartData = stats?.callsOverTime ?? [];
  const resourcesData = stats?.resourcesOverTime ?? [];
  const hasCallTrend = chartData.some((d) => d.count > 0);
  const hasResourceTrend = resourcesData.some((d) => d.count > 0);
  const guidanceTime = stats ? formatGuidanceTime(stats.avgGuidanceTimeSeconds) : null;
  const stateData = stats?.callsByState ?? [];
  const hourData = (stats?.callsByHour ?? []).filter((h) => h.count > 0);
  const dayData = stats?.callsByDayOfWeek ?? [];
  const outcomeData = (stats?.outcomeBreakdown ?? []).filter(
    (o) => o.count > 0 && !['started', 'searching'].includes(o.outcome)
  );
  const topCategories = (stats?.categoryBreakdown ?? []).filter((c) => c.count > 0).slice(0, 8);

  const weekChange =
    stats && stats.callsLastWeek > 0
      ? Math.round(((stats.callsThisWeek - stats.callsLastWeek) / stats.callsLastWeek) * 100)
      : null;

  return (
    <section id="impact" className="scroll-mt-20 pb-16 pt-6 sm:pb-20 sm:pt-8">
      <div className="mx-auto max-w-6xl space-y-10 px-4 sm:px-6">
        <NationwideBanner />

        {/* Hotline */}
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-stone-500">One number, every state — call anytime</p>
            <a
              href={hotlineTel}
              className="mt-1 block font-display text-4xl tracking-tight text-stone-900 transition hover:text-teal-brand sm:text-5xl"
            >
              {hotlineDisplay}
            </a>
            {stats?.lastCallAt && !loading && (
              <p className="mt-2 text-sm text-stone-500">
                Last call{' '}
                {new Date(stats.lastCallAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>
          <a href={hotlineTel} className="btn-call shrink-0 !px-8 !py-4">
            <Phone className="h-5 w-5" />
            Call now
          </a>
        </div>

        <LiveStatsBar
          stats={stats}
          loading={loading}
          refreshing={refreshing}
          secondsSinceUpdate={secondsSinceUpdate}
        />

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
            Could not load live data: {error}
          </div>
        )}

        {/* Insight cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: CalendarDays,
              label: 'Calls today',
              value: loading ? '—' : stats?.callsToday ?? 0,
              sub: `${loading ? '—' : stats?.callsThisWeek ?? 0} this week`,
            },
            {
              icon: Users,
              label: 'Unique callers',
              value: loading ? '—' : stats?.uniqueCallers ?? '—',
              sub: 'people reached',
            },
            {
              icon: TrendingUp,
              label: 'Week over week',
              value: loading ? '—' : weekChange != null ? `${weekChange > 0 ? '+' : ''}${weekChange}%` : '—',
              sub: 'vs. prior 7 days',
            },
            {
              icon: Share2,
              label: 'Avg. resources / call',
              value: loading ? '—' : stats?.avgResourcesPerCall ?? '—',
              sub: 'when matched',
            },
            {
              icon: Clock,
              label: 'Guidance time',
              value: loading ? '—' : guidanceTime ?? '—',
              sub: 'average per call',
            },
            {
              icon: Target,
              label: 'Match rate',
              value: loading ? '—' : stats?.matchRate != null ? `${Math.round(stats.matchRate * 100)}%` : '—',
              sub: 'resources found',
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="section-card p-5">
                <div className="flex items-center gap-2 text-stone-500">
                  <Icon className="h-4 w-4 text-teal-brand" />
                  <span className="text-xs font-medium">{card.label}</span>
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-stone-900">{card.value}</p>
                <p className="text-xs text-stone-500">{card.sub}</p>
              </div>
            );
          })}
        </div>

        {/* US Map */}
        <div className="section-card p-6 sm:p-8">
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <MapPinned className="h-5 w-5 text-teal-brand" />
                <h2 className="font-display text-2xl text-stone-900 sm:text-3xl">Where we reach</h2>
              </div>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-600">
                Local connections across the country — tap any state for anonymous reach stats.
              </p>
            </div>
            {!loading && stats?.statesReached != null && (
              <p className="text-sm text-stone-500">
                <span className="text-2xl font-semibold text-teal-brand">{stats.statesReached}</span>
                {' '}
                {stats.statesReached === 1 ? 'state' : 'states'} with activity
              </p>
            )}
          </div>
          <UsReachMap data={stateData} loading={loading} />
        </div>

        {/* Full category grid */}
        <CategoryNeedsGrid categories={stats?.categoryBreakdown ?? []} loading={loading} />

        {/* Outcomes + top categories chart */}
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="section-card p-6 sm:p-8">
            <h3 className="mb-1 text-lg font-semibold text-stone-900">Call outcomes</h3>
            <p className="mb-6 text-xs text-stone-500">Aggregated results — no caller details</p>
            {loading ? (
              <div className="h-56 animate-pulse rounded-xl bg-stone-100" />
            ) : outcomeData.length === 0 ? (
              <ChartEmpty message="Not enough outcome data yet." />
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={outcomeData}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {outcomeData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e7e5e4', borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="section-card p-6 sm:p-8">
            <h3 className="mb-1 text-lg font-semibold text-stone-900">Top needs (live)</h3>
            <p className="mb-6 text-xs text-stone-500">Most requested help categories</p>
            {loading ? (
              <div className="h-56 animate-pulse rounded-xl bg-stone-100" />
            ) : topCategories.length === 0 ? (
              <ChartEmpty message="No category data yet." />
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCategories} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid stroke="#e7e5e4" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 11, fill: '#44403c' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e7e5e4', borderRadius: 8 }} />
                    <Bar dataKey="count" name="Calls" fill="#0d9488" radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* When people reach out */}
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="section-card p-6 sm:p-8">
            <h3 className="mb-1 text-lg font-semibold text-stone-900">Busiest hours (UTC)</h3>
            <p className="mb-6 text-xs text-stone-500">When calls come in — anonymous totals</p>
            {loading ? (
              <div className="h-56 animate-pulse rounded-xl bg-stone-100" />
            ) : hourData.length === 0 ? (
              <ChartEmpty message="Not enough timing data yet." />
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.callsByHour ?? []}>
                    <CartesianGrid stroke="#e7e5e4" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#78716c' }} interval={2} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#78716c' }} width={28} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e7e5e4', borderRadius: 8 }} />
                    <Bar dataKey="count" name="Calls" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="section-card p-6 sm:p-8">
            <h3 className="mb-1 text-lg font-semibold text-stone-900">Calls by day of week</h3>
            <p className="mb-6 text-xs text-stone-500">Weekly pattern — all-time aggregate</p>
            {loading ? (
              <div className="h-56 animate-pulse rounded-xl bg-stone-100" />
            ) : !dayData.some((d) => d.count > 0) ? (
              <ChartEmpty message="Not enough data yet." />
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayData}>
                    <CartesianGrid stroke="#e7e5e4" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#78716c' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#78716c' }} width={28} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e7e5e4', borderRadius: 8 }} />
                    <Bar dataKey="count" name="Calls" radius={[6, 6, 0, 0]}>
                      {dayData.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Dual timeline */}
        <div className="section-card p-6 sm:p-8">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <BarChart3 className="h-5 w-5 text-teal-brand" />
            <h3 className="text-lg font-semibold text-stone-900">Calls & resources over time</h3>
            <span className="text-xs text-stone-500">Last 30 days</span>
          </div>
          {loading ? (
            <div className="h-64 animate-pulse rounded-xl bg-stone-100" />
          ) : !hasCallTrend && !hasResourceTrend ? (
            <ChartEmpty message="Trends will appear as activity grows." />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData.map((c, i) => ({
                    date: c.date,
                    calls: c.count,
                    resources: resourcesData[i]?.count ?? 0,
                  }))}
                >
                  <defs>
                    <linearGradient id="callsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0d9488" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="resGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e7e5e4" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#78716c', fontSize: 10 }}
                    tickFormatter={(v) =>
                      new Date(v + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }
                    minTickGap={32}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis allowDecimals={false} tick={{ fill: '#78716c', fontSize: 11 }} width={32} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e7e5e4', borderRadius: 8 }} />
                  <Legend />
                  <Area type="monotone" dataKey="calls" name="Calls" stroke="#0d9488" fill="url(#callsGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="resources" name="Resources shared" stroke="#14b8a6" fill="url(#resGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Channel breakdown if data exists */}
        {!loading && (stats?.channelBreakdown.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-4">
            {stats!.channelBreakdown.map((ch) => (
              <div key={ch.channel} className="section-card flex items-center gap-4 px-6 py-4">
                <p className="text-sm text-stone-600">{ch.label}</p>
                <p className="text-xl font-semibold text-teal-brand">{ch.count}</p>
              </div>
            ))}
          </div>
        )}

        {/* Top resources + most served communities */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Top resources connected */}
          <div className="section-card p-6 sm:p-8">
            <div className="mb-1 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-teal-brand" />
              <h3 className="text-lg font-semibold text-stone-900">Top resources connected</h3>
            </div>
            <p className="mb-6 text-xs text-stone-500">Organizations most often shared with callers</p>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-9 animate-pulse rounded-lg bg-stone-100" />
                ))}
              </div>
            ) : !stats?.topResources.length ? (
              <ChartEmpty message="No resource data yet." />
            ) : (
              <ol className="space-y-3">
                {stats.topResources.map((r, i) => {
                  const maxCount = stats.topResources[0].count;
                  const pct = Math.round((r.count / maxCount) * 100);
                  return (
                    <li key={r.title} className="flex flex-col gap-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium text-stone-800">
                          <span className="mr-2 text-xs text-stone-400">#{i + 1}</span>
                          {r.title}
                        </span>
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-teal-brand">
                          {r.count}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                        <div
                          className="h-full rounded-full bg-teal-brand transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {r.phone && (
                        <p className="text-xs text-stone-400">{r.phone}</p>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {/* Most served communities */}
          <div className="section-card p-6 sm:p-8">
            <div className="mb-1 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-teal-brand" />
              <h3 className="text-lg font-semibold text-stone-900">Most served communities</h3>
            </div>
            <p className="mb-6 text-xs text-stone-500">ZIP codes with the most activity (anonymous)</p>
            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-stone-100" />
                ))}
              </div>
            ) : !stats?.topZipCodes.length ? (
              <ChartEmpty message="No location data yet." />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {stats.topZipCodes.map((z, i) => (
                  <div
                    key={z.zip}
                    className="flex flex-col gap-0.5 rounded-xl border border-stone-100 bg-stone-50 px-4 py-3"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-stone-400">#{i + 1}</span>
                      <span className="font-mono text-base font-semibold text-stone-900">{z.zip}</span>
                    </div>
                    <p className="text-xs text-stone-500">{z.state}</p>
                    <p className="text-xs font-medium text-teal-brand">{z.count} {z.count === 1 ? 'call' : 'calls'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Activity feed */}
        <div className="section-card p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-2">
            <Activity className="h-5 w-5 text-teal-brand" />
            <h3 className="text-lg font-semibold text-stone-900">Recent activity</h3>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-stone-100" />
              ))}
            </div>
          ) : !stats?.recentActivity.length ? (
            <p className="py-12 text-center text-sm text-stone-500">No recent activity yet.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {stats.recentActivity.slice(0, 8).map((entry, i) => (
                <li
                  key={`${entry.at}-${i}`}
                  className="flex flex-col gap-1 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="text-sm text-stone-700">
                    <span className="font-semibold text-teal-dark">{entry.state}</span>
                    {' — '}
                    {entry.label}
                  </p>
                  <time className="shrink-0 text-xs text-stone-500">
                    {new Date(entry.at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </time>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-6 rounded-lg bg-stone-50 px-4 py-3 text-xs leading-relaxed text-stone-500">
            Privacy first: this feed shows state and help type only. No names, phone numbers, transcripts,
            addresses, or personal notes are ever displayed.
          </p>
        </div>

        <p className="text-center text-xs text-stone-500">
          For emergencies, call <strong className="text-stone-700">911</strong>. OneCall is not an emergency service.
        </p>
      </div>
    </section>
  );
}
