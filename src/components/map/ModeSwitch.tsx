import { PawPrint, ShieldCheck, TriangleAlert } from 'lucide-react';
import type { ConservationMode } from '../../types';
import { cn } from '../../utils/cn';
import { useTabKeys } from '../ui/useTabKeys';

const MODES: Array<{ id: ConservationMode; label: string; icon: typeof PawPrint; hint: string }> = [
  { id: 'species', label: 'Species', icon: PawPrint, hint: 'Where each species occurs' },
  { id: 'threats', label: 'Threats', icon: TriangleAlert, hint: 'Markers coloured by main threat' },
  { id: 'conservation', label: 'Conservation', icon: ShieldCheck, hint: 'Sites linked to programmes' },
];

const MODE_IDS = MODES.map((m) => m.id);

export function ModeSwitch({
  mode,
  onChange,
  panelId,
}: {
  mode: ConservationMode;
  onChange: (m: ConservationMode) => void;
  /** The element the tabs switch: the map. */
  panelId?: string;
}) {
  const tab = useTabKeys(MODE_IDS, mode, onChange);
  return (
    <div>
      <div
        role="tablist"
        aria-label="Map mode"
        // The three tabs share the row and wrap onto a second only on the narrowest phones, never past the column.
        className="flex max-w-full flex-wrap rounded-xs border border-canvas/15 p-1 sm:inline-flex"
      >
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = m.id === mode;
          return (
            <button
              data-magnetic="0.18"
              key={m.id}
              {...tab(m.id)}
              aria-controls={panelId}
              type="button"
              onClick={() => onChange(m.id)}
              className={cn(
                'inline-flex min-h-11 flex-auto items-center justify-center gap-1.5 rounded-xs px-3 py-1.5 text-sm font-medium transition sm:min-h-0 sm:flex-none',
                active ? 'bg-canvas text-ink' : 'text-canvas/65 hover:text-canvas',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {m.label}
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-xs text-canvas/70">{MODES.find((m) => m.id === mode)?.hint}</p>
    </div>
  );
}
