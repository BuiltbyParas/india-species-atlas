import type { DistributionPoint } from '../../types';
import { project, smoothPath } from '../india';

/**
 * The geometry of every line the atlas draws between places.
 *
 * Kept apart from any component so the documentary, the species scenes, the
 * conservation chapter, the route-line progress and the finale all join
 * places the same way — and so a later view (a species page, the explorer)
 * can draw the same thread without importing a component to get it.
 */

export type Pt = [number, number];

/**
 * A thread is only drawn between localities in the same landscape. Two
 * populations further apart than this (in degrees) are left unjoined, because
 * a line between them would read as a corridor the data does not record.
 */
export const MAX_JOIN_DEG = 5;

/** Order localities into a chain that starts at the anchor and takes the nearest next. */
export function chain(points: DistributionPoint[]): DistributionPoint[] {
  if (points.length < 3) return points;
  const rest = points.slice(1);
  const out = [points[0]];
  while (rest.length) {
    const last = out[out.length - 1];
    let best = 0;
    let bestD = Infinity;
    rest.forEach((p, i) => {
      const d = (p.lat - last.lat) ** 2 + (p.lng - last.lng) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    out.push(rest.splice(best, 1)[0]);
  }
  return out;
}

/** The chained localities, cut wherever two consecutive ones are too far apart to join. */
export function threadRuns(points: DistributionPoint[]): DistributionPoint[][] {
  const runs: DistributionPoint[][] = [];
  let run: DistributionPoint[] = [];
  for (const p of chain(points)) {
    const last = run[run.length - 1];
    if (last && Math.hypot(p.lat - last.lat, p.lng - last.lng) > MAX_JOIN_DEG) {
      runs.push(run);
      run = [];
    }
    run.push(p);
  }
  runs.push(run);
  return runs.filter((r) => r.length > 1);
}

/** The drawn thread through a species' localities: one subpath per run. */
export function threadPath(points: DistributionPoint[]): string {
  return threadRuns(points)
    .map((r) => smoothPath(r.map((p) => project(p.lng, p.lat))))
    .join('');
}

/**
 * A leg from `a` to `b` that bows to one side, so a hop between two places
 * reads as a drawn line rather than a ruler stroke. `bow` is the sideways
 * offset of the midpoint as a fraction of the leg's length (negative bows the
 * other way); `max` caps it in map units.
 */
export function bowedLeg(a: Pt, b: Pt, bow: number, { max = Infinity, tension = 0.8 } = {}): string {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const off = Math.sign(bow) * Math.min(Math.abs(bow) * len, max);
  // The unit normal to the leg.
  const nx = -dy / len;
  const ny = dx / len;
  const mid: Pt = [(a[0] + b[0]) / 2 + nx * off, (a[1] + b[1]) / 2 + ny * off];
  return smoothPath([a, mid, b], tension);
}

/** Whether a path is one continuous stroke (one subpath), which a nib can follow. */
export function isSingleRun(d: string): boolean {
  return (d.match(/M/g) ?? []).length === 1;
}
