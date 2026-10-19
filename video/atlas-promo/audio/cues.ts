/**
 * The sound-design cue sheet, derived from the timeline (so moving a scene
 * moves its sounds). The film ships no music of its own: drop files into
 * video/public/promo/audio/ (see audio/README.md) and they are placed here.
 *
 *   music.wav | music.mp3        the score, from 0:00, faded out at the end
 *   sfx/<kind>.wav               one file per kind below, reused at every cue
 */
import { at, landscapeBeatStart, lifeBeatStart, DATA, THREATS, ATLAS, DURATION, SCENE_START } from '../timeline';
import { FEATURED } from '../data/atlas';
import { CLICKS } from '../scenes/atlas-script';

export type CueKind = 'impact' | 'reveal' | 'whoosh' | 'tick' | 'click' | 'riser' | 'sub';

export interface Cue {
  t: number;
  kind: CueKind;
  gain: number;
  note: string;
}

const cues: Cue[] = [
  { t: at('signal', 0.2), kind: 'sub', gain: 0.6, note: 'room tone / low swell under the black' },
  { t: at('signal', 2.55), kind: 'impact', gain: 0.9, note: 'INDIA lands' },
  { t: at('india', 0.3), kind: 'reveal', gain: 0.6, note: 'the coastline starts to trace' },
  ...FEATURED.map((_, i) => ({ t: landscapeBeatStart(i) + 0.05, kind: 'whoosh' as const, gain: 0.5, note: `landscape move ${i + 1}` })),
  { t: at('life', 0.0), kind: 'impact', gain: 0.6, note: 'LIFE' },
  ...FEATURED.map((_, i) => ({ t: lifeBeatStart(i), kind: 'whoosh' as const, gain: 0.35, note: `species wipe ${i + 1}` })),
  ...Array.from({ length: 13 }, (_, i) => ({ t: at('data', DATA.markersFrom) + (i / 12) * DATA.markersDur, kind: 'tick' as const, gain: 0.35, note: 'localities land' })),
  { t: at('threats', THREATS.fragmentFrom), kind: 'sub', gain: 0.8, note: 'the map comes apart' },
  { t: at('conservation', 0.2), kind: 'reveal', gain: 0.5, note: 'the map re-forms' },
  { t: at('atlas', ATLAS.handover - 0.3), kind: 'whoosh', gain: 0.6, note: 'map → interface' },
  ...CLICKS.map((c) => ({ t: at('atlas', c), kind: 'click' as const, gain: 0.6, note: 'UI press' })),
  { t: at('system', 0.0), kind: 'whoosh', gain: 0.55, note: 'pull back from the interface' },
  { t: at('brand', -1.6), kind: 'riser', gain: 0.5, note: 'into the title' },
  { t: at('brand', 0.9), kind: 'impact', gain: 0.8, note: 'INDIA SPECIES ATLAS' },
];

export const CUES = cues.filter((c) => c.t >= 0 && c.t < DURATION).sort((a, b) => a.t - b.t);

export const MUSIC_FADE = { in: 0.5, out: 3.0, end: DURATION };
export const SCENE_MARKERS = SCENE_START;
