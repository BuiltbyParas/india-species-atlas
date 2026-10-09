import * as THREE from 'three';
import { GLSL_GRAIN, GLSL_HASH, GLSL_NOISE } from '../../gl/chunks';
import { CameraRig, type Shot } from '../cameraRig';
import { rgb } from '../gl/color';
import { makeHeightfield } from '../gl/terrain';
import { LEDGE } from '../grounds';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { noise2, ridged, seg } from '../noise';
import habitatUrl from '../../../assets/field/snow-leopard-habitat.webp';
import type { FieldInput, FieldWorld, WorldContext } from '../types';

/**
 * FIELD STUDY 02 · the snow leopard, the high Himalaya.
 *
 * A cold, clear day in high country. A snowy terrace in the foreground, a
 * valley that meanders away between rock walls, and ranges standing behind it,
 * each paler and bluer than the one before. Rock is warm grey, brown and slate,
 * banded with strata; snow lies on the gentle slopes and ledges and slides off
 * the steep faces; the sun is low and to one side, so every face is either lit
 * or in blue shadow.
 *
 * The leopard is the record's own photograph, whole, tail included. It stands
 * on the terrace as a panel in the snow and rock of the picture's own ledge:
 * its edges are given to the snow around it, and the terrace is shaded to
 * match, so the photograph reads as one place with the drawn mountain.
 *
 * Nothing here is added to make the scene "do" something: no line, no scale,
 * no falling snow. The camera walks the valley, comes close for the photograph,
 * lifts above the ranges for the record's map, and pulls back as the light
 * warms.
 *
 * Honesty: the mountains are drawn, an impression of high Himalayan country and
 * not a terrain model of any valley. The leopard is a photograph (Irbis1983,
 * public domain), not a drawn animal and not a cut-out.
 */

