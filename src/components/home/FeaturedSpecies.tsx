import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { SPECIES } from '../../data/species';
import { SectionHeading } from '../ui/SectionHeading';
import { SpeciesCard } from '../species/SpeciesCard';
import { SpeciesGallery } from '../species/SpeciesGallery';

/** Shown when the 3D gallery cannot run — a readable cross-section, not all twelve. */
const FALLBACK_IDS = ['great-indian-bustard', 'bengal-tiger', 'ganges-river-dolphin', 'snow-leopard'];

/**
 * The twelve species, as a ring of photographic cards.
 *
 * This is where the landing page stops describing the atlas and starts showing
 * it. The gallery only builds its WebGL context once it is scrolled near, so
 * the hero — which has a scene of its own further up the page — never has to
 * share the GPU with it.
 */
export function FeaturedSpecies() {
  const fallback = (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {FALLBACK_IDS.map((id) => SPECIES.find((s) => s.id === id))
        .filter((s): s is (typeof SPECIES)[number] => Boolean(s))
        .map((s) => (
          <SpeciesCard key={s.id} species={s} />
        ))}
    </div>
  );

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          eyebrow="The selection"
          title="Twelve species, in the round"
          description="Photographs of every species in the atlas, mounted as cards you can turn. Drag the ring, or click a card at the edge to bring it forward."
        />
        <Link
          to="/species"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-forest-300 underline decoration-transparent underline-offset-4 transition-colors hover:text-forest-200 hover:decoration-forest-500"
        >
          Open the directory
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-9 lg:mx-auto lg:max-w-5xl">
        <SpeciesGallery species={SPECIES} fallback={fallback} />
      </div>
    </section>
  );
}
