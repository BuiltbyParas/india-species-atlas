/**
 * The documentary's ambience and effects, placed by shot and cue.
 *
 * Every bed belongs to the picture it sits under and fades with it; the
 * impacts are few (the road's hard cut, the convergence, the Atlas) and the
 * interface sounds are small clicks and tones, not whooshes.
 */
import { CUES, DURATION, SHOTS, VOICE, WORDS } from '../../../video/src/timeline.mjs';
import { Reverb, SR, SVF, addInto, pinkNoise, rng, stereo } from './dsp.mjs';
import { bed, env, grass, hum, impact, passBy, roadBed, tick, tone, water, whoosh, wind } from './design.mjs';

const shot = (id) => SHOTS.find((s) => s.id === id);
const v = (id) => VOICE.find((x) => x.id === id).at;
/** A bed across shots [a..b], fading in and out over `f` seconds. */
const span = (a, b, gain, f = 0.8) => {
  const t0 = shot(a).start;
  const t1 = shot(b).end;
  return [t0 - 0.2, t1 + 0.2, env([[t0 - 0.2, 0], [t0 + f, gain], [t1 - f, gain], [t1 + 0.2, 0]])];
};

/** A pen on paper: short scratches of bright noise. */
function ink(buf, t0, t1) {
  const n = pinkNoise(7);
  const f = new SVF();
  f.set(5200, 1.2);
  bed(buf, t0, t1, env([[t0, 0], [t0 + 0.1, 0.12], [t1 - 0.2, 0.1], [t1, 0]]), (t) => {
    const s = f.run(n()) * (0.5 + 0.5 * Math.sin(t * 38)) * 1.4;
    return [s, s * 0.9];
  });
}

/** Insects and leaves: an evening forest bed, high and faint. */
function forest(buf, t0, t1, gainOf) {
  const n = pinkNoise(41);
  const f = new SVF();
  f.set(6200, 4);
  const r = rng(42);
  bed(buf, t0, t1, gainOf, (t) => {
    const chirp = Math.pow(Math.max(0, Math.sin(t * 2 * Math.PI * 11)), 6) * (0.6 + 0.4 * Math.sin(t * 0.7));
    const y = f.run(n()) * (0.2 + chirp) * 1.3 + (r() - 0.5) * 0.004;
    return [y, y * 0.85];
  });
}

/** A soft interface click, for the Atlas panels. */
function ui(buf, t) {
  tick(buf, t, 0.05);
  tone(buf, t + 0.02, 1318.5, 0.018, 0.3);
}

export function docAmbience() {
  const buf = stereo(DURATION + 1);
  const room = pinkNoise(1);
  const roomF = new SVF();
  roomF.set(1800, 0.5);
  bed(buf, 0, DURATION, env([[0, 0.018], [DURATION - 1, 0.018], [DURATION, 0]]), () => {
    const y = roomF.run(room()) * 0.6;
    return [y, y];
  });
  // Space: thin air under the globe.
  wind(buf, ...span('S001', 'S001', 0.03, 1.5), { centre: 900, q: 0.6, seed: 5 });
  wind(buf, ...span('S005', 'S005', 0.04, 1.0), { centre: 900, q: 0.6, seed: 6 });
  hum(buf, ...span('S003', 'S003', 0.07, 0.3));
  roadBed(buf, ...span('S004', 'S004', 0.12, 0.3));
  // India.
  wind(buf, ...span('S006', 'S008', 0.05), { centre: 600, seed: 8 });
  // The bustard's Thar.
  wind(buf, ...span('S009', 'S014', 0.09), { centre: 480, seed: 9 });
  grass(buf, ...span('S009', 'S010', 0.08, 0.5));
  hum(buf, ...span('S012', 'S012', 0.035, 0.6));
  // The tiger's forest and roads.
  roadBed(buf, ...span('S015', 'S016', 0.16, 0.2));
  forest(buf, ...span('S017', 'S019', 0.05, 0.8));
  roadBed(buf, ...span('S018', 'S018', 0.05, 0.8));
  // The river.
  water(buf, ...span('S020', 'S025', 0.1, 0.7));
  // The mountains.
  wind(buf, ...span('S026', 'S030', 0.14, 1.2), { centre: 360, q: 1.2, gust: 0.8, whistle: 0.35, seed: 11 });
  // The floodplain.
  wind(buf, ...span('S031', 'S034', 0.06), { centre: 700, seed: 17 });
  water(buf, ...span('S031', 'S032', 0.05, 1.0));
  // The whole country, then quiet.
  wind(buf, ...span('S035', 'S038', 0.04, 1.2), { centre: 800, seed: 21 });
  return buf;
}

