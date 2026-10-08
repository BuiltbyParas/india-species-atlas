import { useMemo, useRef, useState } from 'react';
import type { Species } from '../../types';
import { SPECIES } from '../../data/species';
import { STATUS_INFO } from '../../data/statusInfo';
import { formatDeg, MAP_HEIGHT, MAP_VIEWBOX, MAP_WIDTH, project, useIndiaGeo } from '../../geo/india';
import { GeoLine } from '../../geo/line/GeoLine';
import { useInView } from '../../motion/useInView';
import { cn } from '../../utils/cn';

const ANCHORS = SPECIES.map((s) => {
  const a = s.distributionPoints[0];
  const [x, y] = project(a.lng, a.lat);
  return { s, a, left: (x / MAP_WIDTH) * 100, top: (y / MAP_HEIGHT) * 100 };
});

/**
 * Pairs worth starting from, read off the record: the species that share the
 * most states of record. Nothing is judged "interesting" by hand.
 */
function sharedPairs(limit: number) {
  const pairs: Array<{ a: Species; b: Species; shared: number }> = [];
  for (let i = 0; i < SPECIES.length; i++) {
    for (let j = i + 1; j < SPECIES.length; j++) {
      const a = SPECIES[i];
      const b = SPECIES[j];
      const shared = a.states.filter((st) => b.states.includes(st)).length;
      if (shared > 0) pairs.push({ a, b, shared });
    }
  }
  return pairs.sort((p, q) => q.shared - p.shared).slice(0, limit);
}

/**
 * The empty comparison: not a blank box, but the sheet itself. Every
 * species' anchor locality is a survey mark; choosing one starts a
 * comparison, and the readout says what it is before you commit.
 */
export function CompareChooser({ onPick }: { onPick: (ids: string[]) => void }) {
  const geo = useIndiaGeo();
  const ref = useRef<HTMLDivElement>(null);
  const shown = useInView(ref, { rootMargin: '0px 0px -10% 0px' });
  const [hover, setHover] = useState<number | null>(null);
  const pairs = useMemo(() => sharedPairs(3), []);
  const h = hover === null ? null : ANCHORS[hover];

  return (
    <div ref={ref} className={cn('compare-chooser mt-10 grid gap-10 lg:grid-cols-12', shown && 'is-shown')}>
      <div className="lg:col-span-7">
        <div className="cc-sheet" style={{ aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}` }}>
          {geo && (
            <svg viewBox={MAP_VIEWBOX} className="absolute inset-0 h-full w-full" aria-hidden="true">
              <GeoLine d={geo.all} role="survey" className="cc-country" />
            </svg>
          )}
          <ul aria-label="Start a comparison from a species">
            {ANCHORS.map(({ s, left, top }, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={cn('cc-mark', hover === i && 'is-hot')}
                  data-status={s.status}
                  style={{ left: `${left}%`, top: `${top}%`, ['--i' as string]: i }}
                  onPointerEnter={() => setHover(i)}
                  onPointerLeave={() => setHover((v) => (v === i ? null : v))}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover((v) => (v === i ? null : v))}
                  onClick={() => onPick([s.id])}
                  aria-label={`Compare ${s.commonName}, ${STATUS_INFO[s.status].name}`}
                  data-cursor="Compare"
                >
                  <span aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
        <p className="cc-readout mt-4 min-h-[2.6em] text-small text-canvas/55" aria-hidden="true">
          {h ? (
            <>
              <span className="font-serif text-[1.15em] text-canvas">{h.s.commonName}</span>
              <span className="mx-2 text-canvas/30">·</span>
              {h.s.status}
              <span className="mx-2 text-canvas/30">·</span>
              <span className="tabular-nums">
                {h.a.label.split(',')[0]} {formatDeg(h.a.lat, 'lat')} {formatDeg(h.a.lng, 'lng')}
              </span>
            </>
          ) : (
            <>Each mark is a species&rsquo; anchor locality. Choose one to begin.</>
          )}
        </p>
      </div>

      <div className="lg:col-span-5 lg:pt-6">
        <p className="caps">Or begin from shared ground</p>
        <p className="mt-2 max-w-sm text-small text-canvas/55">
          The pairs recorded in the most of the same states, read from the dataset.
        </p>
        <ul className="mt-6 border-t border-canvas/10">
          {pairs.map(({ a, b, shared }) => (
            <li key={a.id + b.id} className="border-b border-canvas/10">
              <button type="button" className="cc-pair" onClick={() => onPick([a.id, b.id])} data-cursor="Compare">
                <span className="font-serif text-[1.2rem] font-light text-canvas">
                  {a.commonName} <span className="cc-pair-rule" aria-hidden="true" /> {b.commonName}
                </span>
                <span className="text-micro tabular-nums text-canvas/45">
                  {shared} shared {shared === 1 ? 'state' : 'states'} of record
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
