import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { SPECIES } from '../../data/species';
import { SectionHeading } from '../ui/SectionHeading';
import { SpeciesCard } from '../species/SpeciesCard';

const FEATURED_IDS = ['great-indian-bustard', 'bengal-tiger', 'ganges-river-dolphin', 'snow-leopard'];

export function FeaturedSpecies() {
  const featured = FEATURED_IDS.map((id) => SPECIES.find((s) => s.id === id)).filter(
    (s): s is (typeof SPECIES)[number] => Boolean(s),
  );

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          eyebrow="From the atlas"
          title="Featured species"
          description="A cross-section of India’s threatened wildlife — from the desert grasslands to the high Himalaya and the rivers in between."
        />
        <Link to="/species" className="inline-flex items-center gap-1 text-sm font-medium text-forest-300 hover:text-forest-100">
          All species
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {featured.map((s) => (
          <SpeciesCard key={s.id} species={s} />
        ))}
      </div>
    </section>
  );
}
