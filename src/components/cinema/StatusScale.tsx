import { useRef } from 'react';
import type { IucnStatus } from '../../types';
import { STATUS_INFO } from '../../data/statusInfo';
import { useInView } from '../../motion/useInView';
import { cn } from '../../utils/cn';

/**
 * The Red List category as a survey line: where on the IUCN scale this
 * species stands.
 *
 * The scale is the IUCN's own sequence of categories for assessed species,
 * from Least Concern to Extinct. A line is ruled along it from the safe end
 * and stops at the species' category, where it is marked and named. So the
 * difference between Vulnerable, Endangered and Critically Endangered is a
 * distance along one line — information, not a rarity badge — and the
 * further categories (Extinct in the Wild, Extinct) stay visible, unreached.
 *
 * Data Deficient sits outside the scale, as it does in the IUCN scheme, and
 * is written rather than placed. Reduced motion shows the line drawn.
 */
const SCALE: Array<{ code: string; name: string }> = [
  { code: 'LC', name: 'Least Concern' },
  { code: 'NT', name: 'Near Threatened' },
  { code: 'VU', name: 'Vulnerable' },
  { code: 'EN', name: 'Endangered' },
  { code: 'CR', name: 'Critically Endangered' },
  { code: 'EW', name: 'Extinct in the Wild' },
  { code: 'EX', name: 'Extinct' },
];

export function StatusScale({ status, className }: { status: IucnStatus; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { rootMargin: '0px 0px -10% 0px' });
  const info = STATUS_INFO[status];
  const at = SCALE.findIndex((s) => s.code === status);
  if (at < 0) {
    return (
      <p className={cn('text-label text-canvas/70', className)}>
        {info.name}: not placed on the scale — the IUCN could not assess its risk from the data available.
      </p>
    );
  }
  const step = 100 / (SCALE.length - 1);
  return (
    <div
      ref={ref}
      className={cn('status-scale', seen && 'is-drawn', className)}
      style={{ ['--to' as string]: `${at * step}%`, ['--status' as string]: info.hex }}
      role="img"
      aria-label={`IUCN Red List: ${info.name}, category ${at + 1} of ${SCALE.length} on the scale from Least Concern to Extinct`}
    >
      <div className="ss-track" aria-hidden="true">
        <span className="ss-rule" />
        <span className="ss-line" />
        {SCALE.map((s, i) => (
          <span
            key={s.code}
            className={cn('ss-tick', i === at && 'is-here', i > at && 'is-beyond')}
            style={{ left: `${i * step}%`, ['--k' as string]: i }}
            title={s.name}
          >
            <span className="ss-code">{s.code}</span>
          </span>
        ))}
        <span className="ss-mark" />
      </div>
    </div>
  );
}
