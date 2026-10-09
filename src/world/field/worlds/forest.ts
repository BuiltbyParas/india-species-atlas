import * as THREE from 'three';
import { GLSL_GRAIN, GLSL_HASH, GLSL_NOISE } from '../../gl/chunks';
import { seededRandom } from '../../gl/particles';
import { CameraRig, type Shot } from '../cameraRig';
import { rgb } from '../gl/color';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { fbm, seg } from '../noise';
import cutoutUrl from '../../../assets/field/bengal-tiger-cutout.webp';
import type { FieldInput, FieldWorld, WorldContext } from '../types';

/**
 * FIELD STUDY 04 · the Bengal tiger, the central Indian forests.
 *
 * A deciduous forest in the first hours of a dry-season morning. Straight,
 * fissured trunks stand at different distances and in clumps and gaps; between
 * them a layer of saplings and shrub, hanging foliage and drifts of dry
 * grass; leaf litter, a few fallen logs. The sun is low and warm and comes in
 * from the camera's side, broken by the canopy into patches of light on the
 * floor and on the trunks; everything else is in cool green shade. Distance
 * is carried by haze, not by darkness.
 *
 * The tiger is the record's photograph, cut out of its background and
 * standing on the forest floor in a small clearing. Grass hides its feet, a
 * soft shadow lies under it, and its colour is matched to the light. From
 * above, the canopy is a roof of crowns.
 *
 * Nothing here is added to make the scene "do" something: no lantern, no
 * motes, no marks. The camera walks in, stays with the animal, rises above
 * the crowns while the reserves are named, and comes back down.
 *
 * Honesty: the forest is drawn, an impression of a central Indian forest and
 * not of any reserve; the reserves are listed in the text and not drawn. The
 * tiger is a photograph (cut out), not a drawn animal.
 */

const FOG = 0.0085;

/** Where the tiger stands. */
const T = new THREE.Vector3(4, 0, -36);

const SUN = /* glsl */ `
  // How much of the low sun reaches a point: the canopy breaks it into patches.
  float sunReach(vec3 p, vec3 sunDir) {
    vec2 q = p.xz + sunDir.xz / max(sunDir.y, 0.2) * (70.0 - p.y);
    float a = fbm3(q * 0.1);
    float b = valueNoise(q * 0.31 + 7.0);
    return smoothstep(0.46, 0.6, a * 0.75 + b * 0.25);
  }
`;

