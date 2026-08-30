import { RotateCcw } from 'lucide-react';
import type { HabitatId, RegionId } from '../../types';
import { STATUS_INFO, THREATENED_ORDER } from '../../data/statusInfo';
import { HABITAT_LABELS, REGIONS } from '../../data/regions';
import type { useSpeciesFilters } from '../../hooks/useSpeciesFilters';

type Filters = ReturnType<typeof useSpeciesFilters>;

function CheckRow({
  checked,
  onChange,
  label,
  swatch,
  hint,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  swatch?: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-md px-1.5 py-1.5 text-sm hover:bg-forest-800/60">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-forest-600 bg-forest-900 accent-forest-500"
      />
      <span className="flex-1">
        <span className="flex items-center gap-1.5 text-canvas/85">
          {swatch && (
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: swatch }} />
          )}
          {label}
        </span>
        {hint && <span className="block text-xs text-canvas/45">{hint}</span>}
      </span>
    </label>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-forest-700/60 py-3 first:border-t-0 first:pt-0">
      <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-forest-300">{title}</legend>
      {children}
    </fieldset>
  );
}

export function FilterPanel({ filters }: { filters: Filters }) {
  const { filters: state, activeCount, reset, toggleStatus, toggleRegion, toggleHabitat } = filters;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-canvas">Filters</h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 text-xs text-forest-300 hover:text-forest-100"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            Reset ({activeCount})
          </button>
        )}
      </div>

      <Group title="Conservation status">
        {THREATENED_ORDER.map((code) => (
          <CheckRow
            key={code}
            checked={state.statuses.includes(code)}
            onChange={() => toggleStatus(code)}
            label={`${STATUS_INFO[code].name} (${code})`}
            swatch={STATUS_INFO[code].colorVar}
          />
        ))}
      </Group>

      <Group title="Region">
        {REGIONS.map((r) => (
          <CheckRow
            key={r.id}
            checked={state.regions.includes(r.id as RegionId)}
            onChange={() => toggleRegion(r.id)}
            label={r.name}
          />
        ))}
      </Group>

      <Group title="Habitat">
        {(Object.keys(HABITAT_LABELS) as HabitatId[]).map((h) => (
          <CheckRow
            key={h}
            checked={state.habitats.includes(h)}
            onChange={() => toggleHabitat(h)}
            label={HABITAT_LABELS[h]}
          />
        ))}
      </Group>
    </div>
  );
}
