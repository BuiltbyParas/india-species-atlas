import * as THREE from 'three';
import type { Assets, Grid } from './data';
import { sampleGrid } from './data';

/**
 * The film's one 3D system: a relief of the subcontinent built from NOAA
 * ETOPO1, plus a finer patch for the western Himalaya.
 *
 * The mesh is a flat grid; height is read from a texture in the vertex
 * shader, and shading is computed per pixel from the same texture, so relief
 * exaggeration can be animated without the lighting going wrong. The same
 * shader can flatten and restyle the relief into the atlas's map palette
 * (`map`), draw contour lines at a real elevation interval (`contour`), and
 * add haze and snow for atmosphere.
 *
 * World units are degrees of latitude; longitude is scaled by cos 22°, the
 * same equirectangular projection the atlas's drawn maps use, so India is
 * never stretched for convenience.
 */

export const LON0 = 82.5;
export const LAT0 = 22;
export const KX = Math.cos((22 * Math.PI) / 180);
const M_PER_UNIT = 111_000;

export const worldX = (lng: number) => (lng - LON0) * KX;
export const worldZ = (lat: number) => LAT0 - lat;

export interface View {
  lng: number;
  lat: number;
  /** Camera distance from the target, in degrees of latitude. */
  dist: number;
  /** Compass heading the camera looks along, degrees (0 = north). */
  heading: number;
  /** Degrees below the horizon (90 = straight down). */
  pitch: number;
  fov?: number;
}

export interface Look {
  exag: number;
  shade: number;
  contour: number;
  contourStep: number;
  map: number;
  snow: number;
  snowLine: number;
  haze: number;
  fog: number;
  fogColor: [number, number, number];
  outside: number;
  sunAzimuth: number;
  sunElevation: number;
  exposure: number;
  warmth: number;
  himalaya: boolean;
  india: boolean;
  /** Width of the fade at the grid's edge, as a fraction of the grid. */
  edge: number;
  /** Fine surface texture seen close up, below the data's resolution. */
  detail: number;
  /** Cinematic light: warm sun against cool sky shadow (0 = neutral map light). */
  cine: number;
  /** Crag detail in the shading only (never the height) where the camera is close. */
  crag: number;
}

export const DEFAULT_LOOK: Look = {
  exag: 14,
  shade: 5,
  contour: 0,
  contourStep: 500,
  map: 0,
  snow: 0,
  snowLine: 5200,
  haze: 0,
  fog: 0.012,
  fogColor: [0.055, 0.075, 0.066],
  outside: 0.55,
  sunAzimuth: 300,
  sunElevation: 28,
  exposure: 1,
  warmth: 0,
  himalaya: false,
  india: true,
  edge: 0.1,
  detail: 0.5,
  cine: 0,
  crag: 0,
};

