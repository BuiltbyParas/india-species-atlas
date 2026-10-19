import { useMemo } from 'react';
import type { Species } from '../../types';
import { localityCoords, MAP_VIEWBOX, project, useIndiaGeo } from '../../geo/india';
import { GeoLine } from '../../geo/line/GeoLine';
import { threadPath } from '../../geo/line/paths';
import { GEOJSON_STATE_ALIASES } from '../../utils/stateCounts';
import { cn } from '../../utils/cn';

/**
 * A small locator: where on the sheet a species is.
 *
 * The country, the species' states of record, its thread through the
 * recorded localities, and its anchor ringed, with the anchor's coordinates.
 * It is what a card or the gallery shows behind a photograph, so a picture is
 * never far from its ground. The thread draws when `--draw` on an ancestor
 * goes to 1 (the caller decides when — on hover, or when the card comes to
 * the front). Everything is from the record.
 */
export function SpeciesLocator({ species, className }: { species: Species; className?: string }) {
  const geo = useIndiaGeo();
  const record = useMemo(() => {
    if (!geo) return '';
    const names = new Set(species.states.map((s) => GEOJSON_STATE_ALIASES[s] ?? s));
    return geo.states
      .filter((s) => names.has(s.name))
      .map((s) => s.d)
      .join('');
  }, [geo, species]);
  const thread = useMemo(() => threadPath(species.distributionPoints), [species]);
  const a = species.distributionPoints[0];
  const [x, y] = project(a.lng, a.lat);
  return (
    <div className={cn('locator', className)} aria-hidden="true">
      <svg viewBox={MAP_VIEWBOX} className="locator-map">
        <path d={geo?.all ?? ''} className="locator-country" />
        <path d={record} className="locator-record" />
        {thread && <GeoLine d={thread} role="thread" className="locator-thread" />}
        <circle cx={x} cy={y} r="26" className="locator-ring" />
        <circle cx={x} cy={y} r="11" className="locator-dot" />
      </svg>
      <p className="locator-coords tabular-nums">
        {localityCoords(a)}
        <span>{a.label.split(',')[0]}</span>
      </p>
    </div>
  );
}
