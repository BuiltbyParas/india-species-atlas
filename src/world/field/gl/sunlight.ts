import * as THREE from 'three';

/**
 * The field worlds' sun, worked out over each world's own ground — the homepage's relief light
 * (components/home/heroLight.ts) carried into the field.
 *
 * A world describes what stands in the light as a grid seen from above:
 *
 *   solid    the height of whatever stands on the ground at each cell — the ground itself, rock, scrub, a trunk;
 *            light cannot pass below it.
 *   band     optionally, a layer of foliage held above open air (a canopy): light below and above it passes, light
 *            through it is mostly stopped. Where a cell has no foliage the band is empty (lo = hi).
 *   outer    optionally, a coarser solid grid around the first, for what stands beyond it (far ranges).
 *
 * From that, two small textures, one texel per cell, redrawn only when the sun moves (a fifth of a degree):
 *
 *   sun (r)  how much of the sun reaches the top of the solid at this cell: a ray marched towards the sun over the
 *            grid, softened with distance into a penumbra.
 *   sun (g)  the same for a point on a level plane (`plane`, the underside of a canopy) — what the air and the
 *            ground beneath a canopy receive. Equal to r where there is no plane.
 *   sun (b)  the same for the top of the canopy band, where there is one: what a crown's leaves receive.
 *   sky (r)  how much of the sky a cell sees: the horizon found in eight directions, and the canopy overhead.
 *            Drawn once.
 *
 * Shading then reads a texture instead of marching: the ground at its own cell, a blade of grass or an animal
 * where its sun ray meets the ground (`sunAbove`), the air under a canopy where its ray meets the plane
 * (`sunUnder`). This is a heightfield light, not a shadow map: exact for what the grid describes, at the grid's
 * resolution, and the same cost at any screen size.
 */

export interface SolidGrid {
  /** World rectangle: x0, z0, x1, z1 (x0 < x1, z0 < z1). */
  rect: [number, number, number, number];
  nx: number;
  nz: number;
  /** nx × nz heights, rows along x, from z0 to z1. */
  solid: Float32Array;
}

export interface LightGrid extends SolidGrid {
  bandLo?: Float32Array;
  bandHi?: Float32Array;
  /** How much of the light the band stops, 0 → 1. */
  bandDensity?: number;
  /** The level plane beneath the band (sun g). */
  plane?: number;
  outer?: SolidGrid;
}

export interface SunlightOptions {
  /** The sun's apparent radius as a tangent: how quickly a shadow's edge softens with distance. */
  penumbra?: number;
  /** Furthest a shadow is looked for, in world units. */
  reach?: number;
  steps?: number;
  /**
   * The sun's texture as a fraction of the grid's resolution. Redrawn whenever the sun moves — every scrolled
   * frame, in a world whose sun climbs through the study — so it is worked out at half the grid by default, as the
   * homepage's lamp is; its penumbra is wider than a cell wherever a shadow is long enough to see.
   */
  scale?: number;
}

const VERTEX = /* glsl */ `
  void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const COMMON = /* glsl */ `
  uniform sampler2D uGrid;
  uniform sampler2D uOuter;
  uniform vec4 uRect;
  uniform vec4 uOuterRect;
  uniform float uHasOuter;
  uniform vec2 uSize;
  vec2 gridUv(vec2 xz, vec4 r) { return (xz - r.xy) / (r.zw - r.xy); }
  bool inside(vec2 uv) { return uv.x >= 0.0 && uv.y >= 0.0 && uv.x <= 1.0 && uv.y <= 1.0; }
  // rgb: solid, band lo, band hi. Outside both grids nothing stands.
  vec3 cellAt(vec2 xz, out bool known) {
    vec2 uv = gridUv(xz, uRect);
    known = true;
    if (inside(uv)) return texture2D(uGrid, uv).rgb;
    if (uHasOuter > 0.5) {
      vec2 o = gridUv(xz, uOuterRect);
      if (inside(o)) return vec3(texture2D(uOuter, o).r, 0.0, 0.0);
    }
    known = false;
    return vec3(-1e5, 0.0, 0.0);
  }
