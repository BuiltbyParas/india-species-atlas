/**
 * Elevation for the home page relief, from NOAA's ETOPO 2022 global relief model.
 *
 * Two grids, one encoding. `india-relief` is averaged into 3′ cells (about
 * 5.5 km) over India and two cells around it, zero everywhere else, built by
 * `scripts/geo/build-relief.mjs`. `region-relief` is the subcontinent, the
 * plateau north of it and the sea floor around it at 4′, unclipped and signed,
 * built by `scripts/geo/build-region.mjs`: the 3D hero's ground. Each sidecar
 * JSON carries the provenance.
 *
 * Kept free of three.js: the flat hero (no WebGL, or reduced motion) shades the
 * same heights into a printed relief with a 2D canvas.
 */

/**
 * Vertical exaggeration of the elevation model, as a relief model's heights
 * are exaggerated. Stated on the page wherever the relief is shown.
 */
export const RELIEF_EXAGGERATION = 20;

/**
 * Hypsometric tint, at 0, 200, 600, 1200, 2500, 4000 and 5500 m: forest-black
 * lowland through olive and earth to sandstone and pale stone. Close in value
 * on purpose — the light does the modelling, the tint only says how high the
 * ground is. Shared by the 3D relief, the flat hero's shaded relief and the key.
 */
export const HYPSOMETRIC_HEX = ['#2c3a2c', '#36402b', '#4a4834', '#625943', '#857a61', '#aca38d', '#ddd8ca'];
export const HYPSOMETRIC_STOPS = [0, 200, 600, 1200, 2500, 4000, 5500];

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** The tint at a height, as the 3D relief's shader mixes it, in sRGB 0–255. */
function tintAt(h: number, rgb: number[][]): [number, number, number] {
  let [r, g, b] = rgb[0];
  for (let i = 1; i < rgb.length; i++) {
    const t = smoothstep(HYPSOMETRIC_STOPS[i - 1], HYPSOMETRIC_STOPS[i], h);
    r += (rgb[i][0] - r) * t;
    g += (rgb[i][1] - g) * t;
    b += (rgb[i][2] - b) * t;
  }
  return [r, g, b];
}

export interface ReliefSource {
  name: string;
  publisher: string;
  doi: string;
  licence: string;
  retrieved: string;
}

export interface ReliefGrid {
  width: number;
  height: number;
  /** Outer edges of the grid in degrees. Row 0 is the north, column 0 the west. */
  west: number;
  north: number;
  east: number;
  south: number;
  cellDeg: number;
  /** Metres above sea level, row-major from the north-west corner. */
  metres: Float32Array;
  peakInside: { metres: number; lat: number; lng: number };
  source: ReliefSource;
  /**
   * `india`: the country only, the sea clamped to 0 (`india-relief`, the flat hero's printed relief).
   * `region`: the subcontinent and the sea floor around it, unclipped and signed (`region-relief`, the 3D hero).
   */
  kind: 'india' | 'region';
}

const gridPromises = new Map<string, Promise<ReliefGrid>>();

async function inflate(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Response(stream).arrayBuffer();
}

/** Fetches and decodes one of the grids once per page (same encoding for both). */
function loadGrid(name: 'india-relief' | 'region-relief', kind: ReliefGrid['kind']): Promise<ReliefGrid> {
  let promise = gridPromises.get(name);
  if (promise) return promise;
  promise = (async () => {
    if (typeof DecompressionStream === 'undefined') throw new Error('no DecompressionStream');
    const base = `${import.meta.env.BASE_URL}relief/${name}`;
    const [metaResponse, binResponse] = await Promise.all([fetch(`${base}.json`), fetch(`${base}.bin`)]);
    if (!metaResponse.ok || !binResponse.ok) throw new Error('relief unavailable');
    const meta = await metaResponse.json();
    const residual = new Int16Array(await inflate(await binResponse.arrayBuffer()));
    const { width, height } = meta as { width: number; height: number };
    if (residual.length !== width * height) throw new Error('relief grid has the wrong size');
    // Undo the planar predictor the build script applied (west + north − north-west).
    const grid = new Int16Array(width * height);
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const i = r * width + c;
        const w = c > 0 ? grid[i - 1] : 0;
        const n = r > 0 ? grid[i - width] : 0;
        const nw = c > 0 && r > 0 ? grid[i - width - 1] : 0;
        grid[i] = residual[i] + w + n - nw;
      }
    }
    // The regional grid names its highest cell `peak` (it is not India's alone).
    const peakInside = meta.peakInside ?? meta.peak;
    return { ...meta, peakInside, kind, metres: Float32Array.from(grid) } as ReliefGrid;
  })();
  promise.catch(() => gridPromises.delete(name));
  gridPromises.set(name, promise);
  return promise;
}

