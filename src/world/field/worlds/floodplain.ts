import * as THREE from 'three';
import { GLSL_GRAIN, GLSL_HASH, GLSL_NOISE } from '../../gl/chunks';
import { seededRandom } from '../../gl/particles';
import { CameraRig, type Shot } from '../cameraRig';
import { rgb } from '../gl/color';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { fbm, seg } from '../noise';
import cutoutUrl from '../../../assets/field/indian-rhinoceros-cutout.webp';
import type { FieldInput, FieldWorld, WorldContext } from '../types';

/**
 * FIELD STUDY 05 · the greater one-horned rhinoceros, the Brahmaputra floodplain.
 *
 * An open floodplain on a hazy morning. Short turf and trodden earth around
 * the animal, with shallow wallows, wet and dark at the rim, that take the
 * sky; medium grass beyond, and stands of tall "elephant grass" standing well
 * over the animal's back; a long shallow beel in the middle distance with
 * reeds at its edge; a low line of riverine forest on the far shore, softened
 * by haze; a pale sky with thin cloud. Distance is carried by haze.
 *
 * The rhinoceros is the record's photograph, cut out of its background. It
 * stands in the trodden ground at the edge of the grass, with a soft shadow
 * under it, its lower body stained with the ground's mud, and its feet in
 * short grass.
 *
 * Nothing here is added to make the scene "do" something: no points, no
 * routes, no marks. The camera stays with the animal, rises to take in the
 * floodplain while the programme and the sites are named, and comes back.
 *
 * Honesty: the floodplain is drawn, an impression of a Brahmaputra floodplain
 * and not of Kaziranga or any other park; the sites the record names are
 * listed in the text and not drawn. The rhinoceros is a photograph (cut out),
 * not a drawn animal; the figures are in the text, not drawn as points.
 */

const FOG = 0.0036;

/** The shared sky: haze at the horizon, a pale zenith, thin cloud, a hazy sun. */
const SKY = /* glsl */ `
  uniform vec3 uZenith;
  uniform vec3 uSun;
  uniform vec3 uSunCol;
  uniform vec3 uHaze;
  vec3 skyColour(vec3 d) {
    float h = clamp(d.y, 0.0, 1.0);
    vec3 c = mix(uHaze, uZenith, pow(h, 0.5));
    vec2 cp = d.xz / (d.y + 0.2) * 0.9;
    float cl = smoothstep(0.52, 0.82, fbm3(cp * 1.4 + 3.0)) * smoothstep(0.02, 0.28, h);
    c = mix(c, vec3(0.99, 0.96, 0.9), cl * 0.55);
    float sd = max(dot(d, normalize(uSun)), 0.0);
    c += uSunCol * (pow(sd, 10.0) * 0.22 + pow(sd, 120.0) * 0.45);
    return c;
  }
`;

const SKY_VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_Position.z = gl_Position.w * 0.99999;
  }
`;

const SKY_FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  ${GLSL_GRAIN}
  ${SKY}
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    vec3 c = skyColour(d);
    // Below the horizon the ground has its own colour; the dome blends to haze so no seam shows.
    c = mix(c, uHaze, smoothstep(0.0, -0.1, d.y));
    c += paperGrain(gl_FragCoord.xy, 0.005);
    gl_FragColor = vec4(c, 1.0);
  }
`;

