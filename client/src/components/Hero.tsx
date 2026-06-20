import { Logo } from './Logo';

export function Hero() {
  return (
    <section className="border-b border-stone-200 bg-cream pt-20 pb-6 sm:pt-24 sm:pb-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center sm:px-6">
        <Logo size="lg" showText={false} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-dark">
            Nationwide hotline · Local results
          </p>
          <h1 className="mt-2 font-display text-2xl text-stone-900 sm:text-4xl">
            Local resources.{' '}
            <span className="text-teal-brand">Anywhere in America.</span>
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-stone-600 sm:text-base">
            Call from any state. Share your ZIP. Get connected to real help in your neighborhood.
          </p>
        </div>
      </div>
    </section>
  );
}
