/**
 * Builds the film's sound: narration, score, ambience and effects as stems,
 * then the mix, then captions from the narration's measured timings.
 *
 *   npm run video:audio [-- --force]
 *
 * Mix chain:
 *   voice    high-pass, de-mud, presence, de-ess, compression
 *   music    ducked under the voice by a sidechain compressor
 *   ambience ducked more gently
 *   sfx      as designed
 *   bus      glue compression, then two-pass loudness normalisation to
 *            −14 LUFS integrated with a −1.5 dBTP ceiling (web delivery)
 *
 * A licensed music track dropped at `video/public/audio/music.wav` (or .mp3)
 * replaces the synthesised score, cut to the film's length.
 */
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { CACHE } from '../render.mjs';
import { ROOT } from '../stage.mjs';
import { DURATION, VOICE } from '../../../video/src/timeline.mjs';
import { peak, writeWav } from './dsp.mjs';
import { ambience, sfx } from './design.mjs';
import { score } from './score.mjs';
import { buildVoice, TTS_VOICE } from './voice.mjs';

const run = promisify(execFile);
export const AUDIO = join(CACHE, 'audio');

/** Integrated loudness targets for each stem before the bus, in LUFS. */
const TARGET = { voice: -17, music: -24.5, ambience: -30, sfx: -27 };

async function loudness(file) {
  const { stderr } = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], { maxBuffer: 1 << 24 });
  const json = JSON.parse(stderr.slice(stderr.lastIndexOf('{'), stderr.lastIndexOf('}') + 1));
  return { i: Number(json.input_i), tp: Number(json.input_tp), lra: Number(json.input_lra), thresh: Number(json.input_thresh), offset: Number(json.target_offset) };
}

async function ff(args) {
  await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { maxBuffer: 1 << 24 });
}

/** Lays the narration lines on a silent track at their timeline positions. */
async function voiceTrack(voice, out) {
  if (voice.full) {
    await ff(['-i', voice.full, '-af', `apad,atrim=0:${DURATION}`, '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s24le', out]);
    return;
  }
  const inputs = [];
  const chains = [];
  voice.lines.forEach((l, i) => {
    inputs.push('-i', l.file);
    const ms = Math.round(l.at * 1000);
    chains.push(`[${i}:a]aformat=sample_rates=48000:channel_layouts=mono,adelay=${ms},apad,atrim=0:${DURATION}[v${i}]`);
  });
  const graph = `${chains.join(';')};${voice.lines.map((_, i) => `[v${i}]`).join('')}amix=inputs=${voice.lines.length}:normalize=0,pan=stereo|c0=c0|c1=c0[out]`;
  await ff([...inputs, '-filter_complex', graph, '-map', '[out]', '-ar', '48000', '-c:a', 'pcm_s24le', out]);
}

function srtTime(t) {
  const ms = Math.round(t * 1000);
  const h = String(Math.floor(ms / 3_600_000)).padStart(2, '0');
  const m = String(Math.floor((ms % 3_600_000) / 60_000)).padStart(2, '0');
  const s = String(Math.floor((ms % 60_000) / 1000)).padStart(2, '0');
  return `${h}:${m}:${s},${String(ms % 1000).padStart(3, '0')}`;
}

/**
 * Wraps a caption into balanced lines of at most 42 characters: two lines
 * of similar length read faster than a long line and a stub.
 */
function wrap(text, width = 42) {
  if (text.length <= width) return [text];
  const words = text.split(' ');
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    if (a.length > width || b.length > width) continue;
    const score = Math.abs(a.length - b.length) - (/[,.;:]$/.test(a) ? 8 : 0);
    if (!best || score < best.score) best = { score, lines: [a, b] };
  }
  if (best) return best.lines;
  // Too long for two lines: greedy, and the caller splits it into cues.
  const lines = [''];
  for (const w of words) {
    const cur = lines[lines.length - 1];
    if ((cur + ' ' + w).trim().length > width) lines.push(w);
    else lines[lines.length - 1] = (cur + ' ' + w).trim();
  }
  return lines;
}

/**
 * Captions from the narration. A line that will not fit two caption lines is
 * split at its sentence breaks (or its middle), with time shared by length.
 */
