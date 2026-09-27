/**
 * The score: original, synthesised here, no samples and no licences.
 *
 * D minor at 96 BPM, one bar = 2.5 s, so every section change lands on a
 * shot boundary. The arc follows the brief:
 *
 *   0–5     air and a low D, nothing tonal
 *   5–20    pad swells in; a felt-piano motif
 *   20–35   a pulse and a plucked ostinato (road, then river)
 *   35–45   the pulse drops out; high, cold, sparse (Himalaya)
 *   45–56   the strongest section: full pulse, strings, 16ths, riser
 *   56–64   everything stops on the title hit, then resolves
 *   64–69   reverb tail under the credits
 */
import { BAR, CUES, DURATION } from '../../../video/src/films/promo.mjs';
import { Reverb, SR, SVF, Saw, adsr, addInto, clamp01, db, mtof, pan, pingPong, pinkNoise, rng, stereo } from './dsp.mjs';

const BEAT = BAR / 4;

/* --- instruments --- */

function padChord(buf, notes, t0, t1, o = {}) {
  const { att = 1.6, rel = 2.6, gain = 0.05, cut = [700, 1400], q = 0.8, detune = 0.1, seed = 1 } = o;
  const r = rng(seed);
  const s0 = Math.floor(t0 * SR);
  const len = t1 - t0;
  const end = Math.min(buf.n, Math.floor((t1 + rel) * SR));
  notes.forEach((m, ni) => {
    const voices = [-detune, 0, detune].map((d) => ({ saw: new Saw(r()), f: mtof(m + d), p: pan((r() * 2 - 1) * 0.7) }));
    const f = new SVF();
    const lfoPhase = r() * 6.28;
    for (let i = s0; i < end; i++) {
      const x = (i - s0) / SR;
      if ((i - s0) % 32 === 0) {
        const k = clamp01(x / Math.max(0.01, len));
        f.set(cut[0] + (cut[1] - cut[0]) * k + 120 * Math.sin(x * 0.7 + lfoPhase), q);
      }
      const env = adsr(x, len, att, 1.2, 0.85, rel) * gain * (1 - ni * 0.06);
      for (const v of voices) {
        const y = f.run(v.saw.next(v.f)) * env;
        buf.L[i] += y * v.p[0];
        buf.R[i] += y * v.p[1];
      }
    }
  });
}

/** A felt piano: inharmonic partials, soft hammer, long decay. */
function piano(buf, t, m, vel = 0.5, p = 0, len = 4) {
  const f0 = mtof(m);
  const B = 0.00035;
  const [pl, pr] = pan(p);
  const s0 = Math.floor(t * SR);
  const end = Math.min(buf.n, s0 + Math.floor(len * SR));
  const partials = [];
  for (let n = 1; n <= 9; n++) {
    const f = f0 * n * Math.sqrt(1 + B * n * n);
    if (f > 9000) break;
    partials.push({ w: (2 * Math.PI * f) / SR, a: Math.exp(-0.55 * (n - 1)) * (n === 1 ? 1 : 0.8), tau: 3.2 / (1 + 0.7 * (n - 1)) });
  }
  const r = rng(m * 31 + Math.round(t * 100));
  const hammer = new SVF();
  hammer.set(900, 0.7);
  for (let i = s0; i < end; i++) {
    const x = (i - s0) / SR;
    const att = Math.min(1, x / 0.006);
    let y = 0;
    for (const q of partials) y += Math.sin(q.w * (i - s0)) * q.a * Math.exp(-x / q.tau);
    y *= att * vel * 0.16;
    if (x < 0.04) y += hammer.run((r() * 2 - 1) * (1 - x / 0.04)) * vel * 0.05;
    const tail = x > len - 0.3 ? (len - x) / 0.3 : 1;
    buf.L[i] += y * pl * tail;
    buf.R[i] += y * pr * tail;
  }
}

/** Karplus–Strong pluck, for the ostinato. */
function pluck(buf, t, m, vel = 0.4, p = 0, damp = 0.5, len = 1.2) {
  const f = mtof(m);
  const period = Math.max(2, Math.round(SR / f));
  const line = new Float32Array(period);
  const r = rng(m * 97 + Math.round(t * 1000));
  for (let i = 0; i < period; i++) line[i] = r() * 2 - 1;
  const [pl, pr] = pan(p);
  const tone = new SVF();
  tone.set(2400, 0.6);
  const s0 = Math.floor(t * SR);
  const end = Math.min(buf.n, s0 + Math.floor(len * SR));
  let idx = 0;
  let prev = 0;
  for (let i = s0; i < end; i++) {
    const cur = line[idx];
    const nxt = (cur + prev) * 0.5 * (0.996 - damp * 0.01);
    prev = cur;
    line[idx] = nxt;
    if (++idx >= period) idx = 0;
    const x = (i - s0) / SR;
    const y = tone.run(cur) * vel * 0.12 * Math.min(1, (len - x) / 0.1);
    buf.L[i] += y * pl;
    buf.R[i] += y * pr;
  }
}

