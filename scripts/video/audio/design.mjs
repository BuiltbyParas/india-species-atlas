/**
 * Ambience and sound effects, synthesised against the timeline's shots and
 * cues. Two stems: `ambience` (beds that carry a place) and `sfx` (events).
 *
 * Restraint is the point. Four low impacts in sixty-nine seconds, no stock
 * "boom", and every bed fades in and out with the picture it belongs to.
 */
import { CUES, DURATION } from '../../../video/src/timeline.mjs';
import { Reverb, SR, SVF, addInto, brownNoise, clamp01, pan, pinkNoise, rng, stereo } from './dsp.mjs';

/** A gain envelope from keyframes [[t, gain], ...], linear between keys. */
function env(frames) {
  return (t) => {
    if (t <= frames[0][0]) return frames[0][1];
    for (let i = 1; i < frames.length; i++) {
      if (t <= frames[i][0]) {
        const [t0, g0] = frames[i - 1];
        const [t1, g1] = frames[i];
        return g0 + (g1 - g0) * ((t - t0) / (t1 - t0));
      }
    }
    return frames[frames.length - 1][1];
  };
}

function bed(buf, t0, t1, gainOf, voice) {
  const s0 = Math.floor(t0 * SR);
  const end = Math.min(buf.n, Math.floor(t1 * SR));
  for (let i = s0; i < end; i++) {
    const t = i / SR;
    const g = gainOf(t);
    if (g <= 0) continue;
    const [l, r] = voice(t, i);
    buf.L[i] += l * g;
    buf.R[i] += r * g;
  }
}

/** Mains hum: India's grid runs at 50 Hz. Harmonics, a slow beat, and corona crackle. */
function hum(buf, t0, t1, gainOf) {
  const r = rng(50);
  const crackle = new SVF();
  crackle.set(5000, 0.8);
  bed(buf, t0, t1, gainOf, (t) => {
    const w = 2 * Math.PI * t;
    let y = Math.sin(w * 50) * 0.5 + Math.sin(w * 100) * 0.35 + Math.sin(w * 150) * 0.16 + Math.sin(w * 200.3) * 0.08 + Math.sin(w * 300.2) * 0.04;
    y *= 0.8 + 0.2 * Math.sin(w * 0.37);
    const c = r() < 0.0009 ? (r() * 2 - 1) * 2.5 : 0;
    const k = crackle.run(c) * 0.5;
    return [y * 0.9 + k, y * 0.9 - k * 0.6];
  });
}

/** Wind: pink noise through a wandering band, with gusts. */
function wind(buf, t0, t1, gainOf, { centre = 520, q = 0.9, gust = 0.5, whistle = 0, seed = 3 } = {}) {
  const nl = pinkNoise(seed);
  const nr = pinkNoise(seed + 1);
  const fl = new SVF();
  const fr = new SVF();
  const fw = new SVF();
  bed(buf, t0, t1, gainOf, (t, i) => {
    if (i % 64 === 0) {
      const g = Math.sin(t * 0.61) * 0.5 + Math.sin(t * 1.37 + 1) * 0.3 + Math.sin(t * 0.23 + 2) * 0.2;
      fl.set(centre * (1 + 0.45 * g), q);
      fr.set(centre * (1 + 0.45 * Math.sin(t * 0.57 + 0.8)), q);
      fw.set(900 + 350 * Math.sin(t * 0.41), 9);
    }
    const g = 1 + gust * (Math.sin(t * 0.83) * 0.5 + Math.sin(t * 2.1 + 3) * 0.25);
    const n = nl();
    fl.run(n);
    fr.run(nr());
    const wh = whistle ? fw.run(n) * whistle : 0;
    return [(fl.band + wh) * g * 1.6, (fr.band + wh * 0.7) * g * 1.6];
  });
}

/** Dry grass: bright noise in soft bursts. */
function grass(buf, t0, t1, gainOf) {
  const n = pinkNoise(9);
  const f = new SVF();
  f.set(4200, 0.8);
  bed(buf, t0, t1, gainOf, (t) => {
    const burst = Math.pow(Math.max(0, Math.sin(t * 3.1) * Math.sin(t * 1.3 + 1)), 2);
    const y = f.run(n()) * (0.25 + burst) * 0.9;
    return [y, y * 0.8];
  });
}

/** Tyre roar under the road shot. */
function roadBed(buf, t0, t1, gainOf) {
  const b = brownNoise(21);
  const f = new SVF();
  f.set(420, 0.7);
  bed(buf, t0, t1, gainOf, () => {
    const y = f.run(b()) * 1.2;
    return [y, y];
  });
}

