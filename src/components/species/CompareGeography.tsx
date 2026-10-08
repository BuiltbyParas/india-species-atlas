import { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Species } from '../../types';
import { STATUS_INFO } from '../../data/statusInfo';
import { MAP_HEIGHT, MAP_WIDTH, project, useIndiaGeo } from '../../geo/india';
import { GeoLine } from '../../geo/line/GeoLine';
import { threadPath } from '../../geo/line/paths';
import { useInView } from '../../motion/useInView';
import { GEOJSON_STATE_ALIASES } from '../../utils/stateCounts';
import { cn } from '../../utils/cn';

/**
 * Two or three geographic systems on one sheet.
 *
 * Instead of reading two columns, the reader sees the species' ground laid
 * over each other in the same projection: each one's states of record as an
 * outline in its own line (solid, dashed, dotted — never colour alone), its
 * thread through its recorded localities, and its anchor. Where outlines
 * coincide, the ground is shared; the states every selected species is
 * recorded in are named below the map.
 *
 * Beside it, the same comparison as measures: a line per species whose
 * length is a count from the dataset — states of record, indicative
 * localities, recorded threats, national programmes — on a shared scale, so
 * scale and reach compare at a glance. Nothing is an area or a population:
 * the atlas holds neither.
 */
const MARKS = ['A', 'B', 'C'] as const;

function statesOf(s: Species): string[] {
  return [...new Set(s.states.map((x) => GEOJSON_STATE_ALIASES[x] ?? x))];
}

export function CompareGeography({ species }: { species: Species[] }) {
  const geo = useIndiaGeo();
  const ref = useRef<HTMLDivElement>(null);
  const shown = useInView(ref, { rootMargin: '0px 0px -15% 0px' });

  const systems = useMemo(
    () =>
      species.map((s, i) => {
        const names = statesOf(s);
        const a = s.distributionPoints[0];
        return {
          s,
          mark: MARKS[i],
          names,
          outline: geo ? names.map((n) => geo.byName.get(n)?.d ?? '').join('') : '',
          thread: threadPath(s.distributionPoints),
          anchor: project(a.lng, a.lat),
        };
      }),
    [species, geo],
  );

  // The ground all of them share, and the frame that holds every system.
  const shared = useMemo(() => {
    if (systems.length < 2) return [];
    return systems[0].names.filter((n) => systems.every((x) => x.names.includes(n)));
  }, [systems]);

  const viewBox = useMemo(() => {
    if (!geo) return `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`;
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const sys of systems) {
      for (const n of sys.names) {
        const b = geo.byName.get(n)?.bounds;
        if (!b) continue;
        x0 = Math.min(x0, b[0]);
        y0 = Math.min(y0, b[1]);
        x1 = Math.max(x1, b[2]);
        y1 = Math.max(y1, b[3]);
      }
      for (const p of sys.s.distributionPoints) {
        const [x, y] = project(p.lng, p.lat);
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
    }
    if (!Number.isFinite(x0)) return `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`;
    // At least a region's width, so one small range does not fill the sheet.
    const pad = 40;
    const w = Math.max(x1 - x0 + pad * 2, 320);
    const h = Math.max(y1 - y0 + pad * 2, 320);
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    return `${(cx - w / 2).toFixed(0)} ${(cy - h / 2).toFixed(0)} ${w.toFixed(0)} ${h.toFixed(0)}`;
  }, [geo, systems]);

  const measures = [
    { label: 'States and UTs of record', value: (s: Species) => statesOf(s).length },
    { label: 'Indicative localities', value: (s: Species) => s.distributionPoints.length },
    { label: 'Recorded threats', value: (s: Species) => s.majorThreats.length },
    { label: 'National programmes', value: (s: Species) => s.conservationProgrammes.length },
  ];

  return (
    <section
      ref={ref}
      key={species.map((s) => s.id).join()}
      className={cn('compare-geo', shown && 'is-shown')}
      aria-label="The selected species on one map"
    >
      <figure className="cg-map">
        <svg viewBox={viewBox} className="h-full w-full" role="img" aria-label={`Map comparing where ${species.map((s) => s.commonName).join(', ')} are recorded`}>
          <path d={geo?.all ?? ''} className="cg-country" />
          {systems.map((sys, i) => (
            <g key={sys.s.id} className="cg-system" data-mark={sys.mark} style={{ ['--k' as string]: i }}>
              <path d={sys.outline} className="cg-outline" />
              <GeoLine d={sys.thread} role="thread" className="cg-thread" />
              {sys.s.distributionPoints.map((p) => {
                const [x, y] = project(p.lng, p.lat);
                return <circle key={p.label} cx={x} cy={y} r="4" className="cg-point" />;
              })}
              <g transform={`translate(${sys.anchor[0]} ${sys.anchor[1]})`} className="cg-anchor">
                <circle r="11" />
                <text y="4">{sys.mark}</text>
              </g>
            </g>
          ))}
        </svg>
        <figcaption className="mt-3 text-label text-canvas/50">
          {shared.length > 0
            ? `Shared ground — recorded in all ${species.length}: ${shared.join(', ')}.`
            : species.length > 1
              ? `No state or UT is recorded for all ${species.length}: their ground does not overlap.`
              : 'Add another species to compare their ground.'}{' '}
          Outlines are states of record, not ranges; lines join each species&rsquo; localities.
        </figcaption>
      </figure>

      <div className="cg-side">
        <ul className="cg-key">
          {systems.map((sys) => (
            <li key={sys.s.id} data-mark={sys.mark} className="cg-key-row">
              <svg viewBox="0 0 40 10" className="cg-swatch" aria-hidden="true">
                <line x1="1" y1="5" x2="39" y2="5" />
              </svg>
              <span className="cg-letter">{sys.mark}</span>
              <span>
                <Link to={`/species/${sys.s.id}`} className="text-link" data-geo={`${sys.s.distributionPoints[0].lng},${sys.s.distributionPoints[0].lat}`}>
                  {sys.s.commonName}
                </Link>
                <span className="block text-label" style={{ color: STATUS_INFO[sys.s.status].colorVar }}>
                  {STATUS_INFO[sys.s.status].name}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <dl className="cg-measures">
          {measures.map((m) => {
            const values = species.map(m.value);
            const max = Math.max(1, ...values);
            return (
              <div key={m.label} className="cg-measure">
                <dt className="caps">{m.label}</dt>
                {systems.map((sys, i) => (
                  <dd key={sys.s.id} data-mark={sys.mark} className="cg-bar-row">
                    <span className="cg-letter" aria-hidden="true">
                      {sys.mark}
                    </span>
                    <span className="cg-bar-track" aria-hidden="true">
                      <span className="cg-bar" style={{ ['--v' as string]: values[i] / max, ['--k' as string]: i }} />
                    </span>
                    <span className="tabular-nums">
                      <span className="sr-only">{sys.s.commonName}: </span>
                      {values[i]}
                    </span>
                  </dd>
                ))}
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}
