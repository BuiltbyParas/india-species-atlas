import { SPECIES_BY_ID } from '../../data/species';
import type { Species } from '../../types';

/**
 * The documentary's running order, in seconds.
 *
 * Everything the presentation shows is a pure function of the time `t`, so a
 * frame is the same frame however it was reached — played, scrubbed, or
 * captured one at a time by `scripts/documentary/render.mjs`. The cue list is
 * the same schedule in a form a sound editor can read: each cue is a cut or a
 * beat that narration or music could be laid against.
 */

export const DOC_SPECIES: Species[] = [
  'great-indian-bustard',
  'bengal-tiger',
  'ganges-river-dolphin',
  'snow-leopard',
  'indian-rhinoceros',
]
  .map((id) => SPECIES_BY_ID[id])
  .filter(Boolean);

export const TITLE = { start: 0, end: 12 };
export const MAP = { start: 12, end: 40 };
export const SPECIES_LEN = 42;
export const SPECIES_START = 40;
/** Beats within one species segment, seconds from its start. */
export const BEAT = { name: 0, photo: 7, range: 15, threats: 25, cons: 33, end: SPECIES_LEN };
export const CONS = { start: SPECIES_START + DOC_SPECIES.length * SPECIES_LEN, len: 28 };
export const CLOSE = { start: CONS.start + CONS.len, len: 22 };
export const DURATION = CLOSE.start + CLOSE.len;

export interface Cue {
  t: number;
  id: string;
  label: string;
}

export const CUES: Cue[] = [
  { t: TITLE.start, id: 'title', label: 'Title' },
  { t: MAP.start, id: 'map', label: 'The map' },
  ...DOC_SPECIES.flatMap((s, i) => {
    const t0 = SPECIES_START + i * SPECIES_LEN;
    return [
      { t: t0 + BEAT.name, id: `${s.id}:name`, label: s.commonName },
      { t: t0 + BEAT.photo, id: `${s.id}:photo`, label: `${s.commonName} — photograph` },
      { t: t0 + BEAT.range, id: `${s.id}:range`, label: `${s.commonName} — where it lives` },
      { t: t0 + BEAT.threats, id: `${s.id}:threats`, label: `${s.commonName} — threats` },
      { t: t0 + BEAT.cons, id: `${s.id}:cons`, label: `${s.commonName} — conservation` },
    ];
  }),
  { t: CONS.start, id: 'fragmentation', label: 'Fragmentation' },
  { t: CONS.start + 13, id: 'protection', label: 'Protection' },
  { t: CLOSE.start, id: 'closing', label: 'Closing' },
  { t: CLOSE.start + 11, id: 'end', label: 'End card' },
];

/** Chapter markers for the scrubber. */
export const CHAPTERS = CUES.filter((c) => !c.id.includes(':') || c.id.endsWith(':name'));

/* --- easing helpers, all pure --- */
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Progress of t through [a, b], clamped. */
export const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeOut = (x: number) => 1 - Math.pow(1 - x, 4);
/** Fade in over [a, a+fi], hold, fade out over [b-fo, b]. */
export const window01 = (t: number, a: number, b: number, fi = 0.8, fo = 0.8) =>
  Math.min(easeOut(seg(t, a, a + fi)), 1 - easeInOut(seg(t, b - fo, b)));
