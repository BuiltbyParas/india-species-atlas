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
    { label: 'Featured species', value: totalSpecies, note: 'in this atlas selection' },
    { label: STATUS_INFO.CR.name, value: byStatus.CR, note: 'CR', color: STATUS_INFO.CR.colorVar },
    { label: STATUS_INFO.EN.name, value: byStatus.EN, note: 'EN', color: STATUS_INFO.EN.colorVar },
    { label: STATUS_INFO.VU.name, value: byStatus.VU, note: 'VU', color: STATUS_INFO.VU.colorVar },
    { label: 'Ecological regions', value: conservationRegionCount, note: 'mapped' },
    { label: 'States & UTs', value: statesCovered().length, note: `incl. ${endemicCount()} India-endemic species` },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6" aria-label="Atlas statistics">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-forest-700/70 bg-forest-900 p-4">
            <p
              className="font-serif text-3xl font-semibold text-canvas"
              style={s.color ? { color: s.color } : undefined}
            >
              {s.value}
            </p>
            <p className="mt-1 text-sm font-medium text-canvas/80">{s.label}</p>
            <p className="text-xs text-canvas/45">{s.note}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-canvas/45">
        All figures are computed directly from the atlas dataset.
      </p>
    </section>
  );
}