export function captions(lines) {
  const cues = [];
  for (const l of lines) {
    const dur = l.seconds ?? 3;
    let parts = [l.text];
    if (wrap(l.text).length > 2) {
      parts = l.text.split(/(?<=\.)\s+/);
      if (parts.length === 1) {
        // Near the middle, but never leaving an article or preposition hanging.
        const w = l.text.split(' ');
        const weak = /^(the|a|an|of|and|to|in|on|at|is|are)$/i;
        let cut = Math.ceil(w.length / 2);
        for (const d of [0, -1, 1, -2, 2, -3, 3]) {
          const c = Math.ceil(w.length / 2) + d;
          if (c > 0 && c < w.length && !weak.test(w[c - 1])) {
            cut = c;
            break;
          }
        }
        parts = [w.slice(0, cut).join(' '), w.slice(cut).join(' ')];
      }
    }
    const total = parts.reduce((s, p) => s + p.length, 0);
    let at = l.at;
    for (const p of parts) {
      const d = (dur * p.length) / total;
      cues.push({ start: at, end: at + d + 0.25, text: wrap(p).join('\n') });
      at += d;
    }
  }
  // Never let a caption overlap the next one.
  for (let i = 0; i < cues.length - 1; i++) cues[i].end = Math.min(cues[i].end, cues[i + 1].start - 0.05);
  return cues.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`).join('\n');
}

export async function buildAudio({ force = false } = {}) {
  await mkdir(AUDIO, { recursive: true });
  const f = (n) => join(AUDIO, `${n}.wav`);

  console.log('› narration');
  const voice = await buildVoice(AUDIO, { force });
  await voiceTrack(voice, f('voice'));

  const licensed = ['wav', 'mp3'].map((e) => join(ROOT, 'video/public/audio', `music.${e}`)).find(existsSync);
  if (licensed) {
    console.log(`› music: using ${licensed}`);
    await ff(['-i', licensed, '-af', `apad,atrim=0:${DURATION},afade=t=out:st=${DURATION - 3}:d=3`, '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s24le', f('music')]);
  } else {
    console.log('› score (synthesised)');
    const m = score();
    await writeWav(f('music'), m, 0.7 / peak(m));
  }
  console.log('› ambience and effects');
  const a = ambience();
  await writeWav(f('ambience'), a, 0.7 / peak(a));
  const s = sfx();
  await writeWav(f('sfx'), s, 0.7 / peak(s));

  console.log('› loudness');
  const measured = {};
  for (const n of Object.keys(TARGET)) measured[n] = await loudness(f(n));
  const gain = (n) => (TARGET[n] - measured[n].i).toFixed(2);

  console.log('› mix');
  const graph = [
    `[0:a]volume=${gain('voice')}dB,highpass=f=85,equalizer=f=260:t=q:w=1.1:g=-2.5,equalizer=f=3300:t=q:w=1.3:g=2.5,` +
      `deesser=i=0.35,acompressor=threshold=-24dB:ratio=3:attack=6:release=140:makeup=1.5,asplit=2[vo][key0]`,
    `[key0]asplit=2[key1][key2]`,
    `[1:a]volume=${gain('music')}dB[mus]`,
    `[mus][key1]sidechaincompress=threshold=0.02:ratio=5:attack=40:release=450:makeup=1[musd]`,
    `[2:a]volume=${gain('ambience')}dB[amb]`,
    `[amb][key2]sidechaincompress=threshold=0.03:ratio=2.5:attack=60:release=600[ambd]`,
    `[3:a]volume=${gain('sfx')}dB[fx]`,
    `[vo][musd][ambd][fx]amix=inputs=4:normalize=0,acompressor=threshold=-16dB:ratio=1.8:attack=25:release=250[bus]`,
  ].join(';');
  const pre = join(AUDIO, 'premix.wav');
  await ff(['-i', f('voice'), '-i', f('music'), '-i', f('ambience'), '-i', f('sfx'), '-filter_complex', graph, '-map', '[bus]', '-t', String(DURATION), '-ar', '48000', '-c:a', 'pcm_s24le', pre]);

  // Two-pass loudness normalisation for an accurate −14 LUFS.
  const m1 = await loudness(pre);
  await ff([
    '-i', pre, '-af',
    `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${m1.i}:measured_TP=${m1.tp}:measured_LRA=${m1.lra}:measured_thresh=${m1.thresh}:offset=${m1.offset}:linear=true,` +
      `alimiter=limit=0.84:level=false,afade=t=out:st=${DURATION - 1.2}:d=1.2`,
    '-ar', '48000', '-c:a', 'pcm_s24le', f('mix'),
  ]);
  const final = await loudness(f('mix'));

  const srt = captions(voice.lines);
  await writeFile(join(AUDIO, 'captions.srt'), srt);
  const report = {
    voice: { source: voice.source, engine: voice.source === 'tts' ? `Microsoft Edge neural TTS (${TTS_VOICE}) via edge-tts` : 'recorded' },
    music: licensed ? { source: 'licensed file', file: licensed } : { source: 'synthesised for the film (scripts/video/audio/score.mjs)' },
    lines: voice.lines.map(({ id, at, text, seconds, source }) => ({ id, at, end: seconds ? at + seconds : null, seconds, text, source })),
    stems: Object.fromEntries(Object.keys(TARGET).map((n) => [n, { measuredLUFS: measured[n].i, gainDb: Number(gain(n)) }])),
    mix: { integratedLUFS: final.i, truePeak: final.tp, lra: final.lra },
    words: VOICE.reduce((s, v) => s + v.text.split(/\s+/).length, 0),
  };
  await writeFile(join(AUDIO, 'audio.json'), JSON.stringify(report, null, 2));
  console.log(`✓ mix ${final.i} LUFS, ${final.tp} dBTP, LRA ${final.lra} → ${f('mix')}`);
  return report;
}
