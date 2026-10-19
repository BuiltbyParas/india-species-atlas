import * as THREE from 'three';
import { GLSL_HASH, GLSL_NOISE } from '../../gl/chunks';
import { CameraRig, type Shot } from '../cameraRig';
import { lin } from '../gl/color';
import { GLSL_AIR, GLSL_FIELD_SUN, airUniforms, skyDome } from '../gl/air';
import { grade } from '../gl/look';
import { GLSL_SUNLIGHT, Sunlight, gridFromMesh } from '../gl/sunlight';
import { makeHeightfield } from '../gl/terrain';
import { plateVeil } from '../plateVeil';
import { modelFor } from '../gl/modelSubject';
import { LEDGE } from '../grounds';
import { lerp, noise2, seg } from '../noise';
import habitatUrl from '../../../assets/field/snow-leopard-cutout.webp';
import type { FieldInput, FieldWorld, WorldContext } from '../types';

/**
 * FIELD STUDY 02 · the snow leopard, the high Himalaya, at first light.
 *
 * The sun has just cleared the ranges to the east. It is a few degrees up, so it reaches the summits and the
 * upper faces and nothing else: the valley and the leopard's terrace are still in the cold blue of the sky's light,
 * and every ridge throws its shadow across the snowfields beside it. As the study goes on the sun climbs, the
 * shadows shorten, and at the end the light reaches the terrace. This is the homepage's entrance — light arriving
 * on the summits first — seen from the ground.
 *
 * The light is the homepage's model (components/home/heroLight.ts) carried into the field: the sun's visibility is
 * worked out over the terrain's own grid (gl/sunlight.ts), so the shadows are cast by the mountains drawn and move
 * when the hand turns the sun; the sky's light is shut out of gullies the same way. Air, film and tone curve are
 * shared with the other four studies (gl/air.ts, gl/look.ts).
 *
 * The leopard is the record's own photograph, whole, tail included, cut out along its outline with the ledge it
 * stands on, standing on the terrace at the foot of a crag. It takes the terrace's light: in shadow it is lit by the
 * sky, and when the sun arrives it is lit by that too.
 *
 * Honesty: the mountains are drawn, an impression of high Himalayan country and not a terrain model of any valley;
 * the hour is chosen, not recorded. The leopard is a photograph (Irbis1983, public domain), cut out and toned to
 * the drawn light, not a drawn animal.
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
  uniform vec3 uFill;
  uniform vec3 uRockA;
  uniform vec3 uRockB;
  uniform vec3 uRockC;
  uniform vec3 uSnowCol;
  uniform vec3 uPanel;
  uniform float uSnowLine;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vDepth;
  void main() {
    vec3 n0 = normalize(vNormal);
    vec2 p = vWorld.xz;
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
    float strata = sin((vWorld.y + warp) * 0.42) * 0.5 + 0.5;
    float strata2 = sin((vWorld.y * 1.7 + warp * 2.0) * 0.5) * 0.5 + 0.5;
    float steep = smoothstep(0.35, 0.75, 1.0 - n0.y);
    float strataFade = 1.0 - smoothstep(300.0, 1400.0, vDepth);
    rock *= 0.75 + 0.45 * valueNoise(p * 0.4) + steep * strataFade * (0.3 * (strata - 0.5) + 0.18 * (strata2 - 0.5));
    // Couloirs: on steep faces, streaks down the fall line — the gullies that carry snow and scree.
    vec2 contour = normalize(vec2(-n0.z, n0.x) + 1e-4);
    float along = dot(p, contour);
    float streak = fbm3(vec2(along * 0.045, vWorld.y * 0.006) + 3.0);
    float couloir = smoothstep(0.52, 0.7, streak) * steep;
    n = normalize(n + vec3(contour.x, 0.0, contour.y) * (streak - 0.5) * 0.5 * steep);

    // Snow lies on the gentle slopes and the ledges and slides off the steep faces.
    // Far off, the patchwork of small drifts would alias into camouflage: there the snow follows slope and height.
    float farF = smoothstep(350.0, 1500.0, vDepth);
    float alt = smoothstep(uSnowLine - 40.0, uSnowLine + 150.0, vWorld.y + (valueNoise(p * 0.015) - 0.5) * 110.0);
    float gentle = smoothstep(0.42, 0.78, n0.y + (valueNoise(p * 0.08) - 0.5) * 0.34 * (1.0 - farF));
    float snow = smoothstep(0.3, 0.62, gentle * (0.1 + 0.85 * alt) + (valueNoise(p * 0.13 + 5.0) - 0.5) * 0.36 * (1.0 - 0.75 * farF));
    // High up, snow holds in the couloirs even where the face is steep.
    snow = max(snow, couloir * alt * 0.85);
    // On the leopard's terrace the snow is whole, and the rock is the photograph's tan.
    float near3 = 1.0 - smoothstep(34.0, 125.0, distance(vWorld, uPanel));
    snow = max(snow, near3 * smoothstep(0.3, 0.6, n0.y));
    rock = mix(rock, vec3(0.3, 0.24, 0.17), near3 * 0.5);
#ifdef ROCK
    // A boulder: snow only on the faces that look up; its flanks are bare, dark rock.
    snow = smoothstep(0.6, 0.9, n0.y + (valueNoise(p * 0.8) - 0.5) * 0.3) * 0.9;
    rock = mix(rock, vec3(0.13, 0.11, 0.09), 0.5) * (0.8 + 0.4 * valueNoise(vWorld.xy * 0.9 + vWorld.zy * 0.9));
#endif
    vec3 albedo = mix(rock, uSnowCol, snow);
    // Near the camera the snow is wind-cut: low ripples across the wind, which a low light picks out.
    float close = 1.0 - smoothstep(25.0, 140.0, vDepth);
    float rip = sin(dot(p, vec2(0.92, 0.38)) * 1.7 + fbm3(p * 0.12) * 6.0);
    n = normalize(n + vec3(0.92, 0.0, 0.38) * rip * 0.09 * snow * close);

    // One sun, its shadows cast by the ground itself; the sky's light shut out of the gullies.
    float sun = sunGround(p);
    float ndl = dot(n, uSunDir);
    // Snow scatters a little light past the terminator.
    float wrap = mix(max(ndl, 0.0), clamp((ndl + 0.18) / 1.18, 0.0, 1.0), snow);
    float sky = skyGround(p);
    vec3 light = uSunCol * wrap * sun;
    light += uSkyCol * sky * (0.62 + 0.38 * n.y);
    // A dim fill from the far side of the sky, so shaded faces keep their form.
    light += uFill * max(dot(n, normalize(vec3(-uSunDir.x, 0.6, -uSunDir.z))), 0.0) * sky;
    vec3 col = albedo * light;

    // Snow lit by a low sun sparkles where the eye catches it.
    vec2 g = floor(p * 7.0);
    float glint = step(0.9965, hash12(g + floor(vWorld.y * 3.0))) * snow * sun * near * smoothstep(0.1, 0.5, ndl);
    col += uSunCol * glint * 2.4;

    col = applyAir(col, vWorld);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const PANEL_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

/**
 * The habitat panel: the record's photograph, lit by the terrace's light and given to the snow at its edges.
 * The photograph was taken in soft, even light; here it receives the light where it stands — the sky's, and
 * the sun's when the sun reaches it — as a surface turned half to each.
 */
