import type { Environment } from '../world/environment';
import { SPECIES_BY_ID } from '../data/species';

/**
 * The five species the documentary follows, in the order the route line
 * visits them: west to east, desert to floodplain — the Thar, the central
 * forests, the Ganga, the high Himalaya, the Brahmaputra.
 *
 * An editorial choice, not data: shared by the home page, the opening
 * sequence and the route-line progress so they always agree.
 */
export const FEATURED = ['great-indian-bustard', 'bengal-tiger', 'ganges-river-dolphin', 'snow-leopard', 'indian-rhinoceros']
  .map((id) => SPECIES_BY_ID[id])
  .filter(Boolean);

/**
 * The ground each featured species is shown on (world/environment.ts). Also
 * editorial: the environment names the landscape the scene is about, not a
 * habitat classification.
 */
export const FEATURED_ENV: Record<string, Environment> = {
  'great-indian-bustard': 'thar',
  'bengal-tiger': 'forest',
  'ganges-river-dolphin': 'river',
  'snow-leopard': 'himalaya',
  'indian-rhinoceros': 'forest',
};
