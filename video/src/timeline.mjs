/**
 * The active film.
 *
 * One engine renders two films: the 69-second promo (`films/promo.mjs`) and
 * the five-minute documentary (`films/doc.mjs`). The stage picks one with
 * `?film=promo|doc`; the Node scripts with the `VIDEO_FILM` environment
 * variable (set by `--film` on the CLI). Everything else in the engine and
 * the scripts imports the film's running order from here, so neither needs
 * to know which film it is drawing.
 */
import * as promo from './films/promo.mjs';
import * as doc from './films/doc.mjs';

const FILMS = { promo, doc };

function pick() {
  /** @type {any} */
  const g = globalThis;
  if (g.process?.env?.VIDEO_FILM) return g.process.env.VIDEO_FILM;
  if (typeof location !== 'undefined') return new URLSearchParams(location.search).get('film') ?? 'doc';
  return 'doc';
}

/** @type {'promo' | 'doc'} */
export const FILM = /** @type {any} */ (pick());
const F = FILMS[FILM];
if (!F) throw new Error(`unknown film "${FILM}" (expected ${Object.keys(FILMS).join(' or ')})`);

export const TITLE = F.TITLE;
export const SUBTITLE = F.SUBTITLE;
export const SITE_URL = F.SITE_URL;
export const EXPORT = F.EXPORT;
export const FPS = F.FPS;
export const WIDTH = F.WIDTH;
export const HEIGHT = F.HEIGHT;
export const BPM = F.BPM;
export const BAR = F.BAR;
/** @type {import('./films/promo.mjs').Shot[]} */
export const SHOTS = F.SHOTS;
export const DURATION = F.DURATION;
export const SEQUENCES = F.SEQUENCES;
export const VOICE = F.VOICE;
/** @type {Record<string, any>} */
export const CUES = F.CUES;
export const CREDITS = F.CREDITS;
export const FEATURED = F.FEATURED;
/** @type {Record<string, number[]>} */
export const WORDS = /** @type {any} */ (F).WORDS ?? {};

/**
 * Shot at time t (the last shot owns t = DURATION).
 * @param {number} t
 */
export function shotAt(t) {
  for (const s of SHOTS) if (t >= s.start && t < s.end) return s;
  return SHOTS[SHOTS.length - 1];
}

/**
 * Frame index range [first, last) for a time span, at the film's rate.
 * @param {number} start
 * @param {number} end
 * @returns {[number, number]}
 */
export function frameRange(start, end, fps = FPS) {
  return [Math.round(start * fps), Math.round(end * fps)];
}
