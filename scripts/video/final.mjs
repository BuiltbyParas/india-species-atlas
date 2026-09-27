/**
 * The delivery render: QC, audio, every shot at 1080p60 from lossless
 * frames, then the master, the web versions, subtitles, thumbnail, shot
 * manifest, credits and the production report, all into exports/.
 */
import { execFile } from 'node:child_process';
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { toYaml } from './storyboard.mjs';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { grabFrame, openStage, startServer } from './stage.mjs';
import { CACHE, EXPORTS, assemble, partsFor, pickH264, renderShots, run as sh, writeLog } from './render.mjs';
import { qc } from './qc.mjs';
import { buildAudio } from './audio/index.mjs';
import { CREDITS, CUES, DURATION, EXPORT, FEATURED, FILM, FPS, HEIGHT, SHOTS, SITE_URL, SUBTITLE, TITLE, VOICE, WIDTH } from '../../video/src/timeline.mjs';

const run = promisify(execFile);
const NAME = EXPORT.name;
const DIR = join(EXPORTS, '..', EXPORT.dir);
const OUT = {
  master: join(DIR, `${NAME}_MASTER.mp4`),
  web: join(DIR, `${NAME}_WEB.mp4`),
  av1: join(DIR, `${NAME}_WEB_AV1.mp4`),
  srt: join(DIR, `${NAME}_SUBTITLES.srt`),
  thumb: join(DIR, `${NAME}_THUMBNAIL.png`),
  manifest: join(DIR, 'SHOT_MANIFEST.md'),
  manifestJson: join(DIR, 'SHOT_MANIFEST.json'),
  manifestYaml: join(DIR, 'SHOT_MANIFEST.yaml'),
  credits: join(DIR, 'CREDITS.md'),
  report: join(DIR, 'PRODUCTION_REPORT.md'),
};

