import { useEffect, type RefObject } from 'react';
import { hasFinePointer, prefersReducedMotion } from '../motion/preferences';
import { onPointerExit, onPointerMove, pointer } from './pointer';
import { Spring, SPRINGS, springDriver } from './spring';

/**
 * Layers that drift under the pointer, as if the sheet had depth.
 *
 * The pointer's place in the viewport (−1 → 1) is eased on the slow parallax
 * spring, once for the whole site. A layer registered with `useParallax`
 * moves by `depth` pixels at the edge of the screen — positive towards the
 * hand, negative away from it, so a background and a foreground can drift in
 * opposite directions. Only layers on screen are written. The response is
 * meant to be almost subconscious: single-digit pixels.
 */
interface Layer {
  el: HTMLElement | SVGElement;
  depth: number;
  visible: boolean;
}

const layers = new Set<Layer>();
const px = new Spring(0, SPRINGS.parallax);
const py = new Spring(0, SPRINGS.parallax);
let io: IntersectionObserver | null = null;
const byEl = new WeakMap<Element, Layer>();
let unsubscribe: (() => void) | null = null;

function render() {
  for (const l of layers) {
    if (!l.visible) continue;
    l.el.style.translate = `${(px.value * l.depth).toFixed(2)}px ${(py.value * l.depth * 0.7).toFixed(2)}px`;
  }
}
const kick = springDriver([px, py], render);

function subscribe() {
  if (unsubscribe) return;
  const offMove = onPointerMove(() => {
    if (pointer.type === 'touch') return;
    px.target = pointer.nx;
    py.target = pointer.ny;
    kick();
  });
  const offExit = onPointerExit(() => {
    px.target = 0;
    py.target = 0;
    kick();
  });
  unsubscribe = () => {
    offMove();
    offExit();
  };
}

export function useParallax(ref: RefObject<HTMLElement | SVGElement | null>, depth: number) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !hasFinePointer() || prefersReducedMotion()) return;
    io ??= new IntersectionObserver((entries) => {
      for (const e of entries) {
        const l = byEl.get(e.target);
        if (l) l.visible = e.isIntersecting;
      }
    });
    const layer: Layer = { el, depth, visible: false };
    layers.add(layer);
    byEl.set(el, layer);
    io.observe(el);
    subscribe();
    return () => {
      layers.delete(layer);
      io?.unobserve(el);
      el.style.translate = '';
      if (!layers.size && unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    };
  }, [ref, depth]);
}
