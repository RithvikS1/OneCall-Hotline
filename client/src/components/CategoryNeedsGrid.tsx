import {
  Apple,
  Briefcase,
  Bus,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  HelpCircle,
  Home,
  Scale,
  Users,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CategoryBreakdown } from '../types/impact';

const ICONS: Record<string, LucideIcon> = {
  housing: Home,
  food: Apple,
  healthcare: HeartPulse,
  benefits: Briefcase,
  transportation: Bus,
  legal: Scale,
  family: Users,
  education: GraduationCap,
  employment: Briefcase,
  mental_health: HeartHandshake,
  utilities: Zap,
  other: HelpCircle,
};

interface CategoryNeedsGridProps {
  categories: CategoryBreakdown[];
  loading: boolean;
}

function heatStyle(count: number, max: number): { background: string; border: string; iconOpacity: number } {
  if (max === 0 || count === 0) {
    return { background: 'rgba(245,245,244,0.3)', border: '#e7e5e4', iconOpacity: 0.4 };
  }
  const t = Math.pow(count / max, 0.55); // square-root-ish curve so low counts still show color
  // interpolate teal-50 → teal-200 for background, teal-200 → teal-600 for border
  const bgAlpha = 0.08 + t * 0.38;
  const borderAlpha = 0.25 + t * 0.75;
  return {
    background: `rgba(13,148,136,${bgAlpha})`,
    border: `rgba(13,148,136,${borderAlpha})`,
    iconOpacity: 0.55 + t * 0.45,
  };
}

export function CategoryNeedsGrid({ categories, loading }: CategoryNeedsGridProps) {
  const maxCount = Math.max(...categories.map((c) => c.count), 0);

  return (
    <div className="section-card p-6 sm:p-8">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-stone-900">What people call about</h3>
        <p className="mt-1 text-sm text-stone-600">
          OneCall helps with a wide range of local needs — counts are aggregated and anonymous.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-stone-100" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const Icon = ICONS[cat.category] ?? Home;
            const { background, border, iconOpacity } = heatStyle(cat.count, maxCount);
            return (
              <div
                key={cat.category}
                style={{ background, borderColor: border }}
                className="flex items-start gap-3 rounded-xl border p-4 transition-all duration-500"
              >
                <span
                  className="icon-box h-10 w-10 shrink-0"
                  style={{ opacity: iconOpacity }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-medium text-stone-900">{cat.label}</p>
                    <span
                      className="shrink-0 text-lg font-semibold tabular-nums"
                      style={{ color: cat.count > 0 ? `rgba(13,148,136,${0.6 + (cat.count / Math.max(maxCount, 1)) * 0.4})` : '#d6d3d1' }}
                    >
                      {cat.count}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-stone-500">{cat.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
