import * as THREE from 'three';
import { GLSL_GRAIN, GLSL_HASH, GLSL_NOISE } from '../../gl/chunks';
import { seededRandom } from '../../gl/particles';
import { CameraRig, type Shot } from '../cameraRig';
import { rgb } from '../gl/color';
import { turn } from '../gl/turn';
import { fbm, seg, smooth } from '../noise';
import habitatUrl from '../../../assets/field/ganges-river-dolphin-habitat.webp';
import type { FieldInput, FieldWorld, WorldContext } from '../types';

/**
 * FIELD STUDY 03 · the Ganges river dolphin, the Ganga and the Brahmaputra.
 *
 * A wide, silt-laden lowland river on a hazy morning. The water is grey-green
 * and turbid: pale and sandy where it shoals over a sandbar, darker and
 * olive where the channel is deep, reflecting a soft sky and the dark line of
 * the far bank. The near bank is a long gentle beach of pale sand that rises
 * to a green levee with reed and grass; the far bank is a steeper cut bank of
 * layered silt, with a line of trees above it and open floodplain behind.
 * Sandbars (chars) stand in the channel, with reed at their edges.
 *
 * The dolphin is the record's own photograph, cropped to the animal and the
 * water around it. It stands in the channel with the waterline of the picture
 * at the surface of the drawn river, which hides the part of the picture below
 * the surface; the picture's water is the same grey-green as the drawn water
 * and its edges are given to it. The panel turns to face the camera, and the
 * only motion it brings to the water is a faint ring spreading from the animal.
 *
 * Honesty: the river, its banks, bars and trees are drawn, an impression of a
 * lowland river in the Ganga–Brahmaputra plain and not a model of any reach.
 * The dolphin is a photograph (Anant.wildlife, CC BY 4.0), not a drawn animal
 * and not a cut-out. No dam, barrage, route or locality is drawn: the record
 * names them only in text.
 */

const FOG = 0.0019;

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

const SKY_FN = /* glsl */ `
  vec3 skyColour(vec3 d, vec3 top, vec3 mid, vec3 hor, vec3 sunDir, vec3 sunCol) {
    float y = max(d.y, 0.0);
    vec3 c = mix(hor, mid, smoothstep(0.0, 0.26, y));
    c = mix(c, top, smoothstep(0.16, 0.9, y));
    float s = max(dot(d, sunDir), 0.0);
    c += sunCol * (pow(s, 7.0) * 0.16 + pow(s, 70.0) * 0.28);
    return c;
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
  ${SKY_FN}
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uHor;
  uniform vec3 uSun;
  uniform vec3 uSunCol;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    vec3 col = skyColour(d, uTop, uMid, uHor, uSun, uSunCol);
    // Soft, high, layered cloud, thinning toward the horizon.
    vec2 cp = d.xz / (d.y + 0.25) * 1.1;
    float c = fbm3(vec2(cp.x * 0.9, cp.y * 1.8)) * 0.65 + fbm3(cp * 3.5) * 0.35;
    col = mix(col, mix(uHor, vec3(1.0), 0.6), smoothstep(0.48, 0.78, c) * 0.34 * smoothstep(0.02, 0.28, d.y));
    gl_FragColor = vec4(col, 1.0);
  }
`;

