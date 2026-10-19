import * as THREE from 'three';
import { GLSL_HASH, GLSL_NOISE } from '../../gl/chunks';
import { seededRandom } from '../../gl/particles';
import { CameraRig, type Shot } from '../cameraRig';
import { lin } from '../gl/color';
import { GLSL_AIR, GLSL_FIELD_SUN, airUniforms, skyDome } from '../gl/air';
import { foliageGeometry, foliageMaterial, foliageMesh, type Clump } from '../gl/foliage';
import { grade } from '../gl/look';
import { subjectFor } from '../gl/modelSubject';
import { GLSL_SUNLIGHT, Sunlight, gridFromMesh, stampSolid, type SolidGrid } from '../gl/sunlight';
import { turn } from '../gl/turn';
import { fbm, lerp, seg, smooth } from '../noise';
import cutoutUrl from '../../../assets/field/ganges-river-dolphin-cutout.webp';
import type { FieldInput, FieldWorld, WorldContext } from '../types';

/**
 * FIELD STUDY 03 · the Ganges river dolphin, the Ganga and the Brahmaputra, early in the morning.
 *
 * A wide, silt-laden lowland river with the sun a few degrees up, low over the water ahead. Looking into it, the
 * river is a sheet of light broken into glints along the sun's path; the far bank and its tree line stand dark
 * against the bright sky and lie upside down in the water; their long shadows reach out over the river, and where
 * a shadow falls the glints go out. Mist lies on the water and drifts downstream with the current, glowing where
 * the sun is behind it. The near bank is a long beach of pale sand rising to a levee with reed; sandbars (chars)
 * stand in the channel.
 *
 * The dolphin is the record's own photograph, cut out (Anant.wildlife, CC BY 4.0): its back above the drawn
 * surface, where the photograph's own waterline is, in the glitter, with a rim of sun along its back. A faint ring
 * spreads from it.
 *
 * The same light as the other studies: the sun's shadows are worked out over the river's own bed and banks and the
 * trees stamped into it (gl/sunlight.ts); air, film and tone curve are shared (gl/air.ts, gl/look.ts).
 *
 * Honesty: the river, its banks, bars and trees are drawn, an impression of a lowland river in the
 * Ganga–Brahmaputra plain and not a model of any reach; the hour is chosen, not recorded. No dam, barrage, route or
 * locality is drawn: the record names them only in text.
 */

/* the drawn river, as a function the water, the land and the vegetation all ask */
const centre = (x: number) => 24 * Math.sin(x * 0.0062 + 0.4) + 9 * Math.sin(x * 0.017 + 1.0);
const halfWidth = (x: number) => 80 + 16 * Math.sin(x * 0.0085 + 2.0);
const sstep = (a: number, b: number, v: number) => smooth(Math.min(1, Math.max(0, (v - a) / (b - a))));

/** Sandbars: [x along the river, across (−1 far bank … +1 near bank), half-length, half-width, height]. */
const BARS: Array<[number, number, number, number, number]> = [
  [-135, 0.42, 58, 13, 1.35],
  [-30, 0.64, 34, 8.5, 1.1],
  [165, -0.38, 85, 17, 1.25],
  [330, 0.3, 100, 20, 1.3],
  [-310, -0.4, 90, 18, 1.2],
  [-520, 0.35, 110, 22, 1.25],
];

function ground(x: number, z: number): number {
  const c = centre(x);
  const hw = halfWidth(x);
  const a = (z - c) / hw; // + toward the camera's bank
  const wob = fbm(x * 0.012, z * 0.012, 3, 7) - 0.5;
  const plainNear = 3.0 + 1.1 * (fbm(x * 0.004 + 10, z * 0.004, 3, 3) - 0.5) + 0.5 * wob;
  const plainFar = 5.2 + 1.8 * (fbm(x * 0.004 + 40, z * 0.004, 3, 5) - 0.5) + 0.6 * wob;
  let h: number;
  if (a >= 1) {
    // The beach: long and gentle, then the levee.
    h = plainNear * sstep(0, 1.0, a - 1) + 0.25 * wob * sstep(0, 0.3, a - 1);
  } else if (a <= -1) {
    // The cut bank: a short steep face, then the plain.
    h = plainFar * sstep(0, 0.17, -a - 1) + 0.5 * wob * sstep(0, 0.2, -a - 1);
  } else {
    const depth = 7.2 * (0.82 + 0.36 * (fbm(x * 0.009, z * 0.02, 2, 11) - 0.5) * 2);
    // Shallow and sloping on the near side, steeper and deeper toward the far side.
    const k = a > 0 ? 1.45 : 0.62;
    h = -depth * Math.pow(Math.max(1 - a * a, 0), k);
  }
  for (const [bx, ba, sx, sz, peak] of BARS) {
    const dx = (x - bx) / sx;
    const bz = centre(bx) + ba * halfWidth(bx);
    const dz = (z - bz + 4 * (fbm(x * 0.03, z * 0.03, 2, 21) - 0.5)) / sz;
    const g = Math.exp(-(dx * dx + dz * dz));
    if (g > 0.02) {
      const top = peak + 0.18 * (fbm(x * 0.09, z * 0.09, 2, 17) - 0.5);
      h += (top - h) * sstep(0.04, 0.55, g * (0.85 + 0.3 * fbm(x * 0.05, z * 0.05, 2, 29)));
    }
  }
  return h;
}