/** Where the water is: three wallows near the animal and a long beel behind. */
const WATER = /* glsl */ `
  float wallow(vec2 p, vec2 c, vec2 r) {
    float d = length((p - c) / r) + 0.22 * (valueNoise(p * 0.22) - 0.5) + 0.1 * (valueNoise(p * 0.7 + 4.0) - 0.5);
    return d;
  }
  // 0 = dry, 1 = water; the rim distance goes in y.
  vec2 waterAt(vec2 p) {
    float d = min(min(wallow(p, vec2(-14.0, 15.0), vec2(13.0, 6.5)), wallow(p, vec2(32.0, -22.0), vec2(16.0, 7.0))), wallow(p, vec2(-46.0, -32.0), vec2(11.0, 5.0)));
    float near = 1.0 - smoothstep(0.86, 1.0, d);
    // The beel: a long shallow stretch of water with a wandering edge.
    float nearEdge = -112.0 + 26.0 * (fbm3(vec2(p.x * 0.012, 3.0)) - 0.5) * 2.0;
    float farEdge = -196.0 + 14.0 * (fbm3(vec2(p.x * 0.02, 9.0)) - 0.5) * 2.0;
    float beel = smoothstep(nearEdge, nearEdge - 3.0, p.y) * smoothstep(farEdge, farEdge + 3.0, p.y);
    // A few banks of land standing in the beel.
    beel *= 1.0 - smoothstep(0.62, 0.7, fbm3(p * vec2(0.02, 0.05) + 17.0)) * 0.9;
    return vec2(max(near, beel), d);
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
  ${SKY}
  ${WATER}
  uniform vec3 uShade;
  uniform float uFog;
  varying vec3 vWorld;
  varying float vDepth;
  void main() {
    vec2 p = vWorld.xz;
    float near = 1.0 - smoothstep(40.0, 220.0, vDepth);
    float coarse = fbm3(p * 0.05);
    float fine = valueNoise(p * 2.4);
    // Turf and earth: green where it is damp and grassed, bare and sun-dried where it is trodden.
    vec3 earth = mix(vec3(0.34, 0.26, 0.16), vec3(0.44, 0.34, 0.2), coarse);
    vec3 turf = mix(vec3(0.3, 0.37, 0.14), vec3(0.45, 0.46, 0.2), fbm3(p * 0.11 + 4.0));
    float cover = smoothstep(0.18, 0.5, fbm3(p * 0.045 + 8.0));
    vec3 col = mix(earth, turf, cover * 0.92);
    // Trodden bare ground around the animal.
    float trod = 1.0 - smoothstep(6.0, 26.0, length((p - vec2(0.0, 2.0)) * vec2(0.75, 1.2)));
    col = mix(col, earth * 1.04, trod * 0.38);
    col *= 0.82 + 0.34 * fine * near + 0.12 * (1.0 - near) * coarse;
    vec2 w = waterAt(p);
    // Wet dark mud round the water, drying outward.
    float rim = (1.0 - smoothstep(0.98, 1.6, w.y)) * (1.0 - w.x);
    col = mix(col, vec3(0.18, 0.135, 0.095), rim * 0.8);
    float sunUp = max(normalize(uSun).y, 0.0);
    col *= uShade * 1.1 + uSunCol * sunUp * (0.85 + 0.3 * valueNoise(p * 0.03 + 2.0));
    // Water: turbid olive-brown, taking the sky where it is seen at a low angle, and the far trees near the far shore.
    vec3 V = normalize(cameraPosition - vWorld);
    float fres = 0.06 + 0.7 * pow(1.0 - clamp(V.y, 0.0, 1.0), 4.0);
    vec3 refl = skyColour(normalize(vec3(-V.x, max(V.y, 0.015), -V.z))) * 0.8;
    float farEdge = -196.0 + 14.0 * (fbm3(vec2(p.x * 0.02, 9.0)) - 0.5) * 2.0;
    float treeRefl = (1.0 - smoothstep(0.0, 30.0, p.y - farEdge)) * step(p.y, -100.0);
    refl = mix(refl, vec3(0.17, 0.24, 0.15), treeRefl * 0.6 * (0.6 + 0.4 * valueNoise(p * vec2(0.4, 1.6))));
    vec3 bed = mix(vec3(0.3, 0.26, 0.15), vec3(0.14, 0.14, 0.09), smoothstep(0.55, 0.0, w.y));
    bed *= uShade * 1.1 + uSunCol * sunUp * 0.5;
    vec3 water = mix(bed, refl, fres);
    // Faint ripple of the surface, stretched along the view.
    water *= 0.97 + 0.06 * valueNoise(p * vec2(0.9, 3.5));
    col = mix(col, water, w.x);
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
  void main() {
    vec3 p = position;
    float bump = sin(p.x * 5.1 + aSeed * 17.0) * sin(p.y * 4.7 + aSeed * 9.0) * sin(p.z * 5.6 + aSeed * 3.0);
    p *= 1.0 + 0.14 * bump;
    vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.0);
    vWorld = w.xyz;
    vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
    vSeed = aSeed;
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
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vDepth;
  varying float vSeed;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 q = (vWorld + vec3(vSeed * 20.0)) * 0.5;
    // Fine, low-contrast leaf texture: from a distance a canopy is a soft mass, not a rock.
    float leaf = (valueNoise(q.xy * 3.0) + valueNoise(q.zy * 3.0 + 7.0) + valueNoise(q.xz * 3.0 + 5.0)) * 0.2 + valueNoise(q.xy * 9.0 + 3.0) * 0.4;
    vec3 base = mix(uLeafA, uLeafB, 0.3 + 0.5 * leaf);
    float diff = max(dot(n, normalize(uSun)), 0.0);
    // Darker under the crown, lighter on top.
    base *= 0.72 + 0.4 * smoothstep(-0.5, 0.9, n.y);
    vec3 col = base * (uShade * (0.7 + 0.3 * n.y) + uSunCol * diff * 0.45);
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
  varying float vTall;
  varying float vDepth;
  void main() {
    float a = aRand.x * 6.28318;
    mat2 R = mat2(cos(a), -sin(a), sin(a), cos(a));
    vec3 p = position * aInst.w;
    p.xz = R * p.xz;
    float wind = sin(uTime * 0.6 + aRand.z * 6.28 + aInst.x * 0.04) * 0.5 + sin(uTime * 0.27 + aInst.z * 0.03) * 0.5;
    p.x += wind * aTip * aTip * aInst.w * 0.05;
    vec3 w = aInst.xyz + p;
    vTip = aTip;
    vShade = aShade;
    vRand = aRand.y;
    vTall = smoothstep(2.0, 8.0, aInst.w * 1.5);
    vec4 mv = viewMatrix * vec4(w, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const GRASS_FRAGMENT = /* glsl */ `
  uniform vec3 uSun;
  uniform vec3 uSunCol;
  uniform vec3 uShade;
  uniform vec3 uHaze;
  uniform float uFog;
  varying float vTip;
  varying float vShade;
  varying float vRand;
  varying float vTall;
  varying float vDepth;
  void main() {
    // Short grass is green; the tall stands are deep green at the foot and straw at the head.
    vec3 footA = mix(vec3(0.2, 0.3, 0.1), vec3(0.15, 0.24, 0.08), vTall);
    vec3 tipA = mix(vec3(0.5, 0.52, 0.2), vec3(0.74, 0.68, 0.4), vTall * (0.5 + 0.5 * vRand));
    vec3 albedo = mix(footA, tipA, pow(vTip, 1.1)) * (0.82 + 0.3 * vShade);
    // Deep in a stand the light is dim.
    float inside = mix(1.0, 0.45 + 0.55 * pow(vTip, 0.8), vTall);
    float sunUp = max(normalize(uSun).y, 0.0);
    vec3 col = albedo * inside * (uShade * 1.1 + uSunCol * sunUp * 0.95 * (0.5 + 0.5 * vTip));
    float fog = 1.0 - exp(-pow(vDepth * uFog, 1.15));
    col = mix(col, uHaze, fog);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const PANEL_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv;
    vec4 mv = viewMatrix * modelMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

/**
 * The rhinoceros: the record's photograph with its background removed, standing
 * in the floodplain's light. The cut's soft edge is pulled in a little so no
 * halo of the old background shows; the legs and belly take the colour of
 * the mud they stand in; the feet go into the grass.
 */
const PANEL_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uSunCol;
  uniform vec3 uShade;
  uniform vec3 uHaze;
  uniform float uFog;
  uniform float uFade;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vec4 t = texture2D(uMap, vUv);
    float a = smoothstep(0.15, 0.72, t.a);
    vec3 col = t.rgb;
    // The picture's light was soft and grey: warm it a little to the morning's.
    col *= mix(vec3(0.92, 0.94, 0.93), vec3(1.05, 1.0, 0.92), 0.7);
    // Mud on the legs and the underside, drying upward.
    float mud = (1.0 - smoothstep(0.04, 0.42, vUv.y)) * 0.75;
    col = mix(col, col * vec3(0.72, 0.62, 0.5), mud);
    a *= smoothstep(0.015, 0.1, vUv.y);
    float fog = 1.0 - exp(-pow(vDepth * uFog, 1.15));
    col = mix(col, uHaze, fog);
    gl_FragColor = vec4(col, a * uFade);
  }
