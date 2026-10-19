import { useRef } from 'react';
import { SPECIES } from '../../data/species';
import { STATUS_INFO, THREATENED_ORDER } from '../../data/statusInfo';
import { useSectionProgress } from '../../interaction/sectionProgress';
import { countByStatus } from '../../utils/stats';
import { InteractiveStat } from './InteractiveStat';

/**
 * The twelve species as twelve slots, in Red List order, each lit in its
 * category's colour as the ledger comes up the screen; under them, the count
 * of each category, in columns as wide as the slots they stand for. The strip
 * is the same device Chapter 04 uses for its threats, so the two read as one
 * language. Every number is counted from the dataset.
 */
export function StatusLedger() {
  const ref = useRef<HTMLDivElement>(null);
  useSectionProgress(ref);
  const counts = countByStatus();
  const present = THREATENED_ORDER.map((code) => ({ code, n: counts[code] })).filter((g) => g.n > 0);
  const groups = present.map((g, i) => ({ ...g, first: present.slice(0, i).reduce((sum, p) => sum + p.n, 0) }));
  return (
    <div ref={ref} className="status-ledger max-w-3xl border-t border-canvas/10 pt-8">
      <div className="status-strip" style={{ gridTemplateColumns: groups.map((g) => `${g.n}fr`).join(' ') }} aria-hidden="true">
        {groups.map((g) => (
          <span key={g.code} className="status-strip-group" style={{ ['--c' as string]: STATUS_INFO[g.code].colorVar }}>
            {Array.from({ length: g.n }, (_, k) => (
              <span key={k} className="status-slot" style={{ ['--i' as string]: g.first + k }} />
            ))}
          </span>
        ))}
      </div>
      <div className="mt-6 grid gap-x-6" style={{ gridTemplateColumns: groups.map((g) => `${g.n}fr`).join(' ') }}>
        {groups.map((g) => (
          <InteractiveStat
            key={g.code}
            size="md"
            value={g.n}
            label={STATUS_INFO[g.code].name}
            note={`of the ${SPECIES.length} species in the atlas`}
            color={STATUS_INFO[g.code].colorVar}
          />
        ))}
      </div>
    </div>
  );
}