`;

function sunFragment(steps: number) {
  return /* glsl */ `
  ${COMMON}
  uniform vec3 uSun;
  uniform float uCell;
  uniform float uPenumbra;
  uniform float uReach;
  uniform float uDensity;
  uniform float uPlane;
  uniform float uTop;
  float march(vec2 xz, float y0, bool bandOnly) {
    float across = length(uSun.xz);
    vec2 d = across > 1e-5 ? uSun.xz / across : vec2(0.0);
    float rise = uSun.y / max(across, 1e-4);
    float vis = 1.0;
    float t = uCell * 0.75;
    float grow = pow(uReach / (uCell * 0.75), 1.0 / ${steps.toFixed(1)});
    for (int i = 0; i < ${steps}; i++) {
      vec2 q = xz + d * t;
      bool known;
      vec3 c = cellAt(q, known);
      if (!known) break;
      float ray = y0 + t * rise;
      if (ray > uTop) break;
      float pen = uPenumbra * t + uCell * 0.25;
      if (!bandOnly || c.r > uPlane) vis = min(vis, smoothstep(-pen, pen, ray - c.r));
      // Foliage: a ray that runs through the band loses most of its light, unevenly.
      float thick = c.b - c.g;
      if (thick > 0.01) {
        float inBand = smoothstep(c.g - pen, c.g + pen, ray) * (1.0 - smoothstep(c.b - pen, c.b + pen, ray));
        vis = min(vis, 1.0 - uDensity * inBand);
      }
      if (vis < 0.004) break;
      t *= grow;
    }
    return vis;
  }
  void main() {
    vec2 uv = gl_FragCoord.xy / uSize;
    vec2 xz = mix(uRect.xy, uRect.zw, uv);
    vec3 c = texture2D(uGrid, uv).rgb;
    float ground = march(xz, c.r + uCell * 0.08, false);
    float under = uPlane > -1e4 ? march(xz, uPlane, true) : ground;
    // The top of a canopy, where there is one: what a crown's upper leaves receive.
    float crown = c.b - c.g > 0.01 ? march(xz, c.b + uCell * 0.08, false) : ground;
    // A sun below the horizon lights nothing.
    float up = smoothstep(-0.02, 0.02, uSun.y);
    gl_FragColor = vec4(ground * up, under * up, crown * up, 1.0);
  }
`;
}

const SKY_FRAGMENT = /* glsl */ `
  ${COMMON}
  uniform float uCell;
  uniform float uDensity;
  void main() {
    vec2 uv = gl_FragCoord.xy / uSize;
    vec2 xz = mix(uRect.xy, uRect.zw, uv);
    vec3 c0 = texture2D(uGrid, uv).rgb;
    float z0 = c0.r;
    float seen = 0.0;
    for (int k = 0; k < 8; k++) {
      float a = (float(k) + 0.5) * 0.785398;
      vec2 d = vec2(cos(a), sin(a));
      float slope = 0.0;
      float t = uCell;
      for (int i = 0; i < 12; i++) {
        bool known;
        vec3 c = cellAt(xz + d * t, known);
        if (!known) break;
        slope = max(slope, (c.r - z0) / t);
        t *= 1.42;
      }
      seen += 1.0 - slope / sqrt(1.0 + slope * slope);
    }
    seen /= 8.0;
    // Under foliage much of the sky is leaves.
    float cover = step(0.01, c0.b - c0.g) * step(z0 + 0.5, c0.g);
    seen *= 1.0 - cover * uDensity * 0.7;
    gl_FragColor = vec4(seen, 0.0, 0.0, 1.0);
  }
