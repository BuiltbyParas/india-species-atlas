import L from 'leaflet';
import type { ConservationMode, Species } from '../../types';
import { STATUS_INFO } from '../../data/statusInfo';
import { THREAT_ABBR, THREAT_COLOR } from './markerLegends';

export interface PinOptions {
  /** A conservation-breeding centre: the disc carries a dashed ring, as the legend says. */
  captive?: boolean;
  /**
   * Screen offset of the disc from its locality, in pixels, for localities two species share. The disc moves
   * aside and a hairline runs back to a dot on the true point, so both markers can be reached and neither is
   * drawn anywhere the record does not put it. Constant in pixels, so the offset never grows into a false place.
   */
  offset?: [number, number];
}

/**
 * A survey marker: a disc centred exactly on the locality, in the layer's
 * colour, carrying its code as text so the colour is never the only signal.
 * Centred rather than a teardrop, so the point is where the mark is, as on the
 * documentary's maps and the legend beside this one.
 */
function pin(color: string, text: string, { captive = false, offset }: PinOptions = {}, size = 20) {
  const [dx, dy] = offset ?? [0, 0];
  const leader =
    dx || dy
      ? `<i class="pin-leader" style="--len:${Math.hypot(dx, dy).toFixed(1)}px;--angle:${Math.atan2(-dy, -dx).toFixed(4)}rad"></i><i class="pin-true" style="--dx:${-dx}px;--dy:${-dy}px"></i>`
      : '';
  return L.divIcon({
    className: '',
    html: `${leader}<div class="species-pin${captive ? ' is-captive' : ''}" style="--pin:${color}"><span>${text}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2 - dx, size / 2 - dy],
    popupAnchor: [0, -size / 2 - 2],
  });
}

export function iconForSpecies(species: Species, mode: ConservationMode, options: PinOptions = {}) {
  if (mode === 'threats') {
    const primary = species.majorThreats[0];
    return pin(primary ? THREAT_COLOR[primary] : '#888', primary ? THREAT_ABBR[primary] : '?', options);
  }
  if (mode === 'conservation') {
    const protectedByProgramme = species.conservationProgrammes.length > 0;
    return pin(protectedByProgramme ? 'var(--color-forest-400)' : 'var(--color-forest-200)', '✦', options);
  }
  return pin(STATUS_INFO[species.status].colorVar, species.status, options);
}

/**
 * Where each locality's disc sits relative to its point: on a small ring for points that more than one record
 * shares (keyed in input order), nowhere else. 11 px puts two 20 px discs side by side with a hairline gap.
 */
export function coincidentOffsets(points: Array<{ lat: number; lng: number }>): Array<[number, number] | undefined> {
  const groups = new Map<string, number[]>();
  points.forEach((p, i) => {
    const key = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
    groups.set(key, [...(groups.get(key) ?? []), i]);
  });
  const out: Array<[number, number] | undefined> = points.map(() => undefined);
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    const r = members.length === 2 ? 11 : 13;
    members.forEach((index, k) => {
      const a = Math.PI + (k / members.length) * Math.PI * 2;
      out[index] = [Math.round(Math.cos(a) * r), Math.round(Math.sin(a) * r)];
    });
  }
  return out;
}
