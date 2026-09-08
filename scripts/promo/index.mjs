#!/usr/bin/env node
/**
 * Builds the promotional video for the India Species Atlas, end to end.
 *
 *   npm run promo -- --url https://example.github.io/india-species-atlas/
 *
 * The pipeline is: speak the narration, work out how long each section has to
 * be to carry it, drive a real browser through the site capturing one frame at
 * a time, draw the captions and the closing card with the site's own type, and
 * cut the whole thing together with ffmpeg. Nothing about it is a one-off — run
 * it again after changing the site and the video follows.
 */
import { spawn } from 'node:child_process';
import { mkdir, readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  FPS,
  LOCAL_ORIGIN,
  NARRATION_LEAD_IN,
  NARRATION_TAIL,
  PREVIEW_PORT,
  PUBLIC_URL,
  TRANSITION,
} from './config.mjs';
import { Recorder } from './recorder.mjs';
import { END_CARD, SHOTS } from './shots.mjs';
import { synthesise } from './tts.mjs';
import { readStats, renderCaptions, renderEndCard, writeJson } from './overlays.mjs';
import { pickEncoder, render } from './edit.mjs';

const ROOT = resolve(import.meta.dirname, '../..');
const WORK = join(ROOT, 'promo');
const FRAMES = join(WORK, 'frames');
const AUDIO = join(WORK, 'audio');
const OVERLAYS = join(WORK, 'overlays');

/** Gap between two narration lines inside the same shot, in seconds. */
const LINE_GAP = 0.28;

function parseArgs(argv) {
  const opts = {
    url: PUBLIC_URL,
    site: null,
    out: join(WORK, 'india-species-atlas-promo.mp4'),
    voice: true,
    build: true,
    music: null,
    record: true,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === '--url') opts.url = next();
    else if (arg === '--site') opts.site = next();
    else if (arg === '--out') opts.out = resolve(next());
    else if (arg === '--music') opts.music = resolve(next());
    else if (arg === '--no-voice') opts.voice = false;
    else if (arg === '--no-build') opts.build = false;
    else if (arg === '--skip-record') opts.record = false;
    else if (arg === '--help' || arg === '-h') {
      console.log(
        [
          'Usage: npm run promo -- [options]',
          '',
          '  --url <url>     public address for the end card and QR code',
          '  --site <url>    record against this server instead of starting one',
          '  --out <file>    output path (default promo/india-species-atlas-promo.mp4)',
          '  --music <file>  mix in a royalty-free track under the narration',
          '  --no-voice      captions only, no spoken narration',
          '  --no-build      skip `npm run build` before recording',
          '  --skip-record   reuse the frames already in promo/frames',
        ].join('\n'),
      );
      process.exit(0);
    } else throw new Error(`unknown option: ${arg}`);
  }
  return opts;
}

/** How many frames each shot actually has on disk, for `--skip-record`. */
async function countRecordedFrames(shots) {
  const counts = new Map();
  for (const shot of shots) {
    if (!shot.run) continue;
    const files = await readdir(join(FRAMES, shot.id)).catch(() => null);
    if (!files) throw new Error(`no frames for "${shot.id}" — drop --skip-record`);
    counts.set(shot.id, files.filter((f) => f.endsWith('.jpg')).length);
  }
  return counts;
}

function sh(cmd, args, opts = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, { cwd: ROOT, stdio: 'inherit', ...opts });
    child.on('close', (code) =>
      code === 0 ? resolvePromise() : reject(new Error(`${cmd} exited ${code}`)),
    );
  });
}