`;

/**
 * GLSL for the shaders that receive the sun. Needs the uniforms `Sunlight.uniforms` provides, and `uSunDir`
 * (GLSL_FIELD_SUN, gl/air.ts) declared before it.
 */
export const GLSL_SUNLIGHT = /* glsl */ `
  uniform sampler2D uSunVis;
  uniform sampler2D uSkyVis;
  uniform sampler2D uSolid;
  uniform vec4 uLightRect;
  uniform float uLightPlane;
  // A coarser grid over the whole ground, read beyond the fine one (Sunlight.withFar).
  uniform sampler2D uSunVisFar;
  uniform sampler2D uSkyVisFar;
  uniform vec4 uLightRectFar;
  uniform float uHasFar;
  vec2 lightUv(vec2 xz) { return (xz - uLightRect.xy) / (uLightRect.zw - uLightRect.xy); }
  vec2 lightUvFar(vec2 xz) { return (xz - uLightRectFar.xy) / (uLightRectFar.zw - uLightRectFar.xy); }
  // Beyond a grid the light is open: fade to it over the outer twentieth.
  float lightEdge(vec2 uv) {
    vec2 e = min(uv, 1.0 - uv);
    return smoothstep(0.0, 0.05, min(e.x, e.y));
  }
  float sunFar(vec2 xz) {
    if (uHasFar < 0.5) return 1.0;
    vec2 uv = lightUvFar(xz);
    return mix(1.0, texture2D(uSunVisFar, clamp(uv, 0.0, 1.0)).r, lightEdge(uv));
  }
  float skyFar(vec2 xz) {
    if (uHasFar < 0.5) return 1.0;
    vec2 uv = lightUvFar(xz);
    return mix(1.0, texture2D(uSkyVisFar, clamp(uv, 0.0, 1.0)).r, lightEdge(uv));
  }
  float sunGround(vec2 xz) {
    vec2 uv = lightUv(xz);
    return mix(sunFar(xz), texture2D(uSunVis, clamp(uv, 0.0, 1.0)).r, lightEdge(uv));
  }
  float skyGround(vec2 xz) {
    vec2 uv = lightUv(xz);
    return mix(skyFar(xz), texture2D(uSkyVis, clamp(uv, 0.0, 1.0)).r, lightEdge(uv));
  }
  // Four taps half a cell apart: for a surface the camera comes close to, where one cell spans many pixels.
  float sunGroundSoft(vec2 xz) {
    vec2 c = (uLightRect.zw - uLightRect.xy) / vec2(textureSize(uSunVis, 0));
    return 0.25 * (sunGround(xz + c * vec2(-0.5, -0.5)) + sunGround(xz + c * vec2(0.5, -0.5)) + sunGround(xz + c * vec2(-0.5, 0.5)) + sunGround(xz + c * vec2(0.5, 0.5)));
  }
  float solidAt(vec2 xz) { return texture2D(uSolid, clamp(lightUv(xz), 0.0, 1.0)).r; }
  // A point above the solid (a blade's tip, an animal's back): where its ray from the sun meets the solid.
  float sunAbove(vec3 p) {
    float above = max(p.y - solidAt(p.xz), 0.0);
    return sunGround(p.xz - uSunDir.xz / max(uSunDir.y, 0.05) * above);
  }
  // A leaf of a crown held above open air: the sun at the top of the band, at its cell.
  float sunCanopy(vec3 p) {
    vec2 uv = lightUv(p.xz);
    return mix(sunFar(p.xz), texture2D(uSunVis, clamp(uv, 0.0, 1.0)).b, lightEdge(uv));
  }
  // A point beneath the canopy plane (the air, the forest floor): where its ray to the sun crosses the plane.
  float sunUnder(vec3 p) {
    vec2 q = p.xz + uSunDir.xz / max(uSunDir.y, 0.05) * (uLightPlane - p.y);
    vec2 uv = lightUv(q);
    return mix(1.0, texture2D(uSunVis, clamp(uv, 0.0, 1.0)).g, lightEdge(uv));
  }
