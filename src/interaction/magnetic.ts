import { hasFinePointer, prefersReducedMotion } from '../motion/preferences';
import { onPointerExit, onPointerMove, pointer } from './pointer';
import { onScroll } from './scroll';
import { Spring, SPRINGS, springDriver } from './spring';

/**
 * Controls that lean towards the hand.
 *
 * Any element with `data-magnetic` is pulled a little towards the pointer
 * while the pointer is over it, follows it on a spring, holds on for a short
 * way past its edge, and settles home when the pointer leaves. A child marked
 * `data-magnetic-inner` (usually the label) travels a little further than its
 * frame, which is what gives the pull depth rather than a slide.
 *
 * `data-magnetic="0.4"` sets the strength (default 0.3). The pull is capped by
 * the control's size, so a large link moves no further than a small one — it
 * should say "this is the thing to press", never chase the hand.
 *
 * One delegated pointer subscription for the whole site; nothing runs while no
 * control is engaged. Mouse and pen only, and never with reduced motion. It
 * writes the individual `translate` property, so it composes with a control's
 * own `transform` and with the press `scale`.
 */
const SELECTOR = '[data-magnetic]';
const HOLD = 22; // px past the edge before letting go

interface Engaged {
  el: HTMLElement;
  inner: HTMLElement | null;
  strength: number;
}

let engaged: Engaged | null = null;
let leaving: Engaged | null = null;
const sx = new Spring(0, SPRINGS.magnetic);
const sy = new Spring(0, SPRINGS.magnetic);
let installed = false;

function render() {
  const target = engaged ?? leaving;
  if (!target) return;
  const x = sx.value;
  const y = sy.value;
  const still = Math.abs(x) < 0.01 && Math.abs(y) < 0.01 && !engaged;
  target.el.style.translate = still ? '' : `${x.toFixed(2)}px ${y.toFixed(2)}px`;
  if (target.inner) target.inner.style.translate = still ? '' : `${(x * 0.45).toFixed(2)}px ${(y * 0.45).toFixed(2)}px`;
  if (still) leaving = null;
}
const kick = springDriver([sx, sy], render);

function release() {
  if (!engaged) return;
  leaving = engaged;
  engaged = null;
  sx.target = 0;
  sy.target = 0;
  kick();
}

function engage(el: HTMLElement) {
  const previous = engaged ?? leaving;
  if (previous && previous.el !== el) {
    // One pair of springs: snap the previous control home rather than leave it part-way.
    previous.el.style.translate = '';
    if (previous.inner) previous.inner.style.translate = '';
    sx.jump(0);
    sy.jump(0);
  }
  leaving = null;
  const s = Number.parseFloat(el.dataset.magnetic ?? '');
  engaged = { el, inner: el.querySelector<HTMLElement>('[data-magnetic-inner]'), strength: Number.isFinite(s) && s > 0 ? s : 0.3 };
}

function onMove() {
  if (pointer.type === 'touch') return;
  const over = pointer.target?.closest<HTMLElement>(SELECTOR) ?? null;
  if (over && over !== engaged?.el) {
    if (!hasFinePointer() || prefersReducedMotion()) return;
    engage(over);
  }
  if (!engaged) return;
  const { el, strength } = engaged;
  const r = el.getBoundingClientRect();
  // The rectangle includes the pull itself; measure from where it would rest.
  const cx = r.left + r.width / 2 - sx.value;
  const cy = r.top + r.height / 2 - sy.value;
  const dx = pointer.x - cx;
  const dy = pointer.y - cy;
  if (over !== el && (Math.abs(dx) > r.width / 2 + HOLD || Math.abs(dy) > r.height / 2 + HOLD)) {
    release();
    return;
  }
  const max = Math.min(14, 4 + 0.2 * Math.min(r.width, r.height));
  sx.target = Math.max(-max, Math.min(max, dx * strength));
  sy.target = Math.max(-max, Math.min(max, dy * strength));
  kick();
}

/** The control the pointer is engaged with, at its resting centre, for the cursor to lock onto. */
export function magneticFocus(): { el: HTMLElement; x: number; y: number; w: number; h: number } | null {
  if (!engaged) return null;
  const r = engaged.el.getBoundingClientRect();
  return { el: engaged.el, x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
}

export function installMagnetic() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  onPointerMove(onMove);
  onPointerExit(release);
  onScroll(() => engaged && onMove());
}
