import L from 'leaflet';
import type { ConservationMode, Species } from '../../types';
import { STATUS_INFO } from '../../data/statusInfo';
import { THREAT_ABBR, THREAT_COLOR } from './markerLegends';

function pin(color: string, text: string, size = 30) {
  return L.divIcon({
    className: '',
    html: `<div class="species-pin" style="background:${color}"><span>${text}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size + 4],
  });
}

export function iconForSpecies(species: Species, mode: ConservationMode) {
  if (mode === 'threats') {
    const primary = species.majorThreats[0];
    return pin(primary ? THREAT_COLOR[primary] : '#888', primary ? THREAT_ABBR[primary] : '?');
  }
  if (mode === 'conservation') {
    const protectedByProgramme = species.conservationProgrammes.length > 0;
    return pin(protectedByProgramme ? 'var(--color-forest-400)' : 'var(--color-forest-200)', '✦');
  }
  return pin(STATUS_INFO[species.status].colorVar, species.status);
}
