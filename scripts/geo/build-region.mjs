// Builds the home page hero's ground: public/relief/region-relief.bin and its sidecar region-relief.json.
//
// Source: NOAA NCEI, ETOPO 2022 15 Arc-Second Global Relief Model (doi:10.25921/fd45-gt74), read through the
// CoastWatch ERDDAP server as a 2-arc-minute subset (every 8th 15″ cell). The licence allows free use and
// redistribution; NOAA asks that the model be cited, which the sidecar and the home page do.
//
// Unlike build-relief.mjs (India only, the sea clamped to 0, for the flat hero's printed relief), this grid is
// the whole subcontinent and the sea floor around it, unclipped: the land beyond the boundary and the
// bathymetry are what the hero's raking light falls across, so the country stands in its own geography rather
// than as a cut-out. Nothing is invented: every cell is the model's own mean.
//
//   1. reads the subset (NetCDF classic) — downloaded once to the OS temp directory, or passed with --nc <file>;
//   2. averages the 2′ samples into cells of --arcmin minutes (4 by default);
//   3. rounds land to the metre and the sea floor to 10 m (the hero shows depth as a tint; finer steps only
//      cost bytes);
//   4. stores the grid as 16-bit metres, row 0 at the north, each cell as the residual of a planar predictor
//      (west + north − north-west), deflated with zlib — the same encoding as india-relief.bin, so the browser
//      decodes both with one function.
//
// Usage: node scripts/geo/build-region.mjs [--nc etopo.nc] [--arcmin 4]
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { readNetCdf } from './netcdf.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};

/** The subset box, in degrees: the subcontinent, the Tibetan plateau to its north and the seas to its south. */
const BOX = { south: 1.0, north: 41.0, west: 59.0, east: 103.0 };
const STRIDE = 8; // 8 × 15″ = 2′
const SOURCE_URL =
  'https://coastwatch.pfeg.noaa.gov/erddap/griddap/ETOPO_2022_v1_15s.nc' +
  `?z%5B(${BOX.south}):${STRIDE}:(${BOX.north})%5D%5B(${BOX.west}):${STRIDE}:(${BOX.east})%5D`;
const ARCMIN = Number(arg('arcmin', '4'));
const SOURCE_ARCMIN = (STRIDE * 15) / 60;

async function sourceFile() {
  const given = arg('nc');
  if (given) return given;
  const cached = join(tmpdir(), 'etopo2022-region-2min.nc');
  if (!existsSync(cached)) {
    console.log('downloading', SOURCE_URL);
    const res = await fetch(SOURCE_URL);
    if (!res.ok) throw new Error(`ERDDAP answered ${res.status}`);
    writeFileSync(cached, Buffer.from(await res.arrayBuffer()));
  }
  return cached;
}

const nc = readNetCdf(readFileSync(await sourceFile()));
const lat = nc.read('latitude').data;
const lon = nc.read('longitude').data;
const z = nc.read('z');
const [srcRows, srcCols] = z.shape;
if (srcRows !== lat.length || srcCols !== lon.length) throw new Error('unexpected axis order');
const ascending = lat[1] > lat[0];
console.log(`source ${srcCols}×${srcRows}, ${lon[0].toFixed(4)}…${lon[srcCols - 1].toFixed(4)}°E, ${lat[0].toFixed(4)}…${lat[srcRows - 1].toFixed(4)}°N`);

const k = Math.max(1, Math.round(ARCMIN / SOURCE_ARCMIN));
const width = Math.floor(srcCols / k);
const height = Math.floor(srcRows / k);
const grid = new Int16Array(width * height);
let peak = { h: -Infinity, r: 0, c: 0 };
let deepest = { h: Infinity, r: 0, c: 0 };
for (let r = 0; r < height; r++) {
  // Row 0 is the north.
  const srcRow0 = ascending ? srcRows - (r + 1) * k : r * k;
  for (let c = 0; c < width; c++) {
    let sum = 0;
    for (let dr = 0; dr < k; dr++) for (let dc = 0; dc < k; dc++) sum += z.data[(srcRow0 + dr) * srcCols + c * k + dc];
    const m = sum / (k * k);
    const v = m > 0 ? Math.round(m) : Math.round(m / 10) * 10;
    const i = r * width + c;
    grid[i] = Math.max(-32768, Math.min(32767, v));
    if (v > peak.h) peak = { h: v, r, c };
    if (v < deepest.h) deepest = { h: v, r, c };
  }
}

const residual = new Int16Array(grid.length);
for (let r = 0; r < height; r++)
  for (let c = 0; c < width; c++) {
    const i = r * width + c;
    const w = c > 0 ? grid[i - 1] : 0;
    const n = r > 0 ? grid[i - width] : 0;
    const nw = c > 0 && r > 0 ? grid[i - width - 1] : 0;
    residual[i] = grid[i] - (w + n - nw);
  }
const packed = deflateSync(Buffer.from(residual.buffer), { level: 9 });

const step = Math.abs(lon[1] - lon[0]);
const cellDeg = step * k;
const west = lon[0] - step / 2;
const north = (ascending ? lat[srcRows - 1] : lat[0]) + Math.abs(lat[1] - lat[0]) / 2;
const at = (p) => ({ metres: p.h, lat: +(north - (p.r + 0.5) * cellDeg).toFixed(3), lng: +(west + (p.c + 0.5) * cellDeg).toFixed(3) });
const meta = {
  width,
  height,
  /** Outer edges of the grid, in degrees. Row 0 is the northern row, column 0 the western. */
  west: +west.toFixed(6),
  north: +north.toFixed(6),
  east: +(west + width * cellDeg).toFixed(6),
  south: +(north - height * cellDeg).toFixed(6),
  cellDeg: +cellDeg.toFixed(8),
  units: 'metres relative to mean sea level; negative below it (the sea floor)',
  encoding: 'int16 little-endian, planar-predictor residuals (west + north − north-west), zlib',
  cell: `mean of ${k}×${k} two-arc-minute samples; land to 1 m, sea floor to 10 m`,
  extent: 'the whole box, unclipped: India, its neighbours and the sea floor',
  peak: at(peak),
  deepest: at(deepest),
  source: {
    name: 'ETOPO 2022 15 Arc-Second Global Relief Model',
    publisher: 'NOAA National Centers for Environmental Information',
    doi: '10.25921/fd45-gt74',
    via: SOURCE_URL,
    licence: 'Free to use and redistribute; not intended for legal use (NOAA).',
    retrieved: new Date().toISOString().slice(0, 10),
  },
};

const outDir = join(ROOT, 'public', 'relief');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'region-relief.bin'), packed);
writeFileSync(join(outDir, 'region-relief.json'), JSON.stringify(meta, null, 2) + '\n');
console.log(`grid ${width}×${height} at ${(cellDeg * 60).toFixed(1)}′, ${(packed.length / 1024).toFixed(0)} KB; peak ${peak.h} m, deepest ${deepest.h} m`);
