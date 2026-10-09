import * as THREE from 'three';
import { GLSL_GRAIN, GLSL_HASH, GLSL_NOISE } from '../../gl/chunks';
import { particleBudget, seededRandom } from '../../gl/particles';
import { damp } from '../../../interaction/spring';
import { CameraRig, type Shot } from '../cameraRig';
import { rgb } from '../gl/color';
import { makeDrift } from '../gl/drift';
import { frameAround, makeMapLines, makeRings } from '../gl/mapLines';
import { GLSL_COVER, loadPhoto } from '../gl/photo';
import { lerp, seg, window4 } from '../noise';
import type { FieldInput, FieldWorld, WorldContext } from '../types';

/**
 * FIELD STUDY 04 · REVEAL · the Bengal tiger, the central Indian forests.
 *
 * The cinematic study, and the darkest. A forest at night: trunks in depth,
 * almost no light, the tiger's photograph somewhere among them and not yet
 * seen. The hand carries the only light — a lantern that finds bark, a little
 * moss, the motes in the air, and, if it is brought to the right place, the
 * animal. Scrolled, the camera walks in between the trunks until the
 * photograph is found (PRESENCE). For the evidence the light steadies. Then
 * the camera rises above the canopy and the forest collapses onto the map:
 * every trunk travels to one of the reserves the record names and settles
 * there as a mark, so the trees become the protected network (PROTECTION),
 * which holds for the 2022 estimate the record gives (ESTIMATE). The camera
 * comes back down into the forest, and the light goes out as the study ends.
 *
 * Honesty: the forest is an abstract stand of trunks, not a model of any
 * place; reserves are placed at their anchor coordinates and drawn as marks,
 * not boundaries. The record gives one national estimate, so no trend.
 */

const TRUNK_VERTEX = /* glsl */ `
  attribute vec3 aMap;
  attribute float aKeep;
  attribute float aSeed;
  uniform float uMap;
  uniform float uTime;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vSeed;
  varying float vKeep;
  void main() {
    vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vec3 base = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    // The forest collapses onto the map: each trunk travels to its reserve and lies down there as a mark.
    float k = smoothstep(aSeed * 0.35, aSeed * 0.35 + 0.65, uMap);
    vec3 local = w.xyz - base;
    local.y *= mix(1.0, 0.004, k);
    // Reserve trunks keep a mark's width; the rest shrink to dots around them.
    local.xz *= mix(1.0, mix(0.08, 0.75, aKeep), k);
    w.xyz = mix(base, aMap, k) + local;
    vWorld = w.xyz;
    vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
    vSeed = aSeed;
    vKeep = aKeep;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const TRUNK_FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  uniform vec3 uLight;
  uniform float uLightAmt;
  uniform float uRadius;
  uniform vec3 uBark;
  uniform vec3 uMoss;
  uniform vec3 uWarm;
  uniform vec3 uMark;
  uniform float uMap;
  uniform vec3 uCam;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vSeed;
  varying float vKeep;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 L = uLight - vWorld;
    float dist = length(L);
    float fall = uLightAmt / (1.0 + pow(dist / uRadius, 2.0) * 2.4);
    float ndl = max(dot(n, L / max(dist, 1e-3)), 0.0);
    float grain = valueNoise(vec2(vWorld.y * 1.6, atan(n.z, n.x) * 3.0 + vSeed * 40.0));
    vec3 bark = uBark * (0.7 + grain * 0.6);
    // Moss on the side away from the lantern's usual quarter.
    bark = mix(bark, uMoss, smoothstep(0.2, 0.9, n.x * 0.5 + 0.5) * 0.45 * (0.6 + grain * 0.4));
    vec3 col = bark * 0.035 + bark * uWarm * fall * (0.3 + ndl * 2.4);
    // Depth: the far trunks sink into the dark.
    float far = smoothstep(18.0, 110.0, distance(uCam, vWorld));
    col *= 1.0 - far * 0.85;
    // On the map: the reserves' marks.
    col = mix(col, uMark * mix(0.12, 1.0, vKeep), smoothstep(0.55, 1.0, uMap));
    gl_FragColor = vec4(col, 1.0);
  }
`;

