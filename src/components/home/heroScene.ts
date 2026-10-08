/**
 * Hero 3D scene — a scroll-driven camera journey over a relief of India,
 * generated at runtime from the same `india-states.geojson` the atlas map
 * ships and the occurrence points in the atlas dataset.
 *
 * The journey runs from an orbital view against a starfield down to a low pass
 * over the peninsula, revealing species markers in a north-to-south sweep as
 * the camera descends. Terrain lives in `heroTerrain.ts`; bloom, depth of
 * field, vignette and the colour grade live in `heroPost.ts`.
 *
 * This module is framework-agnostic on purpose; `HeroScrollScene.tsx` owns the
 * React lifecycle, the scroll listener and the capability checks — including
 * `prefers-reduced-motion`, which is handled by never constructing this scene
 * at all rather than by animating it more gently.
 */
import * as THREE from 'three';
import { damp, perFrame } from '../../interaction/spring';
import { FrameGovernor, pixelRatio } from '../../world/quality';
import { makePointCloud, particleBudget, seededRandom } from '../../world/gl/particles';
import { buildTerrain, TERRAIN_DEPTH, type GeoCollection } from './heroTerrain';
import { createPostChain, type PostQuality } from './heroPost';
import { buildPlateAtlas, PLATE_CELL, PLATE_COLUMNS } from './heroPlates';
import { unproject } from '../../geo/india';
import type { GeoCam } from '../../world/geoCamera';

export type { GeoCollection } from './heroTerrain';

/** One species occurrence marker, coloured by IUCN category. */
export interface HeroPoint {
  lng: number;
  lat: number;
  /** Literal hex, e.g. from `STATUS_HEX`. */
  color: string;
  /** Scroll progress, 0-1, at which this marker starts to appear. */
  revealAt: number;
}

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
   * What the probe reads: the ground's coordinates under the hand, the lit
   * locality it has snapped to (an index into `points`, or −1), and where
   * the probe sits in the frame. Null when the probe is off the land.
   */
  onProbe?: (reading: { lng: number; lat: number; snapped: number; x: number; y: number } | null) => void;
  /**
   * Called when the device cannot hold a usable frame rate even after the
   * scene has stepped its own quality all the way down. The caller should
   * unmount the scene and show the flat artwork instead.
   */
  onTooSlow?: () => void;
}

export interface HeroScene {
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
  dispose: () => void;
}

/* --- palette (kept in sync with src/theme.ts) --- */
const LAND_TOP_HEX = '#2a3a30';
const LAND_SIDE_HEX = '#0c120f';
const BORDER_HEX = '#e8e1cf';
const GRID_HEX = '#3a4640';

/** Height the occurrence markers stand above the surface. */
const STEM = 0.115;

/**
 * The camera journey, as a pair of endpoints per channel.
 *
 * Distance is interpolated geometrically rather than linearly, so the approach
 * feels like a constant rate of descent instead of racing in and then crawling.
 */
const START_DISTANCE = 24;
const END_DISTANCE = 2.35;
const START_PITCH = 1.24;
const END_PITCH = 0.26;
const START_YAW = -1.66;
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

