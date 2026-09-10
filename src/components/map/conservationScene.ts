/**
 * The Conservation layer, in three dimensions.
 *
 * An opt-in companion to the flat atlas map, not a replacement for it: the
 * Leaflet map stays the default and stays the thing the reader evaluates the
 * data on. This view exists to answer one question the flat map answers
 * poorly — *which parts of the country are covered by a conservation
 * programme, and by which one* — by raising the covered states a step out of
 * the landmass and standing a marker for every programme site on top.
 *
 * What the geometry claims is deliberately small:
 *
 * - The step height is a **boolean**, not a quantity. A state is either
 *   covered by a programme in this dataset or it is not, and a prism whose
 *   height varied would invite the reader to compare magnitudes the atlas has
 *   no data for.
 * - A marker is a **plan shape**, not a picture of anything. No animal is
 *   modelled here, and the coastline is a simplification of the same
 *   `india-states.geojson` the flat map draws.
 *
 * Built from `src/utils/geoExtrude.ts`, the same extruder the hero relief
 * uses, so the two never drift apart. Asset-free: no model, no texture atlas,
 * no loader.
 */
import * as THREE from 'three';
import {
  bakeCapAndWallColors,
  fitToHeight,
  preparePolygons,
  toShape,
  type GeoCollection,
} from '../../utils/geoExtrude';

/** A marker the scene should stand, already carrying its programme identity. */
export interface SceneSite {
  lat: number;
  lng: number;
  /** Sides of the plan polygon. */
  sides: number;
  /** Rotation of that polygon, in radians. */
  rotation: number;
  /** Cap colour. */
  hex: string;
  /** Position within, and size of, the ring of markers sharing this locality. */
  fanIndex: number;
  fanCount: number;
}

export interface ConservationSceneOptions {
  canvas: HTMLCanvasElement;
  geojson: GeoCollection;
  sites: SceneSite[];
  /** States raised a step, i.e. those a programme covers. */
  raisedStates: ReadonlySet<string>;
  /** A marker was clicked, or -1 for a click that hit nothing. */
  onSelect?: (index: number) => void;
  /** The marker under the pointer, or -1. */
  onHover?: (index: number) => void;
  onFirstFrame?: () => void;
  onTooSlow?: () => void;
}

export interface ConservationScene {
  resize: (width: number, height: number) => void;
  setActive: (active: boolean) => void;
  /** Select from outside the canvas — the site list, or the keyboard. */
  select: (index: number) => void;
  /** Turn the view, in whole steps of about 15°. */
  turn: (steps: number) => void;
  /** Tilt the view, in whole steps of about 8°. */
  tilt: (steps: number) => void;
  /** Move the camera in or out, in whole steps. */
  zoom: (steps: number) => void;
  /** Back to the opening framing. */
  reset: () => void;
  dispose: () => void;
}

/** World height the projected map is fitted to. */
const MAP_HEIGHT = 3.0;
/** Coastline simplification, in projected degrees (~3.9 km). */
const SIMPLIFY_TOLERANCE = 0.03;
const MIN_ISLAND_SPAN = 0.05;

/** Extrusion of an uncovered state, and of one a programme covers. */
const BASE_DEPTH = 0.05;
const RAISED_DEPTH = 0.2;

const LAND_TOP = '#24422f';
const LAND_SIDE = '#11241a';
const RAISED_TOP = '#3f7a5a';
const RAISED_SIDE = '#1b3a29';
const BORDER = '#7fb79b';

/** Marker prism: circumradius of the plan polygon, and its height. */
const MARKER_RADIUS = 0.062;
const MARKER_HEIGHT = 0.3;
/** How far co-located markers step off the locality they share. */
const FAN_RADIUS = 0.085;

const START_YAW = -Math.PI / 2;
/**
 * How far the view may swing either side of north-up.
 *
 * Free rotation was tried and rejected: turned far enough, the reader loses
 * which way is north and the thing stops being a map of India. A third of a
 * right angle is enough for the parallax that makes the relief read as solid,
 * and not enough to lose the country's orientation.
 */
