import { useEffect, type RefObject } from 'react';
import { prefersReducedMotion } from '../motion/preferences';
import { onScroll } from './scroll';

/**
 * Where a section stands in its pass through the screen, as three custom
 * properties CSS can scrub with.
 *
 *   --enter  0 → 1 as the section's top travels from the bottom edge of the
 *            screen to 35 % down it: the chapter arriving.
 *   --cp     0 → 1 across the whole pass, top at the bottom edge to bottom at
 *            the top edge. For layers that drift (parallax) or draw as it goes.
 *   --leave  0 → 1 as the section's bottom travels from 55 % down the screen
 *            to the top edge: the chapter handing over.
 *
 * Computed from the element's rectangle on every sample of the shared scroll
 * signal, never from what has already happened, so they scrub both ways, hold
 * under a fast fling and are right on the first frame after a jump or a
 * reload. One subscription for every section; only sections near the screen
 * are written, and only when a value has moved. With reduced motion the
 * section is simply shown: entered, not leaving, mid-pass.
 *
 * Two options, both off by default: `enterOnly` writes `--enter` alone (an
 * element that only arrives — a line filling with ink, a marker — would
 * otherwise restyle itself on every frame of its pass through `--cp`), and
 * `settle: false` keeps an element's own movement from asking for the second
 * pass, which only matters for a section that transforms another inside it.
 */
interface Entry {
  el: HTMLElement;
  enter: number;
  cp: number;
  leave: number;
  settle: boolean;
  enterOnly: boolean;
}

const entries = new Set<Entry>();
let off: (() => void) | null = null;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

let moved = false;

function write(e: Entry, enter: number, cp: number, leave: number) {
  if (e.enterOnly) {
    cp = e.cp;
    leave = e.leave;
  }
  if (e.settle && (Math.abs(enter - e.enter) > 0.002 || Math.abs(cp - e.cp) > 0.002 || Math.abs(leave - e.leave) > 0.002)) moved = true;
  if (Math.abs(enter - e.enter) > 0.002) {
    e.enter = enter;
    e.el.style.setProperty('--enter', enter.toFixed(3));
  }
  if (Math.abs(cp - e.cp) > 0.002) {
    e.cp = cp;
    e.el.style.setProperty('--cp', cp.toFixed(3));
  }
  if (Math.abs(leave - e.leave) > 0.002) {
    e.leave = leave;
    e.el.style.setProperty('--leave', leave.toFixed(3));
  }
}

function update() {
  // A section can sit inside another that moves with its own values (the ledger inside its chapter's card):
  // a second look, only if anything moved, settles the inner one on the outer one's final place.
  moved = false;
  pass();
  if (moved) pass();
}

function pass() {
  const vh = window.innerHeight;
  // Every rectangle is read before any value is written, so a pass costs one layout, not one per section.
  const list = [...entries];
  const rects = list.map((e) => e.el.getBoundingClientRect());
  list.forEach((e, i) => {
    const r = rects[i];
    // Well away from the screen the values sit at their ends; nothing to scrub.
    if (r.bottom < -vh || r.top > vh * 2) {
      write(e, r.top > 0 ? 0 : 1, r.top > 0 ? 0 : 1, r.top > 0 ? 0 : 1);
      return;
    }
    write(e, clamp01((vh - r.top) / (vh * 0.65)), clamp01((vh - r.top) / (vh + r.height)), clamp01((vh * 0.55 - r.bottom) / (vh * 0.55)));
  });
}

export function useSectionProgress(
  ref: RefObject<HTMLElement | null>,
  { settle = true, enterOnly = false }: { settle?: boolean; enterOnly?: boolean } = {},
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.style.setProperty('--enter', '1');
      if (!enterOnly) {
        el.style.setProperty('--cp', '0.5');
        el.style.setProperty('--leave', '0');
      }
      return;
    }
    const entry: Entry = { el, enter: -1, cp: -1, leave: -1, settle, enterOnly };
    entries.add(entry);
    off ??= onScroll(update);
    window.addEventListener('resize', update);
    update();
    // Layout settles after fonts and lazy content; look again once it has, without waiting for a scroll.
    const later = window.setTimeout(update, 700);
    return () => {
      window.clearTimeout(later);
      entries.delete(entry);
      window.removeEventListener('resize', update);
      if (!entries.size) {
        off?.();
        off = null;
      }
    };
  }, [ref, settle, enterOnly]);
}
