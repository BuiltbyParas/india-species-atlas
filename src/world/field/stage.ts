import * as THREE from 'three';
import { damp } from '../../interaction/spring';
import { onPointerMove, pointer, pointerVelocity } from '../../interaction/pointer';
import { onScroll } from '../../interaction/scroll';
import { prefersReducedMotion } from '../../motion/preferences';
import { hasWebGL } from '../../utils/canRender3D';
import { FrameGovernor, pixelRatio, qualityTier } from '../quality';
import { registerScene } from '../sceneRegistry';
import { SPECIES_BY_ID } from '../../data/species';
import { Compositor } from './gl/composite';
import { rgb } from './gl/color';
import { sizeLines } from './gl/line';
import { easeInOut } from './noise';
import type { FieldInput, FieldWorld, WorldFactory } from './types';

/**
 * The field stage: one renderer for the five field studies.
 *
 * Master 01 chose separate renderers for the hero, the gallery and the
 * conservation scene, and asked that the field studies get one between them,
 * not five. This is it. One canvas, one WebGL context, one frame loop, one
 * frame governor; five worlds built lazily into it, of which exactly one is
 * updated and drawn at a time — two only for the second or so while one
 * world turns into the next.
 *
 * The canvas lives in a fixed layer of its own, outside React's tree, so it
 * survives a route change: the index on the home page and a study's own page
 * are different components, but the reader sees one world carry on, the
 * camera still moving, while the page changes underneath it. A component
 * that shows the stage *attaches* a host element; the layer follows that
 * host's box as the page scrolls (one rectangle read a frame, no listeners of
 * its own) and paints behind the host's content. During a hand-over the layer
 * is brought to the front and held over the whole screen until the next host
 * has arrived and is in place.
 *
 * The stage renders every frame while its host is on screen — the worlds
 * have air in them, dust and water and snow — and not at all otherwise: off
 * screen, in a hidden tab, under the cinema or a journey (the scene registry
 * pauses it), with no host. With reduced motion it renders only when
 * something has changed, and nothing in a world moves by itself.
 */

const FACTORIES: Record<string, () => Promise<WorldFactory>> = {
  'great-indian-bustard': () => import('./worlds/thar').then((m) => m.createThar),
  'snow-leopard': () => import('./worlds/himalaya').then((m) => m.createHimalaya),
  'ganges-river-dolphin': () => import('./worlds/river').then((m) => m.createRiver),
  'bengal-tiger': () => import('./worlds/forest').then((m) => m.createForest),
  'indian-rhinoceros': () => import('./worlds/floodplain').then((m) => m.createFloodplain),
};

export type LayerMode = 'off' | 'host' | 'front';

interface Transition {
  from: string;
  to: string;
  start: number;
  duration: number;
  dir: [number, number];
  edge: THREE.Vector3;
  /** What the outgoing world keeps being told while it leaves. */
  frozen: { engage: number; progress: number; enter: number; drag: number };
  resolve: () => void;
}

interface Tween {
  from: number;
  to: number;
  start: number;
  duration: number;
  resolve: () => void;
}

/** The line colour each world's edge is drawn in when it arrives (the environments' lines). */
const EDGE: Record<string, string> = {
  'great-indian-bustard': '#d1a06a',
  'snow-leopard': '#a9c6d3',
  'ganges-river-dolphin': '#7ea3b5',
  'bengal-tiger': '#86a593',
  'indian-rhinoceros': '#c2a27a',
};

export function fieldCanRender(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  if (nav.connection?.saveData) return false;
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 1) return false;
  return hasWebGL();
}

export class FieldStage {
  readonly layer: HTMLDivElement;
  readonly canvas: HTMLCanvasElement;
  readonly renderer: THREE.WebGLRenderer;
  failed = false;
  /** Why the stage gave up, for diagnosis. */
  failReason = '';
  /** Mode changes and what caused them (newest last). */
  readonly modeLog: string[] = [];

