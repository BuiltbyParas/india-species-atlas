import { REGIONS } from '../../../src/data/regions';
import type { Species } from '../../../src/types';
import { FEATURED } from '../films/promo.mjs';
import type { Frame } from '../engine/film';
import { clamp01, easeOutCubic, hash1, seg, window01 } from '../engine/ease';
import { INK, SANS, SERIF, STATUS, drawRule, drawText, measure } from '../engine/type';
import type { Pt } from '../engine/draw';

/**
 * Pieces every scene shares: the species title block, chapter markers,
 * photo credits, the "illustrative" tag, and atmosphere.
 */

export const MARGIN = 120;

export function species(f: Frame, id: string): Species {
  const s = f.film.assets.species.get(id);
  if (!s) throw new Error(`species ${id} not loaded`);
  return s;
}

/**
 * The species block, lower left: chapter marker, name, scientific name, a
 * rule, and the IUCN category with its colour. Everything in it is read
 * from the atlas's data at render time.
 */
/** `maxWidth`: a name wider than this is set on two lines, and the block lifts to make room. */
export function titleBlock(f: Frame, id: string, at: number, until?: number, maxWidth?: number) {
  const { ctx, t, H } = f;
  const s = species(f, id);
  const n = FEATURED.indexOf(id) + 1;
  const region = REGIONS.find((r) => r.id === s.regions[0])?.name ?? '';
  const status = STATUS[s.status];
  const x = MARGIN;
  const base = H - 170;
  const out = until === undefined ? {} : { until, out: 0.45 };

  const name = { text: s.commonName, size: 96, family: SERIF, weight: 330, tracking: -0.012 };
  let names = [s.commonName];
  if (maxWidth && measure(ctx, name) > maxWidth) {
    // Break at the space nearest the middle.
    const words = s.commonName.split(' ');
    let best = 1;
    for (let i = 1; i < words.length; i++) {
      const d = Math.abs(words.slice(0, i).join(' ').length - s.commonName.length / 2);
      if (d < Math.abs(words.slice(0, best).join(' ').length - s.commonName.length / 2)) best = i;
    }
    names = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
  }
  const lift = (names.length - 1) * 98;

  drawText(ctx, {
    text: `${String(n).padStart(2, '0')} / 05   ${region}`, x, y: base - 150 - lift, size: 15, family: SANS, weight: 500,
    tracking: 0.28, upper: true, color: INK.canvasDim, preset: 'tracking', at, dur: 0.9, ...out,
  }, t);
  names.forEach((line, i) => drawText(ctx, {
    ...name, text: line, x, y: base - 52 - lift + i * 98,
    preset: 'mask', at: at + 0.12 + i * 0.12, dur: 1.0, ...out,
  }, t));
  drawText(ctx, {
    text: s.scientificName, x, y: base, size: 29, family: SERIF, weight: 300, italic: true,
    color: INK.canvasDim, preset: 'fade', at: at + 0.45, dur: 0.8, ...out,
  }, t);
  const vis = until === undefined ? 1 : 1 - clamp01((t - until) / 0.45);
  drawRule(ctx, x, base + 30, 420, seg(t, at + 0.55, at + 1.25) * vis, 'rgba(232,225,207,0.3)');
  // Status: a colour chip, then the category in spaced capitals.
  const k = easeOutCubic(seg(t, at + 0.8, at + 1.3)) * vis;
  if (k > 0) {
    ctx.save();
    ctx.globalAlpha = k;
    ctx.fillStyle = status.hex;
    ctx.fillRect(x, base + 58, 14, 14);
    ctx.restore();
  }
  drawText(ctx, {
    text: status.label, x: x + 30, y: base + 72, size: 18, family: SANS, weight: 500, tracking: 0.24, upper: true,
    color: INK.canvas, preset: 'tracking', at: at + 0.85, dur: 0.9, ...out,
  }, t);
  drawText(ctx, {
    text: `IUCN Red List · assessed ${s.statusAssessedYear}`, x: x + 30, y: base + 100, size: 14, family: SANS, weight: 400,
    tracking: 0.08, color: INK.canvasFaint, preset: 'fade', at: at + 1.1, dur: 0.8, ...out,
  }, t);
}