const vertex = /* glsl */ `
  uniform sampler2D uHeight;
  uniform vec2 uGrid;
  uniform float uExag;
  uniform float uMap;
  varying vec2 vUv;
  varying vec3 vWorld;
  varying float vH;
  float hAt(vec2 uv) {
    vec2 st = vec2(uv.x * (uGrid.x - 1.0) + 0.5, (1.0 - uv.y) * (uGrid.y - 1.0) + 0.5) / uGrid;
    return texture(uHeight, st).r;
  }
  void main() {
    vUv = uv;
    float h = hAt(uv);
    vH = h;
    vec3 p = position;
    p.y = max(h, 0.0) / ${M_PER_UNIT.toFixed(1)} * uExag * (1.0 - uMap);
    vec4 w = modelMatrix * vec4(p, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uHeight;
  uniform sampler2D uMask;
  uniform vec2 uGrid;
  uniform vec2 uCellM;
  uniform float uShade;
  uniform float uContour;
  uniform float uContourStep;
  uniform float uMap;
  uniform float uSnow;
  uniform float uSnowLine;
  uniform float uHaze;
  uniform float uFog;
  uniform vec3 uFogColor;
  uniform float uOutside;
  uniform vec3 uSun;
  uniform float uExposure;
  uniform float uWarmth;
  uniform float uEdge;
  uniform float uDetail;
  uniform float uCine;
  uniform float uCrag;
  varying vec2 vUv;
  varying vec3 vWorld;
  varying float vH;

  vec2 stOf(vec2 uv) {
    return vec2(uv.x * (uGrid.x - 1.0) + 0.5, (1.0 - uv.y) * (uGrid.y - 1.0) + 0.5) / uGrid;
  }
  float hAt(vec2 uv) { return texture(uHeight, stOf(uv)).r; }

  vec3 ramp(float h) {
    // Muted hypsometric tints: elevation only, not land cover.
    vec3 c0 = vec3(0.180, 0.200, 0.150);
    vec3 c1 = vec3(0.235, 0.250, 0.180);
    vec3 c2 = vec3(0.330, 0.320, 0.240);
    vec3 c3 = vec3(0.420, 0.390, 0.315);
    vec3 c4 = vec3(0.530, 0.505, 0.445);
    vec3 c5 = vec3(0.660, 0.650, 0.615);
    vec3 c = mix(c0, c1, smoothstep(0.0, 250.0, h));
    c = mix(c, c2, smoothstep(250.0, 800.0, h));
    c = mix(c, c3, smoothstep(800.0, 2000.0, h));
    c = mix(c, c4, smoothstep(2000.0, 3800.0, h));
    c = mix(c, c5, smoothstep(3800.0, 5600.0, h));
    return c;
  }

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }

  void main() {
    vec2 dx = vec2(1.0 / (uGrid.x - 1.0), 0.0);
    vec2 dy = vec2(0.0, 1.0 / (uGrid.y - 1.0));
    float h = vH;
    float hl = max(hAt(vUv - dx), 0.0);
    float hr = max(hAt(vUv + dx), 0.0);
    float hd = max(hAt(vUv - dy), 0.0);
    float hu = max(hAt(vUv + dy), 0.0);
    float dhdx = (hr - hl) / (2.0 * uCellM.x);
    float dhdz = -(hu - hd) / (2.0 * uCellM.y);
    vec3 n = normalize(vec3(-dhdx * uShade, 1.0, -dhdz * uShade));
    float slope0 = 1.0 - n.y;
    // Crags: a noise gradient bent into the normal on steep ground, close up.
    if (uCrag > 0.0) {
      float dc = length(vWorld - cameraPosition);
      float amt = uCrag * smoothstep(0.02, 0.2, slope0) * (1.0 - smoothstep(0.3, 1.25, dc));
      vec2 q = vWorld.xz * 140.0;
      float e = 0.35;
      float gx = (vnoise(q + vec2(e, 0.0)) - vnoise(q - vec2(e, 0.0))) + 0.5 * (vnoise(q * 2.7 + vec2(e, 0.0)) - vnoise(q * 2.7 - vec2(e, 0.0)));
      float gz = (vnoise(q + vec2(0.0, e)) - vnoise(q - vec2(0.0, e))) + 0.5 * (vnoise(q * 2.7 + vec2(0.0, e)) - vnoise(q * 2.7 - vec2(0.0, e)));
      n = normalize(n + vec3(-gx, 0.0, -gz) * amt * 1.6);
    }
    float slope = 1.0 - n.y;

    float lambert = max(dot(n, uSun), 0.0);
    float light = 0.34 + 0.9 * lambert;

    bool land = h > 0.0;
    vec3 col;
    if (land) {
      col = ramp(h) * light;
      // Warm where the sun lands, cool sky in the shadows.
      vec3 cineLight = vec3(1.16, 1.0, 0.8) * (1.35 * lambert) + vec3(0.42, 0.5, 0.64) * (0.4 + 0.25 * n.y);
      col = mix(col, ramp(h) * cineLight, uCine);
    } else {
      float depth = clamp(-h / 4000.0, 0.0, 1.0);
      col = mix(vec3(0.060, 0.090, 0.098), vec3(0.030, 0.045, 0.052), depth);
    }

    // Close up, ETOPO's 2 km cells read as a flat plane; a faint grain of
    // surface texture (colour only, never height) keeps the ground physical.
    float dCam = length(vWorld - cameraPosition);
    float near = uDetail * (1.0 - smoothstep(0.6, 6.0, dCam));
    if (near > 0.0 && land) {
      float g = vnoise(vWorld.xz * 900.0) * 0.5 + vnoise(vWorld.xz * 260.0) * 0.35 + vnoise(vWorld.xz * 70.0) * 0.15;
      col *= 1.0 + (g - 0.5) * 0.22 * near;
    }

    // Snow: an atmosphere layer on high, gentle ground; broken up by noise so
    // it reads as snow cover rather than a painted band.
    float sn = smoothstep(uSnowLine - 250.0, uSnowLine + 250.0, h + (vnoise(vWorld.xz * 220.0) - 0.5) * 500.0 + (vnoise(vWorld.xz * 40.0) - 0.5) * 300.0);
    sn *= 1.0 - smoothstep(0.25, 0.6, slope * 2.0);
    vec3 snowLit = mix(vec3(0.86, 0.88, 0.90) * (0.45 + 0.65 * lambert), vec3(0.98, 0.95, 0.9) * (1.2 * lambert) + vec3(0.42, 0.5, 0.62) * 0.55, uCine);
    col = mix(col, snowLit, sn * uSnow);

    // The atlas's map palette, for the morph from terrain to map.
    vec3 mapLand = vec3(0.102, 0.137, 0.118) * (0.82 + 0.36 * lambert);
    vec3 mapSea = vec3(0.055, 0.078, 0.067);
    col = mix(col, land ? mapLand : mapSea, uMap);

    // Neighbouring countries sit back so India reads first.
    float mask = texture(uMask, stOf(vUv)).r;
    col *= mix(uOutside, 1.0, mask);
    float contourMask = mix(0.18, 1.0, mask);

    // Contours at a real elevation interval, every fifth one heavier.
    if (uContour > 0.0 && land) {
      float ch = h / uContourStep;
      float fw = fwidth(ch);
      float d = abs(fract(ch + 0.5) - 0.5);
      float line = 1.0 - smoothstep(0.0, fw * 1.25, d);
      float index = mod(floor(ch + 0.5), 5.0) < 0.5 ? 1.0 : 0.5;
      line *= 1.0 - smoothstep(0.25, 0.7, fw);
      col = mix(col, vec3(0.690, 0.478, 0.322) * 1.15, line * index * uContour * contourMask);
    }

    // Distance fog and low-lying haze.
    float dist = length(vWorld - cameraPosition);
    float f = 1.0 - exp(-pow(dist * uFog, 2.0));
    float hz = uHaze * exp(-max(vWorld.y, 0.0) * 9.0) * (0.75 + 0.5 * vnoise(vWorld.xz * 3.0));
    col = mix(col, uFogColor, clamp(f + hz, 0.0, 1.0));

    // Colour temperature and exposure, then fade out at the grid's edge.
    col *= vec3(1.0 + 0.06 * uWarmth, 1.0, 1.0 - 0.08 * uWarmth) * uExposure;
    float edge = smoothstep(0.0, uEdge, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
    gl_FragColor = vec4(col, edge);
  }
`;

