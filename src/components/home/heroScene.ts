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
import { buildTerrain, TERRAIN_DEPTH, type GeoCollection } from './heroTerrain';
import { createPostChain, type PostQuality } from './heroPost';

export type { GeoCollection } from './heroTerrain';

/** One species occurrence marker, coloured by IUCN category. */
export interface HeroPoint {
  lng: number;
  lat: number;
  /** Literal hex, e.g. from `STATUS_HEX`. */
  color: string;
}

export interface HeroSceneOptions {
  canvas: HTMLCanvasElement;
  geojson: GeoCollection;
  points: HeroPoint[];
  /** Called after the first frame is on screen, for the fade-in. */
  onFirstFrame?: () => void;
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
  /** Pause the render loop entirely when the hero is off-screen or hidden. */
  setActive: (active: boolean) => void;
  resize: (width: number, height: number) => void;
  dispose: () => void;
}

/* --- palette (kept in sync with src/theme.ts) --- */
const LAND_TOP_HEX = '#26543e';
const LAND_SIDE_HEX = '#0d1f15';
const BORDER_HEX = '#a9dcc2';
const GRID_HEX = '#1c3a2b';

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

const CAMERA_NEAR = 0.25;
const CAMERA_FAR = 120;

/** Markers reveal across this span of the journey, swept north to south. */
const REVEAL_FROM = 0.12;
const REVEAL_SPAN = 0.46;
const REVEAL_DURATION = 0.16;

/**
 * Frame-time budget, measured while the scene is actually animating.
 *
 * Judged by the *proportion* of slow frames in a window rather than the mean.
 * A mean is hostage to single outliers, and one unavoidable outlier exists on
 * every device: the first frame that forces a driver to compile a shader can
 * take hundreds of milliseconds. Averaging that in condemns hardware that is
 * in fact perfectly capable, whereas a count only trips when frames are
 * *persistently* slow, which is the thing actually worth reacting to.
 */
const SLOW_FRAME_MS = 32;
const DEGRADE_SLOW_FRACTION = 0.45;
const ABANDON_SLOW_FRACTION = 0.6;
const SAMPLE_WINDOW = 24;
/**
 * A window also closes once this much time has accumulated. Judging purely by
 * frame count means a device rendering at 8 fps takes three seconds to fill a
 * single window and the better part of ten to reach the fallback — the exact
 * device that should get there quickest.
 */
const SAMPLE_WINDOW_MS = 700;
const BAD_WINDOWS_BEFORE_ABANDON = 2;

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
const POSE_AXES = ['progress', 'px', 'py'] as const;

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

const POINTS_VERTEX = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  uniform float uPixelRatio;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio;
  }
`;

const POINTS_FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float mask = 1.0 - smoothstep(0.14, 0.5, d);
    if (mask <= 0.001) discard;
    gl_FragColor = vec4(uColor, mask * uOpacity * vAlpha);
  }
`;