/** The photographer and licence, small, bottom right — required, and honest. */
export function photoCredit(f: Frame, id: string, alpha = 1) {
  const meta = f.film.assets.photoMeta.get(id);
  if (!meta) return;
  const { ctx, W, H } = f;
  ctx.save();
  ctx.globalAlpha = 0.7 * alpha;
  ctx.fillStyle = INK.canvas;
  ctx.font = `400 13px ${SANS}`;
  ctx.letterSpacing = '0.6px';
  ctx.textAlign = 'right';
  ctx.fillText(`Photograph: ${meta.artist} · ${meta.licence} · Wikimedia Commons`, W - 60, H - 44);
  ctx.restore();
}

/** Marks a layer as a drawing device rather than data, where it is drawn. */
export function illustrativeTag(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, alpha: number, align: CanvasTextAlign = 'left') {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `500 13px ${SANS}`;
  ctx.letterSpacing = '2.2px';
  const label = text.toUpperCase();
  const w = ctx.measureText(label).width;
  const left = align === 'right' ? x - w - 20 : align === 'center' ? x - w / 2 - 10 : x;
  ctx.strokeStyle = 'rgba(232,225,207,0.45)';
  ctx.setLineDash([3, 3]);
  ctx.lineWidth = 1;
  ctx.strokeRect(left + 0.5, y - 16.5, w + 18, 25);
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(232,225,207,0.85)';
  ctx.fillText(label, left + 9, y + 1);
  ctx.restore();
}

/** A small label for a place on a map, with a leader line. */
export function placeLabel(ctx: CanvasRenderingContext2D, text: string, p: Pt, alpha: number, dx = 26, dy = -22) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = 'rgba(232,225,207,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(p[0], p[1]);
  ctx.lineTo(p[0] + dx * 0.7, p[1] + dy);
  ctx.lineTo(p[0] + dx, p[1] + dy);
  ctx.stroke();
  ctx.fillStyle = INK.canvas;
  ctx.font = `500 15px ${SANS}`;
  ctx.letterSpacing = '0.4px';
  ctx.textAlign = dx < 0 ? 'right' : 'left';
  ctx.fillText(text, p[0] + dx + (dx < 0 ? -8 : 8), p[1] + dy + 5);
  ctx.restore();
}

/** A layer legend line, bottom left on maps: what the drawn lines are, and where from. */
export function sourceNote(f: Frame, text: string, alpha: number) {
  if (alpha <= 0) return;
  const { ctx, H } = f;
  ctx.save();
  ctx.globalAlpha = alpha * 0.75;
  ctx.fillStyle = INK.canvas;
  ctx.font = `400 13px ${SANS}`;
  ctx.letterSpacing = '0.5px';
  ctx.fillText(text, 60, H - 44);
  ctx.restore();
}

/** Floating motes in a light beam, deterministic in t. */
export function motes(ctx: CanvasRenderingContext2D, t: number, W: number, H: number, n: number, color: string, alpha: number, drift: Pt = [8, -4], seed = 1) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const r1 = hash1(i * 7.1 + seed);
    const r2 = hash1(i * 3.7 + seed * 2);
    const r3 = hash1(i * 1.3 + seed * 3);
    const depth = 0.3 + r3 * 0.7;
    const x = (((r1 * W + t * drift[0] * 10 * depth) % W) + W) % W;
    const y = (((r2 * H + t * drift[1] * 10 * depth + Math.sin(t * 0.7 + i) * 6) % H) + H) % H;
    const tw = 0.5 + 0.5 * Math.sin(t * (0.8 + r1) + i);
    ctx.globalAlpha = alpha * tw * depth;
    ctx.beginPath();
    ctx.arc(x, y, 0.8 + depth * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Letterbox-free cinematic vignette. */
export function vignette(f: Frame, amount = 0.55) {
  const { ctx, W, H } = f;
  const r = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 1.0);
  r.addColorStop(0, 'rgba(0,0,0,0)');
  r.addColorStop(1, `rgba(0,0,0,${amount})`);
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, W, H);
}

export { measure, window01, easeOutCubic, clamp01, seg };
