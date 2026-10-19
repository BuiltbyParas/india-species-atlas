import * as THREE from 'three';
import { GLSL_HASH, GLSL_NOISE } from '../../gl/chunks';
import { seededRandom } from '../../gl/particles';
import { CameraRig, type Shot } from '../cameraRig';
import { lin } from '../gl/color';
import { GLSL_AIR, GLSL_FIELD_SUN, airUniforms, skyDome } from '../gl/air';
import { foliageGeometry, foliageMaterial, foliageMesh, type Clump } from '../gl/foliage';
import { grade } from '../gl/look';
import { subjectFor } from '../gl/modelSubject';
import { GLSL_SUNLIGHT, Sunlight, stampBand, stampSolid, type LightGrid } from '../gl/sunlight';
import { fbm, lerp, seg } from '../noise';
import cutoutUrl from '../../../assets/field/bengal-tiger-cutout.webp';
import type { FieldInput, FieldWorld, WorldContext } from '../types';

/**
 * FIELD STUDY 04 · the Bengal tiger, the central Indian forests, mid-morning.
 *
 * A deciduous forest with the sun some thirty degrees up behind the tiger. The canopy is high and broken: where
 * it opens, the sun comes down through the haze of the forest air in shafts, lies on the floor in flecks and
 * pools, and catches the trunks it passes; everywhere else is green shade. The tiger stands in a small clearing
 * where one of those shafts comes down, so it is lit and the forest around it is not.
 *
 * The light is the other studies' model in three layers: the trunks stand in the world's sun grid as columns and
 * the crowns as a band of foliage held above open air (gl/sunlight.ts), so the trunks' shadows and the canopy's
 * flecks on the floor come from what is drawn; the shafts are the same sun marched through the air along each
 * view ray (the film's volume pass, gl/look.ts). The hand turns the sun a little, and the shafts and flecks move.
 *
 * The tiger is the record's photograph, cut out of its background (Tisha Mukherjee, CC BY-SA 4.0), lit by the
 * shaft it stands in, with a rim of sun along its back and the grass at its feet.
 *
 * Honesty: the forest is drawn, an impression of a central Indian forest and not of any reserve; the hour is
 * chosen, not recorded; the reserves are listed in the text and not drawn. The tiger is a photograph (cut out),
 * not a drawn animal.
 */

/** Development only: `?novol=1` turns the shafts off, to judge the rest of the light without them. */
const NO_VOLUME = import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('novol') === '1';

/** Where the tiger stands. */
const T = new THREE.Vector3(4, 0, -36);
/** The canopy: its underside, and the band its crowns fill. */
const CANOPY = { plane: 78, lo: 80, hi: 112 };

