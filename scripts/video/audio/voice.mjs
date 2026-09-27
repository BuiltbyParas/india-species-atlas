/**
 * The narration track.
 *
 * Two sources, in order of preference:
 *
 * 1. A recorded voiceover. Drop `voiceover.wav` (or `.mp3`) into
 *    `video/public/audio/<film>/`, cut to the film's timeline, and it is used
 *    as is. Or drop single lines as `video/public/audio/<film>/vo/<ID>.wav`
 *    and each replaces its synthetic line.
 * 2. Otherwise each line is spoken by a neural text-to-speech voice
 *    (Microsoft Edge `en-IN-PrabhatNeural`, the voice the atlas's earlier
 *    promo used) and the credits say so.
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ensureEdgeTts, probeDuration } from '../../promo/tts.mjs';
import { ROOT } from '../stage.mjs';
import { FILM, VOICE } from '../../../video/src/timeline.mjs';

const run = promisify(execFile);

export const TTS_VOICE = 'en-IN-PrabhatNeural';
/**
 * A touch lower than default. The promo reads a little slower (it has room);
 * the documentary nearer natural pace, with its pauses designed in the script.
 */
const RATE = FILM === 'promo' ? '-7%' : '-2%';
const PITCH = '-3Hz';
export { RATE, PITCH };

/** Where recorded narration for this film is dropped (the promo keeps the original, film-less folder). */
const DROP = join(ROOT, 'video/public/audio', FILM === 'promo' ? '' : FILM);

let tts = null;

async function speak(text, file) {
  tts ??= await ensureEdgeTts(join(ROOT, 'promo'));
  for (let attempt = 1; ; attempt++) {
    try {
      await run(tts.cmd, [...tts.args, '--voice', TTS_VOICE, `--rate=${RATE}`, `--pitch=${PITCH}`, '--text', text, '--write-media', file]);
      return;
    } catch (err) {
      if (attempt >= 4) throw err;
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }
}

/**
 * Speaks (or finds a recording of) one line, trimmed of the engine's own
 * leading and trailing silence so a planned start time is where the first
 * word lands. Cached by voice, rate, pitch and text.
 */
export async function lineAudio(v, dir, force = false) {
  await mkdir(dir, { recursive: true });
  let src = ['wav', 'mp3'].map((e) => join(DROP, 'vo', `${v.id}.${e}`)).find(existsSync);
  let source = 'recorded';
  if (!src) {
    source = 'tts';
    const key = createHash('sha1').update(`${TTS_VOICE}|${RATE}|${PITCH}|${v.text}`).digest('hex').slice(0, 10);
    src = join(dir, `${v.id}-${key}.mp3`);
    if (!existsSync(src) || force) await speak(v.text, src);
  }
  const wav = src.replace(/\.(mp3|wav)$/, '.trim.wav');
  if (!existsSync(wav) || force) {
    await run('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y', '-i', src,
      '-af', 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.06,areverse',
      '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s24le', wav,
    ]);
  }
  return { source, file: wav, seconds: await probeDuration(wav) };
}

export async function buildVoice(cacheDir, { force = false } = {}) {
  const dir = join(cacheDir, 'vo');
  for (const ext of ['wav', 'mp3']) {
    const full = join(DROP, `voiceover.${ext}`);
    if (existsSync(full)) {
      return { source: 'recorded', full, lines: VOICE.map((v) => ({ ...v, file: null, seconds: null })) };
    }
  }
  const lines = [];
  for (const v of VOICE) lines.push({ ...v, ...(await lineAudio(v, dir, force)) });
  return { source: lines.every((l) => l.source === 'recorded') ? 'recorded' : 'tts', full: null, lines };
}