export function docSfx() {
  const buf = stereo(DURATION + 1);
  // Hook.
  tone(buf, v('N01') + 0.1, 587.3, 0.03, 0);
  ink(buf, shot('S002').start + 0.1, shot('S002').start + 1.3);
  tone(buf, v('N03') + 0.4, 1174.7, 0.02, 0.3);
  passBy(buf, shot('S004').start + 0.9, 1.1, 0.35, 1);
  whoosh(buf, shot('S005').start, 1.2, 0.08);
  tone(buf, CUES.titleCard, 293.7, 0.05, 0);
  // India and the habitat words: a tick on each cut.
  tone(buf, CUES.indiaReveal, 587.3, 0.05, 0);
  const n09 = WORDS.N09 ?? [];
  n09.forEach((o, i) => {
    tick(buf, v('N09') + o - 0.05, 0.08);
    tone(buf, v('N09') + o, [440, 523.3, 587.3, 659.3, 784][i] ?? 440, 0.025, (i - 2) * 0.3);
  });
  tone(buf, shot('S008').start + 0.4, 880, 0.03, 0.2);
  // Bustard.
  tone(buf, shot('S011').start + 0.3, 698.5, 0.035, -0.2);
  impact(buf, CUES.bustardHit, 0.14, 1.6);
  tone(buf, shot('S013').start + 3.5, 523.3, 0.03, 0.2);
  // The Atlas panels, each a small interface sound.
  for (const id of ['S014', 'S019', 'S025', 'S030']) ui(buf, shot(id).start + 0.6);
  // Tiger: the hard cut.
  impact(buf, CUES.roadCut, 0.4, 2);
  passBy(buf, CUES.roadCut + 0.4, 1.1, 0.5, 1);
  passBy(buf, CUES.roadCut + 1.3, 0.9, 0.4, -1);
  tone(buf, shot('S016').start + 0.3, 523.3, 0.035, 0.2);
  tone(buf, shot('S017').start + 1.6, 392, 0.03, 0);
  impact(buf, CUES.fragment, 0.12, 1.4);
  // Dolphin.
  whoosh(buf, shot('S020').start, 1.1, 0.08);
  tone(buf, CUES.riverBreak, 440, 0.035, 0.3);
  // Snow leopard: a reverse swell into the cold.
  whoosh(buf, shot('S026').start + 0.2, 2.2, 0.14, true);
  tone(buf, shot('S027').start + 0.4, 784, 0.03, 0);
  // Rhino.
  tone(buf, CUES.rhinoTurn, 349.2, 0.04, 0);
  [0, 1.25, 2.5].forEach((d, i) => impact(buf, CUES.rhinoRisk + 0.25 + d, 0.08 + i * 0.02, 1.2));
  // Convergence, response, Atlas.
  impact(buf, CUES.converge, 0.3, 2.4);
  tone(buf, CUES.response + 2.8, 523.3, 0.03, 0);
  whoosh(buf, CUES.atlas, 1.4, 0.07);
  for (let i = 0; i < 5; i++) ui(buf, CUES.atlas + 0.3 + i * ((shot('S038').end - shot('S038').start) / 5));
  impact(buf, CUES.endcard, 0.18, 3.2);
  tone(buf, CUES.endcard + 0.3, 293.7, 0.05, 0);
  const wet = new Reverb({ room: 0.8, damp: 0.5 }).process(buf);
  return addInto(buf, wet, 0.35);
}

export { SR };