const FOG = 0.00052;

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
  uniform vec3 uSunCol;
  uniform vec3 uSkyAmb;
  uniform vec3 uShadeAmb;
  uniform vec3 uRockA;
  uniform vec3 uRockB;
  uniform vec3 uRockC;
  uniform vec3 uSnowCol;
  uniform vec3 uHaze;
  uniform vec3 uHazeFar;
  uniform vec3 uPanel;
  uniform float uFog;
  uniform float uSnowLine;
  uniform float uDim;
  varying vec3 vPos;
  varying vec3 vNormal;
  varying float vDepth;
  void main() {
    vec3 n0 = normalize(vNormal);
    vec2 p = vPos.xz;
    float near = 1.0 - smoothstep(80.0, 520.0, vDepth);

    // Relief the mesh is too coarse to carry: small folds, near the camera only.
    float e = 0.7;
    float b0 = fbm3(p * 0.22);
    float bx = fbm3((p + vec2(e, 0.0)) * 0.22);
    float bz = fbm3((p + vec2(0.0, e)) * 0.22);
    vec3 n = normalize(n0 + vec3(-(bx - b0), 0.0, -(bz - b0)) * 1.1 * near);

    // Rock: warm grey, brown and slate in broad fields, banded by strata.
    float big = fbm3(p * 0.0055 + 2.0);
    vec3 rock = mix(uRockA, uRockB, smoothstep(0.34, 0.66, big));
    rock = mix(rock, uRockC, smoothstep(0.44, 0.72, fbm3(p * 0.011 + 8.0)) * 0.8);
    float warp = valueNoise(p * 0.02 + 4.0) * 30.0;
    float strata = sin((vPos.y + warp) * 0.42) * 0.5 + 0.5;
    float strata2 = sin((vPos.y * 1.7 + warp * 2.0) * 0.5) * 0.5 + 0.5;
    float steep = smoothstep(0.35, 0.75, 1.0 - n0.y);
    rock *= 0.8 + 0.3 * valueNoise(p * 0.4) + steep * (0.16 * (strata - 0.5) + 0.1 * (strata2 - 0.5));

    // Snow lies on the gentle slopes and the ledges, thins with altitude's opposite, and slides off the steep faces.
    float alt = smoothstep(uSnowLine - 40.0, uSnowLine + 150.0, vPos.y + (valueNoise(p * 0.015) - 0.5) * 110.0);
    float gentle = smoothstep(0.42, 0.78, n0.y + (valueNoise(p * 0.08) - 0.5) * 0.34);
    float snow = smoothstep(0.3, 0.62, gentle * (0.1 + 0.85 * alt) + (valueNoise(p * 0.13 + 5.0) - 0.5) * 0.36);
    // On the leopard's terrace the snow is whole.
    float near3 = 1.0 - smoothstep(34.0, 125.0, distance(vPos, uPanel));
    snow = max(snow, near3 * smoothstep(0.3, 0.6, n0.y));
    // Around the leopard the rock is the photograph's own tan.
    rock = mix(rock, vec3(0.6, 0.54, 0.46), near3 * 0.55);
#ifdef ROCK
    // A boulder: snow only on the faces that look up; its flanks are bare, dark rock.
    snow = smoothstep(0.58, 0.88, n0.y + (valueNoise(p * 0.8) - 0.5) * 0.34) * 0.92;
    rock = mix(rock, vec3(0.46, 0.42, 0.38), 0.45) * (0.85 + 0.3 * valueNoise(vPos.xy * 0.9 + vPos.zy * 0.9));
#endif
    vec3 albedo = mix(rock, uSnowCol, snow);

    // A low sun from one side: faces that turn from it fall into blue shadow.
    float ndl = dot(n, uSun);
    float diff = clamp(ndl, 0.0, 1.0);
    float lit = smoothstep(-0.1, 0.5, ndl);
    vec3 amb = mix(uShadeAmb, uSkyAmb, clamp(n.y * 0.5 + 0.5, 0.0, 1.0));
    vec3 col = albedo * (uSunCol * diff * 1.3 + amb * (0.36 + 0.16 * (1.0 - lit)));
    // Snow in shadow is blue, never grey.
    col = mix(col, col * vec3(0.84, 0.94, 1.12), snow * (1.0 - lit));

    // Aerial perspective: each range paler and bluer than the one in front of it.
    float fog = 1.0 - exp(-pow(vDepth * uFog, 1.25));
    vec3 fogCol = mix(uHaze, uHazeFar, smoothstep(0.1, 0.9, fog));
    // Cold air pools in the valley floor.
    fog = clamp(fog + (1.0 - smoothstep(10.0, 90.0, vPos.y)) * 0.1 * smoothstep(60.0, 500.0, vDepth), 0.0, 0.96);
    col = mix(col, fogCol, fog);
    col += paperGrain(gl_FragCoord.xy, 0.008);
    col = mix(col, col * 0.7, uDim);
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
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uHorizon;
  uniform float uDim;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float y = max(d.y, 0.0);
    vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.22, y));
    col = mix(col, uTop, smoothstep(0.12, 0.8, y));
    // Thin cirrus, drawn out along the wind; clear air otherwise.
    vec2 cp = d.xz / (d.y + 0.3);
    float c = fbm3(vec2(cp.x * 0.7, cp.y * 3.2) + 4.0);
    col = mix(col, vec3(1.0), smoothstep(0.55, 0.8, c) * 0.2 * smoothstep(0.08, 0.35, d.y));
    col = mix(col, col * 0.7, uDim);
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
 * The habitat panel: the record's photograph with its edges given to the snow.
 * The picture's own border is already white and ragged; the shader roughens it
 * further and fades it into the terrace. The foot is kept whole where the tail
 * runs to the bottom of the frame, so the tail is never cut by the fade.
 */
