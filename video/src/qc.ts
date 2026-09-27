import { FEATURED, SHOTS, VOICE } from './timeline.mjs';
import type { Film } from './engine/film';

/**
 * Checks that can only be made inside the stage, where the fonts, images and
 * data are actually loaded. The render scripts call this before capturing
 * and fold the result into the production report.
 */

export interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

export interface StageReport {
  ok: boolean;
  checks: Check[];
  missing: string[];
  unresolvedScenes: string[];
}

const lower = (s: unknown) => String(s ?? '').toLowerCase();

export function runChecks(film: Film): StageReport {
  const a = film.assets;
  const checks: Check[] = [];
  const add = (name: string, ok: boolean, detail = '') => checks.push({ name, ok, detail });

  for (const family of ['Newsreader', 'Geist']) {
    const faces = [...document.fonts].filter((f) => f.family.replace(/"/g, '') === family);
    add(`font ${family}`, faces.length > 0 && faces.every((f) => f.status === 'loaded'), `${faces.length} face(s)`);
  }

  for (const id of FEATURED) {
    const img = a.photos.get(id);
    add(`photo ${id}`, Boolean(img && img.naturalWidth > 0), img ? `${img.naturalWidth}×${img.naturalHeight}` : 'not loaded');
    add(`photo credit ${id}`, Boolean(a.photoMeta.get(id)?.artist && a.photoMeta.get(id)?.licence), a.photoMeta.get(id)?.licence ?? 'none');
    const s = a.species.get(id);
    add(`species ${id}`, Boolean(s && s.status && s.distributionPoints.length), s ? `${s.status}, ${s.distributionPoints.length} localities` : 'missing');
  }

  add('state boundaries', a.states.length >= 30, `${a.states.length} states/UTs`);
  add('rivers', a.rivers.length > 20, `${a.rivers.length} runs`);
  add('roads', a.roads.length > 50, `${a.roads.length} runs`);
  for (const [name, g] of [['relief india', a.india], ['relief himalaya', a.himalaya]] as const) {
    const sane = Boolean(g && g.max > 7000 && g.max < 8900 && g.min > -11000 && g.data.length === g.cols * g.rows);
    add(name, sane, g ? `${g.cols}×${g.rows}, ${g.min}…${g.max} m` : 'missing');
  }
  if (a.india) {
    const g = a.india;
    const outside = [...a.species.values()].flatMap((s) =>
      s.distributionPoints.filter((p) => p.lng < g.west || p.lng > g.east || p.lat < g.south || p.lat > g.north).map((p) => `${s.id}: ${p.label}`),
    );
    add('localities inside relief', outside.length === 0, outside.join('; ') || 'all inside');
  }
  const badCoords = [...a.rivers, ...a.roads].filter((l) => l.coords.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y) || x < 60 || x > 105 || y < 0 || y > 45));
  add('line coordinates valid', badCoords.length === 0, `${badCoords.length} bad runs`);

  // Every factual narration line must still be what the dataset says.
  for (const v of VOICE) {
    if (!v.claim) continue;
    const s = a.species.get(v.claim.species) as unknown as Record<string, unknown> | undefined;
    const field = lower(s?.[v.claim.field]);
    const absent = v.claim.must.filter((m: string) => !field.includes(m.toLowerCase()));
    add(`claim ${v.id}`, Boolean(s) && absent.length === 0, absent.length ? `not in ${v.claim.species}.${v.claim.field}: ${absent.join(' | ')}` : `${v.claim.species}.${v.claim.field}`);
  }

  for (const s of SHOTS) film.sceneFor(s);
  const unresolvedScenes = [...film.unresolved];

  return {
    ok: checks.every((c) => c.ok) && a.missing.length === 0,
    checks,
    missing: [...a.missing],
    unresolvedScenes,
  };
}
