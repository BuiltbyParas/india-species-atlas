import * as THREE from 'three';
import { GLSL_HASH, GLSL_NOISE } from '../../gl/chunks';
import { GLSL_AIR, GLSL_FIELD_SUN } from './air';
import { GLSL_SUNLIGHT } from './sunlight';

/**
 * The animal: a photograph standing in a drawn world, lit by that world's light.
 *
 * Every field study shows its species as a licensed photograph — cut out where a clean cut exists, otherwise a
 * soft-edged crop — on an upright card in the world. A photograph carries the light it was taken in; here it is
 * given the world's as well, the same way for all five:
 *
 *   - the sky's light and the sun's, read from the world's sun grid where the animal stands, so an animal in the
 *     shadow of a ridge or a tree is in that shadow, and one in the open takes the sun;
 *   - half of the light's colour (the eye and the photographer's camera both adapt), so the fur keeps its own;
 *   - a rim where the cut's edge faces the sun, strongest when the sun is behind the animal — what a low sun does
 *     to fur and feathers — worked out from the cut's own outline (the alpha's gradient), not drawn by hand;
 *   - the feet darkened where they meet the ground;
 *   - the same air as the ground around it.
 *
 * The card turns toward the camera up to `turn` radians and gives way when seen steeply from above, where a
 * photograph would read as a picture. Its shadow is cast by the world (the world stamps the animal's bulk into its
 * sun grid), so it falls the way every other shadow does.
 */

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  ${GLSL_FIELD_SUN}
  ${GLSL_AIR}
  ${GLSL_SUNLIGHT}
  uniform sampler2D uMap;
  uniform vec2 uTexel;
  uniform vec3 uSkyCol;
  uniform vec3 uSubject;
  uniform float uFacing;
  uniform vec2 uSunUv;
  uniform float uRim;
  uniform float uGain;
  uniform float uKeep;
  uniform float uFade;
  uniform float uVeil;
  uniform float uFoot;
  uniform float uFootCut;
  uniform vec3 uMud;
  uniform float uMudHeight;
  uniform float uReach;
  varying vec2 vUv;
  varying vec3 vWorld;
  float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
  void main() {
    vec4 t = texture2D(uMap, vUv);
    float a = smoothstep(0.08, 0.7, t.a) * smoothstep(0.0, uFootCut, vUv.y);
    // The animal writes depth where it is solid, so the air in front of it (a forest's shafts) is measured to it.
    if (a * uFade < 0.3) discard;
    // The outline's outward direction, from the cut's own alpha.
    vec2 d = uTexel * 3.0;
    float gx = texture2D(uMap, vUv + vec2(d.x, 0.0)).a - texture2D(uMap, vUv - vec2(d.x, 0.0)).a;
    float gy = texture2D(uMap, vUv + vec2(0.0, d.y)).a - texture2D(uMap, vUv - vec2(0.0, d.y)).a;
    vec2 g = vec2(gx, gy);
    float edge = clamp(length(g) * 1.2, 0.0, 1.0);
    vec2 outward = -g / max(length(g), 1e-4);

    // The light that reaches the ground just sunward of the animal's own bulk (which stands in the world's grid):
    // whatever shades that ground — a ridge, a tree, a stand of grass — shades the animal.
    vec2 toward = normalize(uSunDir.xz + 1e-5) * uReach;
    float sun = sunGround(uSubject.xz + toward);
    vec3 light = uSkyCol + uSunCol * sun * uFacing;
    vec3 col = t.rgb * mix(light, vec3(lum(light)), uKeep) * uGain;
    // Mud on the legs and underside, drying upward.
    col = mix(col, col * uMud, 1.0 - smoothstep(0.04, uMudHeight, vUv.y));
    // The rim: the outline facing the sun catches it.
    float rim = edge * max(dot(outward, normalize(uSunUv + 1e-5)), 0.0) * length(uSunUv) * sun;
    col += uSunCol * rim * uRim * (0.35 + 0.65 * lum(t.rgb));
    // Where the feet meet the ground, less light reaches.
    col *= mix(0.5, 1.0, smoothstep(0.0, uFoot, vUv.y));
    col = applyAir(col, vWorld);
    gl_FragColor = vec4(col, a * uFade * (1.0 - uVeil));
  }
