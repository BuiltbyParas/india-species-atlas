import { useEffect, useRef, useState } from 'react';
import { useInView } from '../../motion/useInView';
import { prefersReducedMotion } from '../../motion/preferences';
import { cn } from '../../utils/cn';

/**
 * A number from the dataset that counts up once, the first time it is seen.
 *
 * The final value is what is in the DOM for assistive technology from the
 * start; the counting digits are presentation only. Hovering shifts the
 * figure and reveals the note underneath, which says what was counted.
 */
export function InteractiveStat({
  value,
  label,
  note,
  color,
  play,
  className,
  size = 'lg',
}: {
  value: number;
  label: string;
  note?: string;
  color?: string;
  play?: boolean;
  className?: string;
  size?: 'lg' | 'md';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref);
  const active = play ?? seen;
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? value : 0));

  useEffect(() => {
    if (!active) return;
    if (prefersReducedMotion()) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const duration = 1400 + Math.min(value, 60) * 8;
    let raf = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      setShown(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(raf);
  }, [active, value]);

  return (
    <div ref={ref} className={cn('stat group relative', className)}>
      <p
        className={cn(
          'stat-figure font-serif font-light tabular-nums leading-none tracking-[-0.03em] text-canvas',
          size === 'lg' ? 'text-[clamp(3.2rem,7vw,6.5rem)]' : 'text-[clamp(2.4rem,4vw,3.6rem)]',
        )}
        style={color ? { color } : undefined}
      >
        <span aria-hidden="true">{shown}</span>
        <span className="sr-only">{value}</span>
      </p>
      <p className="mt-3 text-sm text-canvas/80">{label}</p>
      {note && (
        <p className="stat-note mt-1 text-xs leading-snug text-canvas/45 transition-[color] duration-300 group-hover:text-canvas/75">
          {note}
        </p>
      )}
    </div>
  );
}