  private worlds = new Map<string, FieldWorld>();
  private used = new Map<string, number>();
  private pending = new Map<string, Promise<FieldWorld | null>>();
  private current: string | null = null;
  /** The world `show` is building or about to show; eviction leaves it alone. */
  private wanted: string | null = null;
  private transition: Transition | null = null;
  private compositor: Compositor | null = null;
  private warm: THREE.WebGLRenderTarget | null = null;
  private host: HTMLElement | null = null;
  private unregister: (() => void) | null = null;
  private mode: LayerMode = 'off';
  private active = true;
  private raf = 0;
  private last = 0;
  private time = 0;
  private snapNext = new Set<string>();
  private targets = { engage: 0, progress: 0, drag: 0 };
  private values = { engage: 0, progress: 0, drag: 0, enter: 0, px: 0, py: 0 };
  private tween: Tween | null = null;
  private governor: FrameGovernor;
  /** The frame governor's rung: 0 is full quality, 2 the lowest before the stage gives up. */
  get rung() {
    return this.governor.rung;
  }
  private dpr: number;
  private width = 0;
  private height = 0;
  private failures = new Set<() => void>();
  private holdTimer = 0;

  constructor() {
    this.layer = document.createElement('div');
    this.layer.className = 'field-layer';
    this.layer.setAttribute('aria-hidden', 'true');
    this.layer.dataset.mode = 'off';
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'field-canvas';
    this.layer.appendChild(this.canvas);
    document.body.appendChild(this.layer);

    this.dpr = pixelRatio(1.75);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: qualityTier() !== 'low',
      alpha: false,
      powerPreference: 'high-performance',
    });
    // The worlds write the palette's sRGB values directly (gl/color.ts).
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.setPixelRatio(this.dpr);
    this.resize();

    this.governor = new FrameGovernor({
      rungs: 2,
      onStep: (rung) => {
        this.dpr = rung === 1 ? Math.min(this.dpr, 1.25) : 1;
        this.renderer.setPixelRatio(this.dpr);
        this.resize(true);
        for (const w of this.worlds.values()) w.setRung(rung);
      },
      onTooSlow: () => this.fail('too-slow'),
    });
    this.governor.begin();

    const request = () => this.request();
    onPointerMove(request);
    onScroll(request);
    window.addEventListener('resize', () => {
      this.resize();
      this.request();
    });
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.fail('context-lost');
    });
  }

  /* ---------------------------------------------------------------- hosts */

  /**
   * Show the stage in `host`. The layer follows the host's box and paints
   * behind its content. Returns the release; releasing does not hide a layer
   * that is being held in front for a hand-over.
   */
  attach(host: HTMLElement): () => void {
    this.unregister?.();
    this.host = host;
    this.unregister = registerScene('field', { setActive: (a) => this.setActive(a) }, host, '10% 0px');
    if (this.mode !== 'front') this.setMode('host');
    this.request();
    return () => {
      if (this.host !== host) return;
      this.unregister?.();
      this.unregister = null;
      this.host = null;
      this.active = true;
      if (this.mode === 'host') this.setMode('off');
    };
  }

  /**
   * Bring the layer over the whole screen and hold it there through a route
   * change, until `release()` (or a safety timeout: a hand-over that never
   * completes must not leave the page covered).
   */
  hold(timeout = 4000) {
    this.setMode('front');
    window.clearTimeout(this.holdTimer);
    this.holdTimer = window.setTimeout(() => this.release(), timeout);
    this.request();
  }

  release() {
    window.clearTimeout(this.holdTimer);
    this.setMode(this.host ? 'host' : 'off');
    this.request();
  }

  /** What a test needs to tell a stage that gave up from one that is merely idle. */
  get diagnostics() {
    return { windows: this.governor.windows, raf: this.raf !== 0, worldCount: this.worlds.size };
  }

  get layerMode(): LayerMode {
    return this.mode;
  }

  private setMode(mode: LayerMode) {
    if (this.mode === mode) return;
    this.modeLog.push(`${Math.round(performance.now())} ${this.mode}>${mode} showing=${this.showing} raf=${this.raf}`);
    if (this.modeLog.length > 16) this.modeLog.shift();
    this.mode = mode;
    this.layer.dataset.mode = mode;
    if (mode === 'front') this.layer.style.transform = '';
    if (mode === 'off') this.stop();
  }

  private setActive(active: boolean) {
    this.active = active;
    if (active) this.request();
  }

  onFail(fn: () => void): () => void {
    this.failures.add(fn);
    return () => this.failures.delete(fn);
  }

  private fail(reason: string) {
    if (this.failed) return;
    this.failed = true;
    this.failReason = reason;
    this.setMode('off');
    for (const f of this.failures) f();
  }

  /* --------------------------------------------------------------- worlds */

  /** Build a world (once), in the background. */
  prepare(id: string): Promise<FieldWorld | null> {
    const built = this.worlds.get(id);
    if (built) return Promise.resolve(built);
    let job = this.pending.get(id);
    if (job) return job;
    const factory = FACTORIES[id];
    const species = SPECIES_BY_ID[id];
    if (!factory || !species) return Promise.resolve(null);
    let t0 = 0;
    job = factory()
      .then((make) => {
        t0 = performance.now();
        return make({ species, tier: qualityTier(), dpr: this.dpr });
      })
      .then(async (world) => {
        buildMs[id] = Math.round(performance.now() - t0);
        world.resize(this.width, this.height, this.dpr);
        sizeLines(world.scene, this.width, this.height, this.dpr);
        if (this.governor.rung) world.setRung(this.governor.rung);
        // Compile now, off the critical frame, so the first frame it is shown does not stall.
        try {
          await this.renderer.compileAsync(world.scene, world.camera);
        } catch {
          /* compileAsync is an optimisation; the first render compiles anyway */
        }
        // Warm it up: one frame into a tiny target uploads its geometry, textures and own targets now,
        // in an idle moment, instead of on the first frame it is shown.
        this.warm ??= new THREE.WebGLRenderTarget(16, 16);
        world.prerender?.(this.renderer);
        this.renderer.setRenderTarget(this.warm);
        this.renderer.render(world.scene, world.camera);
        this.renderer.setRenderTarget(null);
        this.worlds.set(id, world);
        this.evict(id);
        return world;
      })
      .catch((err) => {
        console.warn('[field] a world could not be built', id, err);
        return null;
      })
      .finally(() => this.pending.delete(id));
    this.pending.set(id, job);
    return job;
  }

  private queue: string[] = [];
  private queueRunning = false;

  /**
   * Build these worlds one at a time, each in its own idle moment, so the
   * page is never asked to make two at once. The world on screen is built
   * first by `show` whatever the queue is doing.
   */
  prepareInIdle(ids: string[]) {
    for (const id of ids) if (!this.worlds.has(id) && !this.queue.includes(id)) this.queue.push(id);
    if (!this.queueRunning) this.runQueue();
  }

  private runQueue() {
    const next = this.queue.shift();
    if (!next) {
      this.queueRunning = false;
      // The hand-over between worlds needs its two targets; make them now rather than on the first hand-over.
      this.compositor ??= new Compositor(Math.round(this.width * this.mixScale), Math.round(this.height * this.mixScale));
      return;
    }
    this.queueRunning = true;
    const idle = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 200));
    idle(() => void this.prepare(next).finally(() => this.runQueue()), { timeout: 2500 });
  }

  /**
   * On the lowest tier, hold at most three worlds. The world just built (`fresh`)
   * and the one `show` is waiting for are never evicted: neither has been used
   * yet, so by age they would be the first to go, and the stage would then
   * show a world that no longer exists and stop drawing.
   */
  private evict(fresh?: string) {
    const cap = qualityTier() === 'low' ? 3 : 5;
    if (this.worlds.size <= cap) return;
    const keep = new Set([this.current, this.transition?.from, this.transition?.to, this.wanted, fresh]);
    const old = [...this.worlds.keys()].filter((k) => !keep.has(k)).sort((a, b) => (this.used.get(a) ?? 0) - (this.used.get(b) ?? 0));
    while (this.worlds.size > cap && old.length) {
      const id = old.shift()!;
      this.worlds.get(id)?.dispose();
      this.worlds.delete(id);
    }
  }

  get showing(): string | null {
    return this.transition?.to ?? this.current;
  }

  /**
   * Make `id` the world on screen. If another is showing, it turns into this
   * one over `duration` ms; `reset` sets the incoming world's inputs at once
   * (a study entered from another study starts at its own beginning).
   */
  async show(
    id: string,
    o: { duration?: number; cut?: boolean; reset?: Partial<{ engage: number; progress: number; enter: number; drag: number }> } = {},
  ): Promise<void> {
    this.wanted = id;
    // A world that cannot be built (a chunk that failed to load, a shader error) is tried once more;
    // if it still fails the stage gives up, so the study shows its photograph rather than an empty layer.
    let world = await this.prepare(id);
    if (!world && !this.failed) world = await this.prepare(id);
    if (!world && !this.failed) {
      console.error('[field] the world for', id, 'could not be built; falling back to the photograph');
      this.fail('build');
    }
    if (!world || this.failed) return;
    if (this.transition) this.finishTransition();
    const applyReset = () => {
      if (!o.reset) return;
      for (const [k, val] of Object.entries(o.reset)) {
        if (k === 'enter') {
          this.values.enter = val;
          this.tween = null;
        } else {
          this.values[k as 'engage' | 'progress' | 'drag'] = val;
          this.targets[k as 'engage' | 'progress' | 'drag'] = val;
        }
      }
    };
    if (this.current === id) {
      applyReset();
      return;
    }
    this.snapNext.add(id);
    const reduced = prefersReducedMotion();
    if (!this.current || o.cut || reduced) {
      applyReset();
      this.current = id;
      this.used.set(id, performance.now());
      this.request();
      return;
    }
    const from = this.current;
    const frozen = { engage: this.values.engage, progress: this.values.progress, enter: this.values.enter, drag: this.values.drag };
    applyReset();
    await new Promise<void>((resolve) => {
      this.transition = {
        from,
        to: id,
        start: performance.now(),
        duration: o.duration ?? 1300,
        dir: SWEEPS[id] ?? [0, 1],
        edge: rgb(EDGE[id] ?? '#e8e1cf'),
        frozen,
        resolve,
      };
      this.request();
    });
  }

  private finishTransition() {
    const t = this.transition;
    if (!t) return;
    this.transition = null;
    this.current = t.to;
    this.used.set(t.to, performance.now());
    t.resolve();
  }

  /* --------------------------------------------------------------- inputs */

  set(targets: Partial<{ engage: number; progress: number; drag: number }>) {
    Object.assign(this.targets, targets);
    this.request();
  }

  /** The preview → study move, 0 → 1 (and back), over `duration` ms. */
  enter(to: number, duration = 1100): Promise<void> {
    this.tween?.resolve();
    if (prefersReducedMotion() || duration <= 0) {
      this.values.enter = to;
      this.tween = null;
      this.request();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.tween = { from: this.values.enter, to, start: performance.now(), duration, resolve };
      this.request();
    });
  }

  /**
   * The dissolve renders two worlds at once, for about a second: on dense
   * screens it draws them at three-quarters of the screen's resolution, which
   * the moving ink edge hides, and returns to full resolution as it ends.
   */
  private get mixScale(): number {
    return this.dpr > 1.25 ? this.dpr * 0.75 : this.dpr;
  }

  get enterValue(): number {
    return this.values.enter;
  }

  /* ---------------------------------------------------------------- frame */

  private resize(force = false) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (!force && w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.compositor?.setSize(Math.round(w * this.mixScale), Math.round(h * this.mixScale));
    for (const world of this.worlds.values()) {
      world.resize(w, h, this.dpr);
      sizeLines(world.scene, w, h, this.dpr);
    }
    this.governor?.reset(10);
  }

  request() {
    if (this.raf || this.failed || this.mode === 'off') return;
    if (!this.active && this.mode !== 'front') return;
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  private stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.last = 0;
  }

  private place(): boolean {
    if (this.mode !== 'host' || !this.host) return true;
    const r = this.host.getBoundingClientRect();
    const vh = window.innerHeight;
    if (r.bottom <= 0 || r.top >= vh) {
      this.layer.style.visibility = 'hidden';
      return false;
    }
    this.layer.style.visibility = '';
    this.layer.style.transform = `translate3d(0, ${r.top.toFixed(1)}px, 0)`;
    this.layer.style.height = `${Math.min(vh, r.height).toFixed(1)}px`;
    return true;
  }

  private input(dt: number, override?: Transition['frozen'], snap = false): FieldInput {
    const v = override ?? this.values;
    const vel = pointerVelocity();
    return {
      time: this.time,
      dt,
      pointer: { x: this.values.px, y: this.values.py },
      pointerRaw: { x: pointer.nx, y: -pointer.ny },
      pointerSpeed: vel.speed,
      pointerDown: pointer.down,
      engage: v.engage,
      enter: v.enter,
      progress: v.progress,
      drag: v.drag,
      reduced: prefersReducedMotion(),
      snap,
    };
  }

  private draw(id: string, input: FieldInput, target: THREE.WebGLRenderTarget | null) {
    const world = this.worlds.get(id);
    if (!world) return;
    world.update(input);
    world.prerender?.(this.renderer);
    this.renderer.setRenderTarget(target);
    this.renderer.setClearColor(world.clear, 1);
    this.renderer.render(world.scene, world.camera);
  }

  private frame(now: number) {
    this.raf = 0;
    if (this.failed || this.mode === 'off') return;
    const reduced = prefersReducedMotion();
    const dt = this.last ? Math.min(Math.max((now - this.last) / 1000, 0), 1 / 20) : 1 / 60;
    this.last = now;
    if (!reduced) this.time += dt;

    const v = this.values;
    const t = this.targets;
    const snap = reduced;
    v.engage = snap ? t.engage : damp(v.engage, t.engage, 4.5, dt);
    v.progress = snap ? t.progress : damp(v.progress, t.progress, 5.5, dt);
    v.drag = snap ? t.drag : damp(v.drag, t.drag, 7, dt);
    const inside = pointer.inside && pointer.type === 'mouse';
    const px = inside && !reduced ? pointer.nx : 0;
    const py = inside && !reduced ? -pointer.ny : 0;
    v.px = damp(v.px, px, 2.6, dt);
    v.py = damp(v.py, py, 2.6, dt);
    if (this.tween) {
      const k = Math.min(1, (now - this.tween.start) / this.tween.duration);
      v.enter = this.tween.from + (this.tween.to - this.tween.from) * k;
      if (k >= 1) {
        const done = this.tween.resolve;
        this.tween = null;
        done();
      }
    }

    if (!this.place()) return;
    this.resize();

    const tr = this.transition;
    if (tr) {
      if (!this.compositor) this.compositor = new Compositor(Math.round(this.width * this.mixScale), Math.round(this.height * this.mixScale));
      const k = Math.min(1, (now - tr.start) / tr.duration);
      this.draw(tr.from, this.input(dt, tr.frozen), this.compositor.a);
      const fresh = this.snapNext.delete(tr.to);
      this.draw(tr.to, this.input(dt, undefined, fresh), this.compositor.b);
      this.compositor.draw(this.renderer, easeInOut(k), tr.dir, tr.edge);
      if (k >= 1) this.finishTransition();
    } else if (this.current) {
      const fresh = this.snapNext.delete(this.current);
      this.draw(this.current, this.input(dt, undefined, fresh || reduced), null);
    }
    // The dissolve draws two worlds and the compositor for a second or two by design; its frames say
    // nothing about whether the device can hold one world, so they are not judged (and cannot abandon the stage).
    if (tr) this.governor.reset();
    else this.governor.sample(now);

    const settled =
      !this.transition &&
      !this.tween &&
      Math.abs(v.engage - t.engage) < 1e-3 &&
      Math.abs(v.progress - t.progress) < 1e-4 &&
      Math.abs(v.drag - t.drag) < 1e-3 &&
      Math.abs(v.px - px) < 1e-3 &&
      Math.abs(v.py - py) < 1e-3;
    if (reduced && settled) {
      this.last = 0;
      return;
    }
    if (this.active || this.mode === 'front') this.raf = requestAnimationFrame((n) => this.frame(n));
    else this.last = 0;
  }
}

