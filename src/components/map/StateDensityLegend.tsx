import { DENSITY_STEPS, densityOpacity } from '../../utils/stateCounts';
import { PALETTE } from '../../theme';

export function StateDensityLegend({ max }: { max: number }) {
  const steps = Array.from({ length: DENSITY_STEPS }, (_, i) => i + 1);

  return (
    <div className="sheet text-xs">
      <p className="mb-2 caps">
        Atlas species per state
      </p>
      <div className="flex items-center gap-2">
        <span className="text-canvas/60">{max > 0 ? 1 : 0}</span>
        <div className="flex h-4 flex-1 overflow-hidden rounded-sm border border-forest-700">
          {steps.map((s) => (
            <span
              key={s}
              className="flex-1"
              style={{ backgroundColor: PALETTE.forest400, opacity: densityOpacity(s) }}
              aria-hidden="true"
            />
          ))}
        </div>
        <span className="text-canvas/60">{max}</span>
      </div>
      <p className="mt-2 text-canvas/70">
        Shading counts the species in the current selection that are recorded in each state, not the number
        of pins. Hover or focus a state to read its count as a number — the shade is a summary, not the
        value.
      </p>
      <p className="mt-1.5 text-canvas/62">
        India is drawn as on its political map: Jammu &amp; Kashmir is one territory with Ladakh, so records for
        Ladakh are counted and listed there.
      </p>
    </div>
  );
}
