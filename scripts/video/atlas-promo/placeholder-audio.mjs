#!/usr/bin/env node
/**
 * PLACEHOLDER sound for the promotional film, synthesised here so the preview
 * is not silent. Nothing is downloaded and nothing is sampled: every sound is
 * generated with the repository's own DSP kit (scripts/video/audio/dsp.mjs),
 * deterministically.
 *
 *   npm run video:promo:audio            one-shot effects only (sfx/*.wav)
 *   npm run video:promo:audio -- --bed   also a placeholder music bed (music.wav)
 *
 * Output: video/public/promo/audio/ (git-ignored). The film's AudioBed places
 * the effects on the cue sheet in video/atlas-promo/audio/cues.ts. To use real
 * sound, overwrite these files (same names) with licensed or commissioned
 * audio — see video/atlas-promo/audio/README.md. Credit them accordingly.
 */
import { mkdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, stereo, SVF, Saw, Reverb, addInto, writeWav, pinkNoise, brownNoise, rng, mtof, peak, pan } from '../audio/dsp.mjs';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const OUT = join(ROOT, 'video/public/promo/audio');

const normalise = (buf, target = 0.7) => {
  const p = peak(buf) || 1;
  return { buf, gain: target / p };
};

/** A low, felt hit: a pitched-down sine thump with a short noise transient and a long tail. */
function impact() {
  const b = stereo(3.2);
  const n = pinkNoise(11);
  let ph = 0;
  for (let i = 0; i < b.n; i++) {
    const t = i / SR;
    const f = 38 + 70 * Math.exp(-t * 9);
    ph += (2 * Math.PI * f) / SR;
    const body = Math.sin(ph) * Math.exp(-t * 1.6);
    const click = n() * Math.exp(-t * 60) * 0.6;
    b.L[i] = b.R[i] = body + click;
  }
  const wet = new Reverb({ room: 0.9, damp: 0.5 }).process(b);
  addInto(b, wet, 0.6);
  return b;
}

/** A soft swell, for reveals: filtered noise opening and closing. */
function reveal() {
  const b = stereo(2.6);
  const n = pinkNoise(23);
  const f = new SVF();
  for (let i = 0; i < b.n; i++) {
    const t = i / b.n;
    const env = Math.sin(Math.PI * Math.min(1, t * 1.4)) ** 2;
    f.set(300 + 3200 * env, 0.9);
    const v = f.run(n()) * env;
    const [l, r] = pan(Math.sin(t * Math.PI * 2) * 0.4);
    b.L[i] = v * l;
    b.R[i] = v * r;
  }
  return b;
}

/** A camera move: band-passed noise sweeping up and away, panned across. */
function whoosh() {
  const b = stereo(1.1);
  const n = pinkNoise(37);
  const f = new SVF();
  for (let i = 0; i < b.n; i++) {
    const t = i / b.n;
    const env = Math.pow(Math.sin(Math.PI * t), 1.6) * (1 - t * 0.3);
    f.set(400 + 4200 * t, 1.6);
    f.run(n());
    const v = f.band * env * 2.2;
    const [l, r] = pan(-0.7 + 1.4 * t);
    b.L[i] = v * l;
    b.R[i] = v * r;
  }
  return b;
}

/** A data tick: a short high sine blip. */
function tick() {
  const b = stereo(0.12);
  for (let i = 0; i < b.n; i++) {
    const t = i / SR;
    const v = Math.sin(2 * Math.PI * 2400 * t) * Math.exp(-t * 70) * 0.6;
    b.L[i] = b.R[i] = v;
  }
  return b;
}

/** A UI press: a dry, small two-part click. */
function click() {
  const b = stereo(0.15);
  const r = rng(5);
  for (let i = 0; i < b.n; i++) {
    const t = i / SR;
    const a = Math.exp(-t * 400) * (r() * 2 - 1) * 0.5;
    const body = Math.sin(2 * Math.PI * 900 * t) * Math.exp(-t * 90) * 0.4;
    b.L[i] = b.R[i] = a + body;
  }
  return b;
}

/** A rise into the title: noise and a pitched tone climbing, cut at the top. */
function riser() {
  const b = stereo(1.8);
  const n = pinkNoise(41);
  const f = new SVF();
  let ph = 0;
  for (let i = 0; i < b.n; i++) {
    const t = i / b.n;
    f.set(200 + 6000 * t * t, 1.2);
    f.run(n());
    ph += (2 * Math.PI * (110 + 330 * t * t)) / SR;
    const v = (f.band * 1.6 + Math.sin(ph) * 0.25) * t * t;
    b.L[i] = b.R[i] = v;
  }
  return b;
}