const TRUNK_VERTEX = /* glsl */ `
  attribute float aSeed;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying vec3 vLocal;
  varying float vSeed;
  varying float vDepth;
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
    vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
    vSeed = aSeed;
    vec4 mv = viewMatrix * w;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const TRUNK_FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  ${SUN}
  uniform vec3 uSun;
  uniform vec3 uSunCol;
  uniform vec3 uShade;
  uniform vec3 uHaze;
  uniform float uFog;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying vec3 vLocal;
  varying float vSeed;
  varying float vDepth;
  void main() {
    vec3 n = normalize(vNormal);
    float h = vWorld.y;
    // Bark: long fissures, ridged, with the tree's own colour.
    float u = vLocal.x * 1.9 + vSeed * 40.0;
    float fiss = valueNoise(vec2(u * 3.0, h * 0.8)) * 0.6 + valueNoise(vec2(u * 8.0, h * 2.0 + 3.0)) * 0.4;
    float ridge = smoothstep(0.3, 0.75, fiss);
    vec3 dark = mix(vec3(0.12, 0.09, 0.07), vec3(0.17, 0.14, 0.1), vSeed);
    vec3 light = mix(vec3(0.55, 0.48, 0.38), vec3(0.7, 0.6, 0.45), fract(vSeed * 7.0));
    vec3 bark = mix(dark, light, ridge);
    // Green on the shaded foot and the side away from the sun.
    float moss = (1.0 - smoothstep(0.0, 6.0, h)) * smoothstep(0.1, 0.9, valueNoise(vWorld.xz * 0.9 + vSeed * 9.0));
    bark = mix(bark, vec3(0.22, 0.3, 0.14), moss * 0.5);
    float reach = sunReach(vWorld, normalize(uSun));
    float diff = max(dot(n, normalize(uSun)), 0.0);
    vec3 col = bark * (uShade * (0.65 + 0.35 * n.y) + uSunCol * diff * reach * 1.15);
    float fog = 1.0 - exp(-pow(vDepth * uFog, 1.15));
    col = mix(col, uHaze, fog);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const FLOOR_VERTEX = /* glsl */ `
  varying vec3 vWorld;
  varying float vDepth;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vec4 mv = viewMatrix * w;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FLOOR_FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  ${GLSL_GRAIN}
  ${SUN}
  uniform vec3 uSun;
  uniform vec3 uSunCol;
  uniform vec3 uShade;
  uniform vec3 uHaze;
  uniform float uFog;
  varying vec3 vWorld;
  varying float vDepth;
  void main() {
    vec2 p = vWorld.xz;
    float near = 1.0 - smoothstep(30.0, 160.0, vDepth);
    // Leaf litter: dry, golden and brown, in drifts, with bare earth between.
    float drift = fbm3(p * 0.09);
    float fine = valueNoise(p * 2.6);
    float specks = step(0.72, valueNoise(p * 9.0 + 3.0)) * near;
    vec3 litter = mix(vec3(0.3, 0.21, 0.12), vec3(0.5, 0.37, 0.19), drift);
    litter = mix(litter, vec3(0.62, 0.47, 0.22), specks * 0.55);
    litter *= 0.78 + 0.4 * fine;
    // Earth shows through in patches.
    litter = mix(litter, vec3(0.27, 0.2, 0.14), smoothstep(0.62, 0.8, fbm3(p * 0.05 + 9.0)) * 0.7);
    // Green ground cover where the shade is deep.
    float cover = smoothstep(0.55, 0.72, fbm3(p * 0.045 + 31.0));
    litter = mix(litter, vec3(0.2, 0.28, 0.11) * (0.8 + 0.4 * fine), cover * 0.6);
    float reach = sunReach(vWorld, normalize(uSun));
    float diff = normalize(uSun).y;
    vec3 col = litter * (uShade + uSunCol * diff * reach * 1.05);
    float fog = 1.0 - exp(-pow(vDepth * uFog, 1.15));
    col = mix(col, uHaze, fog);
    col += paperGrain(gl_FragCoord.xy, 0.006);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const LEAF_VERTEX = /* glsl */ `
  attribute float aSeed;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vDepth;
  varying float vSeed;
  varying float vUp;
  void main() {
    vec3 p = position;
    float bump = sin(p.x * 5.1 + aSeed * 17.0) * sin(p.y * 4.7 + aSeed * 9.0) * sin(p.z * 5.6 + aSeed * 3.0);
    p *= 1.0 + 0.16 * bump;
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

const LEAF_FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  uniform vec3 uSun;
  uniform vec3 uSunCol;
  uniform vec3 uShade;
  uniform vec3 uHaze;
  uniform float uFog;
  uniform vec3 uLeafA;
  uniform vec3 uLeafB;
  uniform float uRoof;
  uniform float uScale;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vDepth;
  varying float vSeed;
  varying float vUp;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 L = normalize(uSun);
    vec3 V = normalize(cameraPosition - vWorld);
    vec3 q = (vWorld + vec3(vSeed * 20.0)) * uScale;
    // Leaf mass: clustered, with gaps and lighter new growth.
    float leaf = (valueNoise(q.xy * 2.2) + valueNoise(q.zy * 2.2 + 7.0) + valueNoise(q.xz * 2.2 + 5.0)) * 0.15 + (valueNoise(q.xy * 7.0 + 3.0) + valueNoise(q.zy * 7.0 + 11.0) + valueNoise(q.xz * 7.0 + 17.0)) * 0.183;
    vec3 base = mix(uLeafA * 0.55, uLeafB * 0.9, smoothstep(0.4, 0.6, leaf));
    base = mix(base, base * vec3(1.25, 1.2, 0.8), smoothstep(0.7, 0.9, leaf) * 0.5 + vSeed * 0.15);
    float diff = max(dot(n, L), 0.0);
    // Light passes through leaves: brightest when the sun is behind them.
    float trans = pow(max(dot(-V, L), 0.0), 2.0) * 0.55 * (0.4 + 0.6 * leaf);
    vec3 col = base * (uShade * (0.55 + 0.45 * n.y) + uSunCol * (diff * 0.7 + trans) * (0.55 + 0.6 * leaf));
    col *= 0.8 + 0.3 * smoothstep(-0.4, 0.9, vUp);
    // The roof of crowns seen from above is sunlit.
    col = mix(col, base * (uShade * 0.8 + uSunCol * 1.0), uRoof * smoothstep(0.1, 0.8, n.y) * 0.6);
    float fog = 1.0 - exp(-pow(vDepth * uFog, 1.15));
    col = mix(col, uHaze, fog);
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
  varying float vDepth;
  varying vec3 vWorld;
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
    vec4 mv = viewMatrix * vec4(w, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const GRASS_FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  ${SUN}
  uniform vec3 uSun;
  uniform vec3 uSunCol;
  uniform vec3 uShade;
  uniform vec3 uHaze;
  uniform float uFog;
  varying float vTip;
  varying float vShade;
  varying float vRand;
  varying float vDepth;
  varying vec3 vWorld;
  void main() {
    vec3 base = mix(vec3(0.2, 0.22, 0.08), vec3(0.32, 0.3, 0.1), vRand);
    vec3 tip = mix(vec3(0.7, 0.6, 0.28), vec3(0.78, 0.68, 0.36), vRand);
    vec3 albedo = mix(base, tip, pow(vTip, 1.2)) * (0.8 + 0.3 * vShade);
    float reach = sunReach(vWorld, normalize(uSun));
    vec3 col = albedo * (uShade * 1.1 + uSunCol * reach * 0.95 * (0.4 + 0.6 * vTip));
    float fog = 1.0 - exp(-pow(vDepth * uFog, 1.15));
    col = mix(col, uHaze, fog);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const PANEL_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  varying float vDepth;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vec4 mv = viewMatrix * w;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

/**
 * The tiger: the record's photograph with its background removed, standing in
 * the same light as the drawn forest. The picture's soft edge is pulled in a
 * little so no halo of its old background shows, and the feet, which the cut
 * leaves faint, are given to the floor.
 */
const PANEL_FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  ${SUN}
  uniform sampler2D uMap;
  uniform vec3 uSun;
  uniform vec3 uSunCol;
  uniform vec3 uShade;
  uniform vec3 uHaze;
  uniform float uFog;
  uniform float uFade;
  varying vec2 vUv;
  varying vec3 vWorld;
  varying float vDepth;
  void main() {
    vec4 t = texture2D(uMap, vUv);
    float a = smoothstep(0.12, 0.7, t.a);
    vec3 col = t.rgb;
    // The picture was lit softly from the front: take a little of the forest's colour and its patchy light.
    float reach = sunReach(vWorld + vec3(0.0, 10.0, 0.0), normalize(uSun));
    vec3 light = mix(vec3(0.9, 0.93, 0.88), vec3(1.04, 1.0, 0.9), reach * 0.8);
    col = col * light * 0.97;
    // The foot sinks into the ground cover.
    a *= smoothstep(0.02, 0.2, vUv.y);
    float fog = 1.0 - exp(-pow(vDepth * uFog, 1.15));
    col = mix(col, uHaze, fog);
    gl_FragColor = vec4(col, a * uFade);
  }
`;

const SHADOW_FRAGMENT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vec2 q = (vUv - 0.5) * 2.0;
    float d = length(q * vec2(1.0, 1.35));
    float a = pow(clamp(1.0 - d, 0.0, 1.0), 1.4) * 0.5;
    gl_FragColor = vec4(0.06, 0.05, 0.03, a);
  }
