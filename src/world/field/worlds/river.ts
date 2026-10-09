import * as THREE from 'three';
import { GLSL_GRAIN, GLSL_HASH, GLSL_NOISE } from '../../gl/chunks';
import { particleBudget } from '../../gl/particles';
import { CameraRig, type Shot } from '../cameraRig';
import { rgb } from '../gl/color';
import { makeDrift } from '../gl/drift';
import { curve, makeLine } from '../gl/line';
import { frameAround, makeMapLines, makeRings } from '../gl/mapLines';
import { GLSL_COVER, loadPhoto } from '../gl/photo';
import { lerp, seg, window4 } from '../noise';
import type { FieldInput, FieldWorld, WorldContext } from '../types';

/**
 * FIELD STUDY 03 · DRAG · the Ganges river dolphin, the Ganga and Brahmaputra.
 *
 * The tactile study. The world is moving water seen from above: a silt-laden
 * channel whose current runs through it in streaks, a sky held in its
 * surface, and a ripple field the hand writes into — move over the water and
 * it answers; press and drag to push it. The surface is a real simulation
 * (a height field stepped on the GPU every frame, 256² on the high tier),
 * running only while this world is the one on screen.
 *
 * Scrolled: the river begins as a single line (SOURCE) and widens until it
 * fills the screen (FLOW). The camera rises straight above it and the water
 * gives way to the atlas's map — the states of record, the four localities
 * the record gives, joined by a thread the reader drags along, west to east
 * (GEOGRAPHY). Back at the water, the photograph of the dolphin lies under the
 * surface, refracted by it, and surfaces as the scroll continues (SPECIES).
 * Barrages are set across the channel and the current slows (PRESSURE), and
 * the flow returns (CONSERVATION) before the river narrows back to its line.
 *
 * Honesty: the channel is procedural; the thread joins recorded localities
 * and is not the river's course; the barrages are schematic marks. The page
 * says each of these at its moment.
 */

/** The ripple field's window on the water; the ground itself reaches far past it. */
const PLANE_W = 420;
const PLANE_D = 280;
const GROUND_W = 1100;
const GROUND_D = 800;

const SIM_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/** One step of the ripple field: height in r, velocity in g (after Evan Wallace's WebGL Water). */
const SIM_FRAGMENT = /* glsl */ `
  uniform sampler2D uPrev;
  uniform vec2 uTexel;
  uniform vec2 uDrop;
  uniform float uDropR;
  uniform float uDropS;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D(uPrev, vUv);
    float avg = (
      texture2D(uPrev, vUv + vec2(uTexel.x, 0.0)).r +
      texture2D(uPrev, vUv - vec2(uTexel.x, 0.0)).r +
      texture2D(uPrev, vUv + vec2(0.0, uTexel.y)).r +
      texture2D(uPrev, vUv - vec2(0.0, uTexel.y)).r) * 0.25;
    float vel = (c.g + (avg - c.r) * 2.0) * 0.986;
    float h = (c.r + vel) * 0.997;
    vec2 d = (vUv - uDrop) / uTexel;
    h += uDropS * exp(-dot(d, d) / (uDropR * uDropR));
    gl_FragColor = vec4(h, vel, 0.0, 1.0);
  }
`;