function kick(buf, t, gain = 0.4) {
  const s0 = Math.floor(t * SR);
  const end = Math.min(buf.n, s0 + Math.floor(0.5 * SR));
  let ph = 0;
  for (let i = s0; i < end; i++) {
    const x = (i - s0) / SR;
    const f = 44 + 70 * Math.exp(-x / 0.035);
    ph += (2 * Math.PI * f) / SR;
    const y = Math.tanh(Math.sin(ph) * 1.4) * Math.exp(-x / 0.16) * gain;
    buf.L[i] += y;
    buf.R[i] += y;
  }
}

/** A soft low tom / frame drum. */
function tom(buf, t, gain = 0.25, p = 0) {
  const s0 = Math.floor(t * SR);
  const end = Math.min(buf.n, s0 + Math.floor(0.7 * SR));
  const [pl, pr] = pan(p);
  const r = rng(Math.round(t * 1000));
  const body = new SVF();
  body.set(260, 1.2);
  let ph = 0;
  for (let i = s0; i < end; i++) {
    const x = (i - s0) / SR;
    ph += (2 * Math.PI * (70 + 30 * Math.exp(-x / 0.05))) / SR;
    const y = (Math.sin(ph) * Math.exp(-x / 0.22) + body.run(r() * 2 - 1) * Math.exp(-x / 0.05) * 0.6) * gain;
    buf.L[i] += y * pl;
    buf.R[i] += y * pr;
  }
}

/** String ensemble: detuned saws with vibrato, a filter that opens over the phrase. */
function strings(buf, notes, t0, t1, o = {}) {
  const { gain = 0.035, cut = [600, 3200], att = 1.4, rel = 1.8, seed = 7 } = o;
  const r = rng(seed);
  const s0 = Math.floor(t0 * SR);
  const len = t1 - t0;
  const end = Math.min(buf.n, Math.floor((t1 + rel) * SR));
  for (const m of notes) {
    const vs = [-0.12, -0.04, 0.05, 0.13].map((d) => ({ saw: new Saw(r()), f: mtof(m + d), vib: r() * 6.28, p: pan((r() * 2 - 1) * 0.8) }));
    const f = new SVF();
    for (let i = s0; i < end; i++) {
      const x = (i - s0) / SR;
      if ((i - s0) % 32 === 0) f.set(cut[0] + (cut[1] - cut[0]) * Math.pow(clamp01(x / len), 1.5), 0.7);
      const env = adsr(x, len, att, 0.5, 0.9, rel) * gain;
      for (const v of vs) {
        const y = f.run(v.saw.next(v.f * (1 + 0.004 * Math.sin(2 * Math.PI * 5.2 * x + v.vib)))) * env;
        buf.L[i] += y * v.p[0];
        buf.R[i] += y * v.p[1];
      }
    }
  }
}

/** Slow sine partials with tremolo — the cold, high air over the mountains. */
function shimmer(buf, notes, t0, t1, gain = 0.02) {
  const s0 = Math.floor(t0 * SR);
  const end = Math.min(buf.n, Math.floor((t1 + 2) * SR));
  notes.forEach((m, k) => {
    const w = (2 * Math.PI * mtof(m)) / SR;
    const [pl, pr] = pan(k % 2 ? 0.5 : -0.5);
    for (let i = s0; i < end; i++) {
      const x = (i - s0) / SR;
      const env = adsr(x, t1 - t0, 2.5, 0.1, 1, 2) * gain * (0.6 + 0.4 * Math.sin(x * (0.9 + k * 0.37)));
      const y = Math.sin(w * (i - s0)) * env;
      buf.L[i] += y * pl;
      buf.R[i] += y * pr;
    }
  });
}

