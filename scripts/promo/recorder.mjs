import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import {
  BROWSER_ARGS,
  CAPTURE,
  FPS,
  GPU_ARGS,
  RECORDING_CSS,
} from './config.mjs';

/**
 * A virtual clock, installed before any page script runs.
 *
 * Frames are captured one at a time and a capture costs far more wall-clock
 * time than the 33 ms it represents, so anything that animates against the
 * real clock would run at the wrong speed — or, in the hero's case, switch
 * itself off: the 3D scene watches its own frame times and falls back to the
 * flat hero when they stay above 32 ms. Replacing `requestAnimationFrame` and
 * `performance.now()` with a clock this script advances by hand makes the
 * recording independent of how fast this machine happens to be, and makes the
 * hero measure a steady 60 fps while it is being photographed.
 *
 * The step is 1/60 s and the recorder ticks twice per captured frame, so one
 * frame of a 30 fps video carries exactly 33.3 ms of page time.
 */
const VIRTUAL_CLOCK = `
(() => {
  const STEP = 1000 / 60;
  let vnow = 0;
  let nextId = 0;
  const callbacks = new Map();
  window.requestAnimationFrame = (cb) => { const id = ++nextId; callbacks.set(id, cb); return id; };
  window.cancelAnimationFrame = (id) => { callbacks.delete(id); };
  performance.now = () => vnow;
  window.__promoClock = {
    tick(steps = 1) {
      for (let i = 0; i < steps; i++) {
        vnow += STEP;
        const batch = Array.from(callbacks.values());
        callbacks.clear();
        for (const cb of batch) {
          try { cb(vnow); } catch (err) { console.error(err); }
        }
      }
    },
    get pending() { return callbacks.size; },
  };
})();
`;

/** Ticks of the virtual clock per captured frame. */
const TICKS_PER_FRAME = 2;

export class Recorder {
  constructor({ framesDir, origin, quality = 95 }) {
    this.framesDir = framesDir;
    this.origin = origin;
    this.quality = quality;
    /** When true, the choreography runs but nothing is written. Used to warm
     *  the map-tile cache so the recorded pass has no grey squares in it. */
    this.dry = false;
    this.shotDir = null;
    this.index = 0;
    this.gpu = true;
  }

  async start() {
    const launch = async (args) =>
      chromium.launch({ args: [...BROWSER_ARGS, ...args] });
    try {
      this.browser = await launch(GPU_ARGS);
    } catch {
      this.gpu = false;
      this.browser = await launch([]);
    }
    this.context = await this.browser.newContext({
      viewport: { width: CAPTURE.width, height: CAPTURE.height },
      deviceScaleFactor: CAPTURE.scale,
      reducedMotion: 'no-preference',
    });
    await this.context.addInitScript(VIRTUAL_CLOCK);
    this.page = await this.context.newPage();
    this.page.on('pageerror', (err) => console.warn('  page error:', err.message));
    this.cdp = await this.context.newCDPSession(this.page);

    const renderer = await this.probeRenderer();
    console.log(`  renderer: ${renderer}`);
    if (/swiftshader/i.test(renderer)) {
      this.gpu = false;
      console.warn('  ! software WebGL — the hero will still record, just slowly.');
    }
  }

  async probeRenderer() {
    await this.page.goto(`${this.origin}/`, { waitUntil: 'domcontentloaded' });
    return this.page.evaluate(() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
      } catch {
        return 'unavailable';
      }
    });
  }

  async stop() {
    await this.browser?.close();
  }

  async beginShot(id) {
    this.shotDir = join(this.framesDir, id);
    this.index = 0;
    if (!this.dry) {
      await rm(this.shotDir, { recursive: true, force: true });
      await mkdir(this.shotDir, { recursive: true });
    }
  }

  async goto(path, { waitUntil = 'networkidle' } = {}) {
    await this.page.goto(`${this.origin}${path}`, { waitUntil });
    await this.page.addStyleTag({ content: RECORDING_CSS });
    await this.tick(4);
  }

  /** Advances page time without capturing anything. */
  async tick(steps = TICKS_PER_FRAME) {
    await this.page.evaluate((n) => window.__promoClock.tick(n), steps);
  }

  /** Advances page time by one video frame and writes that frame out. */
  async frame() {
    await this.tick(TICKS_PER_FRAME);
    if (this.dry) return;
    const { data } = await this.cdp.send('Page.captureScreenshot', {
      format: 'jpeg',
      quality: this.quality,
      captureBeyondViewport: false,
    });
    const name = String(this.index++).padStart(5, '0');
    await writeFile(join(this.shotDir, `${name}.jpg`), Buffer.from(data, 'base64'));
  }

  /** Holds the current state for `frames` frames. */
  async hold(frames) {
    for (let i = 0; i < frames; i++) await this.frame();
  }

  /**
   * Runs `step(t)` once per frame with `t` sweeping 0 → 1, then captures.
   * This is the only way motion should be produced: the position is a pure
   * function of the frame number, so the same run always yields the same video.
   */
  async animate(frames, step) {
    for (let i = 0; i < frames; i++) {
      await step((i + 1) / frames, i);
      await this.frame();
    }
  }

  async scrollTo(y) {
    await this.page.evaluate((v) => window.scrollTo(0, v), Math.round(y));
  }

  /** Real time, for the few things that are genuinely timed by the browser. */
  async settle(ms) {
    await this.page.waitForTimeout(ms);
    await this.tick(6);
  }

  /**
   * Splits a frame budget across a shot's beats by weight, without losing or
   * inventing frames: the last beat absorbs the rounding.
   */
  static split(total, weights) {
    const sum = weights.reduce((a, b) => a + b, 0);
    const out = weights.map((w) => Math.floor((w / sum) * total));
    out[out.length - 1] += total - out.reduce((a, b) => a + b, 0);
    return out;
  }
}

export const seconds = (s) => Math.round(s * FPS);

/** Ken Perlin's smootherstep, for scroll ramps that start and end at rest. */
export const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
export const lerp = (a, b, t) => a + (b - a) * t;
