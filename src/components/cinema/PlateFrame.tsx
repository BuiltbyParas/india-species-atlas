import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

/**
 * The neatline of a plate: four hairlines drawn out from the corners the
 * first time the plate is seen, and a note set up its right margin — the
 * frame the opening plate draws around the relief, used again wherever a
 * chapter is composed as a plate of the atlas. Presentation only: whatever the
 * note says must also be in the page's text.
 */
export function PlateFrame({ shown, note, className }: { shown: boolean; note?: ReactNode; className?: string }) {
  return (
    <div className={cn('plate-frame', shown && 'is-shown', className)} aria-hidden="true">
      <span className="plate-edge is-t" />
      <span className="plate-edge is-r" />
      <span className="plate-edge is-b" />
      <span className="plate-edge is-l" />
      {note && <p className="plate-note">{note}</p>}
    </div>
  );
}