function makePointCloud(
  positions: Float32Array,
  sizes: Float32Array,
  alphas: Float32Array,
  color: string,
  pixelRatio: number,
) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
  const material = new THREE.ShaderMaterial({
    vertexShader: POINTS_VERTEX,
    fragmentShader: POINTS_FRAGMENT,
    uniforms: {
      uOpacity: { value: 1 },
      uColor: { value: new THREE.Color(color) },
      uPixelRatio: { value: pixelRatio },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return { points: new THREE.Points(geometry, material), geometry, material };
}

/** Deterministic pseudo-random, so the starfield is identical on every load. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

export function createHeroScene(options: HeroSceneOptions): HeroScene {
  const { canvas, geojson, points, onFirstFrame, onTooSlow } = options;

  /* ---------------------------------------------------------------- renderer */

  // Capped below the device ratio on purpose: the post chain blurs and blooms
  // the image anyway, so a full 2x buffer costs 78% more pixels for detail
  // that never survives to the screen.
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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

  const random = makeRandom(20260906);
  const STAR_COUNT = 2600;
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

  const MOTE_COUNT = 220;
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
    opacity: 0.15,
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

  let latMin = Infinity;
  let latMax = -Infinity;
  for (const p of points) {
    if (p.lat < latMin) latMin = p.lat;
    if (p.lat > latMax) latMax = p.lat;
  }
  const latSpan = Math.max(latMax - latMin, 1e-6);

  for (let i = 0; i < markerCount; i++) {
    const p = points[i];
    const [x, y] = terrain.project(p.lng, p.lat);
    const height = STEM * (0.82 + ((i * 37) % 11) / 26);
    // Swept north to south, matching the camera's drift down the subcontinent,
    // with a little deterministic jitter so same-latitude markers don't pop
    // in lockstep.
    const northToSouth = 1 - (p.lat - latMin) / latSpan;
    const jitter = (((i * 37) % 13) / 13) * 0.05;
    const revealAt = REVEAL_FROM + northToSouth * REVEAL_SPAN + jitter;
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

  /* --------------------------------------------------------------- lighting */

  const hemi = new THREE.HemisphereLight(new THREE.Color('#bcd9cb'), new THREE.Color('#050c08'), 1.9);
  const key = new THREE.DirectionalLight(new THREE.Color('#fff2dc'), 2.6);
  key.position.set(-3, 2.5, 5);
  const rim = new THREE.DirectionalLight(new THREE.Color('#5fb389'), 0.9);
  rim.position.set(3.5, -3, 1.6);
  scene.add(hemi, key, rim);

  /* ------------------------------------------------------------------ state */

  const target = { progress: 0, px: 0, py: 0 };
  const current = { progress: 0, px: 0, py: 0 };
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scaleVec = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const cameraOffset = new THREE.Vector3();
  const rightVector = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const screenUp = new THREE.Vector3();
  const tintColor = new THREE.Color();
  const instanceColor = new THREE.Color();
  const TINT_SPACE = new THREE.Color(0.72, 0.84, 1.06);
  const TINT_GROUND = new THREE.Color(1.045, 0.995, 0.925);

  let viewWidth = 1;
  let viewHeight = 1;
  let active = true;
  let frame = 0;
  let disposed = false;
  let firstFrameSent = false;
  let warmed = false;

  /* --- adaptive quality --- */
  let previousFrameAt = 0;
  let sampledFrames = 0;
  let sampledTime = 0;
  let slowFrames = 0;
  let level = 0;
  let badWindows = 0;
  let continuing = false;
  /**
   * Frames to ignore after a step-down or a resize. Both reallocate the render
   * targets, which is itself a very slow frame — without this the guard reads
   * the cost of degrading as evidence that it should degrade again, and walks
   * itself down to the fallback in three windows regardless of the hardware.
   */
  let sampleCooldown = 0;

  function resetFrameSampling(cooldownFrames = 0) {
    previousFrameAt = 0;
    sampledFrames = 0;
    sampledTime = 0;
    slowFrames = 0;
    sampleCooldown = Math.max(sampleCooldown, cooldownFrames);
  }

  /**
   * Steps the scene down one rung. Each rung removes the most expensive thing
   * still running, so the effect survives on weaker hardware for as long as it
   * can before being abandoned altogether.
   */
  function degrade() {
    level++;
    if (level === 1) {
      // Depth of field first: it is both the widest pass in the chain (seven
      // texture reads for every pixel on screen) and the least missed.
      post?.setQuality(1 as PostQuality);
      halos.visible = false;
      renderer.setPixelRatio(Math.min(dpr, 0.85));
      applySize();
      resetFrameSampling(10);
    } else if (level === 2) {
      post?.setQuality(2 as PostQuality);
      motes.points.visible = false;
      renderer.setPixelRatio(Math.min(dpr, 0.62));
      applySize();
      resetFrameSampling(10);
    }
  }

  function sampleFrameRate(now: number) {
    const gap = previousFrameAt ? now - previousFrameAt : 0;
    previousFrameAt = now;
    if (sampleCooldown > 0) {
      sampleCooldown--;
      return;
    }
    if (gap <= 0) return;

    // Long frames are the whole point of measuring, so they are clamped into
    // the average rather than discarded — an earlier cut-off here meant the
    // slowest devices produced no samples at all and never stepped down.
    sampledTime += gap;
    sampledFrames++;
    if (gap > SLOW_FRAME_MS) slowFrames++;
    if (sampledFrames < SAMPLE_WINDOW && sampledTime < SAMPLE_WINDOW_MS) return;

    const slowFraction = slowFrames / sampledFrames;
    sampledFrames = 0;
    sampledTime = 0;
    slowFrames = 0;

    if (slowFraction < DEGRADE_SLOW_FRACTION) {
      badWindows = 0;
      return;
    }
    if (level < 2) {
      degrade();
      return;
    }
    if (slowFraction >= ABANDON_SLOW_FRACTION && ++badWindows >= BAD_WINDOWS_BEFORE_ABANDON) {
      badWindows = 0;
      onTooSlow?.();
    }
  }

  function applySize() {
    const ratio = renderer.getPixelRatio();
    renderer.setSize(viewWidth, viewHeight, false);
    post?.setSize(viewWidth, viewHeight, ratio);
    stars.material.uniforms.uPixelRatio.value = ratio;
    motes.material.uniforms.uPixelRatio.value = ratio;
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
    const distance = START_DISTANCE * Math.pow(END_DISTANCE / START_DISTANCE, j);
    const parallaxFalloff = 1 - 0.55 * j;
    const pitch = lerp(START_PITCH, END_PITCH, j) + current.py * 0.09 * parallaxFalloff;
    const yaw = lerp(START_YAW, END_YAW, easeOutCubic(p)) + current.px * 0.12 * parallaxFalloff;
    const fov = lerp(START_FOV, END_FOV, j);

    lookTarget.copy(TARGET_START).lerp(TARGET_END, j);

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
      const shift = lerp(0.32, 0.2, j) * halfHeightAtTarget * aspect;
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

    sky.position.copy(camera.position);

    // Atmosphere: cold and empty out in the dark, warming as the ground rises.
    skyMaterial.uniforms.uTop.value.copy(SKY_SPACE.top).lerp(SKY_GROUND.top, j);
    skyMaterial.uniforms.uHorizon.value.copy(SKY_SPACE.horizon).lerp(SKY_GROUND.horizon, j);
    skyMaterial.uniforms.uBottom.value.copy(SKY_SPACE.bottom).lerp(SKY_GROUND.bottom, j);
    seaMaterial.color.copy(SEA_SPACE).lerp(SEA_GROUND, j);
    fog.color.copy(skyMaterial.uniforms.uHorizon.value);
    fog.near = distance * 0.35;
    fog.far = distance * 2.5;

    stars.material.uniforms.uOpacity.value = clamp(1 - p / 0.58, 0, 1);
    motes.material.uniforms.uOpacity.value = clamp((p - 0.45) / 0.4, 0, 1) * 0.5;
    gridMaterial.opacity = clamp(1 - p / 0.5, 0, 1) * 0.9;
    borderMaterial.opacity = lerp(0.20, 0.58, j);

    applyMarkers(p);

    if (post) {
      tintColor.copy(TINT_SPACE).lerp(TINT_GROUND, j);
      post.apply({
        focus: distance,
        // A tight focal range at the end is what separates the near ridge from
        // the far country; wide open at the start so the whole map reads sharp.
        focusRange: lerp(90, 6, j),
        maxCoc: lerp(0.0015, 0.006, j),
        bloom: lerp(0.95, 1.2, j),
        vignette: lerp(0.32, 0.5, j),
        tint: tintColor,
        saturation: lerp(0.72, 1.06, j),
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
    stemMaterial.opacity = clamp((p - REVEAL_FROM) / 0.3, 0, 1) * 0.65;
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
    sampleFrameRate(now);

    const k = 0.14;
    let moving = false;
    for (const axis of POSE_AXES) {
      const delta = target[axis] - current[axis];
      if (Math.abs(delta) > 0.0002) {
        current[axis] += delta * k;
        moving = true;
      } else {
        current[axis] = target[axis];
      }
    }

    applyPose();
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
    if (!continuing) resetFrameSampling();
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
    setActive(next) {
      active = next;
      resetFrameSampling();
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
      resetFrameSampling();
      applyPose();
      renderFrame();
    },
    dispose() {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      terrain.land.dispose();
      terrain.borders.dispose();
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
      landMaterial.dispose();
      borderMaterial.dispose();
      gridMaterial.dispose();
      skyMaterial.dispose();
      stemMaterial.dispose();
      markerMaterial.dispose();
      haloMaterial.dispose();
      markers.dispose();
      halos.dispose();
      post?.dispose();
      renderer.dispose();
    },
  };
}