const WATER_VERTEX = /* glsl */ `
  varying vec3 vPos;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vPos = position;
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const WATER_FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  ${GLSL_GRAIN}
  ${GLSL_COVER}
  uniform sampler2D uRipple;
  uniform vec2 uTexel;
  uniform float uPhase;
  uniform float uWidth;
  uniform float uDrawX;
  uniform float uWater;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uStreak;
  uniform vec3 uSky;
  uniform vec3 uBank;
  uniform vec3 uNight;
  uniform vec3 uLine;
  uniform vec3 uLight;
  uniform sampler2D uPhoto;
  uniform float uPhotoAspect;
  uniform vec4 uPhotoRect;
  uniform float uPhotoOn;
  uniform float uSurface;
  uniform float uDim;
  varying vec3 vPos;
  varying vec2 vUv;
  varying float vDepth;

  float centre(float x) { return 18.0 * sin(x * 0.018) + 9.0 * sin(x * 0.041 + 1.3); }
  float halfWidth(float x) { return (13.0 + 4.0 * sin(x * 0.03 + 0.7)) * uWidth; }

  void main() {
    float zc = centre(vPos.x);
    float hw = max(halfWidth(vPos.x), 0.25);
    float across = (vPos.z - zc) / hw;
    float d = abs(across);
    float reach = smoothstep(uDrawX - 0.03, uDrawX, (vPos.x + ${(PLANE_W / 2).toFixed(1)}) / ${PLANE_W.toFixed(1)}) * step(-${(PLANE_W / 2).toFixed(1)}, vPos.x) * step(uDrawX, 0.999);
    float water = (1.0 - smoothstep(0.86, 1.04, d)) * (1.0 - reach);

    // The current: two layers of streaks travelling downstream at different speeds.
    float s1 = fbm3(vec2((vPos.x - uPhase * 9.0) * 0.045, across * 2.0));
    float s2 = fbm3(vec2((vPos.x - uPhase * 15.0) * 0.1 + 3.0, across * 4.5));
    float streak = smoothstep(0.52, 0.86, s1 * 0.62 + s2 * 0.38);

    // The hand's ripples, and the current's own small waves, bend the surface.
    vec2 ruv = vec2(vPos.x / ${PLANE_W.toFixed(1)} + 0.5, 0.5 - vPos.z / ${PLANE_D.toFixed(1)});
    float inside = step(0.0, ruv.x) * step(ruv.x, 1.0) * step(0.0, ruv.y) * step(ruv.y, 1.0);
    float h = texture2D(uRipple, ruv).r * inside;
    float hx = (texture2D(uRipple, ruv + vec2(uTexel.x, 0.0)).r - texture2D(uRipple, ruv - vec2(uTexel.x, 0.0)).r) * inside;
    float hz = (texture2D(uRipple, ruv + vec2(0.0, uTexel.y)).r - texture2D(uRipple, ruv - vec2(0.0, uTexel.y)).r) * inside;
    float wx = (fbm3(vec2((vPos.x - uPhase * 12.0) * 0.3, vPos.z * 0.3)) - 0.5) * 0.18;
    vec3 n = normalize(vec3(-hx * 6.0 + wx, 1.0, hz * 6.0 + wx * 0.6));
    vec3 V = normalize(cameraPosition - vPos);
    float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);
    vec3 R = reflect(-uLight, n);
    float spec = pow(max(dot(R, V), 0.0), 80.0);

    vec3 col = mix(uDeep, uShallow, (1.0 - d) * 0.25 + streak * 0.32);
    col = mix(col, uStreak, streak * 0.18);

    // The photograph, under the water: refracted by the surface, tinted by depth, surfacing.
    vec2 pr = (vPos.xz - uPhotoRect.xy) / uPhotoRect.zw + 0.5;
    if (uPhotoOn > 0.001 && pr.x > 0.0 && pr.x < 1.0 && pr.y > 0.0 && pr.y < 1.0) {
      float bend = (1.0 - uSurface) * 0.035 + 0.006;
      vec2 puv = coverUv(vec2(pr.x, 1.0 - pr.y), uPhotoRect.z / uPhotoRect.w, uPhotoAspect) + n.xz * bend * 3.0;
      vec3 ph = texture2D(uPhoto, puv).rgb;
      vec2 ed = smoothstep(vec2(0.0), vec2(0.12), pr) * smoothstep(vec2(0.0), vec2(0.12), 1.0 - pr);
      float m = ed.x * ed.y * uPhotoOn * water;
      vec3 sub = mix(uDeep, ph, mix(0.28, 1.0, uSurface));
      col = mix(col, sub, m);
      fres *= 1.0 - m * uSurface * 0.8;
    }

    col = mix(col, uSky, fres * 0.55);
    col += spec * 0.9 * vec3(0.92, 0.96, 1.0);
    col += h * 0.08;

    // The banks: silt, with the channel's edge drawn as contour-like lines.
    float bandLines = 1.0 - smoothstep(0.0, 1.2, abs(fract(d * 1.6 - 0.5) - 0.5) / max(fwidth(d * 1.6), 1e-4));
    vec3 bank = uBank * (0.8 + fbm3(vPos.xz * 0.05) * 0.4);
    bank = mix(bank, uLine, bandLines * 0.16 * (1.0 - smoothstep(1.0, 4.0, d)));
    col = mix(bank, col, water);
    col = mix(col, uLine, (1.0 - smoothstep(0.0, 1.2, abs(d - 1.0) / max(fwidth(d), 1e-4))) * 0.4 * (1.0 - reach) * step(0.1, uWidth));

    // The map: the water gives way to the atlas's night ground.
    col = mix(uNight, col, uWater);
    float fog = smoothstep(220.0, 520.0, vDepth);
    col = mix(col, uNight, fog * 0.7);
    col += paperGrain(gl_FragCoord.xy, 0.01);
    col = mix(col, col * 0.55, uDim);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const BAR_IVORY = rgb('#e8e1cf');
const BAR_PROTECT = rgb('#7ea3b5');

const centre = (x: number) => 18 * Math.sin(x * 0.018) + 9 * Math.sin(x * 0.041 + 1.3);
const halfWidth = (x: number) => 13 + 4 * Math.sin(x * 0.03 + 0.7);

export async function createRiver({ species, tier }: WorldContext): Promise<FieldWorld> {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 2000);
  const C = {
    deep: rgb('#0f2d42'),
    shallow: rgb('#1f4f6b'),
    streak: rgb('#8fb8ca'),
    sky: rgb('#9cbccb'),
    bank: rgb('#0c1c27'),
    night: rgb('#0b1a24'),
    line: rgb('#7ea3b5'),
  };
  const lightDir = new THREE.Vector3(-0.35, 0.8, -0.45).normalize();

  /* the ripple field */
  const simSize = { high: 256, balanced: 192, low: 128 }[tier];
  const rtOpts = {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
  } as const;
  let simA = new THREE.WebGLRenderTarget(simSize, Math.round(simSize * (PLANE_D / PLANE_W)), rtOpts);
  let simB = simA.clone();
  const texel = new THREE.Vector2(1 / simA.width, 1 / simA.height);
  const simMat = new THREE.ShaderMaterial({
    vertexShader: SIM_VERTEX,
    fragmentShader: SIM_FRAGMENT,
    uniforms: {
      uPrev: { value: simA.texture },
      uTexel: { value: texel },
      uDrop: { value: new THREE.Vector2(-1, -1) },
      uDropR: { value: 2.6 },
      uDropS: { value: 0 },
    },
    depthTest: false,
    depthWrite: false,
  });
  const simScene = new THREE.Scene();
  const simCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const simQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMat);
  simQuad.frustumCulled = false;
  simScene.add(simQuad);

  /* the water */
  const photo = await loadPhoto(species, tier);
  const photoX = 46;
  const photoRect = new THREE.Vector4(photoX, centre(photoX), 30, 30 / (photo?.aspect ?? 1.2));
  const waterMat = new THREE.ShaderMaterial({
    vertexShader: WATER_VERTEX,
    fragmentShader: WATER_FRAGMENT,
    uniforms: {
      uRipple: { value: simA.texture },
      uTexel: { value: texel },
      uPhase: { value: 0 },
      uWidth: { value: 0.75 },
      uDrawX: { value: 1 },
      uWater: { value: 1 },
      uDeep: { value: C.deep },
      uShallow: { value: C.shallow },
      uStreak: { value: C.streak },
      uSky: { value: C.sky },
      uBank: { value: C.bank },
      uNight: { value: C.night },
      uLine: { value: C.line },
      uLight: { value: lightDir },
      uPhoto: { value: photo?.texture ?? null },
      uPhotoAspect: { value: photo?.aspect ?? 1.2 },
      uPhotoRect: { value: photoRect },
      uPhotoOn: { value: 0 },
      uSurface: { value: 0 },
      uDim: { value: 0 },
    },
  });
  const plane = new THREE.PlaneGeometry(GROUND_W, GROUND_D, 1, 1);
  plane.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(plane, waterMat);
  scene.add(water);

  /* the river as a line: what the study begins and ends with */
  const riverPts: THREE.Vector3[] = [];
  for (let x = -GROUND_W / 2; x <= GROUND_W / 2; x += 2) riverPts.push(new THREE.Vector3(x, 0.08, centre(x)));
  const riverLine = makeLine(riverPts, { width: 2.6, color: '#9cc3d4', nib: 1 });
  // Lines lying on the water are drawn over it: at this distance a depth test would fight the surface.
  riverLine.material.depthTest = false;
  scene.add(riverLine.mesh);

  /* barrages: schematic, dashed, across the channel */
  const barrages = [-92, 6, 104].map((x) => {
    const w = halfWidth(x) * 1.35;
    const z = centre(x);
    const pts = curve([new THREE.Vector3(x, 0.12, z - w), new THREE.Vector3(x, 0.12, z + w)], 16);
    const line = makeLine(pts, { width: 2.4, color: '#e8e1cf', dash: 0.55, dashCount: 9, nib: 0 });
    line.material.uniforms.uOpacity.value = 0;
    line.material.depthTest = false;
    scene.add(line.mesh);
    return line;
  });

  /* silt on the surface, carried by the current */
  const silt = makeDrift({
    count: particleBudget(520),
    min: [-PLANE_W / 2, 0.15, -40],
    max: [PLANE_W / 2, 0.4, 40],
    wind: [7, 0, 0],
    color: '#a9c6d3',
    size: [0.4, 1.4],
    alpha: [0.08, 0.4],
    sway: 0.6,
    scale: 50,
    seed: 3,
  });
  scene.add(silt.points);

  /* the map: the record's localities and states, laid on the ground */
  const points = [...species.distributionPoints].sort((a, b) => a.lng - b.lng);
  const frame = frameAround(points, 300, 0.12);
  const placed = points.map((p) => frame.toPlane(p.lng, p.lat));
  const threadPts = curve(
    placed.map(([x, z]) => new THREE.Vector3(x, 0.3, z)),
    240,
  );
  const thread = makeLine(threadPts, { width: 1.6, color: '#e8e1cf', nib: 1 });
  thread.material.uniforms.uDraw.value = 0;
  thread.material.depthTest = false;
  scene.add(thread.mesh);
  const rings = makeRings(
    placed.map(([x, z]) => [x, 0.4, z]),
    '#7ea3b5',
  );
  scene.add(rings.points);
  const map = await makeMapLines(frame, 0.2, { color: '#5f7d8c', recordedColor: '#9cbccb', recorded: species.states, within: 420 });
  if (map) scene.add(map.lines);
  // Where the thread passes each locality, as a fraction of its length (for the drag).
  const stopT = placed.map(([x, z]) => {
    let best = 0;
    let bestD = Infinity;
    threadPts.forEach((p, k) => {
      const dd = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (dd < bestD) {
        bestD = dd;
        best = k / (threadPts.length - 1);
      }
    });
    return best;
  });
  const along = (v: number) => {
    // Drag 0 → 1 moves stop to stop, evenly.
    const f = v * (stopT.length - 1);
    const k = Math.min(stopT.length - 2, Math.floor(f));
    return lerp(stopT[k], stopT[k + 1], f - k);
  };

  /* the camera */
  const N = 7;
  const at = (i: number) => (i + 0.5) / N;
  const path: Shot[] = [
    { at: 0, pos: [-70, 86, 110], look: [-6, 0, 12], fov: 40 },
    { at: at(0), pos: [-66, 82, 106], look: [-4, 0, 12], fov: 40 },
    { at: at(1), pos: [-6, 34, 58], look: [14, 0, -4], fov: 46 },
    { at: at(2), pos: [0, 300, 36], look: [0, 0, 0], fov: 44 },
    { at: at(3), pos: [photoX + 16, 46, photoRect.y + 38], look: [photoX + 22, 0, photoRect.y - 2], fov: 40 },
    { at: at(4), pos: [-30, 92, 120], look: [6, 0, 0], fov: 42 },
    { at: at(5), pos: [34, 62, 92], look: [18, 0, -4], fov: 42 },
    { at: at(6), pos: [-66, 82, 106], look: [-4, 0, 12], fov: 40 },
    { at: 1, pos: [-70, 86, 110], look: [-6, 0, 12], fov: 40 },
  ];
  const rig = new CameraRig(camera, {
    preview: { at: 0, pos: [-30, 58, 78], look: [6, 0, 0], fov: 42 },
    engage: { at: 0, pos: [-22, 48, 66], look: [12, 0, 0], fov: 40 },
    path,
    sway: [4, 2.5],
    lambda: 5,
  });

  const ndc = new THREE.Vector2();
  const ray = new THREE.Raycaster();
  const hit = new THREE.Vector3();
  const surface = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const pan = new THREE.Vector3();
  const panTarget = new THREE.Vector3();
  const focus = new THREE.Vector3();
  let phase = 0;
  let rung = 0;
  let lastX = 0;
  let lastY = 0;
  let renderer: THREE.WebGLRenderer | null = null;
  let drop = { x: -1, y: -1, s: 0 };

  const world: FieldWorld = {
    scene,
    camera,
    clear: '#0b1a24',
    update(i: FieldInput) {
      const p = i.progress;
      const e = i.enter;
      rig.update({ engage: i.engage, enter: e, progress: p, pointer: i.pointer, dt: i.dt, snap: i.snap || i.reduced });
      const u = waterMat.uniforms;

      // The river: a line, then water filling the screen, then a map, then water again, then its line.
      const studyWidth =
        lerp(0.1, 1, seg(p, 0.08, 0.24)) * (1 - 0.7 * window4(p, 0.29, 0.33, 0.42, 0.46)) * (1 - 0.88 * seg(p, 0.87, 0.95));
      const width = lerp(0.75 + 0.15 * i.engage, studyWidth, e);
      u.uWidth.value = width;
      u.uDrawX.value = lerp(1, lerp(0.35, 1, seg(p, 0, 0.1)), e);
      const mapOn = window4(p, 0.29, 0.335, 0.415, 0.455) * e;
      u.uWater.value = 1 - mapOn * 0.96;
      // The line is drawn as far as the water reaches (it runs the whole ground; the reach is measured on the ripple window).
      riverLine.material.uniforms.uDraw.value = u.uDrawX.value >= 0.999 ? 1 : (u.uDrawX.value * PLANE_W - PLANE_W / 2 + GROUND_W / 2) / GROUND_W;
      riverLine.material.uniforms.uOpacity.value = (1 - THREE.MathUtils.smoothstep(width, 0.18, 0.5)) * (1 - mapOn);

      // The current slows behind the barrages and is given back.
      const bars = window4(p, 0.575, 0.61, 0.84, 0.88) * e;
      const slow = window4(p, 0.59, 0.64, 0.72, 0.77) * e;
      const flow = (1 - 0.82 * slow) * (i.reduced ? 0 : 1);
      phase += i.dt * flow;
      u.uPhase.value = phase;
      for (const b of barrages) {
        b.material.uniforms.uOpacity.value = bars * 0.9;
        // Given back: the barrages remain, drawn in the protected colour, the flow passing them.
        b.material.uniforms.uColor.value.lerpVectors(BAR_IVORY, BAR_PROTECT, seg(p, 0.72, 0.76));
      }
      silt.material.uniforms.uTime.value = phase;
      silt.material.uniforms.uOpacity.value = (rung >= 2 ? 0 : 1) * (1 - mapOn) * THREE.MathUtils.smoothstep(width, 0.4, 0.8);

      // The photograph lies under the surface, then surfaces.
      u.uPhotoOn.value = window4(p, 0.43, 0.48, 0.565, 0.6) * e * (photo ? 1 : 0);
      u.uSurface.value = seg(p, 0.445, 0.495);

      // The map's furniture.
      if (map) map.material.uniforms.uOpacity.value = mapOn * 0.9;
      thread.material.uniforms.uDraw.value = seg(p, 0.3, 0.37) * e;
      thread.material.uniforms.uOpacity.value = mapOn;
      rings.material.uniforms.uOpacity.value = mapOn;

      // DRAG: the camera travels the thread to the locality the band holds.
      const tAlong = along(Math.min(1, Math.max(0, i.drag)));
      thread.at(tAlong, focus);
      rings.material.uniforms.uFocus.value = i.drag * (placed.length - 1);
      panTarget.set(focus.x * mapOn, 0, focus.z * mapOn * 0.6);
      pan.lerp(panTarget, 1 - Math.exp(-i.dt * 6));
      camera.position.add(pan);
      camera.updateMatrixWorld();

      // The hand writes into the water.
      drop.s = 0;
      if (!i.reduced && rung < 2 && width > 0.2) {
        const moved = Math.hypot(i.pointerRaw.x - lastX, i.pointerRaw.y - lastY);
        lastX = i.pointerRaw.x;
        lastY = i.pointerRaw.y;
        const live = (i.pointerSpeed > 40 && moved > 0.0005) || i.pointerDown;
        if (live) {
          ndc.set(i.pointerRaw.x, i.pointerRaw.y);
          ray.setFromCamera(ndc, camera);
          if (ray.ray.intersectPlane(surface, hit)) {
            const ux = hit.x / PLANE_W + 0.5;
            const uz = 0.5 - hit.z / PLANE_D;
            if (ux > 0 && ux < 1 && uz > 0 && uz < 1) {
              const strength = Math.min(1, i.pointerSpeed / 1800) * 0.5 + (i.pointerDown ? 0.9 : 0);
              drop = { x: ux, y: uz, s: strength * (0.4 + 0.6 * Math.max(i.engage, e)) * 0.06 };
            }
          }
        }
      }
      const dim = window4(p, 0.62, 0.66, 0.84, 0.88) * 0.18 * e;
      u.uDim.value = dim;
    },
    prerender(r) {
      renderer = r;
      if (rung >= 2) return;
      simMat.uniforms.uPrev.value = simA.texture;
      simMat.uniforms.uDrop.value.set(drop.x, drop.y);
      simMat.uniforms.uDropS.value = drop.s;
      r.setRenderTarget(simB);
      r.render(simScene, simCam);
      [simA, simB] = [simB, simA];
      waterMat.uniforms.uRipple.value = simA.texture;
    },
    resize(width, height, dpr) {
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      silt.material.uniforms.uPixelRatio.value = dpr;
      rings.material.uniforms.uPixelRatio.value = dpr;
    },
    setRung(r) {
      rung = r;
      silt.points.visible = r < 2;
      if (r >= 2 && renderer) {
        // Flat water: clear the field once so no ripple is left frozen on it.
        renderer.setRenderTarget(simA);
        renderer.clear();
        renderer.setRenderTarget(null);
      }
    },
    dispose() {
      simA.dispose();
      simB.dispose();
      simMat.dispose();
      simQuad.geometry.dispose();
      map?.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        (m.material as THREE.Material | undefined)?.dispose?.();
      });
    },
  };
  return world;
}
