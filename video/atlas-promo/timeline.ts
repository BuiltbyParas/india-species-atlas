/**
 * THE TIMELINE — the single place the film's timing lives.
 *
 * Scenes are listed in running order with a duration in seconds; every start
 * time is derived from the durations above it. To lengthen a scene, change its
 * `dur`: everything after it (scenes, the map's camera, layer fades and audio
 * cues) moves with it, because all of those are written relative to a scene
 * with `at(sceneId, seconds)`.
 *
 * The map is the film's backbone. It is ONE layer that runs from the first
 * map frame to the last, so scenes never cut away from it — they move its
 * camera and switch its layers. `mapStateAt(t)` below is that choreography.
 */
import type { EaseName } from './styles/tokens';
import { track, prog, windowed, clamp01, type Key } from './utils/anim';
import { project, STATE_BY_NAME, MAP_CENTRE } from './data/geo';
import { FEATURED, ALL_POINTS, PROGRAMME_SITES, PROGRAMME_TIMELINE, SPECIES, drawnStatesOf, featuredSpecies, regionOf } from './data/atlas';
import { COLOR } from './styles/tokens';

export const FPS = 30;

export const SCENES = [
  { id: 'signal', name: 'Black / signal', dur: 5 },
  { id: 'india', name: 'India emerges', dur: 8 },
  { id: 'landscape', name: 'The landscape', dur: 11 },
  { id: 'life', name: 'Life', dur: 14 },
  { id: 'data', name: 'The data', dur: 11 },
  { id: 'threats', name: 'Threats', dur: 10 },
  { id: 'conservation', name: 'Conservation', dur: 10 },
  { id: 'atlas', name: 'The Atlas', dur: 14 },
  { id: 'system', name: 'System view', dur: 7 },
  { id: 'brand', name: 'Brand reveal', dur: 7 },
] as const;

export type SceneId = (typeof SCENES)[number]['id'];

export const SCENE_START: Record<SceneId, number> = (() => {
  let t = 0;
  const out = {} as Record<SceneId, number>;
  for (const s of SCENES) {
    out[s.id] = t;
    t += s.dur;
  }
  return out;
})();

export const SCENE_DUR = Object.fromEntries(SCENES.map((s) => [s.id, s.dur])) as Record<SceneId, number>;
export const DURATION = SCENES.reduce((n, s) => n + s.dur, 0);
export const DURATION_FRAMES = Math.round(DURATION * FPS);

/** Absolute time of a moment inside a scene. */
export const at = (id: SceneId, seconds = 0) => SCENE_START[id] + seconds;
export const frames = (seconds: number) => Math.round(seconds * FPS);

// --- Scene-internal rhythm shared by the map and the overlays --------------------------

/** Landscape: one beat per featured species' landscape. */
export const LANDSCAPE = { lead: 0.2, beat: 2.15 } as const;
export const landscapeBeatStart = (i: number) => at('landscape', LANDSCAPE.lead + i * LANDSCAPE.beat);

/** Life: an intro, then one beat per featured species. */
export const LIFE = { intro: 1.1, beat: 2.5 } as const;
export const lifeBeatStart = (i: number) => at('life', LIFE.intro + i * LIFE.beat);

/** Data: the markers land while the locality counter climbs. */
export const DATA = { markersFrom: 0.6, markersDur: 3.4 } as const;

/** Threats: one species traced to its threat, then the whole map. */
export const THREATS = { chainEnd: 3.6, fragmentFrom: 3.4, fragmentDur: 2.6 } as const;

/** Conservation: programmes switch on in the order they began. */
export const CONSERVATION = { reassemble: 1.6, yearsFrom: 1.2, yearsDur: 5.4 } as const;

/** Atlas: the map hands over to the browser in the first second. */
export const ATLAS = { handover: 1.1 } as const;

// --- The map ---------------------------------------------------------------------------

/** px per map unit at z = 1: India's full height fills 880 px of a 1080 frame. */
export const BASE_SCALE = 880 / 1122;

export interface Camera {
  /** Map-space point the camera looks at. */
  x: number;
  y: number;
  z: number;
  /** Where that point sits on screen, as an offset from the frame centre, in px. */
  ax: number;
  ay: number;
}

interface CamKey {
  t: number;
  lng?: number;
  lat?: number;
  z: number;
  ax?: number;
  ay?: number;
  ease?: EaseName;
}

