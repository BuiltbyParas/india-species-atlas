import * as THREE from 'three';
import { GLSL_DISSOLVE, GLSL_GRAIN, GLSL_HASH, GLSL_NOISE } from '../../gl/chunks';
import { particleBudget, seededRandom } from '../../gl/particles';
import { CameraRig, type Shot } from '../cameraRig';
import { rgb } from '../gl/color';
import { makeDrift } from '../gl/drift';
import { curve, makeLine } from '../gl/line';
import { GLSL_COVER, loadPhoto } from '../gl/photo';
import { makeHeightfield } from '../gl/terrain';
import { lerp, seg, window4 } from '../noise';
import type { FieldInput, FieldWorld, WorldContext } from '../types';

/**
 * FIELD STUDY 01 · TRACE · the Great Indian Bustard, the Thar.
 *
 * A study in one line. The world is open sand under a low sun — long
 * shadows, dry grass, a little dust on the wind — and across it runs a
 * survey line, the atlas's GeoLine laid on the ground. The hand moves the
 * sun; hovering the featured work starts the line tracing. Scrolled, the
 * line is followed into the distance (RANGE), then becomes infrastructure:
 * pylons rise along it and wires are strung between them (POWER LINE); the
 * record's photograph of the birds rises out of the ground beside it
 * (PHOTOGRAPH); the camera lifts away for the evidence; then the record's
 * own answer is carried out on the line — diverters appear on the wires, the
 * wires go down into the ground, and the line comes back as a protected
 * route (PROTECTION) — before the camera pulls back over the desert.
 *
 * Honesty: the dunes are procedural, an impression of the Thar and not a
 * terrain model; the power line is a schematic, not a mapped alignment (the
 * dataset records the threat for the species, not the route of any line).
 * The study page says both on screen at the moments they matter.
 */

