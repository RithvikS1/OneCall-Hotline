import { ListChecks, MessageCircle, Phone } from 'lucide-react';

const steps = [
  {
    icon: Phone,
    title: 'Call OneCall',
    description:
      'Dial the hotline and tell us what you need — housing, food, healthcare, or any kind of local support.',
  },
  {
    icon: MessageCircle,
    title: 'We listen & understand',
    description:
      'Share your situation in your own words. We figure out what kind of help fits and where you are.',
  },
  {
    icon: ListChecks,
    title: 'Get local next steps',
    description:
      'We send you nearby resources and clear next steps by phone and follow-up text message.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 border-b border-stone-200 bg-cream py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <p className="section-label">How it works</p>
          <h2 className="mt-2 font-display text-3xl text-stone-900 sm:text-4xl">
            Three steps to local help
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="section-card relative p-7">
                <span className="absolute -top-3 left-6 rounded-md bg-teal-brand px-2.5 py-0.5 text-xs font-bold text-white">
                  Step {i + 1}
                </span>
                <span className="icon-box mb-4 h-11 w-11">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="text-lg font-semibold text-stone-900">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-stone-600">{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
