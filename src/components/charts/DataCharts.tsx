import type { ReactNode } from 'react';
import { habitatChartData, statusChartData, threatChartData } from '../../utils/stats';
import { STATUS_INFO } from '../../data/statusInfo';
import { PALETTE } from '../../theme';
import { BarChart } from './BarChart';

function ChartFrame({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <figure className="rounded-xl border border-forest-700/70 bg-forest-900 p-5">
      <figcaption className="mb-4">
        <h3 className="font-serif text-base font-semibold text-canvas">{title}</h3>
        {note && <p className="mt-0.5 text-xs text-canvas/55">{note}</p>}
      </figcaption>
      {children}
    </figure>
  );
}

export function StatusChart() {
  const data = statusChartData().map((d) => ({
    label: d.name,
    value: d.value,
    color: d.color,
  }));
  return (
    <ChartFrame title="Species by IUCN status" note="Counts from this atlas’ 12-species selection.">
      <BarChart data={data} unit=" species" labelWidth="minmax(7rem,12rem)" />
      <div className="mt-4 flex gap-4 border-t border-forest-800 pt-3 text-xs text-canvas/55">
        {statusChartData().map((d) => (
          <span key={d.code} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: STATUS_INFO[d.code].hex }} />
            {d.code}
          </span>
        ))}
      </div>
    </ChartFrame>
  );
}

export function HabitatChart() {
  const data = habitatChartData().map((d) => ({ label: d.name, value: d.value, color: PALETTE.forest400 }));
  return (
    <ChartFrame title="Species by habitat" note="A species can use more than one habitat, so totals overlap.">
      <BarChart data={data} unit=" species" />
    </ChartFrame>
  );
}

export function ThreatChart() {
  const data = threatChartData().map((d) => ({ label: d.name, value: d.value, color: PALETTE.clay }));
  return (
    <ChartFrame
      title="How many species face each threat"
      note="Species in this atlas for which each pressure is listed as a major threat."
    >
      <BarChart data={data} unit=" species" />
    </ChartFrame>
  );
}

/** Grouped panels. `full` adds the threats chart. */
export default function ChartsPanel({ variant = 'mini' }: { variant?: 'mini' | 'full' }) {
  return (
    <div className={variant === 'full' ? 'grid gap-5 lg:grid-cols-3' : 'grid gap-5 md:grid-cols-2'}>
      <StatusChart />
      <HabitatChart />
      {variant === 'full' && <ThreatChart />}
    </div>
  );
}
