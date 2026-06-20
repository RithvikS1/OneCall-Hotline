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
  other: HelpCircle,
};

interface CategoryNeedsGridProps {
  categories: CategoryBreakdown[];
  loading: boolean;
}

export function CategoryNeedsGrid({ categories, loading }: CategoryNeedsGridProps) {
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
            const hasActivity = cat.count > 0;
            return (
              <div
                key={cat.category}
                className={`flex items-start gap-3 rounded-xl border p-4 transition ${
                  hasActivity
                    ? 'border-teal-200/80 bg-teal-50/40'
                    : 'border-stone-200 bg-cream/30'
                }`}
              >
                <span
                  className={`icon-box h-10 w-10 shrink-0 ${!hasActivity ? 'opacity-50' : ''}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-medium text-stone-900">{cat.label}</p>
                    <span
                      className={`shrink-0 text-lg font-semibold tabular-nums ${
                        hasActivity ? 'text-teal-brand' : 'text-stone-300'
                      }`}
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
