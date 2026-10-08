/**
 * How much the device can be asked for, decided once for every scene.
 *
 * Before this module each WebGL scene (the hero relief, the species gallery,
 * the conservation sites) chose its own pixel ratio and carried its own copy
 * of the frame-rate guard. A device got three answers, and a laptop that had
 * just struggled with the hero opened the gallery at full resolution and
 * struggled again. Now there is one tier and one guard:
 *
 *   tier       `high`, `balanced` or `low`, read from the device once and
 *              lowered for the rest of the session when any scene has to
 *              step itself down (`noteStrain`). It decides the pixel-ratio
 *              ceiling, the particle budget and where a scene's quality
 *              ladder starts.
 *   governor   `FrameGovernor` measures the share of slow frames in short
 *              windows and walks a scene down its own ladder of rungs, then
 *              asks for the flat fallback if even the last rung is too slow.
 *
 * The tier is also written to `<html data-quality>`, once, so CSS can drop
 * decoration (grain, blur) on the same devices the scenes simplify on.
 * `?quality=low|balanced|high` forces a tier for testing and is remembered for
 * the tab.
 */
export type QualityTier = 'high' | 'balanced' | 'low';

const ORDER: QualityTier[] = ['low', 'balanced', 'high'];
const KEY = 'atlas.quality';

let tier: QualityTier | null = null;

function readSession(): QualityTier | null {
  try {
    const v = sessionStorage.getItem(KEY);
    return v === 'high' || v === 'balanced' || v === 'low' ? v : null;
  } catch {
    return null;
  }
}

function writeSession(v: QualityTier) {
  try {
    sessionStorage.setItem(KEY, v);
  } catch {
    /* storage can be unavailable; the tier still holds for this page */
  }
}

function fromDevice(): QualityTier {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 8;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  if (memory <= 2 || cores <= 2) return 'low';
  // Phones and small tablets: dense screens on small GPUs, and a battery.
  if (coarse || memory <= 4 || cores <= 4) return 'balanced';
  return 'high';
}

function publish(v: QualityTier) {
  document.documentElement.dataset.quality = v;
}

/** The session's tier. */
export function qualityTier(): QualityTier {
  if (tier) return tier;
  if (typeof window === 'undefined') return 'high';
  const forced = new URLSearchParams(window.location.search).get('quality');
  if (forced === 'high' || forced === 'balanced' || forced === 'low') writeSession(forced);
  tier = readSession() ?? fromDevice();
  publish(tier);
  return tier;
}

/**
 * A scene had to step down: start the next one lower. Only ever lowers the
 * tier, and only by one step per strain, so one bad moment (a tab waking, a
 * garbage collection) cannot condemn the session.
 */
export function noteStrain() {
  const now = qualityTier();
  const i = ORDER.indexOf(now);
  if (i <= 0) return;
  tier = ORDER[i - 1];
  writeSession(tier);
  publish(tier);
}

/** The device pixel ratio a canvas should render at, under its own ceiling. */
export function pixelRatio(ceiling = 2): number {
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  const cap = { high: 2, balanced: 1.25, low: 1 }[qualityTier()];
  return Math.min(dpr, cap, ceiling);
}

/** How many of `count` particles this device should draw. */
export function particleBudget(count: number): number {
  return Math.round(count * { high: 1, balanced: 0.6, low: 0.3 }[qualityTier()]);
}

/** The rung of a scene's quality ladder to start on, out of `rungs`. */
export function startingRung(rungs: number): number {
  return Math.min(rungs, { high: 0, balanced: 0, low: 1 }[qualityTier()]);
}

export interface GovernorOptions {
  /** How many rungs the scene can step down before giving up. */
  rungs: number;
  /** Take the scene down to `rung` (1-based). */
  onStep: (rung: number) => void;
  /** Even the last rung is persistently too slow: fall back to the flat page. */
  onTooSlow?: () => void;
  /** A frame longer than this is slow. */
  slowFrameMs?: number;
  /** The share of slow frames in a window that steps the scene down. */
  degradeFraction?: number;
  /** The share, on the last rung, that abandons the scene. */
  abandonFraction?: number;
  /** A window closes after this many frames … */
  windowFrames?: number;
  /** … or this much time, whichever comes first, so a very slow device is judged quickly. */
  windowMs?: number;
  /** Consecutive bad windows on the last rung before giving up. */
  badWindows?: number;
}

/**
 * The frame-rate guard.
 *
 * Judged by the *proportion* of slow frames in a window rather than the mean.
 * A mean is hostage to single outliers, and one unavoidable outlier exists on
 * every device: the first frame that forces a driver to compile a shader can
 * take hundreds of milliseconds. A count only trips when frames are
 * persistently slow, which is the thing worth reacting to.
 *
 * Long frames are clamped into the window rather than discarded, so the
 * slowest devices still produce samples. After a step or a resize the next
 * frames are ignored (`reset(cooldown)`): reallocating render targets is
 * itself a very slow frame, and counting it walks the scene down a ladder it
 * did not need to descend.
 */
export class FrameGovernor {
  rung = 0;
  private readonly o: Required<Omit<GovernorOptions, 'onTooSlow'>> & Pick<GovernorOptions, 'onTooSlow'>;
  private previous = 0;
  private frames = 0;
  private time = 0;
  private slow = 0;
  private bad = 0;
  private cooldown = 0;

  constructor(options: GovernorOptions) {
    this.o = {
      slowFrameMs: 32,
      degradeFraction: 0.45,
      abandonFraction: 0.6,
      windowFrames: 24,
      windowMs: 700,
      badWindows: 2,
      ...options,
    };
  }

  /** Start on the rung the session's tier asks for. Call once the scene can be stepped. */
  begin() {
    const start = startingRung(this.o.rungs);
    while (this.rung < start) this.o.onStep(++this.rung);
    this.reset(start ? 10 : 0);
  }

  /** Forget the current window, ignoring the next `cooldown` frames. */
  reset(cooldown = 0) {
    this.previous = 0;
    this.frames = 0;
    this.time = 0;
    this.slow = 0;
    this.cooldown = Math.max(this.cooldown, cooldown);
  }

  /** Call with the frame's timestamp, once per rendered frame. */
  sample(now: number) {
    const gap = this.previous ? now - this.previous : 0;
    this.previous = now;
    if (this.cooldown > 0) {
      this.cooldown--;
      return;
    }
    if (gap <= 0) return;
    this.time += gap;
    this.frames++;
    if (gap > this.o.slowFrameMs) this.slow++;
    if (this.frames < this.o.windowFrames && this.time < this.o.windowMs) return;

    const fraction = this.slow / this.frames;
    this.frames = 0;
    this.time = 0;
    this.slow = 0;
    if (fraction < this.o.degradeFraction) {
      this.bad = 0;
      return;
    }
    if (this.rung < this.o.rungs) {
      this.o.onStep(++this.rung);
      noteStrain();
      this.reset(10);
      return;
    }
    if (fraction >= this.o.abandonFraction && ++this.bad >= this.o.badWindows) {
      this.bad = 0;
      this.o.onTooSlow?.();
    }
  }
}

if (typeof window !== 'undefined') {
  (window as unknown as { __atlasQuality?: () => QualityTier }).__atlasQuality = qualityTier;
}
