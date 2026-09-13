import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, Shuffle, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { buttonClasses } from '../ui/buttonClasses';
import { useSpeciesProfile } from '../species/SpeciesProfileProvider';

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/atlas', label: 'Explore Map' },
  { to: '/species', label: 'Species' },
  { to: '/compare', label: 'Compare' },
  { to: '/conservation', label: 'Conservation' },
  { to: '/about', label: 'About' },
  { to: '/sources', label: 'Sources' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { openRandom } = useSpeciesProfile();

  return (
    <header className="sticky top-0 z-[900] border-b border-forest-800/80 bg-forest-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest-400"
        >
          <span
            aria-hidden="true"
            className="grid h-8 w-8 place-items-center rounded-md bg-forest-800 ring-1 ring-inset ring-forest-700/70"
          >
            <svg viewBox="0 0 64 64" className="h-5 w-5">
              <path d="M32 12c-7 6-11 12-11 20a11 11 0 0 0 22 0c0-8-4-14-11-20z" fill="#5aa47e" />
              <circle cx="32" cy="34" r="4" fill="#0a1710" />
            </svg>
          </span>
          <span className="leading-tight">
            <span className="block font-serif text-sm font-semibold text-canvas">India Species Atlas</span>
            <span className="block text-[10px] uppercase tracking-[0.16em] text-forest-400">
              Threatened wildlife &amp; conservation
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn(
                  // The active tab is marked by a rule under it rather than a
                  // filled pill: quieter, and it leaves the row reading as one
                  // line of navigation instead of a strip of buttons.
                  'relative rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  'after:pointer-events-none after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-forest-400 after:transition-transform after:duration-200 after:content-[""]',
                  isActive
                    ? 'text-canvas after:scale-x-100'
                    : 'text-canvas/60 after:scale-x-0 hover:bg-forest-800/50 hover:text-canvas',
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={openRandom}
            className={buttonClasses('secondary', 'sm', 'ml-2 border-forest-700 text-forest-200')}
          >
            <Shuffle className="h-4 w-4" aria-hidden="true" />
            Discover a species
          </button>
        </nav>

        <button
          type="button"
          className="rounded-md p-2 text-canvas transition-colors hover:bg-forest-800/70 md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <nav
          className="border-t border-forest-800 bg-forest-950 px-4 py-3 md:hidden"
          aria-label="Mobile"
          onClick={() => setOpen(false)}
        >
          <ul className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-11 items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-forest-800 text-canvas'
                        : 'text-canvas/70 hover:bg-forest-800/60 hover:text-canvas',
                    )
                  }
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={openRandom}
                className={buttonClasses('secondary', 'md', 'mt-2 w-full text-forest-200')}
              >
                <Shuffle className="h-4 w-4" aria-hidden="true" />
                Discover a species
              </button>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