async function startPreview() {
  const child = spawn(
    'npx',
    ['vite', 'preview', '--port', String(PREVIEW_PORT), '--strictPort'],
    { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] },
  );
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${LOCAL_ORIGIN}/`);
      if (res.ok) return child;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  child.kill();
  throw new Error('vite preview did not come up');
}

/**
 * Turns the shot list plus the measured narration into a timeline.
 *
 * A shot is never shorter than the speech it has to carry, and never shorter
 * than the time its own choreography needs, whichever is longer.
 */
function buildTimeline(shots, spoken, onDisk) {
  const byShot = new Map();
  for (const line of spoken) {
    if (!byShot.has(line.shot)) byShot.set(line.shot, []);
    byShot.get(line.shot).push(line);
  }

  const planned = shots.map((shot) => {
    const lines = byShot.get(shot.id) ?? [];
    const speech = lines.reduce((sum, l) => sum + l.seconds, 0) + LINE_GAP * Math.max(0, lines.length - 1);
    const needed = lines.length ? NARRATION_LEAD_IN + speech + NARRATION_TAIL : 0;
    // Frames already on disk win: re-cutting an existing capture must use the
    // length that was actually recorded, or every dissolve after the first
    // shot lands in the wrong place.
    const frames = onDisk?.get(shot.id) ?? Math.round(Math.max(shot.minSeconds, needed) * FPS);
    return { ...shot, lines, frames, seconds: frames / FPS };
  });

  let cursor = 0;
  const captions = [];
  const narration = [];
  for (const [i, shot] of planned.entries()) {
    shot.start = cursor;
    cursor += shot.seconds - (i < planned.length - 1 ? TRANSITION : 0);

    let at = shot.start + NARRATION_LEAD_IN;
    for (const line of shot.lines) {
      narration.push({ ...line, start: at });
      at += line.seconds + LINE_GAP;
    }
    for (const caption of shot.captions ?? []) {
      const start = shot.start + caption.at;
      captions.push({
        ...caption,
        start,
        seconds: Math.min(caption.seconds, shot.start + shot.seconds - start - 0.2),
      });
    }
  }
  return { planned, captions, narration, total: cursor };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const started = Date.now();
  await mkdir(FRAMES, { recursive: true });
  await mkdir(OVERLAYS, { recursive: true });

  let preview = null;
  let origin = opts.site;
  try {
    if (!origin) {
      if (opts.build) {
        console.log('› building the site');
        await sh('npm', ['run', 'build']);
      }
      console.log('› starting the preview server');
      preview = await startPreview();
      origin = LOCAL_ORIGIN;
    }

    const shots = [...SHOTS, END_CARD];

    console.log('› narration');
    let spoken = [];
    if (opts.voice) {
      const lines = shots.flatMap((shot) =>
        (shot.narration ?? []).map((text) => ({ shot: shot.id, text })),
      );
      spoken = await synthesise(lines, AUDIO, WORK);
    } else {
      console.log('  (skipped — captions only)');
    }

    // Only consulted when the frames are being reused; a fresh recording is
    // driven by the timeline rather than the other way round.
    const onDisk = opts.record ? null : await countRecordedFrames(shots);
    const timeline = buildTimeline(shots, spoken, onDisk);
    console.log(`› timeline: ${timeline.total.toFixed(1)}s`);
    for (const shot of timeline.planned) {
      console.log(`  ${shot.id.padEnd(9)} ${shot.start.toFixed(1)}s → ${(shot.start + shot.seconds).toFixed(1)}s  (${shot.frames} frames)`);
    }

    const recorder = new Recorder({ framesDir: FRAMES, origin });
    console.log('› browser');
    await recorder.start();

    if (opts.record) {
      for (const shot of timeline.planned) {
        if (!shot.run) continue;
        const t0 = Date.now();
        if (shot.warm) {
          // A first, unrecorded pass so the map's tiles are in the browser
          // cache and the recorded pass has no half-drawn basemap in it.
          recorder.dry = true;
          await recorder.beginShot(shot.id);
          await shot.run(recorder, Math.min(shot.frames, 60));
          recorder.dry = false;
        }
        await recorder.beginShot(shot.id);
        await shot.run(recorder, shot.frames);
        console.log(
          `  ${shot.id.padEnd(9)} ${shot.frames} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`,
        );
      }
    } else {
      console.log('› reusing existing frames');
    }

    console.log('› captions and end card');
    const captionFiles = await renderCaptions(
      recorder.browser,
      timeline.captions,
      OVERLAYS,
    );
    const stats = await readStats(recorder.page, origin);
    const endCard = await renderEndCard(recorder.browser, { url: opts.url, stats }, OVERLAYS);
    await recorder.stop();

    const planned = timeline.planned.map((shot) =>
      shot.id === END_CARD.id ? { ...shot, still: endCard } : shot,
    );

    console.log('› encoding');
    const encoder = await pickEncoder();
    console.log(`  encoder: ${encoder.name}`);
    const result = await render({
      shots: planned,
      captions: captionFiles,
      narration: timeline.narration,
      music: opts.music,
      framesDir: FRAMES,
      outFile: opts.out,
      encoder,
    });

    await writeJson(join(WORK, 'timeline.json'), {
      url: opts.url,
      total: result.total,
      shots: planned.map(({ id, start, seconds, frames }) => ({ id, start, seconds, frames })),
      captions: captionFiles.map(({ text, start, seconds }) => ({ text, start, seconds })),
      narration: timeline.narration.map(({ shot, text, start, seconds }) => ({ shot, text, start, seconds })),
    });

    const { size } = await stat(opts.out);
    console.log(
      `\n✓ ${opts.out}\n  ${result.total.toFixed(1)}s · ${(size / 1e6).toFixed(1)} MB · ` +
        `built in ${((Date.now() - started) / 1000 / 60).toFixed(1)} min`,
    );
  } finally {
    preview?.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