/** The far bank's line and the height of what stands on it, in GLSL: the same river the land is shaped from. */
const RIVER_GLSL = /* glsl */ `
  float riverCentre(float x) { return 24.0 * sin(x * 0.0062 + 0.4) + 9.0 * sin(x * 0.017 + 1.0); }
  float riverHalf(float x) { return 80.0 + 16.0 * sin(x * 0.0085 + 2.0); }
`;

const WATER_VERTEX = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const WATER_FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  ${GLSL_FIELD_SUN}
  ${GLSL_AIR}
  ${GLSL_SUNLIGHT}
  ${RIVER_GLSL}
  uniform sampler2D uBed;
  uniform vec4 uBedRect;
  uniform float uTime;
  uniform float uRing;
  uniform vec2 uDolphin;
  uniform vec3 uSkyCol;
  uniform vec3 uShallow;
  uniform vec3 uDeep;
  uniform vec3 uSandy;
  uniform vec3 uTrees;
  varying vec3 vWorld;

  // The current: long streaks along the flow, finer and quicker across them, and a fine chop for the glints.
  float surf(vec2 p) {
    float a = fbm3(vec2((p.x - uTime * 1.5) * 0.16, p.y * 0.55));
    float b = fbm3(vec2((p.x - uTime * 2.6) * 0.5 + 7.0, p.y * 1.5));
    return a * 0.62 + b * 0.38;
  }
  float chop(vec2 p) {
    return valueNoise(vec2((p.x - uTime * 3.1) * 2.3, p.y * 3.4)) * 0.6 + valueNoise(vec2((p.x - uTime * 4.0) * 5.1 + 3.0, p.y * 6.7)) * 0.4;
  }

  void main() {
    vec3 p = vWorld;
    vec2 uv = (p.xz - uBedRect.xy) / uBedRect.zw;
    float bed = texture2D(uBed, uv).r;
    float depth = max(-bed, 0.0);
    vec3 V = normalize(cameraPosition - p);
    float dist = length(cameraPosition - p);
    float lod = 1.0 - smoothstep(60.0, 700.0, dist);
    float fine = 1.0 - smoothstep(20.0, 260.0, dist);

    float e = 0.3;
    float h0 = surf(p.xz);
    float hx = surf(p.xz + vec2(e, 0.0));
    float hz = surf(p.xz + vec2(0.0, e));
    float c0 = chop(p.xz);
    float cx = chop(p.xz + vec2(0.08, 0.0));
    float cz = chop(p.xz + vec2(0.0, 0.08));
    float amp = 0.34 * lod * (0.4 + 0.6 * smoothstep(0.2, 3.5, depth));
    vec2 dr = p.xz - uDolphin;
    float r = length(dr);
    float ringPhase = r * 1.5 - uTime * 1.8;
    vec2 ring = normalize(dr + 1e-4) * cos(ringPhase) * 1.5 * exp(-r * 0.13) * smoothstep(2.0, 6.0, r) * uRing * 0.06;
    // The swell carries the reflection; the chop only breaks the sun into glints.
    vec3 n = normalize(vec3(-(hx - h0) / e * amp - ring.x, 1.0, -(hz - h0) / e * amp - ring.y));
    vec3 nc = normalize(n + vec3(-(cx - c0) / 0.08 * 0.02 * fine, 0.0, -(cz - c0) / 0.08 * 0.02 * fine));

    float cosv = max(dot(n, V), 0.0);
    float F = 0.02 + 0.98 * pow(1.0 - cosv, 5.0);
    vec3 R = reflect(-V, n);
    R.y = abs(R.y);
    vec3 refl = skyAlong(R);
    // The far bank and its trees, upside down: where the reflected ray meets the bank below the treetops.
    if (R.z < -0.02) {
      float bankZ = riverCentre(p.x) - riverHalf(p.x) * 1.14;
      float s = (bankZ - p.z) / R.z;
      if (s > 0.0) {
        float hx2 = p.x + R.x * s;
        float tops = 6.0 + 9.0 * (0.6 + 0.4 * valueNoise(vec2(hx2 * 0.05, 3.0))) * smoothstep(0.25, 0.55, valueNoise(vec2(hx2 * 0.012, 7.0)) + 0.35);
        float under = 1.0 - smoothstep(-0.6, 0.6, R.y * s - tops);
        refl = mix(refl, uTrees * (0.6 + 0.4 * fbm3(vec2(hx2 * 0.2, R.y * s))), under);
      }
    }

    float sun = sunGround(p.xz);
    // The body of the water: turbid, so even shallow water is not clear; the sun lights it from within a little.
    float tr = exp(-depth * 0.3);
    vec3 body = mix(uDeep, uShallow, tr);
    body = mix(body, uSandy, smoothstep(0.9, 0.0, depth) * 0.55);
    body *= uSkyCol * 0.9 + uSunCol * sun * max(uSunDir.y, 0.0) * 0.6;

    vec3 col = mix(body, refl, clamp(F, 0.0, 1.0));
    // The sun's path: a broad sheen on the swell, and glints — each small facet of the chop tilted its own way, the
    // ones that turn the sun to the eye flashing and going out as the current moves them.
    float mu = max(dot(R, uSunDir), 0.0);
    col += uSunCol * (pow(mu, 160.0) * 0.9 + pow(mu, 22.0) * 0.05) * sun;
    vec2 cell = floor(vec2(p.x - uTime * 1.6, p.z) * vec2(2.2, 3.6));
    float ha = hash12(cell);
    float hb = hash12(cell + 17.31);
    float live = step(0.55, hash12(cell + floor(uTime * 5.0 + ha * 7.0) * 3.7));
    vec3 facet = normalize(nc + vec3((ha - 0.5) * 0.3, 0.0, (hb - 0.5) * 0.3));
    vec3 Rf = reflect(-V, facet);
    float spark = pow(max(dot(Rf, uSunDir), 0.0), 1800.0) * 70.0 * live;
    // Far off a facet is smaller than a pixel: there the glints become the sheen.
    col += uSunCol * spark * sun * (1.0 - smoothstep(60.0, 260.0, dist));
    // Where it meets the sand, the water thins to a pale edge.
    col = mix(col, uSandy * uSkyCol * 1.4, (1.0 - smoothstep(0.0, 0.3, depth)) * 0.25);
    col = applyAir(col, p);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const LAND_VERTEX = /* glsl */ `
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

const LAND_FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  ${GLSL_FIELD_SUN}
  ${GLSL_AIR}
  ${GLSL_SUNLIGHT}
  uniform vec3 uSkyCol;
  uniform vec3 uSandA;
  uniform vec3 uSandB;
  uniform vec3 uEarthA;
  uniform vec3 uEarthB;
  uniform vec3 uGrassA;
  uniform vec3 uGrassB;
  uniform vec3 uStraw;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vDepth;
  void main() {
    vec3 n0 = normalize(vNormal);
    vec2 p = vWorld.xz;
    float h = vWorld.y;
    float near = 1.0 - smoothstep(60.0, 380.0, vDepth);
    float nz = fbm3(p * 0.07);
    float nz2 = fbm3(p * 0.8);
    float nz3 = valueNoise(p * 3.4);
    vec3 n = normalize(n0 + vec3(nz2 - 0.5, 0.0, nz3 - 0.5) * 0.5 * near);
    float slope = 1.0 - n0.y;

    // Sand: pale, ripple-marked along the current, darker where it is wet.
    vec3 sand = mix(uSandA, uSandB, nz) * (0.9 + 0.2 * nz2);
    float rip = sin(p.y * 1.7 + nz * 7.0 + p.x * 0.05) * 0.5 + 0.5;
    n = normalize(n + vec3(0.0, 0.0, (rip - 0.5) * 0.25) * near * (1.0 - smoothstep(1.2, 2.2, h)));
    float wet = 1.0 - smoothstep(0.0, 0.5, h);
    sand = mix(sand, sand * 0.45, wet * 0.9);

    // Silt and earth: layered where the bank is steep.
    vec3 earth = mix(uEarthA, uEarthB, nz2);
    float strata = sin(h * 8.0 + nz * 6.0 + nz2 * 1.5) * 0.5 + 0.5;
    earth *= 0.8 + 0.35 * strata;

    // Grass and reed on the levee and the plain, patchy and dry in places.
    float patchN = fbm3(p * 0.03 + 11.0);
    vec3 grass = mix(uGrassA, uGrassB, nz2 * 0.8 + patchN * 0.4);
    grass = mix(grass, uStraw, smoothstep(0.5, 0.78, fbm3(p * 0.012 + 3.0)) * 0.7);
    grass *= 0.8 + 0.35 * nz3;
    float veg = smoothstep(1.1, 2.3, h + (nz - 0.5) * 1.6) * (1.0 - smoothstep(0.5, 0.85, slope));

    vec3 col = mix(sand, grass, veg);
    col = mix(col, earth, smoothstep(0.12, 0.38, slope) * smoothstep(0.3, 1.0, h));
    float blocks = fbm3(p * 0.006 + 20.0);
    col = mix(col, mix(uStraw * 0.95, uGrassA * 0.82, smoothstep(0.35, 0.65, blocks)), veg * smoothstep(2.4, 3.2, h) * 0.75);

    float sun = sunGround(p);
    float sky = skyGround(p);
    vec3 light = uSunCol * max(dot(n, uSunDir), 0.0) * sun + uSkyCol * sky * (0.55 + 0.45 * n.y);
    col *= light;
    col = applyAir(col, vWorld);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const REED_VERTEX = /* glsl */ `
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
    float wind = sin(uTime * 0.9 + aRand.z * 6.28 + aInst.x * 0.04) * 0.5 + sin(uTime * 0.4 + aInst.z * 0.03) * 0.5;
    p.x += wind * aTip * aTip * aInst.w * 0.1;
    vec3 w = aInst.xyz + p;
    vWorld = w;
    vTip = aTip;
    vShade = aShade;
    vRand = aRand.y;
    vSun = sunGround(aInst.xz);
    vSky = 1.0;
    vAirT = airTransmittance(w);
    vAirGlow = airGlow(normalize(w - cameraPosition)) * (1.0 - vAirT);
    gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
  }
