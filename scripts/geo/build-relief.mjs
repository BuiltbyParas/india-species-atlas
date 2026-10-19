// Builds the home page relief's elevation grid: public/relief/india-relief.bin and its sidecar india-relief.json.
//
// Source: NOAA NCEI, ETOPO 2022 15 Arc-Second Global Relief Model (doi:10.25921/fd45-gt74), read through the
// CoastWatch ERDDAP server as a 1-arc-minute subset (every 4th 15″ cell). The licence allows free use and
// redistribution; NOAA asks that the model be cited, which the sidecar and the home page do.
//
// What the script does, and nothing more:
//   1. reads the subset (NetCDF classic) — downloaded once to the OS temp directory, or passed with --nc <file>;
//   2. rasterises India from public/india-states.geojson, the same file every map on the site is drawn from;
//   3. averages the 1′ samples into cells of --arcmin minutes (3 by default), clamping the sea to 0 m;
//   4. keeps heights inside India plus a two-cell margin (so the relief's edge interpolates from real ground,
//      not from zero) and writes 0 everywhere else;
//   5. stores the grid as 16-bit metres, row 0 at the north, each cell as the residual of a planar predictor
//      (west + north − north-west), deflated with zlib. The browser inflates it with DecompressionStream.
//
// Usage: node scripts/geo/build-relief.mjs [--nc etopo.nc] [--arcmin 3]
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

/** The subset box, in degrees: India's boundary file spans 68.13–97.41°E, 6.76–37.09°N. */
const BOX = { south: 6.0, north: 37.6, west: 67.6, east: 97.8 };
const SOURCE_URL =
  'https://coastwatch.pfeg.noaa.gov/erddap/griddap/ETOPO_2022_v1_15s.nc' +
  `?z%5B(${BOX.south}):4:(${BOX.north})%5D%5B(${BOX.west}):4:(${BOX.east})%5D`;
const ARCMIN = Number(arg('arcmin', '3'));
const MARGIN = 2;

async function sourceFile() {
  const given = arg('nc');
  if (given) return given;
  const cached = join(tmpdir(), 'etopo2022-india-1min.nc');
  if (!existsSync(cached)) {
    console.log('downloading', SOURCE_URL);
    const res = await fetch(SOURCE_URL);
    if (!res.ok) throw new Error(`ERDDAP answered ${res.status}`);
    writeFileSync(cached, Buffer.from(await res.arrayBuffer()));
  }
  return cached;
}

/* -------------------------------------------------------------- the mask */

/** Even-odd scanline fill of every ring in the file at the given cell centres. State polygons do not overlap, so their union falls out. */
function rasterise(geojson, lats, lons) {
  const rows = lats.length;
  const cols = lons.length;
  const mask = new Uint8Array(rows * cols);
  const edges = [];
  for (const f of geojson.features) {
    const g = f.geometry;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    for (const poly of polys)
      for (const ring of poly)
        for (let i = 0; i < ring.length - 1; i++) edges.push([ring[i][0], ring[i][1], ring[i + 1][0], ring[i + 1][1]]);
  }
  const west = lons[0];
  const step = lons[1] - lons[0];
  const xs = [];
  for (let r = 0; r < rows; r++) {
    const y = lats[r];
    xs.length = 0;
    for (const [x0, y0, x1, y1] of edges) {
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const c0 = Math.max(0, Math.ceil((xs[k] - west) / step));
      const c1 = Math.min(cols - 1, Math.floor((xs[k + 1] - west) / step));
      for (let c = c0; c <= c1; c++) mask[r * cols + c] = 1;
    }
  }
  return mask;
}

/* -------------------------------------------------------------------- main */

