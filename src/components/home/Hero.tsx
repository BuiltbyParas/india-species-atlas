import { Link } from 'react-router-dom';
import { ArrowRight, MapPinned } from 'lucide-react';
import { buttonClasses } from '../ui/buttonClasses';
import { HeroStage } from './HeroScrollScene';

export function Hero() {
  return (
    <HeroStage>
      <p className="inline-flex items-center gap-2 rounded-full border border-forest-700 bg-forest-900/60 px-3 py-1 text-xs font-medium text-forest-200 backdrop-blur-sm">
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
          className={buttonClasses('primary', 'md', 'px-5 py-3')}
        >
          Explore the Map
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link
          to="/about"
          className={buttonClasses('secondary', 'md', 'border-forest-600 bg-forest-950/40 px-5 py-3 backdrop-blur-sm')}
        >
          Learn About the Project
        </Link>
      </div>
    </HeroStage>
  );
}
