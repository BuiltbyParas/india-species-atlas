#!/usr/bin/env node
/**
 * Fetches everything the promotional film draws from outside the atlas's own
 * dataset, and writes it under `video/public/` in the small, clipped form the
 * film actually uses.
 *
 *   npm run video:data
 *
 * Every source here is either public domain or openly licensed, and each one
 * is recorded in `video/DATA_SOURCES.md` with what was taken and how it was
 * processed. Nothing is generated: clipping to India's bounding box, rounding
 * coordinates and subsampling the elevation grid are the only changes.
 *
 * - Natural Earth 1:10m rivers and roads (public domain)
 * - NOAA ETOPO1 1-arc-minute relief via ERDDAP (free to use and redistribute)
 * - Newsreader and Geist, the site's own typefaces (SIL Open Font License)
 * - Larger renditions of the five featured species photographs, from the same
 *   Wikimedia Commons files the atlas already credits
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setDefaultAutoSelectFamilyAttemptTimeout } from 'node:net';

// NOAA's server is slow to accept a connection; Node's default of 250 ms per
// address gives up on it before it answers.
setDefaultAutoSelectFamilyAttemptTimeout(5000);

const ROOT = resolve(import.meta.dirname, '../..');
const PUB = join(ROOT, 'video/public');
const UA = 'india-species-atlas-promo/1.0 (https://github.com/BuiltbyParas/india-species-atlas)';

/** India's frame, a little wider than the country so lines run off the edge. */
const BBOX = { west: 66, east: 99, south: 5, north: 38 };

const FEATURED = ['great-indian-bustard', 'bengal-tiger', 'ganges-river-dolphin', 'snow-leopard', 'indian-rhinoceros'];

async function get(url, as = 'json', ua = UA) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': ua } });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return as === 'json' ? res.json() : as === 'text' ? res.text() : Buffer.from(await res.arrayBuffer());
    } catch (err) {
      if (attempt >= 4) throw new Error(`${url}: ${err.message}`);
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }
}

const round = (v) => Math.round(v * 1000) / 1000;
const inBox = ([x, y]) => x >= BBOX.west && x <= BBOX.east && y >= BBOX.south && y <= BBOX.north;

/** Keeps the runs of a line that fall inside the box; a line leaving and re-entering becomes two. */
function clipLine(coords) {
  const runs = [];
  let run = [];
  for (const c of coords) {
    if (inBox(c)) run.push([round(c[0]), round(c[1])]);
    else if (run.length) {
      if (run.length > 1) runs.push(run);
      run = [];
    }
  }
  if (run.length > 1) runs.push(run);
  return runs;
}

function lines(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'LineString') return [geometry.coordinates];
  if (geometry.type === 'MultiLineString') return geometry.coordinates;
  return [];
}

