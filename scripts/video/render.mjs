/**
 * Frame capture and assembly.
 *
 * Each shot is captured to its own mezzanine file (the browser's encoded
 * frames, stream-copied into Matroska — no re-encode) under a name that
 * hashes everything the shot's pixels depend on. Changing one scene only
 * re-renders the shots that use it; the rest come from the cache.
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, grabFrame } from './stage.mjs';
import { DURATION, FPS, SHOTS, frameRange } from '../../video/src/timeline.mjs';

export const EXPORTS = join(ROOT, 'exports');
export const CACHE = join(EXPORTS, '.cache');
const SRC = join(ROOT, 'video/src');

/** The source files every shot depends on: the engine, the stage and the shared scene code. */
async function engineFiles() {
  const files = [join(SRC, 'main.ts'), join(SRC, 'timeline.mjs'), join(SRC, 'scenes/index.ts'), join(SRC, 'scenes/common.ts')];
  for (const f of await readdir(join(SRC, 'engine'))) files.push(join(SRC, 'engine', f));
  return files;
}

/** Scenes that reuse another scene's drawing, and so depend on its file too. */
const SCENE_DEPS = { title: ['converge'] };

/** The scene file a shot's scene name lives in. */
export function sceneFile(scene) {
  const family = scene.split(':')[0];
  const name = scene.includes(':') ? (family === 'photo' ? 'photo' : 'maps') : family;
  return join(SRC, 'scenes', `${name}.ts`);
}

async function digest(files, extra) {
  const h = createHash('sha1');
  for (const f of files.sort()) {
    h.update(f);
    h.update(existsSync(f) ? await readFile(f) : 'missing');
  }
  h.update(JSON.stringify(extra));
  return h.digest('hex').slice(0, 12);
}

/**
 * Everything a shot's frames depend on: engine, its own scene (and the
 * previous shot's, if it dissolves in over it), its timeline entry, the
 * assets it lists and the render settings.
 */
export async function shotHash(shot, opts) {
  const i = SHOTS.indexOf(shot);
  const prev = i > 0 ? SHOTS[i - 1] : null;
  const overlaps = shot.transitionIn.type === 'dissolve' && prev;
  const deps = (scene) => [sceneFile(scene), ...(SCENE_DEPS[scene] ?? []).map(sceneFile)];
  const files = [...(await engineFiles()), ...deps(shot.scene), ...(overlaps ? deps(prev.scene) : [])];
  const assetStamps = [];
  for (const a of shot.assets) {
    const p = a.startsWith('../') ? join(ROOT, 'video', a) : join(ROOT, 'video/public', a);
    assetStamps.push(existsSync(p) ? `${a}:${(await stat(p)).size}` : `${a}:missing`);
  }
  return digest(files, { shot, prev: overlaps ? prev : null, assetStamps, fps: opts.fps, scale: opts.scale, format: opts.format });
}