const nc = readNetCdf(readFileSync(await sourceFile()));
const lat = nc.read('latitude').data;
const lon = nc.read('longitude').data;
const z = nc.read('z');
const [srcRows, srcCols] = z.shape;
if (srcRows !== lat.length || srcCols !== lon.length) throw new Error('unexpected axis order');
const ascending = lat[1] > lat[0];
console.log(`source ${srcCols}×${srcRows}, ${lon[0].toFixed(4)}…${lon[srcCols - 1].toFixed(4)}°E, ${lat[0].toFixed(4)}…${lat[srcRows - 1].toFixed(4)}°N`);

const geojson = JSON.parse(readFileSync(join(ROOT, 'public', 'india-states.geojson'), 'utf8'));
const srcMask = rasterise(geojson, Array.from(lat), Array.from(lon));

const k = ARCMIN; // source cells are 1′
const width = Math.floor(srcCols / k);
const height = Math.floor(srcRows / k);
const heights = new Float64Array(width * height);
const inside = new Uint8Array(width * height);
for (let r = 0; r < height; r++) {
  // Row 0 is the north.
  const srcRow0 = ascending ? srcRows - (r + 1) * k : r * k;
  for (let c = 0; c < width; c++) {
    let sum = 0;
    let any = 0;
    for (let dr = 0; dr < k; dr++)
      for (let dc = 0; dc < k; dc++) {
        const i = (srcRow0 + dr) * srcCols + c * k + dc;
        sum += Math.max(0, z.data[i]);
        any |= srcMask[i];
      }
    heights[r * width + c] = sum / (k * k);
    inside[r * width + c] = any;
  }
}

// Two cells of real ground around the country, zero beyond.
const keep = new Uint8Array(width * height);
for (let r = 0; r < height; r++)
  for (let c = 0; c < width; c++) {
    if (!inside[r * width + c]) continue;
    for (let dr = -MARGIN; dr <= MARGIN; dr++)
      for (let dc = -MARGIN; dc <= MARGIN; dc++) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr >= 0 && rr < height && cc >= 0 && cc < width) keep[rr * width + cc] = 1;
      }
  }

const grid = new Int16Array(width * height);
let peak = { h: -1, r: 0, c: 0 };
for (let i = 0; i < grid.length; i++) {
  grid[i] = keep[i] ? Math.min(32767, Math.round(heights[i])) : 0;
  if (inside[i] && grid[i] > peak.h) peak = { h: grid[i], r: Math.floor(i / width), c: i % width };
}

// Planar-predictor residuals: each cell less (west + north − north-west).
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

const cellDeg = (lon[1] - lon[0]) * k;
const west = lon[0] - (lon[1] - lon[0]) / 2;
const north = (ascending ? lat[srcRows - 1] : lat[0]) + Math.abs(lat[1] - lat[0]) / 2;
const meta = {
  width,
  height,
  /** Outer edges of the grid, in degrees. Row 0 is the northern row, column 0 the western. */
  west: +west.toFixed(6),
  north: +north.toFixed(6),
  east: +(west + width * cellDeg).toFixed(6),
  south: +(north - height * cellDeg).toFixed(6),
  cellDeg: +cellDeg.toFixed(8),
  units: 'metres above mean sea level; the sea and anything below it clamped to 0',
  encoding: 'int16 little-endian, planar-predictor residuals (west + north − north-west), zlib',
  cell: `mean of ${k}×${k} one-arc-minute samples`,
  extent: `India from public/india-states.geojson plus ${MARGIN} cells; 0 elsewhere`,
  peakInside: {
    metres: peak.h,
    lat: +(north - (peak.r + 0.5) * cellDeg).toFixed(3),
    lng: +(west + (peak.c + 0.5) * cellDeg).toFixed(3),
  },
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
writeFileSync(join(outDir, 'india-relief.bin'), packed);
writeFileSync(join(outDir, 'india-relief.json'), JSON.stringify(meta, null, 2) + '\n');
console.log(`grid ${width}×${height} at ${k}′, ${(packed.length / 1024).toFixed(0)} KB, highest cell ${peak.h} m at ${meta.peakInside.lat}°N ${meta.peakInside.lng}°E`);
