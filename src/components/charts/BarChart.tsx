import { PALETTE } from '../../theme';

export interface BarDatum {
  label: string;
  value: number;
  /** Literal colour; defaults to forest green. */
  color?: string;
  /** Optional secondary label under the value. */
  hint?: string;
}

/**
 * A small, dependency-free horizontal bar chart.
 * Renders as a definition list so it is readable by screen readers and in
 * high-contrast mode, with the bars as a visual layer on top.
 */
export function BarChart({
  data,
  unit = '',
  max: maxProp,
  labelWidth = 'minmax(6.5rem,10rem)',
}: {
  data: BarDatum[];
  unit?: string;
  max?: number;
  labelWidth?: string;
}) {
  const max = maxProp ?? Math.max(1, ...data.map((d) => d.value));

  return (
    <dl className="space-y-2.5">
      {data.map((d) => {
        const pct = Math.round((d.value / max) * 100);
        return (
          <div
            key={d.label}
            className="grid items-center gap-3"
            style={{ gridTemplateColumns: `${labelWidth} 1fr auto` }}
          >
            <dt className="truncate text-xs text-canvas/70" title={d.label}>
              {d.label}
            </dt>
            <dd className="h-3 overflow-hidden rounded-full bg-forest-800">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(pct, d.value > 0 ? 4 : 0)}%`, backgroundColor: d.color ?? PALETTE.forest400 }}
              />
            </dd>
            <dd className="tabular-nums text-sm font-semibold text-canvas">
              {d.value}
              {unit && <span className="ml-0.5 text-xs font-normal text-canvas/50">{unit}</span>}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
