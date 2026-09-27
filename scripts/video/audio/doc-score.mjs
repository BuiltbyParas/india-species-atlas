/**
 * The documentary's score: original, synthesised, arranged against the
 * film's own shots and narration, so the music changes when the story does.
 *
 * The arrangement is a list of sections, each with its harmony and its
 * forces. Section boundaries are shot starts and narration cues, read from
 * the timeline, never typed-in seconds:
 *
 *   hook        mysterious — a drone, high air, a few piano notes
 *   india       wonder — the pad opens, a soft half-time pulse under the Atlas
 *   species     observational — pad and felt piano; tension where each threat lands
 *   tiger       a pulse and an ostinato under the road; strings on fragmentation
 *   dolphin     a flowing arpeggio
 *   snow        the pulse drops out; cold, sparse; a pause on the category change
 *   rhino       the story turns: major colour, then hope with weight
 *   connect     geographic revelation — the fullest passage
 *   response    restrained hope
 *   atlas       reflective, a warm swell into the reveal, resolved under the end card
 */
import { BAR, CUES, DURATION, SHOTS, VOICE } from '../../../video/src/timeline.mjs';
import { Reverb, SR, addInto, db, pingPong, stereo } from './dsp.mjs';
import { CH, drone, kick, padChord, piano, pluck, riser, shimmer, strings, tom } from './score.mjs';

const BEAT = BAR / 4;
const shotStart = (id) => SHOTS.find((s) => s.id === id).start;
const v = (id) => VOICE.find((x) => x.id === id).at;

/** Extra voicings for the documentary. */
const H = {
  ...CH,
  Fmaj: [41, 48, 53, 57, 60, 64],
  Am: [33, 45, 52, 57, 60, 64],
  Bbsus: [34, 46, 53, 58, 60, 65],
  Dsus: [38, 45, 50, 55, 57, 62],
  Ebmaj: [39, 46, 51, 55, 58, 62],
};

/**
 * @typedef {{ name: string, from: number, to: number, chords: string[], pad: number, cut: [number, number],
 *   pulse?: 'half'|'full', ostinato?: '8th'|'16th'|'arp', strings?: number, shimmer?: boolean, level: number }} Section
 */