const INDIA = { lng: 82.6, lat: 22.2 };

const cam = (t: number, lng: number, lat: number, z: number, ax = 0, ay = 0, ease: EaseName = 'cinema'): CamKey => ({ t, lng, lat, z, ax, ay, ease });

/** Where each landscape beat looks, and how close. */
const LANDSCAPE_FOCUS: Array<{ lng: number; lat: number; z: number }> = [
  { lng: 71.4, lat: 26.2, z: 2.5 }, // Thar
  { lng: 80.3, lat: 22.6, z: 2.6 }, // Central Indian highlands
  { lng: 84.0, lat: 25.9, z: 2.4 }, // Ganga
  { lng: 92.6, lat: 26.3, z: 2.9 }, // Brahmaputra floodplain
  { lng: 78.6, lat: 32.6, z: 2.3 }, // Himalaya
];

const CAMERA_KEYS: CamKey[] = [
  cam(0, INDIA.lng, INDIA.lat, 1.18),
  // India emerges: a slow push while the coast is traced.
  cam(at('india', 0), INDIA.lng, INDIA.lat, 0.9),
  cam(at('india', 8), INDIA.lng, INDIA.lat - 0.4, 1.06, 0, 0, 'inOutSine'),
  // The landscape: five fast moves, each landing then drifting.
  ...LANDSCAPE_FOCUS.flatMap(({ lng, lat, z }, i) => {
    const t0 = landscapeBeatStart(i);
    return [cam(t0 + 0.7, lng, lat, z, 300, 0, 'cinema'), cam(t0 + LANDSCAPE.beat, lng - 0.25, lat, z * 1.05, 300, 0, 'linear')];
  }),
  // Life and data: the whole country, held left of centre beside the panels.
  cam(at('life', 0.9), INDIA.lng, INDIA.lat, 0.94, -430, 0, 'cinema'),
  cam(at('data', 0), INDIA.lng, INDIA.lat, 0.96, -430, 0, 'inOutSine'),
  cam(at('data', SCENE_DUR.data), INDIA.lng, INDIA.lat, 1.0, -430, 0, 'inOutSine'),
  // Threats: in to the Thar for one species' story, then out to everything.
  cam(at('threats', 0.8), 70.9, 26.4, 2.4, 280, 0, 'cinema'),
  cam(at('threats', THREATS.chainEnd - 0.2), 71.1, 26.4, 2.5, 280, 0, 'linear'),
  cam(at('threats', THREATS.chainEnd + 0.9), INDIA.lng, INDIA.lat, 0.98, -190, 0, 'cinema'),
  cam(at('threats', 10), INDIA.lng, INDIA.lat, 0.93, -190, 0, 'inOutSine'),
  // Conservation: left of centre again, the programme record on the right.
  cam(at('conservation', 1.0), INDIA.lng, INDIA.lat, 0.94, -400, 0, 'cinema'),
  cam(at('conservation', 10), INDIA.lng, INDIA.lat, 1.0, -400, 0, 'inOutSine'),
  // Atlas: the map shrinks into the browser's map pane, then hands over.
  cam(at('atlas', ATLAS.handover), INDIA.lng, INDIA.lat, 0.5, 150, 70, 'cinema'),
  // System view: back out of the interface, pulling back over the whole network.
  cam(at('system', 0), INDIA.lng, INDIA.lat, 1.5, 0, 0),
  cam(at('system', 7), INDIA.lng, INDIA.lat, 0.98, 0, 0, 'inOutSine'),
  cam(at('brand', 1.5), INDIA.lng, INDIA.lat, 0.87, -540, 0, 'cinema'),
  cam(at('brand', 7), INDIA.lng, INDIA.lat, 0.84, -560, 0, 'linear'),
];

const camTracks = (() => {
  const keys = (pick: (k: CamKey, p: [number, number]) => number): Key[] =>
    CAMERA_KEYS.map((k) => {
      const p = project(k.lng ?? INDIA.lng, k.lat ?? INDIA.lat);
      return [k.t, pick(k, p), k.ease] as Key;
    });
  return {
    x: keys((_, p) => p[0]),
    y: keys((_, p) => p[1]),
    z: keys((k) => Math.log(k.z)), // zoom is interpolated in log space, so it feels even
    ax: keys((k) => k.ax ?? 0),
    ay: keys((k) => k.ay ?? 0),
  };
})();

