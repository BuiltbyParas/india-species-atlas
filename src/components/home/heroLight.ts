/**
 * The relief's light, worked out over the elevation grid itself rather than per screen pixel.
 *
 * Two small textures, one texel per grid cell, read by the ground shader at the same uv as the heights:
 *
 * - **Sun** (r): how much of the lamp reaches the ground — a ray marched from each cell towards the lamp over the
 *   exaggerated heights, softened with distance into a penumbra. Redrawn only when the lamp moves (about 0.4 M
 *   cells × `SUN_STEPS` reads, a millisecond or two on an integrated GPU), so an idle scene pays nothing.
 * - **Sky** (r): how much of the sky a cell sees — the horizon found in eight directions, averaged. The ground
 *   never moves, so it is drawn once.
 *
 * This is a heightfield shadow, not a shadow map: it is exact for the ground the grid describes, at the grid's
 * resolution (a 4′ cell is about 7 km), and it costs the same at any screen size.
 */
import * as THREE from 'three';
import type { ReliefField } from './heroTerrain';

/** Ray steps towards the lamp; each is `SUN_GROW` times the last, so near ground is read finely and far ground coarsely. */
const SUN_STEPS = 44;
const SUN_GROW = 1.115;
/**
 * The lamp's apparent radius, as a tangent: the penumbra widens with distance from what casts it. Larger than
 * the sun's (0.27°) on purpose — the relief is a model under a lamp, and a 7 km cell cannot draw a sharper edge.
 */
const PENUMBRA = 0.022;
const SKY_DIRECTIONS = 8;
const SKY_STEPS = 12;
const SKY_GROW = 1.33;

const VERTEX = /* glsl */ `
  void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const COMMON = /* glsl */ `
  uniform sampler2D uHeight;
  uniform vec2 uSize;
  /** World units → uv: (du per world x, dv per world y). */
  uniform vec2 uUvPerWorld;
  uniform float uZPerMetre;
  uniform float uCell;
  float zAt(vec2 uv) { return max(texture2D(uHeight, uv).r, 0.0) * uZPerMetre; }
  bool outside(vec2 uv) { return uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0; }
`;

const SUN_FRAGMENT = /* glsl */ `
  ${COMMON}
  uniform vec3 uSun;
  uniform float uTop;
  void main() {
    vec2 uv = gl_FragCoord.xy / uSize;
    float z0 = zAt(uv) + uCell * 0.05;
    float across = length(uSun.xy);
    vec2 d = across > 1e-5 ? uSun.xy / across : vec2(0.0);
    float rise = uSun.z / max(across, 1e-4);
    float vis = 1.0;
    float t = uCell * 0.7;
    for (int i = 0; i < ${SUN_STEPS}; i++) {
      vec2 q = uv + d * t * uUvPerWorld;
      if (outside(q)) break;
      float ray = z0 + t * rise;
      if (ray > uTop) break;
      vis = min(vis, smoothstep(-${PENUMBRA.toFixed(4)} * t, ${PENUMBRA.toFixed(4)} * t, ray - zAt(q)));
      if (vis < 0.004) break;
      t *= ${SUN_GROW.toFixed(4)};
    }
    // A lamp below the horizon lights nothing that is not higher than everything between it and the lamp.
    gl_FragColor = vec4(vis, 0.0, 0.0, 1.0);
  }
`;

const SKY_FRAGMENT = /* glsl */ `
  ${COMMON}
  void main() {
    vec2 uv = gl_FragCoord.xy / uSize;
    float z0 = zAt(uv);
    float seen = 0.0;
    for (int k = 0; k < ${SKY_DIRECTIONS}; k++) {
      float a = (float(k) + 0.5) * ${((2 * Math.PI) / SKY_DIRECTIONS).toFixed(6)};
      vec2 d = vec2(cos(a), sin(a));
      float slope = 0.0;
      float t = uCell;
      for (int i = 0; i < ${SKY_STEPS}; i++) {
        vec2 q = uv + d * t * uUvPerWorld;
        if (outside(q)) break;
        slope = max(slope, (zAt(q) - z0) / t);
        t *= ${SKY_GROW.toFixed(3)};
      }
      // The sine of the horizon's elevation: the share of this direction's sky the ground hides.
      seen += 1.0 - slope / sqrt(1.0 + slope * slope);
    }
    gl_FragColor = vec4(seen / ${SKY_DIRECTIONS.toFixed(1)}, 0.0, 0.0, 1.0);
  }