const TRUNK_VERTEX = /* glsl */ `
  attribute float aSeed;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying vec3 vLocal;
  varying float vSeed;
  void main() {
    vec3 p = position;
    // The foot flares into buttress roots; the trunk is never a clean cylinder.
    float flare = 1.0 + 0.7 * exp(-p.y * 10.0);
    float ang = atan(p.z, p.x);
    float wob = 1.0 + 0.07 * sin(ang * 3.0 + aSeed * 20.0) + 0.04 * sin(ang * 7.0 + p.y * 9.0 + aSeed * 5.0);
    p.xz *= flare * wob;
    vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.0);
    vWorld = w.xyz;
    vLocal = vec3(ang, p.y, 0.0);
    // The instance is scaled unevenly (a radius of one or two, a height of ninety): the normal takes the inverse
    // scale, or every trunk's taper tilts it toward the sky and the bark is lit like the floor.
    mat3 im = mat3(instanceMatrix);
    vec3 inv = vec3(dot(im[0], im[0]), dot(im[1], im[1]), dot(im[2], im[2]));
    vNormal = normalize(mat3(modelMatrix) * im * (normal / max(inv, vec3(1e-6))));
    vSeed = aSeed;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const TRUNK_FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  ${GLSL_FIELD_SUN}
  ${GLSL_AIR}
  ${GLSL_SUNLIGHT}
  uniform vec3 uSkyCol;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying vec3 vLocal;
  varying float vSeed;
  void main() {
    vec3 n = normalize(vNormal);
    float h = vWorld.y;
    // Bark: long fissures, ridged, with the tree's own colour.
    float u = vLocal.x * 1.9 + vSeed * 40.0;
    float fiss = valueNoise(vec2(u * 3.0, h * 0.8)) * 0.6 + valueNoise(vec2(u * 8.0, h * 2.0 + 3.0)) * 0.4;
    float ridge = smoothstep(0.3, 0.75, fiss);
    vec3 dark = mix(vec3(0.012, 0.009, 0.007), vec3(0.025, 0.018, 0.011), vSeed);
    vec3 pale = mix(vec3(0.24, 0.19, 0.13), vec3(0.4, 0.31, 0.19), fract(vSeed * 7.0));
    vec3 bark = mix(dark, pale, ridge);
    float moss = (1.0 - smoothstep(0.0, 6.0, h)) * smoothstep(0.1, 0.9, valueNoise(vWorld.xz * 0.9 + vSeed * 9.0));
    bark = mix(bark, vec3(0.04, 0.07, 0.015), moss * 0.5);
    // Below the canopy, the sun that reaches a trunk is the canopy's fleck where the trunk's ray crosses it.
    float sun = h < ${CANOPY.plane.toFixed(1)} ? sunUnder(vWorld) : sunCanopy(vWorld);
    float diff = max(dot(n, uSunDir), 0.0);
    float sky = skyGround(vWorld.xz);
    vec3 col = bark * (uSunCol * diff * sun + uSkyCol * sky * (0.55 + 0.35 * n.y) + uSkyCol * 0.18);
    col = applyAir(col, vWorld);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const FLOOR_VERTEX = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const FLOOR_FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  ${GLSL_FIELD_SUN}
  ${GLSL_AIR}
  ${GLSL_SUNLIGHT}
  uniform vec3 uSkyCol;
  varying vec3 vWorld;
  void main() {
    vec2 p = vWorld.xz;
    float d = distance(vWorld, cameraPosition);
    float near = 1.0 - smoothstep(30.0, 160.0, d);
    // Leaf litter: dry, golden and brown, in drifts, with bare earth between.
    float drift = fbm3(p * 0.09);
    float fine = valueNoise(p * 2.6);
    float specks = step(0.72, valueNoise(p * 9.0 + 3.0)) * near;
    vec3 litter = mix(vec3(0.06, 0.035, 0.018), vec3(0.16, 0.1, 0.05), drift);
    litter = mix(litter, vec3(0.26, 0.17, 0.06), specks * 0.55);
    litter *= 0.7 + 0.55 * fine;
    litter = mix(litter, vec3(0.06, 0.035, 0.018), smoothstep(0.62, 0.8, fbm3(p * 0.05 + 9.0)) * 0.7);
    float cover = smoothstep(0.55, 0.72, fbm3(p * 0.045 + 31.0));
    litter = mix(litter, vec3(0.03, 0.06, 0.011) * (0.8 + 0.4 * fine), cover * 0.6);
    // Litter is rough: a little relief for the sun to catch.
    vec3 n = normalize(vec3((fine - 0.5) * 0.6 * near, 1.0, (valueNoise(p * 2.6 + 9.0) - 0.5) * 0.6 * near));
    float sun = near > 0.0 ? sunGroundSoft(p) : sunGround(p);
    float sky = skyGround(p);
    vec3 col = litter * (uSunCol * max(dot(n, uSunDir), 0.0) * sun + uSkyCol * sky);
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
    float wind = sin(uTime * 0.7 + aRand.z * 6.28 + aInst.x * 0.05) * 0.5 + sin(uTime * 0.31 + aInst.z * 0.04) * 0.5;
    p.x += wind * aTip * aTip * aInst.w * 0.07;
    vec3 w = aInst.xyz + p;
    vWorld = w;
    vTip = aTip;
    vShade = aShade;
    vRand = aRand.y;
    vSun = sunGround(aInst.xz);
    vSky = skyGround(aInst.xz);
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
  uniform vec3 uSkyCol;
  varying float vTip;
  varying float vShade;
  varying float vRand;
  varying vec3 vWorld;
  varying float vSun;
  varying float vSky;
  varying float vAirT;
  varying vec3 vAirGlow;
  void main() {
    float t = clamp(vTip, 0.0, 1.0);
    vec3 base = mix(vec3(0.02, 0.03, 0.006), vec3(0.06, 0.06, 0.01), vRand);
    vec3 tip = mix(vec3(0.4, 0.3, 0.07), vec3(0.52, 0.4, 0.12), vRand);
    vec3 albedo = mix(base, tip, pow(t, 1.2)) * (0.8 + 0.3 * vShade);
    vec3 V = normalize(vWorld - cameraPosition);
    float through = pow(max(dot(V, uSunDir), 0.0), 4.0);
    float sun = clamp(vSun, 0.0, 1.0);
    vec3 light = uSunCol * sun * (0.35 + 0.4 * vShade + through * (0.4 + 1.2 * t)) + uSkyCol * vSky * (0.6 + 0.4 * t);
    vec3 col = albedo * light;
    col = col * vAirT + vAirGlow;
    gl_FragColor = vec4(col, 1.0);
  }
`;

