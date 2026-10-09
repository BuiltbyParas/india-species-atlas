import * as THREE from 'three';
import { GLSL_GRAIN, GLSL_HASH, GLSL_NOISE } from '../../gl/chunks';
import { seededRandom } from '../../gl/particles';
import { CameraRig, type Shot } from '../cameraRig';
import { rgb } from '../gl/color';
import { makeHeightfield } from '../gl/terrain';
import { fbm, lerp, seg } from '../noise';
import habitatUrl from '../../../assets/field/great-indian-bustard-habitat.webp';
import type { FieldInput, FieldWorld, WorldContext } from '../types';

/**
 * FIELD STUDY 01 · the Great Indian Bustard, the Thar's arid grassland.
 *
 * Open ground under a low, warm sun: gravel and sand in buff and red-brown
 * patches, clumps of dry sewan-type grass, thorn scrub gathered on the
 * flanks, a long soft horizon and a high pale sky. The birds stand where the
 * record's photograph puts them, at the edge of thorn scrub on dry grass; the
 * photograph is set into the drawn ground as a standing panel whose edges
 * dissolve into the haze and whose foot is hidden by a row of tall grass, so
 * it reads as one place and not a picture on a plane.
 *
 * The camera does the rest: a wide first view, a low walk across the grass
 * (RANGE), the same birds from the other side (THREAT), close (the
 * photograph chapter), lifted away for the evidence, down among the grass for
 * what protects it, and a pull back as the sun drops.
 *
 * Nothing here is added to make the scene "do" something. There is no line,
 * no tower, no particle and no overlay: the threat the record names is in
 * the words, because the record gives no route for it.
 *
 * Honesty: the ground, grass and scrub are drawn, an impression of the
 * Thar's grassland and not a terrain model; the birds are the record's own
 * photograph (Dr. Raju Kasambe, CC BY-SA 4.0), cropped, not cut out.
 */

