import { useId, useState } from 'react';
import type { IucnStatus } from '../../types';
import { STATUS_INFO } from '../../data/statusInfo';
import { cn } from '../../utils/cn';

/**
 * The IUCN category as a small mark that opens into its definition.
 *
 * Collapsed, it is a status tick and the category name — never colour alone.
 * Hovered, focused or tapped, it widens to carry the plain-language IUCN
 * definition, so the reader can learn what "Endangered" means without
 * leaving the scene.
 */
export function StatusIndicator({ status, className }: { status: IucnStatus; className?: string }) {
  const info = STATUS_INFO[status];
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <div
      className={cn('status-indicator group relative inline-block text-left', className)}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        data-cursor="Define"
        className="flex items-center gap-3 py-1 text-left"
      >
        <span className="relative flex h-3 w-3 items-center justify-center" aria-hidden="true">
          <span className="absolute inset-0 rounded-full opacity-30 status-pulse" style={{ backgroundColor: info.colorVar }} />
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: info.colorVar }} />
        </span>
        <span className="text-sm text-canvas">
          {info.name}
          <span className="ml-2 text-canvas/45">IUCN {info.code}</span>
        </span>
      </button>
      <div
        id={id}
        role="note"
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-500 ease-[var(--ease-out-expo)]',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <p className="max-w-sm overflow-hidden pl-6 text-[13px] leading-relaxed text-canvas/65">
          <span className="block pt-2">{info.definition}</span>
        </p>
      </div>
    </div>
  );
}