`;

const REED_FRAGMENT = /* glsl */ `
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
    vec3 base = mix(vec3(0.02, 0.04, 0.012), vec3(0.06, 0.08, 0.02), vRand);
    vec3 tip = mix(vec3(0.3, 0.28, 0.1), vec3(0.42, 0.36, 0.14), vRand);
    vec3 albedo = mix(base, tip, pow(t, 1.3)) * (0.8 + 0.3 * vShade);
    vec3 Vd = normalize(vWorld - cameraPosition);
    float through = pow(max(dot(Vd, uSunDir), 0.0), 5.0);
    float sun = clamp(vSun, 0.0, 1.0);
    vec3 light = uSunCol * sun * (0.25 + 0.4 * vShade) * max(uSunDir.y * 3.0, 0.3) + uSunCol * sun * through * (0.3 + 1.2 * t) + uSkyCol * vSky * (0.5 + 0.4 * t);
    vec3 col = albedo * light;
    col = col * vAirT + vAirGlow;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const TRUNK_FRAGMENT = /* glsl */ `
  ${GLSL_FIELD_SUN}
  ${GLSL_AIR}
  uniform vec3 uSkyCol;
  varying vec3 vWorld;
  void main() {
    vec3 col = vec3(0.035, 0.03, 0.025) * (uSkyCol * 0.8 + uSunCol * 0.05);
    col = applyAir(col, vWorld);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const TRUNK_VERTEX = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

/** Mist lying on the water: a sheet whose thickness is noise drifting downstream, glowing toward the sun. */
const MIST_FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  ${GLSL_FIELD_SUN}
  ${GLSL_AIR}
  uniform float uTime;
  uniform float uMist;
  uniform float uLayer;
  varying vec3 vWorld;
  void main() {
    vec2 p = vWorld.xz;
    float m = fbm3(vec2((p.x - uTime * (1.2 + uLayer)) * 0.012, p.y * 0.03 + uLayer * 7.0));
    m = smoothstep(0.42, 0.78, m + (valueNoise(p * 0.06 - uTime * 0.05) - 0.5) * 0.18);
    vec3 dir = normalize(vWorld - cameraPosition);
    float d = distance(vWorld, cameraPosition);
    // Thin up close (the camera is in it, not behind a wall of it), gone in the distance where the air takes over.
    float a = m * uMist * smoothstep(6.0, 40.0, d) * (1.0 - smoothstep(300.0, 900.0, d));
    // The mist glows toward the sun, but a sheet of it is never brighter than the sky behind it.
    vec3 col = min(airGlow(dir) * 0.6, vec3(1.6));
    gl_FragColor = vec4(col, a);
  }
`;

