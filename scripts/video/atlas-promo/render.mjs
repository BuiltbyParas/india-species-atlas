#!/usr/bin/env node
/**
 * The promotional film's command line (Remotion). See video/atlas-promo/README.md.
 *
 *   node scripts/video/atlas-promo/render.mjs studio          interactive preview (Remotion Studio)
 *   node scripts/video/atlas-promo/render.mjs prep            pre-project contours, rivers, outline
 *   node scripts/video/atlas-promo/render.mjs still 12.5 40   single frames (seconds) → exports/atlas-promo/stills/
 *   node scripts/video/atlas-promo/render.mjs contact         a contact sheet, one frame per second
 *   node scripts/video/atlas-promo/render.mjs preview         whole film, 720p, fast → …-preview-720p.mp4
 *   node scripts/video/atlas-promo/render.mjs render          whole film, 1080p H.264 → india-atlas-promo.mp4
 *   node scripts/video/atlas-promo/render.mjs master          whole film, 1080p ProRes 422 HQ → …-master.mov
 *   node scripts/video/atlas-promo/render.mjs qc [file]       technical checks on a render
 *
 * Options: --scene <id> (one scene only, for preview/render), --concurrency N
 * (default 1: on the 6 GB laptop it was built on, two browser tabs thrash memory and run 4× slower), --force.
 *
 * H.264 comes from Remotion's bundled FFmpeg (libx264). The system FFmpeg on
 * the machine this was built on has no libx264, so it is used only for QC and
 * the contact sheet.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const OUT = join(ROOT, 'exports/atlas-promo');
const ENTRY = 'video/atlas-promo/index.ts';
const CONFIG = 'video/atlas-promo/remotion.config.ts';
const COMP = 'AtlasPromo';
const FPS = 30;

const argv = process.argv.slice(2);
const cmd = argv[0];
const flag = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : def;
};
const has = (name) => argv.includes(`--${name}`);
const positional = argv.slice(1).filter((a, i, arr) => !a.startsWith('--') && !(arr[i - 1] ?? '').startsWith('--'));

const remotion = (args) =>
  new Promise((ok, fail) => {
    const c = spawn(process.execPath, [join(ROOT, 'node_modules/@remotion/cli/remotion-cli.js'), ...args, `--config=${CONFIG}`], {
      cwd: ROOT,
      stdio: 'inherit',
    });
    c.on('close', (code) => (code === 0 ? ok() : fail(new Error(`remotion ${args[0]} exited ${code}`))));
  });

function ensurePrep() {
  const need = ['outline.json', 'contours.json', 'rivers.json'].some((f) => !existsSync(join(ROOT, 'video/public/promo/geo', f)));
  if (need || has('force-prep')) {
    const r = spawnSync(process.execPath, [join(ROOT, 'scripts/video/atlas-promo/prep-geo.mjs')], { cwd: ROOT, stdio: 'inherit' });
    if (r.status !== 0) throw new Error('prep failed');
  }
  if (!existsSync(join(ROOT, 'video/public/promo/ui/ui.json')))
    console.warn('\n  ! No interface plates yet: run `npm run video:promo:capture` (scene 08 shows a red placeholder until then).\n');
  if (!existsSync(join(ROOT, 'video/public/fonts/newsreader.woff2')))
    console.warn('\n  ! Fonts missing: run `npm run video:data` once.\n');
}

/** Scene ranges, read from the timeline the same way the film does (no second copy of the timings). */
async function sceneRange(id) {
  const src = (await import('node:fs')).readFileSync(join(ROOT, 'video/atlas-promo/timeline.ts'), 'utf8');
  const block = src.slice(src.indexOf('export const SCENES'), src.indexOf('] as const'));
  let t = 0;
  for (const m of block.matchAll(/id: '([a-z]+)'.*?dur: ([0-9.]+)/g)) {
    if (m[1] === id) return [Math.round(t * FPS), Math.round((t + Number(m[2])) * FPS) - 1];
    t += Number(m[2]);
  }
  throw new Error(`no scene ${id}`);
}

function ffprobe(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name,width,height,r_frame_rate,nb_frames:format=duration,size', '-of', 'json', file], { encoding: 'utf8' });
  return JSON.parse(r.stdout || '{}');
}