const tc = (t) => {
  const f = Math.round(t * FPS);
  const s = Math.floor(f / FPS);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}:${String(f % FPS).padStart(2, '0')}`;
};

async function probe(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size,bit_rate:stream=codec_type,codec_name,profile,width,height,r_frame_rate,sample_rate,channels,pix_fmt', '-of', 'json', file]);
  return JSON.parse(stdout);
}

function mdTable(rows) {
  const head = rows[0];
  return [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.slice(1).map((r) => `| ${r.join(' | ')} |`)].join('\n');
}

export async function final({ flags, url }) {
  const started = Date.now();
  await mkdir(DIR, { recursive: true });
  console.log(`› film: ${FILM}`);
  console.log('› QC');
  const check = await qc({ url });
  if (!check.ok && !flags.has('--force-qc')) throw new Error('QC failed — fix the errors above (or pass --force-qc to render anyway)');

  console.log('\n› audio');
  const audio = await buildAudio({});

  console.log('\n› picture (1080p60, lossless frames)');
  const settings = { scale: 1, fps: FPS, format: 'png', quality: 1, width: WIDTH, height: HEIGHT };
  const server = await startServer(url);
  let stage;
  let records;
  let stageInfo;
  try {
    stage = await openStage(server.url, { scale: 1 });
    records = await renderShots(stage.page, SHOTS, { ...settings, force: flags.has('--force') });
    stageInfo = { renderer: stage.renderer, gpu: stage.gpu, pageErrors: stage.errors };
    // Thumbnail: the title, fully resolved, straight from the stage (no grain).
    await writeFile(OUT.thumb, await grabFrame(stage.page, FILM === 'doc' ? CUES.endcard + 6.0 : CUES.cta + 1.6, 'png'));
  } finally {
    await stage?.browser.close();
    server.stop();
  }
  await writeLog('render-final.json', { settings, ...stageInfo, records });
  const failed = records.filter((r) => r.error);
  if (failed.length) throw new Error(`failed shots: ${failed.map((r) => r.id).join(', ')}`);

  console.log('› master and web');
  const enc = await pickH264();
  await assemble({
    parts: partsFor(records, 0, DURATION), from: 0, to: DURATION, fps: FPS, audio: join(CACHE, 'audio', 'mix.wav'),
    outputs: [
      { file: OUT.master, args: enc.master, grain: 5, audioBitrate: '320k' },
      { file: OUT.web, args: enc.web, grain: 3.5, audioBitrate: '192k' },
    ],
  });
  console.log('› AV1 web version');
  await sh('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', OUT.master, '-c:v', 'libsvtav1', '-crf', '30', '-preset', '6', '-pix_fmt', 'yuv420p', '-c:a', 'libopus', '-b:a', '160k', '-movflags', '+faststart', OUT.av1]);
  await copyFile(join(CACHE, 'audio', 'captions.srt'), OUT.srt);

  console.log('› manifest, credits, report');
  await writeManifest(records);
  await writeCredits();
  await writeReport({ check, audio, records, stageInfo, seconds: (Date.now() - started) / 1000, enc });
  console.log(`\n✓ exports/ written in ${((Date.now() - started) / 60000).toFixed(1)} min`);
}

async function writeManifest(records) {
  const byId = new Map(records.map((r) => [r.id, r]));
  const json = SHOTS.map((s) => {
    const lines = VOICE.filter((v) => v.at >= s.start && v.at < s.end).map((v) => ({ id: v.id, at: v.at, text: v.text }));
    const slot = s.slot ? { path: s.slot, status: existsSync(join(EXPORTS, '..', 'video/public', s.slot)) ? 'footage' : 'illustration (slot empty)' } : null;
    const x = /** @type {any} */ (s);
    return {
      id: s.id, sequence: s.seq, start: s.start, end: s.end, duration: Number((s.end - s.start).toFixed(3)), timecode: `${tc(s.start)}–${tc(s.end)}`, frames: Math.round((s.end - s.start) * FPS),
      scene: s.scene, ...(x.remap ? { footage: `promo ${x.remap.from}–${x.remap.to} s${x.remap.ease ? `, ramp ${x.remap.ease}` : ''}` } : {}), overlay: x.overlay ?? [],
      title: s.title, visual: x.visual, camera: s.camera, threeD: x.threeD, motionGraphics: x.motionGraphics, typography: x.typography, vfx: x.vfx,
      sound: s.sound, music: x.music, transitionIn: s.transitionIn, dataSource: x.dataSource, website: x.website,
      layers: s.layers, assets: s.assets, narration: lines, footageSlot: slot, render: { hash: byId.get(s.id)?.hash, cached: byId.get(s.id)?.cached },
    };
  });
  const manifest = { title: TITLE, film: FILM, fps: FPS, width: WIDTH, height: HEIGHT, duration: DURATION, shots: json };
  await writeFile(OUT.manifestJson, JSON.stringify(manifest, null, 2));
  await writeFile(OUT.manifestYaml, toYaml(manifest));
  const md = [
    `# ${TITLE} — shot manifest`,
    '',
    `${SHOTS.length} shots · ${DURATION} s · ${WIDTH}×${HEIGHT} · ${FPS} fps. Every layer is marked **real** (from a cited dataset) or *illustrative* (a drawing device, labelled on screen where it could be mistaken for data).`,
    '',
    ...json.map((s) => [
      `## ${s.id} · ${s.title}`,
      '',
      `\`${s.timecode}\` · ${s.frames} frames · sequence **${s.sequence}** · scene \`${s.scene}\` · in: ${s.transitionIn.type}${s.transitionIn.duration ? ` ${s.transitionIn.duration}s` : ''}`,
      '',
      `Camera: ${s.camera}`,
      '',
      s.layers.length ? s.layers.map((l) => `- ${l.provenance === 'real' ? '**real**' : '*illustrative*'} — ${l.name} (${l.source})`).join('\n') : '- (type only)',
      '',
      `Assets: ${[...new Set(s.assets)].map((a) => `\`${a}\``).join(', ') || '—'}`,
      '',
      `Sound: ${s.sound.join(', ') || '—'}${s.narration.length ? ` · Narration: ${s.narration.map((n) => `${n.id} “${n.text}”`).join(' ')}` : ''}`,
      s.footageSlot ? `\nFootage slot: \`video/public/${s.footageSlot.path}\` — ${s.footageSlot.status}` : '',
      '',
    ].join('\n')),
  ].join('\n');
  await writeFile(OUT.manifest, md);
}