/**
 * The shafts: for each pixel, the sun scattered toward the eye by the forest's air between the eye and the surface
 * it sees, wherever that air is in the sun — read from the canopy's flecks where each sample's ray to the sun
 * crosses the canopy. Drawn at half the frame's size by the film, blurred once and added before its curve.
 */
const VOLUME_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const VOLUME_FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  ${GLSL_FIELD_SUN}
  ${GLSL_SUNLIGHT}
  uniform sampler2D tDepth;
  uniform mat4 uInvProj;
  uniform mat4 uCamWorld;
  uniform vec3 uCamPos;
  uniform vec2 uSize;
  uniform float uDensity;
  uniform float uStrength;
  uniform float uG;
  varying vec2 vUv;
  void main() {
    float depth = texture2D(tDepth, vUv).x;
    vec4 ndc = vec4(vUv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
    vec4 view = uInvProj * ndc;
    view /= view.w;
    vec3 world = (uCamWorld * view).xyz;
    vec3 ray = world - uCamPos;
    float len = min(length(ray), 240.0);
    vec3 dir = normalize(ray);
    float mu = dot(dir, uSunDir);
    float g = uG;
    float k = 1.0 + g * g - 2.0 * g * mu;
    float phase = (1.0 - g * g) / (k * sqrt(k)) * 0.08 + 0.02;
    const int STEPS = 16;
    float dt = len / float(STEPS);
    float jitter = hash12(gl_FragCoord.xy + fract(uCamPos.xz * 0.37));
    float lit = 0.0;
    float tr = 1.0;
    for (int i = 0; i < STEPS; i++) {
      vec3 s = uCamPos + dir * (float(i) + jitter) * dt;
      if (s.y > uLightPlane) break;
      float v = sunUnder(s);
      lit += v * tr * dt;
      tr *= exp(-uDensity * dt);
    }
    gl_FragColor = vec4(uSunCol * phase * lit * uDensity * uStrength, 1.0);
  }
`;

export async function createForest({ tier, species }: WorldContext): Promise<FieldWorld> {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.3, 2000);
  const C = {
    sky: lin('#6f8a76', 0.34),
    sun: lin('#ffd9a0', 5.2),
    sunLate: lin('#ffc98a', 5.0),
    air: lin('#40523f', 0.32),
    zenith: lin('#6f93b8', 0.9),
  };
  const sunDir = new THREE.Vector3();
  const sunCol = C.sun.clone();
  const setSun = (azimuth: number, elevation: number) => {
    sunDir.set(Math.cos(elevation) * Math.cos(azimuth), Math.sin(elevation), Math.cos(elevation) * Math.sin(azimuth)).normalize();
  };
  // Behind the tiger and a little to the right of the camera's walk: the shafts slant down toward the eye.
  const AZ = -1.19;
  const EL = 0.56;
  setSun(AZ, EL);

  // The sun's scatter in this air is drawn by the shafts, so the surfaces' own air carries only the sky's.
  const air = airUniforms({ density: 0.006, falloff: 0.004, base: 0, colour: C.air, mie: 0, g: 0.6, zenith: C.zenith, disc: 8, discSize: 0.012 });
  const shared = { uSunDir: { value: sunDir }, uSunCol: { value: sunCol }, ...air };
  const rand = seededRandom(53);

  /* the light grid: floor, trunks, shrubs and the tiger as solids; the crowns as a band above open air */
  const cell = { high: 0.7, balanced: 0.85, low: 1.2 }[tier];
  const rect: [number, number, number, number] = [T.x - 175, T.z - 340, T.x + 175, T.z + 115];
  const nx = Math.round((rect[2] - rect[0]) / cell) + 1;
  const nz = Math.round((rect[3] - rect[1]) / cell) + 1;
  const grid: LightGrid = { rect, nx, nz, solid: new Float32Array(nx * nz), bandDensity: 0.95, plane: CANOPY.plane };

  /* the trunks: tapering, varied in girth and lean, in clumps with gaps between */
  const trunkCount = { high: 440, balanced: 310, low: 190 }[tier];
  const trunkGeo = new THREE.CylinderGeometry(0.72, 1, 1, tier === 'low' ? 8 : 12, 8, true);
  trunkGeo.translate(0, 0.5, 0);
  const seeds = new Float32Array(trunkCount);
  const trunkMats: THREE.Matrix4[] = [];
  /** Each standing trunk, for the canopy below (which may shorten it and crown it). */
  const standing: Array<{ i: number; x: number; z: number; r: number; q: THREE.Quaternion }> = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const eu = new THREE.Euler();
  for (let i = 0; i < trunkCount; i++) {
    let x = 0;
    let z = 0;
    let ok = false;
    for (let tries = 0; tries < 60; tries++) {
      x = T.x + (rand() - 0.5) * 200;
      z = T.z + 60 - rand() * 260;
      const dx = x - T.x;
      const dz = z - T.z;
      if (Math.abs(dx) < 13 && dz > -22 && dz < 62) continue;
      if (Math.abs(dx) < 7 && dz < -22 && dz > -48) continue;
      if (fbm(x * 0.02 + 5, z * 0.02, 3, 71) + (rand() - 0.5) * 0.3 < 0.42) continue;
      ok = true;
      break;
    }
    const r = 0.9 + Math.pow(rand(), 2.2) * 1.9;
    eu.set((rand() - 0.5) * 0.05, rand() * Math.PI, (rand() - 0.5) * 0.05);
    q.setFromEuler(eu);
    const tall = 86 + rand() * 6;
    m.compose(new THREE.Vector3(x, -0.5, z), q, new THREE.Vector3(ok ? r : 0, tall, ok ? r : 0));
    trunkMats.push(m.clone());
    seeds[i] = rand();
    if (ok) standing.push({ i, x, z, r, q: q.clone() });
  }
  trunkGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));

  /*
   * The canopy: crowns with gaps between them; one gap placed so a shaft comes down on the tiger. A crown is a dome
   * (one lobe on top, the rest round and below it), so from above it reads as a mass with a lit top and a shaded
   * skirt; the roof rises and falls, about one crown in eight stands clear of it (an emergent), and where a trunk
   * has no crown over it a lower tree fills the gap (the midstorey), so looking down into a gap finds foliage in
   * shade rather than bare floor and trunk tops. Every new choice here comes from a second random stream (`vary`),
   * so the trunks, shrubs and grass round the tiger stand exactly where they did.
   */
  const crowns: Clump[] = [];
  const crownCount = { high: 520, balanced: 420, low: 260 }[tier];
  const leafK = { high: 1, balanced: 0.8, low: 0.5 }[tier];
  const vary = seededRandom(97);
  const gap = new THREE.Vector2(T.x + (sunDir.x / sunDir.y) * 96, T.z + (sunDir.z / sunDir.y) * 96);
  const lobesAt: Array<[number, number, number]> = [];
  for (let i = 0, tries = 0; i < crownCount && tries < crownCount * 20; tries++) {
    const x = T.x + (rand() - 0.5) * 560;
    const z = T.z + 110 - rand() * 520;
    if (Math.hypot(x - gap.x, z - gap.y) < 22) continue;
    if (fbm(x * 0.011 + 3, z * 0.011, 3, 77) < 0.3) continue;
    i++;
    const emergent = vary() < 0.13;
    const R = (13 + rand() * 9) * (emergent ? 1.2 : 1);
    const y = 88 + rand() * 10 + (vary() - 0.5) * 6 + (emergent ? 9 + vary() * 6 : 0);
    const lobes = 3 + Math.floor(rand() * 3);
    // Every camera in the study looks up the forest (toward −z): crowns behind the walk are never seen and keep only
    // a few leaves (their light is in the grid all the same); far crowns are seen only from above, through haze, as
    // fewer, larger sprays.
    const reach = z > T.z + 70 ? 0.3 : z < T.z - 280 ? 0.6 : 1;
    const far = z < T.z - 280;
    for (let l = 0; l < lobes; l++) {
      const a = rand() * Math.PI * 2;
      const d = rand() * R * 0.55;
      const lr = R * (0.45 + rand() * 0.25);
      const dy = (rand() - 0.5) * 6;
      const top = l === 0;
      const out = top ? d * 0.2 : R * (0.32 + 0.5 * (d / (R * 0.55)));
      const cx = x + Math.cos(a) * out;
      const cz = z + Math.sin(a) * out;
      const cy = y + (top ? lr * 0.4 : -lr * 0.12 + dy * 0.4);
      crowns.push({ x: cx, y: cy, z: cz, rx: lr, ry: lr * 0.62, rz: lr, leaves: Math.round(lr * lr * 0.78 * leafK * reach), size: far ? 6.4 : undefined });
      stampBand(grid, cx, cz, lr * 0.9, cy - lr * 0.55, cy + lr * 0.55);
      lobesAt.push([cx, cz, lr]);
    }
  }
  // The midstorey: a trunk with no crown over it is shortened and crowned below the roof — except along the shaft's
  // way down to the tiger, which must stay open. Its trunks are stamped into the light at their own height.
  const covered = (x: number, z: number) => lobesAt.some(([cx, cz, lr]) => (cx - x) ** 2 + (cz - z) ** 2 < (lr * 0.8) ** 2);
  const offShaft = (x: number, z: number, h: number) => Math.hypot(x - (T.x + (sunDir.x / sunDir.y) * h), z - (T.z + (sunDir.z / sunDir.y) * h)) > 18;
  const sv = new THREE.Vector3();
  for (const t of standing) {
    let top = CANOPY.lo + 4;
    if (!covered(t.x, t.z)) {
      const h = 50 + vary() * 22;
      if (offShaft(t.x, t.z, h + 6)) {
        top = h;
        trunkMats[t.i].compose(sv.set(t.x, -0.5, t.z), t.q, new THREE.Vector3(t.r * 0.85, h, t.r * 0.85));
        const R = 7 + vary() * 4;
        const n = 2 + Math.floor(vary() * 2);
        for (let l = 0; l < n; l++) {
          const a = vary() * Math.PI * 2;
          const out = l === 0 ? 0 : R * (0.35 + vary() * 0.3);
          const lr = R * (0.55 + vary() * 0.2);
          const cx = t.x + Math.cos(a) * out;
          const cz = t.z + Math.sin(a) * out;
          const cy = h + 3 + (l === 0 ? lr * 0.35 : 0);
          crowns.push({ x: cx, y: cy, z: cz, rx: lr, ry: lr * 0.6, rz: lr, leaves: Math.round(lr * lr * 0.85 * leafK * (t.z > T.z + 70 ? 0.3 : 1)) });
          stampBand(grid, cx, cz, lr * 0.85, cy - lr * 0.5, cy + lr * 0.5);
        }
      }
    }
    stampSolid(grid, t.x, t.z, t.r * 1.05, t.r * 1.05, 0, top, 'column');
    stampSolid(grid, t.x, t.z, t.r * 1.9, t.r * 1.9, 0, 1.2, 'dome');
  }
  const crownGeo = foliageGeometry(crowns, { size: 5.6, seed: 21, ragged: 0.3, shell: 0.72 });

  /* the understorey: saplings and shrub, in lobes of small leaves */
  const clear = (x: number, z: number, pad: number) => Math.abs(x - T.x) < 13 + pad && z > T.z - 24 - pad && z < T.z + 62;
  const shrubs: Clump[] = [];
  const shrubCount = { high: 120, balanced: 90, low: 50 }[tier];
  for (let i = 0, tries = 0; i < shrubCount && tries < shrubCount * 12; tries++) {
    const x = T.x + (rand() - 0.5) * 130;
    const z = T.z + 55 - rand() * 130;
    if (clear(x, z, 0)) continue;
    if (Math.abs(x - T.x) < 9 && z > T.z - 14 && z < T.z + 3) continue;
    if (fbm(x * 0.05 + 2, z * 0.05, 2, 83) < 0.42) continue;
    i++;
    const r = 1 + rand() * 1.9;
    const lobes = 2 + Math.floor(rand() * 3);
    for (let l = 0; l < lobes; l++) {
      const a = rand() * Math.PI * 2;
      const d = rand() * r * 0.6;
      const lr = r * (0.55 + rand() * 0.3);
      shrubs.push({ x: x + Math.cos(a) * d, y: lr * 0.7 + rand() * r * 0.5, z: z + Math.sin(a) * d, rx: lr, ry: lr * 0.75, rz: lr, leaves: Math.round(lr * lr * 70 * leafK) });
    }
    stampSolid(grid, x, z, r * 1.1, r * 1.1, 0, r * 1.5, 'dome');
  }
  const shrubGeo = foliageGeometry(shrubs, { size: 0.32, seed: 23, ragged: 0.25 });

  /* fallen logs */
  const logGeo = new THREE.CylinderGeometry(0.8, 0.95, 1, 9, 1, false);
  logGeo.translate(0, 0.5, 0);
  const logCount = 6;
  const logMats: THREE.Matrix4[] = [];
  const logSeeds = new Float32Array(logCount);
  for (let i = 0; i < logCount; i++) {
    const x = T.x + (i % 2 ? 1 : -1) * (14 + rand() * 30);
    const z = T.z - 8 - rand() * 80;
    const len = 9 + rand() * 12;
    const yaw = rand() * 3.14;
    eu.set(0, yaw, Math.PI / 2 + (rand() - 0.5) * 0.08, 'YXZ');
    q.setFromEuler(eu);
    m.compose(new THREE.Vector3(x, 0.55, z), q, new THREE.Vector3(1.0 + rand() * 0.5, len, 1.0 + rand() * 0.5));
    logMats.push(m.clone());
    logSeeds[i] = rand();
    stampSolid(grid, x, z, 2, 2, 0, 1.6, 'dome');
  }
  logGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(logSeeds, 1));

  /* grass: drifts of it, dry at the tip, and a row in front of the tiger's feet */
  const grassCount = { high: 6000, balanced: 4000, low: 2300 }[tier];
  const front = 300;
  const inst = new Float32Array((grassCount + front) * 4);
  const rnd = new Float32Array((grassCount + front) * 4);
  let placed = 0;
  const put = (x: number, z: number, sc: number) => {
    inst.set([x, -0.1, z, sc], placed * 4);
    rnd.set([rand(), rand(), rand(), rand()], placed * 4);
    placed++;
  };
  for (let i = 0; i < front; i++) put(T.x - 6 + rand() * 12, T.z + 0.2 + rand() * 3.2, 0.45 + rand() * 0.3);
  for (let tries = 0; placed < grassCount + front && tries < grassCount * 12; tries++) {
    const x = T.x + (rand() - 0.5) * 110;
    const z = T.z + 56 - rand() * 130;
    if (fbm(x * 0.04 + 13, z * 0.04, 3, 91) + (rand() - 0.5) * 0.25 < 0.48) continue;
    put(x, z, 0.3 + rand() * 0.5);
  }
  const grassGeo = tuftGeometry();
  grassGeo.setAttribute('aInst', new THREE.InstancedBufferAttribute(inst, 4));
  grassGeo.setAttribute('aRand', new THREE.InstancedBufferAttribute(rnd, 4));
  grassGeo.instanceCount = placed;

  /* the tiger's bulk */
  stampSolid(grid, T.x, T.z, 5.5, 1.6, 0, 3.6, 'dome');

  const light = new Sunlight(grid, { penumbra: 0.006, reach: 260, steps: 40, scale: 0.75 });
  const lightU = light.uniforms;

  scene.add(skyDome(1800, { ...shared }));

  const floorGeo = new THREE.PlaneGeometry(1400, 1400);
  floorGeo.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(floorGeo, new THREE.ShaderMaterial({ vertexShader: FLOOR_VERTEX, fragmentShader: FLOOR_FRAGMENT, uniforms: { ...shared, ...lightU, uSkyCol: { value: C.sky } } }));
  floor.position.z = -150;
  scene.add(floor);

  const trunkMat = new THREE.ShaderMaterial({ vertexShader: TRUNK_VERTEX, fragmentShader: TRUNK_FRAGMENT, uniforms: { ...shared, ...lightU, uSkyCol: { value: C.sky } }, side: THREE.DoubleSide });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, trunkCount);
  trunkMats.forEach((mm, i) => trunks.setMatrixAt(i, mm));
  trunks.frustumCulled = false;
  scene.add(trunks);
  const logs = new THREE.InstancedMesh(logGeo, trunkMat, logCount);
  logMats.forEach((mm, i) => logs.setMatrixAt(i, mm));
  logs.frustumCulled = false;
  scene.add(logs);

  const crownMat = foliageMaterial(
    { ...shared, ...lightU },
    { leafA: lin('#24361a', 0.55), leafB: lin('#56702a', 0.6), leafLit: lin('#c8d070'), translucency: 1.1, skyCol: C.sky, sway: 0.25, canopy: true, spray: true, depthShade: 1 },
  );
  scene.add(foliageMesh(crownGeo, crownMat));
  const shrubMat = foliageMaterial(
    { ...shared, ...lightU },
    { leafA: lin('#22341a', 0.5), leafB: lin('#5a7a2c', 0.6), leafLit: lin('#c8d070'), translucency: 1.0, skyCol: C.sky, sway: 0.03 },
  );
  scene.add(foliageMesh(shrubGeo, shrubMat));

  const grassMat = new THREE.ShaderMaterial({
    vertexShader: GRASS_VERTEX,
    fragmentShader: GRASS_FRAGMENT,
    uniforms: { ...shared, ...lightU, uSkyCol: { value: C.sky }, uTime: { value: 0 } },
    side: THREE.DoubleSide,
  });
  const grass = new THREE.Mesh(grassGeo, grassMat);
  grass.frustumCulled = false;
  scene.add(grass);

  const cutout = await new THREE.TextureLoader().loadAsync(cutoutUrl);
  cutout.colorSpace = THREE.SRGBColorSpace;
  cutout.anisotropy = 4;
  // The species' licensed 3D model where one exists (content/models.ts), else the record's cut-out photograph.
  const tiger = await subjectFor(species, {
    texture: cutout,
    width: 13,
    at: T,
    feet: 0.06,
    uniforms: { ...shared, ...lightU },
    skyCol: C.sky,
    turn: 0.6,
    fadeAbove: [0.35, 0.7],
    gain: 0.62,
    keep: 0.5,
    rim: 1.3,
    foot: 0.16,
    footCut: 0.18,
    lightReach: 2.5,
  });
  scene.add(tiger.mesh);

  const volume = new THREE.ShaderMaterial({
    vertexShader: VOLUME_VERTEX,
    fragmentShader: VOLUME_FRAGMENT,
    uniforms: {
      ...shared,
      ...lightU,
      tDepth: { value: null },
      uInvProj: { value: new THREE.Matrix4() },
      uCamWorld: { value: new THREE.Matrix4() },
      uCamPos: { value: new THREE.Vector3() },
      uSize: { value: new THREE.Vector2(1, 1) },
      uDensity: { value: 0.0035 },
      uStrength: { value: 1 },
      uG: { value: 0.62 },
    },
    depthTest: false,
    depthWrite: false,
  });

  /* the camera: in at eye level, alongside, above the crowns for the reserves, and back */
  const S = (dx: number, up: number, dz: number): [number, number, number] => [T.x + dx, up, T.z + dz];
  const N = 7;
  const at = (i: number) => (i + 0.5) / N;
  const path: Shot[] = [
    // The tiger above the title, the forest around it.
    { at: 0, pos: S(0, 3.8, 36), look: S(-3, 0.6, 0), fov: 40 },
    { at: at(0), pos: S(0, 3.8, 35), look: S(-3, 0.6, 0), fov: 40 },
    // Text at the right: the tiger to the left.
    { at: at(1), pos: S(2, 3.6, 25), look: S(10, 2.2, -4), fov: 40 },
    // The 1973 chapter, text at the left: the tiger to the right, nearer.
    { at: at(2), pos: S(-3, 3.4, 21), look: S(-10, 2.6, -2), fov: 40 },
    // Over the canopy, for the reserves the record names: the roof of crowns running away into the morning.
    { at: at(3), pos: S(30, 140, 30), look: S(-20, 82, -260), fov: 46 },
    { at: at(4), pos: S(-6, 3.2, 16), look: S(-9, 2.4, 0), fov: 38 },
    { at: at(5), pos: S(4, 3.6, 22), look: S(13, 2.4, -3), fov: 40 },
    { at: at(6), pos: S(-4, 5, 54), look: S(30, 4, -8), fov: 42 },
    { at: 1, pos: S(-6, 5.2, 57), look: S(32, 4, -8), fov: 42 },
  ];
  const rig = new CameraRig(camera, {
    preview: { at: 0, pos: S(-3, 4, 46), look: S(-6, 1.5, 0), fov: 38 },
    engage: { at: 0, pos: S(-1, 3.9, 38), look: S(-4, 1, 0), fov: 37 },
    path,
    sway: [3, 1.8],
    lambda: 4.6,
  });

  const film = grade({
    exposure: 1.6,
    tint: new THREE.Vector3(1.0, 1.0, 0.96),
    saturation: 0.95,
    contrast: 1.06,
    shadows: new THREE.Vector3(-0.004, 0.006, 0.0),
    highlights: new THREE.Vector3(1.03, 1.0, 0.94),
    vignette: 0.48,
    bloom: 0.45,
    threshold: 1.2,
  });

  let phase = 0;
  return {
    scene,
    camera,
    clear: '#121a12',
    grade: film,
    volume,
    update(i: FieldInput) {
      const p = i.progress;
      const en = i.enter;
      rig.update({ engage: i.engage, enter: en, progress: p, pointer: i.pointer, dt: i.dt, snap: i.snap || i.reduced });

      // The hand turns the sun a few degrees, and the shafts and flecks move with it. The scroll does not move it:
      // three layers of canopy light are re-marched whenever it moves, and a sun that crept with every scrolled
      // frame cost more than the change was worth.
      const late = seg(p, 0.1, 1) * en;
      setSun(AZ + i.light.x * 0.09, EL + i.light.y * 0.02);
      sunCol.lerpVectors(C.sun, C.sunLate, late);
      // From above the crowns, the air below them is not between the eye and anything.
      const aloft = THREE.MathUtils.smoothstep(camera.position.y, 20, 200);
      volume.uniforms.uStrength.value = (1 - aloft) * (NO_VOLUME ? 0 : 1);
      // Over the crowns, the roof runs away into the morning haze.
      air.uAirDensity.value = 0.006 * (1 - 0.4 * aloft);
      // The reserves are read over a quieter canopy.
      const dim = Math.max(0, Math.min(seg(p, 0.4, 0.46), 1 - seg(p, 0.56, 0.62))) * en;
      film.exposure = lerp(1.6, 1.4, aloft) * (1 - dim * 0.25);

      phase += i.reduced ? 0 : i.dt;
      grassMat.uniforms.uTime.value = phase;
      crownMat.uniforms.uTime.value = phase;
      shrubMat.uniforms.uTime.value = phase;
      tiger.update(camera, sunDir, i.reduced ? 0 : i.dt);
    },
    prerender(renderer) {
      light.update(renderer, sunDir);
    },
    resize(width, height) {
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    },
    setRung(r) {
      grassGeo.instanceCount = r >= 2 ? Math.floor(placed * 0.5) : placed;
    },
    dispose() {
      cutout.dispose();
      light.dispose();
      tiger.dispose();
      volume.dispose();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose();
        (mesh.material as THREE.Material | undefined)?.dispose?.();
      });
    },
  };
}

/** A tuft of grass: slim blades leaning out from a point. */
function tuftGeometry(): THREE.InstancedBufferGeometry {
  const r = seededRandom(19);
  const pos: number[] = [];
  const tip: number[] = [];
  const shade: number[] = [];
  const idx: number[] = [];
  for (let b = 0; b < 9; b++) {
    const a = r() * Math.PI * 2;
    const rad = r() * 0.25;
    const bx = Math.cos(a) * rad;
    const bz = Math.sin(a) * rad;
    const lean = r() * Math.PI * 2;
    const lx = Math.cos(lean);
    const lz = Math.sin(lean);
    const len = 1.0 + r() * 1.0;
    const bend = 0.25 + r() * 0.5;
    const w = 0.05 + r() * 0.035;
    const wx = -lz;
    const wz = lx;
    const s = r();
    const i0 = pos.length / 3;
    const push = (x: number, y: number, z: number, t: number) => {
      pos.push(x, y, z);
      tip.push(t);
      shade.push(s);
    };
    push(bx - wx * w, 0, bz - wz * w, 0);
    push(bx + wx * w, 0, bz + wz * w, 0);
    push(bx + lx * bend * len * 0.25 - wx * w * 0.6, len * 0.5, bz + lz * bend * len * 0.25 - wz * w * 0.6, 0.5);
    push(bx + lx * bend * len * 0.25 + wx * w * 0.6, len * 0.5, bz + lz * bend * len * 0.25 + wz * w * 0.6, 0.5);
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
