import { useEffect, useRef, type ReactNode } from 'react';
import { hasFinePointer, prefersReducedMotion } from '../../motion/preferences';

/**
 * Leans its child a little towards the pointer while the pointer is near —
 * enough to say "this is the thing to press", not enough to chase the hand.
 * Only on a fine pointer with motion allowed; otherwise it is a plain span.
 */
export function Magnetic({ children, strength = 0.28, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !hasFinePointer() || prefersReducedMotion()) return;
    let raf = 0;
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    const loop = () => {
      x += (tx - x) * 0.18;
      y += (ty - y) * 0.18;
      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      if (Math.abs(tx - x) > 0.05 || Math.abs(ty - y) > 0.05) raf = requestAnimationFrame(loop);
      else raf = 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = (e.clientX - (r.left + r.width / 2)) * strength;
      ty = (e.clientY - (r.top + r.height / 2)) * strength;
      kick();
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
      kick();
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [strength]);

  return (
    <span ref={ref} className={className ?? 'inline-block will-change-transform'}>
      {children}
    </span>
  );
}
