import type { ThreatCategory, ThreatId } from '../types';

/**
 * Threat categories shown in "Threats" mode.
 * Descriptions are general and non-numeric; species-specific threat notes
 * live on each species entry with their own sources.
 */
export const THREATS: ThreatCategory[] = [
  {
    id: 'habitat-loss',
    name: 'Habitat loss & fragmentation',
    description:
      'Conversion of forest, grassland and wetland to farmland, plantations, settlements and industry, and the break-up of remaining habitat into isolated patches.',
  },
  {
    id: 'poaching',
    name: 'Poaching & illegal trade',
    description:
      'Hunting and trapping for meat, skins, horn, bone or the live-animal trade, including retaliatory and opportunistic killing.',
  },
  {
    id: 'pollution',
    name: 'Pollution & toxins',
    description:
      'Agro-chemicals, industrial effluent, plastic and veterinary drugs such as diclofenac, which is lethal to vultures that feed on treated livestock carcasses.',
  },
  {
    id: 'infrastructure',
    name: 'Dams, canals & linear infrastructure',
    description:
      'Barrages and river regulation that alter flow and sediment, and roads, railways and canals that cut through habitat and block movement.',
  },
  {
    id: 'power-lines',
    name: 'Power-line collisions',
    description:
      'High-tension transmission lines across open country, a major cause of death for large, heavy birds with limited frontal vision such as the Great Indian Bustard.',
  },
  {
    id: 'climate-change',
    name: 'Climate change',
    description:
      'Shifting temperature and rainfall, glacier retreat, sea-level rise and more frequent extreme events that change the extent and quality of habitat.',
  },
  {
    id: 'human-wildlife-conflict',
    name: 'Human–wildlife conflict',
    description:
      'Crop and livestock damage, and threats to human life, leading to injury or killing of wildlife, particularly around the edges of protected areas.',
  },
  {
    id: 'bycatch',
    name: 'Fishing pressure & bycatch',
    description:
      'Accidental capture in gill nets and trawls, entanglement, and depletion of prey — a leading threat to river dolphins, dugongs and gharial.',
  },
];

export const THREAT_BY_ID: Record<ThreatId, ThreatCategory> = Object.fromEntries(
  THREATS.map((t) => [t.id, t]),
) as Record<ThreatId, ThreatCategory>;

export const THREAT_LABELS: Record<ThreatId, string> = Object.fromEntries(
  THREATS.map((t) => [t.id, t.name]),
) as Record<ThreatId, string>;
