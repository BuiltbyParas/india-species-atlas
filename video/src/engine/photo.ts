import { clamp01, easeInOutSine, easeOutCubic, lerp } from './ease';

/**
 * Photographs, handled as cinematic plates.
 *
 * The photographs are real and credited; the film only reframes them — a slow
 * push, a drift, a rack focus from soft to sharp — and grades them to sit
 * with the rest of the film. Nothing inside the frame is animated, repainted
 * or extended.
 */

export interface PlateSpec {
  /** Local time and duration of the shot. */
  u: number;
  d: number;
  /** The point of interest in the photograph, 0..1 of its width and height. */
  focus?: [number, number];
  /** Scale over the shot, relative to a cover fit. */
  zoom?: [number, number];
  /** Drift of the focus point over the shot, in fractions of the frame. */
  drift?: [number, number];
  /** Seconds the rack focus takes to resolve, and its starting blur in px. */
  rack?: [number, number];
  filter?: string;
  alpha?: number;
}

export function drawPlate(ctx: CanvasRenderingContext2D, img: HTMLImageElement | undefined, W: number, H: number, s: PlateSpec) {
  if (!img) {
    placeholder(ctx, W, H, 'PHOTOGRAPH MISSING');
    return;
  }
  const k = clamp01(s.u / s.d);
  const [z0, z1] = s.zoom ?? [1.04, 1.12];
  const zoom = lerp(z0, z1, easeInOutSine(k));
  const cover = Math.max(W / img.naturalWidth, H / img.naturalHeight) * zoom;
  const w = img.naturalWidth * cover;
  const h = img.naturalHeight * cover;
  const [fx, fy] = s.focus ?? [0.5, 0.5];
  const [dx, dy] = s.drift ?? [0, 0];
  // Put the focus point at the frame centre, then keep the image covering the frame.
  let x = W / 2 - fx * w + dx * W * (k - 0.5);
  let y = H / 2 - fy * h + dy * H * (k - 0.5);
  x = Math.min(0, Math.max(W - w, x));
  y = Math.min(0, Math.max(H - h, y));

  const [rackDur, rackPx] = s.rack ?? [0, 0];
  const blur = rackDur > 0 ? rackPx * (1 - easeOutCubic(clamp01(s.u / rackDur))) : 0;
  ctx.save();
  ctx.globalAlpha = s.alpha ?? 1;
  const filters = [s.filter ?? '', blur > 0.2 ? `blur(${blur.toFixed(2)}px)` : ''].filter(Boolean).join(' ');
  ctx.filter = filters || 'none';
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
}

/** A soft vignette and a floor gradient so type has somewhere to sit. */
export function plateShade(ctx: CanvasRenderingContext2D, W: number, H: number, floor = 0.55, vignette = 0.5) {
  ctx.save();
  const g = ctx.createLinearGradient(0, H * 0.45, 0, H);
  g.addColorStop(0, 'rgba(8,12,10,0)');
  g.addColorStop(1, `rgba(8,12,10,${floor})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const r = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
  r.addColorStop(0, 'rgba(0,0,0,0)');
  r.addColorStop(1, `rgba(0,0,0,${vignette})`);
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** What a missing asset looks like: obvious on screen, never silently swapped. */
export function placeholder(ctx: CanvasRenderingContext2D, W: number, H: number, label: string) {
  ctx.save();
  ctx.fillStyle = '#1a1414';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#d64545';
  ctx.lineWidth = 4;
  ctx.strokeRect(40, 40, W - 80, H - 80);
  ctx.fillStyle = '#d64545';
  ctx.font = '600 40px "Geist", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, W / 2, H / 2);
  ctx.restore();
}
