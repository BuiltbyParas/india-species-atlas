#!/usr/bin/env node
/**
 * Pre-projects the promotional film's background geography into the site's
 * own map space, so the film draws it as plain SVG paths with no per-frame
 * work.
 *
 *   npm run video:promo:prep
 *
 * Inputs (already in the repository, see video/DATA_SOURCES.md):
 *   - video/public/data/etopo-india.bin/.json  NOAA ETOPO1 relief (Int16 m)
 *   - video/public/data/rivers.geojson         Natural Earth 1:10m rivers
 *
 * Output (git-ignored), in video/public/promo/geo/:
 *   outline.json, contours.json, rivers.json   vector paths in map units
 *   relief.png, contours-low.png, contours-high.png, rivers.png
 *        the same layers baked to rasters covering the map sheet
 *        (0..MAP_WIDTH × 0..MAP_HEIGHT), already clipped to India's outline.
 *        Drawing a transformed image is cheap for every frame; clipping a
 *        megabyte of contour paths in every frame is not — and the machine
 *        this was built on has little memory to spare.
 *
 * The projection is imported from src/geo/india.ts — the same function every
 * drawn map on the site uses — so a contour or river lands exactly where the
 * site would put it. India's outline itself is NOT produced here: the film
 * reads public/india-states.geojson directly, the one canonical boundary.
 *
 * Contours are clipped to that outline in the film (an SVG clip path); this
 * script only traces them. Nothing is invented: the levels are isolines of
 * the elevation grid, lightly smoothed (a 1-cell blur) so 2-arc-minute
 * staircase steps do not alias into the frame.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contours } from 'd3-contour';
import { blur2 } from 'd3-array';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { project, MAP_WIDTH, MAP_HEIGHT } from '../../../src/geo/india.ts';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const DATA = join(ROOT, 'video/public/data');
const OUT = join(ROOT, 'video/public/promo/geo');

/** Contour levels in metres. The low ones read the plateau, the high ones the Himalaya. */
const LEVELS = [300, 600, 1000, 1500, 2000, 3000, 4000, 5000, 6000];

const fmt = (n) => (Math.round(n * 10) / 10).toString();

function ringToPath(ring, toXY, minLen) {
  if (ring.length < minLen) return '';
  let d = '';
  let last = null;
  for (let i = 0; i < ring.length; i++) {
    const [x, y] = toXY(ring[i]);
    const p = `${fmt(x)} ${fmt(y)}`;
    if (p === last) continue;
    d += `${d ? 'L' : 'M'}${p}`;
    last = p;
  }
  return `${d}Z`;
}

async function contourLayer() {
  const meta = JSON.parse(await readFile(join(DATA, 'etopo-india.json'), 'utf8'));
  const buf = await readFile(join(DATA, 'etopo-india.bin'));
  const raw = new Int16Array(buf.buffer, buf.byteOffset, buf.byteLength / 2);
  const values = Float64Array.from(raw, (v) => Math.max(v, -1));
  blur2({ data: values, width: meta.cols, height: meta.rows }, 1);

  const toXY = ([i, j]) => {
    const lng = meta.west + i * meta.cellsize;
    const lat = meta.north - j * meta.cellsize;
    return project(lng, lat);
  };
  const gen = contours().size([meta.cols, meta.rows]).thresholds(LEVELS).smooth(true);
  const levels = gen(values).map((mp) => {
    let d = '';
    for (const polygon of mp.coordinates) for (const ring of polygon) d += ringToPath(ring, toXY, 6);
    return { level: mp.value, d };
  });
  return { source: meta.source, units: 'metres', levels };
}

async function riverLayer() {
  const g = JSON.parse(await readFile(join(DATA, 'rivers.geojson'), 'utf8'));
  const rivers = [];
  for (const f of g.features) {
    const lines = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates;
    let d = '';
    let length = 0;
    for (const line of lines) {
      let prev = null;
      line.forEach(([lng, lat], i) => {
        const [x, y] = project(lng, lat);
        if (prev) length += Math.hypot(x - prev[0], y - prev[1]);
        prev = [x, y];
        d += `${i ? 'L' : 'M'}${fmt(x)} ${fmt(y)}`;
      });
    }
    rivers.push({ name: f.properties.name ?? null, rank: f.properties.scalerank, length: Math.round(length), d });
  }
  rivers.sort((a, b) => a.rank - b.rank || b.length - a.length);
  return { source: 'Natural Earth 1:10m rivers and lake centerlines (public domain)', rivers };
}

/**
 * India's outer boundary as lines, derived from the canonical state file: a
 * segment that two states share is an internal border and cancels out; what
 * is left is the coast and the land frontier. The state file was simplified
 * topologically (mapshaper), so shared borders have identical vertices and
 * cancel exactly. Islands come out as their own closed rings.
 */