async function naturalEarth(name, keep, props) {
  const url = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/${name}.geojson`;
  const src = await get(url);
  const features = [];
  for (const f of src.features) {
    if (!keep(f.properties)) continue;
    const runs = lines(f.geometry).flatMap(clipLine);
    if (!runs.length) continue;
    features.push({
      type: 'Feature',
      properties: props(f.properties),
      geometry: { type: 'MultiLineString', coordinates: runs },
    });
  }
  return { type: 'FeatureCollection', features };
}

/** Parses one Esri ASCII grid from ERDDAP (which labels cell centres, not corners). */
function parseEsriAscii(text) {
  const rows = text.split(/\r?\n/);
  const header = {};
  let i = 0;
  for (; i < rows.length; i++) {
    const m = rows[i].match(/^\s*([a-zA-Z_]+)\s+(-?[\d.eE+-]+)\s*$/);
    if (!m) break;
    header[m[1].toLowerCase()] = Number(m[2]);
  }
  const values = [];
  for (; i < rows.length; i++) {
    for (const v of rows[i].trim().split(/\s+/)) if (v !== '') values.push(Math.round(Number(v)));
  }
  const cell = header.cellsize;
  const x0 = header.xllcenter ?? header.xllcorner + cell / 2;
  const y0 = header.yllcenter ?? header.yllcorner + cell / 2;
  if (values.length !== header.ncols * header.nrows) {
    throw new Error(`expected ${header.ncols * header.nrows} samples, got ${values.length}`);
  }
  return { cols: header.ncols, rows: header.nrows, cell, x0, y0, values };
}

/**
 * Pulls an ETOPO1 window and stores it as little-endian Int16 metres, north
 * row first, with a JSON header describing the grid. Large windows time out
 * as one request, so the window is fetched in latitude strips and stacked.
 */
async function etopo(name, { south, north, west, east, stride }) {
  const step = (stride / 60);
  const stripRows = 120;
  const strips = [];
  // Strips run north to south so they stack in the file's row order.
  for (let top = north; top > south - 1e-9; top -= stripRows * step) {
    const bottom = Math.max(south, top - (stripRows - 1) * step);
    const q = `altitude[(${bottom.toFixed(6)}):${stride}:(${top.toFixed(6)})][(${west}):${stride}:(${east})]`;
    const url = `https://coastwatch.pfeg.noaa.gov/erddap/griddap/etopo180.esriAscii?${encodeURIComponent(q)}`;
    strips.push(parseEsriAscii(await get(url, 'text')));
    process.stdout.write(`\r  ${name}: ${strips.length} strips`);
    if (bottom <= south + 1e-9) break;
  }
  process.stdout.write('\n');
  const cols = strips[0].cols;
  const cell = strips[0].cell;
  // ERDDAP snaps to the nearest grid line, so adjacent strips can share a row.
  const out = [];
  let lastLat = Infinity;
  for (const s of strips) {
    if (s.cols !== cols) throw new Error(`${name}: strips disagree on width`);
    for (let r = 0; r < s.rows; r++) {
      const lat = s.y0 + (s.rows - 1 - r) * s.cell;
      if (lat >= lastLat - s.cell / 2) continue;
      lastLat = lat;
      out.push(s.values.slice(r * cols, (r + 1) * cols));
    }
  }
  const values = Int16Array.from(out.flat());
  const meta = {
    source: 'NOAA ETOPO1 1 Arc-Minute Global Relief Model (Ice Surface), via NOAA CoastWatch ERDDAP, dataset etopo180',
    units: 'metres above sea level',
    order: 'row-major, first row is the northernmost',
    cols,
    rows: out.length,
    west: strips[0].x0,
    east: strips[0].x0 + (cols - 1) * cell,
    north: strips[0].y0 + (strips[0].rows - 1) * cell,
    south: lastLat,
    cellsize: cell,
    min: values.reduce((a, b) => Math.min(a, b), Infinity),
    max: values.reduce((a, b) => Math.max(a, b), -Infinity),
  };
  await writeFile(join(PUB, 'data', `${name}.bin`), Buffer.from(values.buffer));
  await writeFile(join(PUB, 'data', `${name}.json`), JSON.stringify(meta, null, 2));
  return meta;
}

async function fonts() {
  const css = await get(
    'https://fonts.googleapis.com/css2?family=Geist:wght@300..700&family=Newsreader:ital,opsz,wght@0,6..72,200..700;1,6..72,200..600&display=swap',
    'text',
    // Google Fonts serves subsetted woff2 only to a browser it recognises.
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
  );
  // Only the basic Latin subset: the film's copy is English and the dashes and
  // quotes it uses sit in U+2000–206F, which that subset includes.
  const blocks = css.split('}').filter((b) => b.includes('U+0000-00FF'));
  const out = [];
  for (const b of blocks) {
    const family = b.match(/font-family:\s*'([^']+)'/)[1];
    const style = b.match(/font-style:\s*(\w+)/)[1];
    const url = b.match(/url\(([^)]+)\)/)[1];
    const file = `${family.toLowerCase()}${style === 'italic' ? '-italic' : ''}.woff2`;
    await writeFile(join(PUB, 'fonts', file), await get(url, 'buffer'));
    out.push(file);
  }
  // The Open Font License travels with the fonts.
  for (const [family, path] of [['newsreader', 'ofl/newsreader'], ['geist', 'ofl/geist']]) {
    const text = await get(`https://raw.githubusercontent.com/google/fonts/main/${path}/OFL.txt`, 'text');
    await writeFile(join(PUB, 'fonts', `${family}-OFL.txt`), text);
  }
  return out;
}

