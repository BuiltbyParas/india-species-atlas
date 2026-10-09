import * as THREE from 'three';
import { GLSL_DISSOLVE, GLSL_GRAIN, GLSL_HASH, GLSL_NOISE } from '../../gl/chunks';
import { seededRandom } from '../../gl/particles';
import { damp } from '../../../interaction/spring';
import { CameraRig, type Shot } from '../cameraRig';
import { rgb } from '../gl/color';
import { curve, makeLine } from '../gl/line';
import { frameAround, makeRings } from '../gl/mapLines';
import { GLSL_COVER, loadPhoto } from '../gl/photo';
import { makeHeightfield } from '../gl/terrain';
import { fbm, lerp, seg, smooth, window4 } from '../noise';
import { populationFigures } from '../../../components/field/studyFacts';
import { drawSilhouette } from '../../../components/home/heroPlates';
import { SPECIES_SILHOUETTES } from '../../../components/home/speciesSilhouettes';
import type { FieldInput, FieldWorld, WorldContext } from '../types';

/**
 * FIELD STUDY 05 · TRANSFORM · the greater one-horned rhinoceros, the
 * Brahmaputra floodplain.
 *
 * The physical study. It begins with a mass: a heavy, matte, folded form
 * raised from the atlas's schematic outline of the species (body plan and
 * posture, not a model of the animal) standing on dark wet earth. The hand moves the light across it; the
 * form turns slowly, as something heavy does. The floodplain rises around
 * it, tall grass and wallows (LANDSCAPE). Then the form breaks into points,
 * and the points are the record's own figure: one point for each animal of
 * "around 4,000". They draw together, more than two-thirds of them into one
 * dense knot, the record's single park (PRESSURE). The sites the record
 * names appear beneath them, and a protected route runs from Kaziranga and
 * Pobitora to Manas, the translocation the record describes (PROTECTION).
 * The points lay themselves out as a field: first only "fewer than 200" of
 * them lit, then all of them (RECOVERY). They rise into a plane and take the
 * photograph's colours, until they are the photograph (PHOTOGRAPH), and the
 * form returns, standing in its grass (PRESENT).
 *
 * Honesty: the form claims only what its outline claims, and says so; each point stands for one
 * animal of the record's figure, the past figure drawn at its upper bound;
 * nothing is drawn between the two figures; the split is the record's
 * "more than two-thirds", nothing finer; the route is drawn between the
 * sites the record names, not along any path.
 */

const N_STAGES = 7;

