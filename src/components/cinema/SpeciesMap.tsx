import { useId, useMemo, useRef, useState, type Ref } from 'react';
import type { DistributionPoint, Species, ThreatId } from '../../types';
import { THREAT_LABELS } from '../../data/threats';
import { localityCoords, type IndiaGeo, MAP_HEIGHT, MAP_VIEWBOX, MAP_WIDTH, project, useIndiaGeo } from '../../geo/india';
import { GeoLine } from '../../geo/line/GeoLine';
import { chain, threadPath } from '../../geo/line/paths';
import { GEOJSON_STATE_ALIASES } from '../../utils/stateCounts';
import { programmeSitesFor } from '../map/programmeSites';
import { cn } from '../../utils/cn';

/**
 * One species on the map of India, in three layers that the story brings in
 * one after another:
 *
 *  range         — the states the dataset records it in, its indicative
 *                  localities, and a thread joining them;
 *  threats       — one hatch per recorded threat, laid over those states;
 *  conservation  — the programme sites the dataset links to it.
 *
 * What the drawing claims is kept to what the data holds. The shaded states
 * are states of record, not a range polygon. The thread joins indicative
 * localities so the eye can follow them; it is not a route or a boundary.
 * Threats are recorded per species, not per place, so each hatch covers the
 * species' states evenly and is labelled that way — the angle tells the
 * threats apart, and none is drawn as if it had a mapped footprint.
 *
 * The layers are driven by three CSS custom properties on the root —
 * `--range`, `--threat`, `--cons`, each 0 → 1 — plus `--zoom` for the move
 * from all-India to the species' own region. A scroll timeline, a phase
 * button or the documentary clock writes those numbers; React is not
 * re-rendered to animate.
 */

/** Hatch angles, one per threat category, far enough apart to read as distinct. */
const HATCH_ANGLE: Record<ThreatId, number> = {
  'habitat-loss': 45,
  poaching: -45,
  pollution: 0,
  infrastructure: 90,
  'power-lines': 22,
  'climate-change': -22,
  'human-wildlife-conflict': 67,
  bycatch: -67,
};

export interface SpeciesMapFrame {
  tx: number;
  ty: number;
  s: number;
}

/** The zoom that frames a species' localities, padded so the region keeps some context. */
export function frameFor(species: Species, geo?: IndiaGeo | null): SpeciesMapFrame {
  const pts = species.distributionPoints.map((p) => project(p.lng, p.lat));
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of pts) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  // The northern territory is far larger than the localities inside it, so
  // frame all of it rather than clip its western and northern reaches.
  const north = geo?.byName.get('Jammu and Kashmir');
  if (north && species.states.some((s) => (GEOJSON_STATE_ALIASES[s] ?? s) === 'Jammu and Kashmir')) {
    minX = Math.min(minX, north.bounds[0]);
    minY = Math.min(minY, north.bounds[1]);
    maxX = Math.max(maxX, north.bounds[2]);
    maxY = Math.max(maxY, north.bounds[3]);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const w = Math.max(maxX - minX + 260, 420);
  const h = Math.max(maxY - minY + 260, 420);
  const s = Math.min(2.2, Math.max(1, Math.min(MAP_WIDTH / w, MAP_HEIGHT / h)));
  return { s, tx: MAP_WIDTH / 2 - s * cx, ty: MAP_HEIGHT / 2 - s * cy };
}

