import { spawn } from 'node:child_process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import {
  CAPTION_FADE,
  FPS,
  MUSIC_GAIN,
  TAIL_FADE,
  TRANSITION,
  VIDEO,
} from './config.mjs';

const run = promisify(execFile);

/**
 * Picks the best H.264 encoder this ffmpeg actually has.
 *
 * Distributions that ship a patent-clean ffmpeg (Fedora's is one) have no
 * libx264 at all, so the pipeline cannot assume it; libopenh264 is the
 * fallback that is always present in those builds, and the VAAPI encoder is
 * preferred over it when the machine has a usable render node.
 */
export async function pickEncoder() {
  const { stdout } = await run('ffmpeg', ['-hide_banner', '-encoders']);
  const has = (name) => new RegExp(`\\b${name}\\b`).test(stdout);
  if (has('libx264')) {
    return { name: 'libx264', args: ['-c:v', 'libx264', '-preset', 'slow', '-crf', '19'] };
  }
  if (has('libopenh264')) {
    return {
      name: 'libopenh264',
      args: [
        '-c:v', 'libopenh264',
        '-profile:v', 'high',
        '-b:v', '10M',
        '-maxrate', '12M',
        '-bufsize', '20M',
      ],
    };
  }
  throw new Error('no usable H.264 encoder in this ffmpeg build');
}

const fmt = (n) => Number(n.toFixed(3));

/**
 * Lays the shots end to end with a cross-dissolve at each join.
 *
 * A dissolve eats `TRANSITION` seconds of the running time at every join, so
 * the offset each one is applied at has to be tracked as the chain is built
 * rather than derived from the shot's own start time.
 */
function buildVideoChain(shots, labels) {
  const filters = [];
  let current = labels[0];
  let running = shots[0].seconds;
  for (let i = 1; i < shots.length; i++) {
    const out = `x${i}`;
    filters.push(
      `[${current}][${labels[i]}]xfade=transition=fade:duration=${fmt(TRANSITION)}:` +
        `offset=${fmt(running - TRANSITION)}[${out}]`,
    );
    running += shots[i].seconds - TRANSITION;
    current = out;
  }
  return { filters, label: current, total: running };
}

/**
 * Renders the finished video.
 *
 * @param {object} plan
 * @param {Array}  plan.shots     `{ id, frames, seconds, start, still? }`
 * @param {Array}  plan.captions  `{ file, start, seconds }`, absolute times
 * @param {Array}  plan.narration `{ file, start }`, absolute times
 */
export async function render(plan) {
  const { shots, captions, narration, music, framesDir, outFile, encoder } = plan;

  const inputs = [];
  const labels = [];
  const filters = [];

  for (const [i, shot] of shots.entries()) {
    if (shot.still) {
      inputs.push(
        '-loop', '1',
        '-framerate', String(FPS),
        '-t', String(fmt(shot.seconds)),
        '-i', shot.still,
      );
    } else {
      inputs.push(
        '-framerate', String(FPS),
        '-start_number', '0',
        // Bounded explicitly: the image demuxer would otherwise read every
        // frame in the directory, and one segment running long moves every
        // cross-dissolve after it.
        '-t', String(fmt(shot.seconds)),
        '-i', join(framesDir, shot.id, '%05d.jpg'),
      );
    }
    const label = `v${i}`;
    filters.push(
      `[${i}:v]fps=${FPS},scale=${VIDEO.width}:${VIDEO.height},setsar=1,` +
        `format=yuv420p,settb=AVTB,setpts=PTS-STARTPTS[${label}]`,
    );
    labels.push(label);
  }

  const chain = buildVideoChain(shots, labels);
  filters.push(...chain.filters);
  const total = chain.total;

  // Captions ride on top of the assembled timeline, each fading itself in and
  // out through its own alpha channel.
  let base = chain.label;
  for (const [i, caption] of captions.entries()) {
    const idx = inputs.filter((a) => a === '-i').length;
    inputs.push('-loop', '1', '-framerate', String(FPS), '-t', String(fmt(total)), '-i', caption.file);
    const end = caption.start + caption.seconds;
    const lbl = `c${i}`;
    filters.push(
      `[${idx}:v]fps=${FPS},format=rgba,` +
        `fade=t=in:st=${fmt(caption.start)}:d=${fmt(CAPTION_FADE)}:alpha=1,` +
        `fade=t=out:st=${fmt(end)}:d=${fmt(CAPTION_FADE)}:alpha=1,settb=AVTB[${lbl}]`,
    );
    const out = `b${i}`;
    filters.push(
      `[${base}][${lbl}]overlay=0:0:format=auto:` +
        `enable='between(t,${fmt(caption.start - 0.1)},${fmt(end + CAPTION_FADE + 0.1)})'[${out}]`,
    );
    base = out;
  }

  filters.push(
    `[${base}]fade=t=out:st=${fmt(total - TAIL_FADE)}:d=${fmt(TAIL_FADE)},format=yuv420p[vout]`,
  );

  // --- audio ---
  const audioLabels = [];
  for (const line of narration) {
    const idx = inputs.filter((a) => a === '-i').length;
    inputs.push('-i', line.file);
    const lbl = `a${audioLabels.length}`;
    filters.push(
      `[${idx}:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,` +
        `adelay=${Math.round(line.start * 1000)}|${Math.round(line.start * 1000)}[${lbl}]`,
    );
    audioLabels.push(lbl);
  }
  if (music) {
    const idx = inputs.filter((a) => a === '-i').length;
    inputs.push('-stream_loop', '-1', '-i', music);
    filters.push(
      `[${idx}:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,` +
        `volume=${MUSIC_GAIN},atrim=0:${fmt(total)},asetpts=PTS-STARTPTS,` +
        `afade=t=in:st=0:d=1.2,afade=t=out:st=${fmt(total - 1.8)}:d=1.8[mus]`,
    );
    audioLabels.push('mus');
  }

  const audioArgs = [];
  if (!audioLabels.length) {
    // A silent track rather than no track at all: some players and uploaders
    // treat a video with no audio stream as malformed.
    inputs.push('-f', 'lavfi', '-t', String(fmt(total)), '-i', 'anullsrc=r=48000:cl=stereo');
    const idx = inputs.filter((a) => a === '-i').length - 1;
    audioArgs.push('-map', `${idx}:a`, '-c:a', 'aac', '-b:a', '96k');
  } else {
    filters.push(
      `${audioLabels.map((l) => `[${l}]`).join('')}` +
        `amix=inputs=${audioLabels.length}:normalize=0:dropout_transition=0,` +
        `apad,atrim=0:${fmt(total)},alimiter=limit=0.95[aout]`,
    );
    audioArgs.push('-map', '[aout]', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2');
  }

  const args = [
    '-hide_banner', '-y',
    ...inputs,
    '-filter_complex', filters.join(';'),
    '-map', '[vout]',
    ...encoder.args,
    '-pix_fmt', 'yuv420p',
    '-r', String(FPS),
    '-t', String(fmt(total)),
    ...audioArgs,
    '-movflags', '+faststart',
    outFile,
  ];

  await ffmpeg(args);
  return { total, outFile };
}

export function ffmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d) => {
      err += d;
      if (err.length > 60_000) err = err.slice(-40_000);
    });
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}\n${err.slice(-4000)}`)),
    );
  });
}
