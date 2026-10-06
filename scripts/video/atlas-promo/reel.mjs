#!/usr/bin/env node
/**
 * The 60-second vertical reel's command line. See reel/README.md.
 *
 *   node scripts/video/atlas-promo/reel.mjs sync       copy reel/ media into video/public/reel/ and make the stand-in plates
 *   node scripts/video/atlas-promo/reel.mjs studio     Remotion Studio (AtlasReel is in the "Reel" folder)
 *   node scripts/video/atlas-promo/reel.mjs tests      render the phase-1 tests (S03–S05) → exports/reel/atlas_reel_tests_vNN.mp4
 *   node scripts/video/atlas-promo/reel.mjs preview    the whole reel at 540×960 → exports/reel/atlas_reel_preview_vNN.mp4
 *   node scripts/video/atlas-promo/reel.mjs still 7 12.9 15   single frames (seconds) → exports/reel/stills/
 *   node scripts/video/atlas-promo/reel.mjs qc <file>  format, duration, black spans and flashes
 *   node scripts/video/atlas-promo/reel.mjs shotlist   regenerate reel/documentation/SHOT_LIST.md from reel/edit/shotlist.json
 *
 * Renders never overwrite: each one takes the next free version number.
 * Options: --concurrency N (default 1, see the promo film's notes on the 6 GB laptop), --guides (draw the
 * Instagram safe zone over the frame).
 */
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const OUT = join(ROOT, 'exports/reel');
const PUB = join(ROOT, 'video/public/reel');
const ENTRY = 'video/atlas-promo/index.ts';
const CONFIG = 'video/atlas-promo/remotion.config.ts';
const COMP = 'AtlasReel';
const FPS = 30;

const argv = process.argv.slice(2);
const cmd = argv[0];
const flag = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : def;
};
const has = (name) => argv.includes(`--${name}`);
const positional = argv.slice(1).filter((a, i, arr) => !a.startsWith('--') && !['--concurrency'].includes(arr[i - 1]));
const concurrency = flag('concurrency', '1');
const props = JSON.stringify({ guides: has('guides') });

