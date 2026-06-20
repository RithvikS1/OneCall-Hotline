import { useCallback, useEffect, useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { MobileCallBar, Navbar } from './components/Navbar';
import { fetchImpactStats, HOTLINE_DISPLAY, HOTLINE_TEL } from './lib/api';
import type { ImpactStats } from './types/impact';

const REFRESH_MS = 15_000;

export default function App() {
  const [stats, setStats] = useState<ImpactStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(0);

  const load = useCallback(async (isInitial = false) => {
    if (!isInitial) setRefreshing(true);
    try {
      const data = await fetchImpactStats();
      setStats(data);
      setError(null);
      setLastUpdated(new Date());
      setSecondsSinceUpdate(0);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(true);
    const interval = setInterval(() => load(false), REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const tick = setInterval(() => {
      if (lastUpdated) {
        setSecondsSinceUpdate(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [lastUpdated]);

  const hotlineDisplay = stats?.hotlineDisplay ?? HOTLINE_DISPLAY;
  const hotlineTel = stats?.hotlineNumber ?? HOTLINE_TEL;

  return (
    <div className="min-h-screen bg-cream text-stone-800">
      <Navbar hotlineTel={hotlineTel} />
      <main>
        <Hero />
        <Dashboard
          stats={stats}
          loading={loading}
          refreshing={refreshing}
          secondsSinceUpdate={secondsSinceUpdate}
          error={error}
          hotlineDisplay={hotlineDisplay}
          hotlineTel={hotlineTel}
        />
      </main>
      <Footer hotlineDisplay={hotlineDisplay} hotlineTel={hotlineTel} />
      <MobileCallBar hotlineDisplay={hotlineDisplay} hotlineTel={hotlineTel} />
    </div>
  );
}
