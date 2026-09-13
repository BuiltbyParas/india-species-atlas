import { PawPrint, ShieldCheck, TriangleAlert } from 'lucide-react';
import type { ConservationMode } from '../../types';
import { cn } from '../../utils/cn';

const MODES: Array<{ id: ConservationMode; label: string; icon: typeof PawPrint; hint: string }> = [
  { id: 'species', label: 'Species', icon: PawPrint, hint: 'Where each species occurs' },
  { id: 'threats', label: 'Threats', icon: TriangleAlert, hint: 'Markers coloured by main threat' },
  { id: 'conservation', label: 'Conservation', icon: ShieldCheck, hint: 'Sites linked to programmes' },
];

export function ModeSwitch({
  mode,
  onChange,
}: {
  mode: ConservationMode;
  onChange: (m: ConservationMode) => void;
}) {
  return (
    <div>
      <div
        role="tablist"
        aria-label="Map mode"
        className="inline-flex rounded-lg border border-forest-700 bg-forest-900 p-1"
      >
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = m.id === mode;
          return (
            <button
              key={m.id}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => onChange(m.id)}
              className={cn(
                'inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition sm:min-h-0',
                active ? 'bg-forest-600 text-white' : 'text-canvas/65 hover:text-canvas',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {m.label}
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-xs text-canvas/50">{MODES.find((m) => m.id === mode)?.hint}</p>
    </div>
  );
}
