import * as THREE from 'three';
import { GLSL_HASH, GLSL_NOISE } from '../../gl/chunks';
import { seededRandom } from '../../gl/particles';
import { CameraRig, type Shot } from '../cameraRig';
import { lin } from '../gl/color';
import { GLSL_AIR, GLSL_FIELD_SUN, airUniforms, skyDome } from '../gl/air';
import { foliageGeometry, foliageMaterial, foliageMesh, type Clump } from '../gl/foliage';
import { grade } from '../gl/look';
import { subjectFor } from '../gl/modelSubject';
import { GLSL_SUNLIGHT, Sunlight, stampSolid, type SolidGrid } from '../gl/sunlight';
import { fbm, lerp, seg } from '../noise';
import cutoutUrl from '../../../assets/field/indian-rhinoceros-cutout.webp';
import type { FieldInput, FieldWorld, WorldContext } from '../types';

/**
 * FIELD STUDY 05 · the greater one-horned rhinoceros, the Brahmaputra floodplain, under storm cloud.
 *
 * A deck of dark cloud covers the sky; the sun is low under its western edge, behind the camera's right shoulder,
 * so everything it reaches — the turf, the heads of the elephant grass, the far line of riverine forest and the
 * animal — stands lit gold against a slate sky, and every stand of tall grass throws a long shadow across the short
 * turf. The wallows and the beel hold the dark sky. Toward the far shore, rain hangs from the cloud. The wind is
 * up: the grass moves more than in any other study.
 *
 * The same light as the other studies: the sun's shadows are worked out over the floodplain's grid with each stand
 * of grass, the tree line and the animal's bulk stamped into it (gl/sunlight.ts); air, film and tone curve are
 * shared (gl/air.ts, gl/look.ts).
 *
 * The rhinoceros is a photograph cut out of its background (Tisha Mukherjee, CC BY-SA 4.0) — not the species
 * record's own photograph, which has branches across the animal — standing in the trodden ground at the edge of
 * the grass, its lower body stained with mud, lit by the same sun.
 *
 * Honesty: the floodplain is drawn, an impression of a Brahmaputra floodplain and not of Kaziranga or any other
 * park; the weather and the hour are chosen, not recorded; the sites the record names are listed in the text and
 * not drawn. The figures are in the text, not drawn as points.
 */

/**
 * The storm, as seen along a direction: shared by the sky and the water that reflects it.
 *
 * Not a volume: two sheets over the plain, each a 2D field read in perspective (its forms crowd toward the
 * horizon), lit by a rule rather than marched — the least expensive thing that gives a storm sky shape and depth.
 *
 *   deck   the ceiling, at one height. Large masses (low-frequency noise) carry billows (domain-warped, finer); a
 *          thick mass is darker. The deck ends a few of its own heights sunward of the camera, and the sun, low
 *          under that edge, lights its underside from below: strongly near the edge, fading the further in under the
 *          deck a point lies, so the ceiling overhead is lit warm and the far deck over the horizon goes to slate.
 *          On each billow the flank that faces the sun catches that light (the field read once more, a step
 *          sunward), which is what gives the base its relief.
 *   scud   ragged low cloud under the deck, near the horizon, dark against the lighter strip of air beyond the
 *          storm and touched with gold on its sunward side: the second plane that puts depth under the deck.
 *
 * Away from the sun rain hangs from the deck. The water's reflection reads the deck only (`detail` 0).
 */