async function outlineLayer() {
  const g = JSON.parse(await readFile(join(ROOT, 'public/india-states.geojson'), 'utf8'));
  const key = ([lng, lat]) => `${lng.toFixed(5)},${lat.toFixed(5)}`;
  const count = new Map();
  const segs = [];
  for (const f of g.features) {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const poly of polys)
      for (const ring of poly)
        for (let i = 0; i < ring.length - 1; i++) {
          const a = key(ring[i]);
          const b = key(ring[i + 1]);
          if (a === b) continue;
          const k = a < b ? `${a}|${b}` : `${b}|${a}`;
          count.set(k, (count.get(k) ?? 0) + 1);
          segs.push([a, b, ring[i], ring[i + 1], k]);
        }
  }
  // Chain the boundary segments into polylines.
  const next = new Map();
  for (const [a, b, pa, pb, k] of segs) {
    if (count.get(k) !== 1) continue;
    if (!next.has(a)) next.set(a, []);
    next.get(a).push({ b, pa, pb });
  }
  const lines = [];
  for (const [start] of next) {
    while (next.get(start)?.length) {
      const line = [];
      let cur = start;
      while (next.get(cur)?.length) {
        const s = next.get(cur).pop();
        if (!line.length) line.push(s.pa);
        line.push(s.pb);
        cur = s.b;
      }
      lines.push(line);
    }
  }
  const paths = lines
    .map((line) => {
      const pts = line.map(([lng, lat]) => project(lng, lat));
      let length = 0;
      for (let i = 1; i < pts.length; i++) length += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      return { length: Math.round(length), d: pts.map(([x, y], i) => `${i ? 'L' : 'M'}${fmt(x)} ${fmt(y)}`).join('') };
    })
    .sort((a, b) => b.length - a.length);
  return { source: 'public/india-states.geojson (outer boundary of the union of its features)', paths };
}

/**
 * Raster resolution: px per map unit. 2.0 is about 0.9 image px per screen
 * px at the film's closest zoom (2.9×) — softer there than 1:1, but four
 * 2.4-unit rasters plus the photographs pushed the 6 GB build machine out of
 * memory mid-render.
 */
const RES = 2.0;

/**
 * Working copies of the five full-size photographs, 1600 px wide. The photo
 * panel is 800 px with at most a 1.55× crop, so 1600 px keeps ≥1.29 source px
 * per screen px, at a tenth of the decoded memory of the 3840 px originals.
 */
async function photos() {
  const src = join(ROOT, 'video/public/species');
  const dst = join(ROOT, 'video/public/promo/photos');
  await mkdir(dst, { recursive: true });
  for (const id of ['great-indian-bustard', 'bengal-tiger', 'ganges-river-dolphin', 'indian-rhinoceros', 'snow-leopard']) {
    const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', join(src, `${id}.jpg`), '-vf', "scale='min(1600,iw)':-2:flags=lanczos", '-q:v', '2', join(dst, `${id}.jpg`)]);
    console.log(`photos/${id}.jpg`, r.status === 0 ? 'ok' : 'FAILED (run npm run video:data first)');
  }
}

/**
 * Bakes the static layers in a headless Chromium canvas (Playwright is
 * already a dev dependency). Each layer is clipped to the union of the state
 * polygons, so nothing is drawn beyond India's outline.
 */
