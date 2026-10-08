import { on } from '../interaction/events';

/**
 * Every live WebGL scene, in one place.
 *
 * The atlas has three 3D scenes — the hero relief, the species gallery and the
 * conservation sites — each with its own renderer, built lazily by the page
 * that shows it and disposed with it. They are not merged into one permanent
 * scene: a reader who never opens the gallery should never pay for it, and a
 * single world-sized scene would hold every texture all the time.
 *
 * What they share instead is a lifecycle, which this registry runs:
 *
 *   mount     the page builds the scene and registers it with its element
 *   pause     when the element leaves the viewport, the tab is hidden, or a
 *             journey between pages is covering the screen
 *   resume    when none of those holds any more
 *   unmount   the page disposes it; the registration goes with it
 *
 * Pausing during a journey matters: the journey's overlay is the only thing
 * on screen, and a scene still rendering underneath it would compete for the
 * same frame budget the camera move needs.
 *
 * Each scene already renders on demand and steps its own quality down; the
 * registry only decides whether it may render at all.
 */
export interface Pausable {
  setActive: (active: boolean) => void;
}

interface Entry {
  name: string;
  scene: Pausable;
  onScreen: boolean;
  active: boolean | null;
}

const entries = new Set<Entry>();
let travelling = false;
let wired = false;

function sync(entry: Entry) {
  const next = entry.onScreen && !travelling && !document.hidden;
  if (next === entry.active) return;
  entry.active = next;
  entry.scene.setActive(next);
}

function syncAll() {
  for (const e of entries) sync(e);
}

function wire() {
  if (wired || typeof document === 'undefined') return;
  wired = true;
  document.addEventListener('visibilitychange', syncAll);
  on('navigation:start', () => {
    travelling = true;
    syncAll();
  });
  on('navigation:end', () => {
    travelling = false;
    syncAll();
  });
}

/**
 * Register a mounted scene. It is paused and resumed from now on; call the
 * returned function before disposing it.
 */
export function registerScene(name: string, scene: Pausable, element: Element, rootMargin = '0px'): () => void {
  wire();
  const entry: Entry = { name, scene, onScreen: true, active: null };
  entries.add(entry);
  const io = new IntersectionObserver(
    (records) => {
      for (const r of records) entry.onScreen = r.isIntersecting;
      sync(entry);
    },
    { rootMargin },
  );
  io.observe(element);
  sync(entry);
  return () => {
    io.disconnect();
    entries.delete(entry);
  };
}

/** For the performance notes and tests: which scenes exist and which are rendering. */
export function liveScenes(): Array<{ name: string; active: boolean }> {
  return [...entries].map((e) => ({ name: e.name, active: Boolean(e.active) }));
}

if (typeof window !== 'undefined') {
  (window as unknown as { __atlasScenes?: typeof liveScenes }).__atlasScenes = liveScenes;
}