function drone(buf, m, t0, t1, gain = 0.05, att = 3, rel = 3) {
  const s0 = Math.floor(t0 * SR);
  const end = Math.min(buf.n, Math.floor((t1 + rel) * SR));
  const saw = new Saw();
  const f = new SVF();
  f.set(180, 0.8);
  const w = (2 * Math.PI * mtof(m)) / SR;
  for (let i = s0; i < end; i++) {
    const x = (i - s0) / SR;
    const env = adsr(x, t1 - t0, att, 0.1, 1, rel) * gain;
    const y = (Math.sin(w * (i - s0)) * 0.7 + f.run(saw.next(mtof(m))) * 0.5) * env;
    buf.L[i] += y;
    buf.R[i] += y;
  }
}

function riser(buf, t0, t1, gain = 0.06) {
  const s0 = Math.floor(t0 * SR);
  const end = Math.min(buf.n, Math.floor(t1 * SR));
  const noise = pinkNoise(55);
  const f = new SVF();
  let ph = 0;
  for (let i = s0; i < end; i++) {
    const k = (i - s0) / (end - s0);
    if ((i - s0) % 32 === 0) f.set(300 * Math.pow(20, k), 2.5);
    ph += (2 * Math.PI * (110 * Math.pow(4, k))) / SR;
    const y = (f.run(noise()) * 1.4 + Math.sin(ph) * 0.15) * Math.pow(k, 2.2) * gain;
    buf.L[i] += y;
    buf.R[i] += y;
  }
}

/* --- harmony --- */

const CH = {
  Dm: [38, 45, 50, 53, 57, 64],
  Bb: [34, 41, 50, 53, 57, 60],
  F: [41, 48, 53, 57, 60, 67],
  C: [36, 43, 50, 55, 60, 62],
  Gm: [31, 38, 46, 53, 57],
  Asus: [33, 40, 45, 50, 52, 57],
  DmHi: [50, 57, 62, 65, 69, 76],
  BbHi: [46, 53, 62, 65, 69, 72],
};

/** Chords by bar start time. */
const PROGRESSION = [
  [5, 'Dm'], [10, 'Bb'],
  [12.5, 'F'], [15, 'C'], [17.5, 'Dm'],
  [20, 'Dm'], [22.5, 'Bb'], [25, 'Gm'],
  [27.5, 'Bb'], [30, 'F'], [32.5, 'C'],
  [35, 'DmHi'], [40, 'BbHi'], [42.5, 'Asus'],
  [45, 'Dm'], [47.5, 'Bb'], [50, 'F'], [52.5, 'C'], [55, 'Asus'],
  [56.4, 'Dm'], [59.4, 'Bb'], [61.8, 'Dm'],
];