const PANEL_FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  ${GLSL_FIELD_SUN}
  ${GLSL_AIR}
  ${GLSL_SUNLIGHT}
  uniform sampler2D uMap;
  uniform vec3 uSkyCol;
  uniform vec3 uSnowCol;
  uniform float uPhotoGain;
  uniform float uVeil;
  uniform vec3 uSubject;
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vec4 photo = texture2D(uMap, vUv);
    // One light for the whole animal, read from the ground it stands on (so the photograph and the terrace around
    // it are always in the same light): it is a photograph, not a relief.
    float sun = sunGround(uSubject.xz);
    // Lit as the snow it stands in is lit, so the two never part when the sun reaches the terrace.
    vec3 light = uSkyCol * 0.95 + uSunCol * sun * (max(uSunDir.y, 0.0) * 0.95 + 0.04);
    // The eye adapts to the blue of the shade; the camera that took the picture did too. Half of the shade's
    // colour is given to the photograph, so the fur keeps its own.
    float level = dot(light, vec3(0.2126, 0.7152, 0.0722));
    vec3 col = photo.rgb * mix(light, vec3(level), 0.45) * uPhotoGain;
    // The photograph's snow (the ledge under the paws) becomes the terrace's snow in the terrace's light — wholly
    // at the ledge's soft edge, half inside it — so the ledge has no brighter margin of its own. The cut along the
    // fur is the animal's own edge (scripts/assets/leopard-matte.py) and keeps the fur's colour: no snow is mixed
    // into it.
    float pl = dot(photo.rgb, vec3(0.2126, 0.7152, 0.0722));
    float chroma = max(photo.r, max(photo.g, photo.b)) - min(photo.r, min(photo.g, photo.b));
    float snowy = smoothstep(0.42, 0.75, pl) * (1.0 - smoothstep(0.06, 0.16, chroma));
    vec3 drawn = uSnowCol * (uSkyCol * (0.62 + 0.38) + uSunCol * sun * max(uSunDir.y, 0.0));
    float edge = 1.0 - smoothstep(0.3, 0.95, photo.a);
    col = mix(col, drawn, clamp(snowy * mix(0.55, 1.0, edge), 0.0, 1.0));
    // The ledge's edge breaks a little, as snow does; the fur's does not need it.
    float n = valueNoise(vec2(vUv.x * 40.0, vUv.y * 28.0));
    float a = clamp(photo.a * mix(1.0, 0.92 + 0.16 * n, snowy), 0.0, 1.0);
    col = applyAir(col, vWorld);
    gl_FragColor = vec4(col, a * (1.0 - uVeil));
  }
