import * as THREE from 'three';
import { GLSL_HASH, GLSL_NOISE } from '../../gl/chunks';
import { seededRandom } from '../../gl/particles';
import { CameraRig, type Shot } from '../cameraRig';
import { lin } from '../gl/color';
import { GLSL_AIR, GLSL_FIELD_SUN, airUniforms, skyDome } from '../gl/air';
import { foliageGeometry, foliageMaterial, foliageMesh, type Clump } from '../gl/foliage';
import { grade } from '../gl/look';
import { subjectFor } from '../gl/modelSubject';
import { plateVeil } from '../plateVeil';
import { GLSL_SUNLIGHT, Sunlight, gridFromMesh, stampSolid } from '../gl/sunlight';
import { groundGrid, makeHeightfield } from '../gl/terrain';
import { fbm, lerp, seg } from '../noise';
import cutoutUrl from '../../../assets/field/great-indian-bustard-cutout.webp';
import type { FieldInput, FieldWorld, WorldContext } from '../types';

/**
 * FIELD STUDY 01 · the Great Indian Bustard, the Thar's arid grassland, at last light.
 *
 * The sun is a few degrees above the western horizon and behind the birds' right. At that height every tussock,
 * every clump of thorn scrub and every low swell of the plain throws a shadow many times its own length, so the
 * light combs the grassland into bands; the grass in front of the sun glows from behind; the dust in the air
 * glows around it. Through the study the sun sinks, and the shadows run longer.
 *
 * Shadows are cast by what is drawn: the ground, each tussock, each scrub clump and the birds' bulk are stamped
 * into the world's sun grid (gl/sunlight.ts), which is redrawn when the sun moves — and the hand moves it a few
 * degrees, as it moves the lamp on the homepage.
 *
 * The birds are the record's own photograph, cut out (Dr. Raju Kasambe, CC BY-SA 4.0), standing in the grass and
 * lit by the same sun: a rim where their outline faces it, their shadow cast across the plain by the world.
 *
 * Honesty: the ground, grass and scrub are drawn, an impression of the Thar's grassland and not a terrain model;
 * the hour is chosen, not recorded. The threat the record names is in the words; the record gives no route, so
 * no line is drawn.
 */

const GROUND_VERTEX = /* glsl */ `
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vDepth;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 mv = viewMatrix * w;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const GROUND_FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  ${GLSL_FIELD_SUN}
  ${GLSL_AIR}
  ${GLSL_SUNLIGHT}
  uniform vec3 uSkyCol;
  uniform vec3 uSand;
  uniform vec3 uEarth;
  uniform vec3 uStone;
  uniform vec3 uStraw;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vDepth;
  void main() {
    vec2 p = vWorld.xz;
    float near = 1.0 - smoothstep(40.0, 220.0, vDepth);
    // Small relief the mesh cannot carry: wind ripples in the sand and the crumb of the soil.
    float e = 0.35;
    float b0 = valueNoise(p * 1.3) * 0.6 + valueNoise(p * 4.1) * 0.4;
    float bx = valueNoise((p + vec2(e, 0.0)) * 1.3) * 0.6 + valueNoise((p + vec2(e, 0.0)) * 4.1) * 0.4;
    float bz = valueNoise((p + vec2(0.0, e)) * 1.3) * 0.6 + valueNoise((p + vec2(0.0, e)) * 4.1) * 0.4;
    vec3 n = normalize(normalize(vNormal) + vec3(b0 - bx, 0.0, b0 - bz) * 0.9 * near);

    // Patches of buff sand, red-brown earth and pale gravel, at three scales.
    float patchA = fbm3(p * 0.011);
    float patchB = fbm3(p * 0.045 + 9.0);
    vec3 col = mix(uSand, uEarth, smoothstep(0.42, 0.7, patchA) * 0.85);
    col = mix(col, uStone, smoothstep(0.55, 0.78, patchB) * 0.5 * smoothstep(0.35, 0.6, fbm3(p * 0.02 + 3.0)));
    // Where the grass lies thick the ground is straw litter, not sand.
    float cover = smoothstep(0.36, 0.64, fbm3(p * 0.02 + 31.0));
    col = mix(col, uStraw, cover * 0.5);
    // Pebbles, only where there is something to see.
    float peb = step(0.93, hash12(floor(p * 5.0))) * near * (1.0 - cover);
    col = mix(col, uStone * 1.15, peb * 0.6);
    col *= 0.85 + 0.3 * valueNoise(p * 0.7);

    float sun = sunGround(p);
    float ndl = max(dot(n, uSunDir), 0.0);
    float sky = skyGround(p);
    vec3 light = uSunCol * ndl * sun + uSkyCol * sky * (0.55 + 0.45 * n.y);
    col *= light;
    col = applyAir(col, vWorld);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const GRASS_VERTEX = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  ${GLSL_FIELD_SUN}
  ${GLSL_AIR}
  ${GLSL_SUNLIGHT}
  attribute float aTip;
  attribute float aShade;
  attribute vec4 aInst;
  attribute vec4 aRand;
  uniform float uTime;
  varying float vTip;
  varying float vShade;
  varying float vRand;
  varying float vGreen;
  varying vec3 vWorld;
  varying float vSun;
  varying float vSky;
  // The air, worked out per vertex: haze changes slowly across a blade or a leaf.
  varying float vAirT;
  varying vec3 vAirGlow;
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
    vGreen = step(0.9, aRand.w);
    // The sun and sky read once per vertex, not per pixel: a blade is lit as a whole, never striped by the grid.
    // One read for the whole tuft: the sun at its own cell's top (the tuft stands in the grid as a cone).
    vSun = sunGround(aInst.xz);
    vSky = 1.0;
    vAirT = airTransmittance(w);
    vAirGlow = airGlow(normalize(w - cameraPosition)) * (1.0 - vAirT);
    gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
  }
`;

