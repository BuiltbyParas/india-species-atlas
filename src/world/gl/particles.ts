import * as THREE from 'three';
import { particleBudget } from '../quality';

/**
 * Sparse atmosphere: stars, dust, snow, motes.
 *
 * One cheap primitive for every scene that needs air — a `THREE.Points` cloud
 * with a per-point size and alpha, soft round sprites, additive, no depth
 * write, one draw call. Particles here are atmosphere, never the subject:
 * counts go through the quality tier (`particleBudget`), the cloud is
 * positioned once and moved as a whole by its scene, and nothing about it is
 * simulated per point on the CPU.
 *
 * Disposal is the caller's: `geometry.dispose()` and `material.dispose()`
 * with the rest of its scene.
 */
const VERTEX = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  uniform float uPixelRatio;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float mask = 1.0 - smoothstep(0.14, 0.5, d);
    if (mask <= 0.001) discard;
    gl_FragColor = vec4(uColor, mask * uOpacity * vAlpha);
  }
`;

export interface PointCloud {
  points: THREE.Points;
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
}

export function makePointCloud(
  positions: Float32Array,
  sizes: Float32Array,
  alphas: Float32Array,
  color: string,
  pixelRatio: number,
): PointCloud {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uOpacity: { value: 1 },
      uColor: { value: new THREE.Color(color) },
      uPixelRatio: { value: pixelRatio },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return { points: new THREE.Points(geometry, material), geometry, material };
}

/** How many of `count` particles to place on this device. */
export { particleBudget };

/** Deterministic pseudo-random, so a field is identical on every load. */
export function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}
