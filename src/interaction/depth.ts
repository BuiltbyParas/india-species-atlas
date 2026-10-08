import { hasFinePointer, prefersReducedMotion } from '../motion/preferences';
import { onPointerExit, onPointerMove, pointer } from './pointer';
import { Spring, SPRINGS, springDriver } from './spring';

/**
 * Photographs and plates that turn a little towards the light.
 *
 * An element with `data-depth` gets three custom properties while the pointer
 * is over it, eased on the depth spring:
 *
 *   --dx, --dy   where the pointer is across it, −0.5 → 0.5
 *   --dh         how engaged it is, 0 → 1 (eases in on enter, out on leave)
 *
 * The element itself never moves — CSS decides what responds (a photograph
 * drifting inside its frame, a plate tilting two or three degrees, a light
 * crossing it, crop marks closing in). Measuring a box that does not move
 * keeps the response steady. One delegated subscription; mouse and pen only.
 */
const SELECTOR = '[data-depth]';

let active: HTMLElement | null = null;
let fading: HTMLElement | null = null;
const dx = new Spring(0, SPRINGS.depth);
const dy = new Spring(0, SPRINGS.depth);
const dh = new Spring(0, SPRINGS.depth);
let installed = false;

function write(el: HTMLElement, x: number, y: number, h: number) {
  el.style.setProperty('--dx', x.toFixed(4));
  el.style.setProperty('--dy', y.toFixed(4));
  el.style.setProperty('--dh', h.toFixed(4));
}

function render() {
  const el = active ?? fading;
  if (!el) return;
  write(el, dx.value, dy.value, dh.value);
  if (!active && dh.value < 0.002 && Math.abs(dx.value) < 0.002 && Math.abs(dy.value) < 0.002) {
    el.style.removeProperty('--dx');
    el.style.removeProperty('--dy');
    el.style.removeProperty('--dh');
    delete el.dataset.depthOn;
    fading = null;
  }
}
const kick = springDriver([dx, dy, dh], render);

function leave() {
  if (!active) return;
  fading = active;
  active = null;
  dx.target = 0;
  dy.target = 0;
  dh.target = 0;
  kick();
}

function onMove() {
  if (pointer.type === 'touch') return;
  const over = pointer.target?.closest<HTMLElement>(SELECTOR) ?? null;
  if (over !== active) {
    if (active) leave();
    if (over && hasFinePointer() && !prefersReducedMotion()) {
      if (fading && fading !== over) {
        write(fading, 0, 0, 0);
        fading.style.removeProperty('--dh');
        delete fading.dataset.depthOn;
        dx.jump(0);
        dy.jump(0);
        dh.jump(0);
      }
      fading = null;
      active = over;
      active.dataset.depthOn = '';
    }
  }
  if (!active) return;
  const r = active.getBoundingClientRect();
  dx.target = Math.max(-0.5, Math.min(0.5, (pointer.x - r.left) / r.width - 0.5));
  dy.target = Math.max(-0.5, Math.min(0.5, (pointer.y - r.top) / r.height - 0.5));
  dh.target = 1;
  kick();
}

export function installDepth() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  onPointerMove(onMove);
  onPointerExit(leave);
}