const GRASS_FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  ${GLSL_FIELD_SUN}
  ${GLSL_AIR}
  ${GLSL_SUNLIGHT}
  uniform vec3 uSkyCol;
  uniform vec3 uStrawBase;
  uniform vec3 uStrawTip;
  varying float vTip;
  varying float vShade;
  varying float vRand;
  varying float vGreen;
  varying vec3 vWorld;
  varying float vSun;
  varying float vSky;
  varying float vAirT;
  varying vec3 vAirGlow;
  void main() {
    // Multisampling can shade a pixel just outside the blade, where the interpolated values leave 0 → 1.
    float tipT = clamp(vTip, 0.0, 1.0);
    vec3 base = uStrawBase * (0.75 + 0.5 * vRand);
    vec3 tip = uStrawTip * (0.85 + 0.3 * vRand);
    vec3 albedo = mix(base, tip, pow(tipT, 1.2)) * (0.8 + 0.35 * vShade);
    albedo = mix(albedo, vec3(0.2, 0.22, 0.09) * (0.6 + 0.6 * tipT), vGreen * 0.6);
    float sun = clamp(vSun, 0.0, 1.0);
    // Blades stand upright: a low sun lights their faces about as much as the ground, and shines through them
    // toward a camera that looks into it.
    vec3 V = normalize(vWorld - cameraPosition);
    float through = pow(max(dot(V, uSunDir), 0.0), 5.0);
    float sky = vSky;
    vec3 light = uSunCol * sun * (0.32 + 0.55 * vShade) * max(uSunDir.y * 3.0, 0.25);
    light += uSunCol * sun * through * (0.35 + 1.1 * tipT);
    light += uSkyCol * sky * (0.45 + 0.4 * tipT);
    vec3 col = albedo * light * (0.55 + 0.45 * tipT);
    col = col * vAirT + vAirGlow;
    gl_FragColor = vec4(col, 1.0);
  }
`;

/** High cloud, lit from below by the low sun: rose toward it, grey away. */
const CLOUD = /* glsl */ `
  vec2 cp = dir.xz / (dir.y + 0.12) * 1.1;
  float c = fbm3(cp * 1.2 + vec2(3.0, 0.0)) * 0.65 + fbm3(cp * 3.6) * 0.35;
  float cloud = smoothstep(0.54, 0.78, c) * smoothstep(0.02, 0.22, dir.y) * (1.0 - smoothstep(0.5, 0.9, dir.y));
  float toward = airPhase(dot(dir, uSunDir));
  vec3 lit = uSunCol * (0.035 + 0.012 * toward) + uAirCol * 0.5;
  col = mix(col, lit, cloud * 0.6);