`;

const SHADOW_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SHADOW_FRAGMENT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vec2 q = (vUv - 0.5) * 2.0;
    float d = length(q * vec2(1.0, 1.3));
    float a = pow(clamp(1.0 - d, 0.0, 1.0), 1.3) * 0.55;
    gl_FragColor = vec4(0.1, 0.075, 0.05, a);
  }
`;

export async function createFloodplain({ tier }: WorldContext): Promise<FieldWorld> {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.3, 1800);
  const C = {
    haze: rgb('#cfd2b4'),
    hazeLate: rgb('#e0cfa6'),
    zenith: rgb('#8fb1c4'),
    shade: rgb('#8a967a'),
    sunCol: rgb('#ffe2b0'),
    sunColLate: rgb('#ffc58a'),
    leafA: rgb('#46602f'),
    leafB: rgb('#667f3c'),
  };
  const sun = new THREE.Vector3(0.78, 0.34, 0.35).normalize();
  const sunLate = new THREE.Vector3(0.8, 0.2, 0.3).normalize();
  const sunCol = C.sunCol.clone();
  const haze = C.haze.clone();
  const shared = {
    uSun: { value: sun },
    uSunCol: { value: sunCol },
    uShade: { value: C.shade },
    uHaze: { value: haze },
    uFog: { value: FOG },
  };
  const rand = seededRandom(61);

  /* the sky: a dome that follows the camera */
  const skyGeo = new THREE.SphereGeometry(1000, 32, 16);
  const sky = new THREE.Mesh(
    skyGeo,
    new THREE.ShaderMaterial({
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      uniforms: { uSun: shared.uSun, uSunCol: shared.uSunCol, uHaze: shared.uHaze, uZenith: { value: C.zenith } },
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
    }),
  );
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  scene.add(sky);

  /* the ground, with its water */
  const floorGeo = new THREE.PlaneGeometry(2400, 2400);
  floorGeo.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(
    floorGeo,
    new THREE.ShaderMaterial({
      vertexShader: FLOOR_VERTEX,
      fragmentShader: FLOOR_FRAGMENT,
      uniforms: { ...shared, uZenith: { value: C.zenith } },
    }),
  );
  floor.position.z = -300;
  scene.add(floor);

  /* the far shore: a low line of riverine forest, in haze */
  const leafMat = new THREE.ShaderMaterial({
    vertexShader: LEAF_VERTEX,
    fragmentShader: LEAF_FRAGMENT,
    uniforms: { ...shared, uLeafA: { value: C.leafA }, uLeafB: { value: C.leafB } },
  });
  const ico = new THREE.IcosahedronGeometry(1, tier === 'low' ? 2 : 3);
  ico.deleteAttribute('normal');
  ico.deleteAttribute('uv');
  const leafGeo = mergeVertices(ico);
  leafGeo.computeVertexNormals();
  type Blob = [number, number, number, number, number]; // x, y, z, radius, squash
  const blobs: Blob[] = [];
  const treeCount = { high: 260, balanced: 180, low: 110 }[tier];
  for (let i = 0; i < treeCount; i++) {
    const x = -420 + (i / treeCount) * 840 + (rand() - 0.5) * 6;
    // The line wanders in depth and has gaps and a few taller trees.
    const z = -232 - fbm(x * 0.012, 2, 2, 31) * 38 - rand() * 12;
    if (fbm(x * 0.02 + 9, 0, 2, 47) + (rand() - 0.5) * 0.3 < 0.3) continue;
    const tall = rand() < 0.14;
    const r = (6 + rand() * 6) * (tall ? 1.4 : 1);
    const lift = tall ? 8 + rand() * 8 : 0;
    // Broad, flat crowns that overlap into one low mass.
    blobs.push([x, lift + r * 0.5, z, r * 1.5, 0.42]);
    if (rand() < 0.7) blobs.push([x + (rand() - 0.5) * r * 1.6, lift + r * 0.35, z + (rand() - 0.5) * 6, r * 1.2, 0.4]);
    if (tall) blobs.push([x + (rand() - 0.5) * r, lift + r * 0.8, z, r * 1.0, 0.42]);
  }
  const leafSeeds = new Float32Array(blobs.length);
  const treeMesh = new THREE.InstancedMesh(leafGeo, leafMat, blobs.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const eu = new THREE.Euler();
  blobs.forEach(([x, y, z, r, sq], i) => {
    eu.set(0, rand() * 6.28, 0);
    q.setFromEuler(eu);
    m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(r * (1 + rand() * 0.3), r * sq, r * (1 + rand() * 0.3)));
    treeMesh.setMatrixAt(i, m);
    leafSeeds[i] = rand();
  });
  leafGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(leafSeeds, 1));
  treeMesh.frustumCulled = false;
  scene.add(treeMesh);

  /* the grass: short turf near the animal, medium grass beyond, tall stands over its back */
  const shortN = { high: 9000, balanced: 6200, low: 3600 }[tier];
  const midN = { high: 5200, balanced: 3600, low: 2100 }[tier];
  const tallN = { high: 6500, balanced: 4600, low: 2800 }[tier];
  const reedN = { high: 1400, balanced: 1000, low: 600 }[tier];
  const front = 260;
  const total = shortN + midN + tallN + reedN + front;
  const inst = new Float32Array(total * 4);
  const rnd = new Float32Array(total * 4);
  let placed = 0;
  const put = (x: number, z: number, s: number) => {
    inst.set([x, -0.1, z, s], placed * 4);
    rnd.set([rand(), rand(), rand(), rand()], placed * 4);
    placed++;
  };
  // Tuft geometry's blades are 1–2 long: a scale of 1 is about a unit and a half.
  for (let i = 0; i < front; i++) put(-6 + rand() * 12, 0.3 + rand() * 3.4, 0.22 + rand() * 0.22);
  // Short turf, in drifts, thinning toward the trodden ground and the water.
  for (let tries = 0, n = 0; n < shortN && tries < shortN * 14; tries++) {
    const x = (rand() - 0.5) * 110;
    const z = 44 - rand() * 80;
    if (fbm(x * 0.05 + 3, z * 0.05, 3, 17) + (rand() - 0.5) * 0.3 < 0.3) continue;
    if (Math.abs(x) < 8 && z > -4 && z < 4) continue;
    put(x, z, 0.4 + rand() * 0.45);
    n++;
  }
  // Medium grass, waist to shoulder high on the animal: the open floodplain.
  for (let tries = 0, n = 0; n < midN && tries < midN * 14; tries++) {
    const x = (rand() - 0.5) * 240;
    const z = 8 - rand() * 125;
    // The trodden ground and the way the camera comes in stay open.
    if (Math.abs(x) < 22 && z > -8) continue;
    if (fbm(x * 0.03 + 21, z * 0.03, 3, 23) + (rand() - 0.5) * 0.3 < 0.4) continue;
    put(x, z, 0.8 + rand() * 0.9);
    n++;
  }
  // Tall stands: elephant grass over the back of the animal, in patches with open ground between.
  for (let tries = 0, n = 0; n < tallN && tries < tallN * 18; tries++) {
    const x = (rand() - 0.5) * 300;
    const z = -14 - rand() * 120;
    // Not on the animal's side of the clearing, nor directly behind it.
    if (Math.abs(x) < 20 && z > -30) continue;
    if (fbm(x * 0.022 + 40, z * 0.03, 3, 29) + (rand() - 0.5) * 0.18 < 0.56) continue;
    put(x, z, 3.2 + rand() * 2.6);
    n++;
  }
  // Reeds at the edges of the water: the wallows and the near shore of the beel.
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
  const grassMat = new THREE.ShaderMaterial({
    vertexShader: GRASS_VERTEX,
    fragmentShader: GRASS_FRAGMENT,
    uniforms: { ...shared, uTime: { value: 0 } },
    side: THREE.DoubleSide,
  });
  const grass = new THREE.Mesh(grassGeo, grassMat);
  grass.frustumCulled = false;
  scene.add(grass);

  /* the rhinoceros, standing, with a shadow under it */
  const texture = await new THREE.TextureLoader().loadAsync(cutoutUrl);
  texture.colorSpace = THREE.NoColorSpace;
  texture.anisotropy = 4;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  const panelW = 14;
  const panelH = panelW * (711 / 1400);
  const panelMat = new THREE.ShaderMaterial({
    vertexShader: PANEL_VERTEX,
    fragmentShader: PANEL_FRAGMENT,
    uniforms: { ...shared, uMap: { value: texture }, uFade: { value: 1 } },
    transparent: true,
    depthWrite: false,
  });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(panelW, panelH), panelMat);
  // The picture's feet are 2% up from its foot.
  panel.position.set(0, panelH * 0.5 - panelH * 0.02 + 0.05, 0);
  panel.renderOrder = 3;
  scene.add(panel);
  const shadowGeo = new THREE.PlaneGeometry(panelW * 0.92, 4.2);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(shadowGeo, new THREE.ShaderMaterial({ vertexShader: SHADOW_VERTEX, fragmentShader: SHADOW_FRAGMENT, transparent: true, depthWrite: false }));
  shadow.position.set(0.6, 0.06, -0.3);
  shadow.renderOrder = 1;
  scene.add(shadow);

  /* the camera: with the animal, then up over the floodplain for the sites, and back */
  const N = 7;
  const at = (i: number) => (i + 0.5) / N;
  const path: Shot[] = [
    // The rhinoceros above the title, the floodplain behind.
    { at: 0, pos: [-1, 3.4, 34], look: [-3, 1.6, 0], fov: 40 },
    { at: at(0), pos: [-1, 3.4, 33], look: [-3, 1.6, 0], fov: 40 },
    // Text at the right: the animal to the left.
    { at: at(1), pos: [4, 3.4, 31], look: [9, 2.4, -2], fov: 40 },
    // Text at the left: the animal to the right.
    { at: at(2), pos: [-3, 3.2, 28], look: [-6, 2.6, 0], fov: 40 },
    // The whole floodplain, from above, for the sites the record names.
    { at: at(3), pos: [18, 36, 92], look: [12, 2, -60], fov: 46 },
    { at: at(4), pos: [6, 3.8, 24], look: [-2, 2.4, -1], fov: 40 },
    // The animal near, text at the right.
    { at: at(5), pos: [3, 3.2, 28], look: [4, 2.6, -1], fov: 38 },
    { at: at(6), pos: [-6, 5, 50], look: [14, 2.2, -6], fov: 42 },
    { at: 1, pos: [-7, 5.4, 53], look: [15, 2.2, -6], fov: 42 },
  ];
  const rig = new CameraRig(camera, {
    preview: { at: 0, pos: [-3, 4, 44], look: [-4, 1, 0], fov: 38 },
    engage: { at: 0, pos: [-2, 3.6, 38], look: [-3, 1.4, 0], fov: 37 },
    path,
    sway: [2.6, 1.6],
    lambda: 4.6,
  });

  let phase = 0;
  const camDir = new THREE.Vector3();
  return {
    scene,
    camera,
    clear: '#cfd2b4',
    update(i: FieldInput) {
      const p = i.progress;
      const en = i.enter;
      rig.update({ engage: i.engage, enter: en, progress: p, pointer: i.pointer, dt: i.dt, snap: i.snap || i.reduced });

      // The sun lowers and warms as the study ends.
      const late = seg(p, 0.8, 1) * en;
      sun.set(0.78 + i.pointer.x * 0.05, 0.34 + i.pointer.y * 0.02, 0.35).lerp(sunLate, late).normalize();
      sunCol.lerpVectors(C.sunCol, C.sunColLate, late);
      haze.lerpVectors(C.haze, C.hazeLate, late * 0.7);
      // Seen from above, the air nearer the camera is thinner.
      shared.uFog.value = FOG * (1 - 0.35 * THREE.MathUtils.smoothstep(camera.position.y, 10, 60));
      phase += i.reduced ? 0 : i.dt;
      grassMat.uniforms.uTime.value = phase;
      sky.position.copy(camera.position);

      // The animal turns a little to face the camera, and gives way when seen steeply from above.
      camDir.copy(camera.position).sub(panel.position);
      panel.rotation.y = Math.max(-0.5, Math.min(0.5, Math.atan2(camDir.x, camDir.z)));
      const sinEl = camDir.y / Math.max(1, camDir.length());
      panelMat.uniforms.uFade.value = 1 - THREE.MathUtils.smoothstep(sinEl, 0.4, 0.72);
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