async function bake(contours, rivers) {
  const g = JSON.parse(await readFile(join(ROOT, 'public/india-states.geojson'), 'utf8'));
  const statePaths = g.features.map((f) => {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    return polys
      .flatMap((poly) => poly.map((ring) => ring.map(([lng, lat], i) => `${i ? 'L' : 'M'}${project(lng, lat).map((v) => v.toFixed(2)).join(' ')}`).join('') + 'Z'))
      .join('');
  });
  const meta = JSON.parse(await readFile(join(DATA, 'etopo-india.json'), 'utf8'));
  const bin = await readFile(join(DATA, 'etopo-india.bin'));
  const [gx0, gy0] = project(meta.west - meta.cellsize / 2, meta.north + meta.cellsize / 2);
  const [gx1, gy1] = project(meta.west + (meta.cols - 0.5) * meta.cellsize, meta.north - (meta.rows - 0.5) * meta.cellsize);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const W = Math.round(MAP_WIDTH * RES);
  const H = Math.round(MAP_HEIGHT * RES);
  const out = await page.evaluate(
    ({ W, H, RES, statePaths, contours, rivers, meta, elev, grid }) => {
      const clipTo = (g) => {
        g.setTransform(RES, 0, 0, RES, 0, 0);
        g.clip(new Path2D(statePaths.join('')), 'nonzero');
      };
      const fresh = () => {
        const c = document.createElement('canvas');
        c.width = W;
        c.height = H;
        const g = c.getContext('2d');
        clipTo(g);
        return [c, g];
      };
      const png = (c) => c.toDataURL('image/png');

      // Hillshade (Horn), sun from the north-west at 40°, heights ×4.
      const z = new Int16Array(Uint8Array.from(atob(elev), (ch) => ch.charCodeAt(0)).buffer);
      const { cols, rows, cellsize, north } = meta;
      const hs = document.createElement('canvas');
      hs.width = cols;
      hs.height = rows;
      const hg = hs.getContext('2d');
      const img = hg.createImageData(cols, rows);
      const zen = ((90 - 40) * Math.PI) / 180;
      const az = ((360 - 315 + 90) * Math.PI) / 180;
      const flat = Math.cos(zen);
      const at = (i, j) => Math.max(0, z[Math.min(rows - 1, Math.max(0, j)) * cols + Math.min(cols - 1, Math.max(0, i))]);
      const dy = cellsize * 111320;
      for (let j = 0; j < rows; j++) {
        const dx = dy * Math.cos(((north - j * cellsize) * Math.PI) / 180);
        for (let i = 0; i < cols; i++) {
          const o = (j * cols + i) * 4;
          if (z[j * cols + i] <= 0) continue;
          const a = at(i - 1, j - 1), b = at(i, j - 1), c = at(i + 1, j - 1);
          const d = at(i - 1, j), f = at(i + 1, j);
          const gg = at(i - 1, j + 1), h = at(i, j + 1), k = at(i + 1, j + 1);
          const dzdx = ((c + 2 * f + k - (a + 2 * d + gg)) / (8 * dx)) * 4;
          const dzdy = ((gg + 2 * h + k - (a + 2 * b + c)) / (8 * dy)) * 4;
          const slope = Math.atan(Math.hypot(dzdx, dzdy));
          const aspect = Math.atan2(dzdy, -dzdx);
          const v = Math.cos(zen) * Math.cos(slope) + Math.sin(zen) * Math.sin(slope) * Math.cos(az - aspect) - flat;
          if (v > 0) {
            img.data[o] = 232;
            img.data[o + 1] = 225;
            img.data[o + 2] = 207;
            img.data[o + 3] = Math.min(255, v * 520);
          } else {
            img.data[o + 3] = Math.min(255, -v * 640);
          }
        }
      }
      hg.putImageData(img, 0, 0);
      const [rc, rg] = fresh();
      rg.imageSmoothingQuality = 'high';
      rg.drawImage(hs, grid[0], grid[1], grid[2] - grid[0], grid[3] - grid[1]);

      // Contours, split at 3,000 m so the Himalaya can be lifted on its own.
      const contourCanvas = (keep) => {
        const [c, g] = fresh();
        g.lineJoin = 'round';
        g.lineWidth = 1.1 / RES;
        for (const l of contours) {
          if (!keep(l.level)) continue;
          const a = 0.55 + (Math.min(l.level, 5000) / 5000) * 0.45;
          g.strokeStyle = `rgba(176, 122, 82, ${a})`;
          g.stroke(new Path2D(l.d));
        }
        return c;
      };
      const low = contourCanvas((lv) => lv < 3000);
      const high = contourCanvas((lv) => lv >= 3000);

      // Rivers: the larger ones drawn heavier.
      const [vc, vg] = fresh();
      vg.lineJoin = vg.lineCap = 'round';
      vg.strokeStyle = 'rgb(126, 163, 181)';
      for (const r of rivers) {
        vg.lineWidth = (r.rank <= 3 ? 1.9 : 1.2) / RES;
        vg.stroke(new Path2D(r.d));
      }
      return { relief: png(rc), low: png(low), high: png(high), rivers: png(vc) };
    },
    { W, H, RES, statePaths, contours: contours.levels, rivers: rivers.rivers, meta, elev: bin.toString('base64'), grid: [gx0, gy0, gx1, gy1] },
  );
  await browser.close();
  const files = { 'relief.png': out.relief, 'contours-low.png': out.low, 'contours-high.png': out.high, 'rivers.png': out.rivers };
  for (const [name, url] of Object.entries(files)) {
    const buf = Buffer.from(url.split(',')[1], 'base64');
    await writeFile(join(OUT, name), buf);
    console.log(`${name}: ${W}×${H}, ${(buf.length / 1e6).toFixed(1)} MB`);
  }
  await writeFile(join(OUT, 'rasters.json'), JSON.stringify({ res: RES, width: MAP_WIDTH, height: MAP_HEIGHT, files: Object.keys(files) }));
}

await mkdir(OUT, { recursive: true });
const o = await outlineLayer();
await writeFile(join(OUT, 'outline.json'), JSON.stringify(o));
console.log(`outline: ${o.paths.length} rings, longest ${o.paths[0].length} units`);
const c = await contourLayer();
await writeFile(join(OUT, 'contours.json'), JSON.stringify(c));
const r = await riverLayer();
await writeFile(join(OUT, 'rivers.json'), JSON.stringify(r));
console.log(
  `contours: ${c.levels.map((l) => `${l.level}m ${(l.d.length / 1024).toFixed(0)}k`).join(', ')}`,
  `\nrivers: ${r.rivers.length}`,
);
await bake(c, r);
await photos();