`;

export interface SubjectOptions {
  texture: THREE.Texture;
  /** Width of the card in world units; height follows the picture. */
  width: number;
  /** Where the card stands: the point under the picture's feet. */
  at: THREE.Vector3;
  /** uv height of the feet in the picture (the card is set so they meet the ground). */
  feet: number;
  /** The world's light: its sun and air uniforms and its sun grid's. */
  uniforms: Record<string, THREE.IUniform>;
  skyCol: THREE.Vector3;
  /** How far the card may turn toward the camera, radians (0: it never turns). */
  turn?: number;
  /** The direction the card faces when it has not turned. */
  facing?: THREE.Vector3;
  /** Elevations (sine) over which the card gives way when seen from above. */
  fadeAbove?: [number, number];
  gain?: number;
  keep?: number;
  rim?: number;
  /** uv height of the darkening at the feet, and of the alpha cut-off at the very bottom. */
  foot?: number;
  footCut?: number;
  mud?: THREE.Vector3;
  mudHeight?: number;
  /** Read the light on the ground this far toward the sun from the card's middle, clear of the animal's own bulk in the grid. */
  lightReach?: number;
}

export class Subject {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;
  readonly height: number;
  private readonly facing: THREE.Vector3;
  private readonly o: SubjectOptions;
  private readonly normal = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly tmp = new THREE.Vector3();

  constructor(o: SubjectOptions) {
    this.o = o;
    const img = o.texture.image as { width: number; height: number };
    this.height = (o.width * img.height) / img.width;
    this.facing = (o.facing ?? new THREE.Vector3(0, 0, 1)).clone().setY(0).normalize();
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        ...o.uniforms,
        uMap: { value: o.texture },
        uTexel: { value: new THREE.Vector2(1 / img.width, 1 / img.height) },
        uSkyCol: { value: o.skyCol },
        uSubject: { value: new THREE.Vector3(o.at.x, o.at.y + this.height * 0.45, o.at.z) },
        uFacing: { value: 0.5 },
        uSunUv: { value: new THREE.Vector2(1, 0) },
        uRim: { value: o.rim ?? 1.2 },
        uGain: { value: o.gain ?? 1.2 },
        uKeep: { value: o.keep ?? 0.45 },
        uFade: { value: 1 },
        uVeil: { value: 0 },
        uFoot: { value: o.foot ?? 0.12 },
        uFootCut: { value: o.footCut ?? 0.0001 },
        uMud: { value: o.mud ?? new THREE.Vector3(1, 1, 1) },
        uMudHeight: { value: o.mudHeight ?? 0.3 },
        uReach: { value: o.lightReach ?? 0 },
      },
      transparent: true,
      depthWrite: true,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(o.width, this.height), this.material);
    this.mesh.position.set(o.at.x, o.at.y - this.height * o.feet + this.height * 0.5, o.at.z);
    this.mesh.lookAt(this.tmp.copy(this.mesh.position).add(this.facing));
    this.mesh.renderOrder = 3;
  }

  /** Step back while the study's footage is open over the world (world/field/plateVeil.ts): 0 stands, 1 gone. */
  setVeil(v: number) {
    this.material.uniforms.uVeil.value = v;
  }

  /** Turn toward the camera, give way from above, and take the sun's direction for the facing light and rim. */
  update(camera: THREE.Camera, sunDir: THREE.Vector3) {
    const o = this.o;
    const toCam = this.tmp.copy(camera.position).sub(this.mesh.position);
    const dist = Math.max(1e-3, toCam.length());
    if (o.turn) {
      const base = Math.atan2(this.facing.x, this.facing.z);
      let want = Math.atan2(toCam.x, toCam.z) - base;
      want = Math.atan2(Math.sin(want), Math.cos(want));
      this.mesh.rotation.set(0, base + THREE.MathUtils.clamp(want, -o.turn, o.turn), 0);
    }
    const [f0, f1] = o.fadeAbove ?? [0.45, 0.75];
    const fade = 1 - THREE.MathUtils.smoothstep(toCam.y / dist, f0, f1);
    this.material.uniforms.uFade.value = fade;
    this.mesh.visible = fade > 0.01;

    // The card's normal and right, level.
    this.normal.set(0, 0, 1).applyQuaternion(this.mesh.quaternion).setY(0).normalize();
    this.right.set(1, 0, 0).applyQuaternion(this.mesh.quaternion).setY(0).normalize();
    const horiz = Math.hypot(sunDir.x, sunDir.z);
    const sx = sunDir.x / Math.max(horiz, 1e-4);
    const sz = sunDir.z / Math.max(horiz, 1e-4);
    const front = this.normal.x * sx + this.normal.z * sz;
    // A body, not a sheet: lit across about half its surface by a side light, a little more from the front.
    this.material.uniforms.uFacing.value = (0.32 + 0.4 * Math.max(front, 0) + 0.12 * Math.max(-front, 0)) * horiz + 0.5 * Math.max(sunDir.y, 0);
    // The sun in the card's own plane, for the rim: stronger the more it is behind the animal.
    const across = this.right.x * sx + this.right.z * sz;
    const strength = (0.35 + 0.9 * Math.max(-front, 0)) * horiz;
    this.material.uniforms.uSunUv.value.set(across, sunDir.y * 0.6 + 0.15).normalize().multiplyScalar(strength);
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