const FORM_VERTEX = /* glsl */ `
  attribute float aCav;
  varying vec3 vNormal;
  varying vec3 vWorld;
  varying float vCav;
  varying vec3 vLocal;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vLocal = position;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vCav = aCav;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const FORM_FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  ${GLSL_GRAIN}
  ${GLSL_DISSOLVE}
  uniform vec3 uKey;
  uniform vec3 uClay;
  uniform vec3 uDark;
  uniform vec3 uMud;
  uniform vec3 uSky;
  uniform float uMudLine;
  uniform float uMudOn;
  uniform float uDissolve;
  uniform vec3 uCam;
  varying vec3 vNormal;
  varying vec3 vWorld;
  varying float vCav;
  varying vec3 vLocal;
  void main() {
    // It breaks into its points: the surface goes by a noise field, leaving the points behind.
    float field = fbm3(vLocal.xy * 3.1 + vLocal.z * 1.7);
    float keep = 1.0 - inkEdge(field, uDissolve, 0.06);
    if (keep < 0.5) discard;
    vec3 n = normalize(vNormal);
    vec3 V = normalize(uCam - vWorld);
    // Wrapped key light: matte, heavy, no gloss.
    float ndl = dot(n, uKey);
    float wrap = clamp((ndl + 0.35) / 1.35, 0.0, 1.0);
    float fill = clamp(n.y * 0.5 + 0.5, 0.0, 1.0) * 0.16;
    float rim = pow(1.0 - max(dot(n, V), 0.0), 3.0) * 0.12;
    float cav = smoothstep(0.0, 1.0, vCav);
    float grain = fbm3(vLocal.xz * 22.0) * 0.5 + fbm3(vLocal.xy * 60.0) * 0.5;
    vec3 col = mix(uDark, uClay, wrap * (0.65 + grain * 0.5)) * (1.0 - cav * 0.6);
    col += uSky * (fill + rim);
    // Floodplain mud on the lower body.
    float mud = (1.0 - smoothstep(uMudLine - 1.2, uMudLine + 1.6, vWorld.y + grain * 1.2)) * uMudOn;
    col = mix(col, uMud * (0.5 + wrap * 0.6), mud * 0.85);
    col += paperGrain(gl_FragCoord.xy, 0.012);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const GROUND_FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  ${GLSL_GRAIN}
  uniform vec3 uKey;
  uniform vec3 uEarth;
  uniform vec3 uMud;
  uniform vec3 uGrassCol;
  uniform vec3 uSky;
  uniform vec3 uNight;
  uniform float uGrass;
  uniform float uMap;
  uniform float uDepthFog;
  uniform vec3 uCam;
  varying vec3 vWorld;
  varying vec3 vNormal;
  void main() {
    vec3 n = normalize(vNormal);
    float lit = clamp(dot(n, uKey) * 0.6 + 0.5, 0.0, 1.0);
    float soil = fbm3(vWorld.xz * 0.08) * 0.6 + fbm3(vWorld.xz * 0.9) * 0.4;
    vec3 col = mix(uMud, uEarth, soil) * (0.55 + lit * 0.6);
    col = mix(col, uGrassCol * (0.45 + lit * 0.4), uGrass * smoothstep(0.35, 0.7, fbm3(vWorld.xz * 0.03 + 4.0)) * 0.6);
    // Wallows: standing water holding the sky.
    float pool = smoothstep(0.62, 0.66, fbm3(vWorld.xz * 0.025 + 11.0));
    vec3 V = normalize(uCam - vWorld);
    col = mix(col, mix(uMud * 0.4, uSky, pow(1.0 - max(V.y, 0.0), 2.0) * 0.7 + 0.15), pool * (0.4 + uGrass * 0.6));
    float d = distance(uCam, vWorld);
    col = mix(col, uNight, smoothstep(60.0, 420.0, d) * uDepthFog);
    col = mix(col, uNight * 1.25, uMap * 0.85);
    col += paperGrain(gl_FragCoord.xy, 0.012);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const GROUND_VERTEX = /* glsl */ `
  varying vec3 vWorld;
  varying vec3 vNormal;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vNormal = normal;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const GRASS_VERTEX = /* glsl */ `
  attribute vec4 aBlade;
  uniform float uTime;
  uniform float uGrass;
  uniform float uPush;
  uniform vec2 uPushAt;
  varying float vTip;
  varying float vShade;
  varying vec3 vWorld;
  void main() {
    // aBlade: x, z, height, phase. The blade is a thin taper, bent by the wind and leaning away from the form.
    float tip = position.y;
    float h = aBlade.z * uGrass;
    vec3 p = vec3(position.x * 0.12 * (1.0 - tip * 0.85), tip * h, 0.0);
    float a = aBlade.w * 6.2831;
    p.xz = mat2(cos(a), -sin(a), sin(a), cos(a)) * p.xz;
    float wind = sin(uTime * 0.9 + aBlade.x * 0.08 + aBlade.w * 3.0) * 0.5 + sin(uTime * 1.7 + aBlade.y * 0.12) * 0.25;
    p.x += wind * tip * tip * h * 0.18;
    vec3 w = vec3(aBlade.x, 0.0, aBlade.y) + p;
    vec2 away = w.xz - uPushAt;
    float near = exp(-dot(away, away) / 260.0) * uPush;
    w.xz += normalize(away + 1e-4) * near * tip * tip * h * 0.5;
    vTip = tip;
    vShade = aBlade.w;
    vWorld = w;
    gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
  }
`;

const GRASS_FRAGMENT = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uTip;
  uniform vec3 uNight;
  uniform vec3 uCam;
  uniform float uOpacity;
  varying float vTip;
  varying float vShade;
  varying vec3 vWorld;
  void main() {
    vec3 col = mix(uBase, uTip, vTip) * (0.75 + vShade * 0.45);
    col = mix(col, uNight, smoothstep(50.0, 300.0, distance(uCam, vWorld)) * 0.8);
    gl_FragColor = vec4(col, uOpacity);
  }
