/**
 * Hero 3D scene — an extruded relief of India built at runtime from the same
 * `india-states.geojson` the atlas map already ships, with species occurrence
 * markers drawn from the atlas dataset.
 *
 * Deliberately asset-free: there is no downloaded 3D model, no texture and no
 * loader. Everything here is generated from data the site already serves, so
 * the only extra weight is the three.js runtime itself — which is loaded in a
 * separate async chunk, and only when `HeroScrollScene` decides the device and
 * the user's motion preference can take it.
 *
 * This module is framework-agnostic on purpose; `HeroScrollScene.tsx` owns the
 * React lifecycle, the scroll listener and the capability checks — including
 * `prefers-reduced-motion`, which is handled by never constructing this scene
 * at all rather than by animating it more gently.
 */
import * as THREE from 'three';

/** A GeoJSON position: [longitude, latitude]. */
type Position = [number, number];
type Ring = Position[];

interface GeoFeature {
  geometry: {
    type: string;
    coordinates: unknown;
  };
}

export interface GeoCollection {
  features: GeoFeature[];
}

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
   * scene has stepped its own quality down. The caller should unmount the
   * scene and show the flat artwork instead.
   */
  onTooSlow?: () => void;
}

export interface HeroScene {
  /** Scroll progress through the hero, 0 → 1. */
  setProgress: (p: number) => void;
  /** Pointer parallax, each axis in −1 → 1. Ignored under reduced motion. */
  setPointer: (x: number, y: number) => void;
  /** Pause the render loop entirely when the hero is off-screen or hidden. */
  setActive: (active: boolean) => void;
  resize: (width: number, height: number) => void;
  dispose: () => void;
}

/* --- palette (kept in sync with src/theme.ts) --- */
const LAND_TOP = '#2c6349';
const LAND_SIDE = '#16301f';
const BORDER = '#8fc7aa';
const GRID = '#1c3a2b';

/** Extrusion depth of the landmass, in normalised world units. */
const DEPTH = 0.09;
/** Height the occurrence markers stand above the surface. */
const STEM = 0.16;
/**
 * Frame-time budget, measured while the relief is actually animating.
 *
 * Above the first threshold the scene sheds its most expensive optional work;
 * above the second it gives up and hands back to the flat artwork, because a
 * decorative relief is not worth a juddering scroll. Multisampling is the
 * single largest cost but has to be chosen when the context is created, so it
 * cannot be part of the step-down.
 */
const DEGRADE_FRAME_MS = 32;
const ABANDON_FRAME_MS = 55;
/** Frames averaged before acting, and consecutive bad windows before abandoning. */
const SAMPLE_WINDOW = 24;
const BAD_WINDOWS_BEFORE_ABANDON = 2;

/** Normalised height the projected map is fitted to. */
const TARGET_H = 3.15;
/**
 * Coastline simplification tolerance, in projected degrees (~3.9 km).
 * The relief is drawn into a panel around 350 px wide, where the source
 * geometry carries several times more detail than can ever be resolved —
 * simplifying roughly halves the triangle count and cuts the one-off extrusion
 * cost from ~95 ms to ~35 ms of main-thread time.
 */
const SIMPLIFY_TOLERANCE = 0.035;
/** Islets whose longest side is below this (in projected degrees) are dropped. */
const MIN_ISLAND_SPAN = 0.05;

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
/** Hoisted: allocating this inside the frame loop is enough to cause GC stalls. */
const POSE_AXES = ['progress', 'px', 'py'] as const;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Equirectangular projection with the longitude axis corrected by cos(lat0),
 * so India is not stretched horizontally. Exact geodesy is irrelevant here —
 * this is a decorative relief, not a measurement surface — but an uncorrected
 * plate carrée looks visibly wrong, so it is worth the one cosine.
 */
function makeProjector(lat0: number) {
  const k = Math.cos((lat0 * Math.PI) / 180);
  return (lng: number, lat: number): Position => [lng * k, lat];
}