/** A vehicle passing: a band of noise that rises then falls, panned across. */
function passBy(buf, t, dur, gain, dir = 1) {
  const n = pinkNoise(Math.round(t * 100));
  const f = new SVF();
  const s0 = Math.floor((t - dur / 2) * SR);
  const end = Math.min(buf.n, Math.floor((t + dur / 2) * SR));
  for (let i = Math.max(0, s0); i < end; i++) {
    const k = (i - s0) / (end - s0);
    const near = Math.exp(-Math.pow((k - 0.5) / 0.16, 2));
    if ((i - s0) % 32 === 0) f.set(k < 0.5 ? 400 + 1400 * near : 300 + 900 * near, 1.1);
    const y = f.run(n()) * near * gain * 2.2;
    const [pl, pr] = pan(dir * (k * 2 - 1) * 0.9);
    buf.L[i] += y * pl;
    buf.R[i] += y * pr;
  }
}

/** A river: low flow plus random gurgles. */
function water(buf, t0, t1, gainOf) {
  const b = brownNoise(33);
  const p = pinkNoise(34);
  const flow = new SVF();
  flow.set(380, 0.6);
  const lap = new SVF();
  const r = rng(35);
  const bubbles = [];
  bed(buf, t0, t1, gainOf, (t, i) => {
    if (i % 64 === 0) lap.set(700 + 300 * Math.sin(t * 1.7), 2);
    if (r() < 0.0006) bubbles.push({ start: t, f: 280 + r() * 700, a: 0.05 + r() * 0.08, p: r() * 2 - 1 });
    let bl = 0;
    let br = 0;
    for (let k = bubbles.length - 1; k >= 0; k--) {
      const q = bubbles[k];
      const x = t - q.start;
      if (x > 0.09) {
        bubbles.splice(k, 1);
        continue;
      }
      const y = Math.sin(2 * Math.PI * q.f * x * (1 + x * 6)) * q.a * Math.exp(-x / 0.025);
      const [pl, pr] = pan(q.p);
      bl += y * pl;
      br += y * pr;
    }
    const f = flow.run(b()) * 1.1 + lap.run(p()) * 0.35 * (0.6 + 0.4 * Math.sin(t * 0.9));
    return [f + bl, f * 0.95 + br];
  });
}

/** A low impact: a falling sine with a dark noise body. */
function impact(buf, t, gain = 0.5, len = 2.4) {
  const n = pinkNoise(Math.round(t * 10));
  const f = new SVF();
  f.set(240, 0.7);
  const s0 = Math.floor(t * SR);
  const end = Math.min(buf.n, s0 + Math.floor(len * SR));
  let ph = 0;
  for (let i = s0; i < end; i++) {
    const x = (i - s0) / SR;
    ph += (2 * Math.PI * (30 + 32 * Math.exp(-x / 0.25))) / SR;
    const y = (Math.sin(ph) * Math.exp(-x / 0.9) + f.run(n()) * Math.exp(-x / 0.18) * 1.2) * gain;
    buf.L[i] += y;
    buf.R[i] += y;
  }
}

/** A soft air movement, for cuts that need a breath rather than a hit. */
function whoosh(buf, t, dur = 0.8, gain = 0.2, reverse = false) {
  const n = pinkNoise(Math.round(t * 1000) + 7);
  const f = new SVF();
  const s0 = Math.floor((t - (reverse ? dur : dur * 0.35)) * SR);
  const end = Math.min(buf.n, s0 + Math.floor(dur * SR));
  for (let i = Math.max(0, s0); i < end; i++) {
    const k = (i - s0) / (end - s0);
    const shape = reverse ? Math.pow(k, 2.5) * (k < 0.97 ? 1 : (1 - k) / 0.03) : Math.sin(Math.PI * Math.pow(k, 0.6));
    if ((i - s0) % 32 === 0) f.set(300 + 2600 * shape, 1.4);
    const y = f.run(n()) * shape * gain;
    const [pl, pr] = pan((k - 0.5) * 0.8);
    buf.L[i] += y * pl;
    buf.R[i] += y * pr;
  }
}

/** A quiet struck tone for map beats: sine partials of a small bell. */
function tone(buf, t, freq = 587.3, gain = 0.06, p = 0) {
  const [pl, pr] = pan(p);
  const s0 = Math.floor(t * SR);
  const end = Math.min(buf.n, s0 + Math.floor(3 * SR));
  const parts = [[1, 1, 1.6], [2.76, 0.35, 0.7], [5.4, 0.12, 0.35]];
  for (let i = s0; i < end; i++) {
    const x = (i - s0) / SR;
    let y = 0;
    for (const [m, a, tau] of parts) y += Math.sin(2 * Math.PI * freq * m * x) * a * Math.exp(-x / tau);
    y *= gain * Math.min(1, x / 0.004);
    buf.L[i] += y * pl;
    buf.R[i] += y * pr;
  }
}

