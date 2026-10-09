import * as THREE from 'three';
import { GLSL_DISSOLVE, GLSL_GRAIN, GLSL_HASH, GLSL_NOISE } from '../../gl/chunks';
import { particleBudget } from '../../gl/particles';
import { CameraRig, type Shot } from '../cameraRig';
import { rgb } from '../gl/color';
import { makeDrift } from '../gl/drift';
import { GLSL_COVER, loadPhoto } from '../gl/photo';
import { makeHeightfield } from '../gl/terrain';
import { lerp, seg, window4 } from '../noise';
import { MOUNTAIN_MAX } from '../grounds';
import { habitatBandMetres } from '../../../components/field/studyFacts';
import type { FieldInput, FieldWorld, WorldContext } from '../types';

/**
 * FIELD STUDY 02 · ASCEND · the snow leopard, the high Himalaya.
 *
 * A study in altitude. The world is a mountain drawn the way a survey draws
 * one: dark stone under a cold light, and contour lines — isolines of height,
 * computed per pixel — that form from the valley floor upward as the study
 * begins. The scroll does not move the reader forward but up: the camera
 * climbs out of the valley, through the band of altitude the record gives for
 * the species (its contours burn brighter), into snow, and finally rises
 * straight above the range, where the same contours become a topographic
 * sheet. The photograph is found inside that band, filling in contour by
 * contour of its own light, as if surveyed.
 *
 * Honesty: the mountain is procedural; the camera's climb is schematic. The
 * band is the record's ("typically 3,000–5,000 m") mapped onto the scale the
 * page prints beside it, which says so.
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
  uniform vec3 uLight;
  uniform vec3 uStone;
  uniform vec3 uLit;
  uniform vec3 uSnowCol;
  uniform vec3 uLine;
  uniform vec3 uFogCol;
  uniform float uFog;
  uniform float uInterval;
  uniform float uContour;
  uniform float uMaxH;
  uniform float uGlow;
  uniform float uSnow;
  uniform float uSnowLine;
  uniform vec2 uBand;
  uniform float uBandOn;
  uniform float uDim;
  varying vec3 vPos;
  varying vec3 vNormal;
  varying float vDepth;
  void main() {
    vec3 n = normalize(vNormal);
    float ndl = dot(n, uLight);
    float lit = smoothstep(-0.25, 0.85, ndl);
    float rock = fbm3(vPos.xz * 0.06) * 0.5 + fbm3(vPos.xz * 0.4) * 0.5;
    vec3 col = mix(uStone * (0.75 + rock * 0.5), uLit, lit * 0.55);
    // Snow lies on the gentler slopes above the snow line.
    float snow = smoothstep(uSnowLine - 6.0, uSnowLine + 6.0, vPos.y + rock * 8.0) * smoothstep(0.55, 0.8, n.y) * uSnow;
    col = mix(col, uSnowCol * (0.55 + 0.5 * lit), snow);

    // Contours: isolines of height, drawn a constant width on screen.
    float hv = vPos.y / uInterval;
    float d = abs(fract(hv - 0.5) - 0.5) / max(fwidth(hv), 1e-4);
    float line = 1.0 - smoothstep(0.0, 1.3, d);
    // Every fifth is an index contour, a little heavier.
    float hv5 = vPos.y / (uInterval * 5.0);
    float d5 = abs(fract(hv5 - 0.5) - 0.5) / max(fwidth(hv5), 1e-4);
    line = max(line, 1.0 - smoothstep(0.0, 2.0, d5));
    // No contour on the valley's flat floor, where the mesh's own facets would show through the isoline.
    line *= smoothstep(2.0, 4.5, vPos.y);
    // They form from the valley floor up.
    float formed = 1.0 - smoothstep(uContour * uMaxH - 4.0, uContour * uMaxH + 2.0, vPos.y);
    float band = step(uBand.x, vPos.y) * step(vPos.y, uBand.y) * uBandOn;
    float strength = line * formed * (0.32 + 0.35 * uGlow + 0.45 * band) * (1.0 - snow * 0.55);
    col = mix(col, uLine * (1.0 + band * 0.25), clamp(strength, 0.0, 1.0));
    // The band itself is faintly washed, so it reads as a zone between its contours.
    col += uLine * band * 0.035;

    float fog = 1.0 - exp(-vDepth * uFog);
    // Cold air pools in the valleys.
    fog = clamp(fog + (1.0 - smoothstep(0.0, 26.0, vPos.y)) * 0.16, 0.0, 1.0);
    col = mix(col, uFogCol, fog);
    col += paperGrain(gl_FragCoord.xy, 0.012);
    col = mix(col, col * 0.55, uDim);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const SKY_FRAGMENT = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform float uDim;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    vec3 col = mix(uHorizon, uTop, smoothstep(-0.05, 0.5, d.y));
    col = mix(col, col * 0.55, uDim);
    gl_FragColor = vec4(col, 1.0);
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
  uniform vec3 uLine;
  uniform vec3 uFogCol;
  varying vec2 vUv;
  void main() {
    vec2 uv = coverUv(vUv, uPlaneAspect, uAspect);
    vec3 base = texture2D(uMap, uv).rgb;
    float l = luma(base);
    uv += uPointer * (l - 0.5) * 0.01;
    vec3 col = texture2D(uMap, uv).rgb;
    // Surveyed into view: the print fills in by bands of its own light, darkest first, like contours being inked.
    float bands = floor(l * 7.0) / 7.0;
    float field = bands * 0.8 + (1.0 - vUv.y) * 0.2;
    float m = inkEdge(field, uReveal, 0.03);
    float l7 = l * 7.0;
    float iso = 1.0 - smoothstep(0.0, 1.4, abs(fract(l7 - 0.5) - 0.5) / max(fwidth(l7), 1e-4));
    // The edges of the print give way to the mountain's air.
    vec2 e = smoothstep(vec2(0.0), vec2(0.08), vUv) * smoothstep(vec2(0.0), vec2(0.08), 1.0 - vUv);
    float edge = e.x * e.y;
    col = mix(col, uLine, iso * (1.0 - smoothstep(0.75, 1.0, uReveal)) * 0.55 * m);
    col = mix(uFogCol, col, edge);
    gl_FragColor = vec4(col, m * edge);
  }
`;

const PLANE_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const MAX_H = MOUNTAIN_MAX;

export async function createHimalaya({ species, tier }: WorldContext): Promise<FieldWorld> {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, 1, 0.5, 2400);
  const light = new THREE.Vector3(0.55, 0.62, 0.25).normalize();
  const C = {
    stone: rgb('#1a2126'),
    lit: rgb('#56656d'),
    snow: rgb('#dfe7eb'),
    line: rgb('#a9c6d3'),
    fog: rgb('#121a1f'),
  };

  // The record's band, placed on the schematic scale the page prints (2,000 m below it to 1,500 m above it).
  const metres = habitatBandMetres(species) ?? [3000, 5000];
  const lo = Math.max(0, metres[0] - 2000);
  const hi = metres[1] + 1500;
  const toH = (m: number) => ((m - lo) / (hi - lo)) * MAX_H;
  const band = new THREE.Vector2(toH(metres[0]), toH(metres[1]));

  const skyMat = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: SKY_FRAGMENT,
    uniforms: { uTop: { value: rgb('#0b1013') }, uHorizon: { value: rgb('#1d272d') }, uDim: { value: 0 } },
    side: THREE.BackSide,
    depthWrite: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 16), skyMat);
  sky.renderOrder = -10;
  scene.add(sky);

  const res = { high: 320, balanced: 220, low: 150 }[tier];
  const ground = await makeHeightfield('mountains', 720, 720, res, res, [0, -240]);
  const h = ground.height;
  const groundMat = new THREE.ShaderMaterial({
    vertexShader: GROUND_VERTEX,
    fragmentShader: GROUND_FRAGMENT,
    uniforms: {
      uLight: { value: light },
      uStone: { value: C.stone },
      uLit: { value: C.lit },
      uSnowCol: { value: C.snow },
      uLine: { value: C.line },
      uFogCol: { value: C.fog },
      uFog: { value: 0.0021 },
      uInterval: { value: 3.2 },
      uContour: { value: 0.3 },
      uMaxH: { value: MAX_H },
      uGlow: { value: 0 },
      uSnow: { value: 0 },
      uSnowLine: { value: band.y },
      uBand: { value: band },
      uBandOn: { value: 0 },
      uDim: { value: 0 },
    },
  });
  scene.add(new THREE.Mesh(ground.geometry, groundMat));

  const snowfall = makeDrift({
    count: particleBudget(1300),
    min: [-160, 0, -340],
    max: [160, 220, 110],
    wind: [1.6, -3.2, -0.6],
    color: '#e6edf0',
    size: [0.5, 2.1],
    alpha: [0.1, 0.55],
    sway: 0.8,
    scale: 42,
    seed: 13,
  });
  scene.add(snowfall.points);

  /* the photograph, set into the band, on a ridge's face */
  const photo = await loadPhoto(species, tier);
  const photoW = 44;
  const photoH = photoW / (photo?.aspect ?? 4 / 3);
  const photoMat = new THREE.ShaderMaterial({
    vertexShader: PLANE_VERTEX,
    fragmentShader: PHOTO_FRAGMENT,
    uniforms: {
      uMap: { value: photo?.texture ?? null },
      uAspect: { value: photo?.aspect ?? 4 / 3 },
      uPlaneAspect: { value: photoW / photoH },
      uReveal: { value: 0 },
      uPointer: { value: new THREE.Vector2() },
      uLine: { value: C.line },
      uFogCol: { value: C.fog },
    },
    transparent: true,
    depthWrite: false,
  });
  const photoPlane = new THREE.Mesh(new THREE.PlaneGeometry(photoW, photoH), photoMat);
  const facing = new THREE.Vector3(0.25, 0.08, 1).normalize();
  const photoAt = new THREE.Vector3(-12, (band.x + band.y) / 2 + 6, -150);
  photoPlane.position.copy(photoAt);
  photoPlane.lookAt(photoAt.clone().add(facing));
  photoPlane.visible = false;
  scene.add(photoPlane);

  /* the camera: up, not forward */
  const ground3 = (x: number, z: number, lift: number): [number, number, number] => [x, h(x, z) + lift, z];
  const N = 8;
  const at = (i: number) => (i + 0.5) / N;
  const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), facing).normalize();
  const photoCam = photoAt.clone().addScaledVector(facing, 66).addScaledVector(side, -17);
  const photoLook = photoAt.clone().addScaledVector(side, -17);
  const path: Shot[] = [
    { at: 0, pos: ground3(4, 70, 6), look: [0, 26, -150], fov: 50 },
    { at: at(0), pos: ground3(4, 64, 6), look: [0, 28, -150], fov: 50 },
    { at: at(1), pos: ground3(14, 34, 12), look: [-8, 34, -170], fov: 46 },
    { at: at(2), pos: [6, band.x + 6, -30], look: [-6, band.x + 10, -220], fov: 46 },
    { at: at(3), pos: [24, band.y + 4, -70], look: [-20, band.x + 8, -240], fov: 44 },
    { at: at(4), pos: [photoCam.x, photoCam.y, photoCam.z], look: [photoLook.x, photoLook.y, photoLook.z], fov: 40 },
    { at: at(5), pos: [0, 520, -150], look: [0, 0, -232], fov: 42 },
    { at: at(6), pos: [-60, 210, -20], look: [0, 40, -240], fov: 44 },
    { at: at(7), pos: ground3(0, 80, 8), look: [0, 24, -120], fov: 48 },
    { at: 1, pos: ground3(0, 88, 8), look: [0, 22, -110], fov: 50 },
  ];
  const rig = new CameraRig(camera, {
    preview: { at: 0, pos: ground3(0, 76, 10), look: [0, 30, -170], fov: 44 },
    engage: { at: 0, pos: ground3(0, 66, 15), look: [0, 36, -170], fov: 41 },
    path,
    sway: [6, 3],
    lambda: 4.8,
  });

  let rung = 0;

  return {
    scene,
    camera,
    clear: '#121a1f',
    update(i: FieldInput) {
      const p = i.progress;
      const e = i.enter;
      rig.update({ engage: i.engage, enter: e, progress: p, pointer: i.pointer, dt: i.dt, snap: i.snap || i.reduced });
      const u = groundMat.uniforms;
      light.set(0.55 + i.pointer.x * 0.25, 0.62 + i.pointer.y * 0.1, 0.25).normalize();

      // Contours form upward: a few in the preview, more as the hand arrives, all of them as the study begins.
      const preview = 0.26 + 0.3 * i.engage;
      const study = lerp(0.3, 1.05, seg(p, 0.1, 0.32));
      u.uContour.value = lerp(preview, study, e);
      u.uGlow.value = Math.max(i.engage * (1 - e), window4(p, 0.12, 0.2, 0.3, 0.4) * e, seg(p, 0.66, 0.74) * e * 0.8);
      u.uBandOn.value = Math.max(window4(p, 0.24, 0.32, 0.62, 0.7), window4(p, 0.68, 0.74, 0.86, 0.92)) * e;
      u.uSnow.value = lerp(0.25, 1, seg(p, 0.36, 0.5) * e);
      const reveal = window4(p, 0.5, 0.56, 0.62, 0.665) * e;
      photoMat.uniforms.uReveal.value = reveal;
      photoMat.uniforms.uPointer.value.set(i.pointer.x, i.pointer.y);
      photoPlane.visible = reveal > 0.001 && Boolean(photo);
      const dim = window4(p, 0.74, 0.78, 0.9, 0.94) * 0.35 * e;
      u.uDim.value = dim;
      skyMat.uniforms.uDim.value = dim;
      const t = i.reduced ? 0 : i.time;
      snowfall.material.uniforms.uTime.value = t;
      snowfall.material.uniforms.uOpacity.value = rung >= 2 ? 0 : 0.85;
    },
    resize(width, height, dpr) {
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      snowfall.material.uniforms.uPixelRatio.value = dpr;
    },
    setRung(r) {
      rung = r;
      snowfall.points.visible = r < 2;
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
