import { useEffect, type RefObject } from 'react';
import { getLenis } from '../motion/SmoothScroll';
import { schedule } from './loop';
import { Spring } from './spring';
import { onScroll, type ScrollSample } from './scroll';

/**
 * How fast the page is moving, as one shared value.
 *
 * Slow reading is calm; a fling makes the sheet a little more energetic —
 * the curved loops run faster, the reticle trails further, ink lines thicken
 * a hair — and when the page stops everything settles back on a spring.
 *
 * Read it from JavaScript (`scrollVelocity()`, `onScrollVelocity`) or as CSS:
 * an element that opts in with `bindVelocity` gets `--atlas-velocity`, 0 → 1,
 * and `--atlas-velocity-dir`, −1 or 1. It is never written to `:root`: an
 * inherited property changed on the root every frame restyles the whole
 * documentary, which is the one thing this must not cost.
 */
const FULL = 3600; // px/s that counts as "fast"

const level = new Spring(0, { stiffness: 70, damping: 16, precision: 0.0005 });
let raw = 0;
let dir = 1;
let lastY = 0;
let lastT = 0;
let listening = false;
let running = false;
const bound = new Set<HTMLElement | SVGElement>();
const subscribers = new Set<(level: number, signed: number) => void>();

function write() {
  const v = level.value.toFixed(3);
  for (const el of bound) {
    el.style.setProperty('--atlas-velocity', v);
    el.style.setProperty('--atlas-velocity-dir', String(dir));
  }
  for (const s of subscribers) s(level.value, raw);
}

function step(dt: number) {
  // The raw speed decays by itself between scroll events.
  raw *= Math.exp(-dt / 0.12);
  level.target = Math.min(Math.abs(raw) / FULL, 1);
  const moving = level.step(dt);
  write();
  if (!moving && Math.abs(raw) < 1) {
    running = false;
    return false;
  }
  return true;
}

function onScrollSample({ y }: ScrollSample) {
  const now = performance.now();
  const lenis = getLenis();
  if (lenis) {
    // Lenis reports px per frame; scale to px/s at 60 Hz.
    raw = lenis.velocity * 60;
  } else {
    const dt = lastT ? (now - lastT) / 1000 : 0;
    if (dt > 0 && dt < 0.25) raw += ((y - lastY) / dt - raw) * 0.5;
  }
  if (Math.abs(raw) > 1) dir = raw > 0 ? 1 : -1;
  lastY = y;
  lastT = now;
  if (!running) {
    running = true;
    schedule(step);
  }
}

function ensure() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  lastY = window.scrollY;
  onScroll(onScrollSample);
}

/** 0 → 1, smoothed. */
export function scrollVelocity(): number {
  return level.value;
}

/** Signed px/s, unsmoothed. Call `watchScrollVelocity` once before polling it. */
export function scrollSpeed(): number {
  return raw;
}

export function watchScrollVelocity() {
  ensure();
}

export function onScrollVelocity(fn: (level: number, signed: number) => void): () => void {
  ensure();
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

/** Write `--atlas-velocity` and `--atlas-velocity-dir` on `el` while bound. */
export function bindVelocity(el: HTMLElement | SVGElement | null): () => void {
  if (!el) return () => undefined;
  ensure();
  bound.add(el);
  el.style.setProperty('--atlas-velocity', level.value.toFixed(3));
  return () => {
    bound.delete(el);
    el.style.removeProperty('--atlas-velocity');
    el.style.removeProperty('--atlas-velocity-dir');
  };
}

/** `bindVelocity` for a component's element, for as long as it is mounted. */
export function useVelocityVar(ref: RefObject<HTMLElement | SVGElement | null>) {
  useEffect(() => bindVelocity(ref.current), [ref]);
}
