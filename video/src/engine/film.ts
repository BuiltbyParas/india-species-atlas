import { HEIGHT, SHOTS, WIDTH, shotAt } from '../timeline.mjs';
import { SHOTS as PROMO_SHOTS } from '../films/promo.mjs';
import type { Assets } from './data';
import { clamp01, easeInCubic, easeInOutCubic, easeInOutSine, easeOutCubic } from './ease';
import { Terrain } from './terrain';
import { SANS } from './type';

/**
 * The compositor. `render(t)` draws the frame at time t, and nothing else
 * decides what is on screen: no clocks, no accumulated state.
 *
 * Each shot's scene draws into a layer in the film's 1920×1080 coordinate
 * space. During a dissolve the outgoing shot is drawn as well (scenes accept
 * a time past their own end) and the two layers are mixed. Match cuts are
 * not transitions at all: the scenes on either side of the cut are built so
 * their lines land in the same place.
 */

type Shot = (typeof SHOTS)[number] & {
  /**
   * Plays another film's footage: the promo's scene covering source times
   * [from, to] is drawn across this shot, at whatever speed that implies,
   * optionally eased (a speed ramp).
   */
  remap?: { from: number; to: number; ease?: 'in' | 'out' | 'inOut' };
  /** Layers drawn over the shot's own scene (or its remapped footage). */
  overlay?: string[];
  /** Free-form parameters for the shot's scene. */
  params?: Record<string, unknown>;
};

const RAMPS = { in: easeInCubic, out: easeOutCubic, inOut: easeInOutCubic };

function promoShotAt(t: number) {
  for (const s of PROMO_SHOTS) if (t >= s.start && t < s.end) return s;
  return PROMO_SHOTS[PROMO_SHOTS.length - 1];
}

export interface Frame {
  ctx: CanvasRenderingContext2D;
  /** Film time, local shot time, shot duration, and local progress 0..1. */
  t: number;
  u: number;
  d: number;
  p: number;
  shot: Shot;
  film: Film;
  W: number;
  H: number;
}

export type Scene = (f: Frame) => void;

/** Per-shot finishing grade. The global grade and grain are applied in the edit. */
const GRADES: Record<string, string> = {
  dusk: 'contrast(1.04)',
  dawn: 'contrast(1.03) saturate(0.95)',
  map: 'none',
  photo: 'contrast(1.05) saturate(0.88) brightness(0.96)',
  night: 'contrast(1.05)',
  threat: 'contrast(1.07) saturate(0.82)',
  warm: 'contrast(1.03) saturate(0.96) sepia(0.06)',
  ui: 'none',
  river: 'saturate(0.9)',
  cold: 'saturate(0.85) brightness(1.02)',
  'cold-photo': 'contrast(1.04) saturate(0.78) brightness(0.98)',
};

export class Film {
  readonly W = WIDTH;
  readonly H = HEIGHT;
  readonly assets: Assets;
  readonly terrain: Terrain;
  private out: CanvasRenderingContext2D;
  private layers: [CanvasRenderingContext2D, CanvasRenderingContext2D];
  private scale: number;
  private scenes: Map<string, Scene>;
  private fallback: Scene;
  /** Scenes that asked for a shot name with no implementation. */
  readonly unresolved = new Set<string>();

  constructor(canvas: HTMLCanvasElement, assets: Assets, scale: number, scenes: Map<string, Scene>, fallback: Scene) {
    this.assets = assets;
    this.scale = scale;
    this.scenes = scenes;
    this.fallback = fallback;
    canvas.width = Math.round(WIDTH * scale);
    canvas.height = Math.round(HEIGHT * scale);
    this.out = canvas.getContext('2d', { alpha: false })!;
    const layer = () => {
      const c = document.createElement('canvas');
      c.width = canvas.width;
      c.height = canvas.height;
      return c.getContext('2d', { alpha: false })!;
    };
    this.layers = [layer(), layer()];
    this.terrain = new Terrain(assets, canvas.width, canvas.height, WIDTH, HEIGHT);
  }

  /** The scene function for a shot, honouring `photo:<id>` and `map:<name>` families. */
  sceneFor(shot: Shot): Scene {
    const direct = this.scenes.get(shot.scene);
    if (direct) return direct;
    const family = this.scenes.get(shot.scene.split(':')[0] + ':*');
    if (family) return family;
    this.unresolved.add(shot.scene);
    return this.fallback;
  }