export function createHeroScene(options: HeroSceneOptions): HeroScene {
  const { canvas, geojson, points, plates, onFirstFrame, onTooSlow, onLabels, onProbe, endFocus, atmosphere } = options;

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

  const terrain = buildTerrain(geojson, LAND_TOP_HEX, LAND_SIDE_HEX);
  // The journey's last target: the focus locality if one is given, standing on
  // the relief's surface, or the default point over the peninsula.
  const focusTarget = TARGET_END.clone();
  if (endFocus) {
    const [fx, fy] = terrain.project(endFocus.lng, endFocus.lat);
    focusTarget.set(fx, fy, TERRAIN_DEPTH);
  }
  const endDistance = endFocus ? FOCUS_DISTANCE : END_DISTANCE;
  const endPitch = endFocus ? FOCUS_PITCH : END_PITCH;


  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(START_FOV, 1, CAMERA_NEAR, CAMERA_FAR);
  camera.up.set(0, 0, 1);

  const fog = new THREE.Fog(0x08120e, 10, 60);
  scene.fog = fog;

  const landMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.02,
  });
  const land = new THREE.Mesh(terrain.land, landMaterial);
  scene.add(land);

  // A sea for the relief to stand in. Without it the extruded landmass reads
  // as a cut-out sheet floating in the dark once the camera drops low enough
  // to see its underside. Its colour tracks the sky, so out at the start of
  // the journey it is indistinguishable from empty space and only resolves
  // into a surface as the horizon warms.
  const seaMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0, 0, 0),
    roughness: 0.42,
    metalness: 0.35,
    depthWrite: false,
  });
  const seaGeometry = new THREE.PlaneGeometry(90, 90);
  const sea = new THREE.Mesh(seaGeometry, seaMaterial);
  sea.position.z = 0.004;
  // The sea writes no depth. Looking steeply down at the start of the journey
  // it covers the whole frame, and with depth writes on it culled every star
  // behind it. Stars have faded out entirely by the time the camera is low
  // enough for anything to show through the water.
  sea.renderOrder = -1;
  scene.add(sea);
  const SEA_SPACE = new THREE.Color(0.002, 0.005, 0.010);
  const SEA_GROUND = new THREE.Color(0.030, 0.062, 0.068);

  const borderMaterial = new THREE.LineBasicMaterial({
    color: new THREE.Color(BORDER_HEX),
    transparent: true,
    opacity: 0.34,
    fog: false,
  });
  const borders = new THREE.LineSegments(terrain.borders, borderMaterial);
  scene.add(borders);

  // A faint graticule, echoing the flat atlas artwork. It belongs to the
  // map-like opening and is faded out as the camera drops into the terrain.
  const gridVertices: number[] = [];
  const gw = 2.6;
  const gh = 2.1;
  for (let i = -4; i <= 4; i++) gridVertices.push(-gw, (i / 4) * gh, -0.35, gw, (i / 4) * gh, -0.35);
  for (let i = -5; i <= 5; i++) gridVertices.push((i / 5) * gw, -gh, -0.35, (i / 5) * gw, gh, -0.35);
  const gridGeometry = new THREE.BufferGeometry();
  gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridVertices, 3));
  const gridMaterial = new THREE.LineBasicMaterial({
    color: new THREE.Color(GRID_HEX),
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
  sky.renderOrder = -2;
  scene.add(sky);

  const SKY_SPACE = {
    top: new THREE.Color(0.003, 0.006, 0.020),
    horizon: new THREE.Color(0.016, 0.032, 0.058),
    bottom: new THREE.Color(0.002, 0.004, 0.010),
  };
  const SKY_GROUND = {
    top: new THREE.Color(0.005, 0.016, 0.022),
    horizon: new THREE.Color(0.052, 0.032, 0.016),
    bottom: new THREE.Color(0.004, 0.011, 0.009),
  };

  /* ----------------------------------------------------------- stars & motes */

  const random = seededRandom(20260906);
  const STAR_COUNT = particleBudget(1400);
  const starPositions = new Float32Array(STAR_COUNT * 3);
  const starSizes = new Float32Array(STAR_COUNT);
  const starAlphas = new Float32Array(STAR_COUNT);
  for (let i = 0; i < STAR_COUNT; i++) {
    // Even distribution over a spherical shell.
    const u = random() * 2 - 1;
    const theta = random() * Math.PI * 2;
    const r = 44 + random() * 15;
    const s = Math.sqrt(1 - u * u);
    starPositions[i * 3] = r * s * Math.cos(theta);
    starPositions[i * 3 + 1] = r * s * Math.sin(theta);
    starPositions[i * 3 + 2] = r * u;
    starSizes[i] = 1.5 + random() * 2.9;
    starAlphas[i] = 0.35 + random() * 0.65;
  }
  const stars = makePointCloud(starPositions, starSizes, starAlphas, '#cfe0ff', dpr);
  scene.add(stars.points);

  const MOTE_COUNT = particleBudget(220);
  const motePositions = new Float32Array(MOTE_COUNT * 3);
  const moteSizes = new Float32Array(MOTE_COUNT);
  const moteAlphas = new Float32Array(MOTE_COUNT);
  for (let i = 0; i < MOTE_COUNT; i++) {
    motePositions[i * 3] = (random() * 2 - 1) * 2.2;
    motePositions[i * 3 + 1] = (random() * 2 - 1) * 2.4;
    motePositions[i * 3 + 2] = 0.06 + random() * 1.1;
    moteSizes[i] = 1.1 + random() * 2.6;
    moteAlphas[i] = 0.2 + random() * 0.6;
  }
  const motes = makePointCloud(motePositions, moteSizes, moteAlphas, '#e8c79a', dpr);
  scene.add(motes.points);

  /* ---------------------------------------------------------------- markers */

  const markerCount = points.length;
  // Markers are small on screen even at the closest pass, so the sphere
  // tessellation stays coarse — at (10, 8) the markers alone would cost as
  // many triangles as the entire landmass.
  const markerGeometry = new THREE.SphereGeometry(0.015, 8, 6);
  const haloGeometry = new THREE.SphereGeometry(0.015, 6, 4);
  const markerMaterial = new THREE.MeshBasicMaterial({ toneMapped: false, fog: false });
  const markers = new THREE.InstancedMesh(markerGeometry, markerMaterial, markerCount);
  markers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  markers.frustumCulled = false;

  const haloMaterial = new THREE.MeshBasicMaterial({
    toneMapped: false,
    fog: false,
    transparent: true,
    opacity: 0.07,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const halos = new THREE.InstancedMesh(haloGeometry, haloMaterial, markerCount);
  halos.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  halos.frustumCulled = false;

  const stemVertices = new Float32Array(markerCount * 6);
  const stemColors = new Float32Array(markerCount * 6);
  const markerBase: Array<{
    x: number;
    y: number;
    height: number;
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

    markerBase.push({ x, y, height, revealAt, color });

    stemVertices[i * 6] = x;
    stemVertices[i * 6 + 1] = y;
    stemVertices[i * 6 + 2] = TERRAIN_DEPTH;
    stemVertices[i * 6 + 3] = x;
    stemVertices[i * 6 + 4] = y;
    stemVertices[i * 6 + 5] = TERRAIN_DEPTH + height;
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
  const AIR_COUNT = endFocus && atmosphere ? particleBudget(420) : 0;
  const airPositions = new Float32Array(AIR_COUNT * 3);
  const airSizes = new Float32Array(AIR_COUNT);
  const airAlphas = new Float32Array(AIR_COUNT);
  for (let i = 0; i < AIR_COUNT; i++) {
    const a = random() * Math.PI * 2;
    const r = Math.sqrt(random()) * 0.42;
    airPositions[i * 3] = focusTarget.x + Math.cos(a) * r;
    airPositions[i * 3 + 1] = focusTarget.y + Math.sin(a) * r;
    // Dust hangs near the ground; snow fills the column.
    const h = atmosphere === 'dust' ? random() ** 2.2 * 0.2 : random() * 0.34;
    airPositions[i * 3 + 2] = focusTarget.z + 0.004 + h;
    airSizes[i] = atmosphere === 'dust' ? 1.8 + random() * 2.6 : 1.6 + random() * 2.2;
    airAlphas[i] = 0.25 + random() * 0.5;
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
    return { x, y, revealAt: plate.revealAt };
  });

  /** Screen placement handed to the DOM captions: [x, y, alpha] per plate. */
  const labelLayout = new Float32Array(plateCount * 3);

  /* --------------------------------------------------------------- lighting */

  const hemi = new THREE.HemisphereLight(new THREE.Color('#d9d3c3'), new THREE.Color('#06090a'), 1.7);
  const key = new THREE.DirectionalLight(new THREE.Color('#fff2dc'), 2.6);
  key.position.set(-3, 2.5, 5);
  const rim = new THREE.DirectionalLight(new THREE.Color('#7ea3b5'), 0.8);
  rim.position.set(3.5, -3, 1.6);
  scene.add(hemi, key, rim);

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
  const keyBase = new THREE.Vector3(-3, 2.5, 5);
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
  const TINT_SPACE = new THREE.Color(0.86, 0.9, 0.98);
  const TINT_GROUND = new THREE.Color(1.045, 0.995, 0.925);

  let viewWidth = 1;
  let viewHeight = 1;
  let active = true;
  let frame = 0;
  let disposed = false;
  let firstFrameSent = false;
  let warmed = false;

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
    stars.material.uniforms.uPixelRatio.value = ratio;
    motes.material.uniforms.uPixelRatio.value = ratio;
    air.material.uniforms.uPixelRatio.value = ratio;
    camera.aspect = viewWidth / viewHeight;
    camera.updateProjectionMatrix();
  }

  /**
   * Places the camera for a given progress. Spherical around a target that
   * drifts south as the journey proceeds, so the descent ends over the
   * peninsula rather than the geometric centre of the country.
   */
  function applyPose() {
    const p = current.progress;
    // Mostly linear, lightly smoothed at the ends. A pure smootherstep here
    // spends the first quarter of the scroll almost stationary, which reads as
    // the effect being broken rather than as an approach.
    const j = 0.85 * p + 0.15 * smoother(p);

    // Geometric interpolation: equal *ratios* of distance per unit of scroll,
    // so the descent feels like a constant rate rather than a rush and a crawl.
    // A wide frame has room beside the copy, so the camera can come closer to the focus there.
    const finalDistance = endFocus && viewWidth / viewHeight > 1.15 ? endDistance * 0.72 : endDistance;
    const distance = START_DISTANCE * Math.pow(finalDistance / START_DISTANCE, j);
    const parallaxFalloff = 1 - 0.55 * j;
    const pitch = lerp(START_PITCH, endPitch, j) + current.py * 0.09 * parallaxFalloff;
    const yaw = lerp(START_YAW, END_YAW, easeOutCubic(p)) + current.px * 0.12 * parallaxFalloff;
    // Momentum: a fast scroll widens the lens a little, as if the camera were
    // carried by it; it narrows again as the page settles.
    const fov = lerp(START_FOV, END_FOV, j) + current.mv * 3.2;

    // Country first, region second: the target drifts towards the middle of the
    // relief for the first part of the descent and only then turns for the
    // focus, so the approach reads as narrowing in rather than a straight dive.
    if (endFocus) {
      const k = smoother(clamp((j - 0.45) / 0.55, 0, 1));
      lookTarget.copy(TARGET_START).lerp(TARGET_END, Math.min(j / 0.45, 1) * (1 - k)).lerp(focusTarget, k);
    } else {
      lookTarget.copy(TARGET_START).lerp(TARGET_END, j);
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
      // Wide screens put the copy beside the relief, so slide it right.
      const shift = lerp(0.4, 0.2, j) * halfHeightAtTarget * aspect;
      camera.position.addScaledVector(rightVector, -shift);
      lookTarget.addScaledVector(rightVector, -shift);
    } else {
      // Narrow screens stack them, so drop the relief below the copy instead.
      // Moving the camera along screen-up pushes the subject down the frame.
      screenUp.crossVectors(rightVector, forward).normalize();
      const drop = lerp(0.42, 0.3, j) * halfHeightAtTarget;
      camera.position.addScaledVector(screenUp, drop);
      lookTarget.addScaledVector(screenUp, drop);
    }
    camera.lookAt(lookTarget);

    // The hand-off to the sheet: straight down, north up, at the sheet's scale.
    const flat = applySheet();

    sky.position.copy(camera.position);

    // Atmosphere: cold and empty out in the dark, warming as the ground rises.
    skyMaterial.uniforms.uTop.value.copy(SKY_SPACE.top).lerp(SKY_GROUND.top, j);
    skyMaterial.uniforms.uHorizon.value.copy(SKY_SPACE.horizon).lerp(SKY_GROUND.horizon, j);
    skyMaterial.uniforms.uBottom.value.copy(SKY_SPACE.bottom).lerp(SKY_GROUND.bottom, j);
    seaMaterial.color.copy(SEA_SPACE).lerp(SEA_GROUND, j);
    fog.color.copy(skyMaterial.uniforms.uHorizon.value);
    fog.near = lerp(distance * 0.35, 400, flat);
    fog.far = lerp(distance * 2.5, 800, flat);

    stars.material.uniforms.uOpacity.value = clamp(1 - p / 0.58, 0, 1) * (1 - flat);
    motes.material.uniforms.uOpacity.value = clamp((p - 0.45) / 0.4, 0, 1) * 0.5 * (1 - flat);
    // Laid flat, the relief is a map again, and the map's graticule returns.
    gridMaterial.opacity = Math.max(clamp(1 - p / 0.5, 0, 1) * 0.9, flat * 0.7);
    borderMaterial.opacity = lerp(0.20, 0.58, j);

    // The plate maths and the caption projection both read the camera's
    // matrices, and `lookAt` only touches the quaternion — without this they
    // would be working from the previous frame's pose.
    camera.updateMatrixWorld(true);
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

    applyMarkers(p);
    applyPlates(p, flat);
    applyProbe();
    if (endFocus) {
      const open = smoother(clamp((p - 0.82) / 0.16, 0, 1));
      focusRingMaterial.opacity = open * 0.8;
      for (const { ring, r } of focusRings) ring.scale.setScalar(r * (0.4 + 0.6 * open));
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
        maxCoc: lerp(0.0015, 0.006, j) * (1 - flat),
        bloom: lerp(0.45, 0.5, j),
        vignette: lerp(lerp(0.32, 0.5, j), 0.12, flat),
        tint: tintColor,
        saturation: lerp(0.6, 0.86, j),
        contrast: lerp(1.02, 1.12, j),
        lift: lerp(0.004, 0, j),
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
      const z = TERRAIN_DEPTH + m.height * Math.max(grow, 0);

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

      plateAnchor.set(plate.x, plate.y, TERRAIN_DEPTH);
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
      const ok = ray.ray.intersectPlane(groundPlane, hit);
      // Only the sheet's own extent is read: off it there is nothing the atlas measures.
      const [hLng, hLat] = ok ? worldToLngLat(hit.x, hit.y) : [0, 0];
      if (ok && hLng >= 68 && hLng <= 97.5 && hLat >= 6.5 && hLat <= 37.2) {
        // Snap to the nearest lit locality within 34 px.
        let best = -1;
        let bestD = 34 * 34;
        for (let i = 0; i < markerCount; i++) {
          const m = markerBase[i];
          if (current.progress < m.revealAt + REVEAL_DURATION * 0.6) continue;
          plateProjected.set(m.x, m.y, TERRAIN_DEPTH).project(camera);
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
        keyTo.set(keyBase.x + (gx - lookTarget.x) * 1.4, keyBase.y + (gy - lookTarget.y) * 1.4, keyBase.z);
        if (onProbe) {
          const [lng, lat] = worldToLngLat(gx, gy);
          plateProjected.set(gx, gy, TERRAIN_DEPTH).project(camera);
          onProbe({
            lng,
            lat,
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
    probe.position.set(probeAt.x, probeAt.y, TERRAIN_DEPTH + 0.003);
    probe.scale.setScalar(Math.max(probeAt.r, 1e-4));
    probeMaterial.opacity = probeAt.alpha;
    probeTickMaterial.opacity = probeAt.alpha * 0.8;
    probe.visible = probeAt.alpha > 0.01;
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

  function renderFrame() {
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

  return {
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
    dispose() {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      terrain.land.dispose();
      terrain.borders.dispose();
      focusRingGeometry.dispose();
      probeRingGeometry.dispose();
      probeTickGeometry.dispose();
      probeMaterial.dispose();
      probeTickMaterial.dispose();
      focusRingMaterial.dispose();
      gridGeometry.dispose();
      seaGeometry.dispose();
      seaMaterial.dispose();
      skyGeometry.dispose();
      stemGeometry.dispose();
      markerGeometry.dispose();
      haloGeometry.dispose();
      stars.geometry.dispose();
      stars.material.dispose();
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
      renderer.dispose();
    },
  };
}