const WATER_VERTEX = /* glsl */ `
  varying vec3 vPos;
  varying float vDepth;
  void main() {
    vPos = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const WATER_FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  ${GLSL_GRAIN}
  ${SKY_FN}
  uniform sampler2D uBed;
  uniform vec4 uBedRect;
  uniform float uTime;
  uniform float uFog;
  uniform float uRing;
  uniform vec2 uDolphin;
  uniform vec3 uSun;
  uniform vec3 uSunCol;
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uHor;
  uniform vec3 uShallow;
  uniform vec3 uDeep;
  uniform vec3 uSandy;
  uniform vec3 uHaze;
  varying vec3 vPos;
  varying float vDepth;

  // The current: long streaks along the flow, finer and quicker across them.
  float surf(vec2 p) {
    float a = fbm3(vec2((p.x - uTime * 1.5) * 0.16, p.y * 0.55));
    float b = fbm3(vec2((p.x - uTime * 2.6) * 0.5 + 7.0, p.y * 1.5));
    return a * 0.62 + b * 0.38;
  }

  void main() {
    vec2 uv = (vPos.xz - uBedRect.xy) / uBedRect.zw;
    float bed = texture2D(uBed, uv).r;
    float depth = max(-bed, 0.0);
    vec3 V = normalize(cameraPosition - vPos);
    float dist = length(cameraPosition - vPos);
    float lod = 1.0 - smoothstep(70.0, 520.0, dist);

    float e = 0.3;
    float h0 = surf(vPos.xz);
    float hx = surf(vPos.xz + vec2(e, 0.0));
    float hz = surf(vPos.xz + vec2(0.0, e));
    float amp = 0.34 * lod * (0.4 + 0.6 * smoothstep(0.2, 3.5, depth));
    vec2 dr = vPos.xz - uDolphin;
    float r = length(dr);
    float ringPhase = r * 1.5 - uTime * 1.8;
    vec2 ring = normalize(dr + 1e-4) * cos(ringPhase) * 1.5 * exp(-r * 0.13) * smoothstep(2.0, 6.0, r) * uRing * 0.06;
    vec3 n = normalize(vec3(-(hx - h0) / e * amp - ring.x, 1.0, -(hz - h0) / e * amp - ring.y));

    float cosv = max(dot(n, V), 0.0);
    float F = 0.04 + 0.96 * pow(1.0 - cosv, 5.0);
    vec3 R = reflect(-V, n);
    R.y = abs(R.y);
    vec3 refl = skyColour(R, uTop, uMid, uHor, normalize(uSun), uSunCol);
    // The dark line of the bank and its trees sits in the reflection near the horizon.
    refl = mix(refl, uDeep * 0.9, (1.0 - smoothstep(0.0, 0.07, R.y)) * 0.35);

    // The body of the water: turbid, so even shallow water is not clear.
    float tr = exp(-depth * 0.3);
    vec3 body = mix(uDeep, uShallow, tr);
    body = mix(body, uSandy, smoothstep(0.9, 0.0, depth) * 0.55);
    body *= 0.72 + 0.4 * uSun.y;
    body += (h0 - 0.45) * 0.07 * lod;

    vec3 col = mix(body, refl, clamp(F * 0.95 + 0.03, 0.0, 1.0));
    // A glint where the sun lies low on a ripple, kept quiet.
    float sp = pow(max(dot(R, normalize(uSun)), 0.0), 220.0);
    col += uSunCol * sp * 0.38 * lod;
    // Where it meets the sand, the water thins to a pale edge.
    col = mix(col, uSandy * 1.02, (1.0 - smoothstep(0.0, 0.3, depth)) * 0.22);

    float fog = 1.0 - exp(-pow(vDepth * uFog, 1.2));
    col = mix(col, uHaze, fog);
    col += paperGrain(gl_FragCoord.xy, 0.006);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const LAND_VERTEX = /* glsl */ `
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