/**
 * India's grid (`india-relief`), for the flat hero's printed relief. Rejects where the browser has no
 * `DecompressionStream`; callers fall back to the boundary-only drawing.
 */
export function loadRelief(): Promise<ReliefGrid> {
  return loadGrid('india-relief', 'india');
}

/**
 * The subcontinent and its sea floor (`region-relief`, built by `scripts/geo/build-region.mjs`): what the 3D
 * hero stands on, so the country is seen in its own geography rather than cut out of the dark.
 */
export function loadRegion(): Promise<ReliefGrid> {
  return loadGrid('region-relief', 'region');
}

/** Height in metres at a longitude and latitude, bilinear between cell centres; 0 off the grid. */
export function metresAt(grid: ReliefGrid, lng: number, lat: number): number {
  const fx = (lng - grid.west) / grid.cellDeg - 0.5;
  const fy = (grid.north - lat) / grid.cellDeg - 0.5;
  if (fx < 0 || fy < 0 || fx > grid.width - 1 || fy > grid.height - 1) return 0;
  const c = Math.min(Math.floor(fx), grid.width - 2);
  const r = Math.min(Math.floor(fy), grid.height - 2);
  const tx = fx - c;
  const ty = fy - r;
  const m = grid.metres;
  const i = r * grid.width + c;
  const top = m[i] + (m[i + 1] - m[i]) * tx;
  const bottom = m[i + grid.width] + (m[i + grid.width + 1] - m[i + grid.width]) * tx;
  return top + (bottom - top) * ty;
}

/**
 * The grid shaded as a printed relief: light from the north-west at 35°, the
 * conventional direction a cartographer lights a sheet from, over the same
 * hypsometric tint the 3D relief uses. Returns a canvas covering the grid's
 * extent, for the flat hero to clip to the country. `light` moves the sun (azimuth clockwise from north, altitude
 * above the horizon, degrees) for a sheet whose light travels (RegionFragments' stage).
 */
export function shadeRelief(
  grid: ReliefGrid,
  exaggeration: number,
  light: { azimuth: number; altitude: number } = { azimuth: 315, altitude: 35 },
): HTMLCanvasElement {
  const { width, height, metres } = grid;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const image = ctx.createImageData(width, height);
  const px = image.data;
  // Cell size in metres (east–west corrected at 22°, as the site's projection is).
  const cellY = grid.cellDeg * 111320;
  const cellX = cellY * Math.cos((22 * Math.PI) / 180);
  const az = (light.azimuth * Math.PI) / 180;
  const alt = (light.altitude * Math.PI) / 180;
  const lx = Math.sin(az) * Math.cos(alt);
  const ly = Math.cos(az) * Math.cos(alt);
  const lz = Math.sin(alt);
  const at = (r: number, c: number) => metres[Math.min(height - 1, Math.max(0, r)) * width + Math.min(width - 1, Math.max(0, c))];
  const rgb = HYPSOMETRIC_HEX.map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)));
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const h = metres[r * width + c];
      const dx = ((at(r, c + 1) - at(r, c - 1)) / (2 * cellX)) * exaggeration;
      // Row 0 is the north, so "up the sheet" is −r.
      const dy = ((at(r - 1, c) - at(r + 1, c)) / (2 * cellY)) * exaggeration;
      const len = Math.hypot(dx, dy, 1);
      const shade = Math.max(0, (-dx * lx - dy * ly + lz) / len);
      // Flat ground (shade = sin 35°) comes out at the tint itself; slopes to the light brighter, away darker.
      const lit = 0.42 + 1.0 * shade;
      const [tr, tg, tb] = tintAt(h, rgb);
      const i = (r * width + c) * 4;
      px[i] = Math.min(255, tr * lit);
      px[i + 1] = Math.min(255, tg * lit);
      px[i + 2] = Math.min(255, tb * lit);
      px[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}