export function SpeciesMap({
  species,
  highlightThreat = null,
  highlightSites = false,
  ref,
  className,
  interactive = true,
  showLegend = true,
  vars,
  align = 'center',
  legendPhase,
  highlightLocality = null,
  onLocality,
}: {
  species: Species;
  highlightThreat?: ThreatId | null;
  highlightSites?: boolean;
  ref?: Ref<HTMLDivElement>;
  className?: string;
  interactive?: boolean;
  showLegend?: boolean;
  /** Layer values set declaratively, for the documentary clock. */
  vars?: { range: number; threat: number; cons: number; zoom: number };
  align?: 'left' | 'center';
  /**
   * Which caption the key shows, when the caller knows the phase (the pinned
   * scene does). Without it the key follows the layer variables instead.
   */
  legendPhase?: 'range' | 'threats' | 'conservation';
  /** A locality picked out elsewhere (the species page's register), by its label. */
  highlightLocality?: string | null;
  /** Called when the reader points at a locality here, so the register can answer. */
  onLocality?: (label: string | null) => void;
}) {
  const geo = useIndiaGeo();
  const uid = useId().replace(/:/g, '');
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<{ point: DistributionPoint; x: number; y: number } | null>(null);

  const drawnStates = useMemo(
    () => [...new Set(species.states.map((s) => GEOJSON_STATE_ALIASES[s] ?? s))],
    [species],
  );
  const ordered = useMemo(() => chain(species.distributionPoints), [species]);
  const thread = useMemo(() => threadPath(species.distributionPoints), [species]);
  const sites = useMemo(() => programmeSitesFor([species]), [species]);
  const frame = useMemo(() => frameFor(species, geo), [species, geo]);

  const occurrence = geo ? drawnStates.map((n) => geo.byName.get(n)).filter(Boolean) : [];
  const occurrenceD = occurrence.map((s) => s!.d).join('');
  const anchor = species.distributionPoints[0];

  const setRefs = (node: HTMLDivElement | null) => {
    wrapRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as { current: HTMLDivElement | null }).current = node;
  };

  const onPoint = (point: DistributionPoint, el: SVGElement) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const a = wrap.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    setHover({ point, x: b.left + b.width / 2 - a.left, y: b.top - a.top });
  };

  return (
    <div
      ref={setRefs}
      className={cn('species-map relative', className)}
      style={
        {
          '--range': vars?.range ?? 1,
          '--threat': vars?.threat ?? 0,
          '--cons': vars?.cons ?? 0,
          '--zoom': vars?.zoom ?? 0,
          '--ztx': `${frame.tx.toFixed(1)}px`,
          '--zty': `${frame.ty.toFixed(1)}px`,
          '--zs': frame.s.toFixed(3),
        } as React.CSSProperties
      }
      data-highlight={highlightThreat ? 'true' : 'false'}
    >
      <svg viewBox={MAP_VIEWBOX} preserveAspectRatio={align === "left" ? "xMinYMid meet" : "xMidYMid meet"} className="h-full w-full overflow-visible" role="img" aria-label={`Map of India showing where the ${species.commonName} is recorded`}>
        <defs>
          {species.majorThreats.map((t) => (
            <pattern
              key={t}
              id={`${uid}-h-${t}`}
              width="11"
              height="11"
              patternUnits="userSpaceOnUse"
              patternTransform={`rotate(${HATCH_ANGLE[t]})`}
            >
              <line x1="0" y1="0" x2="0" y2="11" className="hatch-line" />
            </pattern>
          ))}
          <mask id={`${uid}-wipe`} maskUnits="userSpaceOnUse" x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT}>
            <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="white" className="sm-wipe" />
          </mask>
          <clipPath id={`${uid}-occ`}>
            <path d={occurrenceD} />
          </clipPath>
        </defs>

        <g className="sm-zoom">
          {/* The rest of the country, as a faint sheet. */}
          <path d={geo?.all ?? ''} className="sm-country" />

          {/* States of record. */}
          <path d={occurrenceD} className="sm-occurrence" />

          {/* Threat hatching, one layer per recorded threat. */}
          <g mask={`url(#${uid}-wipe)`} clipPath={`url(#${uid}-occ)`}>
            {species.majorThreats.map((t) => (
              <rect
                key={t}
                width={MAP_WIDTH}
                height={MAP_HEIGHT}
                fill={`url(#${uid}-h-${t})`}
                className={cn('sm-hatch', highlightThreat === t && 'is-hl', highlightThreat && highlightThreat !== t && 'is-dim')}
              />
            ))}
          </g>

          {/* The protected outline: the same states, redrawn in water-blue once conservation enters. */}
          <GeoLine d={occurrenceD} role="protect" draw="var(--cons)" className="sm-protected" />

          {/* The thread through the localities, drawn by its nib as the range comes in. */}
          <GeoLine d={thread} role="thread" draw="var(--range)" nib={3.6} className="sm-thread" />

          {/* Programme sites. */}
          {sites.map((site, i) => {
            const [x, y] = project(site.lng, site.lat);
            return (
              <g key={`${site.programme.id}-${i}`} className={cn('sm-site', highlightSites && 'is-hl')} style={{ ['--k' as string]: i }}>
                <circle cx={x} cy={y} r={16 + i * 7} />
              </g>
            );
          })}

          {/* Localities. */}
          {ordered.map((p, i) => {
            const [x, y] = project(p.lng, p.lat);
            return (
              <g
                key={p.label}
                className={cn('sm-point', highlightLocality === p.label && 'is-hl')}
                data-locality={p.label}
                style={{ ['--k' as string]: i / Math.max(ordered.length - 1, 1) }}
                onPointerEnter={interactive ? (e) => (onPoint(p, e.currentTarget), onLocality?.(p.label)) : undefined}
                onPointerLeave={interactive ? () => (setHover(null), onLocality?.(null)) : undefined}
                onFocus={interactive ? (e) => (onPoint(p, e.currentTarget), onLocality?.(p.label)) : undefined}
                onBlur={interactive ? () => (setHover(null), onLocality?.(null)) : undefined}
                tabIndex={interactive ? 0 : undefined}
                role={interactive ? 'button' : undefined}
                aria-label={interactive ? `${p.label}${p.note ? `. ${p.note}` : ''}` : undefined}
                data-cursor={interactive ? 'Locate' : undefined}
              >
                <circle cx={x} cy={y} r="14" className="sm-point-hit" />
                <circle cx={x} cy={y} r={i === 0 ? 5.5 : 4} className="sm-point-dot" />
                {i === 0 && <circle cx={x} cy={y} r="10" className="sm-point-ring" />}
              </g>
            );
          })}
        </g>

      </svg>

      {hover && (
        <div
          className="map-tip pointer-events-none absolute z-10 w-max max-w-[16rem] -translate-x-1/2 -translate-y-[calc(100%+12px)]"
          style={{ left: hover.x, top: hover.y }}
          role="tooltip"
        >
          <p className="text-small leading-snug text-canvas">{hover.point.label}</p>
          <p className="mt-0.5 text-micro tabular-nums text-canvas/70">
            {localityCoords(hover.point)}
          </p>
          {hover.point.note && <p className="mt-1 text-label leading-snug text-canvas/70">{hover.point.note}</p>}
        </div>
      )}

      {showLegend && (
        <div className="sm-legend pointer-events-none absolute left-0 top-0 isolate h-28 w-[min(17rem,calc(100%-2.5rem))]" data-phase={legendPhase}>
          <p className="sm-legend-range">
            Shaded: states of record. Points: indicative localities, not a range boundary. The ringed point is {anchor.label.split(',')[0]}.
          </p>
          <p className="sm-legend-threat">
            Each hatch is one recorded threat —{' '}
            {species.majorThreats.map((t) => THREAT_LABELS[t].toLowerCase()).join('; ')}. Threats are recorded for the species,
            not mapped by place.
          </p>
          <p className="sm-legend-cons">
            Rings: {sites.length === 0 ? 'no programme site is linked in the dataset' : `${sites.length} programme site${sites.length === 1 ? '' : 's'} linked in the dataset, at the anchor locality`}.
          </p>
        </div>
      )}
    </div>
  );
}
