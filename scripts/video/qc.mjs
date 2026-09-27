/**
 * Quality control for the film, before anything is rendered for delivery.
 *
 *   npm run video:qc              static checks plus checks inside the stage
 *   npm run video:qc -- --static  static checks only (no browser)
 *
 * Errors fail the final render; warnings are reported and allowed.
 */
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { ROOT, openStage, startServer } from './stage.mjs';
import { CACHE } from './render.mjs';
import { BAR, CREDITS, CUES, DURATION, FILM, FPS, HEIGHT, SHOTS, VOICE, WIDTH } from '../../video/src/timeline.mjs';

/** Each film declares its own acceptable length and narration length. */
const FILM_MODULE = await import(`../../video/src/films/${FILM}.mjs`);
const [MIN_DUR, MAX_DUR] = FILM_MODULE.DURATION_RANGE ?? [55, 70];
const [MIN_WORDS, MAX_WORDS] = FILM_MODULE.WORD_RANGE ?? [0, 130];

const run = promisify(execFile);
const EPS = 1e-6;

function section(name) {
  const checks = [];
  return {
    name,
    checks,
    ok: (n, detail = '') => checks.push({ name: n, level: 'ok', detail }),
    warn: (n, detail = '') => checks.push({ name: n, level: 'warn', detail }),
    err: (n, detail = '') => checks.push({ name: n, level: 'error', detail }),
    check(cond, n, detail = '', level = 'error') {
      checks.push({ name: n, level: cond ? 'ok' : level, detail });
    },
  };
}

const assetPath = (a) => (a.startsWith('../') ? join(ROOT, 'video', a) : join(ROOT, 'video/public', a));

async function probe(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels', '-of', 'json', file]);
  return JSON.parse(stdout);
}

export function timelineChecks() {
  const s = section('Timeline');
  s.check(SHOTS[0].start === 0, 'starts at 0');
  const ids = new Set();
  for (let i = 0; i < SHOTS.length; i++) {
    const shot = SHOTS[i];
    s.check(!ids.has(shot.id), `${shot.id} unique id`);
    ids.add(shot.id);
    const d = shot.end - shot.start;
    s.check(d > 0, `${shot.id} duration`, `${d.toFixed(3)} s`);
    s.check(Math.abs(shot.start * FPS - Math.round(shot.start * FPS)) < EPS, `${shot.id} starts on a frame`, `${shot.start} s × ${FPS}`);
    if (i > 0) {
      const gap = shot.start - SHOTS[i - 1].end;
      if (gap > EPS) s.err(`${shot.id} gap before`, `${gap.toFixed(3)} s`);
      else if (gap < -EPS) s.err(`${shot.id} overlaps previous`, `${(-gap).toFixed(3)} s`);
    }
    const tr = shot.transitionIn;
    if (tr.duration) s.check(tr.duration < d, `${shot.id} transition shorter than shot`, `${tr.duration} s`);
    if (i === 0) s.check(tr.type !== 'dissolve', `${shot.id} does not dissolve from nothing`);
    s.check(Array.isArray(shot.layers) && shot.layers.every((l) => l.provenance === 'real' || l.provenance === 'illustrative'), `${shot.id} layer provenance declared`);
  }
  s.check(DURATION >= MIN_DUR && DURATION <= MAX_DUR, `total duration within ${MIN_DUR}–${MAX_DUR} s`, `${DURATION} s`);
  s.check(WIDTH === 1920 && HEIGHT === 1080 && FPS === 60, 'master format', `${WIDTH}×${HEIGHT} @ ${FPS}`);
  // The promo is cut to the bar; the documentary is cut to the narration.
  if (FILM === 'promo') {
    const offGrid = SHOTS.filter((x) => Math.abs(x.start / BAR - Math.round(x.start / BAR)) > 0.02);
    if (offGrid.length) s.warn('shots off the bar grid', offGrid.map((x) => `${x.id}@${x.start}`).join(', '));
  }
  for (const x of SHOTS) s.check(x.end - x.start >= 1.0, `${x.id} long enough to read`, `${(x.end - x.start).toFixed(2)} s`, 'warn');
  const cueTimes = Object.entries(CUES).flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, x]) : [[k, v]]));
  for (const [k, v] of cueTimes) s.check(v >= 0 && v <= DURATION, `cue ${k} inside film`, `${v} s`);
  if (Array.isArray(CUES.montage)) s.check(CUES.montage.every((v, i, a) => i === 0 || v > a[i - 1]), 'montage cuts ascending');
  return s;
}

