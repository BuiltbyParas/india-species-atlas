import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * GSAP is registered once, here, so every component that animates imports the
 * same instance with ScrollTrigger already attached.
 *
 * The three easing curves are the CSS tokens in `index.css`, registered under
 * the same names, so a scrubbed GSAP move and a CSS transition share one
 * motion language (documentation/PREMIUM_MOTION_SYSTEM.md):
 *
 *   atlas.out       --ease-out-expo   reveals and arrivals: fast, then a long settle
 *   atlas.cinema    --ease-cinema     scene changes and lines drawn: slow in, slow out
 *   atlas.emphasis  --ease-emphasis   controls: a firm start, a soft landing
 */
gsap.registerPlugin(ScrollTrigger);

/*
 * While enabled, ScrollTrigger keeps an empty requestAnimationFrame loop alive
 * (a Firefox repaint workaround), even when no trigger exists. Only the
 * documentary creates triggers, so it is enabled only while a page that holds
 * it is mounted, and the working pages go fully idle when nothing moves.
 * Pages hold it from a layout effect, which runs before their children's
 * effects create triggers.
 */
ScrollTrigger.disable();
let holders = 0;
export function holdScrollTrigger() {
  if (holders++ === 0) ScrollTrigger.enable();
  return () => {
    if (--holders === 0) ScrollTrigger.disable();
  };
}

/** CSS `cubic-bezier(x1, y1, x2, y2)` as a function of progress: Newton's method, then bisection. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const ax = 3 * x1 - 3 * x2 + 1;
  const bx = 3 * x2 - 6 * x1;
  const cx = 3 * x1;
  const ay = 3 * y1 - 3 * y2 + 1;
  const by = 3 * y2 - 6 * y1;
  const cy = 3 * y1;
  const x = (t: number) => ((ax * t + bx) * t + cx) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (p: number) => {
    if (p <= 0 || p >= 1) return p <= 0 ? 0 : 1;
    let t = p;
    for (let i = 0; i < 6; i++) {
      const err = x(t) - p;
      const d = dx(t);
      if (Math.abs(err) < 1e-5) break;
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    if (t < 0 || t > 1 || Math.abs(x(t) - p) > 1e-4) {
      let lo = 0;
      let hi = 1;
      t = p;
      for (let i = 0; i < 24; i++) {
        if (x(t) < p) lo = t;
        else hi = t;
        t = (lo + hi) / 2;
      }
    }
    return ((ay * t + by) * t + cy) * t;
  };
}

gsap.registerEase('atlas.out', cubicBezier(0.16, 1, 0.3, 1));
gsap.registerEase('atlas.cinema', cubicBezier(0.7, 0, 0.2, 1));
gsap.registerEase('atlas.emphasis', cubicBezier(0.2, 0.75, 0.25, 1));
gsap.defaults({ ease: 'atlas.out', duration: 1.1 });

export { gsap, ScrollTrigger };