const GROUND_VERTEX = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vNormal;
  varying float vDepth;
  void main() {
    vPos = position;
    vNormal = normal;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const GROUND_FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  ${GLSL_GRAIN}
  uniform vec3 uSun;
  uniform vec3 uLit;
  uniform vec3 uShade;
  uniform vec3 uClay;
  uniform vec3 uHaze;
  uniform float uFog;
  uniform float uDim;
  varying vec3 vPos;
  varying vec3 vNormal;
  varying float vDepth;
  void main() {
    vec3 n = normalize(vNormal);
    // Wind ripples in the sand, as a slight bend of the light, never as geometry.
    float rip = sin(dot(vPos.xz, vec2(0.93, 0.36)) * 2.6 + valueNoise(vPos.xz * 0.25) * 5.0);
    n = normalize(n + vec3(0.05 * rip, 0.0, 0.025 * rip) * (1.0 - smoothstep(30.0, 140.0, vDepth)));
    float ndl = dot(n, uSun);
    // A low sun: a hard terminator, so every crest throws a long shadow.
    float lit = smoothstep(-0.04, 0.3, ndl);
    vec3 col = mix(uShade, uLit, lit);
    col += (ndl > 0.0 ? pow(ndl, 6.0) : 0.0) * 0.06;
    // Clay in the hollows between dunes.
    float clay = smoothstep(0.5, 0.72, fbm3(vPos.xz * 0.018)) * (1.0 - smoothstep(0.4, 3.0, vPos.y));
    col = mix(col, uClay * (0.62 + 0.45 * lit), clay * 0.55);
    float fog = 1.0 - exp(-vDepth * uFog);
    col = mix(col, uHaze, fog);
    col += paperGrain(gl_FragCoord.xy, 0.016);
    col = mix(col, col * 0.62, uDim);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const SKY_VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT = /* glsl */ `
  uniform vec3 uSun;
  uniform vec3 uHaze;
  uniform vec3 uSky;
  uniform vec3 uGlow;
  uniform float uDim;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    vec3 col = mix(uHaze, uSky, smoothstep(-0.02, 0.38, d.y));
    float s = max(dot(d, normalize(uSun)), 0.0);
    col += uGlow * (pow(s, 24.0) * 0.5 + pow(s, 4.0) * 0.12);
    col = mix(col, col * 0.62, uDim);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const GRASS_VERTEX = /* glsl */ `
  attribute float aTip;
  attribute float aPhase;
  uniform float uTime;
  varying float vDepth;
  varying float vTip;
  void main() {
    vec3 p = position;
    float sway = sin(uTime * 1.3 + aPhase * 6.28) * 0.18 + sin(uTime * 0.37 + p.x * 0.05) * 0.22;
    p.x += sway * aTip;
    p.z += sway * 0.4 * aTip;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDepth = -mv.z;
    vTip = aTip;
    gl_Position = projectionMatrix * mv;
  }
`;

const GRASS_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uHaze;
  uniform float uFog;
  uniform float uOpacity;
  varying float vDepth;
  varying float vTip;
  void main() {
    float fog = 1.0 - exp(-vDepth * uFog);
    vec3 col = mix(uColor * (0.7 + 0.5 * vTip), uHaze, fog);
    gl_FragColor = vec4(col, uOpacity * (1.0 - fog * 0.7));
  }
`;

const PYLON_VERTEX = /* glsl */ `
  attribute float aBase;
  attribute float aK;
  uniform float uRise;
  uniform float uBury;
  varying float vDepth;
  void main() {
    vec3 p = position;
    float s = smoothstep(aK * 0.55, aK * 0.55 + 0.45, uRise) * (1.0 - uBury);
    p.y = aBase + (p.y - aBase) * s;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const PYLON_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uHaze;
  uniform float uFog;
  uniform float uOpacity;
  varying float vDepth;
  void main() {
    float fog = 1.0 - exp(-vDepth * uFog);
    gl_FragColor = vec4(mix(uColor, uHaze, fog * 0.9), uOpacity);
  }
`;

const PHOTO_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const PHOTO_FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  ${GLSL_DISSOLVE}
  ${GLSL_COVER}
  uniform sampler2D uMap;
  uniform float uAspect;
  uniform float uPlaneAspect;
  uniform float uReveal;
  uniform vec2 uPointer;
  uniform vec3 uSand;
  uniform vec3 uHaze;
  uniform float uFog;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vec2 uv = coverUv(vUv, uPlaneAspect, uAspect);
    vec3 base = texture2D(uMap, uv).rgb;
    // Depth from light: brighter parts of the print sit a fraction nearer the hand.
    uv += uPointer * (luma(base) - 0.5) * 0.012;
    vec3 col = texture2D(uMap, uv).rgb;
    // The print rises out of the ground: the reveal runs up from its foot, along the grain of the sand.
    float field = vUv.y * 0.72 + fbm3(vUv * vec2(9.0, 3.0)) * 0.28;
    float m = inkEdge(field, uReveal, 0.07);
    float edge = inkEdge(field, uReveal + 0.02, 0.02) - m;
    if (m + edge < 0.01) discard;
    col = mix(col, uSand, clamp(edge, 0.0, 1.0) * 0.9);
    // Its foot settles into the sand.
    col = mix(uSand, col, smoothstep(0.0, 0.05, vUv.y));
    float fog = 1.0 - exp(-vDepth * uFog);
    col = mix(col, uHaze, fog * 0.8);
    gl_FragColor = vec4(col, clamp(m + edge, 0.0, 1.0));
  }
`;

export async function createThar({ species, tier }: WorldContext): Promise<FieldWorld> {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 2000);

  const C = {
    lit: rgb('#e8d3a8'),
    shade: rgb('#9c7a63'),
    clay: rgb('#b07a52'),
    haze: rgb('#ecdcc0'),
    sky: rgb('#d9cfbd'),
    glow: rgb('#fff1d2'),
  };
  const sun = new THREE.Vector3();
  const setSun = (azimuth: number, elevation: number) => {
    sun.set(Math.cos(elevation) * Math.cos(azimuth), Math.sin(elevation), Math.cos(elevation) * Math.sin(azimuth)).normalize();
  };
  setSun(-2.6, 0.24);

  /* the sky */
  const skyMat = new THREE.ShaderMaterial({
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    uniforms: { uSun: { value: sun }, uHaze: { value: C.haze }, uSky: { value: C.sky }, uGlow: { value: C.glow }, uDim: { value: 0 } },
    side: THREE.BackSide,
    depthWrite: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 32, 16), skyMat);
  sky.renderOrder = -10;
  scene.add(sky);

  /* the ground */
  const res = { high: 300, balanced: 210, low: 140 }[tier];
  const ground = await makeHeightfield('dunes', 560, 560, res, res, [0, -200]);
  const fogDensity = 0.0036;
  const groundMat = new THREE.ShaderMaterial({
    vertexShader: GROUND_VERTEX,
    fragmentShader: GROUND_FRAGMENT,
    uniforms: {
      uSun: { value: sun },
      uLit: { value: C.lit },
      uShade: { value: C.shade },
      uClay: { value: C.clay },
      uHaze: { value: C.haze },
      uFog: { value: fogDensity },
      uDim: { value: 0 },
    },
  });
  scene.add(new THREE.Mesh(ground.geometry, groundMat));
  const h = ground.height;

  /* dry grass: a few thousand blades in tufts, as hairlines */
  const rand = seededRandom(23);
  const tufts = particleBudget(1600);
  const blades = 5;
  const gPos = new Float32Array(tufts * blades * 6);
  const gTip = new Float32Array(tufts * blades * 2);
  const gPhase = new Float32Array(tufts * blades * 2);
  for (let t = 0; t < tufts; t++) {
    const x = (rand() - 0.5) * 300;
    const z = 30 - rand() * 320;
    const y = h(x, z);
    const ph = rand();
    for (let b = 0; b < blades; b++) {
      const k = (t * blades + b) * 6;
      const dx = (rand() - 0.5) * 0.9;
      const dz = (rand() - 0.5) * 0.9;
      const len = 0.5 + rand() * 1.1;
      gPos.set([x + dx * 0.2, y, z + dz * 0.2, x + dx, y + len, z + dz], k);
      gTip.set([0, 1], (t * blades + b) * 2);
      gPhase.set([ph, ph], (t * blades + b) * 2);
    }
  }
  const grassGeo = new THREE.BufferGeometry();
  grassGeo.setAttribute('position', new THREE.BufferAttribute(gPos, 3));
  grassGeo.setAttribute('aTip', new THREE.BufferAttribute(gTip, 1));
  grassGeo.setAttribute('aPhase', new THREE.BufferAttribute(gPhase, 1));
  const grassMat = new THREE.ShaderMaterial({
    vertexShader: GRASS_VERTEX,
    fragmentShader: GRASS_FRAGMENT,
    uniforms: { uTime: { value: 0 }, uColor: { value: rgb('#8f7449') }, uHaze: { value: C.haze }, uFog: { value: fogDensity }, uOpacity: { value: 0.85 } },
    transparent: true,
    depthWrite: false,
  });
  const grass = new THREE.LineSegments(grassGeo, grassMat);
  grass.frustumCulled = false;
  scene.add(grass);

  /* dust on the wind */
  const dust = makeDrift({
    count: particleBudget(700),
    min: [-140, 0, -260],
    max: [140, 9, 50],
    wind: [5.5, 0.05, -1.2],
    color: '#f3e6c8',
    size: [0.5, 2.2],
    alpha: [0.08, 0.38],
    sway: 0.4,
    scale: 45,
    seed: 5,
  });
  scene.add(dust.points);

  /* the survey line, laid on the ground */
  const control = [
    [-10, 36],
    [-3, 12],
    [7, -18],
    [3, -58],
    [15, -98],
    [9, -146],
    [26, -196],
    [19, -246],
    [36, -306],
  ].map(([x, z]) => new THREE.Vector3(x, 0, z));
  const flat = curve(control, 420);
  const onSand = flat.map((p) => new THREE.Vector3(p.x, Math.max(h(p.x, p.z), h(p.x + 1, p.z), h(p.x, p.z + 1)) + 0.5, p.z));
  const fog = { color: '#ecdcc0', near: 120, far: 520 };
  const survey = makeLine(onSand, { width: 2.4, color: '#6e3517', nib: 1, fog });
  scene.add(survey.mesh);
  const protect = makeLine(
    onSand.map((p) => p.clone().setY(p.y + 0.05)),
    { width: 2.6, color: '#2f6a84', nib: 1, fog },
  );
  protect.material.uniforms.uDraw.value = 0;
  scene.add(protect.mesh);

  /* the schematic power line: pylons along the survey line, three wires strung between them */
  const pylonCount = 11;
  const pylonT = Array.from({ length: pylonCount }, (_, i) => 0.06 + (i / (pylonCount - 1)) * 0.6);
  const arms: THREE.Vector3[][] = [[], [], []];
  const pv: number[] = [];
  const pBase: number[] = [];
  const pK: number[] = [];
  const tangent = new THREE.Vector3();
  pylonT.forEach((t, i) => {
    const at = survey.at(t);
    survey.at(Math.min(1, t + 0.01), tangent).sub(at).setY(0).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x);
    const base = h(at.x, at.z);
    const k = i / (pylonCount - 1);
    const P = (sx: number, y: number, along = 0) =>
      new THREE.Vector3(at.x + side.x * sx + tangent.x * along, base + y, at.z + side.z * sx + tangent.z * along);
    const segs: Array<[THREE.Vector3, THREE.Vector3]> = [];
    // Two legs that taper, braced in four sections; two cross-arms; a peak.
    const levels = [0, 4, 8, 11.5, 14];
    const width = (y: number) => 1.8 - (y / 14) * 1.35;
    for (let l = 0; l < levels.length - 1; l++) {
      const y0 = levels[l];
      const y1 = levels[l + 1];
      segs.push([P(-width(y0), y0), P(-width(y1), y1)], [P(width(y0), y0), P(width(y1), y1)]);
      segs.push([P(-width(y0), y0), P(width(y1), y1)], [P(width(y0), y0), P(-width(y1), y1)]);
    }
    segs.push([P(-5, 11.5), P(5, 11.5)], [P(-3.6, 14), P(3.6, 14)], [P(-0.45, 14), P(0, 16)], [P(0.45, 14), P(0, 16)]);
    segs.push([P(-5, 11.5), P(-width(8), 8)], [P(5, 11.5), P(width(8), 8)]);
    for (const [a, b] of segs) {
      pv.push(a.x, a.y, a.z, b.x, b.y, b.z);
      pBase.push(base, base);
      pK.push(k, k);
    }
    arms[0].push(P(-5, 11.2));
    arms[1].push(P(5, 11.2));
    arms[2].push(P(0, 13.7));
  });
  const pylonGeo = new THREE.BufferGeometry();
  pylonGeo.setAttribute('position', new THREE.Float32BufferAttribute(pv, 3));
  pylonGeo.setAttribute('aBase', new THREE.Float32BufferAttribute(pBase, 1));
  pylonGeo.setAttribute('aK', new THREE.Float32BufferAttribute(pK, 1));
  const pylonMat = new THREE.ShaderMaterial({
    vertexShader: PYLON_VERTEX,
    fragmentShader: PYLON_FRAGMENT,
    uniforms: { uRise: { value: 0 }, uBury: { value: 0 }, uColor: { value: rgb('#4a3424') }, uHaze: { value: C.haze }, uFog: { value: fogDensity }, uOpacity: { value: 0.9 } },
    transparent: true,
    depthWrite: false,
  });
  const pylons = new THREE.LineSegments(pylonGeo, pylonMat);
  pylons.frustumCulled = false;
  scene.add(pylons);

  const wireGroup = new THREE.Group();
  scene.add(wireGroup);
  const wires = arms.map((tips) => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < tips.length - 1; i++) {
      const a = tips[i];
      const b = tips[i + 1];
      for (let s = 0; s < 24; s++) {
        const t = s / 24;
        const p = new THREE.Vector3().lerpVectors(a, b, t);
        p.y -= 2.4 * 4 * t * (1 - t);
        pts.push(p);
      }
    }
    pts.push(tips[tips.length - 1].clone());
    // Dashed: the schematic's idiom (geo/line/GeoLine.tsx, role "schematic").
    const wire = makeLine(pts, { width: 1.15, color: '#3a2618', dash: 0.62, dashCount: 260, nib: 0, fog });
    wire.material.uniforms.uDraw.value = 0;
    wireGroup.add(wire.mesh);
    return wire;
  });

  /* bird diverters, hung on the wires: the record's first answer to the line */
  const dv: number[] = [];
  const dk: number[] = [];
  wires.forEach((w, wi) => {
    for (let i = 0; i < 70; i++) {
      const t = (i + 0.5 + wi * 0.33) / 70;
      const p = w.at(t);
      dv.push(p.x, p.y - 0.25, p.z);
      dk.push(t);
    }
  });
  const divGeo = new THREE.BufferGeometry();
  divGeo.setAttribute('position', new THREE.Float32BufferAttribute(dv, 3));
  divGeo.setAttribute('aK', new THREE.Float32BufferAttribute(dk, 1));
  const divMat = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      attribute float aK;
      uniform float uShow;
      uniform float uPixelRatio;
      varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        vA = smoothstep(aK, aK + 0.08, uShow * 1.08);
        gl_PointSize = vA * uPixelRatio * 300.0 / max(-mv.z, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        gl_FragColor = vec4(uColor, (1.0 - smoothstep(0.38, 0.5, d)) * vA * uOpacity);
      }
    `,
    uniforms: { uShow: { value: 0 }, uPixelRatio: { value: 1 }, uColor: { value: rgb('#e0812b') }, uOpacity: { value: 1 } },
    transparent: true,
    depthWrite: false,
  });
  const diverters = new THREE.Points(divGeo, divMat);
  diverters.frustumCulled = false;
  wireGroup.add(diverters);

  /* the photograph, standing in the sand beside the line */
  const photo = await loadPhoto(species, tier);
  const photoAt = survey.at(0.46).add(new THREE.Vector3(34, 0, 10));
  const photoBase = h(photoAt.x, photoAt.z) - 0.4;
  const photoW = 30;
  const photoH = photoW / (photo?.aspect ?? 4 / 3);
  const photoMat = new THREE.ShaderMaterial({
    vertexShader: PHOTO_VERTEX,
    fragmentShader: PHOTO_FRAGMENT,
    uniforms: {
      uMap: { value: photo?.texture ?? null },
      uAspect: { value: photo?.aspect ?? 4 / 3 },
      uPlaneAspect: { value: photoW / photoH },
      uReveal: { value: 0 },
      uPointer: { value: new THREE.Vector2() },
      uSand: { value: C.lit },
      uHaze: { value: C.haze },
      uFog: { value: fogDensity * 0.5 },
    },
    transparent: true,
    depthWrite: false,
  });
  const photoPlane = new THREE.Mesh(new THREE.PlaneGeometry(photoW, photoH), photoMat);
  photoPlane.position.set(photoAt.x, photoBase + photoH / 2, photoAt.z);
  const photoFacing = new THREE.Vector3(-0.55, 0, 1).normalize();
  photoPlane.lookAt(photoPlane.position.clone().add(photoFacing));
  photoPlane.visible = Boolean(photo);
  scene.add(photoPlane);

  /* the camera */
  const above = (x: number, z: number, lift: number): [number, number, number] => [x, h(x, z) + lift, z];
  const L = (t: number, d: [number, number, number] = [0, 0, 0]): [number, number, number] => {
    const p = survey.at(t);
    return [p.x + d[0], p.y + d[1], p.z + d[2]];
  };
  const N = 7;
  const at = (i: number) => (i + 0.5) / N;
  // The print stands right of centre, so the chapter's words have the sand to its left.
  const photoSide = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), photoFacing).normalize();
  const photoCam = photoPlane.position.clone().addScaledVector(photoFacing, 60).addScaledVector(photoSide, -11);
  const photoLook = photoPlane.position.clone().addScaledVector(photoSide, -11);
  const path: Shot[] = [
    { at: 0, pos: above(-38, 62, 26), look: [6, 0, -130], fov: 42 },
    { at: at(0), pos: above(-34, 54, 22), look: [8, 0, -130], fov: 40 },
    { at: at(1), pos: L(0.2, [-7, 6.5, 13]), look: L(0.38, [0, 1, 0]), fov: 40 },
    { at: at(2), pos: L(0.2, [30, 9, 12]), look: L(0.42, [0, 7, 0]), fov: 38 },
    { at: at(3), pos: [photoCam.x, photoCam.y + 1.5, photoCam.z], look: [photoLook.x, photoLook.y, photoLook.z], fov: 34 },
    { at: at(4), pos: [-10, 150, -20], look: [14, 0, -150], fov: 44 },
    { at: at(5), pos: L(0.22, [26, 8, 15]), look: L(0.48, [0, 4, 0]), fov: 38 },
    { at: at(6), pos: above(-62, 110, 58), look: [10, 0, -150], fov: 44 },
    { at: 1, pos: above(-66, 120, 64), look: [10, 0, -150], fov: 45 },
  ];
  const rig = new CameraRig(camera, {
    preview: { at: 0, pos: above(-30, 48, 9), look: [12, 2, -90], fov: 38 },
    engage: { at: 0, pos: above(-25, 40, 7.5), look: [10, 1.5, -80], fov: 34 },
    path,
    sway: [4, 2.2],
    lambda: 5.5,
  });

  let rung = 0;
  const pointer2 = new THREE.Vector2();

  return {
    scene,
    camera,
    clear: '#ecdcc0',
    update(i: FieldInput) {
      const p = i.progress;
      const e = i.enter;
      rig.update({ engage: i.engage, enter: e, progress: p, pointer: i.pointer, dt: i.dt, snap: i.snap || i.reduced });

      // The hand moves the sun; the low sun drops further as the study closes.
      const az = -2.6 + i.pointer.x * 0.22 + i.engage * 0.08 * (1 - e);
      const el = lerp(0.24, 0.16, seg(p, 0.86, 1) * e) + i.pointer.y * 0.035;
      setSun(az, el);

      // Preview: the line has begun; the hand starts it tracing.
      const previewDraw = 0.12 + i.engage * 0.3;
      const studyDraw = lerp(0.14, 1, seg(p, 0.08, 0.27));
      survey.material.uniforms.uDraw.value = lerp(previewDraw, studyDraw, e);
      // The survey line gives way to the infrastructure built along it, and later returns as the protected route.
      survey.material.uniforms.uOpacity.value = 1 - 0.75 * seg(p, 0.3, 0.4) * e;

      const rise = seg(p, 0.29, 0.41) * e;
      const bury = seg(p, 0.775, 0.84) * e;
      pylonMat.uniforms.uRise.value = rise;
      pylonMat.uniforms.uBury.value = bury;
      pylonMat.uniforms.uOpacity.value = 0.9 * (1 - bury);
      pylons.visible = rise > 0.001 && bury < 0.999;
      const wireDraw = seg(p, 0.31, 0.43) * e;
      for (const w of wires) {
        w.material.uniforms.uDraw.value = wireDraw;
        w.material.uniforms.uOpacity.value = 0.95 * (1 - bury);
      }
      wireGroup.position.y = -14 * bury * bury;
      wireGroup.visible = wireDraw > 0.001 && bury < 0.999;
      divMat.uniforms.uShow.value = seg(p, 0.715, 0.755) * e;
      divMat.uniforms.uOpacity.value = 1 - bury;
      protect.material.uniforms.uDraw.value = seg(p, 0.8, 0.9) * e;

      // The photograph rises out of the sand, holds, and goes back into it.
      const reveal = window4(p, 0.42, 0.52, 0.6, 0.67) * e;
      photoMat.uniforms.uReveal.value = reveal;
      photoPlane.visible = reveal > 0.001 && Boolean(photo);
      pointer2.set(i.pointer.x, i.pointer.y);
      photoMat.uniforms.uPointer.value.copy(pointer2);

      // The evidence is read over a quieter ground.
      const dim = window4(p, 0.55, 0.6, 0.69, 0.74) * 0.32 * e;
      groundMat.uniforms.uDim.value = dim;
      skyMat.uniforms.uDim.value = dim;

      const t = i.reduced ? 0 : i.time;
      grassMat.uniforms.uTime.value = t;
      dust.material.uniforms.uTime.value = t;
      dust.material.uniforms.uOpacity.value = rung >= 2 ? 0 : 1;
    },
    resize(width, height, dpr) {
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      dust.material.uniforms.uPixelRatio.value = dpr;
      divMat.uniforms.uPixelRatio.value = dpr;
    },
    setRung(r) {
      rung = r;
      grassGeo.setDrawRange(0, r >= 1 ? Math.floor(gPos.length / 3 / 2) : Infinity);
      dust.points.visible = r < 2;
    },
    dispose() {
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        (m.material as THREE.Material | undefined)?.dispose?.();
      });
    },
  };
}
