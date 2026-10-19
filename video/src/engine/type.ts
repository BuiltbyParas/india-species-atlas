import { clamp01, easeInOutCubic, easeOutCubic, easeOutExpo, easeOutQuart, seg } from './ease';

/**
 * Cinematic typography, drawn on the stage canvas.
 *
 * Two voices, both the atlas's own faces: Newsreader for names and titles,
 * Geist in spaced capitals for labels and metadata. Type appears only when it
 * says something the picture cannot, and every block enters with one of a
 * small set of presets and leaves the same way, so no two shots invent their
 * own motion language.
 */

export const SERIF = '"Newsreader", Georgia, serif';
export const SANS = '"Geist", system-ui, sans-serif';

export const INK = {
  canvas: '#e8e1cf',
  canvasDim: 'rgba(232, 225, 207, 0.62)',
  canvasFaint: 'rgba(232, 225, 207, 0.38)',
  clay: '#b07a52',
  river: '#7ea3b5',
  forest950: '#0e1411',
  forest900: '#131a16',
  forest400: '#86a593',
};

export type Preset = 'fade' | 'slide' | 'tracking' | 'mask' | 'line' | 'chars' | 'scale';

export interface TextSpec {
  text: string;
  x: number;
  y: number;
  size: number;
  family?: string;
  weight?: number;
  italic?: boolean;
  color?: string;
  align?: CanvasTextAlign;
  /** Letter spacing in em. */
  tracking?: number;
  upper?: boolean;
  preset?: Preset;
  /** Time the entrance starts, and how long it takes. */
  at: number;
  dur?: number;
  /** Time the exit starts (omit to hold), and how long it takes. */
  until?: number;
  out?: number;
  alpha?: number;
}

function font(s: TextSpec) {
  return `${s.italic ? 'italic ' : ''}${s.weight ?? 400} ${s.size}px ${s.family ?? SANS}`;
}

/** Width of a string as it will be drawn, spacing included. */
export function measure(ctx: CanvasRenderingContext2D, s: Pick<TextSpec, 'text' | 'size' | 'family' | 'weight' | 'italic' | 'tracking' | 'upper'>) {
  ctx.save();
  ctx.font = font(s as TextSpec);
  ctx.letterSpacing = `${(s.tracking ?? 0) * s.size}px`;
  const w = ctx.measureText(s.upper ? s.text.toUpperCase() : s.text).width - (s.tracking ?? 0) * s.size;
  ctx.restore();
  return w;
}

/** 0..1 visibility of a block at time t, entrance and exit included. */
export function presence(s: Pick<TextSpec, 'at' | 'dur' | 'until' | 'out'>, t: number) {
  const inK = seg(t, s.at, s.at + (s.dur ?? 0.8));
  const outK = s.until === undefined ? 0 : seg(t, s.until, s.until + (s.out ?? 0.5));
  return { inK, outK, visible: t >= s.at && outK < 1 };
}