`;

const SHADOW_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export async function createForest({ tier }: WorldContext): Promise<FieldWorld> {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.3, 1600);
  const C = {
    haze: rgb('#a8b27f'),
    hazeLate: rgb('#c9b27a'),
    shade: rgb('#5e7058'),
    sunCol: rgb('#ffd9a0'),
    sunColLate: rgb('#ffbd7a'),
    leafA: rgb('#3a5a22'),
    leafB: rgb('#7f9a34'),
  };
  const sun = new THREE.Vector3(0.5, 0.36, 0.78).normalize();
  const sunLate = new THREE.Vector3(0.6, 0.2, 0.75).normalize();
  const sunCol = C.sunCol.clone();
  const haze = C.haze.clone();
  const shared = {
    uSun: { value: sun },
    uSunCol: { value: sunCol },
    uShade: { value: C.shade },
    uHaze: { value: haze },
    uFog: { value: FOG },
  };
  const rand = seededRandom(53);

  /* the floor */
  const floorGeo = new THREE.PlaneGeometry(1200, 1200);
  floorGeo.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(floorGeo, new THREE.ShaderMaterial({ vertexShader: FLOOR_VERTEX, fragmentShader: FLOOR_FRAGMENT, uniforms: { ...shared } }));
  floor.position.z = -150;
  scene.add(floor);

  /* the trunks: tapering, varied in girth and lean, in clumps with gaps between */
  const trunkCount = { high: 440, balanced: 310, low: 190 }[tier];
  const trunkGeo = new THREE.CylinderGeometry(0.72, 1, 1, tier === 'low' ? 8 : 12, 8, true);
  trunkGeo.translate(0, 0.5, 0);
  const seeds = new Float32Array(trunkCount);
  const trunkMat = new THREE.ShaderMaterial({ vertexShader: TRUNK_VERTEX, fragmentShader: TRUNK_FRAGMENT, uniforms: { ...shared }, side: THREE.DoubleSide });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, trunkCount);
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
      // The tiger's clearing, and the way the camera walks in: no trunk in either.
      const dx = x - T.x;
      const dz = z - T.z;
      if (Math.abs(dx) < 13 && dz > -22 && dz < 62) continue;
      if (Math.abs(dx) < 7 && dz < -22 && dz > -48) continue;
      // Clumps and gaps.
      if (fbm(x * 0.02 + 5, z * 0.02, 3, 71) + (rand() - 0.5) * 0.3 < 0.42) continue;
      ok = true;
      break;
    }
    const r = 0.9 + Math.pow(rand(), 2.2) * 1.9;
    eu.set((rand() - 0.5) * 0.05, rand() * Math.PI, (rand() - 0.5) * 0.05);
    q.setFromEuler(eu);
    m.compose(new THREE.Vector3(x, -0.5, z), q, new THREE.Vector3(ok ? r : 0, 100 + rand() * 14, ok ? r : 0));
    trunks.setMatrixAt(i, m);
    seeds[i] = rand();
  }
  trunkGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  trunks.frustumCulled = false;
  scene.add(trunks);

  /* foliage: the roof of crowns, hanging leaf in the middle layer, saplings and shrub below */
  const leafUniforms = { ...shared, uLeafA: { value: C.leafA }, uLeafB: { value: C.leafB }, uRoof: { value: 1 } };
  const leafMat = new THREE.ShaderMaterial({ vertexShader: LEAF_VERTEX, fragmentShader: LEAF_FRAGMENT, uniforms: { ...leafUniforms, uScale: { value: 1 } } });
  // The crowns are far and huge: their leaf pattern is drawn coarser, so it does not melt into a smear.
  const crownMat = new THREE.ShaderMaterial({ vertexShader: LEAF_VERTEX, fragmentShader: LEAF_FRAGMENT, uniforms: { ...leafUniforms, uScale: { value: 0.4 } } });
  // Welded and smooth: no flat facets showing through the foliage.
  const ico = new THREE.IcosahedronGeometry(1, tier === 'low' ? 2 : 3);
  ico.deleteAttribute('normal');
  ico.deleteAttribute('uv');
  const leafGeo = mergeVertices(ico);
  leafGeo.computeVertexNormals();
  const clear = (x: number, z: number, pad: number) => Math.abs(x - T.x) < 13 + pad && z > T.z - 24 - pad && z < T.z + 62;
  type Blob = [number, number, number, number, number]; // x, y, z, radius, squash
  const blobs: Blob[] = [];
  const crown = { high: 460, balanced: 320, low: 190 }[tier];
  for (let i = 0; i < crown; i++) {
    blobs.push([T.x + (rand() - 0.5) * 520, 94 + rand() * 12, T.z + 80 - rand() * 460, 18 + rand() * 12, 0.5]);
  }
  const shrubs = { high: 120, balanced: 85, low: 50 }[tier];
  const shrubStart = blobs.length;
  for (let i = 0; blobs.length < shrubStart + shrubs && i < shrubs * 12; i++) {
    const x = T.x + (rand() - 0.5) * 130;
    const z = T.z + 55 - rand() * 130;
    if (clear(x, z, 0)) continue;
    if (Math.abs(x - T.x) < 9 && z > T.z - 14 && z < T.z + 3) continue;
    if (fbm(x * 0.05 + 2, z * 0.05, 2, 83) < 0.42) continue;
    const r = 0.9 + rand() * 1.8;
    blobs.push([x, r * 0.5, z, r, 0.55]);
  }
  const leafSeeds = new Float32Array(blobs.length);
  const crownMesh = new THREE.InstancedMesh(leafGeo, crownMat, crown);
  const shrubMesh = new THREE.InstancedMesh(leafGeo, leafMat, blobs.length - crown);
  blobs.forEach(([x, y, z, r, sq], i) => {
    eu.set(0, rand() * 6.28, 0);
    q.setFromEuler(eu);
    m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(r * (1 + rand() * 0.3), r * sq, r * (1 + rand() * 0.3)));
    if (i < crown) crownMesh.setMatrixAt(i, m);
    else shrubMesh.setMatrixAt(i - crown, m);
    leafSeeds[i] = rand();
  });
  leafGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(leafSeeds, 1));
  for (const mesh of [crownMesh, shrubMesh]) {
    mesh.frustumCulled = false;
    scene.add(mesh);
  }

  /* fallen logs */
  const logGeo = new THREE.CylinderGeometry(0.8, 0.95, 1, 9, 1, false);
  // The trunk shader flares the foot (y = 0); a log stands on the same footing.
  logGeo.translate(0, 0.5, 0);
  const logCount = 6;
  const logs = new THREE.InstancedMesh(logGeo, trunkMat, logCount);
  const logSeeds = new Float32Array(logCount);
  for (let i = 0; i < logCount; i++) {
    const x = T.x + (i % 2 ? 1 : -1) * (14 + rand() * 30);
    const z = T.z - 8 - rand() * 80;
    const len = 9 + rand() * 12;
    eu.set(0, rand() * 3.14, Math.PI / 2 + (rand() - 0.5) * 0.08, 'YXZ');
    q.setFromEuler(eu);
    m.compose(new THREE.Vector3(x, 0.55, z), q, new THREE.Vector3(1.0 + rand() * 0.5, len, 1.0 + rand() * 0.5));
    logs.setMatrixAt(i, m);
    logSeeds[i] = rand();
  }
  logGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(logSeeds, 1));
  logs.frustumCulled = false;
  scene.add(logs);

  /* grass: drifts of it, dry at the tip, and a row in front of the tiger's feet */
  const grassCount = { high: 6000, balanced: 4000, low: 2300 }[tier];
  const front = 300;
  const inst = new Float32Array((grassCount + front) * 4);
  const rnd = new Float32Array((grassCount + front) * 4);
  let placed = 0;
  const put = (x: number, z: number, s: number) => {
    inst.set([x, -0.1, z, s], placed * 4);
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
  const grassMat = new THREE.ShaderMaterial({ vertexShader: GRASS_VERTEX, fragmentShader: GRASS_FRAGMENT, uniforms: { ...shared, uTime: { value: 0 } }, side: THREE.DoubleSide });
  const grass = new THREE.Mesh(grassGeo, grassMat);
  grass.frustumCulled = false;
  scene.add(grass);

  /* the tiger, standing, with a shadow under it */
  const texture = await new THREE.TextureLoader().loadAsync(cutoutUrl);
  texture.colorSpace = THREE.NoColorSpace;
  texture.anisotropy = 4;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  const panelW = 13;
  const panelH = panelW / 2;
  const panelMat = new THREE.ShaderMaterial({
    vertexShader: PANEL_VERTEX,
    fragmentShader: PANEL_FRAGMENT,
    uniforms: { ...shared, uMap: { value: texture }, uFade: { value: 1 } },
    transparent: true,
    depthWrite: false,
  });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(panelW, panelH), panelMat);
  // The picture's feet are 6% up from its foot.
  panel.position.set(T.x, panelH * 0.5 - panelH * 0.06 + 0.1, T.z);
  panel.renderOrder = 3;
  scene.add(panel);
  const shadowGeo = new THREE.PlaneGeometry(panelW * 0.95, 4.4);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.ShaderMaterial({ vertexShader: SHADOW_VERTEX, fragmentShader: SHADOW_FRAGMENT, transparent: true, depthWrite: false });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.position.set(T.x + 0.5, 0.05, T.z - 0.4);
  shadow.renderOrder = 1;
  scene.add(shadow);

  /* the camera: in at eye level, alongside, above the crowns for the reserves, and back */
  const S = (dx: number, up: number, dz: number): [number, number, number] => [T.x + dx, up, T.z + dz];
  const N = 7;
  const at = (i: number) => (i + 0.5) / N;
  const path: Shot[] = [
    // The tiger above the title, the forest around it.
    { at: 0, pos: S(0, 3.8, 36), look: S(-3, -1.2, 0), fov: 40 },
    { at: at(0), pos: S(0, 3.8, 35), look: S(-3, -1.2, 0), fov: 40 },
    // Text at the right: the tiger to the left.
    { at: at(1), pos: S(2, 3.6, 25), look: S(10, 1.2, -4), fov: 40 },
    // The 1973 chapter, text at the left: the tiger to the right, nearer.
    { at: at(2), pos: S(-3, 3.4, 21), look: S(-10, 2, -2), fov: 40 },
    // The crowns from above, for the reserves the record names.
    { at: at(3), pos: S(10, 330, 90), look: S(10, 40, -60), fov: 46 },
    { at: at(4), pos: S(-6, 3.2, 16), look: S(-9, 2.2, 0), fov: 38 },
    { at: at(5), pos: S(4, 3.6, 22), look: S(13, 2, -3), fov: 40 },
    { at: at(6), pos: S(-4, 5, 54), look: S(30, 1.5, -8), fov: 42 },
    { at: 1, pos: S(-6, 5.2, 57), look: S(32, 1.5, -8), fov: 42 },
  ];
  const rig = new CameraRig(camera, {
    preview: { at: 0, pos: S(-3, 4, 46), look: S(-6, 0, 0), fov: 38 },
    engage: { at: 0, pos: S(-1, 3.9, 38), look: S(-4, -0.8, 0), fov: 37 },
    path,
    sway: [3, 1.8],
    lambda: 4.6,
  });

  let phase = 0;
  const camDir = new THREE.Vector3();
  return {
    scene,
    camera,
    clear: '#a8b27f',
    update(i: FieldInput) {
      const p = i.progress;
      const en = i.enter;
      rig.update({ engage: i.engage, enter: en, progress: p, pointer: i.pointer, dt: i.dt, snap: i.snap || i.reduced });

      // The sun climbs a little as the day goes on and warms as the study ends.
      const late = seg(p, 0.82, 1) * en;
      sun.set(0.5 + i.pointer.x * 0.06, 0.36 + i.pointer.y * 0.02, 0.78).lerp(sunLate, late).normalize();
      sunCol.lerpVectors(C.sunCol, C.sunColLate, late);
      haze.lerpVectors(C.haze, C.hazeLate, late * 0.8);
      // Seen from above, the air between the camera and the crowns is thin.
      shared.uFog.value = FOG * (1 - 0.85 * THREE.MathUtils.smoothstep(camera.position.y, 20, 300));
      phase += i.reduced ? 0 : i.dt;
      grassMat.uniforms.uTime.value = phase;

      // The tiger turns to face the camera (not past 35°), and gives way when seen from above.
      camDir.copy(camera.position).sub(panel.position);
      panel.rotation.y = Math.max(-0.6, Math.min(0.6, Math.atan2(camDir.x, camDir.z)));
      const sinEl = camDir.y / Math.max(1, camDir.length());
      panelMat.uniforms.uFade.value = 1 - THREE.MathUtils.smoothstep(sinEl, 0.35, 0.7);
      panel.visible = panelMat.uniforms.uFade.value > 0.01;
      shadow.visible = panel.visible;
    },
    resize(width, height) {
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    },
    setRung() {},
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
