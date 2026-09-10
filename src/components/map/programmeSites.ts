import { PROGRAMMES } from '../../data/programmes';
import { SPECIES_BY_ID } from '../../data/species';
import type { ConservationProgramme, Species } from '../../types';

/**
 * Where the Conservation layer stands its programme markers, and what each
 * programme looks like in three dimensions.
 *
 * Everything here is *derived*, never authored. A programme is placed only at
 * localities the dataset already holds for the species that programme covers,
 * and the atlas holds those localities as indicative points, not as boundaries.
 * That constraint is why the layer raises named protected-area *sites* rather
 * than drawing protected-area polygons: this project has no licensed boundary
 * geometry for India's protected areas, and inventing one would be a
 * fabrication of exactly the kind the atlas exists to avoid.
 */

/**
 * A programme's visual identity, taken from its position in the dataset so
 * that adding a programme simply claims the next unused one.
 *
 * Shape is the primary channel and colour the secondary, because a plan
 * outline survives the small on-screen size of a map marker better than a hue
 * does, and because the map's other two modes have already spent the status
 * and threat palettes. The tints stay inside one warm-to-cool band rather than
 * spanning the spectrum, so ten markers still read as one legend.
 */
export interface ProgrammeIdentity {
  /** Sides of the marker's plan polygon, 3–8. */
  sides: number;
  /** Rotation of that polygon, in radians. */
  rotation: number;
  /** Cap colour. */
  hex: string;
}

const IDENTITY_PALETTE = [
  '#e0a33c',
  '#5fb3a1',
  '#7f9fd6',
  '#c98a5e',
  '#8fc7aa',
  '#c47fa8',
  '#9bb861',
  '#6fa8c9',
  '#d1a06c',
  '#a3a0d8',
];

export function identityFor(index: number): ProgrammeIdentity {
  // Sides cycle 3→8, and every second marker is rotated half a step, so two
  // programmes only ever share a plan outline twelve entries apart.
  const sides = 3 + (index % 6);
  const half = Math.floor(index / 6) % 2 === 1;
  return {
    sides,
    rotation: (half ? Math.PI / sides : 0) - Math.PI / 2,
    hex: IDENTITY_PALETTE[index % IDENTITY_PALETTE.length],
  };
}

export const PROGRAMME_INDEX: Record<string, number> = Object.fromEntries(
  PROGRAMMES.map((p, i) => [p.id, i]),
);

export interface ProgrammeSite {
  programme: ConservationProgramme;
  species: Species;
  lat: number;
  lng: number;
  /** The dataset's own label for the locality, e.g. "Kanha Tiger Reserve". */
  label: string;
  identity: ProgrammeIdentity;
  /**
   * Where this marker sits in the ring of markers sharing its locality, and
   * how many share it — two programmes can both name the same species, and a
   * marker hidden underneath another is a marker the reader cannot click.
   */
  fanIndex: number;
  fanCount: number;
}

/**
 * Programme markers for a set of species.
 *
 * One marker per (programme, covered species) pair, standing at that species'
 * *anchor locality* — the first entry in its distribution list, which in this
 * dataset is its flagship landscape and is the same anchor the hero uses. The
 * alternative, a marker at every occurrence point of every covered species,
 * puts sixty-odd markers on the map and says nothing more: the claim being
 * made is "this programme covers this species", and one marker per pair is
 * exactly that claim.
 */
export function programmeSitesFor(species: Species[]): ProgrammeSite[] {
  const visible = new Set(species.map((s) => s.id));
  const sites: Array<Omit<ProgrammeSite, 'fanIndex' | 'fanCount'>> = [];

  for (const programme of PROGRAMMES) {
    const index = PROGRAMME_INDEX[programme.id];
    for (const speciesId of programme.speciesIds) {
      if (!visible.has(speciesId)) continue;
      const subject = SPECIES_BY_ID[speciesId];
      const anchor = subject?.distributionPoints[0];
      if (!subject || !anchor) continue;
      sites.push({
        programme,
        species: subject,
        lat: anchor.lat,
        lng: anchor.lng,
        label: anchor.label,
        identity: identityFor(index),
      });
    }
  }

  // Fan out co-located markers so each stays clickable.
  const buckets = new Map<string, number[]>();
  sites.forEach((site, i) => {
    const key = `${site.lat.toFixed(4)},${site.lng.toFixed(4)}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(i);
    else buckets.set(key, [i]);
  });

  const out = sites as ProgrammeSite[];
  for (const bucket of buckets.values()) {
    bucket.forEach((i, n) => {
      out[i].fanIndex = n;
      out[i].fanCount = bucket.length;
    });
  }
  return out;
}

/**
 * States and union territories the dataset lists for species that a
 * conservation programme covers. The Conservation layer raises these a step
 * higher than the rest of the landmass, so the elevation encodes a plain
 * boolean read off the data rather than a quantity that a prism's height
 * would misrepresent.
 *
 * A name with no matching feature in `india-states.geojson` simply raises
 * nothing. The one case in this dataset is Ladakh, which the shipped boundary
 * file — drawn before the 2019 reorganisation — still carries inside its
 * "Jammu and Kashmir" feature; the snow leopard entry lists both names, so
 * that ground is raised regardless.
 */
export function programmeStatesFor(species: Species[]): Set<string> {
  const states = new Set<string>();
  for (const s of species) {
    if (s.conservationProgrammes.length === 0) continue;
    for (const state of s.states) states.add(state);
  }
  return states;
}
