import type { ConservationMode } from '../../types';
import { statusLegend, threatLegend } from './markerLegends';

export function MapLegend({ mode }: { mode: ConservationMode }) {
  return (
    <div className="rounded-lg border border-forest-700/70 bg-forest-900/95 p-3 text-xs">
      <p className="mb-2 font-semibold uppercase tracking-[0.14em] text-forest-300">Legend</p>

      {mode === 'species' && (
        <ul className="space-y-1.5">
          {statusLegend.map((s) => (
            <li key={s.code} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="grid h-4 w-4 place-items-center rounded-full text-[8px] font-bold text-ink"
                style={{ background: s.color }}
              >
                {s.code}
              </span>
              <span className="text-canvas/80">
                <span className="font-semibold">{s.code}</span> — {s.label}
              </span>
            </li>
          ))}
          <li className="pt-1 text-canvas/50">Each pin is an indicative location within a known range.</li>
        </ul>
      )}

      {mode === 'threats' && (
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {threatLegend.map((t) => (
            <li key={t.id} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="grid h-4 w-4 shrink-0 place-items-center rounded-full text-[7px] font-bold text-ink"
                style={{ background: t.color }}
              >
                {t.abbr}
              </span>
              <span className="text-canvas/80">{t.label}</span>
            </li>
          ))}
          <li className="col-span-full pt-1 text-canvas/50">
            Pin shows the species’ most prominent threat; open a profile for the full list.
          </li>
        </ul>
      )}

      {mode === 'conservation' && (
        <ul className="space-y-1.5">
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="grid h-4 w-4 place-items-center rounded-full bg-forest-400 text-[9px] text-ink">
              ✦
            </span>
            <span className="text-canvas/80">Species with a linked government / partner programme</span>
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="grid h-4 w-4 place-items-center rounded-full bg-forest-200 text-[9px] text-ink">
              ✦
            </span>
            <span className="text-canvas/80">Other threatened species at this site</span>
          </li>
          <li className="pt-1 text-canvas/50">Open a profile to see specific programmes and protected areas.</li>
        </ul>
      )}
    </div>
  );
}
