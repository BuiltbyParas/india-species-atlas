#!/usr/bin/env node
/**
 * Renders documentary mode (/documentary) to a 1920×1080 H.264 video.
 *
 * The documentary draws every frame as a pure function of its clock, so this
 * is not a screen recording: the page is opened with `?capture=1`, and for
 * each frame the script calls `window.__documentary.seek(t)`, waits for the
 * frame to be painted, takes a screenshot and pipes it straight into ffmpeg.
 * The same run always produces the same video, on any machine, however slow.
 *
 *   npm run documentary                       # build, serve, render all 5:00
 *   npm run documentary -- --from 40 --to 82  # one species segment
 *   npm run documentary -- --fps 24 --out promo/doc.mp4
 *   npm run documentary -- --url http://localhost:5173 --no-build
 *
 * The cue list (`window.__documentary.cues`) is written beside the video as
 * JSON, so narration or music can be cut against the same timings.
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { chromium } from 'playwright';
import { pickEncoder } from '../promo/edit.mjs';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const flag = (name) => args.includes(`--${name}`);

const FPS = Number(opt('fps', 30));
const OUT = resolve(opt('out', 'promo/india-species-atlas-documentary.mp4'));
const PORT = 4179;
let url = opt('url', null);

function run(cmd, cmdArgs, options = {}) {
  return new Promise((ok, fail) => {
    const child = spawn(cmd, cmdArgs, { stdio: 'inherit', ...options });
    child.on('exit', (code) => (code === 0 ? ok() : fail(new Error(`${cmd} exited with ${code}`))));
  });
}

let server = null;
if (!url) {
  if (!flag('no-build')) await run('npm', ['run', 'build']);
  server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  url = `http://localhost:${PORT}`;
  // Wait for the preview server to answer.
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) break;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
}

const browser = await chromium.launch({
  args: ['--hide-scrollbars', '--force-color-profile=srgb', '--disable-lcd-text', '--mute-audio'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const base = url.replace(/\/$/, '');
  await page.goto(`${base}/documentary?capture=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__documentary);
  await page.evaluate(() => window.__documentary.ready);
  const { duration, cues } = await page.evaluate(() => ({
    duration: window.__documentary.duration,
    cues: window.__documentary.cues,
  }));

  const from = Number(opt('from', 0));
  const to = Math.min(Number(opt('to', duration)), duration);
  const frames = Math.round((to - from) * FPS);

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT.replace(/\.mp4$/, '.cues.json'), JSON.stringify({ fps: FPS, from, to, cues }, null, 2));

  const encoder = await pickEncoder();
  console.log(`Rendering ${frames} frames (${from}s → ${to}s at ${FPS} fps) with ${encoder.name}`);
  const ffmpeg = spawn(
    'ffmpeg',
    [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      ...encoder.args,
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
      OUT,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  const done = new Promise((ok, fail) => ffmpeg.on('exit', (c) => (c === 0 ? ok() : fail(new Error(`ffmpeg exited with ${c}`)))));

  const started = Date.now();
  for (let i = 0; i < frames; i++) {
    const t = from + i / FPS;
    await page.evaluate((v) => window.__documentary.seek(v), t);
    const jpeg = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ffmpeg.stdin.write(jpeg)) await new Promise((r) => ffmpeg.stdin.once('drain', r));
    if (i % (FPS * 5) === 0) {
      const rate = (i + 1) / ((Date.now() - started) / 1000);
      process.stdout.write(`\r  ${t.toFixed(1)}s  (${rate.toFixed(1)} frames/s)   `);
    }
  }
  ffmpeg.stdin.end();
  await done;
  console.log(`\nWrote ${OUT}`);
} finally {
  await browser.close();
  server?.kill();
}
