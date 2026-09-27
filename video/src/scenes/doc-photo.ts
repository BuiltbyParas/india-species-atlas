import type { Frame, Scene } from '../engine/film';
import { clamp01, easeInOutCubic, easeOutExpo, seg } from '../engine/ease';
import { drawPlate, plateShade } from '../engine/photo';
import { INK, SANS, SERIF, STATUS, drawRule, drawText } from '../engine/type';
import { photoCredit, titleBlock } from './common';

/**
 * The documentary's species plates: a photograph held long enough to look
 * at, the species block read from the data, and — where the narration gives
 * one — a figure that rises out of the frame with its source under it.
 */

const FRAMING: Record<string, { focus: [number, number]; zoom: [number, number]; drift?: [number, number]; scrim?: number }> = {
  'great-indian-bustard': { focus: [0.6, 0.6], zoom: [1.06, 1.2], drift: [-0.04, 0] },
  'bengal-tiger': { focus: [0.47, 0.47], zoom: [1.08, 1.18], drift: [0.06, 0] },
  'ganges-river-dolphin': { focus: [0.6, 0.44], zoom: [1.1, 1.24] },
  'snow-leopard': { focus: [0.44, 0.44], zoom: [1.08, 1.14], drift: [0.02, -0.01], scrim: 0.5 },
  'indian-rhinoceros': { focus: [0.5, 0.6], zoom: [1.26, 1.38], scrim: 0.35 },
};

type Params = {
  species: string;
  name: number;
  counter?: { at: number; label: string; value: number; prefix?: string; from?: number; fromPrefix?: string; riseAt?: number; note?: string; second?: { at: number; text: string } };
  status?: { at: number; from: string; to: string; year: number; note: string; noteAt: number };
};

/**
 * Figures count up in hundreds, so no frame ever shows a precise number the
 * record does not give (the record says “roughly 3,700”, not 3,712).
 */
const fmt = (n: number) => (Math.round(n / 100) * 100).toLocaleString('en-US');

/** A figure, lower right: label, the number counting to its value, and its source. */
function counter(f: Frame, c: NonNullable<Params['counter']>) {
  const { ctx, t, W, H } = f;
  if (t < c.at) return;
  const x = W - 120;
  const y = H - 250;
  drawText(ctx, { text: c.label, x, y, size: 15, weight: 500, tracking: 0.24, upper: true, align: 'right', color: INK.canvasDim, preset: 'tracking', at: c.at, dur: 0.8 }, t);
  let value: string;
  if (c.from !== undefined && c.riseAt !== undefined) {
    const k = easeOutExpo(seg(t, c.riseAt, c.riseAt + 2.2));
    value = k <= 0 ? `${c.fromPrefix ?? ''}${fmt(c.from)}` : `${k < 1 ? '' : c.prefix ?? ''}${fmt(c.from + (c.value - c.from) * k)}`;
  } else {
    const k = easeOutExpo(seg(t, c.at + 0.2, c.at + 2.0));
    value = `${k >= 1 ? c.prefix ?? '' : ''}${fmt(c.value * k)}`;
  }
  const a = clamp01((t - c.at - 0.1) / 0.4);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = `300 96px ${SANS}`;
  (ctx as unknown as { fontVariantNumeric: string }).fontVariantNumeric = 'tabular-nums';
  ctx.letterSpacing = '-2px';
  ctx.textAlign = 'right';
  ctx.fillStyle = INK.canvas;
  ctx.fillText(value, x, y + 100);
  ctx.restore();
  drawRule(ctx, x - 360, y + 124, 360, seg(t, c.at + 0.4, c.at + 1.2), 'rgba(232,225,207,0.35)');
  if (c.note) drawText(ctx, { text: c.note, x, y: y + 150, size: 14, weight: 400, tracking: 0.04, align: 'right', color: INK.canvasFaint, preset: 'fade', at: c.at + 0.9, dur: 0.8 }, t);
  if (c.second) drawText(ctx, { text: c.second.text, x, y: y - 44, size: 34, family: SERIF, weight: 300, italic: true, align: 'right', preset: 'mask', at: c.second.at, dur: 0.9 }, t);
}

