import { Link } from 'react-router-dom';
import { totalSpecies } from '../../utils/stats';

const EXPLORE = [
  { to: '/atlas', label: 'Interactive map' },
  { to: '/species', label: 'Species directory' },
  { to: '/conservation', label: 'Conservation & status' },
  { to: '/sources', label: 'Sources & references' },
];

export function Footer() {
  return (
    <footer className="mt-4 border-t border-forest-800 bg-forest-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-14">
        <div className="grid gap-10 sm:grid-cols-3 sm:gap-8">
          <div>
            <p className="font-serif text-base font-semibold text-canvas">India Species Atlas</p>
            <p className="mt-2.5 max-w-xs text-sm leading-relaxed text-canvas/60">
              An educational project mapping {totalSpecies} threatened species across India — their habitats,
              the pressures they face and the conservation efforts protecting them.
            </p>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-forest-400">Explore</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {EXPLORE.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-canvas/70 underline decoration-transparent underline-offset-4 transition-colors hover:text-canvas hover:decoration-forest-500"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-forest-400">
              About the data
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-canvas/60">
              Conservation status follows the IUCN Red List (via BirdLife International for birds). Map
              locations are simplified educational representations, not exact population boundaries. Every
              species entry lists its sources, and every photograph its photographer and licence.
            </p>
          </div>
        </div>
        <p className="mt-10 border-t border-forest-800 pt-6 text-xs leading-relaxed text-canvas/45">
          Student project for an environmental-studies / CAI assignment. Basemap &copy; OpenStreetMap
          contributors. Species photographs by their individual photographers, used under Creative Commons
          licences via Wikimedia Commons. Not affiliated with the IUCN or the Government of India.
        </p>
      </div>
    </footer>
  );
}
