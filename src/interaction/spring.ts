import { schedule } from './loop';

/**
 * The one spring.
 *
 * Every physical response on the site — the cursor's reticle, a control
 * leaning towards the hand, a photograph tilting, a line straightening — is
 * this model with one of a handful of named tunings, so the whole atlas has
 * one weight. Damped harmonic motion, stepped semi-implicitly in fixed
 * sub-steps, so it is stable at any frame rate.
 */
export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass?: number;
  /** Below this distance and speed the spring is at rest. */
  precision?: number;
}

/**
 * The tunings. Damping ratios are near or above critical: the atlas settles,
 * it does not bounce. Two exceptions: `release`, a single small overshoot when
 * a pressed control lets go, and `lamp`, the hero's light, which carries a
 * little weight past where the hand stops (ζ ≈ 0.78, about 2 % over).
 */
export const SPRINGS = {
  /** The reticle following the hand: close behind, never sloppy. */
  cursor: { stiffness: 420, damping: 36 },
  /** The reticle's size and press: quick, one small overshoot. */
  release: { stiffness: 620, damping: 26 },
  /** A control leaning towards the pointer. */
  magnetic: { stiffness: 240, damping: 26 },
  /** A photograph or card turning to the light. */
  depth: { stiffness: 150, damping: 22 },
  /** Whole-scene drift under the pointer: slow, almost subconscious. */
  parallax: { stiffness: 38, damping: 14 },
  /** A line changing shape. */
  line: { stiffness: 90, damping: 19 },
  /** The hero's lamp swinging over the relief (radians): ω ≈ 6.5 rad/s, settled in about half a second. */
  lamp: { stiffness: 42, damping: 10.1, precision: 0.0004 },
} satisfies Record<string, SpringConfig>;

const STEP = 1 / 240;

export class Spring {
  value: number;
  target: number;
  velocity = 0;
  private readonly k: number;
  private readonly c: number;
  private readonly m: number;
  private readonly eps: number;

  constructor(value: number, config: SpringConfig = SPRINGS.magnetic) {
    this.value = value;
    this.target = value;
    this.k = config.stiffness;
    this.c = config.damping;
    this.m = config.mass ?? 1;
    this.eps = config.precision ?? 0.001;
  }

  /** Move to `value` at once, at rest. */
  jump(value: number) {
    this.value = value;
    this.target = value;
    this.velocity = 0;
  }

  /** Advance by `dt` seconds. Returns whether it is still moving. */
  step(dt: number): boolean {
    let remaining = dt;
    while (remaining > 1e-6) {
      const h = Math.min(STEP, remaining);
      const force = -this.k * (this.value - this.target) - this.c * this.velocity;
      this.velocity += (force / this.m) * h;
      this.value += this.velocity * h;
      remaining -= h;
    }
    if (Math.abs(this.value - this.target) < this.eps && Math.abs(this.velocity) < this.eps * 10) {
      this.value = this.target;
      this.velocity = 0;
      return false;
    }
    return true;
  }
}

/**
 * Steps a group of springs on the shared loop and calls `render` after each
 * step. Returns `kick`, to call whenever a target changes; the group stops
 * stepping by itself once every spring is at rest.
 */
export function springDriver(springs: readonly Spring[], render: () => void): () => void {
  let running = false;
  const task = (dt: number) => {
    let moving = false;
    for (const s of springs) if (s.step(dt)) moving = true;
    render();
    if (!moving) running = false;
    return moving;
  };
  return () => {
    if (running) return;
    running = true;
    schedule(task);
  };
}

/**
 * Exponential smoothing that is the same at any frame rate: `current` closes
 * on `target` at rate `lambda` per second. The per-frame `x += (t - x) * k`
 * it replaces ran twice as fast on a 120 Hz screen; a per-frame `k` tuned at
 * 60 Hz is `lambda = -ln(1 - k) * 60`.
 */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return target + (current - target) * Math.exp(-lambda * dt);
}

/** `lambda` for `damp` from a per-frame factor tuned at 60 Hz. */
export const perFrame = (k: number) => -Math.log(1 - k) * 60;