function run(bin, args) {
  const r = spawnSync(bin, args, { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${bin} failed`);
}

const remotion = (args) =>
  new Promise((ok, fail) => {
    const c = spawn(process.execPath, [join(ROOT, 'node_modules/@remotion/cli/remotion-cli.js'), ...args, `--config=${CONFIG}`], { cwd: ROOT, stdio: 'inherit' });
    c.on('close', (code) => (code === 0 ? ok() : fail(new Error(`remotion ${args[0]} exited ${code}`))));
  });

/** The next unused file name: atlas_reel_tests_v01.mp4, _v02, … */
function nextVersion(stem, ext) {
  for (let v = 1; ; v++) {
    const f = join(OUT, `${stem}_v${String(v).padStart(2, '0')}.${ext}`);
    if (!existsSync(f)) return f;
  }
}

/** Copies every file under `from` into `to`, keeping relative paths; skips .gitkeep and unchanged files. */
function mirror(from, to, exts) {
  if (!existsSync(from)) return [];
  const copied = [];
  for (const name of readdirSync(from, { recursive: true })) {
    const src = join(from, name);
    if (!statSync(src).isFile() || !exts.some((e) => name.toLowerCase().endsWith(e))) continue;
    const dst = join(to, name);
    mkdirSync(resolve(dst, '..'), { recursive: true });
    if (existsSync(dst) && statSync(dst).mtimeMs >= statSync(src).mtimeMs) continue;
    copyFileSync(src, dst);
    copied.push(relative(ROOT, dst));
  }
  return copied;
}

/**
 * Stand-in plates for the tests, until the Flow clips exist:
 *  - grassland: the Gemini still from Oct 3, cropped to 9:16 ABOVE its visible sparkle mark (y ≈ 2610–2665).
 *  - wire plate: the same still's lower grass, a lower and closer framing for the wire shot.
 *  - bustard: the site's credited Commons photograph (Dr. Raju Kasambe, CC BY-SA 4.0), a full-height 9:16 crop
 *    around the left-hand bird at source resolution, so a push-in stays above one source pixel per output pixel.
 */
function standIns() {
  const dir = join(PUB, 'standin');
  mkdirSync(dir, { recursive: true });
  const gemini = join(homedir(), 'Downloads/Rajasthan_semi-arid_grassland_at…_2K_20261003135240.jpg');
  const bustard = join(ROOT, 'video/public/species/great-indian-bustard.jpg');
  const jobs = [
    [gemini, 'grassland.jpg', 'crop=1457:2590:40:0,scale=1215:2160:flags=lanczos'],
    [gemini, 'wire-plate.jpg', 'crop=1170:2080:0:520,scale=1215:2160:flags=lanczos'],
    [bustard, 'bustard.jpg', 'crop=1620:2880:990:0'],
  ];
  for (const [src, name, vf] of jobs) {
    const dst = join(dir, name);
    if (existsSync(dst) && !has('force')) continue;
    if (!existsSync(src)) {
      console.warn(`  ! stand-in source missing: ${src}`);
      continue;
    }
    run('ffmpeg', ['-v', 'error', '-y', '-i', src, '-vf', vf, '-q:v', '2', dst]);
    console.log(`  stand-in ${relative(ROOT, dst)}`);
  }
}

function sync() {
  standIns();
  const media = [
    ...mirror(join(ROOT, 'reel/video/flow'), join(PUB, 'flow'), ['.mp4', '.mov', '.webm']),
    ...mirror(join(ROOT, 'reel/audio'), join(PUB, 'audio'), ['.wav', '.aif', '.aiff', '.mp3']),
    ...mirror(join(ROOT, 'reel/character/rig'), join(PUB, 'character'), ['.png', '.json']),
  ];
  console.log(media.length ? media.map((m) => `  synced ${m}`).join('\n') : '  reel media: nothing new');
}

function qc(file) {
  if (!file || !existsSync(file)) throw new Error(`no file ${file}`);
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name,width,height,r_frame_rate:format=duration,size', '-of', 'json', file], { encoding: 'utf8' });
  const info = JSON.parse(r.stdout || '{}');
  const v = info.streams?.find((s) => s.width);
  console.log(`\nQC ${relative(ROOT, file)}`);
  console.log(`  ${v?.codec_name} ${v?.width}×${v?.height} @ ${v?.r_frame_rate}, ${Number(info.format?.duration).toFixed(2)} s, ${(Number(info.format?.size) / 1e6).toFixed(1)} MB`);
  const vertical = v && v.width * 16 === v.height * 9;
  console.log(`  9:16: ${vertical ? 'yes' : 'NO'}`);
  const black = spawnSync('ffmpeg', ['-v', 'info', '-i', file, '-vf', 'blackdetect=d=0.25:pix_th=0.06', '-an', '-f', 'null', '-'], { encoding: 'utf8' });
  const spans = [...(black.stderr ?? '').matchAll(/black_start:([0-9.]+) black_end:([0-9.]+)/g)].map((m) => `${Number(m[1]).toFixed(2)}–${Number(m[2]).toFixed(2)}`);
  console.log(`  black spans ≥0.25 s: ${spans.length ? spans.join(', ') : 'none'}`);
  const sig = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', 'scale=36:64,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-', '-an', '-f', 'null', '-'], { encoding: 'utf8' });
  const y = [...(sig.stdout ?? '').matchAll(/YAVG=([0-9.]+)/g)].map((m) => Number(m[1]));
  const flashes = [];
  for (let i = 1; i < y.length - 1; i++) if (Math.abs(y[i] - y[i - 1]) > 18 && Math.abs(y[i] - y[i + 1]) > 18) flashes.push((i / FPS).toFixed(2));
  console.log(`  single-frame flashes: ${flashes.length ? flashes.join(', ') : 'none'}`);
}

/** SHOT_LIST.md is a view of shotlist.json, never edited by hand. */
function shotlistDoc() {
  const d = JSON.parse(readFileSync(join(ROOT, 'reel/edit/shotlist.json'), 'utf8'));
  const voice = Object.fromEntries(d.voice.map((v) => [v.id, v]));
  const o = [
    '# Shot list',
    '',
    "Generated from `reel/edit/shotlist.json` (the source of truth) by `npm run reel:shotlist`. Edit the JSON and regenerate this file; don't edit the table by hand.",
    '',
    '| ID | In | Out | Dur | Source | Section | Character | Voice | Transition in → out | On-screen text | Status |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
    ...d.shots.map((s) => {
      const v = s.voice.map((i) => `${i} “${voice[i].line}”`).join(' ') || '—';
      return `| ${s.id} | ${s.in} | ${s.out} | ${s.out - s.in} s | ${s.source} | **${s.section}**. ${s.visual} | ${s.character ?? '—'} | ${v} | ${s.transitionIn} → ${s.transitionOut} | ${s.text.join(' / ') || '—'} | ${s.status} |`;
    }),
    '',
    '## SFX and music per shot',
    '',
    '| ID | SFX | Music |',
    '|---|---|---|',
    ...d.shots.map((s) => `| ${s.id} | ${s.sfx.join(', ')} | ${s.music} |`),
    '',
    '## Honesty notes',
    '',
    ...d.shots.filter((s) => s.honesty).map((s) => `- **${s.id}**: ${s.honesty}`),
  ];
  writeFileSync(join(ROOT, 'reel/documentation/SHOT_LIST.md'), o.join('\n') + '\n');
  console.log('  wrote reel/documentation/SHOT_LIST.md');
}

mkdirSync(OUT, { recursive: true });

switch (cmd) {
  case 'sync':
    sync();
    break;
  case 'studio':
    sync();
    await remotion(['studio', ENTRY, '--port=4478']);
    break;
  case 'tests': {
    sync();
    const out = nextVersion('atlas_reel_tests', 'mp4');
    // S03–S05 plus a half-second either side: 5.5 s → 17.5 s.
    await remotion(['render', ENTRY, COMP, out, '--frames=165-524', `--concurrency=${concurrency}`, '--crf=16', `--props=${props}`, '--timeout=180000', '--log=error']);
    qc(out);
    break;
  }
  case 'preview': {
    sync();
    const out = nextVersion('atlas_reel_preview', 'mp4');
    await remotion(['render', ENTRY, COMP, out, '--scale=0.5', `--concurrency=${concurrency}`, '--crf=22', `--props=${props}`, '--timeout=180000', '--log=error']);
    qc(out);
    break;
  }
  case 'still': {
    sync();
    const dir = join(OUT, 'stills');
    mkdirSync(dir, { recursive: true });
    for (const s of positional.length ? positional : ['7', '12.9', '15']) {
      const f = Math.round(Number(s) * FPS);
      await remotion(['still', ENTRY, COMP, join(dir, `reel-${String(s).replace('.', '_')}s.jpg`), `--frame=${f}`, `--props=${props}`, '--log=error']);
    }
    break;
  }
  case 'shotlist':
    shotlistDoc();
    break;
  case 'qc':
    qc(positional[0] ? resolve(positional[0]) : null);
    break;
  default:
    console.log('usage: reel.mjs sync | shotlist | studio | tests | preview | still <s…> | qc <file>   [--guides] [--concurrency N] [--force]');
}
