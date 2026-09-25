import { useEffect, useRef } from 'react';
import { useFinePointer, useReducedMotion } from '../../motion/preferences';

/**
 * The pointer, redrawn as a survey mark.
 *
 * At rest it is a small dot that tracks the hand exactly, with a hairline ring
 * that follows a beat behind. Over anything interactive the ring opens and,
 * where the element says what pressing it does (`data-cursor="Open"`), carries
 * that word. A press on an interactive element sends out three contour rings —
 * the splash — which is the one flourish, and it only answers an action.
 *
 * Only on a mouse-like pointer with motion allowed. Touch devices and reduced
 * motion keep the system cursor, and nothing here is mounted for them.
 */
const INTERACTIVE = 'a, button, [role="button"], [role="tab"], input, select, label, summary, [data-cursor]';

export function CustomCursor() {
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  const enabled = fine && !reduced;

  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const splashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const dot = dotRef.current!;
    const ring = ringRef.current!;
    const label = labelRef.current!;
    const splashLayer = splashRef.current!;
    document.documentElement.classList.add('has-custom-cursor');

    let x = -100;
    let y = -100;
    let rx = -100;
    let ry = -100;
    let visible = false;
    let raf = 0;
    let currentTarget: Element | null = null;

    const loop = () => {
      rx += (x - rx) * 0.2;
      ry += (y - ry) * 0.2;
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      ring.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
      const settled = Math.abs(x - rx) < 0.1 && Math.abs(y - ry) < 0.1;
      raf = settled ? 0 : requestAnimationFrame(loop);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };

    const setTarget = (el: Element | null) => {
      if (el === currentTarget) return;
      currentTarget = el;
      const word = el?.getAttribute('data-cursor') ?? '';
      const drag = el?.closest('[data-cursor-drag]');
      label.textContent = word;
      ring.dataset.state = el ? (word ? 'label' : 'hover') : 'idle';
      if (drag && !el?.closest(INTERACTIVE)) {
        label.textContent = 'Drag';
        ring.dataset.state = 'label';
      }
      kick();
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX;
      y = e.clientY;
      if (!visible) {
        visible = true;
        rx = x;
        ry = y;
        dot.style.opacity = '1';
        ring.style.opacity = '1';
      }
      const target = e.target instanceof Element ? e.target : null;
      const interactive = target?.closest(INTERACTIVE) ?? target?.closest('[data-cursor-drag]') ?? null;
      setTarget(interactive);
      kick();
    };

    const splash = (cx: number, cy: number) => {
      const node = document.createElement('div');
      node.className = 'cursor-splash';
      node.style.left = `${cx}px`;
      node.style.top = `${cy}px`;
      node.innerHTML = '<span></span><span></span><span></span>';
      splashLayer.appendChild(node);
      window.setTimeout(() => node.remove(), 1100);
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      ring.dataset.pressed = 'true';
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest(INTERACTIVE) || target?.closest('[data-cursor-drag]')) splash(e.clientX, e.clientY);
    };
    const onUp = () => {
      ring.dataset.pressed = 'false';
    };
    const onLeaveWindow = () => {
      visible = false;
      dot.style.opacity = '0';
      ring.style.opacity = '0';
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeaveWindow);
    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove('has-custom-cursor');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.documentElement.removeEventListener('pointerleave', onLeaveWindow);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div aria-hidden="true" className="cursor-layer">
      <div ref={splashRef} />
      <div ref={ringRef} className="cursor-ring" data-state="idle">
        <span className="cursor-ring-shape" />
        <span ref={labelRef} className="cursor-label" />
      </div>
      <div ref={dotRef} className="cursor-dot" />
    </div>
  );
}
