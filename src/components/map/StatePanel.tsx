import { MapPin, X } from 'lucide-react';
import { SPECIES } from '../../data/species';
import { StatusBadge } from '../ui/StatusBadge';
import { useSpeciesProfile } from '../species/SpeciesProfileProvider';

export function StatePanel({
  state,
  onClear,
}: {
  state: string;
  onClear: () => void;
}) {
  const { open } = useSpeciesProfile();
  const list = SPECIES.filter((s) => s.states.includes(state));

  return (
    <div className="rounded-lg border border-forest-700/70 bg-forest-900 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-forest-300">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            Selected state / UT
          </p>
          <h3 className="font-serif text-xl font-semibold text-canvas">{state}</h3>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded-md p-1 text-canvas/60 hover:bg-forest-800 hover:text-canvas"
          aria-label="Clear state selection"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {list.length === 0 ? (
        <p className="mt-3 text-sm text-canvas/60">
          No species in this small atlas selection are mapped to {state}. Try another state, or clear the
          selection to see the whole country.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-canvas/65">
            {list.length} species in this atlas {list.length === 1 ? 'occurs' : 'occur'} in {state}:
          </p>
          <ul className="mt-2 divide-y divide-forest-800">
            {list.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => open(s.id)}
                  className="flex w-full items-center justify-between gap-3 py-2 text-left hover:text-forest-200"
                >
                  <span>
                    <span className="block text-sm font-medium text-canvas">{s.commonName}</span>
                    <span className="block text-xs italic text-canvas/50">{s.scientificName}</span>
                  </span>
                  <StatusBadge status={s.status} size="sm" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
