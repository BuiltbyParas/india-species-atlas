import type { IucnStatus, ThreatId } from '../../types';
import { STATUS_INFO } from '../../data/statusInfo';
import { THREAT_BY_ID } from '../../data/threats';

/** Legend metadata only — no Leaflet import, so it is safe for any bundle. */

export const THREAT_ABBR: Record<ThreatId, string> = {
  'habitat-loss': 'HL',
  poaching: 'PO',
  pollution: 'PL',
  infrastructure: 'IN',
  'power-lines': 'PW',
  'climate-change': 'CC',
  'human-wildlife-conflict': 'HC',
  bycatch: 'BY',
};

export const THREAT_COLOR: Record<ThreatId, string> = {
  'habitat-loss': '#c26b3e',
  poaching: '#b23b3b',
  pollution: '#7d6bd0',
  infrastructure: '#4b7fae',
  'power-lines': '#c8a13c',
  'climate-change': '#3f9a8c',
  'human-wildlife-conflict': '#a15c9a',
  bycatch: '#3f8f5c',
};

export const statusLegend: Array<{ code: IucnStatus; color: string; label: string }> = (
  ['CR', 'EN', 'VU'] as IucnStatus[]
).map((code) => ({ code, color: STATUS_INFO[code].colorVar, label: STATUS_INFO[code].name }));

export const threatLegend = (Object.keys(THREAT_COLOR) as ThreatId[]).map((id) => ({
  id,
  color: THREAT_COLOR[id],
  abbr: THREAT_ABBR[id],
  label: THREAT_BY_ID[id].name,
}));
