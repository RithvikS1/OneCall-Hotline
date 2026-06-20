interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { img: 'h-8 w-8', text: 'text-base' },
  md: { img: 'h-10 w-10', text: 'text-lg' },
  lg: { img: 'h-20 w-20 sm:h-24 sm:w-24', text: 'text-2xl' },
};

export function Logo({ className = '', showText = true, size = 'md' }: LogoProps) {
  const s = sizes[size];

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src="/logo.png"
        alt="OneCall Hotline"
        className={`${s.img} object-contain`}
      />
      {showText && (
        <span className={`${s.text} font-semibold text-stone-900`}>OneCall Hotline</span>
      )}
    </span>
  );
}