`;

function floatTexture(data: Float32Array, nx: number, nz: number, channels: 1 | 4) {
  const half = new Uint16Array(data.length);
  for (let i = 0; i < data.length; i++) half[i] = THREE.DataUtils.toHalfFloat(data[i]);
  const tex = new THREE.DataTexture(half, nx, nz, channels === 4 ? THREE.RGBAFormat : THREE.RedFormat, THREE.HalfFloatType);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

export class Sunlight {
  /** Spread into a receiving material's uniforms (with GLSL_SUNLIGHT in its fragment shader). */
  readonly uniforms: {
    uSunVis: { value: THREE.Texture };
    uSkyVis: { value: THREE.Texture };
    uSolid: { value: THREE.Texture };
    uLightRect: { value: THREE.Vector4 };
    uLightPlane: { value: number };
    uSunVisFar: { value: THREE.Texture };
    uSkyVisFar: { value: THREE.Texture };
    uLightRectFar: { value: THREE.Vector4 };
    uHasFar: { value: number };
  };
  private readonly sunTarget: THREE.WebGLRenderTarget;
  private readonly skyTarget: THREE.WebGLRenderTarget;
  private readonly grid: THREE.DataTexture;
  private readonly solidTex: THREE.DataTexture;
  private readonly outerTex: THREE.DataTexture | null;
  private readonly sunMat: THREE.ShaderMaterial;
  private readonly skyMat: THREE.ShaderMaterial;
  private readonly quad: THREE.Mesh;
  private readonly passScene = new THREE.Scene();
  private readonly passCamera = new THREE.Camera();
  private readonly last = new THREE.Vector3(0, -2, 0);
  private readonly dir = new THREE.Vector3();
  private skyDrawn = false;

  constructor(spec: LightGrid, o: SunlightOptions = {}) {
    const { nx, nz, rect } = spec;
    const rgba = new Float32Array(nx * nz * 4);
    let top = -Infinity;
    for (let i = 0; i < nx * nz; i++) {
      rgba[i * 4] = spec.solid[i];
      rgba[i * 4 + 1] = spec.bandLo?.[i] ?? 0;
      rgba[i * 4 + 2] = spec.bandHi?.[i] ?? 0;
      top = Math.max(top, spec.solid[i], spec.bandHi?.[i] ?? -Infinity);
    }
    if (spec.outer) for (const v of spec.outer.solid) top = Math.max(top, v);
    this.grid = floatTexture(rgba, nx, nz, 4);
    this.solidTex = floatTexture(spec.solid, nx, nz, 1);
    this.outerTex = spec.outer ? floatTexture(spec.outer.solid, spec.outer.nx, spec.outer.nz, 1) : null;
    const target = (w: number, h: number) =>
      new THREE.WebGLRenderTarget(w, h, {
        type: THREE.UnsignedByteType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        depthBuffer: false,
        generateMipmaps: false,
      });
    const k = o.scale ?? 0.5;
    const sx = Math.max(2, Math.round(nx * k));
    const sz = Math.max(2, Math.round(nz * k));
    this.sunTarget = target(sx, sz);
    this.skyTarget = target(nx, nz);
    const cell = Math.min((rect[2] - rect[0]) / nx, (rect[3] - rect[1]) / nz);
    const common = {
      uGrid: { value: this.grid },
      uOuter: { value: this.outerTex ?? this.grid },
      uRect: { value: new THREE.Vector4(...rect) },
      uOuterRect: { value: new THREE.Vector4(...(spec.outer?.rect ?? rect)) },
      uHasOuter: { value: spec.outer ? 1 : 0 },
      uSize: { value: new THREE.Vector2(nx, nz) },
      uCell: { value: cell },
      uDensity: { value: spec.bandDensity ?? 0.85 },
    };
    const steps = o.steps ?? 34;
    this.sunMat = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: sunFragment(steps),
      uniforms: {
        ...common,
        uSize: { value: new THREE.Vector2(sx, sz) },
        uSun: { value: new THREE.Vector3(0, 1, 0) },
        uPenumbra: { value: o.penumbra ?? 0.012 },
        uReach: { value: o.reach ?? Math.max(rect[2] - rect[0], rect[3] - rect[1]) },
        uPlane: { value: spec.plane ?? -1e5 },
        uTop: { value: top + 1 },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.skyMat = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: SKY_FRAGMENT, uniforms: common, depthTest: false, depthWrite: false });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    this.quad = new THREE.Mesh(geometry, this.sunMat);
    this.quad.frustumCulled = false;
    this.passScene.add(this.quad);
    this.uniforms = {
      uSunVis: { value: this.sunTarget.texture },
      uSkyVis: { value: this.skyTarget.texture },
      uSolid: { value: this.solidTex },
      uLightRect: { value: new THREE.Vector4(...rect) },
      uLightPlane: { value: spec.plane ?? -1e5 },
      uSunVisFar: { value: this.sunTarget.texture },
      uSkyVisFar: { value: this.skyTarget.texture },
      uLightRectFar: { value: new THREE.Vector4(...rect) },
      uHasFar: { value: 0 },
    };
  }

  /** This grid's uniforms, read beyond its rectangle from `far`'s. */
  withFar(far: Sunlight) {
    return {
      ...this.uniforms,
      uSunVisFar: far.uniforms.uSunVis,
      uSkyVisFar: far.uniforms.uSkyVis,
      uLightRectFar: far.uniforms.uLightRect,
      uHasFar: { value: 1 },
    };
  }

  private draw(renderer: THREE.WebGLRenderer, material: THREE.ShaderMaterial, into: THREE.WebGLRenderTarget) {
    const previous = renderer.getRenderTarget();
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    this.quad.material = material;
    renderer.setRenderTarget(into);
    renderer.render(this.passScene, this.passCamera);
    renderer.setRenderTarget(previous);
    renderer.autoClear = autoClear;
  }

  /** Redraw the sun's texture if the sun (a direction towards it) has moved; call from the world's prerender. */
  update(renderer: THREE.WebGLRenderer, towardsSun: THREE.Vector3): boolean {
    if (!this.skyDrawn) {
      this.draw(renderer, this.skyMat, this.skyTarget);
      this.skyDrawn = true;
    }
    const dir = this.dir.copy(towardsSun).normalize();
    // A fifth of a degree: below that a shadow cannot visibly move, and a sun that drifts with the scroll would
    // otherwise be re-marched on every frame of it.
    if (dir.dot(this.last) > 0.9999939) return false;
    this.last.copy(dir);
    this.sunMat.uniforms.uSun.value.copy(dir);
    this.draw(renderer, this.sunMat, this.sunTarget);
    return true;
  }

  dispose() {
    this.sunTarget.dispose();
    this.skyTarget.dispose();
    this.grid.dispose();
    this.solidTex.dispose();
    this.outerTex?.dispose();
    this.sunMat.dispose();
    this.skyMat.dispose();
    this.quad.geometry.dispose();
  }
}

/** A solid grid sampled from a heightfield mesh built by gl/terrain.ts (a regular grid, rows along x). */
export function gridFromMesh(geometry: THREE.BufferGeometry, segX: number, segZ: number): SolidGrid {
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
  const nx = segX + 1;
  const nz = segZ + 1;
  const solid = new Float32Array(nx * nz);
  for (let i = 0; i < nx * nz; i++) solid[i] = pos.getY(i);
  const x0 = pos.getX(0);
  const z0 = pos.getZ(0);
  const x1 = pos.getX(nx - 1);
  const z1 = pos.getZ((nz - 1) * nx);
  return { rect: [x0, z0, x1, z1], nx, nz, solid };
}

/* ------------------------------------------------------------ stamping what stands in the light */

function cellRange(g: SolidGrid, x: number, z: number, rx: number, rz: number) {
  const [x0, z0, x1, z1] = g.rect;
  const fx = (g.nx - 1) / (x1 - x0);
  const fz = (g.nz - 1) / (z1 - z0);
  return {
    i0: Math.max(0, Math.floor((x - rx - x0) * fx)),
    i1: Math.min(g.nx - 1, Math.ceil((x + rx - x0) * fx)),
    j0: Math.max(0, Math.floor((z - rz - z0) * fz)),
    j1: Math.min(g.nz - 1, Math.ceil((z + rz - z0) * fz)),
    at: (i: number, j: number): [number, number] => [x0 + i / fx, z0 + j / fz],
  };
}

/**
 * Raise the solid over an ellipse at (x, z) to `base + height × profile`: 'dome' (a shrub, a body), 'cone' (a
 * tussock), 'column' (a trunk, a block).
 */
export function stampSolid(g: SolidGrid, x: number, z: number, rx: number, rz: number, base: number, height: number, shape: 'dome' | 'cone' | 'column' = 'dome') {
  const r = cellRange(g, x, z, rx, rz);
  for (let j = r.j0; j <= r.j1; j++) {
    for (let i = r.i0; i <= r.i1; i++) {
      const [px, pz] = r.at(i, j);
      const d2 = ((px - x) / rx) ** 2 + ((pz - z) / rz) ** 2;
      if (d2 > 1) continue;
      const k = shape === 'column' ? 1 : shape === 'cone' ? 1 - Math.sqrt(d2) : Math.sqrt(1 - d2);
      const v = base + height * k;
      const n = j * g.nx + i;
      if (v > g.solid[n]) g.solid[n] = v;
    }
  }
}

/** Add foliage to a grid's band over a disc: from `lo` to `hi`, rounded at the edge. */
export function stampBand(g: LightGrid, x: number, z: number, radius: number, lo: number, hi: number) {
  g.bandLo ??= new Float32Array(g.nx * g.nz);
  g.bandHi ??= new Float32Array(g.nx * g.nz);
  const r = cellRange(g, x, z, radius, radius);
  const mid = (lo + hi) / 2;
  const half = (hi - lo) / 2;
  for (let j = r.j0; j <= r.j1; j++) {
    for (let i = r.i0; i <= r.i1; i++) {
      const [px, pz] = r.at(i, j);
      const d2 = ((px - x) ** 2 + (pz - z) ** 2) / (radius * radius);
      if (d2 > 1) continue;
      const k = Math.sqrt(1 - d2) * half;
      const n = j * g.nx + i;
      const a = mid - k;
      const b = mid + k;
      if (g.bandHi[n] <= g.bandLo[n]) {
        g.bandLo[n] = a;
        g.bandHi[n] = b;
      } else {
        g.bandLo[n] = Math.min(g.bandLo[n], a);
        g.bandHi[n] = Math.max(g.bandHi[n], b);
      }
    }
  }
}