`;

/** Thin cirrus, lit from below by the low sun. */
const CIRRUS = /* glsl */ `
  vec2 cp = dir.xz / (dir.y + 0.3);
  float c = fbm3(vec2(cp.x * 0.7, cp.y * 3.2) + 4.0);
  float cloud = smoothstep(0.56, 0.82, c) * smoothstep(0.06, 0.32, dir.y);
  vec3 lit = uSunCol * (0.05 + 0.03 * airPhase(dot(dir, uSunDir))) + uAirCol * 0.9;
  col = mix(col, lit, cloud * 0.55);
`;

export async function createHimalaya({ tier, species }: WorldContext): Promise<FieldWorld> {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 6000);

  const C = {
    rockA: lin('#5a534c'),
    rockB: lin('#6e5a47'),
    rockC: lin('#3a3f46'),
    snow: lin('#f2f5fa'),
    // The sky's light on the shaded snow: the blue of first light.
    sky: lin('#6f94d6', 0.55),
    fill: lin('#8a7a9a', 0.06),
    // The sun a few degrees up: gold, not yet white.
    sunLow: lin('#ffb46e', 3.4),
    sunHigh: lin('#ffd9b0', 3.9),
    air: lin('#8fa7c9', 0.5),
    zenith: lin('#1f3f78', 0.65),
  };

  const sunDir = new THREE.Vector3();
  const sunCol = C.sunLow.clone();
  const setSun = (azimuth: number, elevation: number) => {
    sunDir.set(Math.cos(elevation) * Math.cos(azimuth), Math.sin(elevation), Math.cos(elevation) * Math.sin(azimuth)).normalize();
  };
  // East of the valley and a little beyond it: the faces that look to the camera's right take the light.
  const AZ = -0.42;
  setSun(AZ, 0.08);

  const air = airUniforms({
    density: 0.00042,
    falloff: 0.0042,
    base: 0,
    colour: C.air,
    mie: 1.2,
    g: 0.72,
    zenith: C.zenith,
    disc: 14,
    discSize: 0.012,
  });
  const shared = {
    uSunDir: { value: sunDir },
    uSunCol: { value: sunCol },
    ...air,
  };

  /* the sky */
  scene.add(skyDome(5000, { ...shared }, CIRRUS, `${GLSL_HASH}${GLSL_NOISE}`));

  /* the ground: a near sheet with the detail, a far one with the ranges */
  const res = { high: 340, balanced: 240, low: 160 }[tier];
  const farRes = { high: 330, balanced: 270, low: 160 }[tier];
  const nearSeg: [number, number] = [res, Math.round(res * 0.7)];
  const farSeg: [number, number] = [farRes, Math.round(farRes * 0.7)];
  const ground = await makeHeightfield('mountains', 1000, 560, nearSeg[0], nearSeg[1], [0, -170]);
  const far = await makeHeightfield('mountains', 5200, 2400, farSeg[0], farSeg[1], [0, -1630]);
  const h = ground.height;

  /* the light: the near sheet's grid, with the far sheet's around it for the ranges' shadows */
  const farGrid = gridFromMesh(far.geometry, farSeg[0], farSeg[1]);
  const nearGrid = gridFromMesh(ground.geometry, nearSeg[0], nearSeg[1]);
  const nearLight = new Sunlight({ ...nearGrid, outer: farGrid }, { penumbra: 0.01, reach: 2600, steps: 40, scale: 1 });
  const farLight = new Sunlight(farGrid, { penumbra: 0.012, reach: 3200, steps: 36, scale: 1 });

  /* where the leopard stands */
  const P = new THREE.Vector3(LEDGE.x, 0, LEDGE.z);
  P.y = h(P.x, P.z);
  const facing = new THREE.Vector3(0.14, 0, 1).normalize();
  const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), facing).normalize();
  const groundUniforms = {
    ...shared,
    uSkyCol: { value: C.sky },
    uFill: { value: C.fill },
    uRockA: { value: C.rockA },
    uRockB: { value: C.rockB },
    uRockC: { value: C.rockC },
    uSnowCol: { value: C.snow },
    uPanel: { value: new THREE.Vector3(P.x, P.y + 14, P.z) },
    uSnowLine: { value: 110 },
  };
  const groundMat = new THREE.ShaderMaterial({
    vertexShader: GROUND_VERTEX,
    fragmentShader: GROUND_FRAGMENT,
    uniforms: { ...groundUniforms, ...nearLight.uniforms },
  });
  const farMat = new THREE.ShaderMaterial({
    vertexShader: GROUND_VERTEX,
    fragmentShader: GROUND_FRAGMENT,
    uniforms: { ...groundUniforms, ...farLight.uniforms },
  });
  scene.add(new THREE.Mesh(ground.geometry, groundMat));
  const farMesh = new THREE.Mesh(far.geometry, farMat);
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
  // Each boulder is a block of fractured rock: a sphere cut by a dozen planes (a convex polyhedron with flat
  // faces), flat-shaded so the facets and their edges read, with snow only on the facets that face up.
  const rockGeo = (() => {
    const pos: number[] = [];
    // (An icosahedron is already non-indexed: each face has its own three vertices, so the facets stay flat.)
    const unit = new THREE.IcosahedronGeometry(1, 3);
    const a = unit.getAttribute('position');
    const dir = new THREE.Vector3();
    rocks.forEach(([s, f, size, tall], k) => {
      const planes: Array<[THREE.Vector3, number]> = [];
      for (let i = 0; i < 13; i++) {
        const u = noise2(k * 13 + i, 3, 71) * 2 - 1;
        const t = noise2(k * 13 + i, 7, 72) * Math.PI * 2;
        const r = Math.sqrt(1 - u * u);
        // Flatter on top and bottom: blocks, not balls.
        const nrm = new THREE.Vector3(r * Math.cos(t), u * 1.6, r * Math.sin(t)).normalize();
        planes.push([nrm, 0.62 + 0.32 * noise2(k * 13 + i, 11, 73)]);
      }
      const ang = k * 2.399;
      const c = Math.cos(ang);
      const sn = Math.sin(ang);
      const cx = P.x + side.x * s + facing.x * f;
      const cz = P.z + side.z * s + facing.z * f;
      const cy = h(cx, cz);
      for (let i = 0; i < a.count; i++) {
        dir.set(a.getX(i), a.getY(i), a.getZ(i)).normalize();
        let r = 1.2;
        for (const [nrm, d] of planes) {
          const dn = dir.dot(nrm);
          if (dn > 1e-3) r = Math.min(r, d / dn);
        }
        let x = dir.x * r * 1.15;
        let y = dir.y * r * tall;
        const z = dir.z * r;
        if (y < -0.2 * tall) y = -0.2 * tall;
        x += 0;
        pos.push(cx + (x * c - z * sn) * size, cy + (y + 0.1 * tall) * size, cz + (x * sn + z * c) * size);
      }
    });
    unit.dispose();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
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
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  const panelW = 49.65;
  const panelH = (panelW * 1381) / 1955;
  const panelMat = new THREE.ShaderMaterial({
    vertexShader: PANEL_VERTEX,
    fragmentShader: PANEL_FRAGMENT,
    uniforms: { ...shared, ...nearLight.uniforms, uMap: { value: texture }, uSkyCol: { value: C.sky }, uSnowCol: { value: C.snow }, uPhotoGain: { value: 1.45 }, uVeil: { value: 0 }, uSubject: { value: new THREE.Vector3() } },
    transparent: true,
    depthWrite: false,
  });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(panelW, panelH), panelMat);
  // The foot stands a little below the terrace's surface, so the snow takes it.
  panel.position.set(P.x, P.y - 0.5 + panelH / 2, P.z);
  panel.lookAt(panel.position.clone().add(facing));
  scene.add(panel);
  const C0 = new THREE.Vector3(P.x, P.y + panelH * 0.42, P.z);
  panelMat.uniforms.uSubject.value.set(P.x, P.y + panelH * 0.35, P.z);
  // The species' licensed 3D model where one exists (content/models.ts): it stands on the terrace in the photograph's
  // place, about as tall as the photograph's animal; without one, or if it cannot load, the photograph stays.
  const animal = await modelFor(
    species,
    { at: new THREE.Vector3(P.x, P.y - 0.5, P.z), feet: 0, uniforms: { ...shared, ...nearLight.uniforms }, skyCol: C.sky, facing, lightReach: 3 },
    panelH * 0.5,
  );
  if (animal) {
    panel.visible = false;
    scene.add(animal.mesh);
  }

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

  const film = grade({
    exposure: 1.0,
    tint: new THREE.Vector3(1.06, 1.0, 0.9),
    saturation: 0.92,
    contrast: 1.04,
    shadows: new THREE.Vector3(-0.004, 0.0, 0.012),
    highlights: new THREE.Vector3(1.02, 1.0, 0.97),
    vignette: 0.42,
    bloom: 0.4,
    threshold: 1.3,
  });

  return {
    scene,
    camera,
    clear: '#0d1830',
    grade: film,
    update(i: FieldInput) {
      const p = i.progress;
      const en = i.enter;
      rig.update({ engage: i.engage, enter: en, progress: p, pointer: i.pointer, dt: i.dt, snap: i.snap || i.reduced });

      // First light: the sun climbs through the study, and the hand turns it a few degrees, as on the homepage.
      const climb = seg(p, 0.05, 1) * en;
      setSun(AZ + i.light.x * 0.16, lerp(0.075, 0.2, climb * climb) + i.light.y * 0.025);
      sunCol.lerpVectors(C.sunLow, C.sunHigh, climb);

      // The map is read over a quieter ground.
      const dim = Math.max(0, Math.min(seg(p, 0.58, 0.63), 1 - seg(p, 0.74, 0.79))) * en;
      film.exposure = 1.0 - dim * 0.35;
      // While the study's footage is open over the world, the photograph steps back (world/field/plateVeil.ts).
      const veil = plateVeil(species.id, i.dt);
      panelMat.uniforms.uVeil.value = veil;
      animal?.setVeil(veil);
      animal?.update(camera, sunDir, i.reduced ? 0 : i.dt);
    },
    prerender(renderer) {
      farLight.update(renderer, sunDir);
      nearLight.update(renderer, sunDir);
    },
    resize(width, height) {
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    },
    setRung() {},
    dispose() {
      texture.dispose();
      animal?.dispose();
      nearLight.dispose();
      farLight.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        (m.material as THREE.Material | undefined)?.dispose?.();
      });
    },
  };
}
