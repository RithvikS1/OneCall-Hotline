import { Phone } from 'lucide-react';
import { HOTLINE_DISPLAY, HOTLINE_TEL } from '../lib/api';

export function Mission() {
  return (
    <section className="border-b border-stone-200 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="font-display text-3xl text-stone-900 sm:text-4xl">
          Help should be easier to find.
        </h2>
        <p className="mx-auto mt-5 text-lg leading-relaxed text-stone-600">
          Finding support should not require knowing which agency to call, which website to search,
          or which form to fill out first. OneCall Hotline is a single entry point for people to
          discover local resources faster — one call at a time.
        </p>
      </div>
    </section>
  );
}

export function FinalCTA() {
  return (
    <section className="bg-cream pb-24 sm:pb-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="section-card px-8 py-12 text-center sm:px-10">
          <h2 className="font-display text-3xl text-stone-900 sm:text-4xl">Need help right now?</h2>
          <p className="mx-auto mt-3 max-w-md text-lg text-stone-600">
            Call OneCall Hotline and get connected to local resources in your community.
          </p>
          <a href={HOTLINE_TEL} className="btn-call mt-8">
            <Phone className="h-5 w-5" />
            Call {HOTLINE_DISPLAY}
          </a>
        </div>
      </div>
    </section>
  );
}