const GROUND_FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  ${GLSL_GRAIN}
  uniform vec3 uLight;
  uniform float uLightAmt;
  uniform float uRadius;
  uniform vec3 uLitter;
  uniform vec3 uWarm;
  uniform vec3 uNight;
  uniform float uMap;
  varying vec3 vWorld;
  void main() {
    float dist = length(uLight - vWorld);
    float fall = uLightAmt / (1.0 + pow(dist / uRadius, 2.0) * 2.4);
    float litter = fbm3(vWorld.xz * 0.35) * 0.6 + fbm3(vWorld.xz * 2.2) * 0.4;
    vec3 col = uLitter * (0.4 + litter) * (0.03 + fall * uWarm * 0.9);
    col = mix(col, uNight, uMap * 0.9);
    col += paperGrain(gl_FragCoord.xy, 0.008);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const PHOTO_FRAGMENT = /* glsl */ `
  ${GLSL_COVER}
  uniform sampler2D uMap;
  uniform float uAspect;
  uniform float uPlaneAspect;
  uniform vec3 uLight;
  uniform float uLightAmt;
  uniform float uRadius;
  uniform float uPresence;
  uniform float uOpacity;
  uniform vec2 uPointer;
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vec2 uv = coverUv(vUv, uPlaneAspect, uAspect);
    vec3 base = texture2D(uMap, uv).rgb;
    uv += uPointer * (luma(base) - 0.5) * 0.008;
    vec3 col = texture2D(uMap, uv).rgb;
    float dist = length(uLight - vWorld);
    // The lantern finds it; presence opens it fully.
    float found = uLightAmt / (1.0 + pow(dist / (uRadius * 1.15), 2.0) * 2.0);
    float shown = clamp(found * 1.4 + uPresence, 0.0, 1.0);
    // No hard print edge in the dark: the picture thins out towards its sides like the light does.
    vec2 e = smoothstep(vec2(0.0), vec2(0.3), vUv) * smoothstep(vec2(0.0), vec2(0.3), 1.0 - vUv);
    float edge = pow(e.x * e.y, 0.7);
    col *= shown;
    gl_FragColor = vec4(col, edge * uOpacity * smoothstep(0.0, 0.08, shown));
  }
`;

const WORLD_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const HALO_FRAGMENT = /* glsl */ `
  uniform vec3 uWarm;
  uniform float uOpacity;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = pow(max(1.0 - d, 0.0), 2.6);
    gl_FragColor = vec4(uWarm, a * uOpacity);
  }
`;

export async function createForest({ species, tier }: WorldContext): Promise<FieldWorld> {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.3, 1200);
  const C = {
    bark: rgb('#3a3024'),
    moss: rgb('#4c6a50'),
    warm: rgb('#f2d9a8'),
    litter: rgb('#3b3224'),
    night: rgb('#060907'),
    mark: rgb('#86a593'),
  };
  const light = new THREE.Vector3(0, 7, -20);
  const shared = {
    uLight: { value: light },
    uLightAmt: { value: 1 },
    uRadius: { value: 13 },
    uWarm: { value: C.warm },
  };

  /* the reserves the record names, and the map they sit on */
  const reserves = species.distributionPoints;
  const frame = frameAround(reserves, 230, 0.08);
  const MAP_Z = -45;
  const onMap = reserves.map((p) => {
    const [x, z] = frame.toPlane(p.lng, p.lat);
    return new THREE.Vector3(x, 0.05, z + MAP_Z);
  });

  /* the trunks */
  const count = { high: 230, balanced: 160, low: 110 }[tier];
  const geo = new THREE.CylinderGeometry(0.8, 1, 1, tier === 'low' ? 6 : 9, 1, true);
  geo.translate(0, 0.5, 0);
  const aMap = new Float32Array(count * 3);
  const aKeep = new Float32Array(count);
  const aSeed = new Float32Array(count);
  const trunkMat = new THREE.ShaderMaterial({
    vertexShader: TRUNK_VERTEX,
    fragmentShader: TRUNK_FRAGMENT,
    uniforms: {
      ...shared,
      uBark: { value: C.bark },
      uMoss: { value: C.moss },
      uMark: { value: C.mark },
      uMap: { value: 0 },
      uTime: { value: 0 },
      uCam: { value: new THREE.Vector3() },
    },
    side: THREE.DoubleSide,
  });
  const trunks = new THREE.InstancedMesh(geo, trunkMat, count);
  const rand = seededRandom(41);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  for (let i = 0; i < count; i++) {
    let x = 0;
    let z = 0;
    // A clear way in to where the photograph stands, narrowing as it goes.
    for (let tries = 0; tries < 20; tries++) {
      x = (rand() - 0.5) * 170;
      z = 34 - rand() * 150;
      const lane = z > -66 ? 4.5 + (z + 66) * 0.04 : 0;
      if (Math.abs(x) > lane || rand() < 0.06) break;
    }
    const r = 0.35 + Math.pow(rand(), 2) * 1.3;
    e.set((rand() - 0.5) * 0.06, rand() * Math.PI, (rand() - 0.5) * 0.06);
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(r, 70, r));
    trunks.setMatrixAt(i, m);
    // Reserves first; every other trunk goes to the reserve nearest it on the sheet.
    const k = i < onMap.length ? i : Math.floor(rand() * onMap.length);
    const jitter = i < onMap.length ? 0 : 1;
    aMap.set([onMap[k].x + (rand() - 0.5) * 4 * jitter, 0, onMap[k].z + (rand() - 0.5) * 4 * jitter], i * 3);
    aKeep[i] = i < onMap.length ? 1 : 0;
    aSeed[i] = rand();
  }
  geo.setAttribute('aMap', new THREE.InstancedBufferAttribute(aMap, 3));
  geo.setAttribute('aKeep', new THREE.InstancedBufferAttribute(aKeep, 1));
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1));
  trunks.frustumCulled = false;
  scene.add(trunks);

  /* the floor */
  const groundMat = new THREE.ShaderMaterial({
    vertexShader: WORLD_VERTEX,
    fragmentShader: GROUND_FRAGMENT,
    uniforms: { ...shared, uLitter: { value: C.litter }, uNight: { value: C.night }, uMap: { value: 0 } },
  });
  const floorGeo = new THREE.PlaneGeometry(600, 600);
  floorGeo.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(floorGeo, groundMat);
  floor.position.z = -60;
  scene.add(floor);

  /* the photograph, among the trunks */
  const photo = await loadPhoto(species, tier);
  const photoW = 30;
  const photoH = photoW / (photo?.aspect ?? 1.5);
  const photoMat = new THREE.ShaderMaterial({
    vertexShader: WORLD_VERTEX,
    fragmentShader: PHOTO_FRAGMENT,
    uniforms: {
      ...shared,
      uMap: { value: photo?.texture ?? null },
      uAspect: { value: photo?.aspect ?? 1.5 },
      uPlaneAspect: { value: photoW / photoH },
      uPresence: { value: 0 },
      uOpacity: { value: 1 },
      uPointer: { value: new THREE.Vector2() },
    },
    transparent: true,
    depthWrite: false,
  });
  const photoPlane = new THREE.Mesh(new THREE.PlaneGeometry(photoW, photoH), photoMat);
  photoPlane.position.set(1, photoH / 2 + 0.2, -64);
  photoPlane.visible = Boolean(photo);
  scene.add(photoPlane);

  /* motes in the light, and the light's own glow */
  const motes = makeDrift({
    count: particleBudget(700),
    min: [-40, 0, -80],
    max: [40, 22, 40],
    wind: [0.25, 0.35, 0.1],
    color: '#f2d9a8',
    size: [0.3, 1.1],
    alpha: [0.2, 0.9],
    sway: 0.9,
    scale: 36,
    seed: 17,
  });
  motes.material.uniforms.uLightRadius.value = 15;
  scene.add(motes.points);
  const haloGeo = new THREE.BufferGeometry();
  haloGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
  const haloMat = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      uniform float uSize;
      uniform float uPixelRatio;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * uPixelRatio * 40.0 / max(-mv.z, 1.0);
      }
    `,
    fragmentShader: HALO_FRAGMENT,
    uniforms: { uWarm: { value: C.warm }, uOpacity: { value: 0.09 }, uSize: { value: 30 }, uPixelRatio: { value: 1 } },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });
  const halo = new THREE.Points(haloGeo, haloMat);
  halo.frustumCulled = false;
  scene.add(halo);

  const map = await makeMapLines(
    { scale: frame.scale, toPlane: (lng, lat) => {
      const [x, z] = frame.toPlane(lng, lat);
      return [x, z + MAP_Z];
    } },
    0.04,
    { color: '#3d5546', recordedColor: '#86a593', recorded: species.states },
  );
  if (map) scene.add(map.lines);
  const rings = makeRings(
    onMap.map((p) => [p.x, 0.1, p.z]),
    '#b9d3c1',
  );
  rings.material.uniforms.uSize.value = 26;
  scene.add(rings.points);

  /* the camera */
  const N = 7;
  const at = (i: number) => (i + 0.5) / N;
  const path: Shot[] = [
    { at: 0, pos: [0, 7, 40], look: [0, 7, -40], fov: 40 },
    { at: at(0), pos: [0, 7, 36], look: [0, 7, -40], fov: 40 },
    { at: at(1), pos: [2, 6.2, -6], look: [1, 7, -64], fov: 40 },
    { at: at(2), pos: [8, 9, 6], look: [-7, 11, -60], fov: 42 },
    { at: at(3), pos: [42, 250, MAP_Z + 22], look: [42, 0, MAP_Z], fov: 46 },
    { at: at(4), pos: [-46, 270, MAP_Z + 20], look: [-46, 0, MAP_Z], fov: 47 },
    { at: at(5), pos: [3, 6.4, -8], look: [1, 7, -64], fov: 38 },
    { at: at(6), pos: [0, 8, 46], look: [0, 7, -40], fov: 42 },
    { at: 1, pos: [0, 8, 50], look: [0, 7, -40], fov: 42 },
  ];
  const rig = new CameraRig(camera, {
    preview: { at: 0, pos: [0, 7, 46], look: [0, 7.5, -40], fov: 38 },
    engage: { at: 0, pos: [0.5, 6.8, 38], look: [0.5, 7.2, -40], fov: 36 },
    path,
    sway: [3.5, 2],
    lambda: 4.2,
  });

  const ndc = new THREE.Vector2();
  const ray = new THREE.Raycaster();
  const hit = new THREE.Vector3();
  const wall = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const toward = new THREE.Vector3();
  const lightTarget = new THREE.Vector3(0, 7, -30);
  let rung = 0;

  return {
    scene,
    camera,
    clear: '#030504',
    update(i: FieldInput) {
      const p = i.progress;
      const en = i.enter;
      rig.update({ engage: i.engage, enter: en, progress: p, pointer: i.pointer, dt: i.dt, snap: i.snap || i.reduced });
      trunkMat.uniforms.uCam.value.copy(camera.position);

      // The lantern: where the hand points, a little way in front of whatever it finds.
      const mapOn = window4(p, 0.405, 0.47, 0.67, 0.74) * en;
      const steady = window4(p, 0.27, 0.32, 0.41, 0.45) * en;
      const handLight = !i.reduced && (Math.abs(i.pointerRaw.x) > 0 || Math.abs(i.pointerRaw.y) > 0) ? 1 : 0;
      const focusZ = camera.position.z - 34;
      wall.constant = -focusZ;
      if (handLight && !steady) {
        ndc.set(i.pointerRaw.x, i.pointerRaw.y);
        ray.setFromCamera(ndc, camera);
        if (ray.ray.intersectPlane(wall, hit)) {
          toward.subVectors(camera.position, hit).normalize();
          lightTarget.copy(hit).addScaledVector(toward, 6);
          lightTarget.y = THREE.MathUtils.clamp(lightTarget.y, 1.5, 18);
        }
      } else {
        // No hand: the lantern hangs ahead and drifts a little, as a held light does.
        const t = i.reduced ? 0 : i.time;
        lightTarget.set(camera.position.x + 1 + Math.sin(t * 0.31) * 5, 7.5 + Math.sin(t * 0.53) * 1.2, camera.position.z - 30);
      }
      const k = i.reduced || i.snap ? 1e3 : 7;
      light.set(damp(light.x, lightTarget.x, k, i.dt), damp(light.y, lightTarget.y, k, i.dt), damp(light.z, lightTarget.z, k, i.dt));

      // Preview: a small light; the hand widens it. The study's end puts it out.
      const radius = lerp(9 + i.engage * 5, lerp(11, 17, seg(p, 0.1, 0.24)) * (1 + steady * 0.4), en);
      shared.uRadius.value = radius;
      shared.uLightAmt.value = lerp(0.95 + i.engage * 0.3, 1 - 0.75 * seg(p, 0.88, 0.99), en) * (1 - mapOn * 0.7);
      motes.material.uniforms.uLight.value.copy(light);
      motes.material.uniforms.uLightRadius.value = radius * 1.3;
      halo.position.copy(light);
      haloMat.uniforms.uOpacity.value = 0.1 * shared.uLightAmt.value * (1 - mapOn);

      // The animal: found by the light, then given to the reader.
      const presence = Math.max(window4(p, 0.15, 0.25, 0.34, 0.42), window4(p, 0.73, 0.8, 0.92, 0.98)) * en;
      photoMat.uniforms.uPresence.value = presence * 0.9;
      photoMat.uniforms.uOpacity.value = 1 - mapOn;
      photoMat.uniforms.uPointer.value.set(i.pointer.x, i.pointer.y);
      photoPlane.visible = Boolean(photo) && mapOn < 0.99;

      // The forest becomes the map.
      trunkMat.uniforms.uMap.value = mapOn;
      groundMat.uniforms.uMap.value = mapOn;
      if (map) map.material.uniforms.uOpacity.value = seg(mapOn, 0.4, 1) * 0.95;
      rings.material.uniforms.uOpacity.value = seg(mapOn, 0.7, 1);
      // A slow pulse on the reserves while the estimate is read.
      rings.material.uniforms.uSize.value = 24 + 6 * window4(p, 0.58, 0.62, 0.68, 0.72) * (i.reduced ? 0 : 0.5 + 0.5 * Math.sin(i.time * 2));

      motes.material.uniforms.uTime.value = i.reduced ? 0 : i.time;
      motes.material.uniforms.uOpacity.value = rung >= 2 ? 0 : 1 - mapOn;
    },
    resize(width, height, dpr) {
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      motes.material.uniforms.uPixelRatio.value = dpr;
      haloMat.uniforms.uPixelRatio.value = dpr;
      rings.material.uniforms.uPixelRatio.value = dpr;
    },
    setRung(r) {
      rung = r;
      motes.points.visible = r < 2;
      halo.visible = r < 1;
    },
    dispose() {
      map?.dispose();
      haloGeo.dispose();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose();
        (mesh.material as THREE.Material | undefined)?.dispose?.();
      });
    },
  };
}