export function cameraAt(t: number): Camera {
  return {
    x: track(t, camTracks.x),
    y: track(t, camTracks.y),
    z: Math.exp(track(t, camTracks.z)),
    ax: track(t, camTracks.ax),
    ay: track(t, camTracks.ay),
  };
}

// --- Map layers ------------------------------------------------------------------------

export interface Marker {
  key: string;
  x: number;
  y: number;
  hex: string;
  /** 0–1 presence (scale and opacity). */
  p: number;
  /** 0–1 emphasis: a halo ring and a larger dot. */
  focus: number;
  /** A one-shot ripple, 0–1 through its life; -1 when none. */
  ripple: number;
}

export interface StateTint {
  name: string;
  hex: string;
  a: number;
}

export interface MapState {
  t: number;
  camera: Camera;
  /** Whole-map opacity. */
  alpha: number;
  graticule: number;
  outlineDraw: number;
  outlineAlpha: number;
  fill: number;
  borders: number;
  contours: number;
  /** Hillshade (NOAA ETOPO1) under the lines. */
  relief: number;
  /** Extra weight on the ≥3,000 m contours (the Himalaya beat). */
  highContours: number;
  riversDraw: number;
  riversAlpha: number;
  tints: StateTint[];
  /** States drifting apart, 0–1 (the threats scene). */
  fragment: number;
  markers: Marker[];
  /** Each species' localities joined into one line. */
  lines: { draw: number; alpha: number; broken: number; ids: string[] };
  programmes: Array<{ key: string; x: number; y: number; p: number; ripple: number }>;
}

const L = (pairs: Array<[number, number, EaseName?]>) => pairs as Key[];

const LAYERS = {
  alpha: L([[0, 1], [at('atlas', ATLAS.handover - 0.35), 1], [at('atlas', ATLAS.handover + 0.1), 0, 'inOutSine'], [at('system', 0), 0], [at('system', 0.7), 1, 'emphasis']]),
  graticule: L([[at('india', 0), 0], [at('india', 2.5), 1, 'inOutSine'], [at('brand', 0.6), 1], [at('brand', 2.0), 0.35, 'inOutSine']]),
  outlineDraw: L([[at('india', 0.3), 0], [at('india', 3.6), 1, 'inOutSine']]),
  outlineAlpha: L([[at('india', 0.2), 0], [at('india', 0.4), 1]]),
  fill: L([[at('india', 2.4), 0], [at('india', 4.4), 1, 'emphasis'], [at('brand', 0.4), 1], [at('brand', 2.0), 0, 'inOutSine']]),
  borders: L([[at('india', 3.2), 0], [at('india', 4.8), 1, 'emphasis'], [at('brand', 0.2), 1], [at('brand', 1.6), 0, 'inOutSine']]),
  contours: L([
    [at('india', 4.0), 0],
    [at('india', 6.0), 0.5, 'inOutSine'],
    [at('landscape', 0), 0.6],
    [landscapeBeatStart(4), 0.6],
    [landscapeBeatStart(4) + 0.6, 1],
    [at('life', 0.6), 1],
    [at('life', 1.4), 0.32, 'inOutSine'],
    [at('threats', 0), 0.32],
    [at('threats', 1.0), 0.18],
    [at('conservation', 0), 0.18],
    [at('conservation', 2.0), 0.3],
    [at('system', 0.5), 0.3],
    [at('system', 2.5), 0.5],
    [at('brand', 0), 0.5],
    [at('brand', 1.4), 0, 'inOutSine'],
  ]),
  relief: L([
    [at('india', 3.6), 0],
    [at('india', 6.2), 0.75, 'inOutSine'],
    [at('landscape', 0.4), 1],
    [at('life', 1.0), 1],
    [at('life', 1.8), 0.6, 'inOutSine'],
    [at('brand', 0.0), 0.6],
    [at('brand', 1.4), 0, 'inOutSine'],
  ]),
  highContours: L([[landscapeBeatStart(4), 0], [landscapeBeatStart(4) + 0.8, 1, 'emphasis'], [at('life', 0.4), 1], [at('life', 1.4), 0, 'inOutSine']]),
  riversDraw: L([[landscapeBeatStart(2) - 0.1, 0], [landscapeBeatStart(2) + 1.5, 1, 'inOutSine']]),
  riversAlpha: L([
    [landscapeBeatStart(2) - 0.1, 0.9],
    [landscapeBeatStart(3) + 0.2, 0.9],
    [landscapeBeatStart(3) + 1.0, 0.45, 'inOutSine'],
    [at('threats', 0), 0.45],
    [at('threats', 4), 0.15],
    [at('conservation', 1), 0.15],
    [at('conservation', 3), 0.5],
    [at('brand', 0), 0.5],
    [at('brand', 1.2), 0, 'inOutSine'],
  ]),
  lines: L([
    [at('data', 4.0), 0],
    [at('data', 6.0), 0.26, 'inOutSine'],
    [at('threats', 0.2), 0.26],
    [at('threats', 0.8), 0.08],
    [at('threats', THREATS.fragmentFrom), 0.08],
    [at('threats', THREATS.fragmentFrom + 0.6), 0.32],
    [at('conservation', 2.0), 0.3],
    [at('atlas', 0.1), 0.3],
    [at('atlas', 0.6), 0],
    [at('system', 1.4), 0],
    [at('system', 3.2), 0.42, 'inOutSine'],
    [at('brand', 0.0), 0.42],
    [at('brand', 1.0), 0, 'inOutSine'],
  ]),
  fragment: L([
    [at('threats', THREATS.fragmentFrom), 0],
    [at('threats', THREATS.fragmentFrom + THREATS.fragmentDur), 1, 'emphasis'],
    [at('conservation', 0.1), 1],
    [at('conservation', CONSERVATION.reassemble), 0, 'cinema'],
  ]),
};

