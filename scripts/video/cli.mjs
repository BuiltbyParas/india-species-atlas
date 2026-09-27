#!/usr/bin/env node
/**
 * Lines on the Map — the promotional film's render commands.
 *
 *   npm run video:dev                    open the stage with a player (localhost:4455)
 *   npm run video:still -- 3.2 12.5      single frames as PNG, for checking a moment
 *   npm run video:shot -- S03 [S04 …]    one or more shots at 1080p60
 *   npm run video:sequence -- tiger      one sequence at 1080p60
 *   npm run video:preview                the whole film, half size at 30 fps
 *   npm run video:render                 the whole film at 1080p60 → exports/…_MASTER.mp4
 *   npm run video:render:final           QC, audio, master, web, subtitles, thumbnail, report
 *   npm run video:qc                     checks only
 *   npm run video:audio                  narration, score, sound design and the mix
 *
 * Common options: --draft (half size, 30 fps), --force (ignore the shot
 * cache), --url <stage> (use a running stage instead of starting one).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { openStage, startServer, grabFrame } from './stage.mjs';
import { CACHE, EXPORTS, assemble, partsFor, pickH264, renderShots, writeLog } from './render.mjs';
import { DURATION, SEQUENCES, SHOTS } from '../../video/src/timeline.mjs';

const argv = process.argv.slice(2);
const cmd = argv[0];
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const opt = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const positional = argv.slice(1).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--url');

const MIX = join(CACHE, 'audio', 'mix.wav');
const NAME = 'Lines_on_the_Map_PROMO';

function settings({ draft }) {
  return draft
    ? { scale: 0.5, fps: 30, format: 'jpeg', quality: 0.9, width: 960, height: 540 }
    : { scale: 1, fps: 60, format: flags.has('--png') ? 'png' : 'jpeg', quality: 0.95, width: 1920, height: 1080 };
}

async function withStage(scale, fn) {
  const server = await startServer(opt('url'));
  let stage;
  try {
    stage = await openStage(server.url, { scale });
    console.log(`› stage ${server.url} · ${stage.renderer}${stage.gpu ? '' : ' (software fallback)'}`);
    return await fn(stage);
  } finally {
    await stage?.browser.close();
    server.stop();
  }
}

async function renderSpan(shots, label, out, { draft = flags.has('--draft') } = {}) {
  const s = settings({ draft });
  const from = shots[0].start;
  const to = shots[shots.length - 1].end;
  return withStage(s.scale, async (stage) => {
    const records = await renderShots(stage.page, shots, { ...s, force: flags.has('--force') });
    await writeLog(`render-${label}.json`, { label, settings: s, renderer: stage.renderer, gpu: stage.gpu, pageErrors: stage.errors, records });
    const failed = records.filter((r) => r.error);
    if (failed.length) throw new Error(`failed shots: ${failed.map((r) => r.id).join(', ')}`);
    const enc = await pickH264();
    await assemble({
      parts: partsFor(records, from, to), from, to, fps: s.fps, width: s.width, height: s.height,
      audio: MIX, outputs: [{ file: out, args: draft ? enc.draft : enc.master, grain: draft ? 3 : 5 }],
    });
    console.log(`✓ ${out}${existsSync(MIX) ? '' : '  (no mix yet — silent track; run video:audio)'}`);
    return records;
  });
}

async function main() {
  switch (cmd) {
    case 'still': {
      const times = positional.map(Number).filter((n) => Number.isFinite(n));
      if (!times.length) throw new Error('usage: video:still -- <seconds> [seconds …]');
      const dir = join(EXPORTS, 'stills');
      await mkdir(dir, { recursive: true });
      await withStage(flags.has('--draft') ? 0.5 : 1, async ({ page, errors }) => {
        for (const t of times) {
          const file = join(dir, `t${t.toFixed(2).padStart(6, '0')}.png`);
          await writeFile(file, await grabFrame(page, t, 'png'));
          console.log(file);
        }
        if (errors.length) console.log('page errors:\n  ' + errors.join('\n  '));
      });
      break;
    }
    case 'shot': {
      const ids = positional.map((s) => s.toUpperCase());
      const shots = SHOTS.filter((s) => ids.includes(s.id));
      if (!shots.length) throw new Error(`usage: video:shot -- S01 [S02 …]  (known: ${SHOTS.map((s) => s.id).join(' ')})`);
      for (const shot of shots) await renderSpan([shot], shot.id, join(EXPORTS, 'shots', `${shot.id}.mp4`));
      break;
    }
    case 'sequence': {
      const name = positional[0];
      const shots = SHOTS.filter((s) => s.seq === name);
      if (!shots.length) throw new Error(`usage: video:sequence -- <name>  (known: ${SEQUENCES.join(', ')})`);
      await renderSpan(shots, name, join(EXPORTS, 'sequences', `${name}.mp4`));
      break;
    }
    case 'preview': {
      await renderSpan(SHOTS, 'preview', join(EXPORTS, 'preview', `${NAME}_PREVIEW.mp4`), { draft: true });
      break;
    }
    case 'render': {
      await renderSpan(SHOTS, 'master', join(EXPORTS, `${NAME}_MASTER.mp4`), { draft: false });
      break;
    }
    case 'final': {
      const { final } = await import('./final.mjs');
      await final({ flags, url: opt('url') });
      break;
    }
    case 'qc': {
      const { qc } = await import('./qc.mjs');
      const r = await qc({ url: opt('url'), stage: !flags.has('--static') });
      process.exitCode = r.ok ? 0 : 1;
      break;
    }
    case 'audio': {
      const { buildAudio } = await import('./audio/index.mjs');
      await buildAudio({ force: flags.has('--force') });
      break;
    }
    default:
      console.log('commands: still, shot, sequence, preview, render, final, qc, audio');
      console.log(`film: ${DURATION}s, ${SHOTS.length} shots, sequences: ${SEQUENCES.join(', ')}`);
  }
}

main().catch((e) => {
  console.error(`✗ ${e.message ?? e}`);
  process.exit(1);
});
