import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap, ScrollTrigger } from './gsap';
import { useReducedMotion } from './preferences';

/**
 * Inertial scrolling for the documentary page only.
 *
 * The long, pinned narrative is where smoothing earns its cost: scrubbed
 * scenes read as camera moves instead of stepping with each wheel notch. The
 * working pages — the Leaflet map, the directory, the comparison table — keep
 * the browser's own scrolling, which is what a map's wheel-zoom and a table's
 * overflow expect.
 */
let current: Lenis | null = null;

export function getLenis(): Lenis | null {
  return current;
}

let locks = 0;

/**
 * Freeze and release the page, for the loader, the menu, the species sheet
 * and the film. Counted: each `lockScroll(true)` needs its own
 * `lockScroll(false)`, so one overlay closing cannot release the page while
 * another is still open over it.
 */
export function lockScroll(lock: boolean) {
  const was = locks > 0;
  locks = Math.max(0, locks + (lock ? 1 : -1));
  const now = locks > 0;
  if (was === now) return;
  if (current) {
    if (now) current.stop();
    else current.start();
  }
  document.documentElement.style.overflow = now ? 'hidden' : '';
}

export function scrollToTarget(target: string | number | HTMLElement) {
  if (current) {
    current.scrollTo(target, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
    return;
  }
  if (typeof target === 'number') window.scrollTo({ top: target });
  else {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    el?.scrollIntoView();
  }
}

export function SmoothScroll() {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9, smoothWheel: true });
    current = lenis;
    if (locks > 0) lenis.stop();
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      if (current === lenis) current = null;
    };
  }, [reduced]);

  return null;
}
