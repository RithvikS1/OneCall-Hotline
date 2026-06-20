import {
  Apple,
  Briefcase,
  Bus,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  Home,
  Scale,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const categories: { icon: LucideIcon; title: string; description: string }[] = [
  { icon: Home, title: 'Housing', description: 'Shelter, rent assistance, eviction help' },
  { icon: Apple, title: 'Food assistance', description: 'Food banks, SNAP, meal programs' },
  { icon: HeartPulse, title: 'Healthcare', description: 'Medical, dental, and clinic access' },
  { icon: Bus, title: 'Transportation', description: 'Rides, transit passes, mobility help' },
  { icon: Scale, title: 'Legal aid', description: 'Tenant rights, immigration, legal support' },
  { icon: Briefcase, title: 'Benefits programs', description: 'Unemployment, disability, TANF' },
  { icon: Users, title: 'Family support', description: 'Childcare, family services, parenting' },
  { icon: GraduationCap, title: 'Education resources', description: 'Schools, training, GED programs' },
  { icon: HeartHandshake, title: 'Mental health support', description: 'Counseling and wellness services' },
  { icon: TrendingUp, title: 'Employment help', description: 'Job training, workforce programs' },
];

export function ResourceCategories() {
  return (
    <section id="resources" className="scroll-mt-24 border-b border-stone-200 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <p className="section-label">What we help with</p>
          <h2 className="mt-2 font-display text-3xl text-stone-900 sm:text-4xl">
            Resources in your community
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-stone-600">
            OneCall connects you to local organizations and programs — not generic lists that may
            not apply where you live.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.title}
                className="rounded-xl border border-stone-200 bg-cream/50 p-5 transition hover:border-teal-brand/30 hover:bg-white"
              >
                <Icon className="mb-3 h-5 w-5 text-teal-brand" />
                <h3 className="font-semibold text-stone-900">{cat.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{cat.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