/** The sweep each world arrives with (content/fieldStudies.ts keeps the editorial copy). */
const SWEEPS: Record<string, [number, number]> = {
  'great-indian-bustard': [1, 0.15],
  'snow-leopard': [0, 1],
  'ganges-river-dolphin': [1, -0.2],
  'bengal-tiger': [0, -1],
  'indian-rhinoceros': [-1, 0.1],
};

/** How long each world took to build on the main thread (for the performance notes). */
const buildMs: Record<string, number> = {};

let stage: FieldStage | null = null;

/** The one stage, created on first use; null where WebGL is unavailable. */
export function getFieldStage(): FieldStage | null {
  if (stage) return stage.failed ? null : stage;
  if (!fieldCanRender()) return null;
  try {
    stage = new FieldStage();
  } catch (err) {
    console.warn('[field] the stage could not start', err);
    return null;
  }
  return stage;
}

if (typeof window !== 'undefined') {
  (window as unknown as { __atlasField?: () => object }).__atlasField = () => ({
    mode: stage?.layerMode ?? 'none',
    showing: stage?.showing ?? null,
    failed: stage?.failed ?? false,
    failReason: stage?.failReason ?? '',
    modeLog: stage?.modeLog ?? [],
    ...stage?.diagnostics,
    tier: qualityTier(),
    rung: stage?.rung ?? 0,
    calls: stage?.renderer.info.render.calls ?? 0,
    triangles: stage?.renderer.info.render.triangles ?? 0,
    geometries: stage?.renderer.info.memory.geometries ?? 0,
    textures: stage?.renderer.info.memory.textures ?? 0,
    buildMs,
  });
}
