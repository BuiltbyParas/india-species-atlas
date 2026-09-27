import { CUES, SITE_URL, SUBTITLE, TITLE } from '../timeline.mjs';
import type { Scene } from '../engine/film';
import { clamp01, easeInOutCubic, seg } from '../engine/ease';
import { INK, SANS, SERIF, drawRule, drawText } from '../engine/type';
import { convergeMap } from './converge';

/**
 * S18 — everything stops on the hit. The map stays, quiet, under the title;
 * then the subtitle, then the one thing to do next. Held, then to black.
 */
export const title: Scene = (f) => {
  const { ctx, t, W, H } = f;
  convergeMap(f, 1);

  // A soft pool of dark behind the type so it never fights the map.
  const pool = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, W * 0.5);
  pool.addColorStop(0, 'rgba(10,14,12,0.72)');
  pool.addColorStop(1, 'rgba(10,14,12,0.2)');
  ctx.fillStyle = pool;
  ctx.fillRect(0, 0, W, H);

  const cy = H * 0.47;
  drawText(ctx, { text: TITLE, x: W / 2, y: cy, size: 148, family: SERIF, weight: 300, tracking: -0.015, align: 'center', preset: 'chars', at: CUES.title, dur: 1.4 }, t);
  drawText(ctx, { text: SUBTITLE, x: W / 2, y: cy + 78, size: 19, family: SANS, weight: 500, tracking: 0.24, upper: true, align: 'center', color: INK.canvasDim, preset: 'tracking', at: CUES.subtitle, dur: 1.2 }, t);
  drawRule(ctx, W / 2 - 40, cy + 142, 80, seg(t, CUES.cta, CUES.cta + 0.6), 'rgba(232,225,207,0.5)');
  drawText(ctx, { text: 'Explore the atlas', x: W / 2, y: cy + 204, size: 36, family: SERIF, weight: 300, italic: true, align: 'center', preset: 'slide', at: CUES.cta + 0.3, dur: 0.9 }, t);
  drawText(ctx, { text: SITE_URL, x: W / 2, y: cy + 246, size: 16, family: SANS, weight: 400, tracking: 0.12, align: 'center', color: INK.canvasDim, preset: 'fade', at: CUES.cta + 0.6, dur: 0.9 }, t);

  // To black.
  const out = easeInOutCubic(clamp01((t - CUES.fadeOut) / (CUES.credits - CUES.fadeOut)));
  if (out > 0) {
    ctx.fillStyle = `rgba(0,0,0,${out})`;
    ctx.fillRect(0, 0, W, H);
  }
};
