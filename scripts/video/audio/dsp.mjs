/**
 * A small, dependency-free synthesis kit for the film's score and sound
 * design. Everything is deterministic (seeded noise), so the same timeline
 * always produces the same audio, sample for sample.
 */
import { writeFile } from 'node:fs/promises';

export const SR = 48_000;

export function stereo(seconds) {
  const n = Math.ceil(seconds * SR);
  return { L: new Float32Array(n), R: new Float32Array(n), n };
}

export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
export const db = (d) => Math.pow(10, d / 20);
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Equal-power pan, -1 (left) … 1 (right). */
export function pan(p) {
  const a = ((p + 1) * Math.PI) / 4;
  return [Math.cos(a), Math.sin(a)];
}

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pink noise (Paul Kellet's refined filter), seeded. */
export function pinkNoise(seed) {
  const r = rng(seed);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  return () => {
    const w = r() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    const out = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
    b6 = w * 0.115926;
    return out * 0.11;
  };
}

/** Brown noise, seeded — the rumble under roads and rivers. */
export function brownNoise(seed) {
  const r = rng(seed);
  let last = 0;
  return () => {
    last = (last + 0.02 * (r() * 2 - 1)) / 1.02;
    return last * 3.5;
  };
}

/** Topology-preserving state-variable filter (Cytomic); cutoff may change per sample. */
export class SVF {
  constructor() {
    this.ic1 = 0;
    this.ic2 = 0;
    this.set(1000, 0.707);
  }
  set(fc, q = 0.707) {
    const g = Math.tan((Math.PI * Math.min(fc, SR * 0.45)) / SR);
    this.k = 1 / q;
    this.a1 = 1 / (1 + g * (g + this.k));
    this.a2 = g * this.a1;
    this.a3 = g * this.a2;
  }
  /** Returns [low, band, high]. */
  run(x) {
    const v3 = x - this.ic2;
    const v1 = this.a1 * this.ic1 + this.a2 * v3;
    const v2 = this.ic2 + this.a2 * this.ic1 + this.a3 * v3;
    this.ic1 = 2 * v1 - this.ic1;
    this.ic2 = 2 * v2 - this.ic2;
    this.low = v2;
    this.band = v1;
    this.high = x - this.k * v1 - v2;
    return v2;
  }
}

/** Band-limited sawtooth via PolyBLEP. */
export class Saw {
  constructor(phase = 0) {
    this.p = phase;
  }
  next(freq) {
    const dt = freq / SR;
    this.p += dt;
    if (this.p >= 1) this.p -= 1;
    let v = 2 * this.p - 1;
    let t = this.p;
    if (t < dt) {
      t /= dt;
      v -= t + t - t * t - 1;
    } else if (t > 1 - dt) {
      t = (t - 1) / dt;
      v -= t * t + t + t + 1;
    }
    return v;
  }
}

/** Attack/decay/sustain/release amplitude at time x into a note of length `len`. */
export function adsr(x, len, a, d, s, r) {
  if (x < 0) return 0;
  let v;
  if (x < a) v = x / a;
  else if (x < a + d) v = 1 - (1 - s) * ((x - a) / d);
  else v = s;
  if (x > len) v *= Math.max(0, 1 - (x - len) / r);
  return v;
}

/** Freeverb: eight combs and four allpasses per side, with stereo spread. */
export class Reverb {
  constructor({ room = 0.86, damp = 0.35, width = 1 } = {}) {
    const k = SR / 44100;
    const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
    const alls = [556, 441, 341, 225];
    const mk = (spread) => ({
      combs: combs.map((c) => ({ buf: new Float32Array(Math.round((c + spread) * k)), i: 0, store: 0 })),
      alls: alls.map((c) => ({ buf: new Float32Array(Math.round((c + spread) * k)), i: 0 })),
    });
    this.l = mk(0);
    this.r = mk(23);
    this.fb = room * 0.28 + 0.7;
    this.damp = damp * 0.4;
    this.width = width;
  }
  side(s, x) {
    let out = 0;
    for (const c of s.combs) {
      const y = c.buf[c.i];
      c.store = y * (1 - this.damp) + c.store * this.damp;
      c.buf[c.i] = x + c.store * this.fb;
      if (++c.i >= c.buf.length) c.i = 0;
      out += y;
    }
    for (const a of s.alls) {
      const b = a.buf[a.i];
      a.buf[a.i] = out + b * 0.5;
      if (++a.i >= a.buf.length) a.i = 0;
      out = b - out;
    }
    return out;
  }
  /** Processes a whole stereo buffer into a new wet-only buffer. */
  process(src) {
    const out = stereo(src.n / SR);
    const w1 = this.width / 2 + 0.5;
    const w2 = (1 - this.width) / 2;
    for (let i = 0; i < src.n; i++) {
      const x = (src.L[i] + src.R[i]) * 0.015;
      const l = this.side(this.l, x);
      const r = this.side(this.r, x);
      out.L[i] = l * w1 + r * w2;
      out.R[i] = r * w1 + l * w2;
    }
    return out;
  }
}

/** Stereo feedback delay (ping-pong). */
export function pingPong(src, seconds, feedback = 0.35, mix = 0.25, tone = 3500) {
  const d = Math.round(seconds * SR);
  const bl = new Float32Array(d);
  const br = new Float32Array(d);
  const fl = new SVF();
  const fr = new SVF();
  fl.set(tone);
  fr.set(tone);
  let i = 0;
  for (let n = 0; n < src.n; n++) {
    const yl = bl[i];
    const yr = br[i];
    bl[i] = fl.run(src.L[n] + yr * feedback);
    br[i] = fr.run(src.R[n] * 0.2 + yl * feedback);
    src.L[n] += yl * mix;
    src.R[n] += yr * mix;
    if (++i >= d) i = 0;
  }
  return src;
}

export function addInto(dst, src, gain = 1) {
  for (let i = 0; i < Math.min(dst.n, src.n); i++) {
    dst.L[i] += src.L[i] * gain;
    dst.R[i] += src.R[i] * gain;
  }
  return dst;
}

/** 24-bit PCM stereo WAV. */
export async function writeWav(file, buf, gain = 1) {
  const n = buf.n;
  const data = Buffer.alloc(n * 6);
  for (let i = 0; i < n; i++) {
    for (const [c, arr] of [[0, buf.L], [1, buf.R]]) {
      let v = Math.max(-1, Math.min(1, arr[i] * gain));
      v = Math.round(v * 8388607);
      data.writeIntLE(v, i * 6 + c * 3, 3);
    }
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 6, 28);
  h.writeUInt16LE(6, 32);
  h.writeUInt16LE(24, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  await writeFile(file, Buffer.concat([h, data]));
}

export function peak(buf) {
  let p = 0;
  for (let i = 0; i < buf.n; i++) p = Math.max(p, Math.abs(buf.L[i]), Math.abs(buf.R[i]));
  return p;
}
