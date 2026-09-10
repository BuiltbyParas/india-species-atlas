import { STATUS_INFO } from '../../data/statusInfo';
import {
  conservationRegionCount,
  countByStatus,
  endemicCount,
  statesCovered,
  totalSpecies,
} from '../../utils/stats';

export function StatsSection() {
  const byStatus = countByStatus();
  const stats = [
    { label: 'Species in the atlas', value: totalSpecies, note: 'chosen for range, not for number' },
    { label: STATUS_INFO.CR.name, value: byStatus.CR, note: 'IUCN category CR', color: STATUS_INFO.CR.colorVar },
    { label: STATUS_INFO.EN.name, value: byStatus.EN, note: 'IUCN category EN', color: STATUS_INFO.EN.colorVar },
    { label: STATUS_INFO.VU.name, value: byStatus.VU, note: 'IUCN category VU', color: STATUS_INFO.VU.colorVar },
    { label: 'Ecological regions', value: conservationRegionCount, note: 'covered by the selection' },
    { label: 'States & UTs', value: statesCovered().length, note: `${endemicCount()} species endemic to India` },
  ];

  return (
    <section
      className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-16"
      aria-label="The atlas in numbers"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-forest-800 bg-forest-900 p-4 transition-colors duration-200 hover:border-forest-700"
          >
            <p
              className="font-serif text-3xl font-semibold tabular-nums leading-none text-canvas"
              style={s.color ? { color: s.color } : undefined}
            >
              {s.value}
            </p>
            <p className="mt-2 text-sm font-medium leading-snug text-canvas/85">{s.label}</p>
            <p className="mt-0.5 text-xs leading-snug text-canvas/45">{s.note}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-canvas/45">
        Every figure is computed from the dataset at runtime — none is written by hand.
      </p>
    </section>
  );
}