function heightTexture(g: Grid): THREE.DataTexture {
  const half = new Uint16Array(g.data.length);
  for (let i = 0; i < g.data.length; i++) half[i] = THREE.DataUtils.toHalfFloat(g.data[i]);
  const tex = new THREE.DataTexture(half, g.cols, g.rows, THREE.RedFormat, THREE.HalfFloatType);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/** India as a soft white-on-black raster in the grid's own coordinates. */
function maskTexture(g: Grid, assets: Assets): THREE.CanvasTexture {
  const size = 2048;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  ctx.filter = 'blur(3px)';
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  for (const s of assets.states) {
    for (const ring of s.rings) {
      ring.forEach(([lng, lat], i) => {
        const x = ((lng - g.west) / (g.east - g.west)) * size;
        const y = ((g.north - lat) / (g.north - g.south)) * size;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
    }
  }
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.flipY = false;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

function meshFor(g: Grid, mask: THREE.Texture, segments: number): THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> {
  const width = (g.east - g.west) * KX;
  const depth = g.north - g.south;
  const aspect = width / depth;
  const geo = new THREE.PlaneGeometry(width, depth, Math.round(segments * Math.min(1, aspect)), Math.round(segments / Math.max(1, aspect)));
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    uniforms: {
      uHeight: { value: heightTexture(g) },
      uMask: { value: mask },
      uGrid: { value: new THREE.Vector2(g.cols, g.rows) },
      uCellM: { value: new THREE.Vector2(g.cellsize * KX * M_PER_UNIT, g.cellsize * M_PER_UNIT) },
      uExag: { value: 10 },
      uShade: { value: 5 },
      uContour: { value: 0 },
      uContourStep: { value: 500 },
      uMap: { value: 0 },
      uSnow: { value: 0 },
      uSnowLine: { value: 5200 },
      uHaze: { value: 0 },
      uFog: { value: 0.01 },
      uFogColor: { value: new THREE.Color() },
      uOutside: { value: 0.55 },
      uSun: { value: new THREE.Vector3(0, 1, 0) },
      uExposure: { value: 1 },
      uWarmth: { value: 0 },
      uEdge: { value: 0.1 },
      uDetail: { value: 0.5 },
      uCine: { value: 0 },
      uCrag: { value: 0 },
    },
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(worldX((g.west + g.east) / 2), 0, worldZ((g.north + g.south) / 2));
  mesh.frustumCulled = false;
  return mesh;
}

export class Terrain {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private india: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> | null = null;
  private himalaya: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> | null = null;
  private assets: Assets;
  private look: Look = DEFAULT_LOOK;
  private width: number;
  private height: number;
  private v = new THREE.Vector3();

  /**
   * `width`×`height` is the render size (smaller for previews); projection
   * always answers in the film's own `filmW`×`filmH` space, so overlays land
   * in the same place at any render size.
   */
  constructor(assets: Assets, width: number, height: number, filmW = width, filmH = height) {
    this.assets = assets;
    this.width = filmW;
    this.height = filmH;
    this.canvas = document.createElement('canvas');
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height, false);
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    this.camera = new THREE.PerspectiveCamera(35, width / height, 0.01, 200);
    this.camera.rotation.order = 'YXZ';
    if (assets.india) {
      const mask = maskTexture(assets.india, assets);
      this.india = meshFor(assets.india, mask, 720);
      this.scene.add(this.india);
      if (assets.himalaya) {
        // The patch shares the India mask, sampled in its own coordinates.
        const hm = maskTexture(assets.himalaya, assets);
        this.himalaya = meshFor(assets.himalaya, hm, 330);
        this.himalaya.renderOrder = 1;
        this.scene.add(this.himalaya);
      }
    }
  }

  get ready(): boolean {
    return this.india !== null;
  }

  setView(v: View) {
    const h = (v.heading * Math.PI) / 180;
    const p = (v.pitch * Math.PI) / 180;
    const target = new THREE.Vector3(worldX(v.lng), this.groundY(v.lng, v.lat), worldZ(v.lat));
    const dir = new THREE.Vector3(Math.sin(h) * Math.cos(p), -Math.sin(p), -Math.cos(h) * Math.cos(p));
    this.camera.position.copy(target).addScaledVector(dir, -v.dist);
    this.camera.rotation.set(-p, -h, 0);
    this.camera.fov = v.fov ?? 35;
    this.camera.near = Math.max(0.002, v.dist * 0.02);
    this.camera.far = v.dist * 12 + 40;
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
  }

  setLook(look: Partial<Look>) {
    this.look = { ...DEFAULT_LOOK, ...look };
  }

  /** Terrain height at a point in world units, as currently exaggerated. */
  groundY(lng: number, lat: number): number {
    const l = this.look;
    const inPatch =
      l.himalaya && this.assets.himalaya &&
      lng > this.assets.himalaya.west && lng < this.assets.himalaya.east &&
      lat > this.assets.himalaya.south && lat < this.assets.himalaya.north;
    const g = inPatch ? this.assets.himalaya : this.assets.india;
    return (Math.max(0, sampleGrid(g, lng, lat)) / M_PER_UNIT) * l.exag * (1 - l.map);
  }

  /** Screen position of a point on the ground, or null if behind the camera. */
  project(lng: number, lat: number, lift = 0): [number, number] | null {
    this.v.set(worldX(lng), this.groundY(lng, lat) + lift, worldZ(lat));
    this.v.project(this.camera);
    if (this.v.z < -1 || this.v.z > 1) return null;
    return [((this.v.x + 1) / 2) * this.width, ((1 - this.v.y) / 2) * this.height];
  }

  private quad: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> | null = null;
  private quadScene = new THREE.Scene();
  private quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  /** Renders a full-frame shader (the water) on the same GPU context. */
  renderQuad(material: THREE.ShaderMaterial): HTMLCanvasElement {
    if (!this.quad) {
      this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
      this.quad.frustumCulled = false;
      this.quadScene.add(this.quad);
    }
    this.quad.material = material;
    this.renderer.render(this.quadScene, this.quadCamera);
    return this.canvas;
  }

  render(): HTMLCanvasElement {
    const l = this.look;
    const az = (l.sunAzimuth * Math.PI) / 180;
    const el = (l.sunElevation * Math.PI) / 180;
    const sun = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
    for (const mesh of [this.india, this.himalaya]) {
      if (!mesh) continue;
      const u = mesh.material.uniforms;
      u.uExag.value = l.exag;
      u.uShade.value = l.shade;
      u.uContour.value = l.contour;
      u.uContourStep.value = l.contourStep;
      u.uMap.value = l.map;
      u.uSnow.value = l.snow;
      u.uSnowLine.value = l.snowLine;
      u.uHaze.value = l.haze;
      u.uFog.value = l.fog;
      u.uFogColor.value.setRGB(...l.fogColor);
      u.uOutside.value = l.outside;
      u.uSun.value.copy(sun);
      u.uExposure.value = l.exposure;
      u.uWarmth.value = l.warmth;
      u.uEdge.value = l.edge;
      u.uDetail.value = l.detail;
      u.uCine.value = l.cine;
      u.uCrag.value = l.crag;
    }
    if (this.india) this.india.visible = l.india;
    if (this.himalaya) this.himalaya.visible = l.himalaya;
    // The patch sits a hair above the country mesh so it wins where both draw.
    if (this.himalaya) this.himalaya.position.y = l.india ? 0.0005 : 0;
    this.renderer.render(this.scene, this.camera);
    return this.canvas;
  }
}