export function score() {
  const dry = stereo(DURATION + 1);
  const keys = stereo(DURATION + 1);

  // 0–5: a low D felt more than heard.
  drone(dry, 26, 1.8, 12, 0.05, 3, 3);

  // Pads, with their cutoff opening as the film builds.
  PROGRESSION.forEach(([t0, name], i) => {
    const t1 = i + 1 < PROGRESSION.length ? PROGRESSION[i + 1][0] : 64.5;
    const heat = t0 < 12.5 ? [500, 900] : t0 < 35 ? [700, 1500] : t0 < 45 ? [900, 2200] : t0 < 56 ? [1100, 2600] : [600, 1000];
    const gain = t0 < 12.5 ? 0.038 : t0 >= 56 ? 0.034 : t0 >= 35 && t0 < 45 ? 0.03 : 0.045;
    padChord(dry, CH[name], t0, Math.min(t1 + 0.35, t0 >= 55 && t0 < 56 ? 56 : 99), {
      gain, cut: heat, seed: i + 3, att: t0 === 5 ? 3.2 : t0 === 56.4 ? 2.4 : 1.2, rel: t0 === 55 ? 0.08 : t0 >= 61 ? 4.5 : 2.2,
    });
  });

  // Felt-piano motif: a falling fourth that keeps asking, answered at the end.
  const motif = [[0, 74], [BEAT * 1.5, 69], [BEAT * 3, 72], [BEAT * 5, 76], [BEAT * 6, 74]];
  for (const start of [12.6, 17.6]) for (const [dt, m] of motif) piano(keys, start + dt, m, 0.42, dt % 2 ? 0.25 : -0.2, 4);
  for (const [t, m, v] of [[36.2, 81, 0.28], [38.1, 76, 0.24], [40.4, 77, 0.26], [43.1, 76, 0.22]]) piano(keys, t, m, v, 0.3, 5);
  for (const [t, m, v] of [[58.3, 62, 0.4], [58.3, 69, 0.3], [59.2, 74, 0.34], [60.4, 72, 0.3], [61.9, 74, 0.36], [61.9, 57, 0.3]]) piano(keys, t, m, v, 0, 5.5);

  // Ostinato: eighths in the tiger and dolphin sections, sixteenths at the peak.
  const cell = [50, 57, 53, 57, 50, 57, 55, 57];
  for (let t = 20, k = 0; t < 34.9; t += BEAT / 2, k++) {
    const chordRoot = t >= 25 && t < 27.5 ? -4 : t >= 22.5 && t < 25 ? -4 : 0;
    const lift = t >= 27.5 ? 12 : 0;
    pluck(dry, t, cell[k % 8] + chordRoot + lift, t < 20.6 ? 0.25 : 0.42, k % 2 ? 0.45 : -0.45, 0.5, 0.9);
  }
  for (let t = 45, k = 0; t < 55.9; t += BEAT / 4, k++) {
    const bar = Math.floor((t - 45) / BAR);
    const shift = [0, -4, 3, -2, -5][bar] ?? 0;
    const accent = k % 4 === 0 ? 0.5 : 0.32;
    pluck(dry, t, cell[k % 8] + shift + 12, accent * (0.7 + 0.3 * clamp01((t - 45) / 8)), k % 2 ? 0.55 : -0.55, 0.6, 0.6);
  }

  // Pulse.
  for (let t = 20; t < 35; t += BEAT) {
    const onBeat = Math.round((t - 20) / BEAT) % 2 === 0;
    if (onBeat) kick(dry, t, 0.34);
  }
  for (let t = 45; t < 56; t += BEAT) {
    const n = Math.round((t - 45) / BEAT);
    kick(dry, t, 0.28 + 0.12 * clamp01((t - 45) / 9));
    if (n % 2 === 1) tom(dry, t + BEAT / 2, 0.14, n % 4 === 1 ? -0.3 : 0.3);
  }
  // Strings for the peak.
  strings(dry, [50, 57, 62, 65], 45, 47.5, { gain: 0.022, cut: [500, 1800] });
  strings(dry, [46, 53, 62, 65], 47.5, 50, { gain: 0.026, cut: [700, 2400] });
  strings(dry, [41, 53, 60, 65, 69], 50, 52.5, { gain: 0.03, cut: [900, 3200] });
  strings(dry, [48, 55, 60, 64, 67], 52.5, 55, { gain: 0.034, cut: [1200, 3800] });
  strings(dry, [45, 52, 57, 61, 64], 55, 56, { gain: 0.036, cut: [2600, 4400], rel: 0.06 });
  riser(dry, 53, CUES.titleHit, 0.08);
  drone(dry, 26, 45, 55.9, 0.06, 2, 0.05);

  // Cold air for the Himalaya.
  shimmer(dry, [86, 93, 98], 35.2, 44.5, 0.012);

  // Title: a low D fifth that holds, and the last chord fading under the credits.
  drone(dry, 26, CUES.titleHit, 63, 0.055, 0.02, 5);

  // Space: the piano gets its own delay; everything shares one hall.
  pingPong(keys, BEAT * 1.5, 0.32, 0.22, 3000);
  addInto(dry, keys, 1);
  const wet = new Reverb({ room: 0.9, damp: 0.45 }).process(dry);
  return arc(addInto(dry, wet, 0.55));
}

/**
 * The score's level over the film, in dB — the shape a mixer would ride by
 * hand. Without it the parts are all present at once and the film has no
 * build: quiet air at the start, a lift for each species, a breath in the
 * mountains, the peak on the convergence, and nothing at all on the title hit.
 */
const ARC = [
  [0, -30], [4.6, -24], [5.4, -12], [12.5, -9], [19.8, -7],
  [20.1, -4], [34.6, -4.5], [35.4, -11], [44.6, -9],
  [45, -2], [52, 0], [55.95, 0], [56.02, -40], [56.35, -14], [58.2, -9], [63, -10], [68.8, -40],
];

function arc(buf) {
  let k = 0;
  for (let i = 0; i < buf.n; i++) {
    const t = i / SR;
    while (k < ARC.length - 2 && t > ARC[k + 1][0]) k++;
    const [t0, d0] = ARC[k];
    const [t1, d1] = ARC[k + 1];
    const x = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
    const g = db(d0 + (d1 - d0) * x);
    buf.L[i] *= g;
    buf.R[i] *= g;
  }
  return buf;
}

/** The instruments, for the documentary's arrangement (audio/doc-score.mjs). */
export { padChord, piano, pluck, kick, tom, strings, shimmer, drone, riser, CH };