const MAX_YAW_SWING = (32 * Math.PI) / 180;
const START_PITCH = (54 * Math.PI) / 180;
const MIN_PITCH = (18 * Math.PI) / 180;
const MAX_PITCH = (86 * Math.PI) / 180;
const START_DISTANCE = 4.3;
const MIN_DISTANCE = 2.3;
const MAX_DISTANCE = 6.8;

const YAW_STEP = Math.PI / 12;
const PITCH_STEP = (8 * Math.PI) / 180;
const ZOOM_STEP = 0.55;
/** Pixels of drag that turn the view by a full circle. */
const DRAG_PER_TURN = 900;

const EASE = 0.16;

/* The same frame-rate guard the species gallery uses: soften once, and only
   hand back to the flat map if softening did not help. */
const SLOW_FRAME_MS = 34;
const SAMPLE_WINDOW = 30;
const SAMPLE_WINDOW_MS = 900;
const DEGRADE_SLOW_FRACTION = 0.5;
const ABANDON_SLOW_FRACTION = 0.68;
const BAD_WINDOWS_BEFORE_ABANDON = 2;

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** A regular polygon in the XY plane, used as a marker's plan outline. */
function planShape(sides: number, radius: number, rotation: number): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < sides; i++) {
    const angle = rotation + (i / sides) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

/** A soft radial falloff for the pool of light under a selected marker. */
function radialTexture(size = 128): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,0.85)');
    gradient.addColorStop(0.45, 'rgba(255,255,255,0.28)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

interface MarkerNode {
  group: THREE.Group;
  prism: THREE.Mesh;
  halo: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  haloMaterial: THREE.MeshBasicMaterial;
  /** Eased 0→1 emphasis, driven by hover and selection. */
  lift: number;
  target: number;
}

export function createConservationScene(options: ConservationSceneOptions): ConservationScene {
  const { canvas, geojson, sites, raisedStates, onSelect, onHover, onFirstFrame, onTooSlow } = options;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
  // Z is up, matching the hero relief and the extruder's own convention.
  camera.up.set(0, 0, 1);

  /* ------------------------------------------------------------------- land */

  const prepared = preparePolygons(geojson, SIMPLIFY_TOLERANCE, MIN_ISLAND_SPAN);
  const fit = fitToHeight(prepared, MAP_HEIGHT);

  const baseShapes: THREE.Shape[] = [];
  const raisedShapes: THREE.Shape[] = [];
  const borderVertices: number[] = [];
  const borderColors: number[] = [];
  const borderDim = new THREE.Color(BORDER).multiplyScalar(0.42);
  const borderBright = new THREE.Color(BORDER);

  for (const polygon of prepared.polygons) {
    const built = toShape(polygon, fit);
    if (!built) continue;
    const raised = polygon.state !== undefined && raisedStates.has(polygon.state);
    (raised ? raisedShapes : baseShapes).push(built.shape);

    const z = (raised ? RAISED_DEPTH : BASE_DEPTH) + 0.002;
    const tint = raised ? borderBright : borderDim;
    for (const ring of built.rings) {
      for (let i = 0; i < ring.length - 1; i++) {
        borderVertices.push(ring[i].x, ring[i].y, z, ring[i + 1].x, ring[i + 1].y, z);
        borderColors.push(tint.r, tint.g, tint.b, tint.r, tint.g, tint.b);
      }
    }
  }

  const landMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0.02,
  });

  /** One extrusion per elevation, each a single draw call. */
  const landGeometries: THREE.ExtrudeGeometry[] = [];
  const addLand = (shapes: THREE.Shape[], depth: number, top: string, side: string) => {
    if (!shapes.length) return;
    const geometry = new THREE.ExtrudeGeometry(shapes, {
      depth,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 1,
    });
    bakeCapAndWallColors(geometry, top, side);
    landGeometries.push(geometry);
    scene.add(new THREE.Mesh(geometry, landMaterial));
  };
  addLand(baseShapes, BASE_DEPTH, LAND_TOP, LAND_SIDE);
  addLand(raisedShapes, RAISED_DEPTH, RAISED_TOP, RAISED_SIDE);

  const borderGeometry = new THREE.BufferGeometry();
  borderGeometry.setAttribute('position', new THREE.Float32BufferAttribute(borderVertices, 3));
  borderGeometry.setAttribute('color', new THREE.Float32BufferAttribute(borderColors, 3));
  const borderMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.55,
  });
  scene.add(new THREE.LineSegments(borderGeometry, borderMaterial));

  /* ---------------------------------------------------------------- markers */

  const haloTexture = radialTexture();
  const haloGeometry = new THREE.PlaneGeometry(MARKER_RADIUS * 9, MARKER_RADIUS * 9);
  const prismGeometries = new Map<string, THREE.ExtrudeGeometry>();
  const prismFor = (sides: number, rotation: number) => {
    const key = `${sides}:${rotation.toFixed(4)}`;
    const existing = prismGeometries.get(key);
    if (existing) return existing;
    const geometry = new THREE.ExtrudeGeometry(planShape(sides, MARKER_RADIUS, rotation), {
      depth: MARKER_HEIGHT,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.006,
      bevelOffset: 0,
      bevelSegments: 1,
      curveSegments: 1,
    });
    prismGeometries.set(key, geometry);
    return geometry;
  };

  const nodes: MarkerNode[] = [];
  const prisms: THREE.Mesh[] = [];
  const stemVertices: number[] = [];

  sites.forEach((site, index) => {
    const [x, y] = fit.project(site.lng, site.lat);
    // Co-located markers step off their shared locality rather than stacking,
    // because a marker underneath another is a marker nobody can click.
    let ox = 0;
    let oy = 0;
    if (site.fanCount > 1) {
      const angle = (site.fanIndex / site.fanCount) * Math.PI * 2;
      ox = Math.cos(angle) * FAN_RADIUS;
      oy = Math.sin(angle) * FAN_RADIUS;
    }

    const group = new THREE.Group();
    group.position.set(x + ox, y + oy, RAISED_DEPTH);

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(site.hex),
      roughness: 0.55,
      metalness: 0.08,
    });
    const prism = new THREE.Mesh(prismFor(site.sides, site.rotation), material);
    prism.userData.index = index;
    group.add(prism);
    prisms.push(prism);

    const haloMaterial = new THREE.MeshBasicMaterial({
      map: haloTexture,
      color: new THREE.Color(site.hex),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    halo.position.z = 0.004;
    group.add(halo);

    scene.add(group);
    nodes.push({ group, prism, halo, material, haloMaterial, lift: 0, target: 0 });

    // A stem down to sea level, so a marker whose locality sits just off the
    // simplified coastline still reads as standing somewhere rather than
    // floating.
    stemVertices.push(x + ox, y + oy, 0, x + ox, y + oy, RAISED_DEPTH);
  });

  const stemGeometry = new THREE.BufferGeometry();
  stemGeometry.setAttribute('position', new THREE.Float32BufferAttribute(stemVertices, 3));
  const stemMaterial = new THREE.LineBasicMaterial({
    color: new THREE.Color('#8fc7aa'),
    transparent: true,
    opacity: 0.3,
  });
  scene.add(new THREE.LineSegments(stemGeometry, stemMaterial));

  /* --------------------------------------------------------------- lighting */

  const hemi = new THREE.HemisphereLight(new THREE.Color('#bcd9cb'), new THREE.Color('#050c08'), 1.5);
  const key = new THREE.DirectionalLight(new THREE.Color('#fff2dc'), 2.1);
  key.position.set(-2.5, -3.2, 5);
  const rim = new THREE.DirectionalLight(new THREE.Color('#5fb389'), 0.7);
  rim.position.set(3.2, 2.6, 1.4);
  scene.add(hemi, key, rim);

  /* ------------------------------------------------------------------ state */

  const target = { yaw: START_YAW, pitch: START_PITCH, distance: START_DISTANCE };
  const current = { ...target };
  let selected = -1;
  let hovered = -1;

  const lookAt = new THREE.Vector3(0, 0, RAISED_DEPTH / 2);
  const offset = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  let viewWidth = 1;
  let viewHeight = 1;

  function placeCamera() {
    const cosPitch = Math.cos(current.pitch);
    offset.set(
      cosPitch * Math.cos(current.yaw),
      cosPitch * Math.sin(current.yaw),
      Math.sin(current.pitch),
    );
    camera.position.copy(lookAt).addScaledVector(offset, current.distance);
    camera.lookAt(lookAt);
  }

  function applyMarkers() {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      node.target = i === selected ? 1 : i === hovered ? 0.45 : 0;
      node.lift += (node.target - node.lift) * EASE;
      if (Math.abs(node.target - node.lift) < 0.002) node.lift = node.target;
      node.group.position.z = RAISED_DEPTH + node.lift * 0.07;
      node.prism.scale.set(1 + node.lift * 0.14, 1 + node.lift * 0.14, 1 + node.lift * 0.42);
      node.haloMaterial.opacity = node.lift * 0.5;
      node.halo.visible = haloesVisible && node.lift > 0.01;
    }
  }

  function markersSettled() {
    for (const node of nodes) if (node.lift !== node.target) return false;
    return true;
  }

  /* ------------------------------------------------------------ frame guard */

  let previousFrameAt = 0;
  let sampledFrames = 0;
  let sampledTime = 0;
  let slowFrames = 0;
  let badWindows = 0;
  let degraded = false;
  let haloesVisible = true;
  let cooldown = 0;

  function sampleFrameRate(now: number) {
    const gap = previousFrameAt ? now - previousFrameAt : 0;
    previousFrameAt = now;
    if (cooldown > 0) {
      cooldown--;
      return;
    }
    if (gap <= 0) return;
    sampledTime += gap;
    sampledFrames++;
    if (gap > SLOW_FRAME_MS) slowFrames++;
    if (sampledFrames < SAMPLE_WINDOW && sampledTime < SAMPLE_WINDOW_MS) return;

    const fraction = slowFrames / sampledFrames;
    sampledFrames = 0;
    sampledTime = 0;
    slowFrames = 0;
    if (fraction < DEGRADE_SLOW_FRACTION) {
      badWindows = 0;
      return;
    }
    if (!degraded) {
      degraded = true;
      renderer.setPixelRatio(Math.min(dpr, 1));
      renderer.setSize(viewWidth, viewHeight, false);
      haloesVisible = false;
      cooldown = 12;
      return;
    }
    if (fraction >= ABANDON_SLOW_FRACTION && ++badWindows >= BAD_WINDOWS_BEFORE_ABANDON) {
      badWindows = 0;
      onTooSlow?.();
    }
  }

  /* -------------------------------------------------------------- the loop */

  let frame = 0;
  let active = true;
  let disposed = false;
  let firstFrameSent = false;
  let settled = false;

  function draw(now: number) {
    frame = 0;
    if (disposed) return;
    sampleFrameRate(now);

    current.yaw += (target.yaw - current.yaw) * EASE;
    current.pitch += (target.pitch - current.pitch) * EASE;
    current.distance += (target.distance - current.distance) * EASE;

    const moving =
      Math.abs(target.yaw - current.yaw) > 0.0004 ||
      Math.abs(target.pitch - current.pitch) > 0.0004 ||
      Math.abs(target.distance - current.distance) > 0.0008;
    if (!moving) {
      current.yaw = target.yaw;
      current.pitch = target.pitch;
      current.distance = target.distance;
    }

    placeCamera();
    applyMarkers();
    renderer.render(scene, camera);

    if (!firstFrameSent) {
      firstFrameSent = true;
      onFirstFrame?.();
    }

    settled = !moving && markersSettled();
    if (!settled) invalidate();
  }

  function invalidate() {
    if (disposed || !active || frame) return;
    // A frame that resumes an idle scene follows an arbitrarily long pause,
    // which says nothing about how fast this device renders.
    if (settled) previousFrameAt = 0;
    settled = false;
    frame = requestAnimationFrame(draw);
  }

  /* --------------------------------------------------------------- pointer */

  let dragging = false;
  let dragMoved = 0;
  let dragX = 0;
  let dragY = 0;
  let dragYaw = 0;
  let dragPitch = 0;
  let pointerId: number | null = null;

  function pick(event: PointerEvent): number {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(prisms, false)[0];
    return hit ? (hit.object.userData.index as number) : -1;
  }

  function setHovered(index: number) {
    if (index === hovered) return;
    hovered = index;
    canvas.style.cursor = index >= 0 ? 'pointer' : dragging ? 'grabbing' : 'grab';
    onHover?.(index);
    invalidate();
  }

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    dragging = true;
    dragMoved = 0;
    dragX = event.clientX;
    dragY = event.clientY;
    dragYaw = target.yaw;
    dragPitch = target.pitch;
    pointerId = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = 'grabbing';
  };

  const onPointerMove = (event: PointerEvent) => {
    if (dragging) {
      const dx = event.clientX - dragX;
      const dy = event.clientY - dragY;
      dragMoved = Math.max(dragMoved, Math.abs(dx) + Math.abs(dy));
      target.yaw = clamp(
        dragYaw - (dx / DRAG_PER_TURN) * Math.PI * 2,
        START_YAW - MAX_YAW_SWING,
        START_YAW + MAX_YAW_SWING,
      );
      target.pitch = clamp(dragPitch + (dy / DRAG_PER_TURN) * Math.PI * 2, MIN_PITCH, MAX_PITCH);
      invalidate();
    } else if (event.pointerType === 'mouse') {
      setHovered(pick(event));
    }
  };

  const endDrag = (event: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    if (pointerId !== null && canvas.hasPointerCapture(pointerId)) {
      canvas.releasePointerCapture(pointerId);
    }
    pointerId = null;
    canvas.style.cursor = hovered >= 0 ? 'pointer' : 'grab';
    // A drag turns the view; a tap selects. Six pixels of slop, because a
    // click on a touchpad moves the pointer a little.
    if (dragMoved <= 6) {
      const index = pick(event);
      selected = index;
      onSelect?.(index);
      invalidate();
    }
  };

  const onPointerLeave = () => {
    if (hovered !== -1) setHovered(-1);
  };

  canvas.style.cursor = 'grab';
  // The page keeps the wheel: this view sits in the middle of a scrolling
  // document, and a zoom that swallowed the wheel would trap the reader in it.
  // Zoom lives on the buttons and the keyboard instead.
  canvas.style.touchAction = 'pan-y';
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', onPointerLeave);

  /* ---------------------------------------------------------------- public */

  placeCamera();
  invalidate();

  return {
    resize(width, height) {
      viewWidth = Math.max(1, width);
      viewHeight = Math.max(1, height);
      renderer.setSize(viewWidth, viewHeight, false);
      camera.aspect = viewWidth / viewHeight;
      // India is tall, so a narrow frame has to back the camera off rather
      // than crop the north or the south off the map.
      camera.fov = clamp(34 * Math.max(1, 1.2 / camera.aspect), 34, 58);
      camera.updateProjectionMatrix();
      invalidate();
    },
    setActive(next) {
      if (next === active) return;
      active = next;
      if (active) {
        previousFrameAt = 0;
        invalidate();
      } else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    select(index) {
      selected = index >= 0 && index < nodes.length ? index : -1;
      invalidate();
    },
    turn(steps) {
      target.yaw = clamp(
        target.yaw + steps * YAW_STEP,
        START_YAW - MAX_YAW_SWING,
        START_YAW + MAX_YAW_SWING,
      );
      invalidate();
    },
    tilt(steps) {
      target.pitch = clamp(target.pitch + steps * PITCH_STEP, MIN_PITCH, MAX_PITCH);
      invalidate();
    },
    zoom(steps) {
      target.distance = clamp(target.distance - steps * ZOOM_STEP, MIN_DISTANCE, MAX_DISTANCE);
      invalidate();
    },
    reset() {
      target.yaw = START_YAW;
      target.pitch = START_PITCH;
      target.distance = START_DISTANCE;
      invalidate();
    },
    dispose() {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', endDrag);
      canvas.removeEventListener('pointercancel', endDrag);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      for (const geometry of landGeometries) geometry.dispose();
      for (const geometry of prismGeometries.values()) geometry.dispose();
      borderGeometry.dispose();
      stemGeometry.dispose();
      haloGeometry.dispose();
      haloTexture.dispose();
      landMaterial.dispose();
      borderMaterial.dispose();
      stemMaterial.dispose();
      for (const node of nodes) {
        node.material.dispose();
        node.haloMaterial.dispose();
      }
      renderer.dispose();
    },
  };
}