const FEATURED_IDS = FEATURED.map((f) => f.id);

function tintsAt(t: number): StateTint[] {
  const out: StateTint[] = [];
  const add = (names: string[], hex: string, a: number) => {
    if (a <= 0.001) return;
    for (const n of names) if (STATE_BY_NAME.has(n)) out.push({ name: n, hex, a });
  };
  // Landscape: the region's key states, in the neutral sage.
  FEATURED.forEach((f, i) => {
    const t0 = landscapeBeatStart(i);
    const a = windowed(t, t0 + 0.35, t0 + LANDSCAPE.beat + 0.25, 0.5, 0.5);
    add([...new Set(regionOf(f.region).keyStates.map((s) => (s === 'Ladakh' ? 'Jammu and Kashmir' : s)))], COLOR.sage, 0.2 * a);
  });
  // Life: each featured species' states of record, in its status colour.
  FEATURED.forEach((_, i) => {
    const s = featuredSpecies(i);
    const t0 = lifeBeatStart(i);
    const a = windowed(t, t0 + 0.15, t0 + LIFE.beat + 0.1, 0.45, 0.4);
    add(drawnStatesOf(s), COLOR.status[s.status], 0.2 * a);
  });
  // Threats: the bustard's two states while its story is told.
  {
    const s = featuredSpecies(0);
    add(drawnStatesOf(s), COLOR.status[s.status], 0.22 * windowed(t, at('threats', 0.6), at('threats', THREATS.chainEnd + 0.4), 0.6, 0.6));
  }
  return out;
}

/** Order of appearance in the data scene: west to east, so the land fills like a sweep. */
const DROP_ORDER = (() => {
  const order = ALL_POINTS.map((p, i) => ({ i, k: p.lng + p.lat * 0.15 })).sort((a, b) => a.k - b.k);
  const rank = new Array<number>(ALL_POINTS.length);
  order.forEach((o, r) => (rank[o.i] = r));
  return rank;
})();

