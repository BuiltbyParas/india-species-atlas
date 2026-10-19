import * as THREE from 'three';
import { rgb } from './color';
import { seededRandom } from '../../gl/particles';

/**
 * Air that moves: dust across the Thar, snow on the high slopes, motes in a
 * forest's light, silt on a river.
 *
 * `world/gl/particles.ts` places still atmosphere. This is the same soft
 * sprite with one addition: the whole field drifts with a wind, every point
 * wrapping inside its box, computed in the vertex shader from time. Nothing
 * is simulated on the CPU and nothing is uploaded per frame — one uniform
 * moves thousands of points. Counts come from the caller, already passed
 * through the quality tier's particle budget.
 *
 * `light` makes a field visible only near a point (the forest's lantern): the
 * motes are there all along, and the light finds them.
 */
const VERTEX = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute float aPhase;
  uniform float uTime;
  uniform vec3 uWind;
  uniform vec3 uBoxMin;
  uniform vec3 uBoxSize;
  uniform float uSway;
  uniform float uPixelRatio;
  uniform float uScale;
  uniform vec3 uLight;
  uniform float uLightRadius;
  varying float vAlpha;
  void main() {
    vec3 p = position + uWind * uTime;
    p.x += sin(uTime * 0.6 + aPhase * 6.28) * uSway;
    p.y += cos(uTime * 0.45 + aPhase * 4.0) * uSway * 0.5;
    p = mod(p - uBoxMin, uBoxSize) + uBoxMin;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float lit = 1.0 - smoothstep(uLightRadius * 0.35, uLightRadius, distance(p, uLight));
    vAlpha = aAlpha * lit;
    gl_PointSize = aSize * uPixelRatio * uScale / max(-mv.z, 0.5);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float mask = 1.0 - smoothstep(0.12, 0.5, d);
    if (mask * vAlpha < 0.003) discard;
    gl_FragColor = vec4(uColor, mask * vAlpha * uOpacity);
  }
`;

export interface DriftOptions {
  count: number;
  min: [number, number, number];
  max: [number, number, number];
  wind: [number, number, number];
  color: string;
  size: [number, number];
  alpha?: [number, number];
  sway?: number;
  seed?: number;
  /** Perspective size scale: a point of size 1 at distance `scale` is 1 px. */
  scale?: number;
  additive?: boolean;
}

export interface Drift {
  points: THREE.Points;
  material: THREE.ShaderMaterial;
  dispose: () => void;
}

export function makeDrift(o: DriftOptions): Drift {
  const rand = seededRandom(o.seed ?? 7);
  const n = Math.max(0, o.count);
  const pos = new Float32Array(n * 3);
  const size = new Float32Array(n);
  const alpha = new Float32Array(n);
  const phase = new Float32Array(n);
  const [a0, a1] = o.alpha ?? [0.25, 0.9];
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 3; k++) pos[i * 3 + k] = o.min[k] + rand() * (o.max[k] - o.min[k]);
    size[i] = o.size[0] + Math.pow(rand(), 2) * (o.size[1] - o.size[0]);
    alpha[i] = a0 + rand() * (a1 - a0);
    phase[i] = rand();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uTime: { value: 0 },
      uWind: { value: new THREE.Vector3(...o.wind) },
      uBoxMin: { value: new THREE.Vector3(...o.min) },
      uBoxSize: { value: new THREE.Vector3(o.max[0] - o.min[0], o.max[1] - o.min[1], o.max[2] - o.min[2]) },
      uSway: { value: o.sway ?? 0.3 },
      uPixelRatio: { value: 1 },
      uScale: { value: o.scale ?? 30 },
      uLight: { value: new THREE.Vector3() },
      uLightRadius: { value: 1e6 },
      uColor: { value: rgb(o.color) },
      uOpacity: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    blending: o.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return {
    points,
    material,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}