function sections() {
  const S = (id) => shotStart(id);
  /** @type {Section[]} */
  return [
    { name: 'hook', from: 0, to: S('S005'), chords: ['Dsus'], pad: 0, cut: [400, 600], shimmer: true, level: -14 },
    { name: 'title', from: S('S005'), to: S('S007'), chords: ['Dm', 'Bb'], pad: 0.03, cut: [500, 1200], shimmer: true, level: -9 },
    { name: 'india', from: S('S007'), to: S('S009'), chords: ['F', 'C', 'Dm', 'Bb'], pad: 0.038, cut: [800, 1600], pulse: 'half', level: -7 },
    { name: 'bustard', from: S('S009'), to: S('S012'), chords: ['Dm', 'Bb', 'F', 'C'], pad: 0.036, cut: [700, 1300], level: -9 },
    { name: 'bustard-threat', from: S('S012'), to: S('S013'), chords: ['Gm', 'Asus'], pad: 0.04, cut: [600, 1100], pulse: 'half', strings: 0.02, level: -7 },
    { name: 'bustard-hope', from: S('S013'), to: S('S015'), chords: ['Fmaj', 'C'], pad: 0.036, cut: [900, 1600], level: -9 },
    { name: 'tiger', from: S('S015'), to: S('S018'), chords: ['Dm', 'Bb', 'Gm', 'Asus'], pad: 0.04, cut: [800, 1800], pulse: 'full', ostinato: '8th', level: -5 },
    { name: 'tiger-fragment', from: S('S018'), to: S('S019'), chords: ['Bbsus', 'Asus'], pad: 0.042, cut: [700, 1500], pulse: 'full', strings: 0.028, level: -4 },
    { name: 'tiger-atlas', from: S('S019'), to: S('S020'), chords: ['F', 'C'], pad: 0.034, cut: [900, 1500], level: -9 },
    { name: 'dolphin', from: S('S020'), to: S('S022'), chords: ['Bb', 'F', 'C', 'Dm'], pad: 0.036, cut: [900, 1800], ostinato: 'arp', level: -7 },
    { name: 'dolphin-threat', from: S('S022'), to: S('S024'), chords: ['Gm', 'Ebmaj', 'Bb', 'Asus'], pad: 0.04, cut: [800, 1700], ostinato: 'arp', pulse: 'half', level: -6 },
    { name: 'dolphin-hope', from: S('S024'), to: S('S026'), chords: ['Fmaj', 'C'], pad: 0.034, cut: [900, 1500], level: -9 },
    { name: 'snow', from: S('S026'), to: S('S031'), chords: ['DmHi', 'BbHi', 'DmHi', 'Asus'], pad: 0.03, cut: [900, 2200], shimmer: true, level: -10 },
    { name: 'rhino', from: S('S031'), to: S('S033'), chords: ['F', 'C', 'Dm', 'Bb'], pad: 0.038, cut: [1000, 2000], level: -8 },
    { name: 'rhino-risk', from: S('S033'), to: S('S034'), chords: ['Gm', 'Asus'], pad: 0.04, cut: [700, 1300], pulse: 'half', level: -7 },
    { name: 'rhino-hope', from: S('S034'), to: S('S035'), chords: ['Bb', 'F', 'C', 'Fmaj'], pad: 0.038, cut: [900, 1800], ostinato: '8th', level: -7 },
    { name: 'connect', from: S('S035'), to: S('S036'), chords: ['Dm', 'Bb', 'F', 'C'], pad: 0.045, cut: [1100, 2800], pulse: 'full', ostinato: '16th', strings: 0.034, level: 0 },
    { name: 'response', from: S('S036'), to: S('S037'), chords: ['F', 'C', 'Bb', 'F'], pad: 0.036, cut: [900, 1600], level: -8 },
    { name: 'closing', from: S('S037'), to: S('S038'), chords: ['Dm', 'Bb'], pad: 0.032, cut: [700, 1100], level: -11 },
    { name: 'atlas', from: S('S038'), to: S('S039'), chords: ['F', 'C', 'Dm', 'Bb'], pad: 0.04, cut: [1000, 2400], strings: 0.026, level: -5 },
    { name: 'end', from: S('S039'), to: S('S040') + 3, chords: ['Fmaj', 'Dm'], pad: 0.034, cut: [700, 1100], level: -9 },
  ];
}

const CELL = [50, 57, 53, 57, 50, 57, 55, 57];

