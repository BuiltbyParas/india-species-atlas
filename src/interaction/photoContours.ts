/**
 * Contours of a photograph's own tones.
 *
 * The atlas draws no contours of the ground, because it holds no elevation
 * data. A photograph, though, can be measured: its brightness is a surface
 * like any other, and the lines of equal brightness through it are a true
 * reading of the print — what a densitometer would trace. They are drawn
 * over the print as it develops (LINE → PHOTOGRAPH) and come back faintly
 * when it is looked at closely. They describe the image, never the place.
 *
 * Measured once per photograph on a small grid (≤ 112 cells across), with a
 * light blur so only the large masses are traced, by marching squares at a
 * handful of levels. Cached by URL; a few milliseconds the first time.
 */
const cache = new Map<string, Promise<ContourSet | null>>();

export interface ContourSet {
  /** The traced grid's size: the SVG's viewBox, in the print's proportions. */
  w: number;
  h: number;
  /** One path per level, darkest first. */
  paths: string[];
}

const LEVELS = [0.22, 0.34, 0.46, 0.58, 0.7];
const CELLS = 112;

function blur(src: Float32Array<ArrayBuffer>, w: number, h: number, passes: number): Float32Array<ArrayBuffer> {
  let a: Float32Array<ArrayBuffer> = src;
  let b: Float32Array<ArrayBuffer> = new Float32Array(a.length);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const l = a[y * w + Math.max(0, x - 1)];
        const r = a[y * w + Math.min(w - 1, x + 1)];
        b[y * w + x] = (l + a[y * w + x] * 2 + r) / 4;
      }
    [a, b] = [b, a];
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const u = a[Math.max(0, y - 1) * w + x];
        const d = a[Math.min(h - 1, y + 1) * w + x];
        b[y * w + x] = (u + a[y * w + x] * 2 + d) / 4;
      }
    [a, b] = [b, a];
  }
  return a;
}

/** Marching squares: the segments of one level, as a path in grid units. */
function trace(v: Float32Array, w: number, h: number, level: number): string {
  let d = '';
  const lerp = (a: number, b: number) => (level - a) / (b - a || 1e-6);
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const tl = v[y * w + x];
      const tr = v[y * w + x + 1];
      const br = v[(y + 1) * w + x + 1];
      const bl = v[(y + 1) * w + x];
      const c = (tl > level ? 8 : 0) | (tr > level ? 4 : 0) | (br > level ? 2 : 0) | (bl > level ? 1 : 0);
      if (c === 0 || c === 15) continue;
      const top = `${(x + lerp(tl, tr)).toFixed(2)} ${y}`;
      const right = `${x + 1} ${(y + lerp(tr, br)).toFixed(2)}`;
      const bottom = `${(x + lerp(bl, br)).toFixed(2)} ${y + 1}`;
      const left = `${x} ${(y + lerp(tl, bl)).toFixed(2)}`;
      const seg = (p: string, q: string) => {
        d += `M${p}L${q}`;
      };
      switch (c) {
        case 1: case 14: seg(left, bottom); break;
        case 2: case 13: seg(bottom, right); break;
        case 3: case 12: seg(left, right); break;
        case 4: case 11: seg(top, right); break;
        case 5: seg(left, top); seg(bottom, right); break;
        case 6: case 9: seg(top, bottom); break;
        case 7: case 8: seg(left, top); break;
        case 10: seg(top, right); seg(left, bottom); break;
      }
    }
  }
  return d;
}

async function measure(src: string): Promise<ContourSet | null> {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  await img.decode();
  const aspect = img.naturalWidth / Math.max(1, img.naturalHeight);
  const w = aspect >= 1 ? CELLS : Math.round(CELLS * aspect);
  const h = aspect >= 1 ? Math.round(CELLS / aspect) : CELLS;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    lum[i] = (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255;
  }
  const v = blur(lum, w, h, 3);
  return { w, h, paths: LEVELS.map((l) => trace(v, w, h, l)).filter(Boolean) };
}

/** The photograph's contours, measured once per URL (null if it cannot be read). */
export function photoContours(src: string): Promise<ContourSet | null> {
  let p = cache.get(src);
  if (!p) {
    p = measure(src).catch(() => null);
    cache.set(src, p);
  }
  return p;
}