`;

const POINTS_VERTEX = /* glsl */ `
  attribute vec3 aForm;
  attribute vec3 aCluster;
  attribute vec3 aField;
  attribute vec3 aPhoto;
  attribute vec2 aUv;
  attribute float aSeed;
  attribute float aPast;
  uniform float uStage;
  uniform float uPastOnly;
  uniform float uPixelRatio;
  uniform float uViewScale;
  uniform float uCell;
  uniform float uTime;
  uniform sampler2D uPhotoMap;
  uniform vec3 uClay;
  uniform vec3 uLit;
  uniform vec3 uGhost;
  varying vec3 vCol;
  varying float vAlpha;
  void main() {
    // Each point leaves its stage a little before or after its neighbours.
    // …but all of them arrive together, so a held state is exact.
    float s = clamp(uStage + (aSeed - 0.5) * 0.35 * sin(3.14159 * fract(uStage)), 0.0, 3.0);
    float k = smoothstep(0.0, 1.0, fract(s));
    vec3 p;
    if (s < 1.0) p = mix(aForm, aCluster, k);
    else if (s < 2.0) p = mix(aCluster, aField, k);
    else if (s < 3.0) p = mix(aField, aPhoto, k);
    else p = aPhoto;
    // A breath of drift while they travel, never at rest.
    float travel = sin(fract(s) * 3.14159);
    p += vec3(sin(aSeed * 91.0 + uTime), cos(aSeed * 53.0 + uTime * 0.8), sin(aSeed * 27.0 + uTime * 0.6)) * travel * 1.2;
    vec4 mv = viewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    // The past figure, lit; the rest waiting as ghosts until the present figure is drawn.
    float lit = mix(1.0, aPast, uPastOnly);
    vec3 photoCol = texture2D(uPhotoMap, aUv).rgb;
    float toPhoto = smoothstep(2.0, 3.0, uStage);
    vec3 base = mix(mix(uGhost, uLit, lit), uClay, smoothstep(1.0, 0.0, uStage) * 0.6);
    vCol = mix(base, photoCol, toPhoto);
    vAlpha = mix(0.3, 1.0, max(lit, toPhoto));
    float size = mix(3.0, uCell * uViewScale / max(-mv.z, 1.0), toPhoto);
    gl_PointSize = max(size, 1.5) * uPixelRatio;
  }
`;

const POINTS_FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  uniform float uSquare;
  varying vec3 vCol;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float disc = 1.0 - smoothstep(0.32, 0.5, length(c));
    float cell = 1.0 - smoothstep(0.46, 0.5, max(abs(c.x), abs(c.y)));
    float m = mix(disc, cell, uSquare);
    if (m * vAlpha * uOpacity < 0.01) discard;
    gl_FragColor = vec4(vCol, m * vAlpha * uOpacity);
  }
`;

const PHOTO_FRAGMENT = /* glsl */ `
  ${GLSL_COVER}
  uniform sampler2D uMap;
  uniform float uAspect;
  uniform float uPlaneAspect;
  uniform float uOpacity;
  uniform vec2 uPointer;
  varying vec2 vUv;
  void main() {
    vec2 uv = coverUv(vUv, uPlaneAspect, uAspect);
    vec3 base = texture2D(uMap, uv).rgb;
    uv += uPointer * (luma(base) - 0.5) * 0.01;
    gl_FragColor = vec4(texture2D(uMap, uv).rgb, uOpacity);
  }
`;

/**
 * The heavy form, sculpted from the species' published profile.
 *
 * The outline is the atlas's own schematic silhouette (`speciesSilhouettes`,
 * drawn from the published description: pillar legs, the single horn, the
 * shoulder and flank folds). It is inflated into a solid, the way a sculptor
 * blows up a cut-out: every point inside the outline is raised by a circular
 * profile of its distance to the edge, scaled by the local thickness of the
 * part it belongs to, so the barrel of the body is deep and the legs are
 * pillars. It makes the same claim the outline makes — body plan and
 * posture, nothing finer — and the study says so on screen.
 */
