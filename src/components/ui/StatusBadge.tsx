import type { IucnStatus } from '../../types';
import { STATUS_INFO } from '../../data/statusInfo';
import { cn } from '../../utils/cn';

/**
 * IUCN status badge. Never relies on colour alone — the category code and,
 * optionally, the full name are always shown as text.
 */
export function StatusBadge({
  status,
  showName = false,
  size = 'md',
  className,
}: {
  status: IucnStatus;
  showName?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const info = STATUS_INFO[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xs border font-medium tracking-[0.06em]',
        size === 'sm' ? 'px-1.5 py-px text-micro' : 'px-2 py-0.5 text-label',
        className,
      )}
      style={{ borderColor: `color-mix(in srgb, ${info.colorVar} 55%, transparent)`, color: info.colorVar }}
      title={`${info.code} — ${info.name}`}
    >
      <span
        aria-hidden="true"
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: info.colorVar }}
      />
      <span>{info.code}</span>
      {showName && <span className="font-normal tracking-normal text-canvas/85">{info.name}</span>}
    </span>
  );
}
