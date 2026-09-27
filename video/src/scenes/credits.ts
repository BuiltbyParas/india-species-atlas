import { CREDITS, FEATURED, SITE_URL, TITLE } from '../films/promo.mjs';
import type { Scene } from '../engine/film';
import { clamp01, easeInOutCubic } from '../engine/ease';
import { INK, SANS, SERIF } from '../engine/type';

/**
 * S19 — credits. Every name and licence here is read from the data the film
 * used: the species records' sources, the photographs' own credits, and the
 * timeline's statement of how the voice and score were made. Nothing is
 * typed in as a person's name.
 */

function block(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, label: string, lines: string[]) {
  ctx.font = `500 12px ${SANS}`;
  ctx.letterSpacing = '2.4px';
  ctx.fillStyle = INK.canvasFaint;
  ctx.fillText(label.toUpperCase(), x, y);
  ctx.font = `400 15px ${SANS}`;
  ctx.letterSpacing = '0.2px';
  ctx.fillStyle = INK.canvasDim;
  let yy = y + 28;
  for (const line of lines) {
    // Wrap to the column.
    const words = line.split(' ');
    let cur = '';
    for (const w0 of words) {
      const next = cur ? `${cur} ${w0}` : w0;
      if (ctx.measureText(next).width > w && cur) {
        ctx.fillText(cur, x, yy);
        yy += 22;
        cur = w0;
      } else cur = next;
    }
    if (cur) {
      ctx.fillText(cur, x, yy);
      yy += 22;
    }
    yy += 4;
  }
  return yy;
}

export const credits: Scene = (f) => {
  const { ctx, t, W, H } = f;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const a = easeInOutCubic(clamp01((t - 64.15) / 0.5)) * (1 - easeInOutCubic(clamp01((t - 68.3) / 0.6)));
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;

  ctx.font = `300 40px ${SERIF}`;
  ctx.fillStyle = INK.canvas;
  ctx.fillText(TITLE, 120, 170);
  ctx.font = `400 15px ${SANS}`;
  ctx.letterSpacing = '0.3px';
  ctx.fillStyle = INK.canvasDim;
  ctx.fillText(`A film for the India Species Atlas · ${SITE_URL}`, 120, 204);

  const species = FEATURED.map((id: string) => f.film.assets.species.get(id)).filter(Boolean);
  const publishers = [...new Set(species.flatMap((s) => s!.sources.map((src) => src.publisher)))];
  const photos = FEATURED.map((id: string) => {
    const m = f.film.assets.photoMeta.get(id);
    const s = f.film.assets.species.get(id);
    return m && s ? `${s.commonName} — ${m.artist}, ${m.licence}` : `${id} — credit missing`;
  });

  const col = 520;
  const gap = 90;
  const x1 = 120;
  const x2 = x1 + col + gap;
  const x3 = x2 + col + gap;
  let y = 290;
  y = block(ctx, x1, y, col, 'Research and data', [
    'Species, categories, localities and threats: the India Species Atlas dataset, as published on the site.',
    `Sources it cites for these five species: ${publishers.join(' · ')}.`,
  ]);
  block(ctx, x1, y + 22, col, 'Geography', CREDITS.geography);

  y = block(ctx, x2, 290, col, 'Photographs (Wikimedia Commons)', [...photos, 'Cropped and colour-graded for the film.']);
  block(ctx, x2, y + 22, col, 'Illustration', CREDITS.illustration);

  y = block(ctx, x3, 290, col - 40, 'Narration', [CREDITS.voice]);
  y = block(ctx, x3, y + 22, col - 40, 'Music and sound', [CREDITS.music]);
  block(ctx, x3, y + 22, col - 40, 'Made with', [CREDITS.software]);
  ctx.restore();
};
