import type { ConservationMode } from '../../types';
import { statusLegend, threatLegend } from './markerLegends';

export function MapLegend({ mode, threads = false }: { mode: ConservationMode; threads?: boolean }) {
  return (
    <div className="sheet text-xs">
      <p className="mb-3 caps">Legend</p>

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
          <li className="pt-1 text-canvas/50">Each marker is an indicative locality within a known range.</li>
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

      {threads && (
        <p className="mt-3 flex items-start gap-2 text-canvas/60">
          <svg viewBox="0 0 24 8" className="mt-1 h-2 w-6 shrink-0" aria-hidden="true">
            <path d="M1 6 C 8 1, 15 7, 23 2" fill="none" stroke="var(--color-canvas)" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span>
            Threads join one species&rsquo; localities, in its status colour, and break where they are more than 5°
            apart. A reading device, not a range or a corridor.
          </span>
        </p>
      )}

      <p className="mt-3 border-t border-canvas/[0.08] pt-3 text-canvas/45">
        Not drawn: protected-area boundaries, forest cover and transmission lines. The atlas holds no openly licensed,
        sourced dataset for them yet; programme sites are marked at species&rsquo; anchor localities instead.
      </p>
    </div>
  );
}