/** A category change: the old category struck through, the new one set beside it. */
function statusChange(f: Frame, s: NonNullable<Params['status']>) {
  const { ctx, t, W, H } = f;
  if (t < s.at) return;
  const x = W - 120;
  const y = H - 200;
  const from = STATUS.EN;
  const to = STATUS.VU;
  ctx.save();
  ctx.textAlign = 'right';
  ctx.font = `500 26px ${SANS}`;
  ctx.letterSpacing = '5px';
  const a = clamp01((t - s.at) / 0.5);
  const toW = ctx.measureText(s.to.toUpperCase()).width;
  const arrowX = x - toW - 40;
  ctx.globalAlpha = a;
  ctx.fillStyle = from.hex;
  ctx.fillText(s.from.toUpperCase(), arrowX - 36, y);
  const fromW = ctx.measureText(s.from.toUpperCase()).width;
  // The strike is ruled through, like a correction on a map.
  const strike = easeInOutCubic(seg(t, s.at + 0.5, s.at + 1.0));
  ctx.fillStyle = INK.canvas;
  ctx.fillRect(arrowX - 36 - fromW - 4, y - 9, (fromW + 4) * strike, 2);
  const b = clamp01((t - s.at - 1.0) / 0.5);
  ctx.globalAlpha = b;
  ctx.fillStyle = INK.canvasDim;
  ctx.fillText('→', arrowX, y);
  ctx.fillStyle = to.hex;
  ctx.fillText(s.to.toUpperCase(), x, y);
  ctx.restore();
  drawText(ctx, { text: String(s.year), x, y: y - 46, size: 16, weight: 500, tracking: 0.3, align: 'right', color: INK.canvasDim, preset: 'fade', at: s.at + 1.1, dur: 0.6 }, t);
  drawText(ctx, { text: s.note, x, y: y + 44, size: 26, family: SERIF, weight: 300, italic: true, align: 'right', preset: 'mask', at: s.noteAt, dur: 1 }, t);
}

export const docPhoto: Scene = (f) => {
  const p = (f.shot as { params?: Params }).params!;
  const fr = FRAMING[p.species];
  const { ctx, W, H, u, d, t } = f;
  drawPlate(ctx, f.film.assets.photos.get(p.species), W, H, { u, d, focus: fr.focus, zoom: fr.zoom, drift: fr.drift, rack: [1.0, 16] });
  plateShade(ctx, W, H, 0.66, 0.55);
  const scrim = (cx: number, a: number) => {
    const g = ctx.createRadialGradient(cx, H - 230, 40, cx, H - 230, 760);
    g.addColorStop(0, `rgba(8,12,10,${a})`);
    g.addColorStop(1, 'rgba(8,12,10,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  if (fr.scrim) scrim(360, fr.scrim);
  if (p.counter || p.status) scrim(W - 360, 0.45 * clamp01((t - (p.counter?.at ?? p.status!.at) + 0.3) / 0.6));
  // Leave the lower right to the counter or category change.
  titleBlock(f, p.species, p.name, undefined, p.counter || p.status ? W - 1060 : undefined);
  if (p.counter) counter(f, p.counter);
  if (p.status) statusChange(f, p.status);
  photoCredit(f, p.species, clamp01((t - p.name - 0.6) / 0.6));
};

type Line = { at: number; text: string; sub?: string };

/**
 * Kinetic statements laid over a map or footage: a phrase that matters,
 * set large, and where it states a fact, its source under it.
 */
export const docKinetic: Scene = (f) => {
  const { ctx, t, W, H } = f;
  const lines = ((f.shot as { params?: { lines?: Line[] } }).params?.lines ?? []) as Line[];
  lines.forEach((l, i) => {
    const next = lines[i + 1]?.at ?? f.shot.end;
    const until = Math.min(next - 0.1, l.at + 4.2);
    if (t < l.at || t > until + 0.6) return;
    const a = clamp01((t - l.at) / 0.4) * (1 - clamp01((t - until) / 0.6));
    const g = ctx.createLinearGradient(0, H * 0.55, 0, H);
    g.addColorStop(0, 'rgba(8,12,10,0)');
    g.addColorStop(1, `rgba(8,12,10,${0.62 * a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    drawText(ctx, { text: l.text, x: W / 2, y: H - 190, size: 64, family: SERIF, weight: 300, align: 'center', preset: 'mask', at: l.at, dur: 0.9, until, out: 0.6 }, t);
    if (l.sub) drawText(ctx, { text: l.sub, x: W / 2, y: H - 134, size: 15, weight: 500, tracking: 0.16, align: 'center', color: INK.canvasDim, preset: 'fade', at: l.at + 0.5, dur: 0.8, until, out: 0.6 }, t);
  });
};
