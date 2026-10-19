import * as THREE from 'three';
import { GLSL_HASH, GLSL_NOISE } from '../../gl/chunks';
import { seededRandom } from '../../gl/particles';
import { GLSL_AIR, GLSL_FIELD_SUN } from './air';
import { GLSL_SUNLIGHT } from './sunlight';

/**
 * Foliage: a clump of leaves drawn as leaves.
 *
 * The earlier worlds drew a shrub or a crown as one smooth, lumpy surface, which at any distance reads as a
 * boulder. Here a clump is thousands of small cards scattered through an ellipsoid, denser toward its middle, each
 * turned at random — so the outline is lace, light passes through the gaps, and the clump's form comes from how its
 * leaves are lit, the way a real one's does:
 *
 *   - each leaf is shaded by the clump's own normal at that point (the side toward the sun bright, the far side
 *     dark), wrapped, and darkened with depth into the clump (leaves inside see less sky);
 *   - each takes the world's sun grid where it is, so a clump in another's shadow is in shadow;
 *   - leaves between the eye and the sun let it through (warm, strongest at the clump's edge).
 *
 * One instanced draw per kind of foliage; a leaf is one triangle. Shared by the five worlds (scrub, riverine trees,
 * forest crowns and understorey, the floodplain's tree line).
 *
 * Crowns seen from far off or above (the forest's roof) use `spray`: each card is a spray of small leaves rather than
 * one large one, each turned its own way and its own shade — the same number of cards, so the same cost in
 * geometry, but a crown reads as foliage instead of as cut paper. And `depthShade` darkens a clump's underside and
 * its interior, the way a crown shades itself, so it reads as a volume from above.
 */

export interface Clump {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  /** Leaves in this clump. */
  leaves: number;
  /** Leaf size here, if not the foliage's own (finer leaves for clumps the camera comes close to). */
  size?: number;
}

export interface FoliageOptions {
  /** Leaf size, world units. */
  size: number;
  seed?: number;
  /** How far leaves can lie outside the ellipsoid (a ragged outline), as a fraction of its radius. */
  ragged?: number;
  /**
   * Leaves only in the clump's outer shell, from this fraction of its radius out (0: through the whole clump). A
   * crown seen from above through the gaps of sprays shows its far side, not leaves packed inside it that would
   * only be drawn and drawn over.
   */
  shell?: number;
}

