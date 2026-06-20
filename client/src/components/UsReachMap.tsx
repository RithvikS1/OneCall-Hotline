import { useEffect, useMemo, useState } from 'react';
import { geoAlbersUsa, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Feature, FeatureCollection } from 'geojson';
import type { Topology } from 'topojson-specification';
import type { StateBreakdown } from '../types/impact';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

interface StateFeature extends Feature {
  id?: string;
  properties: { name: string };
}

interface UsReachMapProps {
  data: StateBreakdown[];
  loading: boolean;
}

function fillForCalls(calls: number, maxCalls: number): string {
  if (calls <= 0) return '#e7e5e4';
  const t = Math.min(calls / maxCalls, 1);
  // stone-200 → teal-600
  const r = Math.round(231 + (13 - 231) * t);
  const g = Math.round(229 + (148 - 229) * t);
  const b = Math.round(228 + (136 - 228) * t);
  return `rgb(${r},${g},${b})`;
}

export function UsReachMap({ data, loading }: UsReachMapProps) {
  const [features, setFeatures] = useState<StateFeature[]>([]);
  const [geoError, setGeoError] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const dataMap = useMemo(() => new Map(data.map((d) => [d.state, d])), [data]);
  const maxCalls = useMemo(() => Math.max(1, ...data.map((d) => d.calls)), [data]);

  const totalCalls = useMemo(() => data.reduce((s, d) => s + d.calls, 0), [data]);
  const reachedCount = data.filter((d) => d.calls > 0).length;

  useEffect(() => {
    fetch(GEO_URL)
      .then((r) => r.json())
      .then((topology: Topology) => {
        const states = feature(
          topology,
          topology.objects.states as Parameters<typeof feature>[1]
        ) as FeatureCollection;
        setFeatures(states.features as StateFeature[]);
      })
      .catch(() => setGeoError(true));
  }, []);

  const projection = useMemo(
    () => geoAlbersUsa().scale(1100).translate([480, 295]),
    []
  );
  const path = useMemo(() => geoPath(projection), [projection]);

  const activeState = selected ?? hovered;
  const activeData = activeState ? dataMap.get(activeState) : null;

  if (loading) {
    return <div className="aspect-[16/10] w-full animate-pulse rounded-xl bg-stone-100" />;
  }

  if (geoError) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-xl border border-dashed border-stone-200 text-sm text-stone-500">
        Could not load map. Check your connection.
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
      <div className="relative">
        <svg viewBox="0 0 960 580" className="w-full" role="img" aria-label="United States reach map">
          {features.map((f) => {
            const name = f.properties.name;
            const entry = dataMap.get(name);
            const calls = entry?.calls ?? 0;
            const isActive = activeState === name;
            const d = path(f);

            return (
              <path
                key={name}
                d={d ?? undefined}
                fill={fillForCalls(calls, maxCalls)}
                stroke={isActive ? '#0f766e' : '#fff'}
                strokeWidth={isActive ? 2 : 0.6}
                className="cursor-pointer transition-all duration-150"
                style={{ opacity: hovered && hovered !== name && !selected ? 0.65 : 1 }}
                onMouseEnter={() => setHovered(name)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setSelected(selected === name ? null : name)}
              />
            );
          })}
        </svg>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-stone-500">
          <span>Reach intensity</span>
          <div className="flex h-3 w-32 overflow-hidden rounded-full">
            <span className="flex-1 bg-stone-200" />
            <span className="flex-1 bg-teal-200" />
            <span className="flex-1 bg-teal-400" />
            <span className="flex-1 bg-teal-600" />
          </div>
          <span>Low → High</span>
        </div>
      </div>

      {/* State detail panel */}
      <div className="flex flex-col rounded-xl border border-stone-200 bg-cream/50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Reach overview</p>
        <p className="mt-2 font-display text-3xl text-stone-900">{reachedCount}</p>
        <p className="text-sm text-stone-600">
          {reachedCount === 1 ? 'state' : 'states'} with calls
        </p>

        <div className="my-5 border-t border-stone-200" />

        {activeState && activeData ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-dark">Selected</p>
            <p className="mt-1 text-lg font-semibold text-stone-900">{activeState}</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-stone-600">Calls</dt>
                <dd className="font-semibold text-stone-900">{activeData.calls}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-600">Resources shared</dt>
                <dd className="font-semibold text-stone-900">{activeData.resources}</dd>
              </div>
            </dl>
          </>
        ) : activeState && !activeData ? (
          <>
            <p className="mt-1 text-lg font-semibold text-stone-900">{activeState}</p>
            <p className="mt-3 text-sm text-stone-500">No calls recorded in this state yet.</p>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-stone-600">
            Hover or tap a state to see call and resource counts. Darker teal = more activity.
          </p>
        )}

        {data.length > 0 && (
          <div className="mt-auto pt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Top states</p>
            <ul className="space-y-2">
              {data.slice(0, 5).map((s) => (
                <li key={s.state}>
                  <button
                    type="button"
                    onClick={() => setSelected(s.state)}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-white"
                  >
                    <span className="text-stone-700">{s.state}</span>
                    <span className="font-semibold text-teal-brand">{s.calls}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {totalCalls === 0 && (
          <p className="mt-4 text-xs text-stone-500">
            Map will fill in as callers share their ZIP codes.
          </p>
        )}
      </div>
    </div>
  );
}
