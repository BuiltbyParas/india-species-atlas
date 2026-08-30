import { useMemo, useState } from 'react';
import { SPECIES } from '../data/species';
import type {
  HabitatId,
  IucnStatus,
  RegionId,
  Species,
  SpeciesFilterState,
} from '../types';

const EMPTY: SpeciesFilterState = {
  query: '',
  statuses: [],
  regions: [],
  habitats: [],
};

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function matches(species: Species, filters: SpeciesFilterState): boolean {
  const { query, statuses, regions, habitats } = filters;

  if (statuses.length && !statuses.includes(species.status)) return false;
  if (regions.length && !regions.some((r) => species.regions.includes(r))) return false;
  if (habitats.length && !habitats.some((h) => species.habitats.includes(h))) return false;

  if (query.trim()) {
    const q = query.trim().toLowerCase();
    const haystack = [
      species.commonName,
      species.scientificName,
      ...species.states,
      ...species.regions,
      species.statusFullName,
      species.summary,
    ]
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  return true;
}

export function useSpeciesFilters(initial?: Partial<SpeciesFilterState>) {
  const [filters, setFilters] = useState<SpeciesFilterState>({ ...EMPTY, ...initial });

  const results = useMemo(
    () => SPECIES.filter((s) => matches(s, filters)),
    [filters],
  );

  const activeCount =
    filters.statuses.length + filters.regions.length + filters.habitats.length + (filters.query.trim() ? 1 : 0);

  return {
    filters,
    results,
    activeCount,
    setQuery: (query: string) => setFilters((f) => ({ ...f, query })),
    toggleStatus: (s: IucnStatus) => setFilters((f) => ({ ...f, statuses: toggle(f.statuses, s) })),
    toggleRegion: (r: RegionId) => setFilters((f) => ({ ...f, regions: toggle(f.regions, r) })),
    toggleHabitat: (h: HabitatId) => setFilters((f) => ({ ...f, habitats: toggle(f.habitats, h) })),
    setRegions: (regions: RegionId[]) => setFilters((f) => ({ ...f, regions })),
    reset: () => setFilters({ ...EMPTY }),
  };
}
