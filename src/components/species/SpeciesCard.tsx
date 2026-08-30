import { ArrowRight } from 'lucide-react';
import type { Species } from '../../types';
import { REGION_LABELS } from '../../data/regions';
import { SpeciesImage } from '../ui/SpeciesImage';
import { StatusBadge } from '../ui/StatusBadge';
import { useSpeciesProfile } from './SpeciesProfileProvider';

export function SpeciesCard({ species }: { species: Species }) {
  const { open } = useSpeciesProfile();

  return (
    <button
      type="button"
      onClick={() => open(species.id)}
      className="group flex flex-col overflow-hidden rounded-xl border border-forest-700/70 bg-forest-900 text-left transition hover:border-forest-500 hover:shadow-lg hover:shadow-forest-950/50 focus-visible:border-forest-400"
    >
      <div className="relative">
        <SpeciesImage species={species} className="h-40 w-full" />
        <div className="absolute left-3 top-3">
          <StatusBadge status={species.status} size="sm" />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-serif text-lg font-semibold leading-tight text-canvas">{species.commonName}</h3>
        <p className="text-sm italic text-canvas/55">{species.scientificName}</p>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-canvas/70">{species.summary}</p>
        <div className="mt-3 flex flex-wrap gap-1">
          {species.regions.slice(0, 2).map((r) => (
            <span key={r} className="rounded-full bg-forest-800 px-2 py-0.5 text-[11px] text-canvas/60">
              {REGION_LABELS[r]}
            </span>
          ))}
        </div>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-forest-300 group-hover:gap-2">
          View profile
          <ArrowRight className="h-4 w-4 transition-all" aria-hidden="true" />
        </span>
      </div>
    </button>
  );
}
