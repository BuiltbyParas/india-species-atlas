import type { Species } from '../types';

/**
 * How many atlas species occur in each state, for the map's density shading.
 *
 * The count is of species, not of mapped points: a species with four pins in
 * Assam counts once there. That is the honest unit — the pins are indicative
 * locations chosen for illustration, so counting them would shade a state by
 * how much attention this atlas paid to it rather than by what lives there.
 */

/**
 * `public/india-states.geojson` predates the 2019 reorganisation of Jammu &
 * Kashmir, so it has no Ladakh polygon. Records for Ladakh are therefore drawn
 * on the old Jammu and Kashmir shape, and the legend says so — silently
 * dropping them would understate the Himalayan states instead.
 */
export const GEOJSON_STATE_ALIASES: Record<string, string> = {
  Ladakh: 'Jammu and Kashmir',
};

export function countSpeciesByState(results: Species[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const s of results) {
    // A species listed for both Ladakh and Jammu and Kashmir must not be
    // counted twice on the one polygon they share.
    const drawn = new Set(s.states.map((st) => GEOJSON_STATE_ALIASES[st] ?? st));
    for (const st of drawn) counts.set(st, (counts.get(st) ?? 0) + 1);
  }
  return counts;
}

/** The shading ramp: five steps, lightest for one species, darkest for the most. */
export const DENSITY_STEPS = 5;

export function densityStep(count: number, max: number): number {
  if (count <= 0) return 0;
  if (max <= 1) return DENSITY_STEPS;
  return Math.max(1, Math.ceil((count / max) * DENSITY_STEPS));
}

/** Fill opacity per step. One hue, increasing weight — never hue alone. */
export function densityOpacity(step: number): number {
  return [0, 0.14, 0.26, 0.4, 0.55, 0.72][step] ?? 0;
}