export function drawText(ctx: CanvasRenderingContext2D, s: TextSpec, t: number) {
  const { inK, outK, visible } = presence(s, t);
  if (!visible) return;
  const text = s.upper ? s.text.toUpperCase() : s.text;
  const tracking = s.tracking ?? 0;
  const exitA = 1 - easeInOutCubic(outK);
  const exitY = -10 * easeInOutCubic(outK);
  const base = (s.alpha ?? 1) * exitA;
  const preset = s.preset ?? 'fade';

  ctx.save();
  ctx.font = font(s);
  ctx.fillStyle = s.color ?? INK.canvas;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = s.align ?? 'left';
  ctx.letterSpacing = `${tracking * s.size}px`;
  // Canvas adds the spacing after the last glyph too; centre and right
  // alignment would drift by that much without this.
  const trail = tracking * s.size;
  const nudge = ctx.textAlign === 'center' ? trail / 2 : ctx.textAlign === 'right' ? trail : 0;
  const x = s.x + nudge;
  const y = s.y + exitY;

  switch (preset) {
    case 'fade': {
      ctx.globalAlpha = base * easeOutCubic(inK);
      ctx.fillText(text, x, y);
      break;
    }
    case 'slide': {
      const k = easeOutExpo(inK);
      ctx.globalAlpha = base * easeOutCubic(inK);
      ctx.fillText(text, x, y + (1 - k) * s.size * 0.35);
      break;
    }
    case 'tracking': {
      const k = easeOutQuart(inK);
      const extra = (1 - k) * 0.32 * s.size;
      ctx.letterSpacing = `${tracking * s.size + extra}px`;
      const n = ctx.textAlign === 'center' ? (trail + extra) / 2 : nudge;
      ctx.globalAlpha = base * clamp01(inK * 1.6);
      ctx.fillText(text, s.x + n, y);
      break;
    }
    case 'mask': {
      // Rises out from behind its own baseline.
      const k = easeOutExpo(inK);
      const w = measure(ctx, s) + s.size;
      const left = ctx.textAlign === 'center' ? s.x - w / 2 : ctx.textAlign === 'right' ? s.x - w : s.x - s.size * 0.1;
      ctx.beginPath();
      ctx.rect(left, y - s.size * 1.15, w, s.size * 1.45);
      ctx.clip();
      ctx.globalAlpha = base;
      ctx.fillText(text, x, y + (1 - k) * s.size * 1.2);
      break;
    }
    case 'line': {
      // A rule draws first; the text slides out from under it.
      const w = measure(ctx, s);
      const left = ctx.textAlign === 'center' ? s.x - w / 2 : ctx.textAlign === 'right' ? s.x - w : s.x;
      const rk = easeInOutCubic(seg(inK, 0, 0.55));
      const tk = easeOutExpo(seg(inK, 0.35, 1));
      ctx.globalAlpha = base * 0.8;
      ctx.fillRect(left, y + s.size * 0.42, w * rk, Math.max(1, s.size * 0.06));
      ctx.save();
      ctx.beginPath();
      ctx.rect(left - s.size, y - s.size * 1.2, w + s.size * 2, s.size * 1.6);
      ctx.clip();
      ctx.globalAlpha = base;
      ctx.fillText(text, x, y + (1 - tk) * s.size * 1.1);
      ctx.restore();
      break;
    }
    case 'chars': {
      // Each character rises and resolves in turn.
      const w = measure(ctx, s);
      const left = ctx.textAlign === 'center' ? s.x - w / 2 : ctx.textAlign === 'right' ? s.x - w : s.x;
      ctx.textAlign = 'left';
      const dur = s.dur ?? 0.8;
      const n = text.length;
      const stagger = Math.min(0.045, (dur * 0.6) / Math.max(1, n));
      let prefix = '';
      for (let i = 0; i < n; i++) {
        const cx = left + (prefix ? ctx.measureText(prefix).width : 0);
        prefix += text[i];
        const k = seg(t, s.at + i * stagger, s.at + i * stagger + dur * 0.55);
        if (k <= 0) continue;
        ctx.globalAlpha = base * easeOutCubic(k);
        ctx.fillText(text[i], cx, y + (1 - easeOutExpo(k)) * s.size * 0.28);
      }
      break;
    }
    case 'scale': {
      const k = easeOutQuart(inK);
      const sc = 1.07 - 0.07 * k;
      ctx.globalAlpha = base * easeOutCubic(inK);
      ctx.filter = inK < 1 ? `blur(${((1 - k) * s.size * 0.05).toFixed(2)}px)` : 'none';
      ctx.translate(s.x, y - s.size * 0.35);
      ctx.scale(sc, sc);
      ctx.fillText(text, nudge, s.size * 0.35);
      break;
    }
  }
  ctx.restore();
}

/** A thin rule that draws across, for dividers under names. */
export function drawRule(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, k: number, color = INK.canvasFaint, lw = 1) {
  if (k <= 0) return;
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * easeInOutCubic(clamp01(k)), lw);
  ctx.restore();
}

export const STATUS = {
  CR: { hex: '#d64545', label: 'Critically Endangered' },
  EN: { hex: '#e0812b', label: 'Endangered' },
  VU: { hex: '#e6b800', label: 'Vulnerable' },
  NT: { hex: '#7a9e3f', label: 'Near Threatened' },
  LC: { hex: '#3f8f5c', label: 'Least Concern' },
  DD: { hex: '#3d4a44', label: 'Data Deficient' },
} as const;
