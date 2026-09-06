import { Link } from 'react-router-dom';
import { ArrowRight, MapPinned } from 'lucide-react';
import { HeroScrollScene } from './HeroScrollScene';

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-forest-800 bg-forest-950">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-forest-700 bg-forest-900/60 px-3 py-1 text-xs font-medium text-forest-200">
            <MapPinned className="h-3.5 w-3.5" aria-hidden="true" />
            Interactive biodiversity atlas
          </p>
          <h1 className="mt-5 font-serif text-4xl font-semibold leading-[1.1] text-canvas sm:text-5xl lg:text-6xl">
            India Species Atlas
          </h1>
          <p className="mt-3 text-lg font-medium text-forest-200 sm:text-xl">
            Mapping Endangered Species and Their Conservation Status in India
          </p>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-canvas/70">
            Explore where India&rsquo;s threatened species live, the pressures they face, and the conservation
            efforts protecting them — on an interactive map, backed by IUCN Red List assessments and
            government conservation programmes.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/atlas"
              className="inline-flex items-center gap-2 rounded-lg bg-forest-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-forest-400"
            >
              Explore the Map
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 rounded-lg border border-forest-600 px-5 py-3 text-sm font-semibold text-canvas transition hover:bg-forest-900"
            >
              Learn About the Project
            </Link>
          </div>
        </div>

        <HeroScrollScene />
      </div>
    </section>
  );
}
