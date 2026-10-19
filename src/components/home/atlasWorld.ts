import { useSyncExternalStore } from 'react';
import { onScroll } from '../../interaction/scroll';
import { registerScene } from '../../world/sceneRegistry';
import type { GeoCam } from '../../world/geoCamera';
import type { AtlasState, AtlasTrace, HeroScene } from './heroScene';

/**
 * The atlas world: one relief of India, one renderer, for the whole home page.
 *
 * The hero built a 3D relief and gave it up as soon as the descent ended; the
 * page then went on to draw the same country again and again as flat SVG. Now
 * the hero's scene is the page's world. Its canvas lives in a fixed layer of
 * its own at the back of the page (the field stage's model: one canvas, one
 * context, one loop), and the page is a set of sheets laid over it. Where a
 * *span* of the page is transparent — the hero's section, or Chapter 04, the
 * closing and the colophon taken together — the layer is uncovered, clipped
 * to exactly that span, and the scene plays the act that span asks for:
 *
 *   'hero'   the descent (HeroScrollScene drives it, as it always has)
 *   'atlas'  pressure → response → what remains (the chapters push their
 *            scrubbed values here, see `setAtlas`)
 *
 * Everything between the spans — Chapter 02, the field studies (their own
 * stage), Chapter 03 — is an opaque sheet; the layer is hidden and the scene
 * does not render while none of its spans is on screen.
 *
 * The layer never moves with the page: a span scrolling away is a window
 * closing over a world that stays put, which is what makes the sheets read
 * as lying *on* it. While Chapter 04 arrives its window is a plate, inset
 * from the sheet's edges, that grows to the frame (`setPlate`).
 *
 * Placement runs inside the shared scroll signal (two rectangle reads per
 * span, no layout written), so the clip is set before the frame is painted.
 */

export type SpanName = 'hero' | 'atlas';

interface Span {
  first: HTMLElement;
  last: HTMLElement;
}

let layer: HTMLDivElement | null = null;
let canvas: HTMLCanvasElement | null = null;
let scene: HeroScene | null = null;
const spans = new Map<SpanName, Span>();
let current: SpanName | null = null;
/** The plate's inset while Chapter 04 arrives, px from the sheet's sides and its top. */
const plate = { x: 0, y: 0 };
let lastClip = '';
let lastPlate = '';
/** Whether the scene registry allows each span's act to render (not hidden, not under a journey or a film). */
const allowed: Record<SpanName, boolean> = { hero: true, atlas: true };
let unregister: Array<() => void> = [];
let offScroll: (() => void) | null = null;
let onResize: (() => void) | null = null;
/** Pending state, kept while no scene is bound, so a chapter that mounted first is not lost. */
const pending: { atlas: Partial<AtlasState>; trace: AtlasTrace | null } = { atlas: {}, trace: null };

const listeners = new Set<() => void>();
function notify() {
  for (const l of listeners) l();
}

/** The fixed layer and its canvas, created for the hero's scene and removed with it. */
export function mountAtlasLayer(): HTMLCanvasElement {
  if (canvas) return canvas;
  layer = document.createElement('div');
  layer.className = 'atlas-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.dataset.span = 'none';
  canvas = document.createElement('canvas');
  canvas.className = 'atlas-canvas';
  layer.appendChild(canvas);
  document.body.prepend(layer);
  offScroll = onScroll(place);
  onResize = () => place();
  window.addEventListener('resize', onResize);
  return canvas;
}

export function unmountAtlasLayer() {
  bindAtlasScene(null);
  offScroll?.();
  offScroll = null;
  if (onResize) window.removeEventListener('resize', onResize);
  onResize = null;
  layer?.remove();
  layer = null;
  canvas = null;
  current = null;
  lastClip = '';
  lastPlate = '';
}

/**
 * Bind the live scene (or null when it is given up). Registers the two acts
 * with the scene registry: 'hero' against the hero's stage, so a journey to
 * the atlas can still lay the relief flat from the descent, and 'atlas'
 * against the layer itself, which only pauses for the tab, a journey or a film.
 */
export function bindAtlasScene(next: HeroScene | null, heroStage?: HTMLElement, toSheet?: (cam: GeoCam, t: number) => void) {
  for (const u of unregister) u();
  unregister = [];
  scene = next;
  if (scene && layer && heroStage) {
    unregister.push(
      registerScene('hero', { setActive: (a) => ((allowed.hero = a), sync()), toSheet }, heroStage),
      registerScene('atlas', { setActive: (a) => ((allowed.atlas = a), sync()) }, layer),
    );
    scene.setAtlas(pending.atlas);
    scene.setTrace(pending.trace);
  }
  current = null;
  place();
  notify();
}

function sync() {
  if (!scene) return;
  scene.setActive(current !== null && allowed[current]);
}

