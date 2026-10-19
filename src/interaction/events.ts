/**
 * The interaction stream.
 *
 * Components announce what the reader is doing — hovering, pressing,
 * navigating, entering a chapter or a species — rather than each wiring its
 * own side effects. Nothing listens yet except the engine itself, but a sound
 * layer, analytics or a test can subscribe to one place. No audio is played by
 * anything in this file.
 *
 * Every event is also dispatched on `window` as `atlas:<type>`, so code
 * outside the bundle (a devtools snippet, a future sound worklet) can hear it.
 */
export interface AtlasEvents {
  'interaction:hover': { el: Element; kind: string };
  'interaction:press': { el: Element; kind: string; pointer: string };
  'interaction:click': { el: Element; kind: string };
  'navigation:start': { from: string; to: string };
  'navigation:end': { path: string };
  'chapter:start': { index: number; title: string };
  'species:enter': { id: string };
  'species:exit': { id: string };
  'environment:change': { env: string };
  'media:open': { kind: string };
  'media:close': { kind: string };
}

type Listener<K extends keyof AtlasEvents> = (detail: AtlasEvents[K]) => void;
const listeners = new Map<keyof AtlasEvents, Set<Listener<never>>>();

export function emit<K extends keyof AtlasEvents>(type: K, detail: AtlasEvents[K]) {
  const set = listeners.get(type);
  if (set) for (const l of set) (l as Listener<K>)(detail);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(`atlas:${type}`, { detail }));
}

export function on<K extends keyof AtlasEvents>(type: K, listener: Listener<K>): () => void {
  let set = listeners.get(type);
  if (!set) listeners.set(type, (set = new Set()));
  set.add(listener as Listener<never>);
  return () => set.delete(listener as Listener<never>);
}
