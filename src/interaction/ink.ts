import { useEffect, type RefObject } from 'react';
import { hasFinePointer, prefersReducedMotion } from '../motion/preferences';
import { schedule } from './loop';

/**
 * Ink bleeding into paper: the atlas's one liquid effect.
 *
 * While a photograph opens from its ruled line (the shutter), its edges run
 * like ink taken up by the sheet — displaced by a slow, low-frequency field
 * that is strongest as the print opens and has gone entirely by the time it
 * is fully open. The photograph is never left distorted: the filter is
 * removed when the bleed has dried. It is not a glitch, a blob or a ripple
 * on the image at rest.
 *
 * One SVG filter for the page, used by one opening at a time. Desktop only
 * (an SVG displacement repaints its element every frame, which a phone does
 * not need to pay for), and never with reduced motion.
 */
const ID = 'atlas-ink-bleed';
let filter: { map: SVGFEDisplacementMapElement } | null = null;

function ensureFilter() {
  if (filter) return filter;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
  svg.innerHTML = `<filter id="${ID}" x="-4%" y="-8%" width="108%" height="116%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.006 0.022" numOctaves="2" seed="11" result="field"/>
    <feDisplacementMap in="SourceGraphic" in2="field" scale="0" xChannelSelector="R" yChannelSelector="G"/>
  </filter>`;
  document.body.appendChild(svg);
  filter = { map: svg.querySelector('feDisplacementMap')! };
  return filter;
}

/** Run the bleed on `ref` once `active` turns true. Delay and duration match the shutter. */
export function useInkBleed(ref: RefObject<HTMLElement | null>, active: boolean, { delay = 450, duration = 1500, strength = 46 } = {}) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !active || !hasFinePointer() || prefersReducedMotion()) return;
    const { map } = ensureFilter();
    let cancelled = false;
    map.setAttribute('scale', String(strength));
    el.style.filter = `url(#${ID})`;
    const start = performance.now() + delay;
    schedule((_dt, now) => {
      if (cancelled) return false;
      const t = Math.min(Math.max((now - start) / duration, 0), 1);
      // Wet as it opens, drying out.
      const k = (1 - t) ** 2.2;
      map.setAttribute('scale', (strength * k).toFixed(2));
      if (t >= 1) {
        el.style.filter = '';
        return false;
      }
      return true;
    });
    return () => {
      cancelled = true;
      el.style.filter = '';
    };
  }, [ref, active, delay, duration, strength]);
}