/** Show the layer through a span of the page while any of it is on screen. Returns the release. */
export function attachSpan(name: SpanName, first: HTMLElement, last: HTMLElement = first): () => void {
  const span = { first, last };
  spans.set(name, span);
  requestAnimationFrame(place);
  if (name === 'atlas') scene?.prepareAtlas();
  return () => {
    if (spans.get(name) !== span) return;
    spans.delete(name);
    place();
  };
}

/** The atlas act's scrubbed values (Chapter 04 and the closing). */
export function setAtlas(state: Partial<AtlasState>) {
  Object.assign(pending.atlas, state);
  scene?.setAtlas(state);
}

/** What the reader is tracing in Chapter 04: species threads and programme sites lit, the rest stepped back. */
export function setAtlasTrace(trace: AtlasTrace | null) {
  pending.trace = trace;
  scene?.setTrace(trace);
}

let placeQueued = 0;
/**
 * The plate's inset as Chapter 04 arrives (0 once it has grown to the frame). Applied on the next frame, not
 * here: it is written from scrubbed tweens that have just written styles, and reading the spans' rectangles
 * straight after would force a layout for every tween, every frame.
 */
export function setPlate(x: number, y: number) {
  if (Math.abs(plate.x - x) < 0.05 && Math.abs(plate.y - y) < 0.05) return;
  plate.x = x;
  plate.y = y;
  placeQueued ||= requestAnimationFrame(() => {
    placeQueued = 0;
    place();
  });
}

function place() {
  if (!layer || !canvas) return;
  const vh = window.innerHeight;
  let best: SpanName | null = null;
  let top = 0;
  let bottom = 0;
  let overlap = 0;
  for (const [name, s] of spans) {
    if (!s.first.isConnected || !s.last.isConnected) continue;
    const t = s.first.getBoundingClientRect().top;
    const b = s.last.getBoundingClientRect().bottom;
    const o = Math.min(vh, b) - Math.max(0, t);
    if (o > overlap) {
      overlap = o;
      best = name;
      top = t;
      bottom = b;
    }
  }
  if (best !== current) {
    current = best;
    layer.dataset.span = best ?? 'none';
    if (best) scene?.setAct(best);
    sync();
    notify();
  }
  if (!best) return;
  const t = Math.max(0, top);
  const b = Math.max(t, Math.min(vh, bottom));
  const clip = `inset(${t.toFixed(1)}px 0 ${(vh - b).toFixed(1)}px 0)`;
  if (clip !== lastClip) {
    lastClip = clip;
    layer.style.clipPath = clip;
  }
  // The plate: while the span arrives the picture travels in with it, its top on the plate's top edge (a sheet carrying its
  // picture, not a window sliding over a still one), inset from the sides; it stops once the span holds the screen.
  const arriving = best === 'atlas' && top > 0.5;
  const offset = arriving ? top + plate.y : 0;
  const inset = best === 'atlas' && plate.x > 0.5;
  const p = `${offset.toFixed(1)}|${inset ? plate.x.toFixed(1) : 0}`;
  if (p !== lastPlate) {
    lastPlate = p;
    canvas.style.transform = offset > 0 ? `translate3d(0, ${offset.toFixed(1)}px, 0)` : '';
    canvas.style.clipPath = inset ? `inset(0 ${plate.x.toFixed(1)}px 0 ${plate.x.toFixed(1)}px)` : 'none';
  }
}

/*
 * What the act reports back for the DOM laid over it: the anchor localities' screen positions (Chapter 04's
 * traced names) and where the Tropic of Cancer crosses the frame (the closing hangs the name on it). One
 * listener each; the last report is kept, so a chapter that mounts after the act has started still gets it.
 */
type AnchorsListener = (layout: Float32Array) => void;
type MarksListener = (marks: { tropicY: number } | null) => void;
let anchorsListener: AnchorsListener | null = null;
let marksListener: MarksListener | null = null;
let lastMarks: { tropicY: number } | null = null;

export function emitAtlasAnchors(layout: Float32Array) {
  anchorsListener?.(layout);
}
export function emitAtlasMarks(marks: { tropicY: number } | null) {
  lastMarks = marks;
  marksListener?.(marks);
}
export function onAtlasAnchors(fn: AnchorsListener): () => void {
  anchorsListener = fn;
  return () => {
    if (anchorsListener === fn) anchorsListener = null;
  };
}
export function onAtlasMarks(fn: MarksListener): () => void {
  marksListener = fn;
  fn(lastMarks);
  return () => {
    if (marksListener === fn) marksListener = null;
  };
}

/** Which span the layer is showing, if any (for the dev console and the audit scripts). */
export function atlasSpan(): SpanName | null {
  return current;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Whether the atlas world is live: chapters draw their own SVG maps when it is not. */
export function useAtlasLive(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => scene !== null,
    () => false,
  );
}

if (typeof window !== 'undefined') {
  (window as unknown as { __atlasWorld?: () => object }).__atlasWorld = () => ({
    live: scene !== null,
    span: current,
    spans: [...spans.keys()],
    clip: lastClip,
    plate: lastPlate,
    state: { ...pending.atlas },
  });
}