const PANEL_FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  uniform sampler2D uMap;
  uniform vec3 uSnowCol;
  uniform vec3 uHaze;
  uniform vec3 uSunCol;
  uniform float uFog;
  uniform float uDim;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vec3 col = texture2D(uMap, vUv).rgb;
    // Cooler and a little quieter, to sit in the same light as the drawn snow.
    col = col * vec3(0.95, 0.985, 1.03) * 0.97;
    col = clamp((col - 0.5) * 1.05 + 0.5, 0.0, 1.0);
    float n = valueNoise(vec2(vUv.x * 30.0, vUv.y * 22.0));
    float n2 = valueNoise(vec2(vUv.x * 6.0, vUv.y * 5.0 + 4.0));
    float j = (n - 0.5) * 0.04 + (n2 - 0.5) * 0.07;
    // The picture is padded with blurred snow on three sides; all of the padding, and the picture's own ragged border, fade away.
    float sideL = smoothstep(0.0, 0.2, vUv.x + j);
    float sideR = smoothstep(0.0, 0.27, 1.0 - vUv.x + j * 0.5);
    float top = smoothstep(0.0, 0.2, 1.0 - vUv.y + j);
    float foot = smoothstep(0.0, 0.07, vUv.y + j);
    // The tail runs off the bottom of the picture at the right: leave it whole.
    foot = max(foot, smoothstep(0.6, 0.68, vUv.x));
    float a = sideL * sideR * top * foot;
    // Toward its edges the picture takes the terrace's snow, not its own.
    float edge = 1.0 - smoothstep(0.0, 1.0, a);
    col = mix(col, mix(uSnowCol * 0.97, vec3(0.78, 0.84, 0.92), smoothstep(0.55, 0.95, vUv.y)), edge * 0.5);
    float fog = 1.0 - exp(-pow(vDepth * uFog, 1.25));
    col = mix(col, uHaze, fog);
    col = mix(col, col * 0.7, uDim);
    gl_FragColor = vec4(col, a);
  }