const FOG = 0.0034;

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
  uniform vec3 uWarm;
  uniform vec3 uSand;
  uniform vec3 uEarth;
  uniform vec3 uStone;
  uniform vec3 uStraw;
  uniform vec3 uHaze;
  uniform float uFog;
  uniform float uDim;
  varying vec3 vPos;
  varying vec3 vNormal;
  varying float vDepth;
  void main() {
    vec3 n = normalize(vNormal);
    float lit = clamp(dot(n, uSun) * 0.8 + 0.5, 0.0, 1.0);
    float near = 1.0 - smoothstep(60.0, 260.0, vDepth);

    // Patches of buff sand, red-brown earth and pale gravel, at three scales.
    float patchA = fbm3(vPos.xz * 0.011);
    float patchB = fbm3(vPos.xz * 0.045 + 9.0);
    vec3 col = mix(uSand, uEarth, smoothstep(0.42, 0.7, patchA) * 0.85);
    col = mix(col, uStone, smoothstep(0.55, 0.78, patchB) * 0.5 * smoothstep(0.35, 0.6, fbm3(vPos.xz * 0.02 + 3.0)));

    // Where the grass lies thick the ground is straw, not sand.
    float cover = smoothstep(0.36, 0.64, fbm3(vPos.xz * 0.02 + 31.0));
    col = mix(col, uStraw, cover * 0.42);

    // Tussock footprints: darker at the base, straw around, gone in the distance.
    vec2 cp = vPos.xz / 3.4;
    vec2 ci = floor(cp);
    vec2 cf = fract(cp) - 0.5;
    float hh = hash12(ci);
    vec2 off = (vec2(hash12(ci + 3.1), hash12(ci + 7.7)) - 0.5) * 0.5;
    float d = length(cf - off);
    float tuft = (1.0 - smoothstep(0.1, 0.36, d)) * step(0.32, hh) * cover * (1.0 - smoothstep(120.0, 380.0, vDepth));
    col = mix(col, uStraw * (0.62 + 0.4 * hh), tuft * 0.8);
    col *= 1.0 - tuft * 0.16 * (1.0 - smoothstep(0.0, 0.2, d));

    // Pebbles, only where there is something to see.
    float peb = step(0.94, hash12(floor(vPos.xz * 5.0))) * near * (1.0 - cover);
    col = mix(col, uStone * 1.08, peb * 0.55);

    col *= mix(0.7, 1.08, lit) * mix(vec3(1.0), uWarm, 0.45 * lit);

    float fog = 1.0 - exp(-vDepth * uFog);
    col = mix(col, uHaze, fog);
    col += paperGrain(gl_FragCoord.xy, 0.012);
    col = mix(col, col * 0.64, uDim);
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
  ${GLSL_HASH}
  ${GLSL_NOISE}
  uniform vec3 uSun;
  uniform vec3 uHaze;
  uniform vec3 uSky;
  uniform vec3 uGlow;
  uniform float uDim;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    vec3 col = mix(uHaze, uSky, smoothstep(-0.02, 0.5, d.y));
    float s = max(dot(d, normalize(uSun)), 0.0);
    col += uGlow * (pow(s, 40.0) * 0.5 + pow(s, 5.0) * 0.14);
    // High, thin cloud that thins toward the horizon.
    vec2 cp = d.xz / (d.y + 0.22) * 1.3;
    float c = fbm3(cp * 1.4) * 0.6 + fbm3(cp * 4.0) * 0.4;
    col = mix(col, vec3(1.0, 0.97, 0.9), smoothstep(0.52, 0.76, c) * 0.26 * smoothstep(0.02, 0.3, d.y));
    col = mix(col, col * 0.64, uDim);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const GRASS_VERTEX = /* glsl */ `
  attribute float aTip;
  attribute float aShade;
  attribute vec4 aInst;
  attribute vec4 aRand;
  uniform float uTime;
  varying float vTip;
  varying float vShade;
  varying float vRand;
  varying float vGreen;
  varying float vDepth;
  varying vec3 vWorld;
  void main() {
    float a = aRand.x * 6.28318;
    mat2 R = mat2(cos(a), -sin(a), sin(a), cos(a));
    vec3 p = position * aInst.w;
    p.xz = R * p.xz;
    float wind = sin(uTime * 1.1 + aRand.z * 6.28 + aInst.x * 0.05) * 0.5 + sin(uTime * 0.43 + aInst.z * 0.04) * 0.5;
    p.x += wind * aTip * aTip * aInst.w * 0.13;
    p.z += wind * aTip * aTip * aInst.w * 0.05;
    vec3 w = aInst.xyz + p;
    vWorld = w;
    vTip = aTip;
    vShade = aShade;
    vRand = aRand.y;
    vGreen = step(0.87, aRand.w);
    vec4 mv = viewMatrix * vec4(w, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const GRASS_FRAGMENT = /* glsl */ `
  uniform vec3 uHaze;
  uniform vec3 uSun;
  uniform vec3 uWarm;
  uniform float uFog;
  uniform float uDim;
  varying float vTip;
  varying float vShade;
  varying float vRand;
  varying float vGreen;
  varying float vDepth;
  varying vec3 vWorld;
  void main() {
    vec3 base = mix(vec3(0.43, 0.35, 0.18), vec3(0.6, 0.5, 0.27), vRand);
    vec3 tip = mix(vec3(0.86, 0.77, 0.52), vec3(0.78, 0.68, 0.45), vRand);
    vec3 col = mix(base, tip, pow(vTip, 1.15)) * (0.82 + 0.3 * vShade);
    col = mix(col, vec3(0.55, 0.55, 0.33) * (0.7 + 0.5 * vTip), vGreen * 0.6);
    // Backlit by a low sun: the tips glow when the camera looks toward it.
    vec3 V = normalize(cameraPosition - vWorld);
    float back = smoothstep(0.0, 0.9, -dot(V, normalize(uSun)));
    col += uWarm * back * pow(vTip, 2.0) * 0.32;
    col *= 0.9 + 0.1 * vTip;
    float fog = 1.0 - exp(-vDepth * uFog);
    col = mix(col, uHaze, fog);
    col = mix(col, col * 0.64, uDim);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const SCRUB_VERTEX = /* glsl */ `
  attribute float aSeed;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vDepth;
  varying float vSeed;
  varying float vUp;
  void main() {
    vec3 p = position;
    float bump = sin(p.x * 4.6 + aSeed * 17.0) * sin(p.y * 4.0 + aSeed * 9.0) * sin(p.z * 5.2 + aSeed * 3.0);
    p *= 1.0 + 0.11 * bump;
    p.y *= 0.62;
    vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.0);
    vWorld = w.xyz;
    vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
    vSeed = aSeed;
    vUp = position.y;
    vec4 mv = viewMatrix * w;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const SCRUB_FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  uniform vec3 uSun;
  uniform vec3 uWarm;
  uniform vec3 uHaze;
  uniform float uFog;
  uniform float uDim;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vDepth;
  varying float vSeed;
  varying float vUp;
  void main() {
    vec3 n = normalize(vNormal);
    float lit = clamp(dot(n, uSun) * 0.7 + 0.5, 0.0, 1.0);
    // Thorn scrub: grey-olive foliage in small clumps, dead straw showing through.
    vec3 q3 = vWorld + vec3(vSeed * 20.0);
    float leaf = valueNoise(q3.xz * 1.9 + q3.y * 2.3) * 0.55 + valueNoise(q3.xz * 5.5 + q3.y * 4.0) * 0.45;
    float twig = valueNoise(q3.xz * 3.4 + q3.y * 6.0);
    vec3 col = mix(vec3(0.24, 0.21, 0.12), vec3(0.52, 0.45, 0.26), smoothstep(0.25, 0.8, leaf));
    col = mix(col, vec3(0.7, 0.58, 0.34), smoothstep(0.5, 0.8, twig) * 0.65);
    col *= mix(0.68, 1.1, lit) * mix(vec3(1.0), uWarm, 0.35 * lit);
    col *= 0.78 + 0.3 * smoothstep(-0.3, 0.9, vUp);
    float fog = 1.0 - exp(-vDepth * uFog);
    col = mix(col, uHaze, fog);
    col = mix(col, col * 0.64, uDim);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const PANEL_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

/**
 * The habitat panel: the record's photograph, its edges given to the air. The
 * thorn scrub above the birds thins into haze, the sides fade, and the foot
 * breaks along a grassy edge (a row of tall grass stands in front of it).
 */
const PANEL_FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  uniform sampler2D uMap;
  uniform vec3 uHaze;
  uniform vec3 uWarm;
  uniform float uFog;
  uniform float uDim;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vec3 col = texture2D(uMap, vUv).rgb * vec3(1.03, 1.0, 0.94) * mix(vec3(1.0), uWarm, 0.18);
    // The photograph was taken through heat haze: give it back some of its contrast.
    col = clamp((col - 0.5) * 1.18 + 0.5 - 0.02, 0.0, 1.0);
    float n = valueNoise(vec2(vUv.x * 46.0, vUv.y * 9.0));
    float n2 = valueNoise(vec2(vUv.x * 7.0, vUv.y * 5.0 + 4.0));
    float top = smoothstep(0.62, 0.97, vUv.y + (n2 - 0.5) * 0.14);
    float foot = smoothstep(0.0, 0.06, vUv.y + (n - 0.5) * 0.06);
    float sideL = smoothstep(0.0, 0.24, vUv.x + (n2 - 0.5) * 0.14);
    float sideR = smoothstep(0.0, 0.2, 1.0 - vUv.x + (n2 - 0.5) * 0.14);
    // Toward the top the scrub is seen through more air.
    col = mix(col, uHaze * 0.96, top * 0.4);
    float fog = 1.0 - exp(-vDepth * uFog * 0.25);
    col = mix(col, uHaze, fog);
    col = mix(col, col * 0.64, uDim);
    float a = foot * sideL * sideR * (1.0 - top);
    gl_FragColor = vec4(col, a);
  }
`;

/** One tussock of dry grass, in its own unit space: nine blades, each a three-triangle taper. */
function tussockGeometry(): THREE.InstancedBufferGeometry {
  const rand = seededRandom(31);
  const pos: number[] = [];
  const tip: number[] = [];
  const shade: number[] = [];
  const idx: number[] = [];
  for (let b = 0; b < 9; b++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * 0.28;
    const bx = Math.cos(a) * r;
    const bz = Math.sin(a) * r;
    const lean = rand() * Math.PI * 2;
    const lx = Math.cos(lean);
    const lz = Math.sin(lean);
    const len = 0.55 + rand() * 0.5;
    const bend = 0.25 + rand() * 0.5;
    const w = 0.05 + rand() * 0.035;
    const wx = -lz;
    const wz = lx;
    const s = rand();
    const i0 = pos.length / 3;
    const push = (x: number, y: number, z: number, t: number) => {
      pos.push(x, y, z);
      tip.push(t);
      shade.push(s);
    };
    push(bx - wx * w, 0, bz - wz * w, 0);
    push(bx + wx * w, 0, bz + wz * w, 0);
    push(bx + lx * bend * len * 0.25 - wx * w * 0.7, len * 0.5, bz + lz * bend * len * 0.25 - wz * w * 0.7, 0.5);
    push(bx + lx * bend * len * 0.25 + wx * w * 0.7, len * 0.5, bz + lz * bend * len * 0.25 + wz * w * 0.7, 0.5);
    push(bx + lx * bend * len, len, bz + lz * bend * len, 1);
    idx.push(i0, i0 + 1, i0 + 2, i0 + 1, i0 + 3, i0 + 2, i0 + 2, i0 + 3, i0 + 4);
  }
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aTip', new THREE.Float32BufferAttribute(tip, 1));
  g.setAttribute('aShade', new THREE.Float32BufferAttribute(shade, 1));
  g.setIndex(idx);
  return g;
}

export async function createThar({ tier }: WorldContext): Promise<FieldWorld> {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 2400);

  const C = {
    haze: rgb('#ecdcc0'),
    sky: rgb('#b7c7cf'),
    glow: rgb('#fff1d2'),
    sand: rgb('#d9c496'),
    earth: rgb('#a9764d'),
    stone: rgb('#cdb98f'),
    straw: rgb('#bba15e'),
  };
  const sun = new THREE.Vector3();
  const setSun = (azimuth: number, elevation: number) => {
    sun.set(Math.cos(elevation) * Math.cos(azimuth), Math.sin(elevation), Math.cos(elevation) * Math.sin(azimuth)).normalize();
  };
  setSun(-2.6, 0.3);
  const warm = new THREE.Vector3(1.0, 0.94, 0.82);
  const warmLate = new THREE.Vector3(1.0, 0.8, 0.58);
  const shared = {
    uSun: { value: sun },
    uWarm: { value: warm.clone() },
    uHaze: { value: C.haze },
    uFog: { value: FOG },
    uDim: { value: 0 },
  };

  /* the sky */
  const skyMat = new THREE.ShaderMaterial({
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    uniforms: { ...shared, uSky: { value: C.sky }, uGlow: { value: C.glow } },
    side: THREE.BackSide,
    depthWrite: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1900, 32, 16), skyMat);
  sky.renderOrder = -10;
  scene.add(sky);

  /* the ground */
  const res = { high: 300, balanced: 210, low: 140 }[tier];
  const ground = await makeHeightfield('grassland', 760, 760, res, res, [0, -250]);
  const h = ground.height;
  const groundMat = new THREE.ShaderMaterial({
    vertexShader: GROUND_VERTEX,
    fragmentShader: GROUND_FRAGMENT,
    uniforms: {
      ...shared,
      uSand: { value: C.sand },
      uEarth: { value: C.earth },
      uStone: { value: C.stone },
      uStraw: { value: C.straw },
    },
  });
  scene.add(new THREE.Mesh(ground.geometry, groundMat));

  /* where the birds stand, and the panel behind them */
  const P = new THREE.Vector3(12, 0, -44);
  P.y = h(P.x, P.z);
  const facing = new THREE.Vector3(-0.22, 0, 1).normalize();
  const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), facing).normalize();
  const panelW = 36;
  const panelH = (panelW * 1038) / 2000;
  const texture = await new THREE.TextureLoader().loadAsync(habitatUrl);
  texture.colorSpace = THREE.NoColorSpace;
  texture.anisotropy = 4;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  const panelMat = new THREE.ShaderMaterial({
    vertexShader: PANEL_VERTEX,
    fragmentShader: PANEL_FRAGMENT,
    uniforms: { ...shared, uMap: { value: texture } },
    transparent: true,
    depthWrite: false,
  });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(panelW, panelH), panelMat);
  panel.position.set(P.x, P.y - 1.2 + panelH / 2, P.z);
  panel.lookAt(panel.position.clone().add(facing));
  scene.add(panel);
  // The middle of the birds, as the camera looks at them.
  const birds = new THREE.Vector3(P.x, P.y + 8, P.z);

  /* the grass: tussocks, patchy, a taller row standing in front of the panel */
  const rand = seededRandom(23);
  const count = { high: 9500, balanced: 6200, low: 3200 }[tier];
  const front = { high: 380, balanced: 280, low: 160 }[tier];
  const inst = new Float32Array((count + front) * 4);
  const rnd = new Float32Array((count + front) * 4);
  let placed = 0;
  const put = (x: number, z: number, scale: number) => {
    inst.set([x, h(x, z) - 0.15, z, scale], placed * 4);
    rnd.set([rand(), rand(), rand(), rand()], placed * 4);
    placed++;
  };
  // The tall row in front of the panel first, so reduced quality never takes it away.
  for (let i = 0; i < front; i++) {
    const x = P.x - 22 + rand() * 44;
    const z = P.z + 1 + rand() * 8;
    put(x, z, 2.6 + rand() * 1.5);
  }
  for (let tries = 0; placed < count + front && tries < count * 8; tries++) {
    const x = -150 + rand() * 320;
    const z = 95 - rand() * 250;
    // Patchy: more where the ground says the grass is thick.
    if (fbm(x * 0.02 + 31, z * 0.02, 3, 99) + (rand() - 0.5) * 0.25 < 0.4) continue;
    put(x, z, 1.6 + rand() * 1.5);
  }
  const grassGeo = tussockGeometry();
  grassGeo.setAttribute('aInst', new THREE.InstancedBufferAttribute(inst, 4));
  grassGeo.setAttribute('aRand', new THREE.InstancedBufferAttribute(rnd, 4));
  grassGeo.instanceCount = placed;
  const grassMat = new THREE.ShaderMaterial({
    vertexShader: GRASS_VERTEX,
    fragmentShader: GRASS_FRAGMENT,
    uniforms: { ...shared, uTime: { value: 0 } },
    side: THREE.DoubleSide,
  });
  const grass = new THREE.Mesh(grassGeo, grassMat);
  grass.frustumCulled = false;
  scene.add(grass);

  /* thorn scrub, gathered on the flanks and far out, never on the birds */
  const scrubCount = { high: 60, balanced: 42, low: 24 }[tier];
  const scrubGeo = new THREE.IcosahedronGeometry(1, 4);
  const seeds = new Float32Array(scrubCount);
  const scrubMat = new THREE.ShaderMaterial({
    vertexShader: SCRUB_VERTEX,
    fragmentShader: SCRUB_FRAGMENT,
    uniforms: { ...shared },
  });
  const scrub = new THREE.InstancedMesh(scrubGeo, scrubMat, scrubCount);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  let n = 0;
  for (let tries = 0; n < scrubCount - 5 && tries < 4000; tries++) {
    const x = -230 + rand() * 440;
    const z = -40 - rand() * 330;
    if (Math.abs(x - P.x) < 40 && z > P.z - 70) continue;
    if (fbm(x * 0.012 + 5, z * 0.012, 3, 57) < 0.5) continue;
    const sc = 2.4 + rand() * 4.2;
    e.set(0, rand() * Math.PI, 0);
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(x, h(x, z) + sc * 0.18, z), q, new THREE.Vector3(sc * (1 + rand() * 0.5), sc, sc * (0.9 + rand() * 0.4)));
    scrub.setMatrixAt(n, m);
    seeds[n++] = rand();
  }
  // Scrub deliberately behind and beside the panel, so its feathered edges melt into it.
  // Each dome's front is kept behind the panel (z = panel − radius − gap).
  const flank: Array<[number, number]> = [
    [-1, 12],
    [-24, 8],
    [25, 9],
    [-38, 6],
    [40, 7],
  ];
  for (const [dx, sc] of flank) {
    if (n >= scrubCount) break;
    const x = P.x + dx;
    const z = P.z - sc - 2.5 - Math.abs(dx) * 0.1;
    e.set(0, rand() * Math.PI, 0);
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(x, h(x, z) + sc * 0.1, z), q, new THREE.Vector3(sc * 1.25, sc, sc));
    scrub.setMatrixAt(n, m);
    seeds[n++] = rand();
  }
  scrub.count = n;
  scrubGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  scrub.frustumCulled = false;
  scene.add(scrub);

  /* the camera */
  const above = (x: number, z: number, lift: number): [number, number, number] => [x, h(x, z) + lift, z];
  const V = (v: THREE.Vector3, dx = 0, dy = 0, dz = 0): [number, number, number] => [v.x + dx, v.y + dy, v.z + dz];
  const N = 7;
  const at = (i: number) => (i + 0.5) / N;
  // The birds sit right of centre in the opening frames, so the title has the ground to its left.
  const lookRight = V(birds, -side.x * 12, 7, -side.z * 12);
  const lookLeft = V(birds, side.x * 13, -2, side.z * 13);
  const close = P.clone().addScaledVector(facing, 34).addScaledVector(side, -4);
  const path: Shot[] = [
    { at: 0, pos: above(-8, 10, 6.5), look: lookRight, fov: 38 },
    { at: at(0), pos: above(-6, 8, 6.5), look: lookRight, fov: 38 },
    { at: at(1), pos: above(-46, 10, 5), look: [30, P.y + 5, -90], fov: 44 },
    { at: at(2), pos: above(48, 28, 6.5), look: lookLeft, fov: 38 },
    { at: at(3), pos: above(close.x, close.z, 6), look: V(birds, -side.x * 5, 0.4, -side.z * 5), fov: 34 },
    { at: at(4), pos: above(-14, 40, 36), look: [8, P.y, -70], fov: 44 },
    { at: at(5), pos: above(-6, 52, 9), look: V(birds, side.x * 21, -1.5, side.z * 21), fov: 38 },
    { at: at(6), pos: above(-50, 28, 70), look: [10, P.y, -110], fov: 46 },
    { at: 1, pos: above(-54, 30, 76), look: [10, P.y, -110], fov: 47 },
  ];
  const rig = new CameraRig(camera, {
    preview: { at: 0, pos: above(-10, 12, 7), look: lookRight, fov: 38 },
    engage: { at: 0, pos: above(-4, 2, 6), look: lookRight, fov: 34 },
    path,
    sway: [3.5, 2],
    lambda: 5.5,
  });

  return {
    scene,
    camera,
    clear: '#ecdcc0',
    update(i: FieldInput) {
      const p = i.progress;
      const en = i.enter;
      rig.update({ engage: i.engage, enter: en, progress: p, pointer: i.pointer, dt: i.dt, snap: i.snap || i.reduced });

      // The hand turns the sun a little; the sun is low and drops further as the study closes.
      const late = seg(p, 0.86, 1) * en;
      setSun(-2.6 + i.pointer.x * 0.12, lerp(0.3, 0.2, late) + i.pointer.y * 0.02);
      shared.uWarm.value.lerpVectors(warm, warmLate, late);

      // The evidence is read over a quieter ground.
      const dim = Math.min(seg(p, 0.55, 0.6), 1 - seg(p, 0.69, 0.74)) * 0.3 * en;
      shared.uDim.value = Math.max(0, dim);

      grassMat.uniforms.uTime.value = i.reduced ? 0 : i.time;
    },
    resize(width, height) {
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    },
    setRung(r) {
      grassGeo.instanceCount = r >= 2 ? Math.floor(placed * 0.4) : r >= 1 ? Math.floor(placed * 0.65) : placed;
    },
    dispose() {
      texture.dispose();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose();
        (mesh.material as THREE.Material | undefined)?.dispose?.();
      });
    },
  };
}
