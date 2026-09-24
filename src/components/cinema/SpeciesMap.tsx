import { useId, useMemo, useRef, useState, type Ref } from 'react';
import type { DistributionPoint, Species, ThreatId } from '../../types';
import { THREAT_LABELS } from '../../data/threats';
import { formatDeg, MAP_HEIGHT, MAP_VIEWBOX, MAP_WIDTH, project, smoothPath, useIndiaGeo } from '../../geo/india';
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

/**
 * The drawn thread: localities chained nearest-next from the anchor, then cut
 * wherever two consecutive localities are far apart. A line is only drawn
 * between places in the same landscape; two populations a thousand
 * kilometres apart are left unjoined, because a line between them would read
 * as a corridor the data does not record.
 */
const MAX_JOIN_DEG = 5;

export function threadPath(points: DistributionPoint[]): string {
  const ordered = chain(points);
  const runs: DistributionPoint[][] = [];
  let run: DistributionPoint[] = [];
  for (const p of ordered) {
    const last = run[run.length - 1];
    if (last && Math.hypot(p.lat - last.lat, p.lng - last.lng) > MAX_JOIN_DEG) {
      runs.push(run);
      run = [];
    }
    run.push(p);
  }
  runs.push(run);
  return runs
    .filter((r) => r.length > 1)
    .map((r) => smoothPath(r.map((p) => project(p.lng, p.lat))))
    .join('');
}

/** Order localities into a chain that starts at the anchor and takes the nearest next. */
export function chain(points: DistributionPoint[]): DistributionPoint[] {
  if (points.length < 3) return points;
  const rest = points.slice(1);
  const out = [points[0]];
  while (rest.length) {
    const last = out[out.length - 1];
    let best = 0;
    let bestD = Infinity;
    rest.forEach((p, i) => {
      const d = (p.lat - last.lat) ** 2 + (p.lng - last.lng) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    out.push(rest.splice(best, 1)[0]);
  }
  return out;
}

export interface SpeciesMapFrame {
  tx: number;
  ty: number;
  s: number;
}

/** The zoom that frames a species' localities, padded so the region keeps some context. */
export function frameFor(species: Species): SpeciesMapFrame {
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
  const frame = useMemo(() => frameFor(species), [species]);

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
          <path d={occurrenceD} pathLength={1} className="sm-protected" />

          {/* The thread through the localities. */}
          <path d={thread} pathLength={1} className="sm-thread" />

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
                className="sm-point"
                style={{ ['--k' as string]: i / Math.max(ordered.length - 1, 1) }}
                onPointerEnter={interactive ? (e) => onPoint(p, e.currentTarget) : undefined}
                onPointerLeave={interactive ? () => setHover(null) : undefined}
                onFocus={interactive ? (e) => onPoint(p, e.currentTarget) : undefined}
                onBlur={interactive ? () => setHover(null) : undefined}
                tabIndex={interactive ? 0 : undefined}
                role={interactive ? 'button' : undefined}
                aria-label={interactive ? `${p.label}${p.note ? `. ${p.note}` : ''}` : undefined}
                data-cursor={interactive ? 'Locality' : undefined}
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
          <p className="text-[13px] leading-snug text-canvas">{hover.point.label}</p>
          <p className="mt-0.5 text-[11px] tabular-nums text-canvas/50">
            {formatDeg(hover.point.lat, 'lat')} {formatDeg(hover.point.lng, 'lng')}
          </p>
          {hover.point.note && <p className="mt-1 text-[12px] leading-snug text-canvas/70">{hover.point.note}</p>}
        </div>
      )}

      {showLegend && (
        <div className="sm-legend pointer-events-none absolute left-0 top-0 h-24 w-[15rem] text-[11px] leading-snug text-canvas/45">
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