`;

export async function createHimalaya({ tier }: WorldContext): Promise<FieldWorld> {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 4200);

  const C = {
    rockA: rgb('#4e4b48'),
    rockB: rgb('#6d5f50'),
    rockC: rgb('#2f353b'),
    snow: rgb('#f1f5fa'),
    haze: rgb('#b4c8de'),
    hazeFar: rgb('#c4d5e8'),
    skyAmb: rgb('#7f9fc8'),
    shadeAmb: rgb('#4a5f86'),
    sunCol: rgb('#fff3df'),
  };
  const sun = new THREE.Vector3(-0.72, 0.46, 0.32).normalize();
  const sunWarm = new THREE.Vector3(-0.8, 0.28, 0.2).normalize();
  const sunCol = C.sunCol.clone();
  const sunColLate = rgb('#ffd9ae');

  const shared = {
    uSun: { value: sun },
    uSunCol: { value: sunCol },
    uHaze: { value: C.haze },
    uFog: { value: FOG },
    uDim: { value: 0 },
  };

  /* the sky */
  const skyMat = new THREE.ShaderMaterial({
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    uniforms: {
      uTop: { value: rgb('#3f72ad') },
      uMid: { value: rgb('#8fb3d8') },
      uHorizon: { value: rgb('#d4e1ee') },
      uDim: shared.uDim,
    },
    side: THREE.BackSide,
    depthWrite: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3800, 32, 16), skyMat);
  sky.renderOrder = -10;
  scene.add(sky);

  /* the ground: a near sheet with the detail, a far one with the ranges */
  const res = { high: 340, balanced: 240, low: 160 }[tier];
  const farRes = { high: 260, balanced: 190, low: 130 }[tier];
  const ground = await makeHeightfield('mountains', 1000, 560, res, Math.round(res * 0.7), [0, -170]);
  const far = await makeHeightfield('mountains', 5200, 2400, farRes, Math.round(farRes * 0.7), [0, -1630]);
  const h = ground.height;

  /* where the leopard stands */
  const P = new THREE.Vector3(LEDGE.x, 0, LEDGE.z);
  P.y = h(P.x, P.z);
  const facing = new THREE.Vector3(0.14, 0, 1).normalize();
  const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), facing).normalize();
  const groundMat = new THREE.ShaderMaterial({
    vertexShader: GROUND_VERTEX,
    fragmentShader: GROUND_FRAGMENT,
    uniforms: {
      ...shared,
      uSkyAmb: { value: C.skyAmb },
      uShadeAmb: { value: C.shadeAmb },
      uRockA: { value: C.rockA },
      uRockB: { value: C.rockB },
      uRockC: { value: C.rockC },
      uSnowCol: { value: C.snow },
      uHazeFar: { value: C.hazeFar },
      uPanel: { value: new THREE.Vector3(P.x, P.y + 14, P.z) },
      uSnowLine: { value: 110 },
    },
  });
  scene.add(new THREE.Mesh(ground.geometry, groundMat));
  const farMesh = new THREE.Mesh(far.geometry, groundMat);
  // Beneath the near sheet where the two meet, so no seam shows.
  farMesh.position.y = -2.5;
  scene.add(farMesh);

  /* boulders of snow-dusted rock around the panel's edges and foot, so it stands among them and not on a plane */
  const rocks: Array<[number, number, number, number]> = [
    // across the panel, toward the viewer, size, height
    [-23, 2.6, 5, 0.9],
    [-18.5, 3.6, 2.8, 0.7],
    [-27, 0.8, 6.5, 1.1],
    [-31, -1, 8, 1],
    [22.5, 2.4, 4.6, 0.9],
    [27, 3, 5.8, 1],
    [19.5, 3.9, 2.4, 0.7],
    [31, 0, 8, 1.1],
    [-8, 3.3, 1.5, 0.55],
    [-3, 4.1, 1, 0.5],
    [6, 3.7, 1.3, 0.5],
    [11.5, 3.3, 1.8, 0.55],
  ];
  const rockGeo = (() => {
    const pos: number[] = [];
    const idx: number[] = [];
    rocks.forEach(([s, f, size, tall], k) => {
      const g = new THREE.IcosahedronGeometry(1, 4);
      g.deleteAttribute('uv');
      g.deleteAttribute('normal');
      const m = mergeVertices(g, 1e-4);
      const a = m.getAttribute('position');
      const base = pos.length / 3;
      const ang = k * 2.399;
      const cx = P.x + side.x * s + facing.x * f;
      const cz = P.z + side.z * s + facing.z * f;
      const cy = h(cx, cz);
      for (let i = 0; i < a.count; i++) {
        let x = a.getX(i);
        let y = a.getY(i);
        let z = a.getZ(i);
        // Angular, faceted: ridged noise along the direction, not a smooth blob.
        const facet = noise2(Math.round(x * 2.3) + k * 3, Math.round(z * 2.3 + y * 1.6), 9);
        const r = 0.7 + 0.42 * ridged(x * 1.3 + k * 7.1, y * 1.3 + z * 1.1, 3, 41 + k) + 0.3 * facet;
        x *= r * 1.15;
        z *= r;
        y = y * r * tall;
        if (y < -0.25 * tall) y = -0.25 * tall + (y + 0.25 * tall) * 0.15;
        const c = Math.cos(ang);
        const sn = Math.sin(ang);
        pos.push(cx + (x * c - z * sn) * size, cy + (y + 0.12 * tall) * size, cz + (x * sn + z * c) * size);
      }
      const ix = m.getIndex();
      if (ix) for (let i = 0; i < ix.count; i++) idx.push(base + ix.getX(i));
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  })();
  const rockMat = new THREE.ShaderMaterial({
    vertexShader: GROUND_VERTEX,
    fragmentShader: GROUND_FRAGMENT,
    uniforms: groundMat.uniforms,
    defines: { ROCK: '' },
  });
  scene.add(new THREE.Mesh(rockGeo, rockMat));

  /* the panel */
  const texture = await new THREE.TextureLoader().loadAsync(habitatUrl);
  texture.colorSpace = THREE.NoColorSpace;
  texture.anisotropy = 4;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  const panelW = 49.65;
  const panelH = (panelW * 1381) / 1955;
  const panelMat = new THREE.ShaderMaterial({
    vertexShader: PANEL_VERTEX,
    fragmentShader: PANEL_FRAGMENT,
    uniforms: { ...shared, uMap: { value: texture }, uSnowCol: { value: C.snow } },
    transparent: true,
    depthWrite: false,
  });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(panelW, panelH), panelMat);
  // The foot stands a little below the terrace's surface, so the snow takes it.
  panel.position.set(P.x, P.y - 0.5 + panelH / 2, P.z);
  panel.lookAt(panel.position.clone().add(facing));
  scene.add(panel);
  const C0 = new THREE.Vector3(P.x, P.y + panelH * 0.42, P.z);

  /* the camera: a walk up the valley, in close for the photograph, above the ranges, and back */
  const safe = (x: number, y: number, z: number): [number, number, number] => [x, Math.max(y, h(x, z) + 3.5), z];
  const from = (f: number, s: number, up: number): [number, number, number] => {
    const x = C0.x + facing.x * f + side.x * s;
    const z = C0.z + facing.z * f + side.z * s;
    return safe(x, C0.y + up, z);
  };
  const to = (s: number, up: number): [number, number, number] => [C0.x + side.x * s, C0.y + up, C0.z + side.z * s];
  const N = 8;
  const at = (i: number) => (i + 0.5) / N;
  const path: Shot[] = [
    // Subject on the right, text at the lower left.
    { at: 0, pos: from(70, -12, 8), look: to(-17, 5), fov: 42 },
    { at: at(0), pos: from(68, -11, 7.5), look: to(-17, 5), fov: 42 },
    // Text on the right: the leopard to the left, the valley opening behind it.
    { at: at(1), pos: from(66, 10, 10), look: to(15, 7), fov: 42 },
    { at: at(2), pos: from(80, 24, 20), look: to(19, 12), fov: 44 },
    { at: at(3), pos: from(60, 5, 6), look: to(14, 5), fov: 40 },
    // The photograph: close, held in the upper part of the frame over the words below.
    { at: at(4), pos: from(60, 0, 3), look: to(-9, 2), fov: 38 },
    // The ranges, from above, for the record's map.
    { at: at(5), pos: safe(70, 210, 120), look: [0, 70, -480], fov: 50 },
    { at: at(6), pos: from(78, 18, 12), look: to(20, 10), fov: 44 },
    { at: at(7), pos: from(120, 6, 30), look: to(6, 30), fov: 46 },
    { at: 1, pos: from(126, 8, 32), look: to(6, 31), fov: 47 },
  ];
  const rig = new CameraRig(camera, {
    preview: { at: 0, pos: from(76, -6, 10), look: to(-8, 5), fov: 42 },
    engage: { at: 0, pos: from(68, -10, 8), look: to(-12, 4), fov: 39 },
    path,
    sway: [3.5, 2],
    lambda: 5.2,
  });

  return {
    scene,
    camera,
    clear: '#d4e1ee',
    update(i: FieldInput) {
      const p = i.progress;
      const en = i.enter;
      rig.update({ engage: i.engage, enter: en, progress: p, pointer: i.pointer, dt: i.dt, snap: i.snap || i.reduced });

      // The hand turns the sun a little; it lowers and warms as the study closes.
      const late = seg(p, 0.84, 1) * en;
      sun.set(-0.72 + i.pointer.x * 0.12, 0.46 + i.pointer.y * 0.04, 0.32).lerp(sunWarm, late).normalize();
      sunCol.lerpVectors(C.sunCol, sunColLate, late);

      // The map is read over a quieter ground.
      const dim = Math.min(seg(p, 0.58, 0.63), 1 - seg(p, 0.74, 0.79)) * 0.25 * en;
      shared.uDim.value = Math.max(0, dim);
    },
    resize(width, height) {
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    },
    setRung() {},
    dispose() {
      texture.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        (m.material as THREE.Material | undefined)?.dispose?.();
      });
    },
  };
}
