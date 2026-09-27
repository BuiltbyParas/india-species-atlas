/**
 * The narration track.
 *
 * Two sources, in order of preference:
 *
 * 1. A recorded voiceover. Drop `voiceover.wav` (or `.mp3`) into
 *    `video/public/audio/`, cut to the film's timeline (line V1 at 1.5 s and
 *    so on), and it is used as is. Or drop single lines as
 *    `video/public/audio/vo/V1.wav` … and each replaces its synthetic line.
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
import { VOICE } from '../../../video/src/timeline.mjs';

const run = promisify(execFile);

export const TTS_VOICE = 'en-IN-PrabhatNeural';
/** A little under default pace and a touch lower: documentary, not advert. */
const RATE = '-7%';
const PITCH = '-3Hz';

const DROP = join(ROOT, 'video/public/audio');

async function speak(tts, text, file) {
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
 * Speaks (or finds) every line and returns its file, measured length and
 * where it sits on the timeline, trimmed of the TTS engine's own leading and
 * trailing silence so the planned start time is where the first word lands.
 */
export async function buildVoice(cacheDir, { force = false } = {}) {
  const dir = join(cacheDir, 'vo');
  await mkdir(dir, { recursive: true });

  for (const ext of ['wav', 'mp3']) {
    const full = join(DROP, `voiceover.${ext}`);
    if (existsSync(full)) {
      return { source: 'recorded', full, lines: VOICE.map((v) => ({ ...v, file: null, seconds: null })) };
    }
  }

  let tts = null;
  const lines = [];
  for (const v of VOICE) {
    let src = ['wav', 'mp3'].map((e) => join(DROP, 'vo', `${v.id}.${e}`)).find(existsSync);
    let source = 'recorded';
    if (!src) {
      source = 'tts';
      const key = createHash('sha1').update(`${TTS_VOICE}|${RATE}|${PITCH}|${v.text}`).digest('hex').slice(0, 10);
      src = join(dir, `${v.id}-${key}.mp3`);
      if (!existsSync(src) || force) {
        tts ??= await ensureEdgeTts(join(ROOT, 'promo'));
        await speak(tts, v.text, src);
      }
    }
    // Trim the engine's padding and normalise the format once, here.
    const wav = src.replace(/\.(mp3|wav)$/, '.trim.wav');
    if (!existsSync(wav) || force) {
      await run('ffmpeg', [
        '-hide_banner', '-loglevel', 'error', '-y', '-i', src,
        '-af', 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.06,areverse',
        '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s24le', wav,
      ]);
    }
    lines.push({ ...v, source, file: wav, seconds: await probeDuration(wav) });
  }
  return { source: lines.every((l) => l.source === 'recorded') ? 'recorded' : 'tts', full: null, lines };
}