async function writeCredits() {
  const photos = JSON.parse(await readFile(join(EXPORTS, '..', 'video/public/species/photos.json'), 'utf8'));
  const md = [
    `# ${TITLE} — credits`,
    '',
    `*${SUBTITLE}.* A film for the India Species Atlas (${SITE_URL}).`,
    '',
    '## Research and data',
    '',
    'Species, IUCN categories, localities and threats are taken from the India Species Atlas dataset (`src/data/species.ts`), which cites its sources per species. The narration lines that make factual claims are checked against that dataset automatically before every render.',
    '',
    '## Geography',
    '',
    ...CREDITS.geography.map((g) => `- ${g}`),
    '',
    '## Photographs',
    '',
    ...photos.map((p) => `- ${p.id}: ${p.artist}, ${p.licence}${p.licenceUrl ? ` (${p.licenceUrl})` : ''}, ${p.source}. Cropped and colour-graded for the film.`),
    '',
    '## Illustration and disclosure',
    '',
    ...CREDITS.illustration.map((g) => `- ${g}`),
    '- No AI-generated video or imagery is used. No footage has been added to the slots yet.',
    ...(CREDITS.site ? ['', '## The website', '', `- ${CREDITS.site}`] : []),
    '',
    '## Narration',
    '',
    `- ${CREDITS.voice}`,
    '',
    '## Music and sound',
    '',
    `- ${CREDITS.music}`,
    '',
    '## Software',
    '',
    `- ${CREDITS.software}`,
    '',
    'Visual design follows the India Species Atlas: its palette, its typefaces (Newsreader and Geist, SIL Open Font License) and its map conventions.',
    '',
  ].join('\n');
  await writeFile(OUT.credits, md);
}