export function run(cmd, args, { quiet = true, input } = {}) {
  return new Promise((ok, fail) => {
    const child = spawn(cmd, args, { cwd: ROOT, stdio: [input ? 'pipe' : 'ignore', quiet ? 'ignore' : 'inherit', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d) => {
      err = (err + d).slice(-8000);
    });
    child.on('close', (code) => (code === 0 ? ok() : fail(new Error(`${cmd} exited ${code}\n${err}`))));
    if (input) input(child.stdin);
  });
}

/** Captures a time range straight into a mezzanine file. */
export async function captureRange(page, { from, to, fps, format, quality, out, onProgress }) {
  const [f0, f1] = frameRange(from, to, fps);
  const tmp = `${out}.part.mkv`;
  const ff = spawn(
    'ffmpeg',
    ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', format === 'png' ? 'png' : 'mjpeg', '-i', '-', '-c:v', 'copy', tmp],
    { cwd: ROOT, stdio: ['pipe', 'ignore', 'pipe'] },
  );
  let err = '';
  ff.stderr.on('data', (d) => (err += d));
  const done = new Promise((ok, fail) => ff.on('close', (c) => (c === 0 ? ok() : fail(new Error(`ffmpeg: ${err}`)))));
  const started = Date.now();
  for (let f = f0; f < f1; f++) {
    const buf = await grabFrame(page, f / fps, format, quality);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    onProgress?.(f - f0 + 1, f1 - f0, (f - f0 + 1) / ((Date.now() - started) / 1000));
  }
  ff.stdin.end();
  await done;
  await rename(tmp, out);
  return { frames: f1 - f0, seconds: (Date.now() - started) / 1000 };
}

/**
 * Renders shots into the cache, skipping any whose hash is already there.
 * Returns one record per shot for the render log.
 */
export async function renderShots(page, shots, opts) {
  const dir = join(CACHE, 'shots');
  await mkdir(dir, { recursive: true });
  const results = [];
  for (const shot of shots) {
    const hash = await shotHash(shot, opts);
    const tag = `${shot.id}-${opts.scale === 1 ? '' : `s${opts.scale}-`}${opts.fps}-${opts.format}-${hash}`;
    const out = join(dir, `${tag}.mkv`);
    const rec = { id: shot.id, file: out, hash, cached: false, frames: 0, seconds: 0, error: null };
    if (existsSync(out) && !opts.force) {
      rec.cached = true;
      const [f0, f1] = frameRange(shot.start, shot.end, opts.fps);
      rec.frames = f1 - f0;
      process.stdout.write(`  ${shot.id} cached\n`);
    } else {
      try {
        const r = await captureRange(page, {
          from: shot.start, to: shot.end, fps: opts.fps, format: opts.format, quality: opts.quality, out,
          onProgress: (n, total, rate) => {
            // A terminal gets a live counter; a log gets a line every 2 s of film.
            if (process.stdout.isTTY) process.stdout.write(`\r  ${shot.id} ${n}/${total} frames (${rate.toFixed(1)} fps)   `);
            else if (n % (opts.fps * 2) === 0) process.stdout.write(`  ${shot.id} ${n}/${total} (${rate.toFixed(1)} fps)\n`);
          },
        });
        Object.assign(rec, r);
        process.stdout.write(`\r  ${shot.id} ${r.frames} frames in ${r.seconds.toFixed(0)}s              \n`);
      } catch (e) {
        rec.error = String(e.message ?? e);
        process.stdout.write(`\n  ${shot.id} FAILED: ${rec.error.slice(0, 300)}\n`);
      }
    }
    results.push(rec);
  }
  return results;
}

export async function pickH264() {
  // No libx264 in patent-clean ffmpeg builds (Fedora's among them), and the
  // VAAPI driver there exposes no H.264 encode either; OpenH264 is the one
  // encoder that is always present.
  const has = await new Promise((ok) => {
    const c = spawn('ffmpeg', ['-hide_banner', '-encoders'], { stdio: ['ignore', 'pipe', 'ignore'] });
    let s = '';
    c.stdout.on('data', (d) => (s += d));
    c.on('close', () => ok((name) => new RegExp(`\\b${name}\\b`).test(s)));
  });
  if (has('libx264')) {
    return {
      name: 'libx264',
      master: ['-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-profile:v', 'high', '-tune', 'grain'],
      web: ['-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-profile:v', 'high', '-maxrate', '10M', '-bufsize', '20M'],
      draft: ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22'],
    };
  }
  return {
    name: 'libopenh264',
    master: ['-c:v', 'libopenh264', '-profile:v', 'high', '-b:v', '40M', '-maxrate', '50M', '-bufsize', '80M'],
    web: ['-c:v', 'libopenh264', '-profile:v', 'high', '-b:v', '9M', '-maxrate', '12M', '-bufsize', '18M'],
    draft: ['-c:v', 'libopenh264', '-profile:v', 'high', '-b:v', '8M'],
  };
}

/** The finishing pass applied to the assembled picture: one grade and one grain for every shot. */
export function finishing({ grain = 5, total }) {
  return [
    // Lift nothing, hold the blacks: a gentle S and a touch less chroma.
    "curves=master='0/0 0.12/0.105 0.5/0.5 0.88/0.9 1/0.985'",
    'eq=saturation=0.97',
    'vignette=angle=PI/5.5',
    // Temporal luma grain, so flat map fields and gradients do not band.
    `noise=c0s=${grain}:c0f=t+u`,
    `fade=t=out:st=${(total - 0.4).toFixed(3)}:d=0.4`,
  ].join(',');
}

/**
 * Assembles mezzanines (and any footage dropped into a shot's slot) into one
 * picture, finishes it, and muxes the audio. `outputs` is a list of
 * { file, args, grain } — one pass produces them all.
 */
export async function assemble({ parts, from, to, fps, outputs, audio, width = 1920, height = 1080 }) {
  const total = to - from;
  const inputs = [];
  const chains = [];
  parts.forEach((p, i) => {
    if (p.footage) {
      inputs.push('-ss', '0', '-t', String(p.seconds), '-i', p.footage);
      chains.push(
        `[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},fps=${fps},` +
          `setsar=1,format=yuv444p,trim=duration=${p.seconds.toFixed(4)},setpts=PTS-STARTPTS[p${i}]`,
      );
    } else {
      inputs.push('-i', p.file);
      chains.push(
        `[${i}:v]fps=${fps},scale=${width}:${height}:flags=lanczos,setsar=1,format=yuv444p,` +
          `trim=start=${p.trimStart.toFixed(4)}:duration=${p.seconds.toFixed(4)},setpts=PTS-STARTPTS[p${i}]`,
      );
    }
  });
  const concat = `${parts.map((_, i) => `[p${i}]`).join('')}concat=n=${parts.length}:v=1:a=0[cat]`;
  const split = outputs.length > 1 ? `;[cat]split=${outputs.length}${outputs.map((_, i) => `[s${i}]`).join('')}` : '';
  const finals = outputs.map((o, i) => `${outputs.length > 1 ? `[s${i}]` : '[cat]'}${finishing({ grain: o.grain ?? 5, total })},format=yuv420p[o${i}]`);
  let audioIdx = -1;
  if (audio && existsSync(audio)) {
    audioIdx = parts.length;
    inputs.push('-ss', from.toFixed(4), '-t', total.toFixed(4), '-i', audio);
  } else {
    audioIdx = parts.length;
    inputs.push('-f', 'lavfi', '-t', total.toFixed(4), '-i', 'anullsrc=r=48000:cl=stereo');
  }
  const graph = [...chains, concat + split, ...finals].join(';');
  const args = ['-hide_banner', '-loglevel', 'error', '-y', ...inputs, '-filter_complex', graph];
  outputs.forEach((o, i) => {
    args.push('-map', `[o${i}]`, '-map', `${audioIdx}:a`, ...o.args, '-r', String(fps), '-c:a', 'aac', '-b:a', o.audioBitrate ?? '320k', '-ar', '48000', '-t', total.toFixed(4), '-movflags', '+faststart', o.file);
  });
  for (const o of outputs) await mkdir(join(o.file, '..'), { recursive: true });
  await run('ffmpeg', args);
}

/** Maps a time range onto cached shot files (and footage slots), with trims. */
export function partsFor(records, from, to) {
  const parts = [];
  for (const shot of SHOTS) {
    const s = Math.max(from, shot.start);
    const e = Math.min(to, shot.end);
    if (e <= s) continue;
    const rec = records.find((r) => r.id === shot.id);
    // Real footage dropped into a shot's slot replaces the illustration.
    const footage = shot.slot && existsSync(join(ROOT, 'video/public', shot.slot)) ? join(ROOT, 'video/public', shot.slot) : null;
    if (!footage && (!rec || rec.error)) throw new Error(`no render for ${shot.id}`);
    parts.push({ id: shot.id, file: rec?.file, footage, trimStart: s - shot.start, seconds: e - s });
  }
  return parts;
}

export async function writeLog(name, data) {
  await mkdir(CACHE, { recursive: true });
  await writeFile(join(CACHE, name), JSON.stringify(data, null, 2));
}

export { DURATION, FPS, SHOTS };