  /** Resolves every scene a shot draws — its own, or the promo's it remaps — and its overlays. */
  resolve(shot: Shot) {
    if (shot.remap) {
      const lo = Math.min(shot.remap.from, shot.remap.to);
      const hi = Math.max(shot.remap.from, shot.remap.to);
      for (const s of PROMO_SHOTS) if ((s.end > lo && s.start < hi) || s === promoShotAt(lo)) this.sceneFor(s as Shot);
    } else {
      this.sceneFor(shot);
    }
    for (const name of shot.overlay ?? []) if (!this.scenes.has(name)) this.unresolved.add(name);
  }

  private draw(ctx: CanvasRenderingContext2D, shot: Shot, t: number) {
    ctx.save();
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    const d = shot.end - shot.start;
    const u = t - shot.start;
    const frame: Frame = { ctx, t, u, d, p: clamp01(u / d), shot, film: this, W: WIDTH, H: HEIGHT };
    if (shot.remap) {
      const r = shot.remap;
      const k = clamp01(u / d);
      const st = r.from + (r.to - r.from) * (r.ease ? RAMPS[r.ease](k) : k);
      const src = promoShotAt(st);
      const sd = src.end - src.start;
      this.sceneFor(src as Shot)({ ...frame, t: st, u: st - src.start, d: sd, p: clamp01((st - src.start) / sd), shot: src as Shot });
    } else {
      this.sceneFor(shot)(frame);
    }
    for (const name of shot.overlay ?? []) {
      const layer = this.scenes.get(name);
      if (layer) layer(frame);
      else this.unresolved.add(name);
    }
    ctx.restore();
  }

  /** Draws the terrain's current render into a scene's context, in film space. */
  blitTerrain(ctx: CanvasRenderingContext2D, alpha = 1) {
    const c = this.terrain.render();
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(c, 0, 0, WIDTH, HEIGHT);
    ctx.restore();
  }

  render(t: number) {
    const shot = shotAt(t);
    const index = SHOTS.indexOf(shot);
    const prev = index > 0 ? SHOTS[index - 1] : null;
    const tr = shot.transitionIn;
    const k = tr.duration ? clamp01((t - shot.start) / tr.duration) : 1;

    const [a, b] = this.layers;
    const out = this.out;
    const grade = (s: Shot) => GRADES[s.grade ?? 'map'] ?? 'none';

    this.draw(a, shot, t);
    out.save();
    out.setTransform(1, 0, 0, 1, 0, 0);
    out.fillStyle = '#000';
    out.fillRect(0, 0, out.canvas.width, out.canvas.height);

    if (tr.type === 'dissolve' && k < 1 && prev) {
      this.draw(b, prev, t);
      out.filter = grade(prev);
      out.drawImage(b.canvas, 0, 0);
      out.globalAlpha = easeInOutSine(k);
    } else if (tr.type === 'fade-from-black' && k < 1) {
      out.globalAlpha = easeInOutCubic(k);
    }
    out.filter = grade(shot);
    out.drawImage(a.canvas, 0, 0);
    out.globalAlpha = 1;
    out.filter = 'none';

    if (tr.type === 'flash') {
      const f = clamp01((t - shot.start) / 0.18);
      if (f < 1) {
        out.fillStyle = `rgba(232,225,207,${(0.55 * (1 - f) ** 2).toFixed(3)})`;
        out.fillRect(0, 0, out.canvas.width, out.canvas.height);
      }
    }
    out.restore();
  }
}

/** Shown for any scene that has not been built yet: the shot's slate. */
export const slate: Scene = ({ ctx, shot, u, d, W, H }) => {
  ctx.fillStyle = '#131a16';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(232,225,207,0.25)';
  ctx.strokeRect(60, 60, W - 120, H - 120);
  ctx.fillStyle = '#e8e1cf';
  ctx.font = `500 28px ${SANS}`;
  ctx.fillText(`${shot.id} · ${shot.seq.toUpperCase()} · ${shot.scene}`, 100, 130);
  ctx.font = `300 72px ${SANS}`;
  ctx.fillText(shot.title, 100, 240);
  ctx.font = `400 26px ${SANS}`;
  ctx.fillStyle = 'rgba(232,225,207,0.6)';
  ctx.fillText(shot.camera, 100, 300);
  ctx.fillText(`${shot.start.toFixed(2)}s → ${shot.end.toFixed(2)}s   local ${u.toFixed(2)} / ${d.toFixed(2)}`, 100, H - 110);
  ctx.fillStyle = '#b07a52';
  ctx.fillRect(100, H - 90, (W - 200) * clamp01(u / d), 3);
};