const CLOUD = /* glsl */ `
  uniform vec3 uCloudDark;
  uniform vec3 uCloudLit;
  uniform float uTime;
  // 1: the billows' relief and the scud; 0.5 (the frame governor's first step): relief, no scud; 0 (its second): neither.
  uniform float uSkyDetail;
  vec3 stormSky(vec3 dir, vec3 clear, float detail) {
    detail *= uSkyDetail;
    float y = max(dir.y, 0.0);
    vec2 sunXZ = normalize(uSunDir.xz + 1e-4);
    float sunward = dot(normalize(dir.xz + 1e-4), sunXZ);
    // The point of the deck seen along dir, in units of the deck's height, from the point overhead.
    vec2 X = dir.xz / (y + 0.045);
    float toward = dot(X, sunXZ);
    // Light under the deck: full at its edge (2.8 heights sunward), fading the further in.
    float reach = exp(-max(2.8 - toward, 0.0) * 0.55);
    float open = smoothstep(2.6, 3.6, toward);

    // The deck: masses carrying billows. Its forms hang down from it, so they are not foreshortened as a flat sheet's
    // would be: the pattern is read on a gentler curve (overhead a billow is about as tall as it is wide; toward the
    // horizon they still crowd). Scaled from dir.xz itself, which goes to nothing overhead, so the pattern has no
    // seam at the zenith (the water reflects steep directions).
    vec2 p = dir.xz * (2.6 / pow(y + 0.03, 0.42)) + vec2(uTime * 0.012, uTime * 0.004);
    vec2 warp = vec2(valueNoise(p * 0.17 + 1.7), valueNoise(p * 0.17 + 9.2)) - 0.5;
    float mass = valueNoise(p * 0.26 + warp * 0.5 + 11.0);
    vec2 q = (p + warp * 1.5) * 1.4;
    float bil = fbm3(q);
    float d = mass * 0.6 + bil * 0.4;
    float thick = smoothstep(0.38, 0.66, d);
    // The sunward flank of each billow catches the light.
    float flank = 0.3;
    if (detail > 0.25) flank = clamp((bil - fbm3(q + sunXZ * 0.1)) * 7.0 + 0.25, 0.0, 1.0);
    // Slate, modelled by the sky's own grey light; the sun's warm light only as far in as it reaches.
    vec3 deck = uCloudDark * (mix(1.7, 0.45, thick) + 1.25 * (flank - 0.35) * (1.0 - 0.4 * thick));
    deck += uCloudLit * reach * (0.03 + 0.85 * flank * flank) * mix(1.0, 0.5, thick);
    deck = max(deck, vec3(0.0));
    float cover = smoothstep(0.22, 0.4, d + 0.12 - open);
    vec3 col = mix(clear, deck, cover);

    // Beyond the storm, a lighter strip of air at the horizon all round, warm toward the sun.
    float strip = 1.0 - smoothstep(0.0, 0.045, y);
    vec3 beyond = mix(clear, uCloudLit * 0.42, 0.25 + 0.5 * max(sunward, 0.0)) + uCloudDark * 0.6;
    col = mix(col, beyond, strip * 0.75);

    if (detail > 0.75 && y < 0.2) {
      // The scud: lower and nearer, broken, dark against the strip, gold on its sunward edge.
      vec2 sp = dir.xz * (2.4 / pow(y + 0.02, 0.5)) + vec2(uTime * 0.03, uTime * 0.01) + warp;
      float sc = fbm3(sp + 20.0);
      float scud = smoothstep(0.54, 0.62, sc) * smoothstep(0.008, 0.03, y) * (1.0 - smoothstep(0.07, 0.17, y));
      float lit = sc > 0.52 ? clamp((sc - fbm3(sp + sunXZ * 0.12 + 20.0)) * 9.0, 0.0, 1.0) : 0.0;
      vec3 rag = uCloudDark * 0.6 + uCloudLit * (0.03 + 0.55 * lit) * (0.3 + 0.7 * max(sunward, 0.0));
      col = mix(col, rag, scud * 0.9);
    }

    // Rain hangs from the deck away from the sun: grey curtains down to the horizon, thinning upward.
    float away = max(-sunward, 0.0);
    float rain = smoothstep(0.5, 0.85, valueNoise(vec2(atan(dir.z, dir.x) * 14.0, y * 3.0))) * away * (1.0 - smoothstep(0.0, 0.14, y));
    return mix(col, uCloudDark * 1.6, rain * 0.5);
  }
`;

