/**
 * Everything the film says about species, threats and conservation, read
 * from the site's dataset at render time. Nothing here is typed in by hand:
 * counts are computed with the site's own helpers (src/utils/stats.ts), so a
 * change to src/data/ changes the film the next time it renders.
 *
 * The only authored choices are WHICH species are featured and which of
 * their regions frames each one, and those are checked against the data
 * (see `assertFeatured`).
 */
import { SPECIES, SPECIES_BY_ID } from '../../../src/data/species';
import { PROGRAMMES } from '../../../src/data/programmes';
import { REGION_BY_ID, HABITAT_LABELS } from '../../../src/data/regions';
import { THREAT_BY_ID } from '../../../src/data/threats';
import { STATUS_INFO } from '../../../src/data/statusInfo';
import { countByStatus, threatChartData, regionsWithSpecies, endemicCount } from '../../../src/utils/stats';
import { programmeSitesFor } from '../../../src/components/map/programmeSites';
import { GEOJSON_STATE_ALIASES } from '../../../src/utils/stateCounts';
import type { HabitatId, RegionId, Species } from '../../../src/types';

export { SPECIES, STATUS_INFO, PROGRAMMES };

/**
 * The five species the film features, one per landscape. Chosen because they
 * span five biomes from the Thar to the high Himalaya, carry all three
 * threatened categories, and are the five with full-resolution photographs
 * in video/public/species/.
 */
export interface Featured {
  id: string;
  /** The landscape word on screen. Must match the species' habitat or region. */
  word: string;
  region: RegionId;
  habitat: HabitatId;
  /** Where the photo's subject sits, as CSS object-position. */
  focus: string;
  /** Extra zoom on the photo so a small subject reads (≥1). */
  crop: number;
  /** A line from the species' own record, quoted verbatim. */
  quoteField: 'threatNote' | 'habitatNote' | 'summary';
}

export const FEATURED: Featured[] = [
  { id: 'great-indian-bustard', word: 'Desert', region: 'desert', habitat: 'grassland', focus: '60% 68%', crop: 1.35, quoteField: 'summary' },
  { id: 'bengal-tiger', word: 'Forest', region: 'central-india', habitat: 'forest', focus: '58% 42%', crop: 1.08, quoteField: 'summary' },
  { id: 'ganges-river-dolphin', word: 'River', region: 'gangetic-plains', habitat: 'freshwater', focus: '74% 42%', crop: 1.25, quoteField: 'summary' },
  { id: 'indian-rhinoceros', word: 'Wetland', region: 'northeast', habitat: 'wetland', focus: '50% 58%', crop: 1.12, quoteField: 'summary' },
  { id: 'snow-leopard', word: 'Himalaya', region: 'himalayas', habitat: 'mountain', focus: '42% 40%', crop: 1.0, quoteField: 'summary' },
];

function assertFeatured() {
  for (const f of FEATURED) {
    const s = SPECIES_BY_ID[f.id];
    if (!s) throw new Error(`Featured species ${f.id} is not in src/data/species.ts`);
    if (!s.regions.includes(f.region)) throw new Error(`${f.id} is not recorded in region ${f.region}`);
    if (!s.habitats.includes(f.habitat)) throw new Error(`${f.id} is not recorded in habitat ${f.habitat}`);
  }
}
assertFeatured();

export const featuredSpecies = (i: number): Species => SPECIES_BY_ID[FEATURED[i].id];
export const regionOf = (id: RegionId) => REGION_BY_ID[id];
export const habitatLabel = (id: HabitatId) => HABITAT_LABELS[id];

/**
 * Larger renditions of the same Commons files (fetched by `npm run video:data`),
 * as 1600 px working copies made by `npm run video:promo:prep`.
 */
const LARGE_PHOTOS = new Set(['great-indian-bustard', 'bengal-tiger', 'ganges-river-dolphin', 'indian-rhinoceros', 'snow-leopard']);
export const largePhotoPath = (id: string) => (LARGE_PHOTOS.has(id) ? `promo/photos/${id}.jpg` : null);

/** The state a record is drawn on (the map draws Ladakh inside Jammu and Kashmir). */
export const drawnState = (state: string) => GEOJSON_STATE_ALIASES[state] ?? state;
export const drawnStatesOf = (s: Species) => [...new Set(s.states.map(drawnState))];

// --- Headline numbers, all computed -------------------------------------------------

export const STATS = (() => {
  const byStatus = countByStatus();
  const locations = SPECIES.reduce((n, s) => n + s.distributionPoints.length, 0);
  return {
    species: SPECIES.length,
    locations,
    regions: regionsWithSpecies().length,
    programmes: PROGRAMMES.length,
    endemic: endemicCount(),
    byStatus: (['CR', 'EN', 'VU'] as const).map((code) => ({
      code,
      name: STATUS_INFO[code].name,
      hex: STATUS_INFO[code].hex,
      count: byStatus[code],
    })),
    threats: threatChartData().map((t) => ({ ...t, of: SPECIES.length })),
  };
})();

export const threatName = (id: keyof typeof THREAT_BY_ID) => THREAT_BY_ID[id].name;

/** Every mapped locality, in dataset order, with its species' status colour. */
export const ALL_POINTS = SPECIES.flatMap((s, si) =>
  s.distributionPoints.map((p, pi) => ({
    key: `${s.id}-${pi}`,
    speciesId: s.id,
    speciesIndex: si,
    lat: p.lat,
    lng: p.lng,
    label: p.label,
    hex: STATUS_INFO[s.status].hex,
    status: s.status,
  })),
);

/** Programme sites as the site's Conservation layer places them. */
export const PROGRAMME_SITES = programmeSitesFor(SPECIES).map((site) => ({
  key: `${site.programme.id}-${site.species.id}-${site.label}`,
  programmeId: site.programme.id,
  year: site.programme.startedYear ?? null,
  lat: site.lat,
  lng: site.lng,
  label: site.label,
}));

/** Programmes in the order they began. */
export const PROGRAMME_TIMELINE = [...PROGRAMMES]
  .filter((p) => p.startedYear)
  .sort((a, b) => (a.startedYear! - b.startedYear!) || a.name.localeCompare(b.name))
  .map((p) => ({ id: p.id, name: p.name, year: p.startedYear!, authority: p.authority }));

/** A programme's name as the dataset gives it, less a trailing parenthetical abbreviation or expansion. */
export const shortProgrammeName = (name: string) => name.replace(/\s*\([^)]*\)\s*$/, '');