function buildForm(fine: boolean): { geometry: THREE.BufferGeometry; points: (count: number, rand: () => number) => Float32Array } {
  const art = SPECIES_SILHOUETTES['indian-rhinoceros'];
  const [bw, bh] = art.box;
  // 1. Rasterise the outline (2 px per silhouette unit, with a margin).
  const R = 2;
  const pad = 6;
  const W = (bw + pad * 2) * R;
  const H = (bh + pad * 2) * R;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#fff';
  drawSilhouette(ctx, art, pad * R, pad * R, bw * R, bh * R);
  const alpha = ctx.getImageData(0, 0, W, H).data;
  const inside = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) inside[i] = alpha[i * 4 + 3] > 127 ? 1 : 0;

  // 2. Signed distance to the outline (chamfer 3-4, in silhouette units): + inside, − outside.
  const chamfer = (mask: (i: number) => boolean) => {
    const d = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) d[i] = mask(i) ? 1e6 : 0;
    const relax = (i: number, j: number, w: number) => {
      if (d[j] + w < d[i]) d[i] = d[j] + w;
    };
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (!d[i]) continue;
        if (x > 0) relax(i, i - 1, 3);
        if (y > 0) {
          relax(i, i - W, 3);
          if (x > 0) relax(i, i - W - 1, 4);
          if (x < W - 1) relax(i, i - W + 1, 4);
        }
      }
    for (let y = H - 1; y >= 0; y--)
      for (let x = W - 1; x >= 0; x--) {
        const i = y * W + x;
        if (!d[i]) continue;
        if (x < W - 1) relax(i, i + 1, 3);
        if (y < H - 1) {
          relax(i, i + W, 3);
          if (x < W - 1) relax(i, i + W + 1, 4);
          if (x > 0) relax(i, i + W - 1, 4);
        }
      }
    for (let i = 0; i < W * H; i++) d[i] /= 3 * R;
    return d;
  };
  const din = chamfer((i) => inside[i] === 1);
  const dout = chamfer((i) => inside[i] === 0);
  const sd = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) sd[i] = inside[i] ? din[i] - 0.25 : -dout[i] + 0.25;

  // 3. The local thickness: the deepest distance nearby (a separable max filter, then softened),
  //    so a leg stays a leg and the body is a barrel, and they meet in a haunch.
  const reach = 5 * R;
  const tmp = new Float32Array(W * H);
  const rad = new Float32Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let m = 0;
      for (let k = Math.max(0, x - reach); k <= Math.min(W - 1, x + reach); k++) m = Math.max(m, din[y * W + k]);
      tmp[y * W + x] = m;
    }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let m = 0;
      for (let k = Math.max(0, y - reach); k <= Math.min(H - 1, y + reach); k++) m = Math.max(m, tmp[k * W + x]);
      rad[y * W + x] = m;
    }
  const sample = (f: Float32Array, u: number, v: number) => {
    const x = Math.min(W - 1.001, Math.max(0, (u + pad) * R - 0.5));
    const y = Math.min(H - 1.001, Math.max(0, (v + pad) * R - 0.5));
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const i = y0 * W + x0;
    return (f[i] * (1 - fx) + f[i + 1] * fx) * (1 - fy) + (f[i + W] * (1 - fx) + f[i + W + 1] * fx) * fy;
  };

  // 4. Two sheets, front and back, over a grid that covers the outline. Grid points just outside
  //    the outline are moved onto it with no height, so the sheets close on the edge itself.
  const step = fine ? 0.7 : 1;
  const nx = Math.ceil((bw + 2) / step) + 1;
  const ny = Math.ceil((bh + 2) / step) + 1;
  // Fit: the animal spans x 37 → 137 and y 14 → 88 of its box; feet on the ground at y = −0.62.
  const S = 0.027;
  const cx = 87;
  const foot = 87.5;
  // The skin's folds: behind the shoulder, before the hip, and at the neck. Grooves, not straps.
  const folds = [
    { x: 97, w: 1.6, depth: 0.9 },
    { x: 62, w: 1.8, depth: 0.8 },
    { x: 108, w: 1.4, depth: 0.6 },
  ];
  // The legs stand at the body's sides, not in one plane: the near pair (hind 43–58, fore 98–113)
  // forward, the far pair (hind 58–76, fore 80–98) back. Below the belly only.
  const sstep = (a: number, b: number, x: number) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const legSide = (u: number) => 1 - 2 * (sstep(56, 60, u) - sstep(96, 100, u));
  const legDepth = (v: number) => sstep(52, 64, v) * 9;
  const verts: number[] = [];
  const keep: boolean[] = [];
  const cavs: number[] = [];
  const sds: number[] = [];
  const eps = 0.5;
  for (const side of [1, -1]) {
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        let u = -1 + i * step;
        let v = -1 + j * step;
        let d = sample(sd, u, v);
        if (d <= 0 && d > -1.6 * step) {
          // Onto the outline, along the distance field's gradient.
          const gx = sample(sd, u + eps, v) - sample(sd, u - eps, v);
          const gy = sample(sd, u, v + eps) - sample(sd, u, v - eps);
          const g = Math.hypot(gx, gy) || 1;
          u += (gx / g) * -d;
          v += (gy / g) * -d;
          d = 0;
        }
        keep.push(d >= 0);
        sds.push(d);
        const r = Math.max(sample(rad, u, v), Math.max(d, 0.5));
        const dd = Math.max(0, d);
        let h = Math.sqrt(Math.max(0, 2 * r * dd - dd * dd));
        let crease = 0;
        const body = sstep(8, 14, r) * (1 - sstep(56, 64, v));
        for (const f of folds) crease += Math.exp(-(((u - f.x + (v - 40) * 0.12) / f.w) ** 2)) * f.depth * body;
        const lump = (fbm(u * 0.09 + 4, v * 0.09, 3, 3) - 0.5) * 1.1 + (fbm(u * 0.45, v * 0.45, 2, 8) - 0.5) * 0.18;
        const edge = Math.min(1, dd / 3);
        h = Math.max(0, h + (lump - crease) * edge);
        const z = side * h * 1.08 + legSide(u) * legDepth(v) * Math.min(1, r / 6);
        verts.push((u - cx) * S, (foot - v) * S - 0.62, z * S);
        cavs.push(Math.min(1, crease * 0.45 + Math.max(0, -lump) * 0.5));
      }
  }
  const index: number[] = [];
  const sheet = nx * ny;
  for (let s = 0; s < 2; s++)
    for (let j = 0; j < ny - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        const a = s * sheet + j * nx + i;
        const b = a + 1;
        const c = a + nx;
        const d = c + 1;
        const ok = (...k: number[]) => k.every((x) => keep[x]) && k.some((x) => sds[x] > 0);
        if (s === 0) {
          if (ok(a, c, b)) index.push(a, c, b);
          if (ok(b, c, d)) index.push(b, c, d);
        } else {
          if (ok(a, b, c)) index.push(a, b, c);
          if (ok(b, d, c)) index.push(b, d, c);
        }
      }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geometry.setAttribute('aCav', new THREE.Float32BufferAttribute(cavs, 1));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  const solid: number[] = [];
  for (let k = 0; k < sds.length; k++) if (sds[k] > 0.4) solid.push(k);
  const points = (count: number, rand: () => number) => {
    const out = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const k = solid[Math.floor(rand() * solid.length)];
      out.set([verts[k * 3], verts[k * 3 + 1], verts[k * 3 + 2]], i * 3);
    }
    return out;
  };
  return { geometry, points };
}