/** A sub swell: room tone and a low rumble. */
function sub() {
  const b = stereo(4.0);
  const n = brownNoise(53);
  const f = new SVF();
  f.set(90, 0.8);
  for (let i = 0; i < b.n; i++) {
    const t = i / b.n;
    const env = Math.sin(Math.PI * t) ** 1.5;
    const v = (f.run(n()) * 1.4 + Math.sin(2 * Math.PI * 41 * (i / SR)) * 0.35) * env;
    b.L[i] = b.R[i] = v;
  }
  return b;
}

/** Scene starts, read from the film's timeline (no second copy of the timings). */
async function sceneStarts() {
  const src = await readFile(join(ROOT, 'video/atlas-promo/timeline.ts'), 'utf8');
  const block = src.slice(src.indexOf('export const SCENES'), src.indexOf('] as const'));
  const out = [];
  let t = 0;
  for (const m of block.matchAll(/id: '([a-z]+)'.*?dur: ([0-9.]+)/g)) {
    out.push({ id: m[1], start: t, dur: Number(m[2]) });
    t += Number(m[2]);
  }
  return { scenes: out, total: t };
}

/**
 * A placeholder bed: one sustained voicing per scene, through a low-pass and
 * a long reverb, crossfaded at the scene boundaries. It marks the film's
 * emotional shape (dark → open → tense → resolved) and nothing more.
 */
async function bed() {
  const { scenes, total } = await sceneStarts();
  // MIDI voicings per scene: D-centred, the threats scene darkest.
  const V = {
    signal: [26, 38],
    india: [38, 45, 50, 57],
    landscape: [38, 45, 52, 57, 62],
    life: [34, 41, 50, 53, 58],
    data: [38, 45, 50, 57, 64],
    threats: [33, 40, 46, 51, 56],
    conservation: [36, 43, 52, 55, 60],
    atlas: [38, 45, 54, 57, 62, 66],
    system: [31, 38, 50, 54, 57, 62],
    brand: [38, 45, 50, 54, 57],
  };
  const b = stereo(total + 3);
  const saws = Array.from({ length: 8 }, (_, k) => [new Saw(k * 0.13), new Saw(k * 0.29)]);
  const filt = [new SVF(), new SVF()];
  const xf = 1.2;
  for (let i = 0; i < b.n; i++) {
    const t = i / SR;
    let l = 0;
    let r = 0;
    for (const s of scenes) {
      const a = Math.min(1, Math.max(0, (t - s.start + xf / 2) / xf)) * Math.min(1, Math.max(0, (s.start + s.dur + xf / 2 - t) / xf));
      if (a <= 0) continue;
      const notes = V[s.id] ?? V.india;
      notes.forEach((m, k) => {
        const [s1, s2] = saws[k % saws.length];
        const f = mtof(m);
        l += s1.next(f * 0.998) * a * 0.12;
        r += s2.next(f * 1.002) * a * 0.12;
      });
    }
    const open = 500 + 1400 * (0.5 + 0.5 * Math.sin(t * 0.21));
    filt[0].set(open, 0.6);
    filt[1].set(open, 0.6);
    const fade = Math.min(1, t / 3) * Math.min(1, Math.max(0, (total + 2 - t) / 4));
    b.L[i] = filt[0].run(l) * fade;
    b.R[i] = filt[1].run(r) * fade;
  }
  const wet = new Reverb({ room: 0.94, damp: 0.4 }).process(b);
  addInto(b, wet, 1.4);
  return b;
}

await mkdir(join(OUT, 'sfx'), { recursive: true });
const sfx = { impact, reveal, whoosh, tick, click, riser, sub };
for (const [name, make] of Object.entries(sfx)) {
  const { buf, gain } = normalise(make(), name === 'tick' || name === 'click' ? 0.5 : 0.8);
  await writeWav(join(OUT, 'sfx', `${name}.wav`), buf, gain);
  console.log(`sfx/${name}.wav`);
}
if (process.argv.includes('--bed')) {
  const { buf, gain } = normalise(await bed(), 0.5);
  await writeWav(join(OUT, 'music.wav'), buf, gain);
  console.log('music.wav (placeholder bed)');
}
