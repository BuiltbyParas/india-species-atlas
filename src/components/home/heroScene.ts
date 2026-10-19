/**
 * Hero 3D scene — a scroll-driven camera journey over a relief of India,
 * built at runtime from the same `india-states.geojson` the atlas map ships,
 * NOAA's ETOPO 2022 elevation model, and the occurrence points in the atlas
 * dataset.
 *
 * The journey runs from a view straight down on the relief, like a sheet laid
 * on a table, to a low pass over the ground, revealing species markers in a
 * north-to-south sweep as the camera descends. Terrain lives in
 * `heroTerrain.ts`; bloom, depth of field, vignette and the colour grade live
 * in `heroPost.ts`.
 *
 * This module is framework-agnostic on purpose; `HeroScrollScene.tsx` owns the
 * React lifecycle, the scroll listener and the capability checks — including
 * `prefers-reduced-motion`, which is handled by never constructing this scene
 * at all rather than by animating it more gently.
 */
import * as THREE from 'three';
import { damp, perFrame, Spring, SPRINGS } from '../../interaction/spring';
import { FrameGovernor, pixelRatio } from '../../world/quality';
import { makePointCloud, particleBudget, seededRandom } from '../../world/gl/particles';
import { buildTerrain, TERRAIN_DEPTH, type GeoCollection } from './heroTerrain';
import { createReliefLight } from './heroLight';
import { createPostChain, type PostQuality } from './heroPost';
import { buildPlateAtlas, PLATE_CELL, PLATE_COLUMNS } from './heroPlates';
import { HYPSOMETRIC_HEX, HYPSOMETRIC_STOPS, metresAt as gridMetresAt, type ReliefGrid } from './heroRelief';
import { unproject } from '../../geo/india';
import type { GeoCam } from '../../world/geoCamera';

export type { GeoCollection } from './heroTerrain';
export { RELIEF_EXAGGERATION } from './heroTerrain';

/** One species occurrence marker, coloured by IUCN category. */
export interface HeroPoint {
  lng: number;
  lat: number;
  /** Literal hex, e.g. from `STATUS_HEX`. */
  color: string;
  /** Scroll progress, 0-1, at which this marker starts to appear. */
  revealAt: number;
  /** Which of `world.species` the marker belongs to, so a trace can light it with its thread. */
  group?: number;
}

/**
 * What the atlas act draws (components/home/atlasData.ts derives it from the
 * dataset): every species' thread through its indicative localities, whether
 * a programme in the dataset names it, the programme sites, the states of
 * record for programme-covered species, and the closing's drawing point.
 */
export interface AtlasWorldData {
  species: Array<{
    id: string;
    /** Literal hex for the IUCN category. */
    color: string;
    /** At least one programme in the dataset names this species. */
    covered: boolean;
    /** The thread's runs, each a chain of [lng, lat] localities. */
    runs: Array<Array<[number, number]>>;
    anchor: [number, number];
  }>;
  sites: Array<{ programme: string; species: string; lng: number; lat: number }>;
  /** Where the closing's lines meet: a drawing point, not a place. */
  centre: [number, number];
  /** The protected states' outlines, SVG path data in the sheet's units (`geo/india.ts`). */
  protectedPaths: string[];
}

/**
 * The atlas act's scrubbed values, each 0 → 1 and each derived from the
 * scroll position by the chapter that owns it, so the act reverses with the
 * scroll and is right after a jump.
 */
export interface AtlasState {
  /** Chapter 04 arriving: the camera comes down out of the dark and the light front runs. */
  arrive: number;
  /** The pressures: threads break. */
  frag: number;
  /** The response: covered threads rejoin and turn to water; sites and protected states come up. */
  prot: number;
  /** The statement: the camera lifts, only what is protected stays lit. */
  close: number;
  /** The closing: the camera climbs back to the opening's plate; every anchor's line runs to the drawing point. */
  remain: number;
  /** The colophon: the lamp lowers and the relief sinks into the ground under it. */
  sink: number;
}

export type AtlasTrace = { species: Set<string>; programmes: Set<string> };

/**
 * One species plate: a silhouette card that rises over the species' anchor
 * locality as the camera reaches that part of the country, then fades out
 * again, leaving the occurrence markers behind it.
 */
export interface HeroPlate {
  /** Species id, used to select the silhouette drawn on the plate. */
  id: string;
  lng: number;
  lat: number;
  /** Literal hex for the species' IUCN category. */
  color: string;
  /** Scroll progress, 0-1, at which the plate starts to appear. */
  revealAt: number;
}

export interface HeroSceneOptions {
  canvas: HTMLCanvasElement;
  geojson: GeoCollection;
  /**
   * The elevation model (`heroRelief.ts`). Without it the country is drawn as
   * the flat extruded slab, and the rest of the scene is unchanged.
   */
  relief?: ReliefGrid | null;
  /**
   * Mesh nodes on every `meshStep`-th cell of the elevation grid. Shading and
   * contours read the full grid from a texture whatever this is, so a coarser
   * mesh costs only a little of the silhouette.
   */
  meshStep?: number;
  points: HeroPoint[];
  /** One plate per species, in the order the caller wants them laid out. */
  plates: HeroPlate[];
  /**
   * Called after each pose is applied with the screen placement of every
   * plate's caption anchor: three floats per plate, `[x, y, alpha]`, in CSS
   * pixels relative to the canvas. The buffer is reused between calls and is
   * only valid for the duration of the call — copy anything you keep.
   *
   * Captions are DOM rather than texture on purpose: real text stays crisp
   * under the depth-of-field pass, costs no atlas memory, and can be read.
   */
  onLabels?: (layout: Float32Array) => void;
  /** Called after the first frame is on screen, for the fade-in. */
  onFirstFrame?: () => void;
  /**
   * Where the descent ends. Without it the camera settles over the middle of
   * the peninsula; with it, the last part of the journey turns towards this
   * locality and comes down low over it — India, then the region, then the
   * ground itself — so the hero hands the reader to the place the story
   * starts.
   */
  endFocus?: { lng: number; lat: number };
  /**
   * The air over the end focus, from the species' habitat: fine dust over
   * desert grassland, falling snow over mountains. A few hundred points hung
   * low over the locality only; they move with the descent (scroll), never on
   * their own, so the scene still renders only when something changes.
   */
  atmosphere?: 'dust' | 'snow';
  /**
   * Hold the opening frame back until `reveal()`: the country's borders come
   * up first as a fine outline, then the land rises out of the dark under
   * them and the graticule settles last, as the camera eases in a little.
   * For the first visit, so the relief arrives as the loader clears.
   */
  emerge?: boolean;
  /**
   * What the probe reads: the ground's coordinates under the hand, its height
   * in the elevation model (null without one), the lit locality it has snapped
   * to (an index into `points`, or −1), and where the probe sits in the frame.
   * Null when the probe is off the land.
   */
  onProbe?: (
    reading: { lng: number; lat: number; metres: number | null; snapped: number; x: number; y: number } | null,
  ) => void;
  /**
   * Where the Tropic of Cancer crosses the frame, in CSS pixels from the top,
   * whenever it moves — so the title can be set on a real line of the map.
   * Null when the frame is too narrow for the relief to sit beside the copy.
   */
  onMarks?: (marks: { tropicY: number } | null) => void;
  /**
   * Where the land's west and east edges at 22°N sit in the opening frame, in
   * CSS pixels — what the loader's outline needs to settle onto the relief.
   * Reported while the camera is at rest, and again if the frame is resized.
   */
  onFootprint?: (at: { wx: number; wy: number; ex: number; ey: number }) => void;
  /**
   * Called when the device cannot hold a usable frame rate even after the
   * scene has stepped its own quality all the way down. The caller should
   * unmount the scene and show the flat artwork instead.
   */
  onTooSlow?: () => void;
  /** The atlas act's data; without it the scene only plays the hero. */
  world?: AtlasWorldData | null;
  /**
   * In the atlas act, where each species' anchor locality sits on screen:
   * `[x, y, alpha]` per entry of `world.species`, alpha above zero only for a
   * traced species. Reused buffer, valid for the call only.
   */
  onAnchors?: (layout: Float32Array) => void;
  /** In the atlas act, where the Tropic of Cancer crosses the frame (CSS px), or null while it is not drawn. */
  onWorldMarks?: (marks: { tropicY: number } | null) => void;
}

export interface HeroScene {
  /** Which act the scene plays: the descent, or the atlas act after the field studies. */
  setAct: (act: 'hero' | 'atlas') => void;
  setAtlas: (state: Partial<AtlasState>) => void;
  setTrace: (trace: AtlasTrace | null) => void;
  /** Build the atlas act's layers and compile their shaders in an idle moment, ahead of the act. */
  prepareAtlas: () => void;
  /** Scroll progress through the hero, 0 → 1. */
  setProgress: (p: number) => void;
  /** Pointer parallax, each axis in −1 → 1. */
  setPointer: (x: number, y: number) => void;
  /** Scroll momentum, 0 → 1 (the shared scroll-velocity signal). */
  setMomentum: (v: number) => void;
  /** Pause the render loop entirely when the hero is off-screen or hidden. */
  setActive: (active: boolean) => void;
  /**
   * The survey probe: where the hand is over the relief, in frame coordinates
   * (−1 → 1), or null when it leaves. The scene finds the ground under it,
   * snaps to a lit locality close by, and turns the key light towards it.
   */
  setProbe: (x: number | null, y: number) => void;
  /**
   * Lay the camera flat over a framing of the shared sheet, `t` 0 → 1: from
   * the scroll pose to straight down, north up, at exactly the scale the
   * journey's sheet will draw. TERRAIN → MAP, with this renderer.
   */
  toSheet: (cam: GeoCam, t: number) => void;
  resize: (width: number, height: number) => void;
  /** Starts the emergence held back by `emerge` (a no-op otherwise, or once begun). */
  reveal: () => void;
  dispose: () => void;
}

/* --- palette (kept in sync with src/theme.ts) --- */
const LAND_TOP_HEX = '#2a3a30';
const LAND_SIDE_HEX = '#121510';
const BORDER_HEX = '#e8e1cf';
const GRID_HEX = '#3a4640';
/** The toposheet's burnt-sienna contour ink (`--color-contour`). */
const CONTOUR_HEX = '#b07a52';
/**
 * Contours every 500 m, every fourth one heavier, as the elevation model gives
 * them. 250 m was tried: across the Thar and the Malwa the ground hovers about
 * that height and the line wandered everywhere, reading as noise, not form.
 */
const CONTOUR_MINOR = 500;
const CONTOUR_MAJOR = 2000;

/** Height the occurrence markers stand above the surface. */
const STEM = 0.115;

/**
 * The camera journey, as a pair of endpoints per channel.
 *
 * Distance is interpolated geometrically rather than linearly, so the approach
 * feels like a constant rate of descent instead of racing in and then crawling.
 */
/** The opening frame: due south of the country (yaw), so north is up and parallels run level. Mutable only through the development tuning hook. */
const OPENING = { distance: 7.3, pitch: 1.12, yaw: -Math.PI / 2, fov: 30, tx: 0, ty: 0.05, restShift: 0.12, restShiftWide: 0.06, restRise: 0.2, hemi: 0.95, key: 3.4, exposure: 1, saturation: 0.6 };
/**
 * Over the regional relief the opening comes down from the plan view to a three-quarter view from the south
 * (about 46° up, a long lens), close enough that the subcontinent fills the frame and the Himalaya stands as a
 * range rather than a texture; lit by the lamp alone against a cool sky, exposed for the lit ground.
 */
/** Where the regional opening starts, for the loader's outline to land on: nearly straight down, a little further out. */
const PLAN_PITCH = 1.47;
const PLAN_DISTANCE = 1.16;
const OPENING_REGION = { distance: 8.8, pitch: 0.8, fov: 24, ty: 0.3, restShift: 0.12, restShiftWide: 0.08, restRise: 0.24, hemi: 0.3, key: 7.5, exposure: 2.75, saturation: 0.86 };
const END_DISTANCE = 2.35;
const END_PITCH = 0.26;
const END_YAW = -1.24;
const START_FOV = 30;
const END_FOV = 46;
const TARGET_START = new THREE.Vector3(0, 0.05, 0);
const TARGET_END = new THREE.Vector3(-0.05, 0.55, 0.05);
/** How close the camera comes, and how steeply it looks down, when the descent ends over a focus locality. */
const FOCUS_DISTANCE = 1.3;
const FOCUS_PITCH = 0.5;

const CAMERA_NEAR = 0.25;
const CAMERA_FAR = 120;

/** How long a single occurrence marker takes to pop in, in scroll progress. */
const REVEAL_DURATION = 0.16;

/**
 * A plate's life, in scroll progress, measured from its species' reveal point:
 * it fades up, holds long enough to be read, then fades out as the camera
 * passes. Fading out is what keeps the frame legible — with twelve plates left
 * standing the low pass at the end of the journey would be a wall of cards.
 */
const PLATE_FADE_IN = 0.02;
const PLATE_HOLD = 0.028;
const PLATE_FADE_OUT = 0.024;

/**
 * Plate size is expressed on screen rather than in the world, as a fraction of
 * the viewport height, because a plate is a caption: at true world scale the
 * first ones would be specks twenty units out and the last would fill the
 * frame. `PLATE_FALLOFF` puts a little of the depth cue back — distant plates
 * still read as smaller — and the clamp keeps every plate legible.
 */
const PLATE_APPARENT = 0.2;
const PLATE_APPARENT_MIN = 0.15;
const PLATE_APPARENT_MAX = 0.26;
const PLATE_REF_DISTANCE = 4;
const PLATE_FALLOFF = 0.22;
/**
 * How far a plate is lifted above its locality, in plate half-heights, once it
 * has finished rising. At 1 the card's bottom edge sits exactly on the point,
 * so it reads as standing on the place it belongs to.
 */
const PLATE_RISE_FROM = 0.55;
const PLATE_RISE_TO = 1;

/** The Tropic of Cancer (mean obliquity, 2026), the one named parallel that crosses India. */
const TROPIC_LAT = 23.436;

/**
 * The emergence is light arriving from the north: a front runs down the
 * country from the Himalaya to the cape, drawing the state lines as it passes,
 * and the land comes up out of the dark a little way behind it. Distances are
 * world units measured south from just above the northern tip.
 */
const FRONT_ORIGIN = new THREE.Vector2(-0.3, 1.72);
const FRONT_DIRECTION = new THREE.Vector2(0.2, -1).normalize();
/** How far the land trails the outline. */
const FRONT_LAG = 0.95;
/** Where the opening frame's light falls: over the north-west, the way a lamp is set over a sheet. */
const POOL_CENTRE = new THREE.Vector2(-0.25, 0.45);

/** How far behind the front the ground starts to rise, and over what distance it comes up. */
const RISE_LAG = 0.55;
const RISE_SPAN = 1.1;
const PLINTH = TERRAIN_DEPTH.toFixed(4);

const REVEAL_PARS = /* glsl */ `
  uniform float uFront;
  uniform float uRiseFront;
  uniform float uPool;
  uniform vec2 uPoolAt;
  uniform float uLift;
  varying vec2 vRevealXY;
  float revealDistance(vec2 xy) {
    return dot(xy - vec2(${FRONT_ORIGIN.x.toFixed(3)}, ${FRONT_ORIGIN.y.toFixed(3)}),
      vec2(${FRONT_DIRECTION.x.toFixed(4)}, ${FRONT_DIRECTION.y.toFixed(4)}));
  }
  float revealDistance() { return revealDistance(vRevealXY); }
  /** How far the ground has risen here: behind the front, and as far as the scene allows (uLift). */
  float riseAt(vec2 xy) {
    float front = uRiseFront - ${RISE_LAG.toFixed(2)};
    return uLift * smoothstep(front, front - ${RISE_SPAN.toFixed(2)}, revealDistance(xy));
  }
`;

/**
 * Raises whatever stands above the plinth by the local rise: the ground, the
 * walls' top edge and the lines draped on it all come up together, from the
 * sheet, as the light passes.
 */
const LIFT_VERTEX = /* glsl */ `
  #include <begin_vertex>
  vRevealXY = (modelMatrix * vec4(transformed, 1.0)).xy;
  #ifdef RELIEF_LIFT
    if (transformed.z > ${PLINTH} + 0.0004) {
      transformed.z = ${PLINTH} + 0.0004 + (transformed.z - ${PLINTH} - 0.0004) * riseAt(vRevealXY);
    }
  #endif
`;

/**
 * The relief's ground, read from the elevation model per pixel rather than per
 * vertex: the country's outline from the boundary mask (anti-aliased through
 * alpha-to-coverage), the hypsometric tint, a little curvature shading — valleys
 * a shade darker, ridges a shade lighter, as a hand-shaded relief is — the
 * contours, and the slope for the light. Derivatives are all taken before the
 * mask can discard, so none is read in divergent control flow.
 */
const RELIEF_PARS = /* glsl */ `
  uniform sampler2D uHeight;
  uniform sampler2D uMask;
  uniform vec4 uUv;
  uniform vec2 uCell;
  uniform float uZPerMetre;
  uniform vec3 uHyps[${HYPSOMETRIC_HEX.length}];
  uniform vec3 uInk;
  uniform vec4 uContour;
  uniform sampler2D uProtMask;
  uniform float uProtAmt;
  uniform float uAtlasDim;
  uniform vec3 uGlaze;
  varying vec2 vReliefUv;
  float rInk;
  vec3 rNormal;
  float rProt;
  float rProtEdge;
`;

