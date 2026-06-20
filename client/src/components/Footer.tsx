import { Github, Phone } from 'lucide-react';
import { Logo } from './Logo';

interface FooterProps {
  hotlineDisplay: string;
  hotlineTel: string;
}

export function Footer({ hotlineDisplay, hotlineTel }: FooterProps) {
  return (
    <footer className="border-t border-stone-200 bg-white pb-24 sm:pb-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-8 text-center sm:px-6">
        <Logo size="sm" />

        <a
          href={hotlineTel}
          className="inline-flex items-center gap-2 text-lg font-semibold text-teal-brand transition hover:text-teal-dark"
        >
          <Phone className="h-5 w-5" />
          {hotlineDisplay}
        </a>

        <a
          href="https://github.com/RithvikS1/OneCall-Hotline"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 transition hover:text-stone-800"
        >
          <Github className="h-4 w-4" />
          GitHub
        </a>

        <p className="text-xs text-stone-500">
          © {new Date().getFullYear()} OneCall Hotline · Emergencies: 911
        </p>
      </div>
    </footer>
  );
}