async function qc(file) {
  if (!existsSync(file)) throw new Error(`no file ${file}`);
  const info = ffprobe(file);
  const v = info.streams?.find((s) => s.width);
  console.log(`\nQC ${file}`);
  console.log(`  ${v?.codec_name} ${v?.width}×${v?.height} @ ${v?.r_frame_rate}, ${Number(info.format?.duration).toFixed(2)} s, ${(Number(info.format?.size) / 1e6).toFixed(1)} MB`);
  // Black frames: the film opens near-black on purpose (scene 01's first half-second), so report rather than fail.
  const black = spawnSync('ffmpeg', ['-v', 'info', '-i', file, '-vf', 'blackdetect=d=0.25:pix_th=0.06', '-an', '-f', 'null', '-'], { encoding: 'utf8' });
  const spans = [...(black.stderr ?? '').matchAll(/black_start:([0-9.]+) black_end:([0-9.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  console.log(`  black spans ≥0.25 s: ${spans.length ? spans.map(([a, b]) => `${a.toFixed(2)}–${b.toFixed(2)}`).join(', ') : 'none'}`);
  const unexpected = spans.filter(([a, b]) => !(a < 0.1 && b < 1.0));
  // Flashes: a frame whose mean luma jumps far from both neighbours.
  const sig = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', 'scale=64:36,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-', '-an', '-f', 'null', '-'], { encoding: 'utf8' });
  const y = [...(sig.stdout ?? '').matchAll(/YAVG=([0-9.]+)/g)].map((m) => Number(m[1]));
  const flashes = [];
  for (let i = 1; i < y.length - 1; i++) if (Math.abs(y[i] - y[i - 1]) > 18 && Math.abs(y[i] - y[i + 1]) > 18) flashes.push(i);
  console.log(`  frames analysed: ${y.length}; single-frame flashes: ${flashes.length ? flashes.map((f) => (f / FPS).toFixed(2)).join(', ') : 'none'}`);
  const ok = unexpected.length === 0 && flashes.length === 0 && v?.width;
  console.log(ok ? '  PASS' : `  FAIL ${unexpected.length ? `(unexpected black at ${unexpected.map(([a]) => a.toFixed(2)).join(', ')})` : ''}`);
  return ok;
}

/**
 * The whole film in muted chunks, then joined and given its sound.
 *
 * Each chunk is its own short render, so an interruption (on the 6 GB build
 * machine, memory pressure stopped a single hour-long render) costs at most
 * one chunk: re-running the command skips every chunk already on disk. The
 * chunks share one encoder setting and are joined without re-encoding. The
 * sound is mixed by FFmpeg straight from the cue sheet (audio/cues.ts) — the
 * same files, times and gains the Remotion AudioBed uses in the Studio.
 */
async function chunked(name, out, quality) {
  const dir = join(OUT, 'chunks', name);
  mkdirSync(dir, { recursive: true });
  const bundle = join(OUT, '.bundle');
  await remotion(['bundle', ENTRY, `--out-dir=${bundle}`]);
  const total = await filmFrames();
  const size = Number(flag('chunk', '300'));
  const parts = [];
  for (let from = 0, i = 0; from < total; from += size, i++) {
    const to = Math.min(total, from + size) - 1;
    const file = join(dir, `part-${String(i).padStart(2, '0')}.mp4`);
    parts.push(file);
    if (existsSync(file) && !has('force')) continue;
    const tmp = file.replace('.mp4', '.partial.mp4');
    console.log(`\nchunk ${i + 1}/${Math.ceil(total / size)}: frames ${from}–${to}`);
    await remotion(['render', bundle, COMP, tmp, `--frames=${from}-${to}`, '--muted', `--concurrency=${concurrency}`, '--timeout=180000', '--log=error', ...quality]);
    (await import('node:fs')).renameSync(tmp, file);
  }
  const list = join(dir, 'parts.txt');
  (await import('node:fs')).writeFileSync(list, parts.map((p) => `file '${p}'`).join('\n'));
  const silent = join(dir, 'joined.mp4');
  run('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent]);
  const audio = await mixAudio(dir, total / FPS);
  if (audio) run('ffmpeg', ['-v', 'error', '-y', '-i', silent, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', out]);
  else (await import('node:fs')).copyFileSync(silent, out);
}

function run(bin, args) {
  const r = spawnSync(bin, args, { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${bin} failed`);
}

async function filmFrames() {
  const src = (await import('node:fs')).readFileSync(join(ROOT, 'video/atlas-promo/timeline.ts'), 'utf8');
  const block = src.slice(src.indexOf('export const SCENES'), src.indexOf('] as const'));
  let t = 0;
  for (const m of block.matchAll(/dur: ([0-9.]+)/g)) t += Number(m[1]);
  return Math.round(t * FPS);
}

/** The cue sheet, compiled out of audio/cues.ts with esbuild (bundled with Remotion's toolchain). */
async function cueSheet(dir) {
  const entry = join(dir, 'cues-entry.ts');
  const outFile = join(dir, 'cues.mjs');
  (await import('node:fs')).writeFileSync(entry, `import { CUES, MUSIC_FADE } from '${join(ROOT, 'video/atlas-promo/audio/cues')}';\nexport default { cues: CUES, music: MUSIC_FADE };\n`);
  run(join(ROOT, 'node_modules/.bin/esbuild'), [entry, '--bundle', '--platform=node', '--format=esm', '--loader:.jpg=empty', '--loader:.png=empty', '--loader:.geojson=json', `--outfile=${outFile}`, '--log-level=error']);
  return (await import(`${outFile}?t=${Date.now()}`)).default;
}

async function mixAudio(dir, duration) {
  const AUD = join(ROOT, 'video/public/promo/audio');
  const music = ['music.wav', 'music.mp3'].map((f) => join(AUD, f)).find(existsSync);
  const { cues, music: fade } = await cueSheet(dir);
  const inputs = [];
  const chains = [];
  if (music) {
    inputs.push('-i', music);
    chains.push(`[0:a]volume=0.9,afade=t=in:d=${fade.in},afade=t=out:st=${fade.end - fade.out}:d=${fade.out},atrim=0:${duration}[m]`);
  }
  let n = music ? 1 : 0;
  const labels = music ? ['[m]'] : [];
  for (const c of cues) {
    const f = join(AUD, 'sfx', `${c.kind}.wav`);
    if (!existsSync(f)) continue;
    inputs.push('-i', f);
    const ms = Math.round(c.t * 1000);
    chains.push(`[${n}:a]volume=${c.gain},adelay=${ms}|${ms}[s${n}]`);
    labels.push(`[s${n}]`);
    n++;
  }
  if (!labels.length) return null;
  const file = join(dir, 'mix.wav');
  const graph = `${chains.join(';')};${labels.join('')}amix=inputs=${labels.length}:normalize=0:duration=longest,atrim=0:${duration},alimiter=limit=0.89[out]`;
  run('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', graph, '-map', '[out]', '-ar', '48000', file]);
  return file;
}

mkdirSync(OUT, { recursive: true });
const concurrency = flag('concurrency', '1');

switch (cmd) {
  case 'studio':
    ensurePrep();
    await remotion(['studio', ENTRY, '--port=4477']);
    break;
  case 'prep':
    spawnSync(process.execPath, [join(ROOT, 'scripts/video/atlas-promo/prep-geo.mjs')], { cwd: ROOT, stdio: 'inherit' });
    break;
  case 'still': {
    ensurePrep();
    mkdirSync(join(OUT, 'stills'), { recursive: true });
    // Bundle once, then take every still from the same bundle.
    const bundle = join(OUT, '.bundle');
    await remotion(['bundle', ENTRY, `--out-dir=${bundle}`]);
    for (const s of positional.length ? positional : ['3', '10', '20', '30', '44', '52', '64', '75', '86', '95']) {
      const f = Math.round(Number(s) * FPS);
      await remotion(['still', bundle, COMP, join(OUT, 'stills', `t${Number(s).toFixed(1).padStart(5, '0')}.png`), `--frame=${f}`, `--scale=${flag('scale', '1')}`]);
    }
    break;
  }
  case 'contact': {
    // One frame per second at 480 px, tiled — the quickest whole-film look.
    ensurePrep();
    const dir = join(OUT, 'contact');
    mkdirSync(dir, { recursive: true });
    await remotion(['render', ENTRY, COMP, join(dir, 'frames'), '--sequence', '--image-format=jpeg', '--scale=0.25', `--every-nth-frame=${FPS}`, `--concurrency=${concurrency}`].filter(Boolean));
    const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-pattern_type', 'glob', '-i', join(dir, 'frames', '*.jpeg'), '-vf', 'tile=8x13:padding=4:color=black', '-frames:v', '1', join(OUT, 'contact-sheet.jpg')], { stdio: 'inherit' });
    if (r.status === 0) console.log(`contact sheet → ${join(OUT, 'contact-sheet.jpg')}`);
    break;
  }
  case 'preview':
  case 'render':
  case 'master': {
    ensurePrep();
    const scene = flag('scene');
    const range = scene ? await sceneRange(scene) : null;
    const name = cmd === 'preview' ? 'india-atlas-promo-preview-720p' : cmd === 'master' ? 'india-atlas-promo-master' : 'india-atlas-promo';
    const out = join(OUT, `${name}${scene ? `-${scene}` : ''}.${cmd === 'master' ? 'mov' : 'mp4'}`);
    const quality = [];
    if (cmd === 'preview') quality.push('--scale=0.6667', '--crf=24', '--x264-preset=veryfast', '--jpeg-quality=85');
    if (cmd === 'render') quality.push('--crf=16', '--x264-preset=slow', '--image-format=jpeg', '--jpeg-quality=95');
    if (cmd === 'master') quality.push('--codec=prores', '--prores-profile=hq', '--image-format=png');
    const t0 = Date.now();
    if (range || cmd === 'master') {
      const args = ['render', ENTRY, COMP, out, `--concurrency=${concurrency}`, '--timeout=180000', ...quality];
      if (range) args.push(`--frames=${range[0]}-${range[1]}`);
      await remotion(args);
    } else {
      await chunked(name, out, quality);
    }
    console.log(`\n${out}  (${((Date.now() - t0) / 60000).toFixed(1)} min, ${(statSync(out).size / 1e6).toFixed(1)} MB)`);
    if (!scene) await qc(out);
    break;
  }
  case 'qc': {
    const file = positional[0] ?? join(OUT, 'india-atlas-promo.mp4');
    process.exit((await qc(file)) ? 0 : 1);
  }
  default:
    console.log('usage: render.mjs <studio|prep|still|contact|preview|render|master|qc> [args]');
    process.exit(cmd ? 1 : 0);
}
