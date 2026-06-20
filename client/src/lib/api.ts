import type { ImpactStats } from '../types/impact';

export const HOTLINE_DISPLAY = '1-800-555-ONECALL';
export const HOTLINE_TEL = 'tel:+18005556632';

export async function fetchImpactStats(): Promise<ImpactStats> {
  const res = await fetch('/api/impact', { cache: 'no-store' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? body.error ?? 'Failed to load impact metrics');
  }
  return res.json();
}