`;

/** One tussock of dry grass, in its own unit space: fifteen fine blades, each a three-triangle taper. */
function tussockGeometry(): THREE.InstancedBufferGeometry {
  const rand = seededRandom(31);
  const pos: number[] = [];
  const tip: number[] = [];
  const shade: number[] = [];
  const idx: number[] = [];
  for (let b = 0; b < 15; b++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * 0.3;
    const bx = Math.cos(a) * r;
    const bz = Math.sin(a) * r;
    const lean = rand() * Math.PI * 2;
    const lx = Math.cos(lean);
    const lz = Math.sin(lean);
    const len = 0.5 + rand() * 0.6;
    const bend = 0.3 + rand() * 0.6;
    const w = 0.022 + rand() * 0.02;
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

export async function createThar({ tier, species }: WorldContext): Promise<FieldWorld> {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 4000);

  const C = {
    sand: lin('#c9a77a'),
    earth: lin('#9a6142'),
    stone: lin('#b9a585'),
    straw: lin('#a68a52'),
    strawBase: lin('#6b5530'),
    strawTip: lin('#d6bb84'),
    sky: lin('#7a83ad', 0.42),
    sunEarly: lin('#ffae66', 4.6),
    sunLate: lin('#ff8a45', 4.2),
    air: lin('#8a6f7c', 0.36),
    zenith: lin('#232b52', 0.5),
  };

  const sunDir = new THREE.Vector3();
  const sunCol = C.sunEarly.clone();
  const setSun = (azimuth: number, elevation: number) => {
    sunDir.set(Math.cos(elevation) * Math.cos(azimuth), Math.sin(elevation), Math.cos(elevation) * Math.sin(azimuth)).normalize();
  };
  // West is beyond the birds' right shoulder: the camera looks across the light, so shadows stream to the left.
  const AZ = -0.53;
  setSun(AZ, 0.075);

  const air = airUniforms({
    density: 0.0019,
    falloff: 0.012,
    base: 0,
    colour: C.air,
    mie: 0.75,
    g: 0.86,
    zenith: C.zenith,
    disc: 9,
    discSize: 0.013,
  });
  const shared = { uSunDir: { value: sunDir }, uSunCol: { value: sunCol }, ...air };

  scene.add(skyDome(3500, { ...shared }, CLOUD, `${GLSL_HASH}${GLSL_NOISE}`));

  /* the ground */
  const res = { high: 300, balanced: 210, low: 140 }[tier];
  const ground = await makeHeightfield('grassland', 760, 760, res, res, [0, -250]);
  const h = ground.height;

  /* where the birds stand */
  const P = new THREE.Vector3(12, 0, -44);
  P.y = h(P.x, P.z);
  const facing = new THREE.Vector3(-0.22, 0, 1).normalize();
  const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), facing).normalize();

  /* the light: a fine grid around the birds and the camera's walk, the whole ground coarse around it */
  const fineN = { high: 641, balanced: 561, low: 321 }[tier];
  const fineRect: [number, number, number, number] = [-140, -200, 180, 120];
  const fine = await groundGrid('grassland', fineRect, fineN, fineN);
  const coarse = gridFromMesh(ground.geometry, res, res);

  /* the grass: tussocks, patchy, a taller row standing in front of the birds */
  const rand = seededRandom(23);
  // Where the camera stands on the ground (see the path below): a few metres of open ground around each.
  const closeAt = P.clone().addScaledVector(facing, 20).addScaledVector(side, -2);
  const clear: Array<[number, number, number]> = [
    [-2, -16, 7],
    [-1, -18, 7],
    [-4, -12, 7],
    [0, -20, 6],
    [-38, 6, 6],
    [38, 4, 6],
    [closeAt.x, closeAt.z, 5],
    [-4, 24, 6],
  ];
  const count = { high: 9500, balanced: 6400, low: 3200 }[tier];
  const front = { high: 200, balanced: 150, low: 90 }[tier];
  const inst = new Float32Array((count + front) * 4);
  const rnd = new Float32Array((count + front) * 4);
  let placed = 0;
  const put = (x: number, z: number, scale: number) => {
    const y = h(x, z);
    inst.set([x, y - 0.15, z, scale], placed * 4);
    rnd.set([rand(), rand(), rand(), rand()], placed * 4);
    // Each tussock stands in the light: a low cone of its own height.
    stampSolid(fine, x, z, scale * 0.42, scale * 0.42, y, scale * 0.75, 'cone');
    placed++;
  };
  for (let i = 0; i < front; i++) {
    const x = P.x - 9 + rand() * 18;
    const z = P.z + 0.6 + rand() * 6;
    put(x, z, 1.3 + rand() * 1.0);
  }
  for (let tries = 0; placed < count + front && tries < count * 8; tries++) {
    const x = -150 + rand() * 320;
    const z = 95 - rand() * 250;
    // Patchy: more where the ground says the grass is thick.
    if (fbm(x * 0.02 + 31, z * 0.02, 3, 99) + (rand() - 0.5) * 0.25 < 0.4) continue;
    // Never on the birds themselves, and thin where the camera stands, so nothing fills the lens.
    if (Math.abs(x - P.x) < 8 && Math.abs(z - P.z) < 1.2) continue;
    if (clear.some(([cx, cz, r]) => (x - cx) ** 2 + (z - cz) ** 2 < r * r)) continue;
    put(x, z, 1.5 + rand() * 1.6);
  }
  const grassGeo = tussockGeometry();
  grassGeo.setAttribute('aInst', new THREE.InstancedBufferAttribute(inst, 4));
  grassGeo.setAttribute('aRand', new THREE.InstancedBufferAttribute(rnd, 4));
  grassGeo.instanceCount = placed;

  /* thorn scrub, gathered on the flanks and far out, never on the birds: each clump a few lobes of small leaves */
  const scrubCount = { high: 70, balanced: 50, low: 28 }[tier];
  const leafDensity = { high: 1, balanced: 0.75, low: 0.45 }[tier];
  const clumps: Clump[] = [];
  let shrubs = 0;
  const addScrub = (x: number, z: number, sx: number, sy: number, sz: number, close = false) => {
    if (shrubs >= scrubCount) return;
    shrubs++;
    const y = h(x, z);
    const lobes = 3 + Math.floor(rand() * 4);
    for (let i = 0; i < lobes; i++) {
      const a = rand() * Math.PI * 2;
      const r = rand() * 0.45;
      const lx = x + Math.cos(a) * r * sx;
      const lz = z + Math.sin(a) * r * sz;
      const k = 0.45 + rand() * 0.4;
      const ry = sy * k * (0.55 + rand() * 0.3);
      // The thicket the camera comes close to is drawn in finer leaves, five times as many.
      const n = sx * sz * k * k * 26 * leafDensity * (close ? 5 : 1);
      clumps.push({ x: lx, y: y + ry * 0.9 + rand() * sy * 0.25, z: lz, rx: sx * k * 0.75, ry, rz: sz * k * 0.75, leaves: Math.round(n), size: close ? 0.22 : undefined });
    }
    stampSolid(fine, x, z, sx * 0.8, sz * 0.8, y, sy * 0.95, 'dome');
    stampSolid(coarse, x, z, sx * 0.8, sz * 0.8, y, sy * 0.95, 'dome');
  };
  // Behind the birds and to the side away from the sun, so the thicket frames them without shading them.
  for (const [dx, dz, sc] of [
    [-6, -9, 5.5],
    [-15, -7, 4.6],
    [-25, -11, 5.8],
    [-2, -16, 6.8],
    [9, -22, 6.2],
    [-36, -15, 5],
  ] as const) {
    addScrub(P.x + side.x * dx + facing.x * dz, P.z + side.z * dx + facing.z * dz, sc * 1.1, sc * 0.75, sc * 0.9, true);
  }
  for (let tries = 0; shrubs < scrubCount && tries < 4000; tries++) {
    const x = -230 + rand() * 440;
    const z = -40 - rand() * 330;
    if (Math.abs(x - P.x) < 40 && z > P.z - 40) continue;
    if (fbm(x * 0.012 + 5, z * 0.012, 3, 57) < 0.5) continue;
    const sc = 2.4 + rand() * 4.2;
    addScrub(x, z, sc * (1 + rand() * 0.4), sc * 0.65, sc * (0.9 + rand() * 0.3));
  }
  const scrubGeo = foliageGeometry(clumps, { size: 0.5, seed: 17, ragged: 0.25 });

  /* the birds: the cut-out, and their bulk in the light */
  const cutout = await new THREE.TextureLoader().loadAsync(cutoutUrl);
  cutout.colorSpace = THREE.SRGBColorSpace;
  cutout.anisotropy = 4;
  const birdsW = 14;
  // Left bird at 0.17 of the picture's width, right bird at 0.86; both about five units tall.
  for (const [u, top] of [
    [0.17, 3.3],
    [0.86, 3.8],
  ] as const) {
    const bx = P.x + side.x * (u - 0.5) * birdsW;
    const bz = P.z + side.z * (u - 0.5) * birdsW;
    stampSolid(fine, bx, bz, 1.5, 1.0, P.y, top, 'dome');
    stampSolid(fine, bx - side.x * 0.6, bz - side.z * 0.6, 0.35, 0.35, P.y, top + 1.6, 'column');
  }

  const fineLight = new Sunlight(fine, { penumbra: 0.008, reach: 260, steps: 36 });
  const coarseLight = new Sunlight(coarse, { penumbra: 0.01, reach: 700, steps: 32 });
  const lightU = fineLight.withFar(coarseLight);

  const groundMat = new THREE.ShaderMaterial({
    vertexShader: GROUND_VERTEX,
    fragmentShader: GROUND_FRAGMENT,
    uniforms: {
      ...shared,
      ...lightU,
      uSkyCol: { value: C.sky },
      uSand: { value: C.sand },
      uEarth: { value: C.earth },
      uStone: { value: C.stone },
      uStraw: { value: C.straw },
    },
  });
  scene.add(new THREE.Mesh(ground.geometry, groundMat));

  const grassMat = new THREE.ShaderMaterial({
    vertexShader: GRASS_VERTEX,
    fragmentShader: GRASS_FRAGMENT,
    uniforms: { ...shared, ...lightU, uSkyCol: { value: C.sky }, uStrawBase: { value: C.strawBase }, uStrawTip: { value: C.strawTip }, uTime: { value: 0 } },
    side: THREE.DoubleSide,
  });
  const grass = new THREE.Mesh(grassGeo, grassMat);
  grass.frustumCulled = false;
  scene.add(grass);

  const scrubMat = foliageMaterial(
    { ...shared, ...lightU },
    { leafA: lin('#3a3a20', 0.32), leafB: lin('#6a5a34', 0.4), leafLit: lin('#d0a050'), translucency: 0.9, skyCol: C.sky, sway: 0.03 },
  );
  scene.add(foliageMesh(scrubGeo, scrubMat));

  // The species' licensed 3D model where one exists (content/models.ts), else the record's cut-out photograph.
  const birds = await subjectFor(species, {
    texture: cutout,
    width: birdsW,
    at: P,
    feet: 0.02,
    uniforms: { ...shared, ...lightU },
    skyCol: C.sky,
    facing,
    turn: 0.35,
    fadeAbove: [0.5, 0.8],
    gain: 1.25,
    keep: 0.5,
    rim: 1.6,
    foot: 0.16,
    // Read the light on the birds' sunward side, clear of their own bulk in the grid.
    lightReach: 3,
  });
  scene.add(birds.mesh);
  // The middle of the birds, as the camera looks at them.
  const mid = new THREE.Vector3(P.x, P.y + 2.6, P.z);

  /* the camera */
  const above = (x: number, z: number, lift: number): [number, number, number] => [x, h(x, z) + lift, z];
  const V = (v: THREE.Vector3, dx = 0, dy = 0, dz = 0): [number, number, number] => [v.x + dx, v.y + dy, v.z + dz];
  const N = 7;
  const at = (i: number) => (i + 0.5) / N;
  // The birds sit right of centre in the opening frames, so the title has the ground to its left.
  const lookRight = V(mid, -side.x * 6.5, 3.4, -side.z * 6.5);
  const lookLeft = V(mid, side.x * 9, -0.6, side.z * 9);
  const close = P.clone().addScaledVector(facing, 20).addScaledVector(side, -2);
  const path: Shot[] = [
    { at: 0, pos: above(-2, -16, 6.2), look: lookRight, fov: 34 },
    { at: at(0), pos: above(-1, -18, 6), look: lookRight, fov: 34 },
    { at: at(1), pos: above(-38, 6, 6.5), look: [30, P.y + 3, -90], fov: 44 },
    { at: at(2), pos: above(38, 4, 6), look: lookLeft, fov: 36 },
    { at: at(3), pos: above(close.x, close.z, 5), look: V(mid, -side.x * 3.5, 0.2, -side.z * 3.5), fov: 32 },
    { at: at(4), pos: above(-14, 40, 36), look: [8, P.y, -70], fov: 44 },
    { at: at(5), pos: above(-4, 24, 6.4), look: V(mid, side.x * 12, -0.8, side.z * 12), fov: 36 },
    { at: at(6), pos: above(-50, 28, 52), look: [10, P.y, -110], fov: 46 },
    { at: 1, pos: above(-54, 30, 58), look: [10, P.y, -110], fov: 47 },
  ];
  const rig = new CameraRig(camera, {
    preview: { at: 0, pos: above(-4, -12, 6.4), look: lookRight, fov: 34 },
    engage: { at: 0, pos: above(0, -20, 5.8), look: lookRight, fov: 32 },
    path,
    sway: [3.5, 2],
    lambda: 5.5,
  });

  const film = grade({
    exposure: 1.55,
    tint: new THREE.Vector3(1.0, 0.98, 0.95),
    saturation: 0.95,
    contrast: 1.05,
    shadows: new THREE.Vector3(0.004, 0.0, 0.012),
    highlights: new THREE.Vector3(1.02, 0.99, 0.95),
    vignette: 0.45,
    bloom: 0.38,
    threshold: 1.5,
  });

  return {
    scene,
    camera,
    clear: '#1a1420',
    grade: film,
    update(i: FieldInput) {
      const p = i.progress;
      const en = i.enter;
      rig.update({ engage: i.engage, enter: en, progress: p, pointer: i.pointer, dt: i.dt, snap: i.snap || i.reduced });

      // The sun sinks through the study; the hand turns it a few degrees.
      const sink = seg(p, 0.1, 1) * en;
      setSun(AZ + i.light.x * 0.2, lerp(0.075, 0.03, sink) + i.light.y * 0.012);
      sunCol.lerpVectors(C.sunEarly, C.sunLate, sink);

      // The evidence is read over a quieter ground.
      const dim = Math.max(0, Math.min(seg(p, 0.55, 0.6), 1 - seg(p, 0.69, 0.74))) * en;
      film.exposure = 1.55 * (1 - dim * 0.3);

      grassMat.uniforms.uTime.value = i.reduced ? 0 : i.time;
      scrubMat.uniforms.uTime.value = i.reduced ? 0 : i.time;
      birds.update(camera, sunDir, i.reduced ? 0 : i.dt);
      birds.setVeil(plateVeil(species.id, i.dt));
    },
    prerender(renderer) {
      coarseLight.update(renderer, sunDir);
      fineLight.update(renderer, sunDir);
    },
    resize(width, height) {
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    },
    setRung(r) {
      grassGeo.instanceCount = r >= 2 ? Math.floor(placed * 0.45) : r >= 1 ? Math.floor(placed * 0.7) : placed;
    },
    dispose() {
      cutout.dispose();
      fineLight.dispose();
      coarseLight.dispose();
      birds.dispose();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose();
        (mesh.material as THREE.Material | undefined)?.dispose?.();
      });
    },
  };
}
