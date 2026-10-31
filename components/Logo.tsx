import { cn } from '@/lib/utils';

// The Horizon diamond, drawn flat in the brand blue: a sun rising over the horizon line.
export const LogoMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={cn('size-6 shrink-0', className)}>
    <rect x="4.5" y="4.5" width="23" height="23" rx="5" transform="rotate(45 16 16)" fill="#0058D4" />
    <path d="M11.5 18a4.5 4.5 0 0 1 9 0" fill="#fff" />
    <rect x="7" y="18.75" width="18" height="2" rx="1" fill="#fff" />
  </svg>
);

const Logo = ({ className, showName = true }: { className?: string; showName?: boolean }) => (
  <span className={cn('flex items-center gap-2', className)}>
    <LogoMark />
    {showName && <span className="text-16 font-semibold text-ink">Horizon</span>}
  </span>
);

export default Logo;
