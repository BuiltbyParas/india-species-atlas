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
      className="group relative flex flex-col overflow-hidden rounded-xl border border-forest-800 bg-forest-900 text-left transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-forest-600 hover:shadow-xl hover:shadow-forest-950/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-400 motion-reduce:hover:translate-y-0"
    >
      <div className="relative overflow-hidden">
        <SpeciesImage
          species={species}
          className="h-44 w-full"
          imgClassName="transition-transform duration-500 ease-[var(--ease-emphasis)] group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        {/* Reads the badge over any photograph, and ties the image to the card
            body instead of leaving a hard seam between them. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-forest-900 via-forest-950/20 to-forest-950/55"
        />
        <div className="absolute left-3 top-3">
          <StatusBadge status={species.status} size="sm" className="bg-forest-950/70 backdrop-blur-sm" />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 pt-3.5">
        <h3 className="font-serif text-lg font-semibold leading-tight text-canvas">{species.commonName}</h3>
        <p className="mt-0.5 text-sm italic text-canvas/55">{species.scientificName}</p>
        <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-canvas/70">{species.summary}</p>
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {species.regions.slice(0, 2).map((r) => (
            <span
              key={r}
              className="rounded-full border border-forest-800 bg-forest-800/60 px-2 py-0.5 text-[11px] text-canvas/60"
            >
              {REGION_LABELS[r]}
            </span>
          ))}
        </div>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-forest-300 transition-colors group-hover:text-forest-200">
          View profile
          <ArrowRight
            className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </span>
      </div>
    </button>
  );
}