const MIST_VERTEX = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const SKY_CLOUD = /* glsl */ `
  vec2 cp = dir.xz / (dir.y + 0.25) * 1.1;
  float c = fbm3(vec2(cp.x * 0.9, cp.y * 1.8)) * 0.65 + fbm3(cp * 3.5) * 0.35;
  float cloud = smoothstep(0.5, 0.8, c) * smoothstep(0.03, 0.3, dir.y);
  vec3 lit = uSunCol * (0.03 + 0.02 * airPhase(dot(dir, uSunDir))) + uAirCol * 0.7;
  col = mix(col, lit, cloud * 0.45);
`;

export async function createRiver({ tier, species }: WorldContext): Promise<FieldWorld> {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 4200);

  const C = {
    shallow: lin('#6d6a4e', 0.5),
    deep: lin('#2c3326', 0.5),
    sandy: lin('#a59a78', 0.6),
    trees: lin('#1c2016', 0.12),
    sky: lin('#8a9cb4', 0.45),
    sunEarly: lin('#ffc684', 4.2),
    sunLate: lin('#ffdcae', 4.6),
    air: lin('#8d8f88', 0.3),
    zenith: lin('#4a6283', 0.55),
    sandA: lin('#bcae8c'),
    sandB: lin('#a39478'),
    earthA: lin('#76634a'),
    earthB: lin('#5d5140'),
    grassA: lin('#46552a'),
    grassB: lin('#6b6d36'),
    straw: lin('#968c58'),
  };
  const yieldNow = turn();
  const sunDir = new THREE.Vector3();
  const sunCol = C.sunEarly.clone();
  const setSun = (azimuth: number, elevation: number) => {
    sunDir.set(Math.cos(elevation) * Math.cos(azimuth), Math.sin(elevation), Math.cos(elevation) * Math.sin(azimuth)).normalize();
  };
  // Ahead of the opening camera and to its right, low over the far bank: the glitter runs under the words at the
  // right, the title stands over darker water, and the dolphin takes the light from the side with a rim on its back.
  const AZ = -0.5;
  setSun(AZ, 0.1);

  const air = airUniforms({
    density: 0.0028,
    falloff: 0.06,
    base: 0,
    colour: C.air,
    mie: 0.32,
    g: 0.78,
    zenith: C.zenith,
    disc: 10,
    discSize: 0.013,
  });
  const shared = { uSunDir: { value: sunDir }, uSunCol: { value: sunCol }, ...air };

  scene.add(skyDome(3800, { ...shared }, SKY_CLOUD, `${GLSL_HASH}${GLSL_NOISE}`));

  /* the land: the river's bed, its banks, its bars and the plain on both sides */
  const LAND = { x0: -1000, x1: 1000, z0: -900, z1: 560 };
  const segX = { high: 400, balanced: 300, low: 210 }[tier];
  const segZ = Math.round((segX * (LAND.z1 - LAND.z0)) / (LAND.x1 - LAND.x0));
  const geo = new THREE.PlaneGeometry(LAND.x1 - LAND.x0, LAND.z1 - LAND.z0, segX, segZ);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let k = 0; k < pos.count; k++) {
    if ((k & 1023) === 0) await yieldNow();
    const x = pos.getX(k) + (LAND.x0 + LAND.x1) / 2;
    const z = pos.getZ(k) + (LAND.z0 + LAND.z1) / 2;
    pos.setXYZ(k, x, ground(x, z), z);
  }
  geo.computeVertexNormals();
  geo.computeBoundingSphere();

  /* the bed, once: the water's depth, and (with the surface laid over it) the river's own sun grid */
  const BED = { x0: -1000, z0: -300, w: 2000, d: 600, nx: 1000, nz: 300 };
  const bedData = new Uint16Array(BED.nx * BED.nz);
  const surface = new Float32Array(BED.nx * BED.nz);
  for (let j = 0; j < BED.nz; j++) {
    await yieldNow();
    for (let i = 0; i < BED.nx; i++) {
      const x = BED.x0 + ((i + 0.5) / BED.nx) * BED.w;
      const z = BED.z0 + ((j + 0.5) / BED.nz) * BED.d;
      const g = ground(x, z);
      bedData[j * BED.nx + i] = THREE.DataUtils.toHalfFloat(Math.max(-12, Math.min(8, g)));
      surface[j * BED.nx + i] = Math.max(g, 0);
    }
  }
  const bedTex = new THREE.DataTexture(bedData, BED.nx, BED.nz, THREE.RedFormat, THREE.HalfFloatType);
  bedTex.minFilter = THREE.LinearFilter;
  bedTex.magFilter = THREE.LinearFilter;
  bedTex.wrapS = THREE.ClampToEdgeWrapping;
  bedTex.wrapT = THREE.ClampToEdgeWrapping;
  bedTex.needsUpdate = true;
  const fine: SolidGrid = { rect: [BED.x0, BED.z0, BED.x0 + BED.w, BED.z0 + BED.d], nx: BED.nx, nz: BED.nz, solid: surface };
  const coarse = gridFromMesh(geo, segX, segZ);
  for (let i = 0; i < coarse.solid.length; i++) coarse.solid[i] = Math.max(coarse.solid[i], 0);

  const rand = seededRandom(41);

  /* the tree line above the far bank, and scattered clumps on the plain: leaves, trunks, and their bulk in the light */
  const treeCount = { high: 560, balanced: 420, low: 240 }[tier];
  const leafDensity = { high: 1, balanced: 0.8, low: 0.5 }[tier];
  const clumps: Clump[] = [];
  const trunkMats: THREE.Matrix4[] = [];
  const m4 = new THREE.Matrix4();
  const q4 = new THREE.Quaternion();
  for (let k = 0; k < treeCount; k++) {
    const x = -760 + rand() * 1520;
    const c = centre(x);
    const hw = halfWidth(x);
    // A ragged line a little back from the cut bank, and a second rank farther out.
    const back = rand() < 0.7 ? 10 + rand() * 50 : 80 + rand() * 360;
    const z = c - hw * 1.17 - back;
    const w = 2.2 + rand() * 3.2;
    const hgt = w * (1.6 + rand() * 0.8);
    const y = ground(x, z);
    const crownBase = y + hgt * (0.35 + rand() * 0.15);
    const lobes = 2 + Math.floor(rand() * 3);
    for (let l = 0; l < lobes; l++) {
      const ox = (rand() - 0.5) * w * 0.9;
      const oz = (rand() - 0.5) * w * 0.7;
      const r = w * (0.45 + rand() * 0.3);
      clumps.push({ x: x + ox, y: crownBase + (hgt - (crownBase - y)) * (0.35 + rand() * 0.35), z: z + oz, rx: r, ry: r * (0.7 + rand() * 0.3), rz: r, leaves: Math.round(r * r * 22 * leafDensity) });
    }
    m4.compose(new THREE.Vector3(x, y + (crownBase - y) * 0.5 + 0.5, z), q4.identity(), new THREE.Vector3(w * 0.09, crownBase - y + 1, w * 0.09));
    trunkMats.push(m4.clone());
    for (const g of [fine, coarse]) {
      stampSolid(g, x, z, w * 0.85, w * 0.85, crownBase, hgt - (crownBase - y), 'dome');
      stampSolid(g, x, z, w * 0.18, w * 0.18, y, crownBase - y, 'column');
    }
  }
  const treeGeo = foliageGeometry(clumps, { size: 0.46, seed: 9, ragged: 0.2 });

  /* reed and grass at the water's edge, on the bars and along the levee */
  const reedCount = { high: 7000, balanced: 4600, low: 2600 }[tier];
  const inst = new Float32Array(reedCount * 4);
  const rnd = new Float32Array(reedCount * 4);
  let placed = 0;
  for (let tries = 0; placed < reedCount && tries < reedCount * 40; tries++) {
    if ((tries & 1023) === 0) await yieldNow();
    const x = -420 + rand() * 840;
    const c = centre(x);
    const hw = halfWidth(x);
    const side = rand();
    const z = side < 0.78 ? c + hw * (0.3 + rand() * 1.9) : c - hw * (0.95 + rand() * 0.6);
    const y = ground(x, z);
    const m = fbm(x * 0.03 + 5, z * 0.03, 3, 61);
    const edge = y > 0.35 && y < 2.9;
    if (!edge) continue;
    if (m + (rand() - 0.5) * 0.25 < 0.46) continue;
    const sc = 0.55 + rand() * 1.0;
    inst.set([x, y - 0.1, z, sc], placed * 4);
    rnd.set([rand(), rand(), rand(), rand()], placed * 4);
    stampSolid(fine, x, z, 0.6, 0.6, y, sc * 1.6, 'cone');
    placed++;
  }
  const reedGeo = reedGeometry();
  reedGeo.setAttribute('aInst', new THREE.InstancedBufferAttribute(inst, 4));
  reedGeo.setAttribute('aRand', new THREE.InstancedBufferAttribute(rnd, 4));
  reedGeo.instanceCount = placed;

  /* the dolphin: its back at the surface where the photograph's own waterline is */
  const P = new THREE.Vector3(0, 0, centre(0));
  stampSolid(fine, P.x, P.z, 4, 2.5, 0, 3.2, 'dome');

  const fineLight = new Sunlight(fine, { penumbra: 0.008, reach: 420, steps: 36 });
  const coarseLight = new Sunlight(coarse, { penumbra: 0.01, reach: 900, steps: 32 });
  const lightU = fineLight.withFar(coarseLight);

  const landMat = new THREE.ShaderMaterial({
    vertexShader: LAND_VERTEX,
    fragmentShader: LAND_FRAGMENT,
    uniforms: {
      ...shared,
      ...lightU,
      uSkyCol: { value: C.sky },
      uSandA: { value: C.sandA },
      uSandB: { value: C.sandB },
      uEarthA: { value: C.earthA },
      uEarthB: { value: C.earthB },
      uGrassA: { value: C.grassA },
      uGrassB: { value: C.grassB },
      uStraw: { value: C.straw },
    },
  });
  scene.add(new THREE.Mesh(geo, landMat));

  const waterMat = new THREE.ShaderMaterial({
    vertexShader: WATER_VERTEX,
    fragmentShader: WATER_FRAGMENT,
    uniforms: {
      ...shared,
      ...lightU,
      uBed: { value: bedTex },
      uBedRect: { value: new THREE.Vector4(BED.x0, BED.z0, BED.w, BED.d) },
      uTime: { value: 0 },
      uRing: { value: 1 },
      uDolphin: { value: new THREE.Vector2(P.x, P.z) },
      uSkyCol: { value: C.sky },
      uShallow: { value: C.shallow },
      uDeep: { value: C.deep },
      uSandy: { value: C.sandy },
      uTrees: { value: C.trees },
    },
  });
  const waterGeo = new THREE.PlaneGeometry(2000, 1460, 1, 1);
  waterGeo.rotateX(-Math.PI / 2);
  waterGeo.translate((LAND.x0 + LAND.x1) / 2, 0, (LAND.z0 + LAND.z1) / 2);
  scene.add(new THREE.Mesh(waterGeo, waterMat));

  const treeMat = foliageMaterial(
    { ...shared, ...lightU },
    { leafA: lin('#1f2c14', 0.5), leafB: lin('#3b4a20', 0.5), leafLit: lin('#b8c070'), translucency: 0.8, skyCol: C.sky, sway: 0.05 },
  );
  scene.add(foliageMesh(treeGeo, treeMat));
  const trunkMat = new THREE.ShaderMaterial({ vertexShader: TRUNK_VERTEX, fragmentShader: TRUNK_FRAGMENT, uniforms: { ...shared, uSkyCol: { value: C.sky } } });
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.6, 1, 1, 6, 1, true), trunkMat, trunkMats.length);
  trunkMats.forEach((mm, i) => trunks.setMatrixAt(i, mm));
  trunks.frustumCulled = false;
  scene.add(trunks);

  const reedMat = new THREE.ShaderMaterial({
    vertexShader: REED_VERTEX,
    fragmentShader: REED_FRAGMENT,
    uniforms: { ...shared, ...lightU, uSkyCol: { value: C.sky }, uTime: { value: 0 } },
    side: THREE.DoubleSide,
  });
  const reeds = new THREE.Mesh(reedGeo, reedMat);
  reeds.frustumCulled = false;
  scene.add(reeds);

  /* mist on the water, two sheets drifting downstream at different speeds */
  const mistMats: THREE.ShaderMaterial[] = [];
  for (const [y, layer, strength] of [
    [0.8, 0, 0.32],
    [2.6, 1, 0.2],
  ] as const) {
    const g = new THREE.PlaneGeometry(1600, 900, 1, 1);
    g.rotateX(-Math.PI / 2);
    g.translate(0, y, -40);
    const mm = new THREE.ShaderMaterial({
      vertexShader: MIST_VERTEX,
      fragmentShader: MIST_FRAGMENT,
      uniforms: { ...shared, uTime: { value: 0 }, uMist: { value: strength }, uLayer: { value: layer } },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    mistMats.push(mm);
    const mesh = new THREE.Mesh(g, mm);
    mesh.renderOrder = 5;
    scene.add(mesh);
  }

  const cutout = await new THREE.TextureLoader().loadAsync(cutoutUrl);
  cutout.colorSpace = THREE.SRGBColorSpace;
  cutout.anisotropy = 4;
  // The species' licensed 3D model where one exists (content/models.ts), else the record's cut-out photograph.
  const dolphin = await subjectFor(species, {
    texture: cutout,
    width: 18,
    at: new THREE.Vector3(P.x, 0.05, P.z),
    feet: 0.02,
    uniforms: { ...shared, ...lightU },
    skyCol: C.sky,
    turn: 1.2,
    fadeAbove: [0.4, 0.8],
    gain: 0.6,
    keep: 0.55,
    rim: 1.6,
    foot: 0.1,
    lightReach: 4.5,
  });
  dolphin.mesh.renderOrder = 4;
  scene.add(dolphin.mesh);

  /* the camera: low on the water, in close for the photograph, high for the map, and back */
  const S = (dx: number, up: number, dz: number): [number, number, number] => [P.x + dx, up, P.z + dz];
  const N = 7;
  const at = (i: number) => (i + 0.5) / N;
  const path: Shot[] = [
    // Subject at the upper left, the title below it, text at the right. On a phone the words take the top and the
    // bottom of the screen: the dolphin is whole, centred, in the band of river between them.
    { at: 0, pos: S(-22, 5.4, 42), look: S(12, 1.5, -4), fov: 40, narrow: { pos: S(-25, 5.0, 47), look: S(0.5, 6.0, 0), fov: 40 } },
    { at: at(0), pos: S(-21, 5.2, 41), look: S(12, 1.5, -4), fov: 40, narrow: { pos: S(-24.5, 4.9, 46.5), look: S(0.5, 5.9, 0), fov: 40 } },
    // On a phone the habitat's words sit in the middle of the screen: the dolphin drops below them, small in the river.
    { at: at(1), pos: S(-58, 10, 66), look: S(26, 2.5, -22), fov: 42, narrow: { pos: S(-46, 11, 74), look: S(8, 19, -16), fov: 42 } },
    // The record's map, from above: the whole bend, its bars and the plain.
    { at: at(2), pos: S(40, 330, 110), look: S(70, 0, -40), fov: 46 },
    { at: at(3), pos: S(-12, 3.6, 38), look: S(8, 2.6, 0), fov: 34 },
    { at: at(4), pos: S(38, 7, 50), look: S(-18, 2.2, -6), fov: 42 },
    { at: at(5), pos: S(-40, 12, 74), look: S(18, 2.4, -12), fov: 42 },
    // Text in the middle: the dolphin stands to its left, small in a wide river.
    { at: at(6), pos: S(-70, 15, 92), look: S(115, 3, -30), fov: 46 },
    { at: 1, pos: S(-72, 15.5, 95), look: S(117, 3, -30), fov: 46 },
  ];
  const rig = new CameraRig(camera, {
    preview: { at: 0, pos: S(-30, 7, 52), look: S(6, 3, -6), fov: 42 },
    engage: { at: 0, pos: S(-24, 5.6, 42), look: S(8, 3.2, -5), fov: 39 },
    path,
    sway: [3.2, 2],
    lambda: 5.2,
  });

  const film = grade({
    exposure: 1.15,
    tint: new THREE.Vector3(1.0, 0.99, 0.97),
    saturation: 0.9,
    contrast: 1.04,
    shadows: new THREE.Vector3(0.0, 0.004, 0.01),
    highlights: new THREE.Vector3(1.02, 1.0, 0.95),
    vignette: 0.42,
    bloom: 0.5,
    threshold: 1.4,
  });

  let phase = 0;
  return {
    scene,
    camera,
    clear: '#1c2228',
    grade: film,
    update(i: FieldInput) {
      const p = i.progress;
      const en = i.enter;
      rig.update({ engage: i.engage, enter: en, progress: p, pointer: i.pointer, dt: i.dt, snap: i.snap || i.reduced });

      // The sun climbs out of the mist through the study; the hand turns it a few degrees.
      const climb = seg(p, 0.1, 1) * en;
      setSun(AZ + i.light.x * 0.18, lerp(0.1, 0.2, climb) + i.light.y * 0.02);
      sunCol.lerpVectors(C.sunEarly, C.sunLate, climb);
      air.uAirDensity.value = lerp(0.0028, 0.0018, climb);

      phase += i.reduced ? 0 : i.dt;
      waterMat.uniforms.uTime.value = phase;
      reedMat.uniforms.uTime.value = phase;
      treeMat.uniforms.uTime.value = phase;
      for (const mm of mistMats) mm.uniforms.uTime.value = phase;
      waterMat.uniforms.uRing.value = i.reduced ? 0 : 1;
      dolphin.update(camera, sunDir, i.reduced ? 0 : i.dt);
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
      reedGeo.instanceCount = r >= 2 ? Math.floor(placed * 0.5) : placed;
    },
    dispose() {
      cutout.dispose();
      bedTex.dispose();
      fineLight.dispose();
      coarseLight.dispose();
      dolphin.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        (m.material as THREE.Material | undefined)?.dispose?.();
      });
    },
  };
}

/** A tuft of reed: long, slim blades leaning out from a point. */
function reedGeometry(): THREE.InstancedBufferGeometry {
  const rand = seededRandom(77);
  const pos: number[] = [];
  const tip: number[] = [];
  const shade: number[] = [];
  const idx: number[] = [];
  for (let b = 0; b < 8; b++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * 0.2;
    const bx = Math.cos(a) * r;
    const bz = Math.sin(a) * r;
    const lean = rand() * Math.PI * 2;
    const lx = Math.cos(lean);
    const lz = Math.sin(lean);
    const len = 1.1 + rand() * 0.9;
    const bend = 0.2 + rand() * 0.45;
    const w = 0.04 + rand() * 0.03;
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