export function docScore() {
  const dry = stereo(DURATION + 2);
  const keys = stereo(DURATION + 2);
  const secs = sections();
  const levels = [];

  drone(dry, 26, 0.8, shotStart('S009'), 0.05, 4, 4);

  secs.forEach((sec, si) => {
    levels.push([sec.from, sec.level]);
    // Harmony: one chord per bar, cycling.
    if (sec.pad > 0) {
      let k = 0;
      for (let t = sec.from; t < sec.to - 0.2; t += BAR, k++) {
        const t1 = Math.min(sec.to, t + BAR);
        padChord(dry, H[sec.chords[k % sec.chords.length]], t, t1 + 0.3, { gain: sec.pad, cut: sec.cut, seed: si * 17 + k, att: k === 0 ? 1.6 : 0.9, rel: 2.0 });
      }
    }
    if (sec.shimmer) shimmer(dry, [86, 93, 98], sec.from + 0.5, sec.to - 0.5, 0.01);
    if (sec.strings) {
      let k = 0;
      for (let t = sec.from; t < sec.to - 0.2; t += BAR * 2, k++) {
        const ch = H[sec.chords[(k * 2) % sec.chords.length]].slice(2);
        strings(dry, ch, t, Math.min(sec.to, t + BAR * 2), { gain: sec.strings, cut: [600, 2800] });
      }
    }
    for (let t = sec.from, n = 0; t < sec.to - 0.05; t += BEAT, n++) {
      if (sec.pulse === 'full') {
        kick(dry, t, 0.3);
        if (n % 4 === 3) tom(dry, t + BEAT / 2, 0.12, n % 8 === 3 ? -0.3 : 0.3);
      } else if (sec.pulse === 'half' && n % 2 === 0) kick(dry, t, 0.22);
    }
    if (sec.ostinato) {
      const step = sec.ostinato === '16th' ? BEAT / 4 : BEAT / 2;
      for (let t = sec.from, k = 0; t < sec.to - 0.05; t += step, k++) {
        const bar = Math.floor((t - sec.from) / BAR);
        const root = H[sec.chords[bar % sec.chords.length]][0] % 12;
        const shift = ((root - 2 + 12) % 12) > 6 ? ((root - 2 + 12) % 12) - 12 : (root - 2 + 12) % 12;
        const lift = sec.ostinato === 'arp' ? 12 : sec.ostinato === '16th' ? 12 : 0;
        pluck(dry, t, CELL[k % 8] + shift + lift, (k % 4 === 0 ? 0.46 : 0.3) * (sec.ostinato === 'arp' ? 0.8 : 1), k % 2 ? 0.5 : -0.5, 0.55, 0.8);
      }
    }
  });

  // Felt piano: the hook's first notes, the species' observational motifs,
  // the snow leopard's sparse line, and the resolution.
  const motif = [[0, 74], [BEAT * 1.5, 69], [BEAT * 3, 72], [BEAT * 5, 76]];
  for (const [t, m] of [[v('N01') - 0.3, 74], [v('N03'), 69], [v('N05') + 0.4, 72], [v('N06') + 0.2, 62]]) piano(keys, t, m, 0.3, 0, 5);
  for (const start of [v('N13'), v('N24'), v('N31'), v('N46')]) for (const [dt, m] of motif) piano(keys, start + dt, m, 0.36, dt % 2 ? 0.25 : -0.2, 4);
  for (const [t, m] of [[v('N38'), 81], [v('N39') + 2, 76], [v('N40'), 77], [v('N42') + 1.5, 74], [v('N43'), 76]]) piano(keys, t, m, 0.26, 0.3, 5);
  for (const [t, m] of [[v('N61'), 62], [v('N62'), 69], [v('N65'), 74], [v('N66'), 72], [v('N66') + 1.6, 74], [v('N66') + 1.6, 57]]) piano(keys, t, m, 0.34, 0, 5.5);

  // Risers into the two big arrivals, then the drone under the ending.
  riser(dry, shotStart('S035') - 3, shotStart('S035'), 0.06);
  riser(dry, shotStart('S038') - 2.5, shotStart('S038'), 0.04);
  drone(dry, 26, shotStart('S035'), shotStart('S036'), 0.05, 1, 2);
  drone(dry, 26, shotStart('S039'), DURATION, 0.05, 2, 4);

  pingPong(keys, BEAT * 1.5, 0.3, 0.22, 3000);
  addInto(dry, keys, 1);
  const wet = new Reverb({ room: 0.9, damp: 0.45 }).process(dry);
  const out = addInto(dry, wet, 0.55);

  // Level automation over the whole film, with a musical pause on the
  // snow leopard's category change: the music stops, then returns.
  const pause = CUES.statusChange;
  // Each section's level, crossfaded over a second and a half at its start.
  const autom = [[0, -32]];
  let prev = -32;
  for (const [t, l] of levels) {
    if (t > 0) autom.push([t - 0.75, prev]);
    autom.push([t + 0.75, l]);
    prev = l;
  }
  autom.push([pause - 0.3, -10], [pause, -40], [pause + 1.4, -40], [pause + 3.4, -10]);
  autom.push([DURATION - 4, -12], [DURATION, -60]);
  autom.sort((a, b) => a[0] - b[0]);
  let k = 0;
  for (let i = 0; i < out.n; i++) {
    const t = i / SR;
    while (k < autom.length - 2 && t > autom[k + 1][0]) k++;
    const [t0, d0] = autom[k];
    const [t1, d1] = autom[k + 1] ?? autom[k];
    const x = t1 > t0 ? Math.min(1, Math.max(0, (t - t0) / (t1 - t0))) : 1;
    const g = db(d0 + (d1 - d0) * x);
    out.L[i] *= g;
    out.R[i] *= g;
  }
  return out;
}
