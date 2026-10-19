import { CUES, TITLE } from '../timeline.mjs';
import type { Frame, Scene } from '../engine/film';
import { clamp01, easeInOutCubic, easeInOutQuint, easeOutCubic, hash1, lerp, seg } from '../engine/ease';
import type { LngLat } from '../engine/data';
import { INK, SERIF, drawText } from '../engine/type';

/**
 * The opening: Earth at night, the lines we draw on it, and the fall to India.
 *
 * An orthographic globe drawn from Natural Earth coastlines and borders. The
 * graticule — the first lines anyone draws on a map — rules itself across the
 * sphere under the first words. In the dive the globe turns to Asia, India's
 * outline lights, and the camera falls until India fills the frame, where
 * the relief takes over.
 */

const RAD = Math.PI / 180;

interface Ortho {
  lng0: number;
  lat0: number;
  r: number;
  cx: number;
  cy: number;
}

/** Orthographic projection; null on the far side of the globe. */
function orth(o: Ortho, lng: number, lat: number): [number, number] | null {
  const l = (lng - o.lng0) * RAD;
  const p = lat * RAD;
  const p0 = o.lat0 * RAD;
  const cosc = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l);
  if (cosc < 0) return null;
  const x = o.r * Math.cos(p) * Math.sin(l);
  const y = o.r * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l));
  return [o.cx + x, o.cy - y];
}

function strokeRuns(ctx: CanvasRenderingContext2D, lines: LngLat[][], o: Ortho, W: number, H: number, k = 1) {
  ctx.beginPath();
  for (const line of lines) {
    const n = Math.max(2, Math.round(line.length * k));
    let pen = false;
    for (let i = 0; i < n; i++) {
      const p = orth(o, line[i][0], line[i][1]);
      if (!p || p[0] < -200 || p[0] > W + 200 || p[1] < -200 || p[1] > H + 200) {
        pen = false;
        continue;
      }
      if (pen) ctx.lineTo(p[0], p[1]);
      else ctx.moveTo(p[0], p[1]);
      pen = true;
    }
  }
  ctx.stroke();
}

/** Meridians and parallels every 15°, drawn on by length. */
function graticule(k: number): LngLat[][] {
  const out: LngLat[][] = [];
  for (let lng = -180; lng < 180; lng += 15) {
    const m: LngLat[] = [];
    for (let lat = -80; lat <= 80; lat += 2) m.push([lng, lat]);
    out.push(m.slice(0, Math.max(2, Math.round(m.length * k))));
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    const p: LngLat[] = [];
    for (let lng = -180; lng <= 180; lng += 2) p.push([lng, lat]);
    out.push(p.slice(0, Math.max(2, Math.round(p.length * k))));
  }
  return out;
}

function stars(ctx: CanvasRenderingContext2D, W: number, H: number, alpha: number, drift: number) {
  ctx.save();
  ctx.fillStyle = '#e8e1cf';
  for (let i = 0; i < 420; i++) {
    const x = (hash1(i * 3.1) * W + drift * (0.3 + hash1(i) * 0.7)) % W;
    const y = hash1(i * 7.7) * H;
    const b = hash1(i * 1.9);
    ctx.globalAlpha = alpha * (0.15 + 0.6 * b * b);
    ctx.fillRect(x, y, b > 0.92 ? 2 : 1, b > 0.92 ? 2 : 1);
  }
  ctx.restore();
}