const RELIEF_GROUND = /* glsl */ `
  #include <color_fragment>
  {
    vec2 ruv = vReliefUv;
    float m = texture2D(uMask, ruv).r;
    // r: metres; g, b: the rise across the cell east–west and north–south; a: the Laplacian (heroTerrain.ts).
    vec4 relief = texture2D(uHeight, ruv);
    float hC = relief.r;
    float fm = max(fwidth(m), 0.002);
    float cm = hC / uContour.x;
    float fw = max(fwidth(cm), 1e-4);
    float cM = hC / uContour.y;
    float fM = max(fwidth(cM), 1e-4);

    // The protected states (atlas act), read before the mask can discard so its edge can be found.
    rProt = texture2D(uProtMask, ruv).r;
    rProtEdge = fwidth(rProt);

    float edge = smoothstep(0.5 - fm, 0.5 + fm, m);
    if (edge < 0.004) discard;
    diffuseColor.a = edge;

    vec3 tint = uHyps[0];
    ${HYPSOMETRIC_STOPS.slice(1)
      .map((stop, i) => `tint = mix(tint, uHyps[${i + 1}], smoothstep(${HYPSOMETRIC_STOPS[i].toFixed(1)}, ${stop.toFixed(1)}, hC));`)
      .join('\n    ')}
    tint *= clamp(1.0 - relief.a * 0.0006, 0.8, 1.16);
    diffuseColor.rgb *= tint;

    float k = uZPerMetre * riseAt(vRevealXY);
    rNormal = normalize(vec3(-relief.g * k / uCell.x, -relief.b * k / uCell.y, 1.0));

    // Lines one to one-and-a-half pixels wide, thinned out where they would crowd closer than a few pixels.
    float minor = (1.0 - smoothstep(0.55, 1.35, abs(fract(cm - 0.5) - 0.5) / fw)) * smoothstep(0.42, 0.16, fw);
    float major = (1.0 - smoothstep(0.7, 1.6, abs(fract(cM - 0.5) - 0.5) / fM)) * smoothstep(0.5, 0.12, fM);
    rInk = max(minor * uContour.z, major * uContour.w) * step(uContour.x * 0.5, hC);
  }
`;

const RELIEF_NORMAL = /* glsl */ `
  float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
  vec3 normal = normalize((viewMatrix * vec4(rNormal, 0.0)).xyz);
  vec3 nonPerturbedNormal = normal;
`;

/** The contours are drawn by the front, ahead of the land's light, the way the state lines are. */
const RELIEF_INK = /* glsl */ `
  {
    float drawn = smoothstep(uFront, uFront - 0.35, revealDistance());
    gl_FragColor.rgb = mix(gl_FragColor.rgb, uInk, rInk * drawn);
  }
`;

/**
 * The atlas act's glaze (Chapter 04): the states of record for programme-covered
 * species take a deep river cast and a fine edge as the response arrives, and
 * for the statement the ground that is not protected steps down into the dark.
 */
const ATLAS_GLAZE = /* glsl */ `
  {
    float p = rProt * uProtAmt;
    gl_FragColor.rgb *= mix(1.0, 0.36, uAtlasDim * (1.0 - rProt));
    gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * uGlaze + uGlaze * 0.012, p);
    gl_FragColor.rgb += uGlaze * clamp(rProtEdge * 2.4, 0.0, 1.0) * uProtAmt * 0.16;
  }
`;

/**
 * The regional relief (`heroTerrain.ts` buildRegion): the same ground read from a grid that runs on past the
 * boundary and under the sea. What is India's is lit as the subject; the neighbours' ground steps back (darker,
 * greyer) without being cut away; the sea is a level surface with the sea floor read through it as a depth tint,
 * shaded by its own slope. The lamp's cast shadows and the sky's occlusion come from `heroLight.ts`.
 */
const REGION_PARS = /* glsl */ `
  uniform sampler2D uSunVis;
  uniform sampler2D uSkyVis;
  uniform vec2 uTexel;
  uniform vec3 uWaterShallow;
  uniform vec3 uWaterDeep;
  uniform vec2 uNeighbour;
  uniform vec2 uLightAmt;
  uniform vec3 uLampDir;
  uniform vec3 uLampColor;
  uniform float uGlint;
  uniform vec3 uSkyTint;
  float rLand;
  float rIndia;
  float rSun;
  float rSky;
  float rEdge;
`;

const REGION_GROUND = /* glsl */ `
  #include <color_fragment>
  {
    vec2 ruv = vReliefUv;
    float m = texture2D(uMask, ruv).r;
    // r: signed metres; g, b: the land's rise across the cell; a: the land's Laplacian (heroTerrain.ts).
    vec4 relief = texture2D(uHeight, ruv);
    float hS = relief.r;
    float hC = max(hS, 0.0);
    float fm = max(fwidth(m), 0.002);
    float fh = max(fwidth(hS), 0.5);
    float cm = hC / uContour.x;
    float fw = max(fwidth(cm), 1e-4);
    float cM = hC / uContour.y;
    float fM = max(fwidth(cM), 1e-4);
    // Read only while the atlas act's glaze is up (a uniform branch, so the derivative is safe).
    rProt = 0.0;
    rProtEdge = 0.0;
    if (uProtAmt > 0.0 || uAtlasDim > 0.0) {
      rProt = texture2D(uProtMask, ruv).r;
      rProtEdge = fwidth(rProt);
    }
    rIndia = smoothstep(0.5 - fm, 0.5 + fm, m);
    // Land is ground above the sea, or anything inside the boundary (the Rann, the deltas sit at the waterline).
    rLand = max(smoothstep(-fh, fh, hS), rIndia);
    rSun = texture2D(uSunVis, ruv).r;
    rSky = texture2D(uSkyVis, ruv).r;
    vec2 eu = min(ruv, 1.0 - ruv);
    rEdge = smoothstep(0.0, 0.16, min(eu.x, eu.y));

    vec3 tint = uHyps[0];
    ${HYPSOMETRIC_STOPS.slice(1)
      .map((stop, i) => `tint = mix(tint, uHyps[${i + 1}], smoothstep(${HYPSOMETRIC_STOPS[i].toFixed(1)}, ${stop.toFixed(1)}, hC));`)
      .join('\n    ')}
    tint *= clamp(1.0 - relief.a * 0.0006, 0.8, 1.16);
    // Beyond the boundary the ground keeps its form (the light and the sky still model it) but not its colour:
    // one neutral stone, stepped down, as an atlas prints the neighbours in grey.
    float away = 1.0 - rIndia;
    vec3 stone = vec3(dot(uHyps[2], vec3(0.299, 0.587, 0.114)));
    tint = mix(tint, stone, away * uNeighbour.y) * mix(1.0, uNeighbour.x, away);

    // The sea floor through the water: the shelf pale, the abyss dark, its slopes shaded from the north-west.
    float depth = max(-hS, 0.0);
    vec3 water = mix(uWaterShallow, uWaterDeep, smoothstep(0.0, 2800.0, depth));
    // The floor's slope is read only under water (four more reads), not across the whole ground.
    if (rLand < 0.999) {
      float fe = texture2D(uHeight, ruv + vec2(uTexel.x, 0.0)).r;
      float fwe = texture2D(uHeight, ruv - vec2(uTexel.x, 0.0)).r;
      float fn = texture2D(uHeight, ruv - vec2(0.0, uTexel.y)).r;
      float fs = texture2D(uHeight, ruv + vec2(0.0, uTexel.y)).r;
      float floorShade = clamp(1.0 + ((fe - fwe) + (fs - fn)) * 0.0011, 0.5, 1.7);
      water *= mix(floorShade, 1.0, 0.25 + 0.5 * smoothstep(300.0, 4500.0, depth));
    }
    diffuseColor.rgb *= mix(water, tint, rLand);

    float k = uZPerMetre * riseAt(vRevealXY) * rLand;
    rNormal = normalize(vec3(-relief.g * k / uCell.x, -relief.b * k / uCell.y, 1.0));

    float minor = (1.0 - smoothstep(0.55, 1.35, abs(fract(cm - 0.5) - 0.5) / fw)) * smoothstep(0.42, 0.16, fw);
    float major = (1.0 - smoothstep(0.7, 1.6, abs(fract(cM - 0.5) - 0.5) / fM)) * smoothstep(0.5, 0.12, fM);
    rInk = max(minor * uContour.z, major * uContour.w) * step(uContour.x * 0.5, hC) * rLand * mix(0.22, 1.0, rIndia);
  }
`;

/** The lamp is shadowed by the ground (key light only: it is the first directional light in the scene). */
const REGION_LIGHTS = THREE.ShaderChunk.lights_fragment_begin.replace(
  'getDirectionalLightInfo( directionalLight, directLight );',
  'getDirectionalLightInfo( directionalLight, directLight );\n\t\tdirectLight.color *= ( UNROLLED_LOOP_INDEX == 0 ) ? mix( 1.0, rSun, uLightAmt.x ) : 1.0;',
);
/** The sky light is occluded by the ground around: gorges and valleys hold less of it. */
const REGION_SKY = /* glsl */ `
  reflectedLight.indirectDiffuse *= mix(1.0, rSky * rSky, uLightAmt.y);
  #include <aomap_fragment>
`;

/** The water's surface: the lamp's glint where it is not shadowed, and the sky's sheen at a grazing view. */
const REGION_SURFACE = /* glsl */ `
  float sea = 1.0 - rLand;
  if (sea > 0.001) {
    vec3 V = normalize(cameraPosition - vec3(vRevealXY, ${PLINTH}));
    vec3 H = normalize(uLampDir + V);
    float nh = max(H.z, 0.0);
    float glint = pow(nh, 1400.0) * 6.0 + pow(nh, 120.0) * 0.4;
    float fres = 0.02 + 0.98 * pow(1.0 - clamp(V.z, 0.0, 1.0), 5.0);
    gl_FragColor.rgb += sea * (uLampColor * glint * uGlint * rSun + uSkyTint * fres);
  }
  {
    // Out to the grid's edge the ground sinks into the open sea's dark, so the fog meets both alike.
    gl_FragColor.rgb *= rEdge;
  }
`;

/** The regional ground is not drawn by a front: the lamp brings it out of the dark. The opening pool stays. */
const REGION_LAND_REVEAL = /* glsl */ `
  {
    vec2 d = (vRevealXY - uPoolAt) * vec2(0.85, 0.7);
    float pool = exp(-dot(d, d) / 1.6);
    gl_FragColor.rgb *= mix(1.0, mix(0.5, 1.45, pool), uPool);
  }
`;

/** The land: dark until the light reaches it, then lit as a pool rather than evenly. */
const LAND_REVEAL = /* glsl */ `
  {
    float s = revealDistance();
    float front = uFront - ${FRONT_LAG.toFixed(2)};
    float lit = smoothstep(front, front - 0.7, s);
    float edge = exp(-pow((s - front + 0.18) / 0.16, 2.0));
    vec2 d = (vRevealXY - uPoolAt) * vec2(0.85, 0.7);
    float pool = exp(-dot(d, d) / 1.6);
    gl_FragColor.rgb *= lit * mix(1.0, mix(0.3, 1.62, pool), uPool);
    gl_FragColor.rgb += vec3(0.95, 0.74, 0.46) * edge * 0.05;
  }
`;

/** The state lines: drawn as the front passes, with a brief warm glint on its leading edge. */
const LINE_REVEAL = /* glsl */ `
  {
    float s = revealDistance();
    float lit = smoothstep(uFront, uFront - 0.35, s);
    float edge = exp(-pow((s - uFront + 0.1) / 0.09, 2.0));
    gl_FragColor.a *= lit;
    gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 0.86, 0.62), edge * 0.8);
    gl_FragColor.a = max(gl_FragColor.a, edge * 0.85 * step(0.001, lit));
  }
`;

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Ken Perlin's smootherstep — zero first *and* second derivative at the ends. */
const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
/** Overshoots past 1 then settles, which is what gives markers their pop. */
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/**
 * The lamp over the regional relief, in degrees: azimuth clockwise from north, elevation above the horizon.
 * At rest it is the cartographer's light, from the north-west and low enough to rake; by the end of the
 * descent it has swung into the west and come down, across the camera's line of sight. On a first visit it
 * rises out of the horizon, so the summits take its light first, then the plateaus, then the plains — what a
 * low light does to ground (the shadows are cast, `heroLight.ts`). The hand swings it about its rest.
 */
const DEG = Math.PI / 180;
const LAMP_REST = { az: 295 * DEG, el: 12 * DEG };
const LAMP_LOW = { az: 274 * DEG, el: 17 * DEG };
const LAMP_DAWN_EL = -2.5 * DEG;
const LAMP_DAWN_SWING = -16 * DEG;
/** How far the hand swings the lamp at rest: across the north (never round to the camera's side, which flattens the ground), and up or down. */
const LAMP_REACH_AZ = 46 * DEG;
const LAMP_REACH_EL = 8 * DEG;
const LAMP_EMBER = new THREE.Color('#ff9d5c');
/** The hero's water over the regional relief: slate on the shelf, near-black in the abyss — night water, not a tropical sea. */
const WATER_SHALLOW = new THREE.Color('#1c2f3a');
const WATER_DEEP = new THREE.Color('#04090d');
/** The atlas act's exposure over the regional relief (its poses were set for the India slab at 1). */
const ATLAS_EXPOSURE = 1.6;

/** Hoisted: allocating these inside the frame loop is enough to cause GC stalls. */
const POSE_AXES = ['progress', 'px', 'py', 'mv'] as const;
/** Camera, probe and light smoothing rates, per second (tuned as 0.14, 0.32 and 0.12 a frame at 60 Hz). */
const POSE_LAMBDA = perFrame(0.14);
const PROBE_LAMBDA = perFrame(0.32);
const KEY_LAMBDA = perFrame(0.12);

const SKY_VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uBottom;
  varying vec3 vDir;
  void main() {
    float h = normalize(vDir).z;
    vec3 c = h > 0.0
      ? mix(uHorizon, uTop, pow(h, 0.30))
      : mix(uHorizon, uBottom, pow(-h, 0.35));
    gl_FragColor = vec4(c, 1.0);
  }
`;

/**
 * Plates are billboarded in view space: the instance's world position goes
 * through the model-view matrix, and the quad's corners are then added in
 * *view* coordinates, which faces the card at the camera exactly without a
 * per-instance matrix or a CPU-side lookAt.
 */
const PLATE_VERTEX = /* glsl */ `
  attribute vec3 aOffset;
  attribute float aScale;
  attribute vec2 aCell;
  attribute float aAlpha;
  uniform vec2 uCellSize;
  varying vec2 vUv;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    vUv = aCell + uv * uCellSize;
    vec4 mv = modelViewMatrix * vec4(aOffset, 1.0);
    mv.xy += position.xy * aScale;
    gl_Position = projectionMatrix * mv;
  }
`;

const PLATE_FRAGMENT = /* glsl */ `
  uniform sampler2D uAtlas;
  varying vec2 vUv;
  varying float vAlpha;
  void main() {
    vec4 texel = texture2D(uAtlas, vUv);
    float a = texel.a * vAlpha;
    if (a <= 0.004) discard;
    gl_FragColor = vec4(texel.rgb, a);
  }
`;

/**
 * The atlas act's lines: the conservation threads and the closing's lines,
 * as screen-space ribbons (the field worlds' GeoLine in 3D, `world/field/gl/line.ts`)
 * laid on the relief. They rise with the ground behind the light front and are
 * drawn by it, as the state lines are. Fragmentation cuts them into dashes
 * measured along the ground (`aS`, world units), so the gaps open evenly on
 * every thread; the response mixes a covered species' line to river and makes
 * it whole again; a short head of light travels along it as it does.
 */
const THREAD_VERTEX = /* glsl */ `
  attribute vec3 aPrev;
  attribute vec3 aNext;
  attribute float aSide;
  attribute float aT;
  attribute float aS;
  uniform vec2 uResolution;
  uniform float uWidth;
  uniform float uHi;
  varying float vT;
  varying float vS;
  varying float vSide;
  varying float vDepth;
  vec3 risen(vec3 p) {
    return vec3(p.xy, ${PLINTH} + (p.z - ${PLINTH}) * riseAt(p.xy));
  }
  vec2 screen(vec4 c) { return c.xy / c.w * uResolution * 0.5; }
  void main() {
    vec3 p = risen(position);
    mat4 mvp = projectionMatrix * modelViewMatrix;
    vec4 c = mvp * vec4(p, 1.0);
    vec2 sp = screen(mvp * vec4(risen(aPrev), 1.0));
    vec2 sn = screen(mvp * vec4(risen(aNext), 1.0));
    vec2 d = sn - sp;
    if (dot(d, d) < 1e-6) d = vec2(1.0, 0.0);
    vec2 n = normalize(vec2(-d.y, d.x));
    c.xy += n * aSide * uWidth * (1.0 + uHi * 0.8) / uResolution * c.w;
    gl_Position = c;
    vT = aT;
    vS = aS;
    vSide = aSide;
    vRevealXY = position.xy;
    vDepth = -(modelViewMatrix * vec4(p, 1.0)).z;
  }
`;

const THREAD_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uColor2;
  uniform vec3 uRiver;
  uniform float uOpacity;
  uniform float uDraw;
  uniform float uFrag;
  uniform float uProt;
  uniform float uBroken;
  uniform float uHi;
  uniform float uDim;
  uniform float uFlow;
  uniform float uDash;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;
  varying float vT;
  varying float vS;
  varying float vSide;
  varying float vDepth;
  void main() {
    if (vT > uDraw) discard;
    float lit = smoothstep(uFront, uFront - 0.35, revealDistance());
    if (lit < 0.01) discard;
    // A species no programme names stays broken through the response: that is what the record holds.
    float frag = max(uFrag, uBroken * uProt);
    if (frag > 0.002 && fract(vS / uDash) > 1.0 - frag * 0.62) discard;
    float edge = 1.0 - smoothstep(0.4, 1.0, abs(vSide));
    vec3 col = mix(uColor, uColor2, vT);
    col = mix(col, uRiver, uProt * (1.0 - uBroken));
    float head = exp(-pow((vT - uFlow) / 0.03, 2.0)) * step(0.0005, uFlow) * step(uFlow, 0.9995);
    float nib = smoothstep(uDraw - 0.025, uDraw, vT) * step(uDraw, 0.999);
    col += (head * 1.1 + nib * 0.8) * vec3(1.0, 0.88, 0.7);
    float fog = smoothstep(uFogNear, uFogFar, vDepth);
    col = mix(col, uFogColor, fog * 0.75);
    float a = uOpacity * edge * lit * mix(1.0, 0.14, uDim);
    gl_FragColor = vec4(col * (1.0 + uHi * 0.45), clamp(a, 0.0, 1.0));
  }
`;

