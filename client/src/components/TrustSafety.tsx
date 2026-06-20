import { Eye, MapPin, Users } from 'lucide-react';

const cards = [
  {
    icon: Eye,
    title: 'Privacy first',
    description:
      'Your name, phone number, and conversation details are never shared publicly. Our impact numbers are aggregated and anonymous.',
  },
  {
    icon: MapPin,
    title: 'Local matching',
    description:
      'Resources are matched to your ZIP code and community — the same way a neighbor who knows the area would point you in the right direction.',
  },
  {
    icon: Users,
    title: 'People come first',
    description:
      'Every call is about helping someone take a real next step — with dignity, clarity, and respect for what they are going through.',
  },
];

export function TrustSafety() {
  return (
    <section id="trust" className="scroll-mt-24 border-b border-stone-200 bg-cream py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <p className="section-label">Trust & safety</p>
          <h2 className="mt-2 font-display text-3xl text-stone-900 sm:text-4xl md:text-[2.5rem]">
            Built for privacy, speed, and local relevance
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="section-card p-7">
                <span className="icon-box mb-4 h-11 w-11">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="text-lg font-semibold text-stone-900">{card.title}</h3>
                <p className="mt-2 leading-relaxed text-stone-600">{card.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