/** Where the water is: three wallows near the animal and a long beel behind. */
const WATER = /* glsl */ `
  float wallow(vec2 p, vec2 c, vec2 r) {
    return length((p - c) / r) + 0.22 * (valueNoise(p * 0.22) - 0.5) + 0.1 * (valueNoise(p * 0.7 + 4.0) - 0.5);
  }
  // 0 = dry, 1 = water; the rim distance goes in y.
  vec2 waterAt(vec2 p) {
    float d = min(min(wallow(p, vec2(-14.0, 15.0), vec2(13.0, 6.5)), wallow(p, vec2(32.0, -22.0), vec2(16.0, 7.0))), wallow(p, vec2(-46.0, -32.0), vec2(11.0, 5.0)));
    float near = 1.0 - smoothstep(0.86, 1.0, d);
    float nearEdge = -112.0 + 26.0 * (fbm3(vec2(p.x * 0.012, 3.0)) - 0.5) * 2.0;
    float farEdge = -196.0 + 14.0 * (fbm3(vec2(p.x * 0.02, 9.0)) - 0.5) * 2.0;
    float beel = smoothstep(nearEdge, nearEdge - 3.0, p.y) * smoothstep(farEdge, farEdge + 3.0, p.y);
    beel *= 1.0 - smoothstep(0.62, 0.7, fbm3(p * vec2(0.02, 0.05) + 17.0)) * 0.9;
    return vec2(max(near, beel), d);
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
  ${CLOUD}
  ${WATER}
  uniform vec3 uSkyCol;
  varying vec3 vWorld;
  void main() {
    vec2 p = vWorld.xz;
    float dist = distance(vWorld, cameraPosition);
    float near = 1.0 - smoothstep(40.0, 220.0, dist);
    float coarse = fbm3(p * 0.05);
    float fine = valueNoise(p * 2.4);
    // Turf and earth: green where it is damp and grassed, bare where it is trodden.
    vec3 earth = mix(vec3(0.09, 0.055, 0.025), vec3(0.16, 0.1, 0.045), coarse);
    vec3 turf = mix(vec3(0.07, 0.11, 0.02), vec3(0.17, 0.19, 0.04), fbm3(p * 0.11 + 4.0));
    float cover = smoothstep(0.18, 0.5, fbm3(p * 0.045 + 8.0));
    vec3 col = mix(earth, turf, cover * 0.92);
    float trod = 1.0 - smoothstep(6.0, 26.0, length((p - vec2(0.0, 2.0)) * vec2(0.75, 1.2)));
    col = mix(col, earth * 1.04, trod * 0.38);
    col *= 0.75 + 0.45 * fine * near + 0.15 * (1.0 - near) * coarse;
    vec2 w = waterAt(p);
    // Wet dark mud round the water, drying outward.
    float rim = (1.0 - smoothstep(0.98, 1.6, w.y)) * (1.0 - w.x);
    col = mix(col, vec3(0.03, 0.018, 0.01), rim * 0.8);
    vec3 n = normalize(vec3((fine - 0.5) * 0.4 * near, 1.0, (valueNoise(p * 2.4 + 7.0) - 0.5) * 0.4 * near));
    float sun = near > 0.0 ? sunGroundSoft(p) : sunGround(p);
    float sky = skyGround(p);
    col *= uSunCol * max(dot(n, uSunDir), 0.0) * sun + uSkyCol * sky;
    // Water: turbid, holding the storm sky; wet mud shines where it catches the low sun. Only where there is water.
    if (w.x > 0.002) {
    vec3 V = normalize(cameraPosition - vWorld);
    float fres = 0.04 + 0.9 * pow(1.0 - clamp(V.y, 0.0, 1.0), 5.0);
    vec3 R = vec3(-V.x, max(V.y, 0.01), -V.z);
    R.xz += (vec2(valueNoise(p * vec2(0.9, 3.5)), valueNoise(p * vec2(1.1, 3.0) + 4.0)) - 0.5) * 0.03;
    vec3 refl = stormSky(normalize(R), skyAlong(normalize(R)), 0.0);
    vec3 bed = vec3(0.03, 0.025, 0.012) * (uSkyCol + uSunCol * sun * 0.15);
    vec3 water = mix(bed, refl, fres);
    float glint = pow(max(dot(reflect(-V, vec3(0.0, 1.0, 0.0)), uSunDir), 0.0), 300.0) * 8.0;
    water += uSunCol * glint * sun;
    col = mix(col, water, w.x);
    }
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
  uniform float uWind;
  varying float vTip;
  varying float vShade;
  varying float vRand;
  varying float vTall;
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
    // The wind is up: gusts run across the floodplain as waves through the grass.
    float gust = sin(uTime * 1.6 - aInst.x * 0.05 + aInst.z * 0.03) * 0.5 + 0.5;
    float wind = (sin(uTime * 2.1 + aRand.z * 6.28 + aInst.x * 0.04) * 0.35 + 0.65 * gust) * uWind;
    p.x += wind * aTip * aTip * aInst.w * 0.16;
    p.z -= wind * aTip * aTip * aInst.w * 0.08;
    p.y -= wind * aTip * aTip * aInst.w * 0.05;
    vec3 w = aInst.xyz + p;
    vWorld = w;
    vTip = aTip;
    vShade = aShade;
    vRand = aRand.y;
    vTall = smoothstep(2.0, 8.0, aInst.w * 1.5);
    // One read for the whole tuft: the sun at its own cell (tall and mid stands stand in the grid as cones).
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
  uniform vec3 uSkyCol;
  varying float vTip;
  varying float vShade;
  varying float vRand;
  varying float vTall;
  varying vec3 vWorld;
  varying float vSun;
  varying float vSky;
  varying float vAirT;
  varying vec3 vAirGlow;
  void main() {
    float t = clamp(vTip, 0.0, 1.0);
    // Short grass is green; the tall stands are deep green at the foot and straw at the head.
    vec3 foot = mix(vec3(0.02, 0.05, 0.008), vec3(0.015, 0.035, 0.006), vTall);
    vec3 head = mix(vec3(0.2, 0.24, 0.04), vec3(0.5, 0.4, 0.14), vTall * (0.5 + 0.5 * vRand));
    vec3 albedo = mix(foot, head, pow(t, 1.1)) * (0.8 + 0.35 * vShade);
    // Deep in a stand the light is dim.
    float inside = mix(1.0, 0.3 + 0.7 * pow(t, 0.8), vTall);
    float sun = clamp(vSun, 0.0, 1.0);
    vec3 V = normalize(vWorld - cameraPosition);
    float through = pow(max(dot(V, uSunDir), 0.0), 4.0);
    vec3 light = uSunCol * sun * (0.35 + 0.45 * vShade + through * (0.3 + t)) + uSkyCol * vSky * (0.5 + 0.4 * t);
    vec3 col = albedo * inside * light;
    col = col * vAirT + vAirGlow;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const SKY_EXTRA = /* glsl */ `
  col = stormSky(dir, col, 1.0);
