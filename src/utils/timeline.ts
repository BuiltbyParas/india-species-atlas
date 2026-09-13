import { SPECIES } from '../data/species';
import { PROGRAMMES } from '../data/programmes';
import { STATUS_INFO } from '../data/statusInfo';
import type { IucnStatus, SourceRef, Species } from '../types';

/**
 * A dated record of what the atlas actually holds: when a species was listed
 * in its present Red List category, and when the programmes responding to
 * those listings began.
 *
 * Deliberately not a population graph. The atlas has no population time
 * series it could cite, and drawing a line between two numbers it does not
 * have would be the sort of illustration this project exists to avoid. Every
 * event below is a dated fact with a source attached.
 */

export type TimelineEventKind = 'status' | 'programme';

export interface TimelineEvent {
  id: string;
  year: number;
  kind: TimelineEventKind;
  title: string;
  detail: string;
  /** Present on status events, for the category swatch. */
  status?: IucnStatus;
  /** Present where the event belongs to one species. */
  speciesId?: string;
  source: SourceRef;
}

export function timelineEvents(): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const s of SPECIES) {
    for (const h of s.statusHistory ?? []) {
      events.push({
        id: `${s.id}-${h.year}-${h.status}`,
        year: h.year,
        kind: 'status',
        title: `${s.commonName} listed as ${STATUS_INFO[h.status].name}`,
        detail: h.note,
        status: h.status,
        speciesId: s.id,
        source: h.source,
      });
    }
  }

  for (const p of PROGRAMMES) {
    if (!p.startedYear) continue;
    const names = p.speciesIds
      .map((id) => SPECIES.find((s) => s.id === id)?.commonName)
      .filter(Boolean) as string[];
    events.push({
      id: `programme-${p.id}`,
      year: p.startedYear,
      kind: 'programme',
      title: p.name,
      detail: names.length > 0 ? `${p.authority} · covers ${names.join(', ')}` : p.authority,
      source: p.sources[0],
    });
  }

  return events.sort((a, b) => a.year - b.year || a.title.localeCompare(b.title));
}

/** Species for which no dated listing could be found and checked. */
export function speciesWithoutHistory(): Species[] {
  return SPECIES.filter((s) => !s.statusHistory || s.statusHistory.length === 0);
}
