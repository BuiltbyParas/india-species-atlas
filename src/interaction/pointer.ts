/**
 * Where the hand is, once for the whole site.
 *
 * One passive `pointermove` listener on the window keeps the position, the
 * kind of pointer and a smoothed velocity; the cursor, magnetic controls,
 * hover depth, parallax and the ink trail all read it instead of each adding
 * listeners of their own. Velocity is in pixels per second and decays by
 * itself once the hand stops, so a reader polling it on a frame always gets
 * an honest value.
 */
export interface PointerState {
  x: number;
  y: number;
  /** Position as −1 → 1 across the viewport. */
  nx: number;
  ny: number;
  type: string;
  down: boolean;
  /** Whether the pointer is in the window at all. */
  inside: boolean;
  target: Element | null;
}

export const pointer: PointerState = {
  x: -1000,
  y: -1000,
  nx: 0,
  ny: 0,
  type: 'mouse',
  down: false,
  inside: false,
  target: null,
};

let vx = 0;
let vy = 0;
let lastT = 0;
const VELOCITY_SMOOTHING = 0.045; // s
const VELOCITY_DECAY = 0.07; // s

type Move = (e: PointerEvent) => void;
const moves = new Set<Move>();
const exits = new Set<() => void>();
let listening = false;

function onMove(e: PointerEvent) {
  const now = e.timeStamp || performance.now();
  const dt = lastT ? Math.max((now - lastT) / 1000, 1 / 1000) : 0;
  if (dt > 0 && dt < 0.25 && pointer.inside) {
    const a = 1 - Math.exp(-dt / VELOCITY_SMOOTHING);
    vx += ((e.clientX - pointer.x) / dt - vx) * a;
    vy += ((e.clientY - pointer.y) / dt - vy) * a;
  } else {
    vx = 0;
    vy = 0;
  }
  lastT = now;
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.nx = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.ny = (e.clientY / window.innerHeight) * 2 - 1;
  pointer.type = e.pointerType;
  pointer.inside = true;
  pointer.target = e.target instanceof Element ? e.target : null;
  for (const m of moves) m(e);
}

function onLeave() {
  pointer.inside = false;
  vx = 0;
  vy = 0;
  for (const x of exits) x();
}

function ensure() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', (e) => {
    pointer.down = true;
    pointer.type = e.pointerType;
  }, { passive: true });
  window.addEventListener('pointerup', () => (pointer.down = false), { passive: true });
  window.addEventListener('pointercancel', () => (pointer.down = false), { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  window.addEventListener('blur', onLeave);
}

/** Subscribe to every pointer move. */
export function onPointerMove(fn: Move): () => void {
  ensure();
  moves.add(fn);
  return () => moves.delete(fn);
}

/** Subscribe to the pointer leaving the window. */
export function onPointerExit(fn: () => void): () => void {
  ensure();
  exits.add(fn);
  return () => exits.delete(fn);
}

/** The pointer's velocity now, in px/s, decayed for the time since it last moved. */
export function pointerVelocity(now = performance.now()): { vx: number; vy: number; speed: number } {
  const idle = lastT ? Math.max(0, (now - lastT) / 1000) : 1;
  const f = Math.exp(-idle / VELOCITY_DECAY);
  const x = vx * f;
  const y = vy * f;
  return { vx: x, vy: y, speed: Math.hypot(x, y) };
}