`;

export async function createFloodplain({ tier, species }: WorldContext): Promise<FieldWorld> {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.3, 1800);
  const C = {
    sky: lin('#56606e', 0.22),
    sun: lin('#ffc078', 5.0),
    sunLate: lin('#ff9e58', 4.6),
    air: lin('#4b5560', 0.26),
    zenith: lin('#3a4656', 0.4),
    cloudDark: lin('#2a3240', 0.32),
    cloudLit: lin('#c98a5a', 0.9),
  };
  const sunDir = new THREE.Vector3();
  const sunCol = C.sun.clone();
  const setSun = (azimuth: number, elevation: number) => {
    sunDir.set(Math.cos(elevation) * Math.cos(azimuth), Math.sin(elevation), Math.cos(elevation) * Math.sin(azimuth)).normalize();
  };
  // Low under the cloud's edge, behind the camera's right shoulder: the floodplain is lit toward a dark sky.
  const AZ = 0.76;
  setSun(AZ, 0.11);

  const air = airUniforms({ density: 0.0042, falloff: 0.02, base: 0, colour: C.air, mie: 0.4, g: 0.7, zenith: C.zenith, disc: 0, discSize: 0.012 });
  const cloud = { uCloudDark: { value: C.cloudDark }, uCloudLit: { value: C.cloudLit }, uTime: { value: 0 }, uSkyDetail: { value: 1 } };
  const shared = { uSunDir: { value: sunDir }, uSunCol: { value: sunCol }, ...air };
  const rand = seededRandom(61);

  /* the light: a fine grid around the animal and the camera's walk, the far shore coarse */
  const cell = { high: 0.55, balanced: 0.65, low: 0.9 }[tier];
  const fineRect: [number, number, number, number] = [-150, -150, 150, 110];
  const fnx = Math.round(300 / cell) + 1;
  const fnz = Math.round(260 / cell) + 1;
  const fine: SolidGrid = { rect: fineRect, nx: fnx, nz: fnz, solid: new Float32Array(fnx * fnz) };
  const coarse: SolidGrid = { rect: [-500, -340, 500, 160], nx: 334, nz: 168, solid: new Float32Array(334 * 168) };

  /* the far shore: a low line of riverine forest */
  const clumps: Clump[] = [];
  const leafK = { high: 1, balanced: 0.8, low: 0.5 }[tier];
  const treeCount = { high: 260, balanced: 200, low: 120 }[tier];
  for (let i = 0; i < treeCount; i++) {
    const x = -420 + (i / treeCount) * 840 + (rand() - 0.5) * 6;
    const z = -232 - fbm(x * 0.012, 2, 2, 31) * 38 - rand() * 12;
    if (fbm(x * 0.02 + 9, 0, 2, 47) + (rand() - 0.5) * 0.3 < 0.3) continue;
    const tall = rand() < 0.14;
    const r = (6 + rand() * 6) * (tall ? 1.4 : 1);
    const lift = tall ? 8 + rand() * 8 : 0;
    // Broad, flat crowns that overlap into one low mass.
    const lobes = 2 + Math.floor(rand() * 3);
    for (let l = 0; l < lobes; l++) {
      const lr = r * (0.7 + rand() * 0.5);
      // Seen only as a band across the far shore: fewer, larger leaves.
      clumps.push({ x: x + (rand() - 0.5) * r * 1.4, y: lift + r * 0.55 + rand() * r * 0.3, z: z + (rand() - 0.5) * 6, rx: lr * 1.2, ry: lr * 0.5, rz: lr, leaves: Math.round(lr * lr * 1.0 * leafK) });
    }
    stampSolid(coarse, x, z, r * 1.4, r * 1.1, 0, lift + r * 1.1, 'dome');
  }
  const treeGeo = foliageGeometry(clumps, { size: 2.8, seed: 13, ragged: 0.25 });

  /* the grass: short turf near the animal, medium grass beyond, tall stands over its back */
  const shortN = { high: 9000, balanced: 5200, low: 3600 }[tier];
  const midN = { high: 5200, balanced: 3600, low: 2100 }[tier];
  const tallN = { high: 6500, balanced: 3900, low: 2800 }[tier];
  const reedN = { high: 1400, balanced: 1000, low: 600 }[tier];
  const front = 260;
  const total = shortN + midN + tallN + reedN + front;
  const inst = new Float32Array(total * 4);
  const rnd = new Float32Array(total * 4);
  let placed = 0;
  const put = (x: number, z: number, sc: number, stamp = true) => {
    inst.set([x, -0.1, z, sc], placed * 4);
    rnd.set([rand(), rand(), rand(), rand()], placed * 4);
    placed++;
    if (!stamp) return;
    // Blades are one to two long, leaning: a tuft stands about 1.4 × its scale.
    stampSolid(fine, x, z, sc * 0.45, sc * 0.45, 0, sc * 1.4, 'cone');
    if (sc > 2) stampSolid(coarse, x, z, sc * 0.45, sc * 0.45, 0, sc * 1.4, 'cone');
  };
  for (let i = 0; i < front; i++) put(-6 + rand() * 12, 0.3 + rand() * 3.4, 0.22 + rand() * 0.22, false);
  for (let tries = 0, n = 0; n < shortN && tries < shortN * 14; tries++) {
    const x = (rand() - 0.5) * 110;
    const z = 44 - rand() * 80;
    if (fbm(x * 0.05 + 3, z * 0.05, 3, 17) + (rand() - 0.5) * 0.3 < 0.3) continue;
    if (Math.abs(x) < 8 && z > -4 && z < 4) continue;
    // Short turf is too fine for the grid: its shadows would print as a checker on the ground near the camera.
    put(x, z, 0.4 + rand() * 0.45, false);
    n++;
  }
  for (let tries = 0, n = 0; n < midN && tries < midN * 14; tries++) {
    const x = (rand() - 0.5) * 240;
    const z = 8 - rand() * 125;
    if (Math.abs(x) < 22 && z > -8) continue;
    if (fbm(x * 0.03 + 21, z * 0.03, 3, 23) + (rand() - 0.5) * 0.3 < 0.4) continue;
    put(x, z, 0.8 + rand() * 0.9);
    n++;
  }
  for (let tries = 0, n = 0; n < tallN && tries < tallN * 18; tries++) {
    const x = (rand() - 0.5) * 300;
    const z = -14 - rand() * 120;
    if (Math.abs(x) < 20 && z > -30) continue;
    if (fbm(x * 0.022 + 40, z * 0.03, 3, 29) + (rand() - 0.5) * 0.18 < 0.56) continue;
    put(x, z, 3.2 + rand() * 2.6);
    n++;
  }
  const wallows: [number, number, number, number][] = [
    [-14, 15, 13, 6.5],
    [32, -22, 16, 7],
    [-46, -32, 11, 5],
  ];
  for (let i = 0; i < reedN; i++) {
    if (i < reedN * 0.55) {
      const [cx, cz, rx, rz] = wallows[i % 3];
      const a = rand() * Math.PI * 2;
      const k = 1.0 + rand() * 0.28;
      put(cx + Math.cos(a) * rx * k, cz + Math.sin(a) * rz * k, 0.6 + rand() * 0.8);
    } else {
      const x = (rand() - 0.5) * 360;
      put(x, -112 + (fbm(x * 0.012, 3, 2, 5) - 0.5) * 52 + rand() * 10, 1.4 + rand() * 1.4);
    }
  }
  const grassGeo = tuftGeometry();
  grassGeo.setAttribute('aInst', new THREE.InstancedBufferAttribute(inst, 4));
  grassGeo.setAttribute('aRand', new THREE.InstancedBufferAttribute(rnd, 4));
  grassGeo.instanceCount = placed;

  /* the animal's bulk */
  stampSolid(fine, 0, 0, 5.5, 2.2, 0, 6.2, 'dome');

  const fineLight = new Sunlight(fine, { penumbra: 0.006, reach: 220, steps: 36 });
  const coarseLight = new Sunlight(coarse, { penumbra: 0.01, reach: 600, steps: 32 });
  const lightU = fineLight.withFar(coarseLight);

  scene.add(skyDome(1500, { ...shared, ...cloud }, SKY_EXTRA, `${GLSL_HASH}${GLSL_NOISE}${CLOUD}`));

  const floorGeo = new THREE.PlaneGeometry(2400, 2400);
  floorGeo.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(
    floorGeo,
    new THREE.ShaderMaterial({ vertexShader: FLOOR_VERTEX, fragmentShader: FLOOR_FRAGMENT, uniforms: { ...shared, ...lightU, ...cloud, uSkyCol: { value: C.sky } } }),
  );
  floor.position.z = -300;
  scene.add(floor);

  const treeMat = foliageMaterial(
    { ...shared, ...lightU },
    { leafA: lin('#1f3416', 0.6), leafB: lin('#41562a', 0.6), leafLit: lin('#c0c060'), translucency: 0.6, skyCol: C.sky, sway: 0.12 },
  );
  scene.add(foliageMesh(treeGeo, treeMat));

  const grassMat = new THREE.ShaderMaterial({
    vertexShader: GRASS_VERTEX,
    fragmentShader: GRASS_FRAGMENT,
    uniforms: { ...shared, ...lightU, uSkyCol: { value: C.sky }, uTime: { value: 0 }, uWind: { value: 1 } },
    side: THREE.DoubleSide,
  });
  const grass = new THREE.Mesh(grassGeo, grassMat);
  grass.frustumCulled = false;
  scene.add(grass);

  const cutout = await new THREE.TextureLoader().loadAsync(cutoutUrl);
  cutout.colorSpace = THREE.SRGBColorSpace;
  cutout.anisotropy = 4;
  // The species' licensed 3D model where one exists (content/models.ts), else the record's cut-out photograph.
  const rhino = await subjectFor(species, {
    texture: cutout,
    width: 14,
    at: new THREE.Vector3(0, 0.05, 0),
    feet: 0.02,
    uniforms: { ...shared, ...lightU },
    skyCol: C.sky,
    turn: 0.5,
    fadeAbove: [0.4, 0.72],
    gain: 0.3,
    keep: 0.5,
    rim: 1.0,
    foot: 0.14,
    mud: new THREE.Vector3(0.55, 0.45, 0.36),
    mudHeight: 0.42,
    lightReach: 7,
  });
  scene.add(rhino.mesh);

  /* the camera: with the animal, then up over the floodplain for the sites, and back */
  const N = 7;
  const at = (i: number) => (i + 0.5) / N;
  const path: Shot[] = [
    // The rhinoceros above the title, the floodplain and the storm behind.
    { at: 0, pos: [-1, 3.4, 34], look: [-3, 3.2, 0], fov: 40 },
    { at: at(0), pos: [-1, 3.4, 33], look: [-3, 3.2, 0], fov: 40 },
    // Text at the right: the animal to the left.
    { at: at(1), pos: [4, 3.4, 31], look: [9, 3.4, -2], fov: 40 },
    // Text at the left: the animal to the right.
    { at: at(2), pos: [-3, 3.2, 28], look: [-6, 3.4, 0], fov: 40 },
    // The whole floodplain, from above, for the sites the record names.
    { at: at(3), pos: [18, 36, 92], look: [12, 2, -60], fov: 46 },
    { at: at(4), pos: [6, 3.8, 24], look: [-2, 3.2, -1], fov: 40 },
    // The animal near, text at the right.
    { at: at(5), pos: [3, 3.2, 28], look: [4, 3.4, -1], fov: 38 },
    { at: at(6), pos: [-6, 5, 50], look: [14, 3.2, -6], fov: 42 },
    { at: 1, pos: [-7, 5.4, 53], look: [15, 3.2, -6], fov: 42 },
  ];
  const rig = new CameraRig(camera, {
    preview: { at: 0, pos: [-3, 4, 44], look: [-4, 2.4, 0], fov: 38 },
    engage: { at: 0, pos: [-2, 3.6, 38], look: [-3, 2.6, 0], fov: 37 },
    path,
    sway: [2.6, 1.6],
    lambda: 4.6,
  });

  const film = grade({
    exposure: 1.5,
    tint: new THREE.Vector3(1.0, 0.99, 0.97),
    saturation: 1.0,
    contrast: 1.08,
    shadows: new THREE.Vector3(-0.004, 0.0, 0.012),
    highlights: new THREE.Vector3(1.03, 1.0, 0.94),
    vignette: 0.48,
    bloom: 0.35,
    threshold: 1.5,
  });

  let phase = 0;
  return {
    scene,
    camera,
    clear: '#141a20',
    grade: film,
    update(i: FieldInput) {
      const p = i.progress;
      const en = i.enter;
      rig.update({ engage: i.engage, enter: en, progress: p, pointer: i.pointer, dt: i.dt, snap: i.snap || i.reduced });

      // The sun sinks toward the deck's edge; the hand turns it a few degrees.
      const late = seg(p, 0.1, 1) * en;
      setSun(AZ + i.light.x * 0.16, lerp(0.11, 0.06, late) + i.light.y * 0.015);
      sunCol.lerpVectors(C.sun, C.sunLate, late);
      // The sites are read over a quieter floodplain.
      const dim = Math.max(0, Math.min(seg(p, 0.4, 0.46), 1 - seg(p, 0.56, 0.62))) * en;
      film.exposure = 1.5 * (1 - dim * 0.25);

      phase += i.reduced ? 0 : i.dt;
      grassMat.uniforms.uTime.value = phase;
      treeMat.uniforms.uTime.value = phase;
      cloud.uTime.value = phase;
      rhino.update(camera, sunDir, i.reduced ? 0 : i.dt);
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
      grassGeo.instanceCount = r >= 2 ? Math.floor(placed * 0.55) : placed;
      cloud.uSkyDetail.value = r >= 2 ? 0 : r >= 1 ? 0.5 : 1;
    },
    dispose() {
      cutout.dispose();
      fineLight.dispose();
      coarseLight.dispose();
      rhino.dispose();
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
  const r = seededRandom(23);
  const pos: number[] = [];
  const tip: number[] = [];
  const shade: number[] = [];
  const idx: number[] = [];
  for (let b = 0; b < 9; b++) {
    const a = r() * Math.PI * 2;
    const rad = r() * 0.22;
    const bx = Math.cos(a) * rad;
    const bz = Math.sin(a) * rad;
    const lean = r() * Math.PI * 2;
    const lx = Math.cos(lean);
    const lz = Math.sin(lean);
    const len = 1.0 + r() * 1.0;
    const bend = 0.15 + r() * 0.4;
    const w = 0.04 + r() * 0.03;
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