export async function narrationChecks() {
  const s = section('Narration');
  const words = VOICE.reduce((n, v) => n + v.text.split(/\s+/).length, 0);
  s.check(words >= MIN_WORDS && words <= MAX_WORDS, `word count ${MIN_WORDS}–${MAX_WORDS}`, `${words} words`);
  s.check(VOICE.every((v, i) => i === 0 || v.at > VOICE[i - 1].at), 'lines in order');
  for (const v of VOICE) s.check(v.at >= 0 && v.at < DURATION, `${v.id} inside film`, `${v.at} s`);
  const report = join(CACHE, 'audio', 'audio.json');
  if (!existsSync(report)) {
    s.err('narration measured', 'no audio build — run npm run video:audio');
    return s;
  }
  const audio = JSON.parse(await readFile(report, 'utf8'));
  const lines = audio.lines;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.end == null) continue;
    const credits = SHOTS.find((x) => x.seq === 'credits');
    s.check(l.end <= (credits ? credits.start : DURATION - 4), `${l.id} ends before the credits`, `${l.end.toFixed(2)} s`);
    if (i + 1 < lines.length) {
      const room = lines[i + 1].at - l.end;
      s.check(room >= 0.15, `${l.id} clears ${lines[i + 1].id}`, `${room.toFixed(2)} s between`);
    }
    const f = VOICE.find((v) => v.id === l.id);
    s.check(f && f.text === l.text, `${l.id} audio matches script`, f && f.text !== l.text ? 'script changed since the audio build' : '');
  }
  return s;
}

export async function assetChecks() {
  const s = section('Assets');
  const all = new Set(SHOTS.flatMap((x) => x.assets));
  for (const a of all) {
    const p = assetPath(a);
    if (!existsSync(p)) s.err(`missing ${a}`, 'run npm run video:data');
    else s.ok(a, `${((await stat(p)).size / 1024).toFixed(0)} KB`);
  }
  // The documentary shows the real website; its screenshots must exist.
  if (FILM === 'doc') {
    const site = join(ROOT, 'video/public/site/site.json');
    s.check(existsSync(site), 'site screenshots captured', existsSync(site) ? JSON.parse(await readFile(site, 'utf8')).captured : 'run npm run video:site');
  }
  for (const f of ['newsreader', 'geist']) s.check(existsSync(join(ROOT, 'video/public/fonts', `${f}-OFL.txt`)), `${f} licence present`);
  const photos = join(ROOT, 'video/public/species/photos.json');
  if (existsSync(photos)) {
    const list = JSON.parse(await readFile(photos, 'utf8'));
    for (const p of list) s.check(Boolean(p.artist && p.licence && p.source), `credit for ${p.id}`, `${p.artist}, ${p.licence}`);
  }
  return s;
}

export async function mapChecks() {
  const s = section('Map data');
  for (const name of ['rivers', 'roads']) {
    const p = join(ROOT, 'video/public/data', `${name}.geojson`);
    if (!existsSync(p)) {
      s.err(`${name}.geojson`, 'missing');
      continue;
    }
    try {
      const fc = JSON.parse(await readFile(p, 'utf8'));
      const coords = fc.features.flatMap((f) => f.geometry.coordinates.flat());
      const bad = coords.filter(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y) || x < 66 || x > 99 || y < 5 || y > 38);
      s.check(fc.features.length > 0 && bad.length === 0, `${name}.geojson valid`, `${fc.features.length} features, ${coords.length} points, ${bad.length} out of bounds`);
    } catch (e) {
      s.err(`${name}.geojson parses`, String(e.message));
    }
  }
  for (const name of ['etopo-india', 'etopo-himalaya']) {
    const meta = join(ROOT, 'video/public/data', `${name}.json`);
    const bin = join(ROOT, 'video/public/data', `${name}.bin`);
    if (!existsSync(meta) || !existsSync(bin)) {
      s.err(name, 'missing');
      continue;
    }
    const m = JSON.parse(await readFile(meta, 'utf8'));
    const size = (await stat(bin)).size;
    s.check(size === m.cols * m.rows * 2, `${name} size matches header`, `${m.cols}×${m.rows}, ${m.min}…${m.max} m`);
  }
  const states = join(ROOT, 'public/india-states.geojson');
  s.check(existsSync(states), 'state boundaries present', 'public/india-states.geojson');
  return s;
}