export function createHeroScene(options: HeroSceneOptions): HeroScene {
  const { canvas, geojson, relief: reliefGrid = null, meshStep = 1, points, plates, onFirstFrame, onTooSlow, onLabels, onProbe, onMarks, onFootprint, endFocus, atmosphere, emerge, world = null, onAnchors, onWorldMarks } = options;

  /* ---------------------------------------------------------------- renderer */

  // Capped below the device ratio on purpose: the post chain blurs and blooms
  // the image anyway, so a full 2x buffer costs 78% more pixels for detail
  // that never survives to the screen.
  const dpr = pixelRatio(1.5);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: false,
    antialias: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 1);

  // Multisampling happens on the scene render target rather than the default
  // framebuffer, because the composite pass never touches the latter's samples.
  const post = createPostChain(renderer, 2);

  /* ---------------------------------------------------------------- terrain */

  const terrain = buildTerrain(geojson, LAND_TOP_HEX, LAND_SIDE_HEX, reliefGrid, meshStep);
  const relief = terrain.relief;
  /** The ground's rise above the plinth at full relief, per point, for everything that stands on it. */
  const riseOf = (x: number, y: number) => terrain.groundAt(x, y) - TERRAIN_DEPTH;
  // The journey's last target: the focus locality if one is given, standing on
  // the relief's surface, or the default point over the peninsula.
  const focusTarget = TARGET_END.clone();
  let focusRise = 0;
  if (endFocus) {
    const [fx, fy] = terrain.project(endFocus.lng, endFocus.lat);
    focusRise = riseOf(fx, fy);
    focusTarget.set(fx, fy, TERRAIN_DEPTH + focusRise);
  }
  const endDistance = endFocus ? FOCUS_DISTANCE : END_DISTANCE;
  const endPitch = endFocus ? FOCUS_PITCH : END_PITCH;


  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(START_FOV, 1, CAMERA_NEAR, CAMERA_FAR);
  camera.up.set(0, 0, 1);

  const fog = new THREE.Fog(0x090b09, 10, 60);
  scene.fog = fog;

  // The emergence front, the opening light and the relief's rise, shared by the land, its walls and its lines.
  const revealUniforms = {
    uFront: { value: emerge ? -1 : 99 },
    // What the ground's rise follows: the front itself over the India-only slab; risen from the start over the region.
    uRiseFront: { value: emerge ? -1 : 99 },
    uPool: { value: 1 },
    uPoolAt: { value: POOL_CENTRE.clone() },
    uLift: { value: 1 },
  };
  const withReveal = (material: THREE.Material, glsl: string, options: { lift?: boolean; relief?: boolean } = {}) => {
    if (options.lift) material.defines = { ...material.defines, RELIEF_LIFT: '' };
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, revealUniforms);
      let vertex = shader.vertexShader.replace('#include <begin_vertex>', LIFT_VERTEX);
      let fragment = shader.fragmentShader.replace('#include <tonemapping_fragment>', `${glsl}\n#include <tonemapping_fragment>`);
      if (options.relief && relief) {
        Object.assign(shader.uniforms, reliefUniforms);
        const pars = region ? RELIEF_PARS + REGION_PARS : RELIEF_PARS;
        if (region) Object.assign(shader.uniforms, regionUniforms);
        vertex = pars + vertex.replace(
          LIFT_VERTEX,
          `${LIFT_VERTEX}\n  vReliefUv = vec2(vRevealXY.x * uUv.x + uUv.y, vRevealXY.y * uUv.z + uUv.w);`,
        );
        fragment = pars + fragment
          .replace('#include <color_fragment>', region ? REGION_GROUND : RELIEF_GROUND)
          .replace('#include <normal_fragment_begin>', RELIEF_NORMAL)
          .replace(
            '#include <tonemapping_fragment>',
            `${RELIEF_INK}\n${ATLAS_GLAZE}\n${region ? REGION_SURFACE : ''}\n#include <tonemapping_fragment>`,
          );
        if (region) fragment = fragment.replace('#include <lights_fragment_begin>', REGION_LIGHTS).replace('#include <aomap_fragment>', REGION_SKY);
      }
      shader.vertexShader = REVEAL_PARS + vertex;
      shader.fragmentShader = REVEAL_PARS + fragment;
    };
  };

  const blankTexture = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  blankTexture.needsUpdate = true;
  const reliefUniforms = relief
    ? {
        uHeight: { value: relief.heightTexture },
        uMask: { value: relief.maskTexture },
        uUv: { value: relief.uv },
        uCell: { value: relief.cell },
        uZPerMetre: { value: relief.zPerMetre },
        uHyps: { value: HYPSOMETRIC_HEX.map((hex) => new THREE.Color(hex)) },
        // Sienna let a little towards the paper, so the line reads as ink on the ground rather than as a red signal.
        uInk: { value: new THREE.Color(CONTOUR_HEX).lerp(new THREE.Color(BORDER_HEX), 0.3).multiplyScalar(0.42) },
        // Lighter over the lit regional ground, where the light already models the form the contours describe.
        uContour: { value: new THREE.Vector4(CONTOUR_MINOR, CONTOUR_MAJOR, relief.region ? 0.17 : 0.3, relief.region ? 0.3 : 0.5) },
        // Filled in when the atlas act is first built (`buildAtlas`); a black texel until then.
        uProtMask: { value: blankTexture as THREE.Texture },
        uProtAmt: { value: 0 },
        uAtlasDim: { value: 0 },
        uGlaze: { value: new THREE.Color('#7ea3b5').multiplyScalar(1.9) },
      }
    : null;

  /** The regional grid (`buildRegion`): the ground runs on past the boundary and under the sea, lit by the lamp with cast shadows. */
  const region = Boolean(relief?.region);
  /** This scene's opening frame: the plan view's, or the three-quarter view over the regional relief. */
  const openFrame = region ? { ...OPENING, ...OPENING_REGION } : { ...OPENING };
  const reliefLight = region && relief ? createReliefLight(renderer, relief) : null;
  /** World direction towards the lamp (the key light), and its colour, for the water's glint. */
  const lampDir = new THREE.Vector3(-0.6, 0.6, 0.5).normalize();
  const regionUniforms = reliefLight && relief
    ? {
        uSunVis: { value: reliefLight.sun },
        uSkyVis: { value: reliefLight.sky },
        uTexel: { value: new THREE.Vector2(1 / relief.size.x, 1 / relief.size.y) },
        uWaterShallow: { value: WATER_SHALLOW.clone() },
        uWaterDeep: { value: WATER_DEEP.clone() },
        // The neighbours' ground: multiplied by x, and taken to a neutral stone by y.
        uNeighbour: { value: new THREE.Vector2(0.6, 1) },
        // How far the lamp's shadows (x) and the sky's occlusion (y) act.
        uLightAmt: { value: new THREE.Vector2(1, 0.85) },
        uLampDir: { value: lampDir },
        uLampColor: { value: new THREE.Color('#ffe2bc') },
        uGlint: { value: 0.55 },
        uSkyTint: { value: new THREE.Color(0.006, 0.012, 0.014) },
      }
    : null;

  // Over the relief the ground, its walls and the sea are matte, so they take Lambert's diffuse light: the
  // physically based specular term cost a measurable share of the frame for a highlight a surface this
  // rough barely shows. The slab keeps the material it always had.
  const landMaterial = relief
    ? new THREE.MeshLambertMaterial({
        // The relief's outline is cut by its mask; coverage keeps that edge smooth on the multisampled target.
        alphaToCoverage: !region,
      })
    : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0.02 });
  const land = new THREE.Mesh(terrain.land, landMaterial);
  scene.add(land);
  withReveal(landMaterial, region ? REGION_LAND_REVEAL : LAND_REVEAL, { lift: Boolean(relief), relief: Boolean(relief) });

  // The relief's walls, from the ground's edge down to the sea, on the same light and rise as the ground.
  const wallMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  withReveal(wallMaterial, region ? REGION_LAND_REVEAL : LAND_REVEAL, { lift: true });
  const walls = terrain.walls ? new THREE.Mesh(terrain.walls, wallMaterial) : null;
  if (walls) scene.add(walls);

  // A sea for the relief to stand in. Without it the extruded landmass reads
  // as a cut-out sheet floating in the dark once the camera drops low enough
  // to see its underside. Its colour tracks the sky, so out at the start of
  // the journey it is indistinguishable from empty space and only resolves
  // into a surface as the horizon warms.
  // Matte with the relief: a glossy sea catches the low key light as a sheet of glare across the captions.
  const seaMaterial = relief
    ? new THREE.MeshLambertMaterial({ color: new THREE.Color(0, 0, 0) })
    : new THREE.MeshStandardMaterial({ color: new THREE.Color(0, 0, 0), roughness: 0.42, metalness: 0.35 });
  // The plinth's contact shadow: the country's outline, blurred, laid on the water to the south-east of
  // it, away from the key light. It is what stands the model on a surface rather than in a void.
  const seaShadow = { uShadow: { value: relief?.shadowTexture ?? null }, uShadowUv: { value: relief?.uv ?? new THREE.Vector4() } };
  if (relief && !region) {
    seaMaterial.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, seaShadow, revealUniforms);
      shader.vertexShader =
        'varying vec2 vSeaXY;\n' +
        shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vSeaXY = (modelMatrix * vec4(transformed, 1.0)).xy;');
      shader.fragmentShader =
        'uniform sampler2D uShadow;\nuniform vec4 uShadowUv;\nuniform float uLift;\nvarying vec2 vSeaXY;\n' +
        shader.fragmentShader.replace(
          '#include <tonemapping_fragment>',
          `{
            // Read only inside the texture, fading out at its edges: clamped, the edge texels would smear out
            // across the whole sea, and cut off hard they leave a straight-edged block of shadow.
            vec2 p = vSeaXY + vec2(-0.045, 0.055);
            vec2 pu = vec2(p.x * uShadowUv.x + uShadowUv.y, p.y * uShadowUv.z + uShadowUv.w);
            vec2 pe = smoothstep(0.0, 0.02, pu) * smoothstep(1.0, 0.98, pu);
            float near = texture2D(uShadow, pu).r * pe.x * pe.y;
            vec2 q = vSeaXY + vec2(-0.12, 0.15);
            vec2 qu = vec2(q.x * uShadowUv.x + uShadowUv.y, q.y * uShadowUv.z + uShadowUv.w);
            vec2 qe = smoothstep(0.0, 0.02, qu) * smoothstep(1.0, 0.98, qu);
            float far = texture2D(uShadow, qu).r * qe.x * qe.y;
            gl_FragColor.rgb *= 1.0 - (0.55 * near + 0.3 * far * uLift);
          }
          #include <tonemapping_fragment>`,
        );
    };
  }
  const seaGeometry = new THREE.PlaneGeometry(90, 90);
  const sea = new THREE.Mesh(seaGeometry, seaMaterial);
  // Under the regional ground the open sea lies just below its level, beyond the grid's edge.
  sea.position.z = region ? TERRAIN_DEPTH - 0.0015 : 0.004;
  // Drawn first. It writes depth (it no longer has a starfield behind it to keep visible), so the
  // depth-of-field pass reads the real distance of the water rather than "infinitely far" wherever
  // only the sea is behind a point, which printed out-of-focus dust as a dotted half-tone.
  // Over the regional relief the ground covers the frame, so the open sea is drawn after it and the depth test
  // spares every pixel the ground already holds (drawn first, it shaded the whole frame a second time).
  sea.renderOrder = region ? 1 : -1;
  scene.add(sea);
  const SEA_SPACE = new THREE.Color(0.002, 0.006, 0.005);
  const SEA_GROUND = new THREE.Color(0.030, 0.062, 0.068);

  const borderMaterial = new THREE.LineBasicMaterial({
    color: new THREE.Color(BORDER_HEX),
    transparent: true,
    opacity: 0.34,
    fog: false,
  });
  withReveal(borderMaterial, LINE_REVEAL, { lift: Boolean(relief) });
  const borders = new THREE.LineSegments(terrain.borders, borderMaterial);
  scene.add(borders);

  // The graticule: real parallels and meridians every five degrees, laid on
  // the water as a printed sheet's grid sits under its land. It belongs
  // to the map-like opening and fades as the camera drops into the terrain.
  // Each rule is cut into short segments whose alpha falls away from the
  // country, so the grid thins into the dark instead of ending on a hard edge.
  const gridVertices: number[] = [];
  const gridColors: number[] = [];
  const gridRgb = new THREE.Color(GRID_HEX);
  const gridAlpha = (x: number, y: number) => {
    const r = Math.hypot(x / 2.7, y / 2.3);
    return Math.pow(clamp(1 - r, 0, 1), 0.8);
  };
  const rule = (lng0: number, lat0: number, lng1: number, lat1: number) => {
    const [x0, y0] = terrain.project(lng0, lat0);
    const [x1, y1] = terrain.project(lng1, lat1);
    const steps = 24;
    for (let k = 0; k < steps; k++) {
      const a = k / steps;
      const b = (k + 1) / steps;
      const ax = lerp(x0, x1, a);
      const ay = lerp(y0, y1, a);
      const bx = lerp(x0, x1, b);
      const by = lerp(y0, y1, b);
      // Just above the water: the sea writes depth, and the plinth hides the grid under the country.
      const gz = region ? TERRAIN_DEPTH + 0.0009 : 0.0045;
      gridVertices.push(ax, ay, gz, bx, by, gz);
      gridColors.push(gridRgb.r, gridRgb.g, gridRgb.b, gridAlpha(ax, ay), gridRgb.r, gridRgb.g, gridRgb.b, gridAlpha(bx, by));
    }
  };
  for (let lat = 0; lat <= 45; lat += 5) rule(55, lat, 110, lat);
  for (let lng = 55; lng <= 110; lng += 5) rule(lng, -5, lng, 48);

  // The Tropic of Cancer, dashed as an atlas draws it and laid on the land
  // rather than under it: the one named line in the opening, and the line
  // the title is set on. It runs out of the country to the west, under the
  // name, and thins away at both ends.
  const tropicVertices: number[] = [];
  const tropicColors: number[] = [];
  const tropicRgb = new THREE.Color(BORDER_HEX);
  {
    const [wx, ty] = terrain.project(38, TROPIC_LAT);
    const [ex] = terrain.project(101, TROPIC_LAT);
    const [landWest] = terrain.project(68.2, TROPIC_LAT);
    const [landEast] = terrain.project(97.2, TROPIC_LAT);
    const dash = 0.028;
    const gap = 0.022;
    // Draped over the ground: each dash is set on the relief at both ends and its middle.
    const z = (x: number) => terrain.groundAt(x, ty) + 0.003;
    const fade = (x: number) => {
      // Full across the land and the run-out west; thinning past the coasts.
      const west = smoother(clamp((x - wx) / (landWest - wx), 0, 1));
      const east = 1 - smoother(clamp((x - landEast) / (ex - landEast), 0, 1));
      return Math.min(west, east);
    };
    for (let x = wx; x < ex; x += dash + gap) {
      const x1 = Math.min(x + dash, ex);
      const xm = (x + x1) / 2;
      tropicVertices.push(x, ty, z(x), xm, ty, z(xm), xm, ty, z(xm), x1, ty, z(x1));
      for (const at of [x, xm, xm, x1]) tropicColors.push(tropicRgb.r, tropicRgb.g, tropicRgb.b, fade(at));
    }
  }
  const tropicGeometry = new THREE.BufferGeometry();
  tropicGeometry.setAttribute('position', new THREE.Float32BufferAttribute(tropicVertices, 3));
  tropicGeometry.setAttribute('color', new THREE.Float32BufferAttribute(tropicColors, 4));
  const tropicMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
  });
  if (relief) withReveal(tropicMaterial, '', { lift: true });
  const tropic = new THREE.LineSegments(tropicGeometry, tropicMaterial);
  tropic.renderOrder = 1;
  scene.add(tropic);
  const tropicMark = new THREE.Vector3();
  let lastTropicY = NaN;
  const footW = new THREE.Vector3();
  const footE = new THREE.Vector3();
  let lastFoot = '';
  const gridGeometry = new THREE.BufferGeometry();
  gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridVertices, 3));
  gridGeometry.setAttribute('color', new THREE.Float32BufferAttribute(gridColors, 4));
  const gridMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    fog: false,
  });
  const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
  scene.add(grid);

  /* -------------------------------------------------------------------- sky */

  const skyMaterial = new THREE.ShaderMaterial({
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    uniforms: {
      uTop: { value: new THREE.Color(0, 0, 0) },
      uHorizon: { value: new THREE.Color(0, 0, 0) },
      uBottom: { value: new THREE.Color(0, 0, 0) },
    },
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const skyGeometry = new THREE.SphereGeometry(70, 20, 14);
  const sky = new THREE.Mesh(skyGeometry, skyMaterial);
  sky.renderOrder = region ? 2 : -2;
  scene.add(sky);

  // Out in the dark the air is a near-black forest green, not night blue: the site's own ground, before any light.
  const SKY_SPACE = {
    top: new THREE.Color(0.003, 0.008, 0.007),
    horizon: new THREE.Color(0.011, 0.024, 0.02),
    bottom: new THREE.Color(0.002, 0.005, 0.004),
  };
  const SKY_GROUND = {
    top: new THREE.Color(0.005, 0.016, 0.022),
    horizon: new THREE.Color(0.052, 0.032, 0.016),
    bottom: new THREE.Color(0.004, 0.011, 0.009),
  };

  /* ------------------------------------------------------------------ motes */

  // No starfield: the relief is a model set on a sheet, not a planet in space, and the dark around it is
  // the page's own ground. Only dust, low over the land, catches the light late in the descent.
  const random = seededRandom(20260906);
  const MOTE_COUNT = particleBudget(220);
  const motePositions = new Float32Array(MOTE_COUNT * 3);
  const moteSizes = new Float32Array(MOTE_COUNT);
  const moteAlphas = new Float32Array(MOTE_COUNT);
  for (let i = 0; i < MOTE_COUNT; i++) {
    motePositions[i * 3] = (random() * 2 - 1) * 2.2;
    motePositions[i * 3 + 1] = (random() * 2 - 1) * 2.4;
    motePositions[i * 3 + 2] = 0.06 + random() * 1.1;
    moteSizes[i] = 1.1 + random() * 2.6;
    moteAlphas[i] = 0.12 + random() * 0.4;
  }
  const motes = makePointCloud(motePositions, moteSizes, moteAlphas, '#e8c79a', dpr);
  scene.add(motes.points);

  /* ---------------------------------------------------------------- markers */

  const markerCount = points.length;
  // Markers are small on screen even at the closest pass, so the sphere
  // tessellation stays coarse — at (10, 8) the markers alone would cost as
  // many triangles as the entire landmass.
  // Finer than the triangle budget alone would ask: at the closest pass a marker is 30–40 px across and its
  // bloom traced the 8 × 6 sphere's outline as an octagon.
  const markerGeometry = new THREE.SphereGeometry(0.015, 16, 12);
  const haloGeometry = new THREE.SphereGeometry(0.015, 16, 12);
  const markerMaterial = new THREE.MeshBasicMaterial({ toneMapped: false, fog: false });
  const markers = new THREE.InstancedMesh(markerGeometry, markerMaterial, markerCount);
  markers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  markers.frustumCulled = false;

  const haloMaterial = new THREE.MeshBasicMaterial({
    toneMapped: false,
    fog: false,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  // The halo is light in the air about the marker, not a shell: it fades towards its own silhouette, so it
  // has no edge for the eye (or the bloom) to find, whatever the sphere's tessellation.
  haloMaterial.onBeforeCompile = (shader) => {
    shader.vertexShader = 'varying vec3 vHaloN;\nvarying vec3 vHaloV;\n' + shader.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      vHaloN = normalize(normalMatrix * mat3(instanceMatrix) * normal);
      vHaloV = -mvPosition.xyz;`,
    );
    shader.fragmentShader = 'varying vec3 vHaloN;\nvarying vec3 vHaloV;\n' + shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `diffuseColor.a *= pow(max(dot(normalize(vHaloN), normalize(vHaloV)), 0.0), 2.2);
      #include <opaque_fragment>`,
    );
  };
  const halos = new THREE.InstancedMesh(haloGeometry, haloMaterial, markerCount);
  halos.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  halos.frustumCulled = false;

  const stemVertices = new Float32Array(markerCount * 6);
  const stemColors = new Float32Array(markerCount * 6);
  const markerBase: Array<{
    x: number;
    y: number;
    height: number;
    /** The ground's rise above the plinth here, at full relief. */
    rise: number;
    revealAt: number;
    color: THREE.Color;
  }> = [];

  // The sweep itself is derived from the dataset by the caller and arrives on
  // each point, so a species' occurrence markers light up with its plate
  // rather than on a separate latitude schedule of their own.
  let firstReveal = Infinity;

  for (let i = 0; i < markerCount; i++) {
    const p = points[i];
    const [x, y] = terrain.project(p.lng, p.lat);
    const height = STEM * (0.82 + ((i * 37) % 11) / 26);
    // A little deterministic jitter, so the several points belonging to one
    // species do not pop in lockstep.
    const revealAt = p.revealAt + (((i * 37) % 13) / 13) * 0.03;
    if (revealAt < firstReveal) firstReveal = revealAt;
    const color = new THREE.Color(p.color);

    const rise = riseOf(x, y);
    markerBase.push({ x, y, height, rise, revealAt, color });

    stemVertices[i * 6] = x;
    stemVertices[i * 6 + 1] = y;
    stemVertices[i * 6 + 2] = TERRAIN_DEPTH + rise;
    stemVertices[i * 6 + 3] = x;
    stemVertices[i * 6 + 4] = y;
    stemVertices[i * 6 + 5] = TERRAIN_DEPTH + rise + height;
    stemColors[i * 6] = color.r * 0.2;
    stemColors[i * 6 + 1] = color.g * 0.2;
    stemColors[i * 6 + 2] = color.b * 0.2;
    stemColors[i * 6 + 3] = color.r;
    stemColors[i * 6 + 4] = color.g;
    stemColors[i * 6 + 5] = color.b;
  }

  // Only possible with an empty dataset, but it would otherwise leave the stem
  // fade reading from Infinity and produce NaN opacities.
  if (!Number.isFinite(firstReveal)) firstReveal = 0;

  const stemGeometry = new THREE.BufferGeometry();
  const stemPosition = new THREE.BufferAttribute(stemVertices, 3);
  stemPosition.setUsage(THREE.DynamicDrawUsage);
  stemGeometry.setAttribute('position', stemPosition);
  stemGeometry.setAttribute('color', new THREE.BufferAttribute(stemColors, 3));
  const stemMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.65,
    toneMapped: false,
    fog: false,
  });
  const stems = new THREE.LineSegments(stemGeometry, stemMaterial);
  stems.frustumCulled = false;
  scene.add(stems, markers, halos);

  // A survey mark on the ground at the focus: two hairline rings that open as
  // the camera arrives, so the place the story starts is unmistakable.
  const focusRingGeometry = new THREE.RingGeometry(0.97, 1, 96);
  const focusRingMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(BORDER_HEX),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const focusRings = [0.045, 0.085].map((r) => {
    const ring = new THREE.Mesh(focusRingGeometry, focusRingMaterial);
    ring.position.copy(focusTarget);
    ring.position.z += 0.002;
    ring.scale.setScalar(r);
    ring.renderOrder = 2;
    ring.visible = Boolean(endFocus);
    scene.add(ring);
    return { ring, r };
  });

  /* ------------------------------------------------------------ survey probe */
  // Where the hand is over the relief: a hairline ring and four ticks lying on
  // the ground, always the same size on screen. Near a lit locality it closes
  // onto it in that species' colour. It is the cursor's reticle, set down on
  // the terrain — the same instrument, now measuring the ground.
  const probeRingGeometry = new THREE.RingGeometry(0.93, 1, 64);
  const probeTickGeometry = new THREE.BufferGeometry();
  probeTickGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([1.2, 0, 0, 1.75, 0, 0, -1.2, 0, 0, -1.75, 0, 0, 0, 1.2, 0, 0, 1.75, 0, 0, -1.2, 0, 0, -1.75, 0], 3),
  );
  const probeMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(BORDER_HEX),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    fog: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  const probeTickMaterial = new THREE.LineBasicMaterial({
    color: new THREE.Color(BORDER_HEX),
    transparent: true,
    opacity: 0,
    depthTest: false,
    fog: false,
    toneMapped: false,
  });
  const probe = new THREE.Group();
  const probeRing = new THREE.Mesh(probeRingGeometry, probeMaterial);
  const probeTicks = new THREE.LineSegments(probeTickGeometry, probeTickMaterial);
  probe.add(probeRing, probeTicks);
  probe.renderOrder = 4;
  probeRing.renderOrder = 4;
  probeTicks.renderOrder = 4;
  probe.visible = false;
  scene.add(probe);
  const probeColor = new THREE.Color(BORDER_HEX);
  const probeIdle = new THREE.Color(BORDER_HEX);

  // The relief's projection is affine, so world → degrees is three samples.
  const [o0x, o0y] = terrain.project(0, 0);
  const [o1x] = terrain.project(1, 0);
  const [, o2y] = terrain.project(0, 1);
  const worldToLngLat = (x: number, y: number): [number, number] => [(x - o0x) / (o1x - o0x), (y - o0y) / (o2y - o0y)];

  /* ------------------------------------------------------ habitat atmosphere */
  // Only where the descent ends, and only as much as reads at the last frames.
  const AIR_COUNT = endFocus && atmosphere ? particleBudget(300) : 0;
  const airPositions = new Float32Array(AIR_COUNT * 3);
  const airSizes = new Float32Array(AIR_COUNT);
  const airAlphas = new Float32Array(AIR_COUNT);
  for (let i = 0; i < AIR_COUNT; i++) {
    // Close about the locality (~170 km), on the camera's side of it (it arrives from the south) and over
    // Indian ground only: the sea writes no depth, so dust hung over it — or far behind the focus — is
    // printed by the depth-of-field pass as a dotted half-tone.
    let x = focusTarget.x;
    let y = focusTarget.y;
    for (let tries = 0; tries < 8; tries++) {
      const a = random() * Math.PI * 2;
      const r = Math.sqrt(random()) * 0.16;
      x = focusTarget.x + Math.cos(a) * r;
      y = focusTarget.y - Math.abs(Math.sin(a) * r) + 0.02;
      if (terrain.onLand(x, y)) break;
    }
    if (!terrain.onLand(x, y)) {
      x = focusTarget.x;
      y = focusTarget.y;
    }
    airPositions[i * 3] = x;
    airPositions[i * 3 + 1] = y;
    // Dust hangs near the ground; snow fills the column.
    const h = atmosphere === 'dust' ? random() ** 2.2 * 0.2 : random() * 0.34;
    airPositions[i * 3 + 2] = focusTarget.z + 0.004 + h;
    airSizes[i] = atmosphere === 'dust' ? 1.8 + random() * 2.6 : 1.6 + random() * 2.2;
    airAlphas[i] = 0.2 + random() * 0.45;
  }
  const air = makePointCloud(airPositions, airSizes, airAlphas, atmosphere === 'snow' ? '#eef3f6' : '#d8b98d', dpr);
  air.points.visible = AIR_COUNT > 0;
  air.material.uniforms.uOpacity.value = 0;
  scene.add(air.points);

  /* ---------------------------------------------------------------- plates */

  const plateCount = plates.length;
  // One canvas, one texture, one draw call for all twelve species plates.
  const plateAtlas = buildPlateAtlas(plates.map((plate) => ({ id: plate.id, color: plate.color })));
  const plateTexture = new THREE.CanvasTexture(plateAtlas);
  plateTexture.colorSpace = THREE.SRGBColorSpace;
  // No mipmaps: a plate is drawn at roughly its native 256 px, so there is
  // nothing to gain, and the atlas is not power-of-two in both axes.
  plateTexture.generateMipmaps = false;
  plateTexture.minFilter = THREE.LinearFilter;
  plateTexture.magFilter = THREE.LinearFilter;

  const plateOffsets = new Float32Array(plateCount * 3);
  const plateScales = new Float32Array(plateCount);
  const plateAlphas = new Float32Array(plateCount);
  const plateCells = new Float32Array(plateCount * 2);
  for (let i = 0; i < plateCount; i++) {
    const row = Math.floor(i / PLATE_COLUMNS);
    plateCells[i * 2] = ((i % PLATE_COLUMNS) * PLATE_CELL) / plateAtlas.width;
    // Textures are uploaded flipped (three's default `flipY`), so v runs from
    // the bottom of the canvas upwards while the atlas is laid out from the
    // top down. Without this the sheet is read a row out and every plate shows
    // some other species' silhouette.
    plateCells[i * 2 + 1] = 1 - (row * PLATE_CELL + PLATE_CELL) / plateAtlas.height;
  }

  const plateQuad = new THREE.PlaneGeometry(2, 2);
  const plateGeometry = new THREE.InstancedBufferGeometry();
  plateGeometry.index = plateQuad.index;
  plateGeometry.setAttribute('position', plateQuad.attributes.position);
  plateGeometry.setAttribute('uv', plateQuad.attributes.uv);
  const plateOffsetAttribute = new THREE.InstancedBufferAttribute(plateOffsets, 3);
  const plateScaleAttribute = new THREE.InstancedBufferAttribute(plateScales, 1);
  const plateAlphaAttribute = new THREE.InstancedBufferAttribute(plateAlphas, 1);
  plateOffsetAttribute.setUsage(THREE.DynamicDrawUsage);
  plateScaleAttribute.setUsage(THREE.DynamicDrawUsage);
  plateAlphaAttribute.setUsage(THREE.DynamicDrawUsage);
  plateGeometry.setAttribute('aOffset', plateOffsetAttribute);
  plateGeometry.setAttribute('aScale', plateScaleAttribute);
  plateGeometry.setAttribute('aAlpha', plateAlphaAttribute);
  plateGeometry.setAttribute('aCell', new THREE.InstancedBufferAttribute(plateCells, 2));
  plateGeometry.instanceCount = plateCount;

  const plateMaterial = new THREE.ShaderMaterial({
    vertexShader: PLATE_VERTEX,
    fragmentShader: PLATE_FRAGMENT,
    uniforms: {
      uAtlas: { value: plateTexture },
      uCellSize: {
        value: new THREE.Vector2(PLATE_CELL / plateAtlas.width, PLATE_CELL / plateAtlas.height),
      },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const plateMesh = new THREE.Mesh(plateGeometry, plateMaterial);
  plateMesh.frustumCulled = false;
  // Drawn after the terrain and the markers so the transparent cards blend
  // over them rather than fighting for the same depth slot.
  plateMesh.renderOrder = 3;
  scene.add(plateMesh);

  const plateBase = plates.map((plate) => {
    const [x, y] = terrain.project(plate.lng, plate.lat);
    return { x, y, rise: riseOf(x, y), revealAt: plate.revealAt };
  });

  /** Screen placement handed to the DOM captions: [x, y, alpha] per plate. */
  const labelLayout = new Float32Array(plateCount * 3);

  /* --------------------------------------------------------------- lighting */

  // A cartographer's light: the key from the north-west, low enough to rake the relief (about 33° up),
  // a quiet sky fill, and a cool rim from the south-east that picks out the far slopes and the walls.
  // Over the regional relief the sky is cool and the ground beneath it dark: what the lamp does not reach takes
  // the sky's blue, so the lamp reads as light rather than as brightness.
  const hemi = region
    ? new THREE.HemisphereLight(new THREE.Color('#6f8ea8'), new THREE.Color('#0a0806'), 0.3)
    : new THREE.HemisphereLight(new THREE.Color('#d9d3c3'), new THREE.Color('#06090a'), relief ? 0.95 : 1.7);
  const key = new THREE.DirectionalLight(new THREE.Color('#fff0d6'), relief ? 3.4 : 2.6);
  const KEY_AT = relief ? new THREE.Vector3(-3.4, 2.9, 2.9) : new THREE.Vector3(-3, 2.5, 5);
  /**
   * Where the key has swung to by the end of the descent: low in the west,
   * across the camera's line of sight rather than into it, so the ground the
   * camera comes down to is side-lit and its ridges read. The light turns
   * slowly with the scroll; it is the one lighting change in the journey.
   */
  const KEY_LOW = relief ? new THREE.Vector3(-4.2, 0.2, 1.7) : KEY_AT;
  const KEY_WARM = new THREE.Color('#ffd9a8');
  const KEY_COOL = new THREE.Color('#fff0d6');
  key.position.copy(KEY_AT);
  const rim = new THREE.DirectionalLight(new THREE.Color('#7ea3b5'), relief ? 0.55 : 0.8);
  rim.position.set(3.5, -3, 1.6);
  scene.add(hemi, key, rim);

  /* -------------------------------------------------------------- atlas act */
  /*
   * The act after the field studies (documentation/HOMEPAGE_DARK_JOURNEY.md):
   * the same relief, renderer and light, now carrying Chapter 04 and the
   * closing. Its layers are built the first time they are needed and kept for
   * the life of the scene; with the hero playing they are simply hidden.
   *
   * Every value the act reads is position-derived by the chapter that owns it
   * (`setAtlas`), and damped here like the descent's progress, so the camera
   * is as heavy as it is in the hero and the act reverses with the scroll.
   */
  let act: 'hero' | 'atlas' = 'hero';
  const ATLAS_AXES = ['arrive', 'frag', 'prot', 'close', 'remain', 'sink'] as const;
  const atlasTo: AtlasState = { arrive: 0, frag: 0, prot: 0, close: 0, remain: 0, sink: 0 };
  const atlasAt: AtlasState = { ...atlasTo };
  const speciesCount = world?.species.length ?? 0;
  /** A trace lights some threads (1) and steps the rest back (`dim`); both eased. */
  const hiTo = new Float32Array(speciesCount);
  const hiAt = new Float32Array(speciesCount);
  let dimTo = 0;
  let dimAt = 0;
  let traceSites: Set<string> | null = null;
  const anchorLayout = new Float32Array(speciesCount * 3);
  const RIVER_LINE = new THREE.Color('#8fb5c6');
  const IVORY = new THREE.Color(BORDER_HEX);
  const lineResolution = new THREE.Vector2(1, 1);
  /** Thread weights in CSS pixels; scaled by the pixel ratio in `applySize`. */
  const THREAD_PX = 2.1;
  const CLOSING_PX = 1.4;

  interface AtlasLine {
    mesh: THREE.Mesh;
    material: THREE.ShaderMaterial;
    geometry: THREE.BufferGeometry;
    species: number;
    px: number;
  }
  interface AtlasLayers {
    group: THREE.Group;
    threads: AtlasLine[];
    lines: AtlasLine[];
    sites: THREE.InstancedMesh;
    siteGeometry: THREE.RingGeometry;
    siteMaterial: THREE.MeshBasicMaterial;
    siteBase: Array<{ x: number; y: number; z: number; programme: string; species: number }>;
    siteHi: Float32Array;
    centre: THREE.Mesh;
    centreGeometry: THREE.RingGeometry;
    centreMaterial: THREE.MeshBasicMaterial;
    anchors: Array<{ x: number; y: number; z: number }>;
    protTexture: THREE.CanvasTexture | null;
  }
  let atlas: AtlasLayers | null = null;

  const smoothJS = (e0: number, e1: number, x: number) => {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const frontDistance = (x: number, y: number) =>
    (x - FRONT_ORIGIN.x) * FRONT_DIRECTION.x + (y - FRONT_ORIGIN.y) * FRONT_DIRECTION.y;
  /** REVEAL_PARS's `riseAt`, for what stands on the ground in JS. */
  const riseAtJS = (x: number, y: number) => {
    const front = revealUniforms.uRiseFront.value - RISE_LAG;
    return revealUniforms.uLift.value * smoothJS(front, front - RISE_SPAN, frontDistance(x, y));
  };
  /** Whether the light front has passed (x, y): what the state lines read. */
  const litAtJS = (x: number, y: number) => smoothJS(revealUniforms.uFront.value, revealUniforms.uFront.value - 0.35, frontDistance(x, y));
  /** A point laid on the ground, risen as far as the ground has risen there. */
  const onGround = (x: number, y: number, z: number, out: THREE.Vector3) =>
    out.set(x, y, TERRAIN_DEPTH + (z - TERRAIN_DEPTH) * riseAtJS(x, y));

  /** A ribbon through `points`: two vertices a point, widened in screen space by THREAD_VERTEX. */
  function ribbon(points: THREE.Vector3[]): THREE.BufferGeometry {
    const n = points.length;
    const lengths = new Float32Array(n);
    let total = 0;
    for (let i = 1; i < n; i++) {
      total += points[i].distanceTo(points[i - 1]);
      lengths[i] = total;
    }
    const pos = new Float32Array(n * 6);
    const prev = new Float32Array(n * 6);
    const next = new Float32Array(n * 6);
    const side = new Float32Array(n * 2);
    const ts = new Float32Array(n * 2);
    const ss = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const p = points[i];
      const a = points[Math.max(0, i - 1)];
      const b = points[Math.min(n - 1, i + 1)];
      for (let k = 0; k < 2; k++) {
        const o = (i * 2 + k) * 3;
        pos[o] = p.x;
        pos[o + 1] = p.y;
        pos[o + 2] = p.z;
        prev[o] = a.x;
        prev[o + 1] = a.y;
        prev[o + 2] = a.z;
        next[o] = b.x;
        next[o + 1] = b.y;
        next[o + 2] = b.z;
        side[i * 2 + k] = k === 0 ? -1 : 1;
        ts[i * 2 + k] = total > 0 ? lengths[i] / total : 0;
        ss[i * 2 + k] = lengths[i];
      }
    }
    const index: number[] = [];
    for (let i = 0; i < n - 1; i++) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aPrev', new THREE.BufferAttribute(prev, 3));
    g.setAttribute('aNext', new THREE.BufferAttribute(next, 3));
    g.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
    g.setAttribute('aT', new THREE.BufferAttribute(ts, 1));
    g.setAttribute('aS', new THREE.BufferAttribute(ss, 1));
    g.setIndex(index);
    return g;
  }

  /** A smooth path through [lng, lat] points, sampled about every 0.01 world units and laid on the relief. */
  function drape(lngLat: Array<[number, number]>, bow = 0): THREE.Vector3[] {
    const ctrl = lngLat.map(([lng, lat]) => {
      const [x, y] = terrain.project(lng, lat);
      return new THREE.Vector3(x, y, 0);
    });
    if (bow && ctrl.length === 2) {
      // A leg that bows to one side, as the sheet's lines between two places do (geo/line/paths.ts `bowedLeg`).
      const [a, b] = ctrl;
      const len = a.distanceTo(b) || 1;
      const mid = a.clone().add(b).multiplyScalar(0.5);
      mid.x += (-(b.y - a.y) / len) * bow * len;
      mid.y += ((b.x - a.x) / len) * bow * len;
      ctrl.splice(1, 0, mid);
    }
    const curve =
      ctrl.length > 2 ? new THREE.CatmullRomCurve3(ctrl, false, 'centripetal') : new THREE.LineCurve3(ctrl[0], ctrl[1]);
    const samples = clamp(Math.ceil(curve.getLength() / 0.01), 8, 900);
    const pts = curve.getSpacedPoints(samples);
    for (const p of pts) p.z = terrain.groundAt(p.x, p.y) + 0.006;
    return pts;
  }

  function lineMaterial(color: THREE.Color, color2: THREE.Color, px: number, broken: boolean) {
    const material = new THREE.ShaderMaterial({
      vertexShader: REVEAL_PARS + THREAD_VERTEX,
      fragmentShader: REVEAL_PARS + THREAD_FRAGMENT,
      uniforms: {
        ...revealUniforms,
        uResolution: { value: lineResolution },
        uWidth: { value: px * renderer.getPixelRatio() },
        uHi: { value: 0 },
        uColor: { value: color },
        uColor2: { value: color2 },
        uRiver: { value: RIVER_LINE },
        uOpacity: { value: 0 },
        uDraw: { value: 1 },
        uFrag: { value: 0 },
        uProt: { value: 0 },
        uBroken: { value: broken ? 1 : 0 },
        uDim: { value: 0 },
        uFlow: { value: 0 },
        uDash: { value: 0.042 },
        uFogColor: { value: fog.color },
        uFogNear: { value: 40 },
        uFogFar: { value: 80 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    return material;
  }

  /**
   * The protected states, filled into a texture in the relief's own frame
   * (west → east, north → south, as the boundary mask is), for the land's
   * glaze. From the same state outlines every drawn map uses.
   */
  function rasteriseProtected(paths: string[]): THREE.CanvasTexture | null {
    if (!reliefGrid || !reliefUniforms || paths.length === 0) return null;
    const { west, east, north, south } = reliefGrid;
    const W = 1024;
    const H = Math.round((W * (north - south)) / (east - west));
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    // The sheet's units to the canvas: both are affine in degrees, so two corners fix the transform.
    const [lng0, lat0] = unproject(0, 0);
    const [lng1, lat1] = unproject(1000, 1000);
    const px = (lng: number) => ((lng - west) / (east - west)) * W;
    const py = (lat: number) => ((north - lat) / (north - south)) * H;
    ctx.setTransform((px(lng1) - px(lng0)) / 1000, 0, 0, (py(lat1) - py(lat0)) / 1000, px(lng0), py(lat0));
    ctx.fillStyle = '#fff';
    for (const d of paths) ctx.fill(new Path2D(d));
    const texture = new THREE.CanvasTexture(c);
    texture.flipY = false;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.colorSpace = THREE.NoColorSpace;
    return texture;
  }

  function buildAtlas(): AtlasLayers | null {
    if (atlas || !world || disposed) return atlas;
    const group = new THREE.Group();
    group.visible = false;
    const threads: AtlasLine[] = [];
    const lines: AtlasLine[] = [];
    world.species.forEach((s, i) => {
      const color = new THREE.Color(s.color);
      for (const run of s.runs) {
        if (run.length < 2) continue;
        const geometry = ribbon(drape(run));
        const material = lineMaterial(color, color, THREAD_PX, !s.covered);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.frustumCulled = false;
        mesh.renderOrder = 2;
        group.add(mesh);
        threads.push({ mesh, material, geometry, species: i, px: THREAD_PX });
      }
      // The closing's line: from the anchor to the drawing point, in the species' colour running out to ivory.
      const geometry = ribbon(drape([s.anchor, world.centre], i % 2 ? 0.18 : -0.18));
      const material = lineMaterial(color.clone().lerp(IVORY, 0.25), IVORY, CLOSING_PX, false);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.frustumCulled = false;
      mesh.renderOrder = 2;
      group.add(mesh);
      lines.push({ mesh, material, geometry, species: i, px: CLOSING_PX });
    });

    const speciesIndex = new Map(world.species.map((s, i) => [s.id, i]));
    const siteBase = world.sites.map((site) => {
      const [x, y] = terrain.project(site.lng, site.lat);
      return { x, y, z: terrain.groundAt(x, y) + 0.004, programme: site.programme, species: speciesIndex.get(site.species) ?? 0 };
    });
    const siteGeometry = new THREE.RingGeometry(0.82, 1, 48);
    const siteMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      fog: false,
      side: THREE.DoubleSide,
    });
    const sites = new THREE.InstancedMesh(siteGeometry, siteMaterial, Math.max(1, siteBase.length));
    sites.count = siteBase.length;
    sites.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    sites.frustumCulled = false;
    sites.renderOrder = 3;
    for (let i = 0; i < siteBase.length; i++) sites.setColorAt(i, instanceColor.setRGB(0, 0, 0));
    group.add(sites);

    const anchors = world.species.map((s) => {
      const [x, y] = terrain.project(s.anchor[0], s.anchor[1]);
      return { x, y, z: terrain.groundAt(x, y) };
    });
    const [cx, cy] = terrain.project(world.centre[0], world.centre[1]);
    const centreGeometry = new THREE.RingGeometry(0.88, 1, 64);
    const centreMaterial = new THREE.MeshBasicMaterial({
      color: RIVER_LINE,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
      fog: false,
      side: THREE.DoubleSide,
    });
    const centre = new THREE.Mesh(centreGeometry, centreMaterial);
    centre.position.set(cx, cy, terrain.groundAt(cx, cy) + 0.005);
    centre.scale.setScalar(0.034);
    centre.renderOrder = 3;
    group.add(centre);

    const protTexture = rasteriseProtected(world.protectedPaths);
    if (protTexture && reliefUniforms) reliefUniforms.uProtMask.value = protTexture;

    scene.add(group);
    atlas = {
      group,
      threads,
      lines,
      sites,
      siteGeometry,
      siteMaterial,
      siteBase,
      siteHi: new Float32Array(siteBase.length),
      centre,
      centreGeometry,
      centreMaterial,
      anchors,
      protTexture,
    };
    return atlas;
  }

  /*
   * The act's poses. Each is a full description of the frame — camera, light,
   * air, grade — and the act moves through them in the order the chapters
   * scroll: out of the dark (arrive), pressure, response (prot), the statement
   * (close), what remains (remain), the colophon (sink). Each stage is zero
   * until the one before it is complete, so blending them one after another
   * reverses exactly.
   */
  type Pose = {
    tx: number; ty: number; dist: number; pitch: number; yaw: number; fov: number; shift: number;
    key: THREE.Vector3; keyColor: THREE.Color; keyI: number; hemiI: number; rimColor: THREE.Color; rimI: number;
    skyTop: THREE.Color; skyHorizon: THREE.Color; skyBottom: THREE.Color; sea: THREE.Color;
    tint: THREE.Color; saturation: number; contrast: number; vignette: number; bloom: number;
    poolX: number; poolY: number; pool: number; landLift: number; borders: number; grid: number;
  };
  const lin = (r: number, g: number, b: number) => new THREE.Color(r, g, b);
  const POSE_DARK: Pose = {
    // High over the country, looking a little south of it, so the north stands near the top of the plate as it slides in.
    tx: 0, ty: -0.7, dist: 11, pitch: 1.4, yaw: -Math.PI / 2, fov: 26, shift: 0.16,
    key: new THREE.Vector3(-3.4, 2.9, 2.9), keyColor: new THREE.Color('#ffe2bc'), keyI: 2.2, hemiI: 0.6,
    rimColor: new THREE.Color('#7ea3b5'), rimI: 0.2,
    // The canopy's own dark, so the plate opens on the ground it is cut in rather than on a black hole.
    skyTop: lin(0.002, 0.004, 0.003), skyHorizon: lin(0.007, 0.014, 0.009), skyBottom: lin(0.0015, 0.003, 0.002), sea: lin(0.0055, 0.011, 0.0068),
    tint: new THREE.Color(0.98, 0.97, 0.94), saturation: 0.6, contrast: 1, vignette: 0.45, bloom: 0.45,
    poolX: -0.1, poolY: 0.3, pool: 1, landLift: 1, borders: 0.42, grid: 0.55,
  };
  // Pressure: a low key from the west over burnt earth, the umber ground in the air and on the water.
  const POSE_PRESSURE: Pose = {
    ...POSE_DARK,
    tx: 0.12, ty: -0.12, dist: 5.4, pitch: 0.86, yaw: -1.84, fov: 34, shift: 0.24,
    key: new THREE.Vector3(-4.3, 1.1, 1.9), keyColor: new THREE.Color('#ffc996'), keyI: 3.3, hemiI: 0.85,
    rimColor: new THREE.Color('#9a7a62'), rimI: 0.35,
    skyTop: lin(0.004, 0.003, 0.002), skyHorizon: lin(0.019, 0.015, 0.011), skyBottom: lin(0.003, 0.002, 0.0015), sea: lin(0.0138, 0.0123, 0.0095),
    tint: new THREE.Color(1.06, 0.98, 0.9), saturation: 0.8, contrast: 1, vignette: 0.38, bloom: 0.5,
    poolX: -0.35, poolY: 0.4, pool: 1, landLift: 1.04, borders: 0.36, grid: 0,
  };
  // Response: the camera swings east of south; the light cools, the rim and the water turn to river.
  const POSE_RESPONSE: Pose = {
    ...POSE_PRESSURE,
    tx: 0.16, ty: -0.02, dist: 5.2, pitch: 0.98, yaw: -1.4, fov: 34, shift: 0.24,
    key: new THREE.Vector3(-3.2, 2.6, 2.4), keyColor: new THREE.Color('#e9e4d6'), keyI: 2.9, hemiI: 0.95,
    rimColor: new THREE.Color('#7ea3b5'), rimI: 0.9,
    skyTop: lin(0.001, 0.004, 0.006), skyHorizon: lin(0.003, 0.016, 0.022), skyBottom: lin(0.001, 0.003, 0.004), sea: lin(0.0023, 0.0135, 0.019),
    tint: new THREE.Color(0.94, 0.99, 1.04), saturation: 0.78, contrast: 1, vignette: 0.38, bloom: 0.5,
    poolX: 0.1, poolY: 0.1, pool: 0.75,
  };
  // The statement: the camera lifts to look down on what is protected, set right of the sentence.
  const POSE_STATEMENT: Pose = {
    ...POSE_RESPONSE,
    tx: 0.08, ty: 0.02, dist: 6.4, pitch: 1.2, yaw: -1.57, fov: 32, shift: 0.3,
    keyI: 2.4, hemiI: 0.8, vignette: 0.42, pool: 0.4,
  };
  // What remains: the opening's plate again — north up, straight down, the name's column on the left.
  const POSE_REMAIN: Pose = {
    ...POSE_STATEMENT,
    tx: 0, ty: 0.05, dist: 7.4, pitch: 1.12, yaw: -Math.PI / 2, fov: 30, shift: 0.34,
    key: new THREE.Vector3(-3.4, 2.9, 2.9), keyColor: new THREE.Color('#fff0d6'), keyI: 3.0, hemiI: 0.95,
    rimColor: new THREE.Color('#7ea3b5'), rimI: 0.5,
    skyTop: lin(0.0015, 0.003, 0.004), skyHorizon: lin(0.005, 0.0116, 0.017), skyBottom: lin(0.001, 0.002, 0.003), sea: lin(0.0025, 0.007, 0.0108),
    tint: new THREE.Color(0.96, 0.98, 0.97), saturation: 0.66, contrast: 1, vignette: 0.36, bloom: 0.45,
    poolX: -0.25, poolY: 0.45, pool: 1, landLift: 1.06, borders: 0.32, grid: 0.4,
  };
  // The colophon: the lamp lowers and the relief recedes into the slate under it.
  const POSE_SINK: Pose = {
    ...POSE_REMAIN,
    dist: 8.6, pitch: 1.3, shift: 0.22,
    keyI: 0.45, hemiI: 0.22, rimI: 0.1, vignette: 0.55, pool: 1, landLift: 0.55, borders: 0.1, grid: 0.06,
  };
  const pose: Pose = {
    ...POSE_DARK,
    key: new THREE.Vector3(), keyColor: new THREE.Color(), rimColor: new THREE.Color(),
    skyTop: new THREE.Color(), skyHorizon: new THREE.Color(), skyBottom: new THREE.Color(), sea: new THREE.Color(), tint: new THREE.Color(),
  };
  const POSE_NUMBERS = ['tx', 'ty', 'dist', 'pitch', 'yaw', 'fov', 'shift', 'keyI', 'hemiI', 'rimI', 'saturation', 'contrast', 'vignette', 'bloom', 'poolX', 'poolY', 'pool', 'landLift', 'borders', 'grid'] as const;
  const POSE_COLORS = ['keyColor', 'rimColor', 'skyTop', 'skyHorizon', 'skyBottom', 'sea', 'tint'] as const;
  function copyPose(from: Pose) {
    for (const k of POSE_NUMBERS) pose[k] = from[k];
    for (const k of POSE_COLORS) pose[k].copy(from[k]);
    pose.key.copy(from.key);
  }
  function blendPose(to: Pose, t: number) {
    if (t <= 0) return;
    for (const k of POSE_NUMBERS) pose[k] = lerp(pose[k], to[k], t);
    for (const k of POSE_COLORS) pose[k].lerp(to[k], t);
    pose.key.lerp(to.key, t);
  }

  /** The atlas act's frame: pose, light, layers, labels. Returns nothing; renders nothing. */
  function applyAtlasPose() {
    const layers = atlas ?? buildAtlas();
    const s = atlasAt;
    const arrive = smoother(clamp(s.arrive, 0, 1));
    copyPose(POSE_DARK);
    blendPose(POSE_PRESSURE, arrive);
    blendPose(POSE_RESPONSE, smoother(clamp(s.prot, 0, 1)));
    blendPose(POSE_STATEMENT, smoother(clamp(s.close, 0, 1)));
    blendPose(POSE_REMAIN, smoother(clamp(s.remain, 0, 1)));
    blendPose(POSE_SINK, smoother(clamp(s.sink, 0, 1)));

    // The camera, as the descent places it: spherical about a target, slid sideways so the
    // country sits clear of the chapter's column of type.
    const aspect = viewWidth / viewHeight;
    lookTarget.set(pose.tx, pose.ty, TERRAIN_DEPTH + 0.05);
    const fov = pose.fov + current.mv * 2.4;
    const pitch = pose.pitch + current.py * 0.035;
    const yaw = pose.yaw + current.px * 0.05;
    const cosPitch = Math.cos(pitch);
    cameraOffset.set(cosPitch * Math.cos(yaw), cosPitch * Math.sin(yaw), Math.sin(pitch));
    camera.position.copy(lookTarget).addScaledVector(cameraOffset, pose.dist);
    camera.fov = fov;
    camera.updateProjectionMatrix();
    camera.lookAt(lookTarget);
    const halfHeightAtTarget = pose.dist * Math.tan((fov * Math.PI) / 360);
    forward.subVectors(lookTarget, camera.position).normalize();
    rightVector.crossVectors(forward, camera.up).normalize();
    const shift = pose.shift * halfHeightAtTarget * Math.max(aspect, 1);
    camera.position.addScaledVector(rightVector, -shift);
    lookTarget.addScaledVector(rightVector, -shift);
    camera.lookAt(lookTarget);
    camera.updateMatrixWorld(true);
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    sky.position.copy(camera.position);

    // The light front runs again as the chapter arrives: the country is drawn out of the dark, north to south.
    // It starts already over the north (the Himalaya's lines are drawn as the plate opens), so the plate is never empty.
    const front = arrive >= 0.999 ? 99 : lerp(0.35, 5.4, smoother(clamp(s.arrive / 0.82, 0, 1)));
    revealUniforms.uFront.value = front;
    revealUniforms.uLift.value = 1;
    reliefLift = 1;
    revealUniforms.uPool.value = pose.pool;
    revealUniforms.uPoolAt.value.set(pose.poolX, pose.poolY);

    key.position.copy(pose.key);
    keyBase.copy(pose.key);
    keyTo.copy(pose.key);
    key.color.copy(pose.keyColor);
    key.intensity = pose.keyI;
    hemi.intensity = pose.hemiI;
    rim.color.copy(pose.rimColor);
    rim.intensity = pose.rimI;
    skyMaterial.uniforms.uTop.value.copy(pose.skyTop);
    skyMaterial.uniforms.uHorizon.value.copy(pose.skyHorizon);
    skyMaterial.uniforms.uBottom.value.copy(pose.skyBottom);
    if (region && regionUniforms) {
      // Over the regional relief the act's water is the ground's own (its sea floor read through it); the open
      // sea beyond the grid is black, as the grid's edge sinks to black, so the two never meet at a seam.
      seaMaterial.color.setRGB(0, 0, 0);
      regionUniforms.uWaterDeep.value.copy(pose.sea).multiplyScalar(0.45);
      regionUniforms.uWaterShallow.value.copy(pose.sea).multiplyScalar(2.6);
    } else seaMaterial.color.copy(pose.sea);
    fog.color.copy(pose.skyHorizon);
    fog.near = pose.dist * 0.6;
    fog.far = pose.dist * 3.2;
    landMaterial.color.setRGB(pose.landLift, pose.landLift * 0.98, pose.landLift * 0.94);
    borderMaterial.opacity = pose.borders;
    gridMaterial.opacity = pose.grid;
    motes.material.uniforms.uOpacity.value = 0;
    air.material.uniforms.uOpacity.value = 0;
    probeTo.alpha = 0;
    for (const { ring } of focusRings) ring.visible = false;
    // The opening's parallel, drawn across the closing plate again.
    const tropicIn = smoother(clamp((s.remain - 0.35) / 0.5, 0, 1)) * (1 - smoother(clamp(s.sink / 0.3, 0, 1)));
    tropicMaterial.opacity = tropicIn * 0.55;
    tropic.visible = tropicMaterial.opacity > 0.002;

    // Protection on the ground: the glaze comes up with the response and holds; the rest of the land steps down for the statement.
    if (reliefUniforms) {
      // The contours were weighted for the opening's view straight down; seen obliquely across the plateaus they crowd into a
      // speckle, so in this act they are drawn lighter (heavier again for the closing, which looks down as the opening does).
      const c = reliefUniforms.uContour.value;
      const down = smoother(clamp(s.remain, 0, 1));
      c.z = lerp(0.1, 0.24, down);
      c.w = lerp(0.26, 0.42, down);
      reliefUniforms.uProtAmt.value = smoother(clamp(s.prot, 0, 1)) * (1 - smoother(clamp(s.remain / 0.6, 0, 1)));
      reliefUniforms.uAtlasDim.value = smoother(clamp(s.close, 0, 1)) * (1 - smoother(clamp(s.remain / 0.5, 0, 1)));
    }

    if (layers) {
      layers.group.visible = true;
      const threadsOut = smoother(clamp(s.close / 0.7, 0, 1));
      const threadsIn = clamp(s.arrive / 0.6, 0, 1);
      const flow = s.prot > 0.02 && s.prot < 0.995 ? clamp((s.prot - 0.05) / 0.9, 0, 1) : 0;
      for (const t of layers.threads) {
        const u = t.material.uniforms;
        const hi = hiAt[t.species];
        // Under the statement only the covered threads stay, faint, inside what is protected.
        const covered = u.uBroken.value < 0.5;
        u.uOpacity.value = threadsIn * (1 - threadsOut * (covered ? 0.7 : 1)) * (1 - smoother(clamp(s.remain / 0.4, 0, 1))) * 0.92;
        u.uFrag.value = s.frag;
        u.uProt.value = s.prot;
        u.uHi.value = hi;
        u.uDim.value = dimAt * (1 - hi);
        u.uFlow.value = covered ? flow : 0;
        u.uFogNear.value = fog.near;
        u.uFogFar.value = fog.far;
        t.mesh.visible = u.uOpacity.value > 0.003;
      }
      // The closing's lines, one after another from each anchor, as the camera climbs.
      for (const l of layers.lines) {
        const u = l.material.uniforms;
        const k = clamp((s.remain - 0.25 - l.species * 0.03) / 0.45, 0, 1);
        u.uDraw.value = smoother(k);
        u.uOpacity.value = (k > 0 ? 0.85 : 0) * (1 - smoother(clamp(s.sink / 0.8, 0, 1)) * 0.75);
        u.uFogNear.value = fog.near;
        u.uFogFar.value = fog.far;
        l.mesh.visible = u.uOpacity.value > 0.003 && k > 0;
      }
      const centreIn = smoother(clamp((s.remain - 0.8) / 0.2, 0, 1)) * (1 - smoother(clamp(s.sink / 0.8, 0, 1)));
      layers.centreMaterial.opacity = centreIn * 0.9;
      layers.centre.visible = centreIn > 0.005;
      layers.centre.position.z = TERRAIN_DEPTH + (terrain.groundAt(layers.centre.position.x, layers.centre.position.y) - TERRAIN_DEPTH) + 0.005;

      // Programme sites: rings on the ground at the anchor localities they name, with the response;
      // a traced threat rings the programmes on record for its species ahead of it.
      const siteIn = smoother(clamp((s.prot - 0.2) / 0.6, 0, 1)) * (1 - smoother(clamp(s.remain / 0.5, 0, 1)));
      const pxWorld = (2 * pose.dist * Math.tan((camera.fov * Math.PI) / 360)) / viewHeight;
      quaternion.identity();
      for (let i = 0; i < layers.siteBase.length; i++) {
        const b = layers.siteBase[i];
        const on = traceSites?.has(b.programme) ? 1 : 0;
        layers.siteHi[i] += (on - layers.siteHi[i]) * 0.25;
        const hi = layers.siteHi[i];
        const w = Math.max(siteIn * (traceSites ? 0.3 : 1), hi) * litAtJS(b.x, b.y);
        onGround(b.x, b.y, b.z, position);
        scaleVec.setScalar(Math.max(1e-4, pxWorld * (7 + hi * 5)));
        matrix.compose(position, quaternion, scaleVec);
        layers.sites.setMatrixAt(i, matrix);
        const r = hi > 0.05 ? lerp(RIVER_LINE.r, IVORY.r, hi * 0.6) : RIVER_LINE.r;
        const g = hi > 0.05 ? lerp(RIVER_LINE.g, IVORY.g, hi * 0.6) : RIVER_LINE.g;
        const bl = hi > 0.05 ? lerp(RIVER_LINE.b, IVORY.b, hi * 0.6) : RIVER_LINE.b;
        layers.sites.setColorAt(i, instanceColor.setRGB(r * w, g * w, bl * w));
      }
      layers.sites.instanceMatrix.needsUpdate = true;
      if (layers.sites.instanceColor) layers.sites.instanceColor.needsUpdate = true;

      // Labels for a traced species, set at its anchor locality.
      if (onAnchors) {
        for (let i = 0; i < layers.anchors.length; i++) {
          const a = layers.anchors[i];
          onGround(a.x, a.y, a.z, plateProjected).project(camera);
          anchorLayout[i * 3] = (plateProjected.x * 0.5 + 0.5) * viewWidth;
          anchorLayout[i * 3 + 1] = (-plateProjected.y * 0.5 + 0.5) * viewHeight;
          anchorLayout[i * 3 + 2] = plateProjected.z < 1 ? hiAt[i] * dimAt * (1 - threadsOut) : 0;
        }
        onAnchors(anchorLayout);
      }
    }

    applyAtlasMarkers(s);

    if (onWorldMarks) {
      if (tropicIn > 0.02) {
        const [mx, my] = terrain.project(69, TROPIC_LAT);
        tropicMark.set(mx, my, TERRAIN_DEPTH + riseOf(mx, my)).project(camera);
        const y = Math.round((-tropicMark.y * 0.5 + 0.5) * viewHeight * 2) / 2;
        if (y !== lastWorldTropic) {
          lastWorldTropic = y;
          onWorldMarks({ tropicY: y });
        }
      } else if (lastWorldTropic !== -1) {
        lastWorldTropic = -1;
        onWorldMarks(null);
      }
    }

    if (post) {
      post.apply({
        focus: camera.position.distanceTo(lookTarget),
        focusRange: lerp(14, 40, smoother(clamp(s.remain, 0, 1))),
        maxCoc: 0.0018 * (1 - smoother(clamp(s.remain, 0, 1))),
        bloom: pose.bloom,
        vignette: pose.vignette,
        tint: pose.tint,
        saturation: pose.saturation,
        contrast: pose.contrast,
        lift: 0,
        // The regional ground is lit by the lamp against a cool sky (see the hero); exposed a little up for it.
        exposure: region ? ATLAS_EXPOSURE : 1,
      });
    }
  }
  let lastWorldTropic = -1;

  /** The 52 localities in the atlas act: all standing, lit by the front, a trace keeping only its species. */
  function applyAtlasMarkers(s: AtlasState) {
    quaternion.identity();
    const out = 1 - smoother(clamp(s.close / 0.6, 0, 1)) * 0.6;
    const sinking = 1 - smoother(clamp(s.sink, 0, 1)) * 0.7;
    for (let i = 0; i < markerCount; i++) {
      const m = markerBase[i];
      const group = points[i].group ?? -1;
      const hi = group >= 0 && group < speciesCount ? hiAt[group] : 0;
      const keep = 1 - dimAt * (1 - hi) * 0.85;
      const lit = litAtJS(m.x, m.y);
      const grow = lit * keep * out * sinking;
      const ground = TERRAIN_DEPTH + m.rise * riseAtJS(m.x, m.y);
      const z = ground + m.height * 0.8 * grow;
      position.set(m.x, m.y, z);
      scaleVec.setScalar(Math.max(grow, 1e-4) * (1 + hi * 0.5));
      matrix.compose(position, quaternion, scaleVec);
      markers.setMatrixAt(i, matrix);
      scaleVec.setScalar(Math.max(grow, 1e-4) * (2.4 + hi * 1.6));
      matrix.compose(position, quaternion, scaleVec);
      halos.setMatrixAt(i, matrix);
      const intensity = 1.6 + hi * 1.6;
      instanceColor.setRGB(m.color.r * intensity, m.color.g * intensity, m.color.b * intensity);
      markers.setColorAt(i, instanceColor);
      instanceColor.setRGB(m.color.r * 0.5, m.color.g * 0.5, m.color.b * 0.5);
      halos.setColorAt(i, instanceColor);
      stemVertices[i * 6 + 2] = ground;
      stemVertices[i * 6 + 5] = z;
    }
    markers.instanceMatrix.needsUpdate = true;
    halos.instanceMatrix.needsUpdate = true;
    if (markers.instanceColor) markers.instanceColor.needsUpdate = true;
    if (halos.instanceColor) halos.instanceColor.needsUpdate = true;
    stemPosition.needsUpdate = true;
    stemMaterial.opacity = 0.5 * out * sinking;
  }

  /** Steps the act's values and the trace weights towards their targets; true while anything is still moving. */
  function stepAtlas(dt: number): boolean {
    let moving = false;
    for (const axis of ATLAS_AXES) {
      const delta = atlasTo[axis] - atlasAt[axis];
      if (Math.abs(delta) > 0.0004) {
        atlasAt[axis] = damp(atlasAt[axis], atlasTo[axis], POSE_LAMBDA, dt);
        moving = true;
      } else atlasAt[axis] = atlasTo[axis];
    }
    for (let i = 0; i < speciesCount; i++) {
      const d = hiTo[i] - hiAt[i];
      if (Math.abs(d) > 0.004) {
        hiAt[i] = damp(hiAt[i], hiTo[i], PROBE_LAMBDA, dt);
        moving = true;
      } else hiAt[i] = hiTo[i];
    }
    if (Math.abs(dimTo - dimAt) > 0.004) {
      dimAt = damp(dimAt, dimTo, PROBE_LAMBDA, dt);
      moving = true;
    } else dimAt = dimTo;
    if (atlas) for (let i = 0; i < atlas.siteHi.length; i++) if (Math.abs((traceSites?.has(atlas.siteBase[i].programme) ? 1 : 0) - atlas.siteHi[i]) > 0.01) moving = true;
    return moving;
  }

  /** Back to the descent: the atlas's layers put away, the land's glaze off, the opening's light pool home. */
  function leaveAtlas() {
    if (atlas) atlas.group.visible = false;
    if (reliefUniforms) {
      reliefUniforms.uProtAmt.value = 0;
      reliefUniforms.uAtlasDim.value = 0;
      reliefUniforms.uContour.value.z = 0.3;
      reliefUniforms.uContour.value.w = 0.5;
    }
    revealUniforms.uPoolAt.value.copy(POOL_CENTRE);
    for (const { ring } of focusRings) ring.visible = Boolean(endFocus);
    key.intensity = relief ? 3.4 : 2.6;
    hemi.intensity = relief ? 0.95 : 1.7;
    rim.color.set('#7ea3b5');
    rim.intensity = relief ? 0.55 : 0.8;
    if (lastWorldTropic !== -1) {
      lastWorldTropic = -1;
      onWorldMarks?.(null);
    }
  }

  /* ------------------------------------------------------------------ state */

  const target = { progress: 0, px: 0, py: 0, mv: 0 };
  const current = { progress: 0, px: 0, py: 0, mv: 0 };
  /** The probe: the hand in frame coordinates, and where its ring is (eased) on the ground. */
  const probeIn = { on: false, x: 0, y: 0 };
  const probeAt = { x: 0, y: 0, r: 0, alpha: 0, snapped: -1, set: false };
  const probeTo = { x: 0, y: 0, r: 0, alpha: 0 };
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -TERRAIN_DEPTH);
  const hit = new THREE.Vector3();
  const marchAt = new THREE.Vector3();
  const keyBase = KEY_AT.clone();
  /** The lamp (regional relief): azimuth and elevation, each on the shared spring's `lamp` tuning (a little weight, a little overshoot). */
  const lamp = { az: new Spring(LAMP_REST.az + LAMP_DAWN_SWING, SPRINGS.lamp), el: new Spring(LAMP_DAWN_EL, SPRINGS.lamp) };
  const lampColor = new THREE.Color();
  /** Highest point of the ground above the plinth at full relief, in world units. */
  const peakRise = relief ? relief.peakMetres * relief.zPerMetre * 1.05 : 0;
  /**
   * How far the relief stands up right now, 0 → 1: it rises with the
   * emergence and lies flat again for the hand-off to the atlas's sheet.
   * Everything that stands on the ground in JS (markers, rings, the probe)
   * reads it, as the shaders read `uLift`.
   */
  let reliefLift = 1;
  const keyTo = keyBase.clone();
  /** The sheet hand-off (see `toSheet`). */
  const sheet: { cam: GeoCam | null; t: number } = { cam: null, t: 0 };
  const sheetPos = new THREE.Vector3();
  const sheetQuat = new THREE.Quaternion();
  const SHEET_FOV = 16;
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scaleVec = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const plateAnchor = new THREE.Vector3();
  const plateView = new THREE.Vector3();
  const plateProjected = new THREE.Vector3();
  const cameraOffset = new THREE.Vector3();
  const rightVector = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const screenUp = new THREE.Vector3();
  const tintColor = new THREE.Color();
  const instanceColor = new THREE.Color();
  const TINT_SPACE = new THREE.Color(0.93, 0.97, 0.94);
  const TINT_GROUND = new THREE.Color(1.045, 0.995, 0.925);

  let viewWidth = 1;
  let viewHeight = 1;
  let active = true;
  let frame = 0;
  let disposed = false;
  let firstFrameSent = false;
  let warmed = false;
  /** The emergence, 0 → 1 (see `HeroSceneOptions.emerge`); `emergeFrom` is when it began, or −1 while held. */
  let emergence = emerge ? 0 : 1;
  let emergeFrom = -1;
  const EMERGE_MS = 3600;

  /* --- adaptive quality (world/quality.ts) --- */
  let continuing = false;
  let lastDrawAt = 0;
  /**
   * The ladder. Each rung removes the most expensive thing still running, so
   * the effect survives on weaker hardware for as long as it can before being
   * abandoned altogether.
   */
  const governor = new FrameGovernor({
    rungs: 2,
    onTooSlow,
    onStep(rung) {
      if (rung === 1) {
        // Depth of field first: it is both the widest pass in the chain (seven
        // texture reads for every pixel on screen) and the least missed.
        post?.setQuality(1 as PostQuality);
        halos.visible = false;
        renderer.setPixelRatio(Math.min(dpr, 0.85));
      } else {
        post?.setQuality(2 as PostQuality);
        motes.points.visible = false;
        renderer.setPixelRatio(Math.min(dpr, 0.62));
      }
      applySize();
    },
  });
  governor.begin();

  function applySize() {
    const ratio = renderer.getPixelRatio();
    renderer.setSize(viewWidth, viewHeight, false);
    post?.setSize(viewWidth, viewHeight, ratio);
    motes.material.uniforms.uPixelRatio.value = ratio;
    air.material.uniforms.uPixelRatio.value = ratio;
    lineResolution.set(viewWidth * ratio, viewHeight * ratio);
    if (atlas) for (const l of [...atlas.threads, ...atlas.lines]) l.material.uniforms.uWidth.value = l.px * ratio;
    camera.aspect = viewWidth / viewHeight;
    camera.updateProjectionMatrix();
  }

  /**
   * Places the camera for a given progress. Spherical around a target that
   * drifts south as the journey proceeds, so the descent ends over the
   * peninsula rather than the geometric centre of the country.
   */
  function applyPose() {
    if (act === 'atlas' && world) {
      applyAtlasPose();
      return;
    }
    const p = current.progress;
    // Mostly linear, lightly smoothed at the ends. A pure smootherstep here
    // spends the first quarter of the scroll almost stationary, which reads as
    // the effect being broken rather than as an approach.
    const j = 0.85 * p + 0.15 * smoother(p);

    // Geometric interpolation: equal *ratios* of distance per unit of scroll,
    // so the descent feels like a constant rate rather than a rush and a crawl.
    // A wide frame has room beside the copy, so the camera can come closer to the focus there.
    const finalDistance = endFocus && viewWidth / viewHeight > 1.15 ? endDistance * 0.72 : endDistance;
    // The emergence eases the camera in a little as the country comes up.
    const settled = easeOutCubic(emergence);
    // Over the regional relief the opening starts in plan, where the loader's outline lands, and tilts into the
    // three-quarter view as the lamp comes up: the drawn map stands up into ground.
    const tilt = region ? (emergence >= 1 ? 1 : smoother(clamp((emergence - 0.16) / 0.74, 0, 1))) : 1;
    const settle = region ? lerp(PLAN_DISTANCE, 1, tilt) : 1 + 0.12 * (1 - settled);
    // A portrait frame is narrower than the country is wide, so the opening stands further back there; the descent is unchanged.
    const portrait = lerp(1, 1.78, clamp((1 - viewWidth / viewHeight) / 0.55, 0, 1));
    const distance = openFrame.distance * Math.pow(finalDistance / openFrame.distance, j) * settle * lerp(portrait, 1, smoother(clamp(j / 0.5, 0, 1)));
    const parallaxFalloff = 1 - 0.55 * j;
    const pitch =
      lerp(region ? lerp(PLAN_PITCH, openFrame.pitch, tilt) : openFrame.pitch, endPitch, j) +
      current.py * 0.07 * parallaxFalloff * tilt -
      (region ? 0 : 0.1 * (1 - settled));
    // At rest the hand turns the country only a little, so its parallels stay level under the title.
    const yaw =
      lerp(openFrame.yaw, END_YAW, easeOutCubic(p)) +
      current.px * lerp(0.035, 0.12, clamp(j / 0.3, 0, 1)) * parallaxFalloff * tilt +
      (region ? 0 : 0.16 * (1 - settled));
    // Momentum: a fast scroll widens the lens a little, as if the camera were
    // carried by it; it narrows again as the page settles.
    const fov = lerp(openFrame.fov, END_FOV, j) + current.mv * 3.2;

    // Country first, region second: the target drifts towards the middle of the
    // relief for the first part of the descent and only then turns for the
    // focus, so the approach reads as narrowing in rather than a straight dive.
    if (endFocus) {
      const k = smoother(clamp((j - 0.45) / 0.55, 0, 1));
      lookTarget.set(openFrame.tx, openFrame.ty, TARGET_START.z).lerp(TARGET_END, Math.min(j / 0.45, 1) * (1 - k)).lerp(focusTarget, k);
    } else {
      lookTarget.set(openFrame.tx, openFrame.ty, TARGET_START.z).lerp(TARGET_END, j);
    }

    const cosPitch = Math.cos(pitch);
    cameraOffset.set(cosPitch * Math.cos(yaw), cosPitch * Math.sin(yaw), Math.sin(pitch));
    camera.position.copy(lookTarget).addScaledVector(cameraOffset, distance);

    camera.fov = fov;
    camera.updateProjectionMatrix();
    camera.lookAt(lookTarget);

    // Shift the relief off-centre so it sits clear of the headline on wide
    // screens. Expressed as a fraction of the frame rather than world units,
    // so it holds as the field of view widens and the camera closes in.
    const aspect = viewWidth / viewHeight;
    const halfHeightAtTarget = distance * Math.tan((fov * Math.PI) / 360);
    forward.subVectors(lookTarget, camera.position).normalize();
    rightVector.crossVectors(forward, camera.up).normalize();
    if (aspect > 1.15) {
      // At rest the country stands centred in the upper frame, over the name that runs across the foot (CinematicHero);
      // once the descent starts it slides right and settles, giving the captions on the left their room.
      const k = clamp(j / 0.2, 0, 1);
      screenUp.crossVectors(rightVector, forward).normalize();
      if (j < 0.2) {
        const rise = lerp(-openFrame.restRise, 0, smoother(k)) * halfHeightAtTarget;
        camera.position.addScaledVector(screenUp, rise);
        lookTarget.addScaledVector(screenUp, rise);
      }
      // Where the frame is closer to square (a small laptop window) the peninsula's tip would reach the lede's links, so the country rests a little further right.
      // restShift at 1.4:1 and closer to square, restShiftWide at 1.7:1 and wider.
      const restShift = lerp(openFrame.restShift, openFrame.restShiftWide, clamp((aspect - 1.4) / 0.3, 0, 1));
      const shift = (j < 0.2 ? lerp(restShift, 0.4, smoother(k)) : lerp(0.4, 0.2, (j - 0.2) / 0.8)) * halfHeightAtTarget * aspect;
      camera.position.addScaledVector(rightVector, -shift);
      lookTarget.addScaledVector(rightVector, -shift);
    } else {
      // Narrow screens stack them, so drop the relief below the copy instead.
      // Moving the camera along screen-up pushes the subject down the frame.
      screenUp.crossVectors(rightVector, forward).normalize();
      // At rest the country stands in the upper frame, above the name and the lede; as the copy fades it settles below the captions.
      const k = smoother(clamp(j / 0.2, 0, 1));
      const drop = (j < 0.2 ? lerp(-0.32, 0.4, k) : lerp(0.4, 0.3, (j - 0.2) / 0.8)) * halfHeightAtTarget;
      camera.position.addScaledVector(screenUp, drop);
      lookTarget.addScaledVector(screenUp, drop);
    }
    camera.lookAt(lookTarget);

    // The hand-off to the sheet: straight down, north up, at the sheet's scale.
    const flat = applySheet();

    sky.position.copy(camera.position);

    if (region) {
      // The lamp, on its spring (stepLamp); the sky light is the blue hour's until the lamp has risen.
      placeLamp();
      key.position.copy(keyBase);
      keyTo.copy(keyBase);
      key.color.copy(lampColor);
      const risen = emergence >= 1 ? 1 : smoother(clamp(emergence / 0.9, 0, 1));
      hemi.intensity = lerp(0.3, lerp(openFrame.hemi, openFrame.hemi * 1.12, j), risen);
      key.intensity = openFrame.key;
    } else {
      keyBase.lerpVectors(KEY_AT, KEY_LOW, smoother(clamp((j - 0.15) / 0.75, 0, 1)));
      if (relief) key.color.copy(KEY_COOL).lerp(KEY_WARM, smoother(clamp((j - 0.3) / 0.6, 0, 1)));
      hemi.intensity = relief ? lerp(0.95, 1.35, j) : 1.7;
    }

    // Atmosphere: cold and empty out in the dark, warming as the ground rises.
    skyMaterial.uniforms.uTop.value.copy(SKY_SPACE.top).lerp(SKY_GROUND.top, j);
    skyMaterial.uniforms.uHorizon.value.copy(SKY_SPACE.horizon).lerp(SKY_GROUND.horizon, j);
    skyMaterial.uniforms.uBottom.value.copy(SKY_SPACE.bottom).lerp(SKY_GROUND.bottom, j);
    if (region && regionUniforms) {
      seaMaterial.color.setRGB(0, 0, 0);
      regionUniforms.uWaterDeep.value.copy(WATER_DEEP);
      regionUniforms.uWaterShallow.value.copy(WATER_SHALLOW);
    } else seaMaterial.color.copy(SEA_SPACE).lerp(SEA_GROUND, j);
    fog.color.copy(skyMaterial.uniforms.uHorizon.value);
    fog.near = lerp(distance * 0.35, 400, flat);
    fog.far = lerp(distance * 2.5, 800, flat);

    // Held low in the opening frame: the country is the subject, not the sky.
    // The motes leave as the lens closes in on the focus: out of focus, the depth-of-field pass prints each one as a
    // ring of dots. The locality's own dust, in focus, carries the air from there.
    motes.material.uniforms.uOpacity.value =
      clamp((p - 0.45) / 0.4, 0, 1) * 0.5 * (1 - smoother(clamp((p - 0.72) / 0.16, 0, 1))) * (1 - flat);
    // Laid flat, the relief is a map again, and the map's graticule returns.
    // The emergence: the front draws the outline down the country, the land
    // comes up behind it, then the graticule and the tropic settle last.
    const sweep = emergence >= 1 ? 1 : smoother(clamp(emergence / 0.82, 0, 1));
    revealUniforms.uFront.value = emergence >= 1 ? 99 : lerp(-0.3, 5.4, sweep);
    // The ground rises behind the front (per vertex, in the shaders) and lies flat again for the sheet.
    revealUniforms.uLift.value = 1 - flat;
    reliefLift = (emergence >= 1 ? 1 : smoother(clamp((emergence - 0.2) / 0.75, 0, 1))) * (1 - flat);
    const landIn = smoother(clamp((emergence - 0.3) / 0.6, 0, 1));
    const gridIn = smoother(clamp((emergence - 0.55) / 0.45, 0, 1));
    const opening = clamp(1 - p / 0.5, 0, 1);
    gridMaterial.opacity = Math.max(opening * 0.5 * gridIn, flat * 0.7);
    tropicMaterial.opacity = Math.pow(clamp(1 - p / 0.16, 0, 1), 1.4) * 0.55 * gridIn * (1 - flat);
    tropic.visible = tropicMaterial.opacity > 0.002;
    // Over the relief the state lines step back: the ground carries the picture, the lines say where it is.
    // Over the lit regional ground the lines step further back at rest: the light carries the opening.
    borderMaterial.opacity = (region ? lerp(0.17, 0.4, smoother(clamp(j / 0.4, 0, 1))) : relief ? lerp(0.3, 0.44, j) : lerp(0.5, 0.58, j)) * lerp(1.45, 1, landIn);
    // The opening frame is the country lit from one side, not an evenly grey
    // slab: the relief is held brighter at the start, the light pooled over
    // the north-west and falling away to the coasts, and it settles to its
    // working tone, evenly lit, once the camera is well into the descent.
    const opened = clamp(1 - p / 0.38, 0, 1);
    const lift = 1 + (relief ? 0.2 : 0.85) * Math.pow(opened, 1.5) * (1 - flat);
    revealUniforms.uPool.value = smoother(opened) * (1 - flat);
    landMaterial.color.setRGB(lift, lift * 0.98, lift * 0.93);

    // The plate maths and the caption projection both read the camera's
    // matrices, and `lookAt` only touches the quaternion — without this they
    // would be working from the previous frame's pose.
    camera.updateMatrixWorld(true);
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

    if (onMarks) {
      // Measured where the tropic leaves the west coast, which is where the title meets it.
      const [mx, my] = terrain.project(69, TROPIC_LAT);
      tropicMark.set(mx, my, TERRAIN_DEPTH + riseOf(mx, my) * reliefLift).project(camera);
      const y = viewWidth / viewHeight > 1.15 ? Math.round((-tropicMark.y * 0.5 + 0.5) * viewHeight * 2) / 2 : -1;
      if (y !== lastTropicY) {
        lastTropicY = y;
        onMarks(y < 0 ? null : { tropicY: y });
      }
    }

    if (onFootprint && p < 0.01) {
      const [wx, wy] = terrain.project(68.2, 22);
      const [ex, ey] = terrain.project(97.2, 22);
      footW.set(wx, wy, TERRAIN_DEPTH).project(camera);
      footE.set(ex, ey, TERRAIN_DEPTH).project(camera);
      const px = (v: number) => Math.round((v * 0.5 + 0.5) * viewWidth);
      const py = (v: number) => Math.round((-v * 0.5 + 0.5) * viewHeight);
      const at = { wx: px(footW.x), wy: py(footW.y), ex: px(footE.x), ey: py(footE.y) };
      const key = `${at.wx},${at.wy},${at.ex},${at.ey}`;
      if (key !== lastFoot) {
        lastFoot = key;
        onFootprint(at);
      }
    }

    applyMarkers(p);
    applyPlates(p, flat);
    applyProbe();
    if (endFocus) {
      const open = smoother(clamp((p - 0.82) / 0.16, 0, 1));
      focusRingMaterial.opacity = open * 0.8;
      for (const { ring, r } of focusRings) {
        ring.scale.setScalar(r * (0.4 + 0.6 * open));
        ring.position.z = TERRAIN_DEPTH + focusRise * reliefLift + 0.002;
      }
      if (AIR_COUNT) {
        const k = clamp((p - 0.78) / 0.17, 0, 1);
        air.material.uniforms.uOpacity.value = smoother(k) * (atmosphere === 'dust' ? 0.6 : 0.7) * (1 - flat);
        // Carried a little by the descent itself: dust drifts across, snow settles.
        const drift = clamp((p - 0.78) / 0.22, 0, 1);
        if (atmosphere === 'dust') air.points.position.set(drift * 0.07, drift * 0.02, 0);
        else air.points.position.set(drift * 0.015, 0, -drift * 0.12);
      }
    }

    if (post) {
      tintColor.copy(TINT_SPACE).lerp(TINT_GROUND, j);
      post.apply({
        focus: lerp(distance, camera.position.z, flat),
        // A tight focal range at the end is what separates the near ridge from
        // the far country; wide open at the start so the whole map reads sharp.
        // Laid flat for the sheet, everything is in focus again.
        focusRange: lerp(lerp(90, 6, j), 400, flat),
        maxCoc: lerp(0.0015, 0.0038, j) * (1 - flat),
        bloom: lerp(0.45, 0.5, j),
        vignette: lerp(lerp(0.32, 0.5, j), 0.12, flat),
        tint: tintColor,
        saturation: region ? lerp(openFrame.saturation, 0.84, j) : lerp(0.6, 0.86, j),
        // Contrast pivots on mid-grey in linear light, so much above this crushes the ground's shadows to black.
        contrast: region ? 1 : lerp(1.02, relief ? 1.06 : 1.12, j),
        lift: region ? 0 : lerp(0.004, 0, j),
        // Down the descent the ground comes closer and fills the frame with lit plain: exposed a little lower.
        exposure: region ? openFrame.exposure * lerp(1, 0.8, j) : 1,
      });
    }
  }

  /** Reveals, scales and pulses each marker as the journey reaches its region. */
  function applyMarkers(p: number) {
    quaternion.identity();
    for (let i = 0; i < markerCount; i++) {
      const m = markerBase[i];
      const t = clamp((p - m.revealAt) / REVEAL_DURATION, 0, 1);
      const grow = t <= 0 ? 0 : easeOutBack(t);
      // A single bright flash as the marker arrives, which the bloom turns
      // into a genuine burst before it settles to its steady glow.
      const pulse = t > 0 && t < 1 ? Math.sin(Math.PI * t) : 0;
      const ground = TERRAIN_DEPTH + m.rise * reliefLift;
      const z = ground + m.height * Math.max(grow, 0);

      position.set(m.x, m.y, z);
      scaleVec.setScalar(Math.max(grow, 0));
      matrix.compose(position, quaternion, scaleVec);
      markers.setMatrixAt(i, matrix);

      scaleVec.setScalar(Math.max(grow, 0) * (2.4 + pulse * 1.8));
      matrix.compose(position, quaternion, scaleVec);
      halos.setMatrixAt(i, matrix);

      // Colours run well past 1.0 on purpose: the bright-pass thresholds at
      // exactly 1.0, so this is what makes the bloom pick out markers only.
      const intensity = (2.0 + pulse * 2.2) * (0.3 + 0.7 * t);
      instanceColor.setRGB(m.color.r * intensity, m.color.g * intensity, m.color.b * intensity);
      markers.setColorAt(i, instanceColor);
      instanceColor.setRGB(m.color.r * 0.55, m.color.g * 0.55, m.color.b * 0.55);
      halos.setColorAt(i, instanceColor);

      stemVertices[i * 6 + 2] = ground;
      stemVertices[i * 6 + 5] = z;
    }
    markers.instanceMatrix.needsUpdate = true;
    halos.instanceMatrix.needsUpdate = true;
    if (markers.instanceColor) markers.instanceColor.needsUpdate = true;
    if (halos.instanceColor) halos.instanceColor.needsUpdate = true;
    stemPosition.needsUpdate = true;
    stemMaterial.opacity = clamp((p - firstReveal) / 0.3, 0, 1) * 0.65;
  }

  /**
   * Sizes, places and fades each species plate, and reports where its caption
   * should sit on screen.
   */
  function applyPlates(p: number, flat = 0) {
    const halfFovTan = Math.tan((camera.fov * Math.PI) / 360);

    for (let i = 0; i < plateCount; i++) {
      const plate = plateBase[i];
      const since = p - plate.revealAt;
      const rise = clamp(since / PLATE_FADE_IN, 0, 1);
      const leaving = clamp((since - PLATE_FADE_IN - PLATE_HOLD) / PLATE_FADE_OUT, 0, 1);
      const alpha = rise * (1 - leaving) * (1 - flat);
      const grow = easeOutCubic(rise);

      plateAnchor.set(plate.x, plate.y, TERRAIN_DEPTH + plate.rise * reliefLift);
      const distance = Math.max(camera.position.distanceTo(plateAnchor), CAMERA_NEAR);
      const apparent = clamp(
        PLATE_APPARENT * Math.pow(distance / PLATE_REF_DISTANCE, -PLATE_FALLOFF),
        PLATE_APPARENT_MIN,
        PLATE_APPARENT_MAX,
      );
      const scale = apparent * distance * halfFovTan;

      // The lift is applied in *view* space, not world space. Lifting along
      // world +z looks right only while the camera is level; looking steeply
      // down at the opening of the journey it pushes the card towards the
      // viewer instead of up the frame, and the plate ends up adrift in the
      // sky a long way from the country it belongs to. Offsetting along the
      // view's own vertical axis instead stands every plate directly on its
      // locality whatever the camera is doing.
      plateView.copy(plateAnchor).applyMatrix4(camera.matrixWorldInverse);
      const behind = plateView.z > -CAMERA_NEAR;
      const lift = scale * lerp(PLATE_RISE_FROM, PLATE_RISE_TO, grow);

      // Caption anchor: the middle of the plate's bottom edge.
      plateProjected
        .set(plateView.x, plateView.y + lift - scale, plateView.z)
        .applyMatrix4(camera.projectionMatrix);
      labelLayout[i * 3] = (plateProjected.x * 0.5 + 0.5) * viewWidth;
      labelLayout[i * 3 + 1] = (-plateProjected.y * 0.5 + 0.5) * viewHeight;
      // The caption fades on a steeper curve than the plate. Two plates can be
      // on screen together during a handover, but only one of their captions
      // is ever at full strength, so the text never reads as a stack.
      labelLayout[i * 3 + 2] = behind ? 0 : alpha * alpha;

      plateView.y += lift;
      plateView.applyMatrix4(camera.matrixWorld);
      plateOffsets[i * 3] = plateView.x;
      plateOffsets[i * 3 + 1] = plateView.y;
      plateOffsets[i * 3 + 2] = plateView.z;
      plateScales[i] = scale;
      plateAlphas[i] = alpha;
    }

    plateOffsetAttribute.needsUpdate = true;
    plateScaleAttribute.needsUpdate = true;
    plateAlphaAttribute.needsUpdate = true;
    onLabels?.(labelLayout);
  }

  /**
   * Blends the camera from its scroll pose to the sheet's: straight down over
   * the framing's centre, north up, with a narrow field of view so the ground
   * plane maps to the screen exactly as the journey's 2D sheet will draw it.
   * Returns the blend (0 when there is no hand-off).
   */
  function applySheet(): number {
    const cam = sheet.cam;
    const e = sheet.t;
    if (!cam || e <= 0) return 0;
    const [lng, lat] = unproject(cam.x, cam.y);
    const [cx, cy] = terrain.project(lng, lat);
    const [lng1, lat1] = unproject(cam.x + 10, cam.y);
    const [ex] = terrain.project(lng1, lat1);
    const perUnit = Math.abs(ex - cx) / 10;
    const visibleH = cam.w * (viewHeight / viewWidth) * perUnit;
    const d = visibleH / (2 * Math.tan((SHEET_FOV * Math.PI) / 360));
    sheetPos.set(cx, cy, TERRAIN_DEPTH + d);
    camera.position.lerp(sheetPos, e);
    camera.quaternion.slerp(sheetQuat, e);
    camera.fov = lerp(camera.fov, SHEET_FOV, e);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    return e;
  }

  /**
   * The probe: finds the ground under the hand, snaps to a lit locality
   * within reach on screen, and places the ring at a constant screen size.
   * The key light turns a little towards the hand, so the walls of the relief
   * and the water catch it — a raking light, not a spotlight.
   */
  function applyProbe() {
    const flat = sheet.t;
    if (probeIn.on && flat < 0.01) {
      ndc.set(probeIn.x, -probeIn.y);
      ray.setFromCamera(ndc, camera);
      const ok = intersectGround();
      // Only the sheet's own extent is read: off it there is nothing the atlas measures.
      const [hLng, hLat] = ok ? worldToLngLat(hit.x, hit.y) : [0, 0];
      if (ok && hLng >= 68 && hLng <= 97.5 && hLat >= 6.5 && hLat <= 37.2) {
        // Snap to the nearest lit locality within 34 px.
        let best = -1;
        let bestD = 34 * 34;
        for (let i = 0; i < markerCount; i++) {
          const m = markerBase[i];
          if (current.progress < m.revealAt + REVEAL_DURATION * 0.6) continue;
          plateProjected.set(m.x, m.y, TERRAIN_DEPTH + m.rise * reliefLift).project(camera);
          if (plateProjected.z > 1) continue;
          const dx = (plateProjected.x - probeIn.x) * 0.5 * viewWidth;
          const dy = (-plateProjected.y - probeIn.y) * 0.5 * viewHeight;
          const d2 = dx * dx + dy * dy;
          if (d2 < bestD) {
            bestD = d2;
            best = i;
          }
        }
        const gx = best >= 0 ? markerBase[best].x : hit.x;
        const gy = best >= 0 ? markerBase[best].y : hit.y;
        const dist = camera.position.distanceTo(hit);
        const pxWorld = (2 * dist * Math.tan((camera.fov * Math.PI) / 360)) / viewHeight;
        probeTo.x = gx;
        probeTo.y = gy;
        // Free, it is the reticle's footprint on the ground: wide and faint.
        // Closed on a locality, it tightens and takes the species' colour.
        probeTo.r = pxWorld * (best >= 0 ? 11 : 26);
        probeTo.alpha = best >= 0 ? 0.95 : 0.32;
        if (best !== probeAt.snapped) {
          probeAt.snapped = best;
          probeColor.copy(best >= 0 ? markerBase[best].color : probeIdle);
          probeMaterial.color.copy(probeColor);
          probeTickMaterial.color.copy(probeColor);
        }
        if (!probeAt.set) {
          probeAt.set = true;
          probeAt.x = gx;
          probeAt.y = gy;
          probeAt.r = probeTo.r * 1.6;
        }
        if (!region) keyTo.set(keyBase.x + (gx - lookTarget.x) * 1.4, keyBase.y + (gy - lookTarget.y) * 1.4, keyBase.z);
        if (onProbe) {
          const [lng, lat] = worldToLngLat(gx, gy);
          plateProjected.set(gx, gy, TERRAIN_DEPTH + riseOf(gx, gy) * reliefLift).project(camera);
          onProbe({
            lng,
            lat,
            // Read from the full grid (India's 3′, or the region's 4′), not the coarser mesh the ground is drawn with.
            // The regional grid is signed (the sea floor below 0); India's own is clamped at the coast.
            metres: reliefGrid ? (region ? gridMetresAt(reliefGrid, lng, lat) : Math.max(0, gridMetresAt(reliefGrid, lng, lat))) : null,
            snapped: best,
            x: (plateProjected.x * 0.5 + 0.5) * viewWidth,
            y: (-plateProjected.y * 0.5 + 0.5) * viewHeight,
          });
        }
      } else {
        probeTo.alpha = 0;
        onProbe?.(null);
      }
    } else {
      probeTo.alpha = 0;
      keyTo.copy(keyBase);
    }
    probe.position.set(probeAt.x, probeAt.y, TERRAIN_DEPTH + riseOf(probeAt.x, probeAt.y) * reliefLift + 0.003);
    probe.scale.setScalar(Math.max(probeAt.r, 1e-4));
    probeMaterial.opacity = probeAt.alpha;
    probeTickMaterial.opacity = probeAt.alpha * 0.8;
    probe.visible = probeAt.alpha > 0.01;
  }

  /**
   * Where the ray from the camera through the hand first meets the ground as
   * it stands now, written into `hit`: marched down from the summits' height
   * to the plinth, then refined by bisection. Without the relief, the plinth's
   * plane.
   */
  function intersectGround(): boolean {
    const o = ray.ray.origin;
    const d = ray.ray.direction;
    if (!relief || reliefLift < 0.01) return ray.ray.intersectPlane(groundPlane, hit) !== null;
    if (d.z > -1e-4) return false;
    const groundZ = (v: THREE.Vector3) => TERRAIN_DEPTH + riseOf(v.x, v.y) * reliefLift;
    const t0 = Math.max(0, (TERRAIN_DEPTH + peakRise * reliefLift - o.z) / d.z);
    const t1 = (TERRAIN_DEPTH - o.z) / d.z;
    if (t1 <= 0) return false;
    const steps = 64;
    let previous = t0;
    for (let k = 1; k <= steps; k++) {
      const t = t0 + ((t1 - t0) * k) / steps;
      marchAt.copy(d).multiplyScalar(t).add(o);
      if (marchAt.z <= groundZ(marchAt)) {
        let lo = previous;
        let hi = t;
        for (let b = 0; b < 8; b++) {
          const mid = (lo + hi) / 2;
          marchAt.copy(d).multiplyScalar(mid).add(o);
          if (marchAt.z <= groundZ(marchAt)) hi = mid;
          else lo = mid;
        }
        hit.copy(d).multiplyScalar(hi).add(o);
        return true;
      }
      previous = t;
    }
    hit.copy(d).multiplyScalar(t1).add(o);
    return true;
  }

  /** Eases the probe towards its target; true while it is still moving. */
  function stepProbe(dt: number): boolean {
    let moving = false;
    for (const axis of ['x', 'y', 'r', 'alpha'] as const) {
      const delta = probeTo[axis] - probeAt[axis];
      if (Math.abs(delta) > (axis === 'alpha' ? 0.004 : 1e-5)) {
        probeAt[axis] = damp(probeAt[axis], probeTo[axis], PROBE_LAMBDA, dt);
        moving = true;
      } else probeAt[axis] = probeTo[axis];
    }
    if (!moving && probeTo.alpha === 0) probeAt.set = false;
    if (key.position.distanceToSquared(keyTo) > 1e-5) {
      key.position.lerp(keyTo, 1 - Math.exp(-KEY_LAMBDA * dt));
      moving = true;
    }
    return moving;
  }

  /** Moves the lamp along its springs towards where the scroll, the emergence and the hand put it. True while it moves. */
  function stepLamp(dt: number): boolean {
    if (!region || act !== 'hero') return false;
    const p = current.progress;
    const j = 0.85 * p + 0.15 * smoother(p);
    const down = smoother(clamp((j - 0.1) / 0.8, 0, 1));
    const reach = 1 - 0.75 * smoother(clamp(j / 0.5, 0, 1));
    const rise = emergence >= 1 ? 1 : smoother(clamp(emergence / 0.85, 0, 1));
    const toAz = lerp(LAMP_REST.az, LAMP_LOW.az, down) + current.px * LAMP_REACH_AZ * reach + (1 - rise) * LAMP_DAWN_SWING;
    const toEl = lerp(LAMP_DAWN_EL, lerp(LAMP_REST.el, LAMP_LOW.el, down), rise) + current.py * LAMP_REACH_EL * reach * rise;
    lamp.az.target = toAz;
    lamp.el.target = toEl;
    const az = lamp.az.step(dt);
    const el = lamp.el.step(dt);
    return az || el;
  }

  /** The lamp's direction (towards it) and colour: an ember at the horizon, warm while low, the plain key once up. */
  function placeLamp() {
    const az = lamp.az.value;
    const el = lamp.el.value;
    const ce = Math.cos(el);
    keyBase.set(Math.sin(az) * ce, Math.cos(az) * ce, Math.sin(el)).multiplyScalar(5);
    lampColor.copy(LAMP_EMBER).lerp(KEY_WARM, smoother(clamp((el + 2 * DEG) / (11 * DEG), 0, 1)));
    lampColor.lerp(KEY_COOL, smoother(clamp((el - 15 * DEG) / (14 * DEG), 0, 1)));
  }

  function renderFrame() {
    revealUniforms.uRiseFront.value = region ? 99 : revealUniforms.uFront.value;
    if (reliefLight) {
      lampDir.copy(key.position).normalize();
      reliefLight.update(lampDir);
      regionUniforms!.uLampColor.value.copy(key.color);
    }
    // Development only: count the whole frame (scene and post passes), not just its last draw.
    if (import.meta.env.DEV) {
      renderer.info.autoReset = false;
      renderer.info.reset();
    }
    if (post) post.render(scene, camera);
    else {
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    }
  }

  function draw(now: number) {
    frame = 0;
    if (disposed) return;
    governor.sample(now);

    // Damped by time, not by frame, so the camera is as heavy at 120 Hz as at 60.
    const dt = lastDrawAt ? Math.min((now - lastDrawAt) / 1000, 1 / 20) : 1 / 60;
    lastDrawAt = now;
    let moving = false;
    for (const axis of POSE_AXES) {
      const delta = target[axis] - current[axis];
      if (Math.abs(delta) > 0.0002) {
        current[axis] = damp(current[axis], target[axis], POSE_LAMBDA, dt);
        moving = true;
      } else {
        current[axis] = target[axis];
      }
    }

    if (emergeFrom >= 0 && emergence < 1) {
      emergence = Math.min(1, (now - emergeFrom) / EMERGE_MS);
      moving = true;
    }
    if (act === 'atlas' && stepAtlas(dt)) moving = true;
    if (stepLamp(dt)) moving = true;
    applyPose();
    if (stepProbe(dt)) moving = true;
    renderFrame();

    if (!firstFrameSent) {
      firstFrameSent = true;
      onFirstFrame?.();
    }
    continuing = moving;
    if (moving) invalidate();
  }

  function invalidate() {
    if (disposed || !active || frame) return;
    // A frame that resumes an idle scene is preceded by an arbitrarily long
    // pause, which says nothing about how fast this device renders.
    if (!continuing) {
      governor.reset();
      lastDrawAt = 0;
    }
    continuing = false;
    frame = requestAnimationFrame(draw);
  }

  // Development only: what the frame costs, for the console and the audit scripts.
  if (import.meta.env.DEV) {
    (window as unknown as { __heroScene?: unknown }).__heroScene = {
      info: () => ({ ...renderer.info.render, ...renderer.info.memory, programs: renderer.info.programs?.length }),
      mesh: relief?.stats ?? null,
      rung: () => governor.rung,
      windows: () => [...governor.windows],
      ratio: () => renderer.getPixelRatio(),
      act: () => act,
      /** Live art direction from the audit scripts: mutate the opening, the lamp and the region's uniforms, then redraw. */
      tune: (fn: (t: Record<string, unknown>) => void) => {
        fn({ OPENING: openFrame, LAMP_REST, LAMP_LOW, regionUniforms, reliefUniforms, hemi, key, rim, landMaterial, seaMaterial, fog, lamp, post, reliefLight, renderer, relief, THREE, renderFrame, land, borders, sea, grid, scene });
        invalidate();
      },
    };
  }

  return {
    setAct(next) {
      if (next === act) return;
      act = next;
      // The first frames of an act build and compile what it shows; they say nothing about this device's frame rate.
      governor.reset(20);
      if (act === 'hero') leaveAtlas();
      else {
        // Arriving in the act: start from where the chapters already are, not from the dark.
        Object.assign(atlasAt, atlasTo);
        buildAtlas();
      }
      invalidate();
    },
    setAtlas(state) {
      let changed = false;
      for (const axis of ATLAS_AXES) {
        const v = state[axis];
        if (v === undefined) continue;
        const next = clamp(v, 0, 1);
        if (Math.abs(next - atlasTo[axis]) > 0.0002) {
          atlasTo[axis] = next;
          changed = true;
        }
      }
      if (changed && act === 'atlas') invalidate();
    },
    setTrace(trace) {
      const ids = world?.species.map((x) => x.id) ?? [];
      for (let i = 0; i < ids.length; i++) hiTo[i] = trace?.species.has(ids[i]) ? 1 : 0;
      dimTo = trace && (trace.species.size > 0 || trace.programmes.size > 0) ? 1 : 0;
      traceSites = trace && trace.programmes.size > 0 ? trace.programmes : null;
      if (act === 'atlas') invalidate();
    },
    prepareAtlas() {
      if (!world || atlas) return;
      const idle = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 300));
      idle(
        () => {
          const layers = buildAtlas();
          if (!layers || disposed || act === 'atlas') return;
          // Draw one frame of the act now, while nothing is moving, through the real post chain, with everything it can
          // show switched on — so every program it needs is compiled for the target it will be drawn into — then the
          // descent's frame again. Both land in the same task, so only the second is ever presented.
          const saved = { ...atlasAt };
          Object.assign(atlasAt, { arrive: 1, frag: 0.5, prot: 0.5, close: 0.2, remain: 0.5, sink: 0 });
          act = 'atlas';
          applyAtlasPose();
          for (const l of [...layers.threads, ...layers.lines]) {
            l.mesh.visible = true;
            l.material.uniforms.uOpacity.value = 0.5;
            l.material.uniforms.uDraw.value = 1;
          }
          layers.centre.visible = true;
          renderFrame();
          act = 'hero';
          Object.assign(atlasAt, saved);
          leaveAtlas();
          applyPose();
          renderFrame();
        },
        { timeout: 3000 },
      );
    },
    setProgress(p) {
      const next = clamp(p, 0, 1);
      if (Math.abs(next - target.progress) < 0.0002) return;
      target.progress = next;
      invalidate();
    },
    setPointer(x, y) {
      target.px = clamp(x, -1, 1);
      target.py = clamp(y, -1, 1);
      invalidate();
    },
    setMomentum(v) {
      const next = clamp(v, 0, 1);
      if (Math.abs(next - target.mv) < 0.004) return;
      target.mv = next;
      invalidate();
    },
    setProbe(x, y) {
      if (x === null) {
        if (!probeIn.on) return;
        probeIn.on = false;
        onProbe?.(null);
      } else {
        probeIn.on = true;
        probeIn.x = clamp(x, -1, 1);
        probeIn.y = clamp(y, -1, 1);
      }
      invalidate();
    },
    toSheet(cam, t) {
      sheet.cam = cam;
      sheet.t = clamp(t, 0, 1);
      if (sheet.t > 0 && probeIn.on) {
        probeIn.on = false;
        onProbe?.(null);
      }
      invalidate();
    },
    setActive(next) {
      active = next;
      governor.reset();
      continuing = false;
      if (next) invalidate();
      else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    resize(width, height) {
      if (disposed || width <= 0 || height <= 0) return;
      viewWidth = width;
      viewHeight = height;
      applySize();
      if (!warmed) {
        warmed = true;
        post?.warmUp();
      }
      governor.reset();
      applyPose();
      renderFrame();
    },
    reveal() {
      if (emergeFrom >= 0 || emergence >= 1) return;
      emergeFrom = performance.now();
      invalidate();
    },
    dispose() {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      if (atlas) {
        for (const l of [...atlas.threads, ...atlas.lines]) {
          l.geometry.dispose();
          l.material.dispose();
        }
        atlas.sites.dispose();
        atlas.siteGeometry.dispose();
        atlas.siteMaterial.dispose();
        atlas.centreGeometry.dispose();
        atlas.centreMaterial.dispose();
        atlas.protTexture?.dispose();
        atlas = null;
      }
      blankTexture.dispose();
      terrain.land.dispose();
      terrain.walls?.dispose();
      terrain.borders.dispose();
      terrain.relief?.dispose();
      wallMaterial.dispose();
      focusRingGeometry.dispose();
      probeRingGeometry.dispose();
      probeTickGeometry.dispose();
      probeMaterial.dispose();
      probeTickMaterial.dispose();
      focusRingMaterial.dispose();
      gridGeometry.dispose();
      tropicGeometry.dispose();
      tropicMaterial.dispose();
      seaGeometry.dispose();
      seaMaterial.dispose();
      skyGeometry.dispose();
      stemGeometry.dispose();
      markerGeometry.dispose();
      haloGeometry.dispose();
      motes.geometry.dispose();
      motes.material.dispose();
      air.geometry.dispose();
      air.material.dispose();
      landMaterial.dispose();
      borderMaterial.dispose();
      gridMaterial.dispose();
      skyMaterial.dispose();
      stemMaterial.dispose();
      markerMaterial.dispose();
      haloMaterial.dispose();
      markers.dispose();
      halos.dispose();
      plateQuad.dispose();
      plateGeometry.dispose();
      plateMaterial.dispose();
      plateTexture.dispose();
      post?.dispose();
      reliefLight?.dispose();
      renderer.dispose();
    },
  };
}