/**
 * Ramer-Douglas-Peucker simplification of a closed ring, iterative so a long
 * coastline cannot blow the stack. Returns null if the ring collapses below a
 * triangle.
 *
 * Rings are simplified independently, so shared state boundaries can drift
 * apart by up to the tolerance. At this scale that is well under a pixel, and
 * the boundary lines are drawn over the seams anyway.
 */
function simplifyRing(ring: Ring, tolerance: number): Ring | null {
  if (ring.length < 5) return ring;
  const last = ring.length - 1;
  const isClosed = ring[0][0] === ring[last][0] && ring[0][1] === ring[last][1];
  const pts = isClosed ? ring.slice(0, last) : ring.slice();
  if (pts.length < 4) return ring;

  const keep = new Uint8Array(pts.length);
  keep[0] = 1;
  keep[pts.length - 1] = 1;
  const tolerance2 = tolerance * tolerance;
  const stack: Array<[number, number]> = [[0, pts.length - 1]];

  while (stack.length) {
    const [a, b] = stack.pop()!;
    if (b - a < 2) continue;
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let furthest = -1;
    let furthestDistance = tolerance2;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = pts[i];
      let distance: number;
      if (len2 === 0) {
        distance = (px - ax) ** 2 + (py - ay) ** 2;
      } else {
        const t = clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
        distance = (px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2;
      }
      if (distance > furthestDistance) {
        furthestDistance = distance;
        furthest = i;
      }
    }
    if (furthest !== -1) {
      keep[furthest] = 1;
      stack.push([a, furthest], [furthest, b]);
    }
  }

  const out: Ring = [];
  for (let i = 0; i < pts.length; i++) if (keep[i]) out.push(pts[i]);
  if (out.length < 3) return null;
  out.push(out[0]);
  return out;
}

/** Longest bounding-box side of a ring, used to cull sub-pixel islets. */
function ringSpan(ring: Ring): number {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return Math.max(maxX - minX, maxY - minY);
}

/** Pull every linear ring out of a Polygon / MultiPolygon feature. */
function ringsOf(feature: GeoFeature): Ring[][] {
  const { type, coordinates } = feature.geometry;
  if (type === 'Polygon') return [coordinates as Ring[]];
  if (type === 'MultiPolygon') return coordinates as Ring[][];
  return [];
}