export async function createFloodplain({ species, tier }: WorldContext): Promise<FieldWorld> {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.3, 1600);
  const C = {
    clay: rgb('#8a8074'),
    dark: rgb('#2a221b'),
    mud: rgb('#3a2e22'),
    earth: rgb('#5a4733'),
    grass: rgb('#6f7444'),
    sky: rgb('#b9c1b4'),
    night: rgb('#151210'),
    lit: rgb('#efe2c4'),
    ghost: rgb('#8f7f68'),
  };
  const key = new THREE.Vector3(-0.5, 0.75, 0.42).normalize();
  const rand = seededRandom(71);
  const FORM_AT = new THREE.Vector3(0, 0, -30);
  const FORM_SCALE = 9;

  /* the ground */
  const ground = await makeHeightfield('floodplain', 700, 700, tier === 'low' ? 90 : 140, tier === 'low' ? 90 : 140, [0, -160]);
  const groundMat = new THREE.ShaderMaterial({
    vertexShader: GROUND_VERTEX,
    fragmentShader: GROUND_FRAGMENT,
    uniforms: {
      uKey: { value: key },
      uEarth: { value: C.earth },
      uMud: { value: C.mud },
      uGrassCol: { value: C.grass },
      uSky: { value: C.sky },
      uNight: { value: C.night },
      uGrass: { value: 0 },
      uMap: { value: 0 },
      uDepthFog: { value: 1 },
      uCam: { value: new THREE.Vector3() },
    },
  });
  scene.add(new THREE.Mesh(ground.geometry, groundMat));
  const groundAt = (x: number, z: number) => ground.height(x, z);

  /* the form */
  const form = buildForm(tier === 'high');
  const formMat = new THREE.ShaderMaterial({
    vertexShader: FORM_VERTEX,
    fragmentShader: FORM_FRAGMENT,
    uniforms: {
      uKey: { value: key },
      uClay: { value: C.clay },
      uDark: { value: C.dark },
      uMud: { value: C.mud },
      uSky: { value: C.sky },
      uMudLine: { value: 2 },
      uMudOn: { value: 0 },
      uDissolve: { value: 0 },
      uCam: { value: new THREE.Vector3() },
    },
  });
  const formMesh = new THREE.Mesh(form.geometry, formMat);
  formMesh.scale.setScalar(FORM_SCALE);
  const baseY = groundAt(FORM_AT.x, FORM_AT.z) + 0.62 * FORM_SCALE - 0.4;
  formMesh.position.set(FORM_AT.x, baseY, FORM_AT.z);
  scene.add(formMesh);

  /* the grass */
  const blades = { high: 16000, balanced: 9000, low: 4000 }[tier];
  const bladeGeo = new THREE.InstancedBufferGeometry();
  // A blade: two triangles of a tapering strip, x in −1 → 1 across, y in 0 → 1 up.
  bladeGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, 0, 1, 0, 0, -1, 0.5, 0, 1, 0.5, 0, 0, 1, 0], 3));
  bladeGeo.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
  const bladeData = new Float32Array(blades * 4);
  for (let i = 0; i < blades; i++) {
    let x = 0;
    let z = 0;
    for (let t = 0; t < 8; t++) {
      x = (rand() - 0.5) * 260;
      z = 40 - rand() * 240;
      // Keep the form's footprint clear.
      if (((x - FORM_AT.x) / 19) ** 2 + ((z - FORM_AT.z) / 12) ** 2 > 1) break;
    }
    bladeData.set([x, z, 1.6 + Math.pow(rand(), 1.5) * 3.4, rand()], i * 4);
  }
  bladeGeo.setAttribute('aBlade', new THREE.InstancedBufferAttribute(bladeData, 4));
  bladeGeo.instanceCount = blades;
  const grassMat = new THREE.ShaderMaterial({
    vertexShader: GRASS_VERTEX,
    fragmentShader: GRASS_FRAGMENT,
    uniforms: {
      uTime: { value: 0 },
      uGrass: { value: 0 },
      uPush: { value: 0 },
      uPushAt: { value: new THREE.Vector2(FORM_AT.x, FORM_AT.z) },
      uBase: { value: rgb('#2d2a1a') },
      uTip: { value: rgb('#b4a874') },
      uNight: { value: C.night },
      uCam: { value: new THREE.Vector3() },
      uOpacity: { value: 1 },
    },
    side: THREE.DoubleSide,
    transparent: true,
  });
  const grass = new THREE.Mesh(bladeGeo, grassMat);
  grass.frustumCulled = false;
  scene.add(grass);

  /* the map the points come down onto: the record's sites */
  const sites = species.distributionPoints;
  const frame = frameAround(sites, 120, 0.1);
  const sitePos = sites.map((p) => {
    const [x, z] = frame.toPlane(p.lng, p.lat);
    return new THREE.Vector3(x + FORM_AT.x, 0.5, z + FORM_AT.z);
  });
  const siteIndex = (re: RegExp) => Math.max(0, sites.findIndex((p) => re.test(p.label)));
  const kaz = sitePos[siteIndex(/Kaziranga/)];
  const pob = sitePos[siteIndex(/Pobitora/)];
  const manas = sitePos[siteIndex(/Manas/)];
  const rings = makeRings(
    sitePos.map((p) => [p.x, p.y, p.z]),
    '#c2a27a',
  );
  scene.add(rings.points);
  const route = (a: THREE.Vector3, b: THREE.Vector3) => {
    const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, 0, -Math.max(3, a.distanceTo(b) * 0.25)));
    const line = makeLine(curve([a.clone().setY(0.6), mid.setY(0.6), b.clone().setY(0.6)], 80), { width: 2, color: '#7ea3b5', nib: 1 });
    line.material.uniforms.uDraw.value = 0;
    scene.add(line.mesh);
    return line;
  };
  const routes = [route(kaz, manas), route(pob, manas)];

  /* the points: one per animal of the record's figure */
  const figures = populationFigures(species);
  const count = figures?.now ?? 0;
  const past = figures ? Math.min(figures.past, count) : 0;
  const photo = await loadPhoto(species, tier);
  const aspect = photo?.aspect ?? 1.5;
  let points: THREE.Points | null = null;
  let pointsMat: THREE.ShaderMaterial | null = null;
  const photoW = 40;
  const photoH = photoW / aspect;
  const PHOTO_AT = new THREE.Vector3(FORM_AT.x, 15, FORM_AT.z);
  const cols = Math.max(1, Math.round(Math.sqrt(count * aspect)));
  const rows = Math.max(1, Math.ceil(count / cols));
  if (count > 0) {
    const aForm = form.points(count, rand);
    for (let i = 0; i < count; i++) {
      aForm[i * 3] = aForm[i * 3] * FORM_SCALE + FORM_AT.x;
      aForm[i * 3 + 1] = aForm[i * 3 + 1] * FORM_SCALE + baseY;
      aForm[i * 3 + 2] = aForm[i * 3 + 2] * FORM_SCALE + FORM_AT.z;
    }
    // More than two-thirds in one knot at Kaziranga; the rest loose across the floodplain, not assigned to sites.
    const inKnot = Math.floor(count * (2 / 3)) + 1;
    const aCluster = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const knot = i < inKnot;
      const r = knot ? Math.sqrt(rand()) * 5.5 : 14 + rand() * 46;
      const a = rand() * Math.PI * 2;
      const cx = knot ? kaz.x : FORM_AT.x - 10;
      const cz = knot ? kaz.z : FORM_AT.z;
      aCluster.set([cx + Math.cos(a) * r * (knot ? 1 : 1.6), 0.5 + (knot ? rand() * 1.4 : 0.2), cz + Math.sin(a) * r * (knot ? 1 : 0.7)], i * 3);
    }
    // The field: a block of marks, the past figure first.
    const fCols = 80;
    const spacing = 1.5;
    const fRows = Math.ceil(count / fCols);
    const aField = new Float32Array(count * 3);
    const aPast = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const c = i % fCols;
      const r = Math.floor(i / fCols);
      aField.set([FORM_AT.x + (c - (fCols - 1) / 2) * spacing, 0.5, FORM_AT.z + (r - (fRows - 1) / 2) * spacing], i * 3);
      // The past figure is the block nearest the eye.
      aPast[i] = i >= count - past ? 1 : 0;
    }
    // The photograph's grid: one cell per point, coloured by the picture.
    const aPhoto = new Float32Array(count * 3);
    const aUv = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const u = (c + 0.5) / cols;
      const v = 1 - (r + 0.5) / rows;
      aPhoto.set([PHOTO_AT.x + (u - 0.5) * photoW, PHOTO_AT.y + (v - 0.5) * photoH, PHOTO_AT.z], i * 3);
      aUv.set([u, v], i * 2);
    }
    const aSeed = new Float32Array(count);
    for (let i = 0; i < count; i++) aSeed[i] = rand();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(aForm.slice(), 3));
    geometry.setAttribute('aForm', new THREE.BufferAttribute(aForm, 3));
    geometry.setAttribute('aCluster', new THREE.BufferAttribute(aCluster, 3));
    geometry.setAttribute('aField', new THREE.BufferAttribute(aField, 3));
    geometry.setAttribute('aPhoto', new THREE.BufferAttribute(aPhoto, 3));
    geometry.setAttribute('aUv', new THREE.BufferAttribute(aUv, 2));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
    geometry.setAttribute('aPast', new THREE.BufferAttribute(aPast, 1));
    pointsMat = new THREE.ShaderMaterial({
      vertexShader: POINTS_VERTEX,
      fragmentShader: POINTS_FRAGMENT,
      uniforms: {
        uStage: { value: 0 },
        uPastOnly: { value: 0 },
        uPixelRatio: { value: 1 },
        uViewScale: { value: 900 },
        uCell: { value: photoW / cols },
        uTime: { value: 0 },
        uPhotoMap: { value: photo?.texture ?? null },
        uClay: { value: C.clay },
        uLit: { value: C.lit },
        uGhost: { value: C.ghost },
        uOpacity: { value: 0 },
        uSquare: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
    });
    points = new THREE.Points(geometry, pointsMat);
    points.frustumCulled = false;
    scene.add(points);
  }

  /* the photograph the points become */
  const photoMat = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: PHOTO_FRAGMENT,
    uniforms: {
      uMap: { value: photo?.texture ?? null },
      uAspect: { value: aspect },
      uPlaneAspect: { value: photoW / photoH },
      uOpacity: { value: 0 },
      uPointer: { value: new THREE.Vector2() },
    },
    transparent: true,
    depthWrite: false,
  });
  const photoPlane = new THREE.Mesh(new THREE.PlaneGeometry(photoW, photoH), photoMat);
  photoPlane.position.copy(PHOTO_AT);
  photoPlane.visible = false;
  scene.add(photoPlane);

  /* the camera */
  const at = (i: number) => (i + 0.5) / N_STAGES;
  const path: Shot[] = [
    { at: 0, pos: [-34, 10, 28], look: [-15, 7, -30], fov: 38 },
    { at: at(0), pos: [-31, 8.5, 23], look: [-15, 7.5, -30], fov: 38 },
    { at: at(1), pos: [32, 4.6, 8], look: [9, 6.5, -30], fov: 40 },
    { at: at(2), pos: [-4, 46, 44], look: [6, 0, -32], fov: 42 },
    { at: at(3), pos: [30, 170, 40], look: [30, 0, -32], fov: 44 },
    { at: at(4), pos: [0, 118, 58], look: [0, 0, -32], fov: 44 },
    { at: at(5), pos: [PHOTO_AT.x + 13, PHOTO_AT.y, PHOTO_AT.z + 70], look: [PHOTO_AT.x + 13, PHOTO_AT.y, PHOTO_AT.z], fov: 40 },
    { at: at(6), pos: [-27, 7, 24], look: [12, 8, -30], fov: 38 },
    { at: 1, pos: [-33, 8.5, 32], look: [12, 8, -30], fov: 38 },
  ];
  const rig = new CameraRig(camera, {
    preview: { at: 0, pos: [-36, 11, 36], look: [1, 5.5, -30], fov: 36 },
    engage: { at: 0, pos: [-31, 9.5, 29], look: [1, 6, -30], fov: 34 },
    path,
    sway: [5, 2.5],
    lambda: 4,
  });

  let turn = 0;
  let viewHeight = 900;
  let viewWidth = 1440;
  let rung = 0;

  return {
    scene,
    camera,
    clear: '#151210',
    update(i: FieldInput) {
      const p = i.progress;
      const e = i.enter;
      rig.update({ engage: i.engage, enter: e, progress: p, pointer: i.pointer, dt: i.dt, snap: i.snap || i.reduced });
      // A tall screen sets the name low and large over the preview: lift the form clear of it.
      const lift = viewWidth / viewHeight < 0.8 ? viewHeight * 0.06 * (1 - e) : 0;
      if (lift > 0.5) camera.setViewOffset(viewWidth, viewHeight, 0, lift, viewWidth, viewHeight);
      else if (camera.view?.enabled) camera.clearViewOffset();
      camera.updateProjectionMatrix();
      groundMat.uniforms.uCam.value.copy(camera.position);
      formMat.uniforms.uCam.value.copy(camera.position);
      grassMat.uniforms.uCam.value.copy(camera.position);

      // The hand moves the light; the form turns slowly, as something heavy does.
      key.set(-0.5 + i.pointer.x * 0.7, 0.75 + i.pointer.y * 0.2, 0.42).normalize();
      const want = i.pointer.x * 0.28 + i.engage * 0.22 * (1 - e) + (i.reduced ? 0 : Math.sin(i.time * 0.12) * 0.05);
      turn = i.snap || i.reduced ? want : damp(turn, want, 1.4, i.dt);
      formMesh.rotation.y = -0.35 + turn;

      // Landscape: grass and mud rise around the form; the preview shows a little of both.
      const grassOn = lerp(0.35 + i.engage * 0.2, Math.max(seg(p, 0.15, 0.26), window4(p, 0.86, 0.92, 1.1, 1.2)), e);
      grassMat.uniforms.uGrass.value = grassOn * (1 - window4(p, 0.3, 0.36, 0.84, 0.9) * e);
      groundMat.uniforms.uGrass.value = grassOn;
      formMat.uniforms.uMudOn.value = lerp(0.3, seg(p, 0.16, 0.26), e);
      formMat.uniforms.uMudLine.value = baseY - 4.6;
      grassMat.uniforms.uPush.value = 1;
      grassMat.uniforms.uTime.value = i.reduced ? 0 : i.time;

      // TRANSFORM: the form breaks into its points, and the points move through the record.
      const breakUp = seg(p, 0.3, 0.345) * (1 - seg(p, 0.86, 0.9)) * e;
      formMat.uniforms.uDissolve.value = breakUp;
      formMesh.visible = breakUp < 0.999;
      const stage = seg(p, 0.33, 0.4) + seg(p, 0.572, 0.6) + seg(p, 0.72, 0.765);
      if (pointsMat && points) {
        pointsMat.uniforms.uStage.value = stage;
        pointsMat.uniforms.uOpacity.value = smooth(seg(p, 0.29, 0.33)) * (1 - seg(p, 0.79, 0.82)) * e;
        // Recovery: first only the past figure is lit, then the present one.
        pointsMat.uniforms.uPastOnly.value = 1 - seg(p, 0.652, 0.676);
        pointsMat.uniforms.uSquare.value = seg(p, 0.74, 0.77);
        pointsMat.uniforms.uViewScale.value = viewHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
        pointsMat.uniforms.uTime.value = i.reduced ? 0 : i.time;
        points.visible = pointsMat.uniforms.uOpacity.value > 0.001;
      }
      const photoOn = window4(p, 0.775, 0.805, 0.85, 0.87) * e;
      photoMat.uniforms.uOpacity.value = photoOn;
      photoMat.uniforms.uPointer.value.set(i.pointer.x, i.pointer.y);
      photoPlane.visible = photoOn > 0.001 && Boolean(photo);

      // The sites, and the route from Kaziranga and Pobitora to Manas.
      const mapOn = window4(p, 0.43, 0.47, 0.55, 0.59) * e;
      groundMat.uniforms.uMap.value = Math.max(mapOn, window4(p, 0.57, 0.6, 0.7, 0.73) * e * 0.7);
      rings.material.uniforms.uOpacity.value = mapOn;
      for (const r of routes) {
        r.material.uniforms.uDraw.value = seg(p, 0.47, 0.54) * e;
        r.material.uniforms.uOpacity.value = mapOn;
      }
      groundMat.uniforms.uDepthFog.value = 1;
      grass.visible = grassMat.uniforms.uGrass.value > 0.01 && rung < 2;
    },
    resize(width, height, dpr) {
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      viewHeight = height;
      viewWidth = width;
      if (pointsMat) pointsMat.uniforms.uPixelRatio.value = dpr;
      rings.material.uniforms.uPixelRatio.value = dpr;
    },
    setRung(r) {
      rung = r;
      bladeGeo.instanceCount = r >= 1 ? Math.floor(blades * 0.5) : blades;
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