async function photos() {
  const manifest = JSON.parse(await readFile(join(ROOT, 'scripts/images/photo-manifest.json'), 'utf8'));
  const out = [];
  for (const id of FEATURED) {
    const entry = manifest.find((m) => m.id === id);
    if (!entry) throw new Error(`no photo manifest entry for ${id}`);
    const api =
      'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo' +
      `&iiprop=url|size&iiurlwidth=2560&titles=${encodeURIComponent(entry.file)}`;
    const info = Object.values((await get(api)).query.pages)[0].imageinfo[0];
    // Never upscale: a file narrower than 2560 px comes back at its own size.
    const url = info.thumburl && info.thumbwidth <= info.width ? info.thumburl : info.url;
    await writeFile(join(PUB, 'species', `${id}.jpg`), await get(url, 'buffer'));
    out.push({
      id,
      file: `species/${id}.jpg`,
      width: Math.min(info.width, info.thumbwidth ?? info.width),
      height: Math.min(info.height, info.thumbheight ?? info.height),
      artist: entry.artist,
      licence: entry.licence,
      licenceUrl: entry.licenceUrl ?? null,
      source: entry.source,
    });
  }
  await writeFile(join(PUB, 'species', 'photos.json'), JSON.stringify(out, null, 2));
  return out;
}

async function main() {
  const only = process.argv.slice(2);
  const want = (k) => !only.length || only.includes(k);
  for (const d of ['data', 'fonts', 'species']) await mkdir(join(PUB, d), { recursive: true });

  if (want('fonts')) console.log('fonts', await fonts());
  if (want('photos')) console.log('photos', (await photos()).map((p) => `${p.id} ${p.width}×${p.height}`));

  if (want('rivers')) {
    const rivers = await naturalEarth(
      'ne_10m_rivers_lake_centerlines',
      (p) => p.featurecla !== 'Lake Centerline',
      (p) => ({ name: p.name_en ?? p.name ?? null, scalerank: p.scalerank, kind: p.featurecla }),
    );
    await writeFile(join(PUB, 'data', 'rivers.geojson'), JSON.stringify(rivers));
    console.log('rivers', rivers.features.length);
  }
  if (want('roads')) {
    const roads = await naturalEarth(
      'ne_10m_roads',
      // The 1:10m roads carry no usable country code in this region, so they
      // are clipped to the box here and masked to India's outline when drawn.
      (p) => p.type === 'Major Highway' || p.type === 'Road',
      (p) => ({ type: p.type, scalerank: p.scalerank, name: p.name || null }),
    );
    await writeFile(join(PUB, 'data', 'roads.geojson'), JSON.stringify(roads));
    console.log('roads', roads.features.length);
  }
  if (want('world')) {
    // For the opening globe: coastlines and land borders of the whole world,
    // at 1:50m, rounded to 0.01°. Public domain, like the rest of Natural Earth.
    for (const [name, out] of [['ne_50m_coastline', 'world-coast'], ['ne_50m_admin_0_boundary_lines_land', 'world-borders']]) {
      const src = await get(`https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/${name}.geojson`);
      const lines = src.features.flatMap((f) => (f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates));
      const packed = lines.map((l) => l.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]));
      await writeFile(join(PUB, 'data', `${out}.json`), JSON.stringify(packed));
      console.log(out, packed.length, 'lines');
    }
  }
  if (want('etopo')) {
    // Two arc-minutes (~3.7 km) for the whole country; the full one arc-minute
    // for the western Himalaya, where the camera comes down to the ridges.
    console.log('etopo india', await etopo('etopo-india', { south: 5, north: 38, west: 66, east: 99, stride: 2 }));
    console.log('etopo himalaya', await etopo('etopo-himalaya', { south: 30, north: 35.5, west: 75, east: 80.5, stride: 1 }));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
