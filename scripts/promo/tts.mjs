import { execFile } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { VOICE, VOICE_RATE } from './config.mjs';

const run = promisify(execFile);

const exists = async (p) => access(p).then(() => true, () => false);

/**
 * Finds a usable edge-tts, building a virtualenv for it if there is none.
 *
 * edge-tts is a Python package and Python packages installed against the
 * system interpreter stop resolving the moment the distribution moves to a new
 * minor version, so a private venv under `promo/` is the only arrangement that
 * survives an OS upgrade. It is created once and reused.
 */
export async function ensureEdgeTts(workRoot) {
  const candidates = [
    ['edge-tts', []],
    ['python3', ['-m', 'edge_tts']],
  ];
  for (const [cmd, args] of candidates) {
    try {
      await run(cmd, [...args, '--version']);
      return { cmd, args };
    } catch {
      /* try the next one */
    }
  }

  const venv = join(workRoot, '.venv');
  const bin = join(venv, 'bin', 'edge-tts');
  if (!(await exists(bin))) {
    console.log('  installing edge-tts into a local virtualenv…');
    await run('python3', ['-m', 'venv', venv]);
    await run(join(venv, 'bin', 'pip'), [
      'install', '--quiet', '--disable-pip-version-check', 'edge-tts',
    ]);
  }
  await run(bin, ['--version']);
  return { cmd: bin, args: [] };
}

export async function probeDuration(file) {
  const { stdout } = await run('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=nw=1:nk=1',
    file,
  ]);
  return Number.parseFloat(stdout.trim());
}

/**
 * Speaks one line, retrying a few times before giving up.
 *
 * edge-tts talks to a remote service over a websocket, and a dropped
 * connection there is common enough that it would otherwise throw away a
 * pipeline run that has already built the site — the failure arrives before a
 * single frame has been captured, but only just. The wait lengthens each time
 * so a service having a bad minute is given one.
 */
async function speak(tts, text, file, attempts = 4) {
  for (let attempt = 1; ; attempt++) {
    try {
      await run(tts.cmd, [
        ...tts.args,
        '--voice', VOICE,
        `--rate=${VOICE_RATE}`,
        '--text', text,
        '--write-media', file,
      ]);
      return;
    } catch (err) {
      if (attempt >= attempts) throw err;
      console.warn(`  ! edge-tts failed (attempt ${attempt}/${attempts}), retrying`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }
}

/**
 * Speaks every narration line and reports how long each one runs, so the shot
 * that carries it can be given enough frames to cover it.
 */
export async function synthesise(lines, outDir, workRoot) {
  await mkdir(outDir, { recursive: true });
  const tts = await ensureEdgeTts(workRoot);
  const out = [];
  for (const [i, line] of lines.entries()) {
    const file = join(outDir, `${String(i).padStart(2, '0')}.mp3`);
    await speak(tts, line.text, file);
    const seconds = await probeDuration(file);
    console.log(`  ${line.shot} · ${seconds.toFixed(2)}s · "${line.text.slice(0, 56)}…"`);
    out.push({ ...line, file, seconds });
  }
  return out;
}
