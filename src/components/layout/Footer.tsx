import { Link } from 'react-router-dom';
import { totalSpecies } from '../../utils/stats';

export function Footer() {
  return (
    <footer className="border-t border-forest-800 bg-forest-950">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <p className="font-serif text-base font-semibold text-canvas">India Species Atlas</p>
            <p className="mt-2 max-w-xs text-sm text-canvas/60">
              An educational project mapping {totalSpecies} threatened species across India — their habitats,
              the pressures they face and the conservation efforts protecting them.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest-400">Explore</p>
            <ul className="mt-2 space-y-1.5 text-sm text-canvas/70">
              <li><Link to="/atlas" className="hover:text-canvas">Interactive map</Link></li>
              <li><Link to="/species" className="hover:text-canvas">Species directory</Link></li>
              <li><Link to="/conservation" className="hover:text-canvas">Conservation &amp; status</Link></li>
              <li><Link to="/sources" className="hover:text-canvas">Sources &amp; references</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest-400">About the data</p>
            <p className="mt-2 text-sm text-canvas/60">
              Conservation status follows the IUCN Red List (via BirdLife International for birds). Map
              locations are simplified educational representations, not exact population boundaries. Every
              species entry lists its sources.
            </p>
          </div>
        </div>
        <p className="mt-8 border-t border-forest-800 pt-6 text-xs text-canvas/45">
          Student project for an environmental-studies / CAI assignment. Basemap &copy; OpenStreetMap
          contributors. Not affiliated with the IUCN or the Government of India.
        </p>
      </div>
    </footer>
  );
}