const LAND_FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  ${GLSL_GRAIN}
  uniform vec3 uSun;
  uniform vec3 uSunCol;
  uniform vec3 uSkyAmb;
  uniform vec3 uHaze;
  uniform float uFog;
  uniform vec3 uSandA;
  uniform vec3 uSandB;
  uniform vec3 uEarthA;
  uniform vec3 uEarthB;
  uniform vec3 uGrassA;
  uniform vec3 uGrassB;
  uniform vec3 uStraw;
  varying vec3 vPos;
  varying vec3 vNormal;
  varying float vDepth;
  void main() {
    vec3 n0 = normalize(vNormal);
    vec2 p = vPos.xz;
    float h = vPos.y;
    float near = 1.0 - smoothstep(60.0, 380.0, vDepth);
    float nz = fbm3(p * 0.07);
    float nz2 = fbm3(p * 0.8);
    float nz3 = valueNoise(p * 3.4);
    // Fine relief on the surface that the mesh is too coarse to carry.
    vec3 n = normalize(n0 + vec3(nz2 - 0.5, 0.0, nz3 - 0.5) * 0.5 * near);
    float slope = 1.0 - n0.y;

    // Sand: pale, ripple-marked along the current, darker where it is wet.
    vec3 sand = mix(uSandA, uSandB, nz) * (0.93 + 0.14 * nz2);
    float rip = sin(p.y * 1.7 + nz * 7.0 + p.x * 0.05) * 0.5 + 0.5;
    sand *= 1.0 + (rip - 0.5) * 0.07 * near * (1.0 - smoothstep(1.2, 2.2, h));
    float wet = 1.0 - smoothstep(0.0, 0.5, h);
    sand = mix(sand, sand * vec3(0.66, 0.67, 0.66), wet * 0.9);

    // Silt and earth: layered where the bank is steep.
    vec3 earth = mix(uEarthA, uEarthB, nz2);
    float strata = sin(h * 8.0 + nz * 6.0 + nz2 * 1.5) * 0.5 + 0.5;
    earth *= 0.86 + 0.2 * strata;

    // Grass and reed on the levee and the plain, patchy and dry in places.
    float patchN = fbm3(p * 0.03 + 11.0);
    vec3 grass = mix(uGrassA, uGrassB, nz2 * 0.8 + patchN * 0.4);
    grass = mix(grass, uStraw, smoothstep(0.5, 0.78, fbm3(p * 0.012 + 3.0)) * 0.7);
    grass *= 0.88 + 0.22 * nz3;
    float veg = smoothstep(1.1, 2.3, h + (nz - 0.5) * 1.6) * (1.0 - smoothstep(0.5, 0.85, slope));

    vec3 col = mix(sand, grass, veg);
    col = mix(col, earth, smoothstep(0.12, 0.38, slope) * smoothstep(0.3, 1.0, h));
    // Away from the river, the plain is crop and fallow in broad blocks.
    float blocks = fbm3(p * 0.006 + 20.0);
    col = mix(col, mix(uStraw * 0.95, uGrassA * 0.82, smoothstep(0.35, 0.65, blocks)), veg * smoothstep(2.4, 3.2, h) * 0.75);
    float diff = max(dot(n, normalize(uSun)), 0.0);
    vec3 lit = uSkyAmb * (0.6 + 0.4 * n.y) + uSunCol * diff * 0.74;
    col *= lit;

    float fog = 1.0 - exp(-pow(vDepth * uFog, 1.2));
    col = mix(col, uHaze, fog);
    col += paperGrain(gl_FragCoord.xy, 0.006);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const REED_VERTEX = /* glsl */ `
  attribute float aTip;
  attribute float aShade;
  attribute vec4 aInst;
  attribute vec4 aRand;
  uniform float uTime;
  varying float vTip;
  varying float vShade;
  varying float vRand;
  varying float vDepth;
  void main() {
    float a = aRand.x * 6.28318;
    mat2 R = mat2(cos(a), -sin(a), sin(a), cos(a));
    vec3 p = position * aInst.w;
    p.xz = R * p.xz;
    float wind = sin(uTime * 0.9 + aRand.z * 6.28 + aInst.x * 0.04) * 0.5 + sin(uTime * 0.4 + aInst.z * 0.03) * 0.5;
    p.x += wind * aTip * aTip * aInst.w * 0.1;
    vec3 w = aInst.xyz + p;
    vTip = aTip;
    vShade = aShade;
    vRand = aRand.y;
    vec4 mv = viewMatrix * vec4(w, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const REED_FRAGMENT = /* glsl */ `
  uniform vec3 uHaze;
  uniform vec3 uSunCol;
  uniform float uFog;
  uniform float uLight;
  varying float vTip;
  varying float vShade;
  varying float vRand;
  varying float vDepth;
  void main() {
    vec3 base = mix(vec3(0.17, 0.25, 0.1), vec3(0.28, 0.33, 0.14), vRand);
    vec3 tip = mix(vec3(0.62, 0.62, 0.34), vec3(0.74, 0.7, 0.42), vRand);
    vec3 col = mix(base, tip, pow(vTip, 1.3)) * (0.8 + 0.3 * vShade) * uLight;
    col *= mix(vec3(1.0), uSunCol, 0.25);
    float fog = 1.0 - exp(-pow(vDepth * uFog, 1.2));
    col = mix(col, uHaze, fog);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const TREE_VERTEX = /* glsl */ `
  attribute float aSeed;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vDepth;
  varying float vSeed;
  varying float vUp;
  void main() {
    vec3 p = position;
    float bump = sin(p.x * 3.6 + aSeed * 17.0) * sin(p.y * 3.2 + aSeed * 9.0) * sin(p.z * 4.0 + aSeed * 3.0);
    p *= 1.0 + 0.1 * bump;
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

const TREE_FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  uniform vec3 uSun;
  uniform vec3 uSunCol;
  uniform vec3 uSkyAmb;
  uniform vec3 uHaze;
  uniform float uFog;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vDepth;
  varying float vSeed;
  varying float vUp;
  void main() {
    vec3 n = normalize(vNormal);
    float lit = clamp(dot(n, normalize(uSun)) * 0.65 + 0.4, 0.0, 1.0);
    vec3 q = vWorld + vec3(vSeed * 20.0);
    float leaf = (valueNoise(q.xy * 1.1) + valueNoise(q.zy * 1.1 + 7.0)) * 0.3 + (valueNoise(q.xy * 3.1 + 3.0) + valueNoise(q.zy * 3.1 + 11.0)) * 0.2;
    vec3 col = mix(vec3(0.1, 0.17, 0.08), vec3(0.27, 0.35, 0.15), smoothstep(0.25, 0.8, leaf));
    col = mix(col, vec3(0.36, 0.38, 0.17), smoothstep(0.7, 0.9, leaf) * 0.4);
    col *= (uSkyAmb * 0.55 + uSunCol * lit * 0.75) * (0.8 + 0.3 * smoothstep(-0.3, 0.9, vUp));
    float fog = 1.0 - exp(-pow(vDepth * uFog, 1.2));
    col = mix(col, uHaze, fog);
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
 * The dolphin's panel. The picture is the animal and the water around it, and
 * its own water is the colour of the river drawn here. Its edge is a soft
 * oval around the animal, roughened by noise, so no rectangle is seen; and
 * the part of the picture below the waterline lies under the drawn surface.
 */
const PANEL_FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  uniform sampler2D uMap;
  uniform vec3 uSunCol;
  uniform vec3 uHaze;
  uniform vec3 uWater;
  uniform float uFog;
  uniform float uFade;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vec3 col = texture2D(uMap, vUv).rgb;
    // The same light as the drawn river.
    col = clamp((col - 0.46) * 1.28 + 0.46, 0.0, 1.0);
    col = mix(vec3(dot(col, vec3(0.3, 0.59, 0.11))), col, 1.25) * mix(vec3(1.0), uSunCol, 0.16) * 0.97;
    // The picture's own water (greener than the animal) takes the drawn river's colour, keeping its ripples.
    vec3 soft = texture2D(uMap, vUv, 3.0).rgb;
    float wk = smoothstep(-0.004, 0.02, soft.g - soft.r) * 0.8;
    float lum = dot(col, vec3(0.3, 0.59, 0.11));
    col = mix(col, uWater * clamp(lum / 0.5, 0.7, 1.3), wk);
    float n = valueNoise(vec2(vUv.x * 14.0, vUv.y * 8.0));
    float n2 = valueNoise(vec2(vUv.x * 4.0, vUv.y * 3.0 + 5.0));
    float j = (n - 0.5) * 0.12 + (n2 - 0.5) * 0.14;
    // A soft oval around the animal: wide at the waterline, closing above the back.
    vec2 q = vec2((vUv.x - 0.49) / 0.38, (vUv.y - 0.27) / 0.5);
    float d = length(q) + j;
    float a = 1.0 - smoothstep(0.8, 1.08, d);
    // The water at the foot of the picture: given to the river as it dips below the surface.
    // Toward the oval's edge the picture's water takes the river's colour.
    col = mix(col, uWater, smoothstep(0.6, 1.05, d) * 0.5);
    float fog = 1.0 - exp(-pow(vDepth * uFog, 1.2));
    col = mix(col, uHaze, fog);
    gl_FragColor = vec4(col, a * uFade);
  }
`;

export async function createRiver({ tier }: WorldContext): Promise<FieldWorld> {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 4200);

  const C = {
    top: rgb('#7d9db4'),
    mid: rgb('#a9c0cb'),
    hor: rgb('#d9dccb'),
    shallow: rgb('#8c9680'),
    deep: rgb('#4a5849'),
    sandy: rgb('#b9b394'),
    haze: rgb('#cfd6ca'),
    skyAmb: rgb('#a9b8bb'),
    sunCol: rgb('#fff1d6'),
    sandA: rgb('#bcae8c'),
    sandB: rgb('#a39478'),
    earthA: rgb('#76634a'),
    earthB: rgb('#5d5140'),
    grassA: rgb('#59652f'),
    grassB: rgb('#7b7c3e'),
    straw: rgb('#a39a62'),
  };
  const yieldNow = turn();
  const sun = new THREE.Vector3(-0.42, 0.52, 0.62).normalize();
  const sunLate = new THREE.Vector3(-0.62, 0.24, 0.5).normalize();
  const sunCol = C.sunCol.clone();
  const sunColLate = rgb('#ffd3a0');
  const hazeLate = rgb('#dccfb4');
  const haze = C.haze.clone();
  const shared = {
    uSun: { value: sun },
    uSunCol: { value: sunCol },
    uHaze: { value: haze },
    uFog: { value: FOG },
  };

  /* the sky */
  const skyMat = new THREE.ShaderMaterial({
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    uniforms: { uTop: { value: C.top }, uMid: { value: C.mid }, uHor: { value: haze }, uSun: shared.uSun, uSunCol: shared.uSunCol },
    side: THREE.BackSide,
    depthWrite: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3800, 32, 16), skyMat);
  sky.renderOrder = -10;
  scene.add(sky);

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
  const landMat = new THREE.ShaderMaterial({
    vertexShader: LAND_VERTEX,
    fragmentShader: LAND_FRAGMENT,
    uniforms: {
      ...shared,
      uSkyAmb: { value: C.skyAmb },
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

  /* the water: one plane, shaded by how deep the bed is beneath each point */
  const BED = { x0: -1000, z0: -300, w: 2000, d: 600, nx: 1000, nz: 300 };
  const bedData = new Uint16Array(BED.nx * BED.nz);
  for (let j = 0; j < BED.nz; j++) {
    await yieldNow();
    for (let i = 0; i < BED.nx; i++) {
      const x = BED.x0 + ((i + 0.5) / BED.nx) * BED.w;
      const z = BED.z0 + ((j + 0.5) / BED.nz) * BED.d;
      bedData[j * BED.nx + i] = THREE.DataUtils.toHalfFloat(Math.max(-12, Math.min(8, ground(x, z))));
    }
  }
  const bedTex = new THREE.DataTexture(bedData, BED.nx, BED.nz, THREE.RedFormat, THREE.HalfFloatType);
  bedTex.minFilter = THREE.LinearFilter;
  bedTex.magFilter = THREE.LinearFilter;
  bedTex.wrapS = THREE.ClampToEdgeWrapping;
  bedTex.wrapT = THREE.ClampToEdgeWrapping;
  bedTex.needsUpdate = true;

  const P = new THREE.Vector3(0, 0, centre(0));
  const waterMat = new THREE.ShaderMaterial({
    vertexShader: WATER_VERTEX,
    fragmentShader: WATER_FRAGMENT,
    uniforms: {
      ...shared,
      uBed: { value: bedTex },
      uBedRect: { value: new THREE.Vector4(BED.x0, BED.z0, BED.w, BED.d) },
      uTime: { value: 0 },
      uRing: { value: 1 },
      uDolphin: { value: new THREE.Vector2(P.x, P.z) },
      uTop: { value: C.top },
      uMid: { value: C.mid },
      uHor: { value: haze },
      uShallow: { value: C.shallow },
      uDeep: { value: C.deep },
      uSandy: { value: C.sandy },
    },
  });
  const waterGeo = new THREE.PlaneGeometry(2000, 1460, 1, 1);
  waterGeo.rotateX(-Math.PI / 2);
  waterGeo.translate((LAND.x0 + LAND.x1) / 2, 0, (LAND.z0 + LAND.z1) / 2);
  const water = new THREE.Mesh(waterGeo, waterMat);
  scene.add(water);

  /* reed and grass at the water's edge, on the bars and along the levee */
  const rand = seededRandom(41);
  const reedCount = { high: 7000, balanced: 4600, low: 2600 }[tier];
  const inst = new Float32Array(reedCount * 4);
  const rnd = new Float32Array(reedCount * 4);
  let placed = 0;
  for (let tries = 0; placed < reedCount && tries < reedCount * 40; tries++) {
    if ((tries & 1023) === 0) await yieldNow();
    const x = -420 + rand() * 840;
    const c = centre(x);
    const hw = halfWidth(x);
    // Mostly near the camera's side of the river and on the bars; some along the far levee.
    const side = rand();
    const z = side < 0.78 ? c + hw * (0.3 + rand() * 1.9) : c - hw * (0.95 + rand() * 0.6);
    const y = ground(x, z);
    const m = fbm(x * 0.03 + 5, z * 0.03, 3, 61);
    // At the waterline of bars and beach (a little above it), and thick on the levee.
    const edge = y > 0.35 && y < 2.9;
    if (!edge) continue;
    if (m + (rand() - 0.5) * 0.25 < 0.46) continue;
    inst.set([x, y - 0.1, z, 0.55 + rand() * 1.0], placed * 4);
    rnd.set([rand(), rand(), rand(), rand()], placed * 4);
    placed++;
  }
  const reedGeo = reedGeometry();
  reedGeo.setAttribute('aInst', new THREE.InstancedBufferAttribute(inst, 4));
  reedGeo.setAttribute('aRand', new THREE.InstancedBufferAttribute(rnd, 4));
  reedGeo.instanceCount = placed;
  const reedMat = new THREE.ShaderMaterial({
    vertexShader: REED_VERTEX,
    fragmentShader: REED_FRAGMENT,
    uniforms: { ...shared, uTime: { value: 0 }, uLight: { value: 1 } },
    side: THREE.DoubleSide,
  });
  const reeds = new THREE.Mesh(reedGeo, reedMat);
  reeds.frustumCulled = false;
  scene.add(reeds);

  /* the tree line above the far bank, and scattered clumps on the plain */
  const treeCount = { high: 560, balanced: 400, low: 230 }[tier];
  const treeGeo = new THREE.IcosahedronGeometry(1, 3);
  const seeds = new Float32Array(treeCount);
  const treeMat = new THREE.ShaderMaterial({
    vertexShader: TREE_VERTEX,
    fragmentShader: TREE_FRAGMENT,
    uniforms: { ...shared, uSkyAmb: { value: C.skyAmb } },
  });
  const trees = new THREE.InstancedMesh(treeGeo, treeMat, treeCount);
  const m4 = new THREE.Matrix4();
  const q4 = new THREE.Quaternion();
  const e4 = new THREE.Euler();
  for (let k = 0; k < treeCount; k++) {
    const x = -760 + rand() * 1520;
    const c = centre(x);
    const hw = halfWidth(x);
    // A ragged line a little back from the cut bank, and a second rank farther out.
    const back = rand() < 0.7 ? 10 + rand() * 50 : 80 + rand() * 360;
    const z = c - hw * 1.17 - back;
    const w = 1.7 + rand() * 2.8;
    const hgt = w * (1.15 + rand() * 0.6);
    const y = ground(x, z) + hgt * 0.45;
    q4.setFromEuler(e4.set(0, rand() * 6.28, 0));
    m4.compose(new THREE.Vector3(x, y, z), q4, new THREE.Vector3(w, hgt, w * (0.9 + rand() * 0.3)));
    trees.setMatrixAt(k, m4);
    seeds[k] = rand();
  }
  treeGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  trees.frustumCulled = false;
  scene.add(trees);

  /* the dolphin: the record's photograph, its water the river's water */
  const texture = await new THREE.TextureLoader().loadAsync(habitatUrl);
  texture.colorSpace = THREE.NoColorSpace;
  texture.anisotropy = 4;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  const panelW = 34;
  const panelH = (panelW * 730) / 1700;
  // The picture's waterline is 8% up from its foot; that line sits at the drawn surface.
  const WATERLINE = 0.085;
  const panelMat = new THREE.ShaderMaterial({
    vertexShader: PANEL_VERTEX,
    fragmentShader: PANEL_FRAGMENT,
    uniforms: {
      ...shared,
      uMap: { value: texture },
      uWater: { value: rgb('#8a978b') },
      uFade: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
  });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(panelW, panelH), panelMat);
  panel.position.set(P.x, panelH * (0.5 - WATERLINE) + 0.04, P.z);
  panel.renderOrder = 2;
  scene.add(panel);

  /* the camera: low on the water, in close for the photograph, high for the map, and back */
  const S = (dx: number, up: number, dz: number): [number, number, number] => [P.x + dx, up, P.z + dz];
  const N = 7;
  const at = (i: number) => (i + 0.5) / N;
  const path: Shot[] = [
    // Subject at the upper left, the title below it, text at the right.
    { at: 0, pos: S(-22, 5.4, 42), look: S(12, -0.5, -4), fov: 40 },
    { at: at(0), pos: S(-21, 5.2, 41), look: S(12, -0.5, -4), fov: 40 },
    { at: at(1), pos: S(-58, 10, 66), look: S(26, 0.5, -22), fov: 42 },
    // The record's map, from above: the whole bend, its bars and the plain.
    { at: at(2), pos: S(40, 330, 110), look: S(70, 0, -40), fov: 46 },
    { at: at(3), pos: S(-12, 3.6, 38), look: S(8, 2.4, 0), fov: 34 },
    { at: at(4), pos: S(38, 7, 50), look: S(-18, 1.2, -6), fov: 42 },
    { at: at(5), pos: S(-40, 12, 74), look: S(18, 1.4, -12), fov: 42 },
    // Text in the middle: the dolphin stands to its left, small in a wide river.
    { at: at(6), pos: S(-70, 15, 92), look: S(115, 2, -30), fov: 46 },
    { at: 1, pos: S(-72, 15.5, 95), look: S(117, 2, -30), fov: 46 },
  ];
  const rig = new CameraRig(camera, {
    preview: { at: 0, pos: S(-30, 7, 52), look: S(6, 3, -6), fov: 42 },
    engage: { at: 0, pos: S(-24, 5.6, 42), look: S(8, 3.2, -5), fov: 39 },
    path,
    sway: [3.2, 2],
    lambda: 5.2,
  });

  let phase = 0;
  const camDir = new THREE.Vector3();

  return {
    scene,
    camera,
    clear: '#d9dccb',
    update(i: FieldInput) {
      const p = i.progress;
      const en = i.enter;
      rig.update({ engage: i.engage, enter: en, progress: p, pointer: i.pointer, dt: i.dt, snap: i.snap || i.reduced });

      // The light lowers and warms as the study closes.
      const late = seg(p, 0.8, 1) * en;
      sun.set(-0.42 + i.pointer.x * 0.08, 0.52 + i.pointer.y * 0.03, 0.62).lerp(sunLate, late).normalize();
      sunCol.lerpVectors(C.sunCol, sunColLate, late);
      haze.lerpVectors(C.haze, hazeLate, late * 0.7);
      reedMat.uniforms.uLight.value = 1 - 0.1 * late;

      phase += i.reduced ? 0 : i.dt;
      waterMat.uniforms.uTime.value = phase;
      reedMat.uniforms.uTime.value = i.reduced ? 0 : phase;
      waterMat.uniforms.uRing.value = i.reduced ? 0 : 1;

      // The panel turns to face the camera (not past 70°), and gives way when seen from above.
      camDir.copy(camera.position).sub(panel.position);
      const yaw = Math.atan2(camDir.x, camDir.z);
      panel.rotation.y = Math.max(-1.2, Math.min(1.2, yaw));
      const sinEl = camDir.y / Math.max(1, camDir.length());
      panelMat.uniforms.uFade.value = 1 - THREE.MathUtils.smoothstep(sinEl, 0.4, 0.8);
      panel.visible = panelMat.uniforms.uFade.value > 0.01;
    },
    resize(width, height) {
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    },
    setRung() {},
    dispose() {
      texture.dispose();
      bedTex.dispose();
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
