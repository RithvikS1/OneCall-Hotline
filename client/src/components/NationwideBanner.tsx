import { Globe, MapPin } from 'lucide-react';

export function NationwideBanner() {
  return (
    <div className="section-card overflow-hidden border-teal-200/70 bg-gradient-to-br from-teal-50/90 via-white to-cream">
      <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-dark">
            <Globe className="h-3.5 w-3.5" />
            Available nationwide
          </div>
          <h2 className="font-display text-2xl leading-snug text-stone-900 sm:text-3xl">
            Local resources for{' '}
            <span className="text-teal-brand">anybody in the nation.</span>
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
            One number, coast to coast. Tell us your ZIP code and we connect you to{' '}
            <strong className="font-medium text-stone-800">real programs in your community</strong>
            — not generic national lists. Wherever you are, help is matched to where you live.
          </p>
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white/80 p-5 sm:min-w-[200px]">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-teal-brand" />
            <div>
              <p className="text-sm font-semibold text-stone-900">Your ZIP → local help</p>
              <p className="mt-1 text-xs leading-relaxed text-stone-500">
                Housing, food, healthcare, legal aid, benefits, and more — near you.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