export function createHeroScene(options: HeroSceneOptions): HeroScene {
  const { canvas, geojson, points, onFirstFrame, onTooSlow } = options;

  /* ---------------------------------------------------------------- geometry */

  const project = makeProjector(22.5);
  const polygons: Ring[][] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const feature of geojson.features) {
    for (const poly of ringsOf(feature)) {
      const projected: Ring[] = [];
      for (let r = 0; r < poly.length; r++) {
        const ring = poly[r];
        if (!Array.isArray(ring) || ring.length < 4) continue;
        let out: Ring | null = ring.map(([lng, lat]) => project(lng, lat));
        // An outer ring too small to resolve takes its whole polygon with it.
        if (r === 0 && ringSpan(out) < MIN_ISLAND_SPAN) break;
        out = simplifyRing(out, SIMPLIFY_TOLERANCE);
        if (!out) {
          if (r === 0) break;
          continue;
        }
        for (const p of out) {
          if (p[0] < minX) minX = p[0];
          if (p[0] > maxX) maxX = p[0];
          if (p[1] < minY) minY = p[1];
          if (p[1] > maxY) maxY = p[1];
        }
        projected.push(out);
      }
      if (projected.length) polygons.push(projected);
    }
  }

  const scale = TARGET_H / Math.max(maxY - minY, 1e-6);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const toWorld = (p: Position): Position => [(p[0] - cx) * scale, (p[1] - cy) * scale];
  const mapAspect = ((maxX - minX) * scale) / TARGET_H;

  const shapes: THREE.Shape[] = [];
  const borderVertices: number[] = [];

  for (const poly of polygons) {
    let shape: THREE.Shape | null = null;
    for (let r = 0; r < poly.length; r++) {
      const pts = poly[r].map((p) => {
        const [x, y] = toWorld(p);
        return new THREE.Vector2(x, y);
      });
      if (r === 0) {
        shape = new THREE.Shape(pts);
      } else if (shape) {
        shape.holes.push(new THREE.Path(pts));
      }
      // State outlines, drawn just above the extruded top face.
      const z = DEPTH + 0.0015;
      for (let i = 0; i < pts.length - 1; i++) {
        borderVertices.push(pts[i].x, pts[i].y, z, pts[i + 1].x, pts[i + 1].y, z);
      }
    }
    if (shape) shapes.push(shape);
  }

  const landGeometry = new THREE.ExtrudeGeometry(shapes, {
    depth: DEPTH,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 1,
  });

  // ExtrudeGeometry emits a cap group and a wall group *per shape*, so a
  // two-material mesh would cost one draw call per group — around 200 for the
  // Indian coastline. Baking the two colours into a vertex attribute instead
  // gets the same light-top/dark-side read in a single draw call.
  {
    const count = landGeometry.attributes.position.count;
    const colors = new Float32Array(count * 3);
    const top = new THREE.Color(LAND_TOP);
    const side = new THREE.Color(LAND_SIDE);
    for (const group of landGeometry.groups) {
      const c = group.materialIndex === 0 ? top : side;
      const end = group.start + group.count;
      for (let i = group.start; i < end; i++) {
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }
    }
    landGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    landGeometry.clearGroups();
  }

  /* ------------------------------------------------------------------ scene */

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 6);

  const root = new THREE.Group();
  scene.add(root);

  const landMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.02,
  });
  const land = new THREE.Mesh(landGeometry, landMaterial);
  root.add(land);

  const borderMaterial = new THREE.LineBasicMaterial({
    color: new THREE.Color(BORDER),
    transparent: true,
    opacity: 0.4,
  });
  const borderGeometry = new THREE.BufferGeometry();
  borderGeometry.setAttribute('position', new THREE.Float32BufferAttribute(borderVertices, 3));
  const borders = new THREE.LineSegments(borderGeometry, borderMaterial);
  root.add(borders);

  // A faint graticule behind the relief, echoing the flat atlas artwork.
  const gridVertices: number[] = [];
  const gw = 2.4;
  const gh = 1.9;
  for (let i = -4; i <= 4; i++) {
    const t = (i / 4) * gh;
    gridVertices.push(-gw, t, -0.5, gw, t, -0.5);
  }
  for (let i = -5; i <= 5; i++) {
    const t = (i / 5) * gw;
    gridVertices.push(t, -gh, -0.5, t, gh, -0.5);
  }
  const gridGeometry = new THREE.BufferGeometry();
  gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridVertices, 3));
  const gridMaterial = new THREE.LineBasicMaterial({
    color: new THREE.Color(GRID),
    transparent: true,
    opacity: 0.85,
  });
  const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
  root.add(grid);

  /* ---------------------------------------------------------------- markers */

  const markerCount = points.length;
  // Markers land at roughly 9 px and their halos at 23 px, so the sphere
  // tessellation is kept deliberately coarse — at (10, 8) the markers alone
  // cost as many triangles as the entire landmass, for detail no one can see.
  const markerGeometry = new THREE.SphereGeometry(0.026, 8, 6);
  const haloGeometry = new THREE.SphereGeometry(0.026, 6, 4);
  const markerMaterial = new THREE.MeshBasicMaterial({ toneMapped: false });
  const markers = new THREE.InstancedMesh(markerGeometry, markerMaterial, markerCount);
  markers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const haloMaterial = new THREE.MeshBasicMaterial({
    toneMapped: false,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });
  const halos = new THREE.InstancedMesh(haloGeometry, haloMaterial, markerCount);
  halos.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const stemVertices = new Float32Array(markerCount * 6);
  const stemColors = new Float32Array(markerCount * 6);
  const markerBase: Array<{ x: number; y: number; h: number }> = [];

  const colour = new THREE.Color();
  for (let i = 0; i < markerCount; i++) {
    const p = points[i];
    const [x, y] = toWorld(project(p.lng, p.lat));
    // A little per-marker variation keeps the field from looking like a grid.
    const h = STEM * (0.82 + ((i * 37) % 11) / 26);
    markerBase.push({ x, y, h });

    colour.set(p.color);
    markers.setColorAt(i, colour);
    halos.setColorAt(i, colour);

    stemVertices[i * 6 + 0] = x;
    stemVertices[i * 6 + 1] = y;
    stemVertices[i * 6 + 2] = DEPTH;
    stemVertices[i * 6 + 3] = x;
    stemVertices[i * 6 + 4] = y;
    stemVertices[i * 6 + 5] = DEPTH + h;
    // Fade each stem from transparent at the surface to full colour at the tip.
    stemColors[i * 6 + 0] = colour.r * 0.25;
    stemColors[i * 6 + 1] = colour.g * 0.25;
    stemColors[i * 6 + 2] = colour.b * 0.25;
    stemColors[i * 6 + 3] = colour.r;
    stemColors[i * 6 + 4] = colour.g;
    stemColors[i * 6 + 5] = colour.b;
  }
  if (markers.instanceColor) markers.instanceColor.needsUpdate = true;
  if (halos.instanceColor) halos.instanceColor.needsUpdate = true;

  const stemGeometry = new THREE.BufferGeometry();
  const stemPosition = new THREE.BufferAttribute(stemVertices, 3);
  stemPosition.setUsage(THREE.DynamicDrawUsage);
  stemGeometry.setAttribute('position', stemPosition);
  stemGeometry.setAttribute('color', new THREE.BufferAttribute(stemColors, 3));
  const stemMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    toneMapped: false,
  });
  const stems = new THREE.LineSegments(stemGeometry, stemMaterial);

  root.add(stems, markers, halos);

  /* ---------------------------------------------------------------- lighting */

  const hemi = new THREE.HemisphereLight(new THREE.Color('#c3e2d3'), new THREE.Color('#0a1710'), 1.5);
  const key = new THREE.DirectionalLight(new THREE.Color('#f6f4ec'), 2.1);
  key.position.set(-2.5, 3.5, 5);
  const fill = new THREE.DirectionalLight(new THREE.Color('#5aa47e'), 0.7);
  fill.position.set(3.5, -2, 2.5);
  scene.add(hemi, key, fill);

  /* ---------------------------------------------------------------- renderer */

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: dpr < 1.75,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(dpr);
  renderer.setClearAlpha(0);

  /* ------------------------------------------------------------------- pose */

  const target = { progress: 0, px: 0, py: 0 };
  const current = { progress: 0, px: 0, py: 0 };
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scaleVec = new THREE.Vector3();
  let fit = 1;
  let active = true;
  let frame = 0;
  let disposed = false;
  let firstFrameSent = false;

  /* --- adaptive quality --- */
  let previousFrameAt = 0;
  let sampledFrames = 0;
  let sampledTime = 0;
  let degraded = false;
  let badWindows = 0;
  /** True while the frame loop is rescheduling itself, i.e. mid-animation. */
  let continuing = false;

  function resetFrameSampling() {
    previousFrameAt = 0;
    sampledFrames = 0;
    sampledTime = 0;
  }

  /**
   * Watch the frame rate while the relief is animating and step the scene down
   * if the device cannot keep up. Only consecutive frames are sampled, so the
   * gap either side of an idle period is never mistaken for a slow frame.
   */
  function sampleFrameRate(now: number) {
    const gap = previousFrameAt ? now - previousFrameAt : 0;
    previousFrameAt = now;
    if (gap <= 0) return;

    // Long frames are the whole point of measuring, so they are clamped into
    // the average rather than discarded — an earlier cut-off here meant the
    // slowest devices produced no samples at all and never stepped down.
    sampledTime += Math.min(gap, 500);
    sampledFrames++;
    if (sampledFrames < SAMPLE_WINDOW) return;

    const average = sampledTime / sampledFrames;
    sampledFrames = 0;
    sampledTime = 0;

    if (average < DEGRADE_FRAME_MS) {
      badWindows = 0;
      return;
    }
    if (!degraded) {
      // Shed the blended halo pass and any supersampling before giving up.
      degraded = true;
      halos.visible = false;
      renderer.setPixelRatio(1);
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      return;
    }
    if (average >= ABANDON_FRAME_MS && ++badWindows >= BAD_WINDOWS_BEFORE_ABANDON) {
      badWindows = 0;
      onTooSlow?.();
    }
  }

  function applyPose() {
    const p = current.progress;
    const e = easeOut(p);

    // Face-on at the top of the page, tipping into an oblique, "looking down at
    // the relief" view as the visitor scrolls — the landmass reads as a solid
    // object only once it has some tilt on it.
    root.rotation.x = -0.13 - e * 0.62 + current.py * 0.1;
    root.rotation.y = 0.26 - e * 0.55 + current.px * 0.15;
    root.rotation.z = e * 0.06;
    // Tilting foreshortens the relief towards the top of the frame; nudge it
    // back down so it stays centred in the panel through the whole travel.
    root.position.y = -e * 0.1;
    root.scale.setScalar(fit * (1 - e * 0.06));
    // A gentle push in. Kept small deliberately: the tilt already grows the
    // relief's apparent width, and a stronger dolly clips the Nicobar chain
    // against the right edge of the frame at the end of the travel.
    camera.position.z = 6 - e * 0.15;
    camera.updateProjectionMatrix();

    // Occurrence markers rise out of the surface as the tilt reveals them.
    const rise = 0.3 + e * 0.7;
    quaternion.identity();
    for (let i = 0; i < markerCount; i++) {
      const m = markerBase[i];
      const z = DEPTH + m.h * rise;
      position.set(m.x, m.y, z);
      scaleVec.setScalar(1);
      matrix.compose(position, quaternion, scaleVec);
      markers.setMatrixAt(i, matrix);
      scaleVec.setScalar(2.6);
      matrix.compose(position, quaternion, scaleVec);
      halos.setMatrixAt(i, matrix);
      stemVertices[i * 6 + 5] = z;
    }
    markers.instanceMatrix.needsUpdate = true;
    halos.instanceMatrix.needsUpdate = true;
    stemPosition.needsUpdate = true;
    haloMaterial.opacity = 0.1 + e * 0.12;
  }

  function draw(now: number) {
    frame = 0;
    if (disposed) return;
    sampleFrameRate(now);

    // Critically damped enough to feel attached to the scrollbar rather than
    // trailing it, while still smoothing out coarse wheel steps.
    const k = 0.16;
    let moving = false;
    for (const axis of POSE_AXES) {
      const delta = target[axis] - current[axis];
      if (Math.abs(delta) > 0.0004) {
        current[axis] += delta * k;
        moving = true;
      } else {
        current[axis] = target[axis];
      }
    }

    applyPose();
    renderer.render(scene, camera);

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
      if (Math.abs(next - target.progress) < 0.0004) return;
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
      renderer.setSize(width, height, false);
      resetFrameSampling();
      const viewAspect = width / height;
      camera.aspect = viewAspect;
      // Shrink to fit when the panel is narrower than the map itself, so the
      // relief never gets clipped on small screens.
      fit = viewAspect < mapAspect ? viewAspect / mapAspect : 1;
      camera.updateProjectionMatrix();
      applyPose();
      renderer.render(scene, camera);
    },
    dispose() {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      landGeometry.dispose();
      borderGeometry.dispose();
      gridGeometry.dispose();
      stemGeometry.dispose();
      markerGeometry.dispose();
      haloGeometry.dispose();
      landMaterial.dispose();
      borderMaterial.dispose();
      gridMaterial.dispose();
      stemMaterial.dispose();
      markerMaterial.dispose();
      haloMaterial.dispose();
      markers.dispose();
      halos.dispose();
      renderer.dispose();
    },
  };
}
