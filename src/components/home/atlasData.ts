import { SPECIES } from '../../data/species';
import { PROGRAMMES } from '../../data/programmes';
import { STATUS_HEX } from '../../theme';
import { project } from '../../geo/india';
import { threadRuns } from '../../geo/line/paths';
import { programmeSitesFor, programmeStatesFor } from '../map/programmeSites';
import { GEOJSON_STATE_ALIASES } from '../../utils/stateCounts';
import type { AtlasWorldData } from './heroScene';

/**
 * What the atlas world draws after the hero (Chapter 04 and the closing), all
 * of it derived from the dataset, as the SVG maps it replaces were:
 *
 * - each species' thread through its indicative localities, cut where two are
 *   too far apart to join (`threadRuns`, shared with every drawn map);
 * - whether any programme in the dataset names the species (the response
 *   rejoins only those threads; the others stay broken, which is what the
 *   record says);
 * - the programme sites, at the anchor localities of the species each
 *   programme covers, fanned where two share a place (`programmeSitesFor`);
 * - the states of record for programme-covered species, for the glaze;
 * - the anchor localities, from which the closing's lines run to one drawing
 *   point (79° E, 22.5° N — a point on the sheet, not a place with a claim).
 */
const COVERED = new Set(PROGRAMMES.flatMap((p) => p.speciesIds));
/** In map units, as the SVG fans them (ConservationMap). */
const FAN = 16;

export const ATLAS_CENTRE: [number, number] = [79.0, 22.5];
export const PROTECTED_STATES = [...programmeStatesFor(SPECIES)].map((s) => GEOJSON_STATE_ALIASES[s] ?? s);

export function atlasWorldData(protectedPaths: string[]): AtlasWorldData {
  const sites = programmeSitesFor(SPECIES).map((site) => {
    const angle = (site.fanIndex / Math.max(site.fanCount, 1)) * Math.PI * 2;
    const off = site.fanCount > 1 ? FAN : 0;
    // The fan is drawn on the sheet: the offset is in map units, carried back to degrees at the site.
    const [x, y] = project(site.lng, site.lat);
    const [x1, y1] = [x + Math.cos(angle) * off, y + Math.sin(angle) * off];
    const [lng0, lat0] = [site.lng, site.lat];
    const [px, py] = project(lng0 + 1, lat0 - 1);
    const perLng = px - x;
    const perLat = py - y;
    return {
      programme: site.programme.id,
      species: site.species.id,
      lng: lng0 + (x1 - x) / perLng,
      lat: lat0 - (y1 - y) / perLat,
    };
  });
  return {
    species: SPECIES.map((s) => ({
      id: s.id,
      color: STATUS_HEX[s.status],
      covered: COVERED.has(s.id),
      runs: threadRuns(s.distributionPoints).map((run) => run.map((p) => [p.lng, p.lat] as [number, number])),
      anchor: [s.distributionPoints[0].lng, s.distributionPoints[0].lat],
    })),
    sites,
    centre: ATLAS_CENTRE,
    protectedPaths,
  };
}
