import { Phone } from 'lucide-react';
import { Logo } from './Logo';

interface NavbarProps {
  hotlineTel: string;
}

export function Navbar({ hotlineTel }: NavbarProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-stone-200 bg-cream/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
        <a href="#" className="shrink-0">
          <Logo size="sm" />
        </a>

        <a
          href="#impact"
          className="hidden text-sm font-medium text-stone-600 transition hover:text-stone-900 sm:block"
        >
          Live dashboard
        </a>

        <a href={hotlineTel} className="btn-call !px-4 !py-2 text-sm">
          <Phone className="h-4 w-4" />
          Call
        </a>
      </div>
    </header>
  );
}

interface MobileCallBarProps {
  hotlineDisplay: string;
  hotlineTel: string;
}

export function MobileCallBar({ hotlineDisplay, hotlineTel }: MobileCallBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-stone-200 bg-white p-3 sm:hidden">
      <a href={hotlineTel} className="btn-call w-full justify-center !py-3.5">
        <Phone className="h-5 w-5" />
        Call {hotlineDisplay}
      </a>
    </div>
  );
}
