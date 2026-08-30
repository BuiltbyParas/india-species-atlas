import { SPECIES } from '../data/species';
import { REGIONS } from '../data/regions';
import { HABITAT_LABELS } from '../data/regions';
import { STATUS_INFO, THREATENED_ORDER } from '../data/statusInfo';
import { THREAT_LABELS } from '../data/threats';
import type { HabitatId, IucnStatus, RegionId, ThreatId } from '../types';

/**
 * All headline numbers are computed from the dataset at runtime — nothing
 * is hard-coded. If you add or edit a species, these update automatically.
 */

export const totalSpecies = SPECIES.length;

export function countByStatus(): Record<IucnStatus, number> {
  const out = { CR: 0, EN: 0, VU: 0, NT: 0, LC: 0, DD: 0 } as Record<IucnStatus, number>;
  for (const s of SPECIES) out[s.status] += 1;
  return out;
}

export function statusChartData() {
  const counts = countByStatus();
  return THREATENED_ORDER.map((code) => ({
    code,
    name: STATUS_INFO[code].name,
    value: counts[code],
    color: STATUS_INFO[code].hex,
  }));
}

export function habitatChartData() {
  const counts = new Map<HabitatId, number>();
  for (const s of SPECIES) {
    for (const h of s.habitats) counts.set(h, (counts.get(h) ?? 0) + 1);
  }
  return (Object.keys(HABITAT_LABELS) as HabitatId[])
    .map((h) => ({ id: h, name: HABITAT_LABELS[h], value: counts.get(h) ?? 0 }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function threatChartData() {
  const counts = new Map<ThreatId, number>();
  for (const s of SPECIES) {
    for (const t of s.majorThreats) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([id, value]) => ({ id, name: THREAT_LABELS[id], value }))
    .sort((a, b) => b.value - a.value);
}

export function speciesInRegion(regionId: RegionId) {
  return SPECIES.filter((s) => s.regions.includes(regionId));
}

export function regionsWithSpecies() {
  return REGIONS.filter((r) => speciesInRegion(r.id).length > 0);
}

export const conservationRegionCount = regionsWithSpecies().length;

export function endemicCount() {
  return SPECIES.filter((s) => s.endemicToIndia).length;
}

/** Distinct states/UTs referenced across the dataset. */
export function statesCovered() {
  const set = new Set<string>();
  for (const s of SPECIES) for (const st of s.states) set.add(st);
  return [...set].sort();
}
