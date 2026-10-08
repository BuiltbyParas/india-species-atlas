import { ArrowRight } from 'lucide-react';
import type { Species } from '../../types';
import { REGION_LABELS } from '../../data/regions';
import { SpeciesImage } from '../ui/SpeciesImage';
import { StatusBadge } from '../ui/StatusBadge';
import { PhotoCredit } from '../ui/PhotoCredit';
import { FavouriteButton } from './FavouriteButton';
import { useSpeciesProfile } from './SpeciesProfileProvider';

/**
 * The card carries two actions — open the profile, and save the species — so
 * it cannot be one big `<button>` any more: a button inside a button is
 * invalid, and a screen reader would announce one control where there are
 * two. Instead the common name is the button, and its `::after` is stretched
 * over the whole card so the large click target survives. The save control
 * sits above that layer.
 */
export function SpeciesCard({ species }: { species: Species }) {
  const { open } = useSpeciesProfile();

  return (
    // `data-depth`: the card turns two or three degrees towards the pointer and
    // a light crosses it (interaction/depth.ts, `.depth-card` in index.css).
    <article
      data-depth
      className="depth-card group relative flex flex-col overflow-hidden rounded-xs border border-forest-800 bg-forest-900 text-left transition-[border-color,box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:border-forest-600 hover:shadow-xl hover:shadow-forest-950/60 has-[:focus-visible]:border-forest-500 has-[:focus-visible]:shadow-xl motion-reduce:hover:translate-y-0"
    >
      <div className="relative overflow-hidden">
        <SpeciesImage
          species={species}
          className="h-44 w-full"
          sizes="(min-width: 1280px) 22vw, (min-width: 640px) 45vw, 100vw"
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
        <div className="absolute right-3 top-3 z-20">
          <FavouriteButton species={species} size="sm" className="backdrop-blur-sm" />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 pt-3.5">
        <h3 className="font-serif text-xl font-normal tracking-tight leading-tight text-canvas">
          <button
            type="button"
            onClick={() => open(species.id)}
            data-cursor="Open"
            className="text-left after:absolute after:inset-0 after:z-10 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-400"
          >
            {species.commonName}
          </button>
        </h3>
        <p className="mt-0.5 text-sm italic text-canvas/55">{species.scientificName}</p>
        <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-canvas/70">{species.summary}</p>
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {species.regions.slice(0, 2).map((r) => (
            <span
              key={r}
              className="rounded-xs border border-canvas/10 px-1.5 py-px text-micro text-canvas/60"
            >
              {REGION_LABELS[r]}
            </span>
          ))}
        </div>
        <span
          aria-hidden="true"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-canvas/70 transition-colors group-hover:text-canvas"
        >
          View profile
          <ArrowRight
            className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </span>
        {/* Above the stretched profile button, so the credit's links stay clickable. */}
        <PhotoCredit species={species} className="relative z-20 mt-3 border-t border-canvas/[0.06] pt-2.5" />
      </div>
    </article>
  );
}
