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