async function writeReport({ check, audio, records, stageInfo, seconds, enc }) {
  const files = [];
  for (const [label, f] of [['Master', OUT.master], ['Web (H.264)', OUT.web], ['Web (AV1)', OUT.av1]]) {
    const p = await probe(f);
    const v = p.streams.find((s) => s.codec_type === 'video');
    const a = p.streams.find((s) => s.codec_type === 'audio');
    files.push([label, `\`${f.split('/').pop()}\``, `${v.codec_name} ${v.profile ?? ''} ${v.width}×${v.height} @ ${v.r_frame_rate.replace('/1', '')} fps`, `${a.codec_name} ${a.sample_rate / 1000} kHz ${a.channels}ch`, `${Number(p.format.duration).toFixed(2)} s`, `${(Number(p.format.size) / 1e6).toFixed(1)} MB`, `${(Number(p.format.bit_rate) / 1e6).toFixed(1)} Mb/s`]);
  }
  const thumb = await stat(OUT.thumb);
  const assets = [...new Set(SHOTS.flatMap((s) => s.assets))];
  const missingAssets = assets.filter((a) => !existsSync(a.startsWith('../') ? join(EXPORTS, '..', 'video', a) : join(EXPORTS, '..', 'video/public', a)));
  const warnings = check.sections.flatMap((s) => s.checks.filter((c) => c.level === 'warn').map((c) => `${s.name}: ${c.name}${c.detail ? ` — ${c.detail}` : ''}`));
  const renderedNow = records.filter((r) => !r.cached);
  const md = [
    `# Production report — ${TITLE}`,
    '',
    `Generated ${new Date().toISOString()} by \`npm run video:render:final\` in ${(seconds / 60).toFixed(1)} min.`,
    '',
    '## Summary',
    '',
    mdTable([
      ['Item', 'Value'],
      ['Total duration', `${DURATION.toFixed(2)} s (${tc(DURATION)})`],
      ['Resolution', `${WIDTH}×${HEIGHT}`],
      ['Frame rate', `${FPS} fps (${Math.round(DURATION * FPS)} frames)`],
      ['Shots', `${SHOTS.length} in ${new Set(SHOTS.map((s) => s.seq)).size} sequences`],
      ['Species', FEATURED.join(', ')],
      ['Narration', `${VOICE.length} lines, ${VOICE.reduce((n, v) => n + v.text.split(/\s+/).length, 0)} words, ${audio.voice.engine}`],
      ['QC', `${check.ok ? 'passed' : 'FAILED'}: ${check.passed} passed, ${check.warnings} warnings, ${check.errors} errors`],
      ['Failed shots', records.filter((r) => r.error).map((r) => r.id).join(', ') || 'none'],
      ['Missing assets', missingAssets.join(', ') || 'none'],
      ['Renderer', `${stageInfo.renderer}${stageInfo.gpu ? '' : ' (software fallback)'}`],
      ['H.264 encoder', enc.name],
    ]),
    '',
    '## Deliverables',
    '',
    mdTable([['', 'File', 'Video', 'Audio', 'Duration', 'Size', 'Bitrate'], ...files]),
    '',
    `Also: \`${OUT.srt.split('/').pop()}\` (captions), \`${OUT.thumb.split('/').pop()}\` (${(thumb.size / 1024).toFixed(0)} KB, 1920×1080), \`SHOT_MANIFEST.yaml/md/json\`, \`CREDITS.md\`.`,
    '',
    '## Audio',
    '',
    mdTable([
      ['Track', 'Source', 'Measured', 'Gain into mix'],
      ['Voice', audio.voice.engine, `${audio.stems.voice.measuredLUFS} LUFS`, `${audio.stems.voice.gainDb} dB`],
      ['Music', audio.music.source, `${audio.stems.music.measuredLUFS} LUFS`, `${audio.stems.music.gainDb} dB (ducked under voice)`],
      ['Ambience', 'synthesised for the film', `${audio.stems.ambience.measuredLUFS} LUFS`, `${audio.stems.ambience.gainDb} dB (ducked)`],
      ['Effects', 'synthesised for the film', `${audio.stems.sfx.measuredLUFS} LUFS`, `${audio.stems.sfx.gainDb} dB`],
      ['Mix', 'EQ, de-ess, compression, sidechain ducking, two-pass loudness normalisation', `${audio.mix.integratedLUFS} LUFS, ${audio.mix.truePeak} dBTP, LRA ${audio.mix.lra}`, '—'],
    ]),
    '',
    '## Shots',
    '',
    mdTable([
      ['Shot', 'Timecode', 'Frames', 'Scene', 'Layers', 'Render'],
      ...SHOTS.map((s) => {
        const r = records.find((x) => x.id === s.id);
        const real = s.layers.filter((l) => l.provenance === 'real').length;
        const ill = s.layers.length - real;
        return [s.id, `${tc(s.start)}–${tc(s.end)}`, String(Math.round((s.end - s.start) * FPS)), `\`${s.scene}\``, `${real} real, ${ill} illustrative`, r?.error ? `FAILED: ${r.error.slice(0, 60)}` : r?.cached ? 'cached' : `${r.frames} frames in ${r.seconds.toFixed(0)} s`];
      }),
    ]),
    '',
    `Rendered this run: ${renderedNow.length} shots; reused from cache: ${records.length - renderedNow.length}.`,
    '',
    '## Data sources',
    '',
    mdTable([['Layer', 'Provenance', 'Source'], ...[...new Map(SHOTS.flatMap((s) => s.layers).map((l) => [l.name, l])).values()].map((l) => [l.name, l.provenance, l.source])]),
    '',
    `Narration: ${VOICE.filter((v) => v.claim).length} factual lines, each checked against its dataset field before the render (see QC: Stage).`,
    '',
    '## Assets used',
    '',
    ...assets.map((a) => `- \`${a}\``),
    '',
    '## Footage slots',
    '',
    ...SHOTS.filter((s) => s.slot).map((s) => `- ${s.id} \`video/public/${s.slot}\` — ${existsSync(join(EXPORTS, '..', 'video/public', s.slot)) ? 'footage in use' : 'empty; the drawn illustration is used'}`),
    '',
    '## Warnings',
    '',
    ...(warnings.length ? warnings.map((w) => `- ${w}`) : ['- none']),
    ...(stageInfo.pageErrors.length ? ['', '### Page errors during render', '', ...stageInfo.pageErrors.map((e) => `- ${e}`)] : []),
    '',
    '## QC detail',
    '',
    ...check.sections.map((s) => `- **${s.name}**: ${s.checks.filter((c) => c.level === 'ok').length}/${s.checks.length} ok${s.checks.some((c) => c.level !== 'ok') ? ` — ${s.checks.filter((c) => c.level !== 'ok').map((c) => `${c.level}: ${c.name}`).join('; ')}` : ''}`),
    '',
  ].join('\n');
  await writeFile(OUT.report, md);
}
