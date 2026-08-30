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
        'inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-wide',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        className,
      )}
      style={{ borderColor: info.colorVar, color: info.colorVar }}
      title={`${info.code} — ${info.name}`}
    >
      <span
        aria-hidden="true"
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: info.colorVar }}
      />
      <span>{info.code}</span>
      {showName && <span className="font-medium normal-case tracking-normal text-canvas/85">{info.name}</span>}
    </span>
  );
}
