import { Link } from 'react-router-dom';
import { totalSpecies } from '../../utils/stats';

const LINKS = [
  { to: '/atlas', label: 'Map' },
  { to: '/species', label: 'Species' },
  { to: '/compare', label: 'Compare' },
  { to: '/conservation', label: 'Conservation' },
  { to: '/about', label: 'About' },
  { to: '/sources', label: 'Sources' },
  { to: '/documentary', label: 'Documentary mode' },
];

export function Footer() {
  return (
    <footer className="site-footer border-t border-canvas/[0.08]">
      <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-serif text-[1.15rem] text-canvas">India Species Atlas</p>
            <p className="mt-2 max-w-md text-[13px] leading-relaxed text-canvas/50">
              An educational project mapping {totalSpecies} threatened species across India. Status follows the IUCN
              Red List (via BirdLife International for birds). Map locations are indicative localities, not range
              boundaries.
            </p>
          </div>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
              {LINKS.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="footer-link">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <p className="mt-10 text-[11px] leading-relaxed text-canvas/35">
          Student project for an environmental-studies / CAI assignment. Basemap &copy; OpenStreetMap contributors.
          Species photographs by their individual photographers, used under Creative Commons licences via Wikimedia
          Commons. Not affiliated with the IUCN or the Government of India.
        </p>
      </div>
    </footer>
  );
}
