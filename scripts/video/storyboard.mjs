/**
 * Writes the documentary's storyboard from its timeline.
 *
 *   npm run video:storyboard      → storyboard/shots.yaml
 *
 * The timeline (video/src/films/doc.mjs) is the source of truth; this file
 * is its readable form, with every production field per shot and the
 * narration that plays over it. Regenerate it after changing the timeline.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT } from './stage.mjs';
import { DURATION, FILM, FPS, HEIGHT, SHOTS, SITE_URL, TITLE, VOICE, WIDTH } from '../../video/src/timeline.mjs';

/** A small YAML writer: enough for plain data (strings, numbers, booleans, arrays, objects). */
export function toYaml(value, indent = 0) {
  const pad = ' '.repeat(indent);
  const scalar = (v) => {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    const str = String(v);
    return /^[\w .,/()'’—–-]+$/.test(str) && !/^(true|false|null|yes|no|\d)/i.test(str) && !str.includes(': ') ? str : JSON.stringify(str);
  };
  if (Array.isArray(value)) {
    if (!value.length) return '[]';
    return value
      .map((v) => {
        if (v && typeof v === 'object') {
          const inner = toYaml(v, indent + 2).trimStart();
          return `${pad}- ${inner}`;
        }
        return `${pad}- ${scalar(v)}`;
      })
      .join('\n');
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).filter((k) => value[k] !== undefined);
    if (!keys.length) return '{}';
    return keys
      .map((k) => {
        const v = value[k];
        if (v && typeof v === 'object' && (Array.isArray(v) ? v.length : Object.keys(v).length)) return `${pad}${k}:\n${toYaml(v, indent + 2)}`;
        return `${pad}${k}: ${Array.isArray(v) ? '[]' : v && typeof v === 'object' ? '{}' : scalar(v)}`;
      })
      .join('\n');
  }
  return pad + scalar(value);
}

export async function writeStoryboard() {
  const shots = SHOTS.map((s) => {
    const x = /** @type {any} */ (s);
    const narration = VOICE.filter((v) => v.at >= s.start && v.at < s.end).map((v) => ({ id: v.id, at: Number(v.at.toFixed(2)), text: v.text, ...(v.claim ? { source: `${v.claim.species ?? v.claim.programme ?? 'dataset'} · ${v.claim.field}` } : {}) }));
    return {
      id: s.id,
      sequence: s.seq,
      start: Number(s.start.toFixed(3)),
      duration: Number((s.end - s.start).toFixed(3)),
      title: s.title,
      narration,
      visual: x.visual,
      camera: s.camera,
      threeD: x.threeD,
      motionGraphics: x.motionGraphics,
      typography: x.typography,
      vfx: x.vfx,
      soundEffects: s.sound,
      music: x.music,
      transition: s.transitionIn.type + (s.transitionIn.duration ? ` ${s.transitionIn.duration}s` : ''),
      dataSource: x.dataSource,
      assetRequirements: s.assets,
      websiteIntegration: x.website,
      render: x.remap ? `promo footage ${x.remap.from}–${x.remap.to} s${x.overlay ? ` + ${x.overlay.join(', ')}` : ''}` : `scene ${s.scene}${x.overlay ? ` + ${x.overlay.join(', ')}` : ''}`,
      layers: s.layers.map((l) => `${l.provenance}: ${l.name} (${l.source})`),
      ...(s.slot ? { footageSlot: `video/public/${s.slot}` } : {}),
    };
  });
  const doc = {
    title: TITLE,
    film: FILM,
    format: `${WIDTH}x${HEIGHT} @ ${FPS} fps`,
    duration: Number(DURATION.toFixed(2)),
    website: SITE_URL,
    note: 'Generated from video/src/films/doc.mjs by npm run video:storyboard. Edit the timeline, not this file.',
    shots,
  };
  const dir = join(ROOT, 'storyboard');
  await mkdir(dir, { recursive: true });
  const file = join(dir, FILM === 'doc' ? 'shots.yaml' : `shots-${FILM}.yaml`);
  await writeFile(file, `# ${TITLE} — storyboard\n${toYaml(doc)}\n`);
  console.log(`✓ ${shots.length} shots → ${file}`);
}
