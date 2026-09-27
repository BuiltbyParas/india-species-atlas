import { CUES } from '../timeline.mjs';
import type { Scene } from '../engine/film';
import { drawPlate, plateShade } from '../engine/photo';
import { photoCredit, titleBlock } from './common';

/**
 * A species photograph as a cinematic plate, with the species block over it.
 *
 * Framing is chosen per photograph so the animal sits clear of the type and
 * nothing the photographer did not frame is added. The rhinoceros file has a
 * watermark along its bottom edge; the framing keeps it out of shot rather
 * than painting over it.
 */
interface Framing {
  focus: [number, number];
  zoom: [number, number];
  drift?: [number, number];
  rack?: [number, number];
  name: number;
  /** Extra darkening behind the type, for bright photographs. */
  scrim?: number;
}

const FRAMING: Record<string, Framing> = {
  'great-indian-bustard': { focus: [0.6, 0.6], zoom: [1.08, 1.17], drift: [-0.03, 0], rack: [0.9, 18], name: CUES.bustardName },
  'bengal-tiger': { focus: [0.47, 0.47], zoom: [1.1, 1.15], drift: [0.05, 0], name: CUES.tigerName },
  'ganges-river-dolphin': { focus: [0.6, 0.44], zoom: [1.12, 1.22], name: CUES.dolphinName },
  'snow-leopard': { focus: [0.44, 0.44], zoom: [1.1, 1.14], drift: [0.02, -0.01], name: CUES.snowName, scrim: 0.5 },
  'indian-rhinoceros': { focus: [0.5, 0.6], zoom: [1.28, 1.36], rack: [0.6, 12], name: CUES.rhinoName, scrim: 0.35 },
};

export const photoScene: Scene = (f) => {
  const id = f.shot.scene.split(':')[1];
  const fr = FRAMING[id];
  const { ctx, W, H, u, d, t } = f;
  drawPlate(ctx, f.film.assets.photos.get(id), W, H, { u, d, focus: fr.focus, zoom: fr.zoom, drift: fr.drift, rack: fr.rack });
  plateShade(ctx, W, H, 0.62, 0.55);
  if (fr.scrim) {
    const g = ctx.createRadialGradient(360, H - 230, 40, 360, H - 230, 720);
    g.addColorStop(0, `rgba(8,12,10,${fr.scrim})`);
    g.addColorStop(1, 'rgba(8,12,10,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  titleBlock(f, id, fr.name);
  photoCredit(f, id, Math.min(1, Math.max(0, (t - fr.name - 0.6) / 0.6)));
};