/** A tick for the montage's match cuts: a click with a short tail. */
function tick(buf, t, gain = 0.12) {
  const r = rng(Math.round(t * 1000));
  const f = new SVF();
  f.set(2800, 1.5);
  const s0 = Math.floor(t * SR);
  for (let i = s0; i < Math.min(buf.n, s0 + Math.floor(0.08 * SR)); i++) {
    const x = (i - s0) / SR;
    const y = f.run(r() * 2 - 1) * Math.exp(-x / 0.012) * gain;
    buf.L[i] += y;
    buf.R[i] += y;
  }
}

export function ambience() {
  const buf = stereo(DURATION + 1);
  // Room tone under everything, so no moment is digital silence.
  const room = pinkNoise(1);
  const roomF = new SVF();
  roomF.set(1800, 0.5);
  bed(buf, 0, DURATION, env([[0, 0.02], [DURATION - 1, 0.02], [DURATION, 0]]), () => {
    const y = roomF.run(room()) * 0.6;
    return [y, y];
  });

  hum(buf, 0, 8.2, env([[0, 0], [0.4, 0], [1.6, 0.05], [3.4, 0.07], [4.9, 0.11], [5.0, 0.045], [7.3, 0.035], [8.2, 0]]));
  hum(buf, 15.8, 20.2, env([[15.8, 0], [16.6, 0.03], [19.6, 0.03], [20.0, 0]]));

  wind(buf, 4.6, 20.2, env([[4.6, 0], [5.2, 0.12], [7.5, 0.1], [12.5, 0.07], [16, 0.09], [19.8, 0.08], [20, 0]]), { centre: 480 });
  grass(buf, 5, 16.2, env([[5, 0], [5.3, 0.1], [7.4, 0.08], [7.8, 0], [12.5, 0], [12.8, 0.07], [15.9, 0.06], [16.2, 0]]));

  roadBed(buf, 20, 25.5, env([[20, 0.18], [21.2, 0.16], [22.2, 0.06], [24.8, 0.03], [25.5, 0]]));

  water(buf, 27, 35.6, env([[27, 0], [27.6, 0.14], [29.5, 0.12], [30.5, 0.06], [32.5, 0.05], [33, 0.09], [35, 0.07], [35.6, 0]]));

  wind(buf, 34.4, 45.8, env([[34.4, 0], [35.4, 0.16], [39.5, 0.14], [42, 0.1], [45, 0.09], [45.8, 0]]), { centre: 360, q: 1.2, gust: 0.8, whistle: 0.35, seed: 11 });

  // The floodplain and the convergence get only air.
  wind(buf, 45, 56, env([[45, 0], [45.6, 0.05], [55.6, 0.05], [56, 0]]), { centre: 700, seed: 17 });
  return buf;
}

export function sfx() {
  const buf = stereo(DURATION + 1);
  // Hook: the line catching the light.
  tone(buf, CUES.cableLight + 0.2, 1174.7, 0.025, 0.3);
  whoosh(buf, 5, 0.9, 0.12);
  tone(buf, CUES.indiaReveal, 587.3, 0.06, 0);
  tone(buf, CUES.indiaReveal + 0.02, 880, 0.03, 0.2);
  whoosh(buf, 12.5, 0.8, 0.1);
  tone(buf, CUES.bustardMap + 0.3, 698.5, 0.045, -0.2);

  // Tiger: the hard cut to the road is the film's first real hit.
  impact(buf, CUES.roadCut, 0.45, 2);
  passBy(buf, 20.35, 1.1, 0.5, 1);
  passBy(buf, 21.0, 0.9, 0.4, -1);
  tone(buf, CUES.roadsDraw + 0.2, 523.3, 0.04, 0.2);

  // Dolphin.
  whoosh(buf, 27.5, 1.0, 0.1);
  tone(buf, CUES.riversDraw, 659.3, 0.045, -0.1);
  tone(buf, CUES.riverBreak, 440, 0.04, 0.3);

  // Snow leopard: a reverse swell into the cold.
  whoosh(buf, 35, 1.8, 0.16, true);
  tone(buf, CUES.contourMap, 784, 0.04, 0);

  // Rhino and the montage.
  impact(buf, CUES.rhinoName - 0.4, 0.22, 1.8);
  CUES.montage.forEach((t, i) => tick(buf, t, 0.09 + i * 0.015));

  // The idea, and the title.
  impact(buf, CUES.converge, 0.35, 2.4);
  impact(buf, CUES.titleHit, 0.6, 4);
  tone(buf, CUES.title, 293.7, 0.05, 0);

  // The impacts and tones sit in a smaller room than the score.
  const wet = new Reverb({ room: 0.8, damp: 0.5 }).process(buf);
  return addInto(buf, wet, 0.35);
}

export { clamp01 };