`;

export interface ReliefLight {
  /** r: the lamp's visibility per cell. */
  sun: THREE.Texture;
  /** r: the sky's visibility per cell. */
  sky: THREE.Texture;
  /** Redraws the sun texture if the lamp (world direction towards it) has moved; true when it did. */
  update: (towardsLamp: THREE.Vector3) => boolean;
  dispose: () => void;
}

export function createReliefLight(renderer: THREE.WebGLRenderer, relief: ReliefField): ReliefLight {
  const { x: width, y: height } = relief.size;
  // The sun is worked out at half the grid's resolution (two cells to a texel): its penumbra is wider than that
  // wherever a shadow is long enough to see, and it is redrawn whenever the lamp moves — a quarter of the work.
  const sunWidth = Math.ceil(width / 2);
  const sunHeight = Math.ceil(height / 2);
  const target = (w: number, h: number) =>
    new THREE.WebGLRenderTarget(w, h, {
      type: THREE.UnsignedByteType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      generateMipmaps: false,
    });
  const sunTarget = target(sunWidth, sunHeight);
  const skyTarget = target(width, height);
  const uniforms = {
    uHeight: { value: relief.heightTexture },
    uSize: { value: new THREE.Vector2(width, height) },
    uUvPerWorld: { value: new THREE.Vector2(relief.uv.x, relief.uv.z) },
    uZPerMetre: { value: relief.zPerMetre },
    uCell: { value: Math.min(relief.cell.x, relief.cell.y) },
  };
  const sunMaterial = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: SUN_FRAGMENT,
    uniforms: {
      ...uniforms,
      uSize: { value: new THREE.Vector2(sunWidth, sunHeight) },
      uSun: { value: new THREE.Vector3(0, 0, 1) },
      uTop: { value: relief.peakMetres * relief.zPerMetre * 1.05 },
    },
    depthTest: false,
    depthWrite: false,
  });
  const skyMaterial = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: SKY_FRAGMENT, uniforms, depthTest: false, depthWrite: false });
  // One triangle covering the target.
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const quad = new THREE.Mesh(geometry, sunMaterial);
  quad.frustumCulled = false;
  const passScene = new THREE.Scene();
  passScene.add(quad);
  const passCamera = new THREE.Camera();

  const draw = (material: THREE.ShaderMaterial, into: THREE.WebGLRenderTarget) => {
    const previous = renderer.getRenderTarget();
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    quad.material = material;
    renderer.setRenderTarget(into);
    renderer.render(passScene, passCamera);
    renderer.setRenderTarget(previous);
    renderer.autoClear = autoClear;
  };

  draw(skyMaterial, skyTarget);
  const last = new THREE.Vector3(0, 0, -2);
  const dir = new THREE.Vector3();

  return {
    ...(import.meta.env.DEV ? { __sunTarget: sunTarget, __skyTarget: skyTarget } : {}),
    sun: sunTarget.texture,
    sky: skyTarget.texture,
    update(towardsLamp) {
      dir.copy(towardsLamp).normalize();
      // About a tenth of a degree: below that the shadows cannot visibly move.
      if (dir.dot(last) > 0.999998) return false;
      last.copy(dir);
      sunMaterial.uniforms.uSun.value.copy(dir);
      draw(sunMaterial, sunTarget);
      return true;
    },
    dispose() {
      sunTarget.dispose();
      skyTarget.dispose();
      sunMaterial.dispose();
      skyMaterial.dispose();
      geometry.dispose();
    },
  };
}
