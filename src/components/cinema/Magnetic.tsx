import type { ReactNode } from 'react';

/**
 * Leans its child a little towards the pointer while the pointer is near —
 * enough to say "this is the thing to press", not enough to chase the hand.
 *
 * A wrapper for the cases where the control itself cannot carry the
 * attribute. The physics are the interaction engine's (`interaction/magnetic.ts`):
 * any element with `data-magnetic` behaves the same way, and the cursor
 * locks onto it. Mouse and pen with motion allowed; otherwise it is a plain span.
 */
export function Magnetic({ children, strength = 0.28, className }: { children: ReactNode; strength?: number; className?: string }) {
  return (
    <span data-magnetic={strength} className={className ?? 'inline-block'}>
      {children}
    </span>
  );
}