export async function audioChecks() {
  const s = section('Audio');
  const dir = join(CACHE, 'audio');
  for (const n of ['voice', 'music', 'ambience', 'sfx', 'mix']) {
    const f = join(dir, `${n}.wav`);
    if (!existsSync(f)) {
      s.err(`${n}.wav`, 'missing — run npm run video:audio');
      continue;
    }
    const d = Number((await probe(f)).format.duration);
    s.check(Math.abs(d - DURATION) < 1.1, `${n}.wav length`, `${d.toFixed(2)} s`);
  }
  const report = join(dir, 'audio.json');
  if (existsSync(report)) {
    const a = JSON.parse(await readFile(report, 'utf8'));
    s.check(a.mix.integratedLUFS > -15 && a.mix.integratedLUFS < -13, 'mix loudness near −14 LUFS', `${a.mix.integratedLUFS} LUFS`);
    s.check(a.mix.truePeak <= -1, 'true peak ≤ −1 dBTP', `${a.mix.truePeak} dBTP`);
    // The credits must describe the audio the film actually has.
    s.check(a.voice.source === CREDITS.voiceSource, 'narration credit matches the build', `built: ${a.voice.source}, credited: ${CREDITS.voiceSource}`);
    const music = a.music.source.startsWith('synth') ? 'synthesised' : 'licensed';
    s.check(music === CREDITS.musicSource, 'music credit matches the build', `built: ${music}, credited: ${CREDITS.musicSource}`);
  }
  return s;
}

export async function footageChecks() {
  const s = section('Footage slots');
  const rejectFile = join(ROOT, 'video/public/footage', FILM === 'promo' ? '' : FILM, 'REJECTED.json');
  const rejected = existsSync(rejectFile) ? JSON.parse(await readFile(rejectFile, 'utf8')) : {};
  for (const shot of SHOTS.filter((x) => x.slot)) {
    const p = join(ROOT, 'video/public', shot.slot);
    if (rejected[shot.slot]) s.warn(`${shot.id} ${shot.slot}`, `REJECTED: ${rejected[shot.slot]} — illustration used`);
    else if (existsSync(p)) {
      const info = await probe(p);
      const v = info.streams.find((x) => x.codec_type === 'video');
      const d = Number(info.format.duration);
      s.check(d >= shot.end - shot.start, `${shot.id} footage long enough`, `${d.toFixed(2)} s for ${(shot.end - shot.start).toFixed(2)} s`);
      s.check(v && v.width >= 1920, `${shot.id} footage resolution`, v ? `${v.width}×${v.height}` : 'no video stream', 'warn');
    } else s.ok(`${shot.id} ${shot.slot}`, 'empty — the drawn illustration is used');
  }
  return s;
}

export async function stageChecks(url) {
  const s = section('Stage');
  const server = await startServer(url);
  let stage;
  try {
    stage = await openStage(server.url, { scale: 0.5 });
    s.check(stage.gpu, 'GPU WebGL', stage.renderer, 'warn');
    // Draw a frame from every shot so any scene error surfaces here, not mid-render.
    for (const shot of SHOTS) {
      try {
        await stage.page.evaluate((t) => window.__film.seek(t), (shot.start + shot.end) / 2);
      } catch (e) {
        s.err(`${shot.id} draws`, String(e.message).split('\n')[0]);
      }
    }
    const r = await stage.page.evaluate(() => window.__film.report());
    for (const c of r.checks) s.check(c.ok, c.name, c.detail);
    for (const m of r.missing) s.err('missing on stage', m);
    s.check(r.unresolvedScenes.length === 0, 'every scene built', r.unresolvedScenes.join(', ') || 'all resolved');
    s.check(stage.errors.length === 0, 'no page errors', stage.errors.slice(0, 3).join(' | '));
  } finally {
    await stage?.browser.close();
    server.stop();
  }
  return s;
}

export function summarise(sections) {
  const all = sections.flatMap((s) => s.checks);
  return {
    ok: all.every((c) => c.level !== 'error'),
    errors: all.filter((c) => c.level === 'error').length,
    warnings: all.filter((c) => c.level === 'warn').length,
    passed: all.filter((c) => c.level === 'ok').length,
  };
}

export async function qc({ url, stage = true, quiet = false } = {}) {
  const sections = [timelineChecks(), await narrationChecks(), await assetChecks(), await mapChecks(), await audioChecks(), await footageChecks()];
  if (stage) sections.push(await stageChecks(url));
  const sum = summarise(sections);
  if (!quiet) {
    for (const s of sections) {
      const bad = s.checks.filter((c) => c.level !== 'ok');
      console.log(`${bad.some((c) => c.level === 'error') ? '✗' : bad.length ? '!' : '✓'} ${s.name} (${s.checks.length} checks)`);
      for (const c of bad) console.log(`    ${c.level === 'error' ? 'ERROR' : 'warn '} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
    }
    console.log(`\n${sum.ok ? '✓ QC passed' : '✗ QC failed'}: ${sum.passed} passed, ${sum.warnings} warnings, ${sum.errors} errors`);
  }
  return { ...sum, sections };
}