function markersAt(t: number): Marker[] {
  const lifeOn = windowed(t, at('life', 0.9), at('data', 0.2), 0.3, 0.3);
  const dataStart = at('data', DATA.markersFrom);
  const n = ALL_POINTS.length;
  const allOn = Math.min(1, 1 - prog(t, at('atlas', 0.2), 0.6, 'inOutSine') + prog(t, at('system', 0.8), 0.8));
  const fade = 1 - prog(t, at('brand', 0.0), 1.0, 'inOutSine');
  return ALL_POINTS.map((p, i) => {
    const [x, y] = project(p.lng, p.lat);
    const fi = FEATURED_IDS.indexOf(p.speciesId);
    // Life: only the featured species, each bright during its own beat.
    let life = 0;
    let focus = 0;
    let ripple = -1;
    if (fi >= 0) {
      const t0 = lifeBeatStart(fi);
      const own = windowed(t, t0, t0 + LIFE.beat, 0.35, 0.35);
      life = lifeOn * (0.35 + 0.65 * own);
      focus = own;
      const r = (t - t0 - 0.2) / 1.4;
      if (r >= 0 && r <= 1) ripple = r;
    }
    // Data onwards: every locality, landing in a west-to-east sweep.
    const d0 = dataStart + (DROP_ORDER[i] / n) * DATA.markersDur;
    if (t >= d0 && t <= d0 + 0.9 && ripple < 0) ripple = (t - d0) / 0.9;
    // Threats: localities dim and isolate while the map fragments.
    const quiet = windowed(t, at('conservation', 1.0), at('atlas', 0.3), 0.8, 0.3) * 0.5;
    const all = prog(t, d0, 0.45, 'outExpo') * allOn * fade * (1 - 0.45 * track(t, LAYERS.fragment)) * (1 - quiet);
    // Threats chain: the bustard's localities glow while its story is told.
    const chain = p.speciesId === 'great-indian-bustard' ? windowed(t, at('threats', 0.9), at('threats', THREATS.chainEnd + 0.3), 0.4, 0.5) : 0;
    return { key: p.key, x, y, hex: p.hex, p: clamp01(Math.max(life, all, chain)), focus: Math.max(focus * lifeOn, chain), ripple };
  });
}

function programmesAt(t: number) {
  const first = PROGRAMME_TIMELINE[0]?.year ?? 1970;
  const last = PROGRAMME_TIMELINE[PROGRAMME_TIMELINE.length - 1]?.year ?? 2025;
  const off = 1 - prog(t, at('atlas', 0.2), 0.6);
  const sysOn = prog(t, at('system', 1.2), 1.0);
  const fade = 1 - prog(t, at('brand', 0.0), 1.0, 'inOutSine');
  return PROGRAMME_SITES.map((s) => {
    const [x, y] = project(s.lng, s.lat);
    // A site switches on as the year counter passes its programme's start year.
    const tOn = at('conservation', CONSERVATION.yearsFrom) + (((s.year ?? first) - first) / (last - first || 1)) * CONSERVATION.yearsDur;
    const r = (t - tOn) / 1.2;
    return {
      key: s.key,
      x,
      y,
      p: clamp01(Math.max(prog(t, tOn, 0.5, 'outExpo') * off, sysOn)) * fade,
      ripple: r >= 0 && r <= 1 ? r : -1,
    };
  });
}

/** The programme year the conservation counter shows at time t. */
export function yearAt(t: number, first = PROGRAMME_TIMELINE[0]?.year ?? 1970, last = PROGRAMME_TIMELINE[PROGRAMME_TIMELINE.length - 1]?.year ?? 2025): number {
  const p = clamp01((t - at('conservation', CONSERVATION.yearsFrom)) / CONSERVATION.yearsDur);
  return t < at('conservation', CONSERVATION.yearsFrom) ? 0 : Math.round(first + (last - first) * p);
}

export function mapStateAt(t: number): MapState {
  const broken = track(t, LAYERS.fragment);
  return {
    t,
    camera: cameraAt(t),
    alpha: track(t, LAYERS.alpha),
    graticule: track(t, LAYERS.graticule),
    outlineDraw: track(t, LAYERS.outlineDraw),
    outlineAlpha: track(t, LAYERS.outlineAlpha),
    fill: track(t, LAYERS.fill),
    borders: track(t, LAYERS.borders),
    contours: track(t, LAYERS.contours),
    relief: track(t, LAYERS.relief),
    highContours: track(t, LAYERS.highContours),
    riversDraw: track(t, LAYERS.riversDraw),
    riversAlpha: track(t, LAYERS.riversAlpha),
    tints: tintsAt(t),
    fragment: broken,
    markers: markersAt(t),
    lines: {
      draw: 1,
      alpha: track(t, LAYERS.lines),
      broken,
      ids: SPECIES.map((s) => s.id),
    },
    programmes: programmesAt(t),
  };
}

/** For QC and the README: the scene table in seconds and frames. */
export function sceneTable() {
  return SCENES.map((s) => ({
    id: s.id,
    name: s.name,
    start: SCENE_START[s.id],
    end: SCENE_START[s.id] + s.dur,
    from: frames(SCENE_START[s.id]),
    frames: frames(s.dur),
  }));
}

export { MAP_CENTRE };