function drawGlobe(f: Frame, o: Ortho, show: { coast: number; borders: number; grid: number; india: number; alpha: number }) {
  const { ctx, W, H } = f;
  const a = f.film.assets;
  // The night side of the planet, and its thin air.
  const glow = ctx.createRadialGradient(o.cx, o.cy, o.r * 0.96, o.cx, o.cy, o.r * 1.22);
  glow.addColorStop(0, `rgba(126,163,181,${0.28 * show.alpha})`);
  glow.addColorStop(1, 'rgba(126,163,181,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  const body = ctx.createRadialGradient(o.cx - o.r * 0.35, o.cy - o.r * 0.4, o.r * 0.1, o.cx, o.cy, o.r);
  body.addColorStop(0, `rgba(30,42,38,${show.alpha})`);
  body.addColorStop(1, `rgba(9,13,12,${show.alpha})`);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(o.cx, o.cy, o.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.lineJoin = 'round';
  if (show.grid > 0) {
    ctx.strokeStyle = `rgba(176,122,82,${0.45 * show.alpha})`;
    ctx.lineWidth = 0.9;
    strokeRuns(ctx, graticule(show.grid), o, W, H);
  }
  if (show.coast > 0) {
    ctx.globalAlpha = show.coast * show.alpha;
    ctx.strokeStyle = 'rgba(232,225,207,0.72)';
    ctx.lineWidth = 1;
    strokeRuns(ctx, a.worldCoast, o, W, H);
  }
  if (show.borders > 0) {
    ctx.globalAlpha = show.borders * show.alpha;
    ctx.strokeStyle = 'rgba(232,225,207,0.32)';
    ctx.lineWidth = 0.8;
    strokeRuns(ctx, a.worldBorders, o, W, H);
  }
  if (show.india > 0) {
    ctx.globalAlpha = show.india * show.alpha;
    ctx.fillStyle = 'rgba(232,225,207,0.07)';
    ctx.strokeStyle = '#e8e1cf';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (const s of a.states) {
      for (const ring of s.rings) {
        let pen = false;
        for (const [lng, lat] of ring) {
          const p = orth(o, lng, lat);
          if (!p) {
            pen = false;
            continue;
          }
          if (pen) ctx.lineTo(p[0], p[1]);
          else ctx.moveTo(p[0], p[1]);
          pen = true;
        }
      }
    }
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

export const docGlobe: Scene = (f) => {
  const { ctx, u, W, H } = f;
  const phase = (f.shot as { params?: { phase?: string } }).params?.phase ?? 'open';
  ctx.fillStyle = '#030504';
  ctx.fillRect(0, 0, W, H);

  if (phase === 'open') {
    stars(ctx, W, H, clamp01(u / 1.5), u * 3);
    const o: Ortho = { lng0: 35 + u * 2.2, lat0: 14, r: 340, cx: W / 2, cy: H / 2 + 10 };
    drawGlobe(f, o, {
      alpha: easeOutCubic(clamp01(u / 1.6)),
      coast: seg(u, 0.5, 2.4),
      borders: 0,
      grid: easeInOutCubic(seg(u, 1.4, 5.0)),
      india: 0,
    });
    return;
  }

  // The dive: turn to India, light it, fall toward it.
  const k = easeInOutQuint(seg(u, 0.4, f.d));
  const turn = easeInOutCubic(seg(u, 0, f.d * 0.55));
  const o: Ortho = {
    lng0: lerp(47.5, 81.5, turn),
    lat0: lerp(14, 22.5, turn),
    // The globe's radius grows until India alone fills the frame.
    r: 340 * Math.pow(9.5, k),
    cx: W / 2,
    cy: H / 2 + lerp(10, 0, k),
  };
  stars(ctx, W, H, 1 - k, 12 + u * 3);
  drawGlobe(f, o, {
    alpha: 1,
    coast: 1,
    borders: seg(u, 0.4, 2.6),
    grid: 1 - 0.7 * k,
    india: seg(u, 2.2, 4.2),
  });
};

/** The title, over the end of the dive and the first moment of India. */
export const docTitle: Scene = (f) => {
  const { ctx, t, W, H } = f;
  const at = CUES.titleCard as number;
  const out = at + 2.9;
  if (t < at || t > out + 0.6) return;
  const shade = clamp01((t - at) / 0.4) * (1 - clamp01((t - out) / 0.6));
  const g = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.45);
  g.addColorStop(0, `rgba(3,5,4,${0.6 * shade})`);
  g.addColorStop(1, 'rgba(3,5,4,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  drawText(ctx, { text: TITLE, x: W / 2, y: H / 2 + 40, size: 132, family: SERIF, weight: 300, tracking: -0.012, align: 'center', preset: 'chars', at, dur: 1.2, until: out, out: 0.6 }, t);
  drawText(ctx, { text: 'A film for the India Species Atlas', x: W / 2, y: H / 2 + 104, size: 16, weight: 500, tracking: 0.3, upper: true, align: 'center', color: INK.canvasDim, preset: 'tracking', at: at + 0.7, dur: 1, until: out, out: 0.6 }, t);
};

/** "A stroke of ink": a single line drawn across paper, the brightest frame in the film. */
let paper: HTMLCanvasElement | null = null;

export const docInk: Scene = (f) => {
  const { ctx, u, d, W, H } = f;
  if (!paper) {
    paper = document.createElement('canvas');
    paper.width = W;
    paper.height = H;
    const p = paper.getContext('2d')!;
    p.fillStyle = '#d8cfb7';
    p.fillRect(0, 0, W, H);
    // Paper fibre: fine deterministic noise.
    const img = p.getImageData(0, 0, W, H);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (hash1(i * 0.37) - 0.5) * 16;
      img.data[i] += n;
      img.data[i + 1] += n;
      img.data[i + 2] += n * 0.8;
    }
    p.putImageData(img, 0, 0);
  }
  const k = u / d;
  const zoom = 1.06 - 0.04 * k;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-W / 2 - 20 * k, -H / 2);
  ctx.drawImage(paper, 0, 0);
  // The stroke: a pressure-varying line built from overlapping dabs.
  const draw = easeInOutCubic(seg(u, 0.12, Math.min(d - 0.1, 1.25)));
  const steps = 420;
  ctx.fillStyle = '#16140f';
  for (let i = 0; i < steps * draw; i++) {
    const s = i / steps;
    const x = lerp(-80, W + 80, s);
    const y = H * 0.52 + Math.sin(s * 3.1 + 0.4) * 34 + Math.sin(s * 11) * 3;
    const w = 5.5 * (0.55 + 0.45 * Math.sin(s * Math.PI)) * (0.85 + 0.3 * hash1(i));
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.ellipse(x, y, w * 1.4, w, -0.15, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Shallow depth of field: the edges of the sheet fall out of focus and light.
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95);
  v.addColorStop(0, 'rgba(40,30,18,0)');
  v.addColorStop(1, 'rgba(40,30,18,0.55)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
};
