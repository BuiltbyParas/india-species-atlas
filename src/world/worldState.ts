import { useSyncExternalStore } from 'react';
import { INDIA_CAM, type GeoCam } from './geoCamera';

/**
 * The world the reader is travelling through, kept between pages.
 *
 * Pages do not own the geography; they look at it. Whichever page last framed
 * the sheet writes where it was looking (`camera`), which place and which
 * species it was about, and — at the moment of a click — the geographic
 * object the reader chose (`origin`). The next page, or the journey between
 * them, starts from there instead of from nothing. That is all "one world"
 * needs: a shared projection (`geo/india.ts`), a shared camera
 * (`geoCamera.ts`) and this small record of where we are.
 *
 * It is deliberately not a scene graph and holds no WebGL. The 3D scenes stay
 * lazy, per page, and are paused and resumed by `sceneRegistry.ts`.
 *
 * The camera and the last species survive a reload within the tab
 * (sessionStorage), so "back to the map" means back to where you were.
 */
export interface GeoOrigin {
  /** The locality, in degrees. */
  lng: number;
  lat: number;
  /** What was pressed: a map marker, a species card, a route leg, a plain link. */
  kind: 'marker' | 'card' | 'leg' | 'link';
}

/** The atlas map's own framing, so a return to /atlas lands where the reader left it. */
export interface AtlasView {
  lat: number;
  lng: number;
  zoom: number;
}

export interface WorldState {
  /** What the last geographic view was looking at. */
  camera: GeoCam;
  /** The species the reader is with, or was last with. */
  species: string | null;
  /** The object chosen to make the current journey. Cleared when it lands. */
  origin: GeoOrigin | null;
  /** A species page reached by a journey shows its photograph already open (the journey opened it). */
  arrival: string | null;
  atlasView: AtlasView | null;
  /** Species seen this visit, oldest first — the atlas marks them as surveyed. */
  visited: string[];
}

const KEY = 'atlas-world';

function restore(): WorldState {
  const base: WorldState = { camera: INDIA_CAM, species: null, origin: null, arrival: null, atlasView: null, visited: [] };
  try {
    const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(KEY) : null;
    if (!raw) return base;
    const saved = JSON.parse(raw) as Partial<WorldState>;
    return {
      ...base,
      camera: saved.camera && Number.isFinite(saved.camera.w) ? saved.camera : base.camera,
      species: typeof saved.species === 'string' ? saved.species : null,
      atlasView: saved.atlasView ?? null,
      visited: Array.isArray(saved.visited) ? saved.visited.slice(-24) : [],
    };
  } catch {
    return base;
  }
}

let state: WorldState = restore();
const listeners = new Set<() => void>();
let saveTimer = 0;

function persist() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      const { camera, species, atlasView, visited } = state;
      sessionStorage.setItem(KEY, JSON.stringify({ camera, species, atlasView, visited }));
    } catch {
      /* Private mode or storage full: the world simply starts fresh next time. */
    }
  }, 120);
}

export function getWorld(): WorldState {
  return state;
}

export function setWorld(patch: Partial<WorldState>) {
  state = { ...state, ...patch };
  persist();
  for (const l of listeners) l();
}

export function subscribeWorld(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useWorld<T>(select: (s: WorldState) => T): T {
  return useSyncExternalStore(
    subscribeWorld,
    () => select(state),
    () => select(state),
  );
}

/** Record that the reader is now with a species, looking at its ground. */
export function enterSpecies(id: string, camera: GeoCam) {
  const visited = state.visited.includes(id) ? state.visited : [...state.visited, id];
  setWorld({ species: id, camera, visited });
}

/** True once, for the species page a journey has just delivered the reader to. */
export function takeArrival(id: string): boolean {
  if (state.arrival !== id) return false;
  state = { ...state, arrival: null };
  return true;
}