const VERTEX = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  ${GLSL_FIELD_SUN}
  ${GLSL_AIR}
  ${GLSL_SUNLIGHT}
  attribute vec4 aLeaf;
  attribute vec4 aNrm;
  attribute vec4 aRand;
  uniform float uTime;
  uniform float uSway;
  uniform float uCanopy;
  varying vec3 vWorld;
  varying vec3 vN;
  varying float vDepth;
  varying float vShade;
  varying float vSun;
  varying float vSky;
  varying vec2 vLocal;
  // The air, worked out per vertex: haze changes slowly across a blade or a leaf.
  varying float vAirT;
  varying vec3 vAirGlow;
  void main() {
    vLocal = position.xy;
    float a = aRand.x * 6.2832;
    float b = (aRand.y - 0.5) * 2.4;
    vec3 t = vec3(cos(a), 0.0, sin(a));
    vec3 u = normalize(vec3(-sin(a) * sin(b), cos(b), cos(a) * sin(b)));
    vec3 local = (t * position.x + u * position.y) * aLeaf.w;
    vec3 c = aLeaf.xyz;
    // A breath of wind: the outer leaves move, the inner ones less.
    float w = sin(uTime * 1.3 + aRand.z * 6.28 + c.x * 0.2) * uSway * aNrm.w;
    c.x += w;
    c.z += w * 0.6;
    vec3 world = c + local;
    vWorld = world;
    vN = aNrm.xyz;
    vDepth = aNrm.w;
    vShade = aRand.w;
    // Light read once per leaf, at the leaf.
    vSun = uCanopy > 0.5 ? sunCanopy(aLeaf.xyz) : sunGround(aLeaf.xz);
    vSky = skyGround(aLeaf.xz);
    vAirT = airTransmittance(world);
    vAirGlow = airGlow(normalize(world - cameraPosition)) * (1.0 - vAirT);
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  ${GLSL_FIELD_SUN}
  ${GLSL_AIR}
  uniform vec3 uSkyCol;
  uniform vec3 uLeafA;
  uniform vec3 uLeafB;
  uniform vec3 uLeafLit;
  uniform float uTrans;
  uniform float uDim;
  uniform float uDepthShade;
  varying vec3 vWorld;
  varying vec3 vN;
  varying float vDepth;
  varying float vShade;
  varying float vSun;
  varying float vSky;
  varying vec2 vLocal;
  varying float vAirT;
  varying vec3 vAirGlow;
  void main() {
    #ifdef SPRAY
      // A spray: small leaves on the disc inside the card, on a jittered grid, each turned its own way, each its
      // own size and shape, some missing.
      vec2 c = vLocal - vec2(0.0, 0.01);
      if (dot(c, c) > 0.096) discard;
      vec2 g = c / 0.14;
      vec2 cell = floor(g + 0.5);
      vec2 f = g - cell;
      // One hash per leaf; its other choices are taken from it.
      float h = hash12(cell * 7.13 + vShade * 91.7);
      float k = fract(h * 13.71);
      if (k < 0.16) discard;
      vec2 jit = fract(vec2(h * 37.13, h * 71.37)) - 0.5;
      float a = h * 6.2832;
      vec2 q = mat2(cos(a), sin(a), -sin(a), cos(a)) * (f - jit * 0.3);
      if (length(q * vec2(1.0, 1.35 + 0.9 * k)) > 0.4 + 0.2 * k) discard;
      float sub = 0.68 + 0.6 * h;
    #else
      // A leaf, not a triangle: the card is cut to a rounded, slightly ragged blade inside it.
      vec2 l = (vLocal - vec2(0.0, 0.04)) * vec2(1.0, 0.92);
      float edge = 0.31 + 0.05 * sin(atan(l.y, l.x) * 5.0 + vShade * 20.0);
      if (length(l) > edge) discard;
    #endif
    vec3 n = normalize(vN);
    vec3 albedo = mix(uLeafA, uLeafB, vShade);
    #ifdef SPRAY
      // Each leaf of a spray its own shade, and a little its own hue: some yellower, some bluer.
      albedo *= sub * mix(vec3(1.08, 1.02, 0.82), vec3(0.88, 1.0, 1.1), fract(sub * 7.3));
    #endif
    float ndl = dot(n, uSunDir);
    float wrap = clamp((ndl + 0.35) / 1.35, 0.0, 1.0);
    // Leaves inside the clump: less sun, less sky; and, where asked, the clump's underside in its own shade.
    float outer = mix(0.35, 1.0, vDepth);
    float skyOuter = outer;
    #ifdef DEPTH_SHADE
      outer *= mix(1.0, mix(0.4, 1.0, smoothstep(-0.55, 0.45, n.y)) * mix(0.62, 1.0, smoothstep(0.55, 0.95, vDepth)), uDepthShade);
      skyOuter = mix(outer, max(outer, 0.55), uDepthShade);
    #endif
    vec3 V = normalize(vWorld - cameraPosition);
    float through = pow(max(dot(V, uSunDir), 0.0), 3.0) * (0.4 + 0.6 * vDepth);
    vec3 light = uSunCol * vSun * (wrap * wrap * outer + through * uTrans);
    light += uSkyCol * vSky * (0.45 + 0.55 * clamp(n.y * 0.5 + 0.5, 0.0, 1.0)) * skyOuter;
    vec3 col = albedo * light;
    col += uLeafLit * uSunCol * vSun * through * uTrans * 0.15;
    col *= 1.0 - uDim;
    col = col * vAirT + vAirGlow;
    gl_FragColor = vec4(col, 1.0);
  }
`;

/** The leaves of a list of clumps, as one instanced geometry (one triangle per leaf). */
export function foliageGeometry(clumps: Clump[], o: FoliageOptions): THREE.InstancedBufferGeometry {
  const rand = seededRandom(o.seed ?? 5);
  const total = clumps.reduce((n, c) => n + c.leaves, 0);
  const leaf = new Float32Array(total * 4);
  const nrm = new Float32Array(total * 4);
  const rnd = new Float32Array(total * 4);
  const ragged = o.ragged ?? 0.15;
  const shell = o.shell ?? 0;
  let k = 0;
  for (const c of clumps) {
    for (let i = 0; i < c.leaves; i++) {
      // A point in the unit ball, denser toward the surface (that is where a clump's leaves are).
      let x = 0;
      let y = 0;
      let z = 0;
      let d = 2;
      while (d > 1) {
        x = rand() * 2 - 1;
        y = rand() * 2 - 1;
        z = rand() * 2 - 1;
        d = x * x + y * y + z * z;
      }
      const r = (shell + (1 - shell) * Math.pow(Math.sqrt(d), 0.45)) * (1 + (rand() - 0.5) * ragged * 2);
      const len = Math.max(1e-4, Math.sqrt(d));
      const ux = x / len;
      const uy = y / len;
      const uz = z / len;
      const px = c.x + ux * r * c.rx;
      const py = c.y + uy * r * c.ry;
      const pz = c.z + uz * r * c.rz;
      // The clump's normal at this point (of the ellipsoid through it).
      let nx = ux / c.rx;
      let ny = uy / c.ry;
      let nz = uz / c.rz;
      const nl = Math.hypot(nx, ny, nz) || 1;
      nx /= nl;
      ny /= nl;
      nz /= nl;
      // Cut to a rounded leaf (the fragment shader), a card covers about half its triangle: drawn larger to match.
      leaf.set([px, py, pz, (c.size ?? o.size) * 1.4 * (0.7 + rand() * 0.6)], k * 4);
      nrm.set([nx, ny, nz, Math.min(1, r)], k * 4);
      rnd.set([rand(), rand(), rand(), rand()], k * 4);
      k++;
    }
  }
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.3, 0, 0.5, -0.3, 0, 0, 0.7, 0], 3));
  g.setAttribute('aLeaf', new THREE.InstancedBufferAttribute(leaf, 4));
  g.setAttribute('aNrm', new THREE.InstancedBufferAttribute(nrm, 4));
  g.setAttribute('aRand', new THREE.InstancedBufferAttribute(rnd, 4));
  g.instanceCount = total;
  return g;
}

export interface FoliageLook {
  leafA: THREE.Vector3;
  leafB: THREE.Vector3;
  /** What colour light coming through a leaf takes. */
  leafLit: THREE.Vector3;
  translucency: number;
  skyCol: THREE.Vector3;
  sway?: number;
  /** Read the sun at the top of the world's canopy band rather than the solid (crowns above open air). */
  canopy?: boolean;
  /** Each card a spray of small leaves (crowns seen from far off or above). */
  spray?: boolean;
  /** 0 → 1: how strongly a clump shades its own underside and interior. */
  depthShade?: number;
}

export function foliageMaterial(uniforms: Record<string, THREE.IUniform>, look: FoliageLook): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      ...uniforms,
      uSkyCol: { value: look.skyCol },
      uLeafA: { value: look.leafA },
      uLeafB: { value: look.leafB },
      uLeafLit: { value: look.leafLit },
      uTrans: { value: look.translucency },
      uTime: { value: 0 },
      uSway: { value: look.sway ?? 0.04 },
      uCanopy: { value: look.canopy ? 1 : 0 },
      uDim: { value: 0 },
      uDepthShade: { value: look.depthShade ?? 0 },
    },
    // Compiled in only where asked, so the scrub, riverine trees and tree lines keep exactly their own shader.
    defines: { ...(look.spray ? { SPRAY: '' } : {}), ...(look.depthShade ? { DEPTH_SHADE: '' } : {}) },
    side: THREE.DoubleSide,
  });
}

export function foliageMesh(geometry: THREE.InstancedBufferGeometry, material: THREE.ShaderMaterial): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
}
