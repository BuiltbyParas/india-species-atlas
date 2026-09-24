import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SPECIES } from '../../data/species';
import { THREATS } from '../../data/threats';
import { PROGRAMMES } from '../../data/programmes';
import { BIBLIOGRAPHY } from '../../data/sources';
import { MAP_VIEWBOX, useIndiaGeo } from '../../geo/india';
import { cn } from '../../utils/cn';
import { useSpeciesProfile } from '../species/SpeciesProfileProvider';

const LOCALITY_COUNT = SPECIES.reduce((n, s) => n + s.distributionPoints.length, 0);
const PUBLISHERS = [...new Set(BIBLIOGRAPHY.flatMap((c) => c.entries.map((e) => e.publisher)))];

/**
 * The primary sections. Each carries a figure and a running strip, and both
 * are read off the dataset: the strip under "Species" is the species, under
 * "Threats" the threat categories, and so on. Nothing in the menu is filler.
 */
const ITEMS = [
  {
    to: '/',
    label: 'Atlas',
    figure: 'The documentary',
    strip: ['The map', 'The species', 'The selection', 'Fragmentation', 'Protection'],
  },
  {
    to: '/species',
    label: 'Species',
    figure: `${SPECIES.length} species`,
    strip: SPECIES.map((s) => s.commonName),
  },
  {
    to: '/atlas',
    label: 'Map',
    figure: `${LOCALITY_COUNT} localities`,
    strip: SPECIES.flatMap((s) => s.distributionPoints.map((p) => p.label.split(',')[0])).slice(0, 18),
  },
  {
    to: '/atlas?mode=threats',
    label: 'Threats',
    figure: `${THREATS.length} categories`,
    strip: THREATS.map((t) => t.name),
  },
  {
    to: '/conservation',
    label: 'Conservation',
    figure: `${PROGRAMMES.length} programmes`,
    strip: PROGRAMMES.map((p) => p.name.split(' (')[0]),
  },
  {
    to: '/about',
    label: 'About',
    figure: 'Method and limits',
    strip: PUBLISHERS.slice(0, 8),
  },
];

const SECONDARY = [
  { to: '/compare', label: 'Compare species' },
  { to: '/sources', label: 'Sources' },
  { to: '/documentary', label: 'Documentary mode' },
];

function isActive(pathname: string, search: string, to: string) {
  const [path, query] = to.split('?');
  if (query) return pathname === path && search.includes(query);
  if (path === '/atlas') return pathname === '/atlas' && !search.includes('mode=threats');
  return pathname === path;
}

/**
 * An editorial overlay in place of a nav bar.
 *
 * It opens the way a folded sheet map does: four panels swing out from their
 * creases in turn, then the rules between the sections are drawn and the
 * section names are set. Hovering a section runs a strip of its contents
 * across it, entering from whichever edge the pointer came in by — the same
 * gesture as running a finger along a line on a map.
 */
export function FlowingMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { pathname, search } = useLocation();
  const { openRandom } = useSpeciesProfile();
  const geo = useIndiaGeo();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on navigation.
  const lastPath = useRef(pathname + search);
  useEffect(() => {
    if (lastPath.current !== pathname + search) {
      lastPath.current = pathname + search;
      onClose();
    }
  }, [pathname, search, onClose]);

  // Keyboard: Escape closes, Tab stays inside, first link takes focus.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>('a, button');
    const focusTimer = window.setTimeout(() => first?.focus({ preventScroll: true }), 380);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Tab' && panel) {
        const nodes = [...panel.querySelectorAll<HTMLElement>('a, button')];
        if (nodes.length === 0) return;
        const firstNode = nodes[0];
        const lastNode = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === firstNode) {
          e.preventDefault();
          lastNode.focus();
        } else if (!e.shiftKey && document.activeElement === lastNode) {
          e.preventDefault();
          firstNode.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const onEnter = (e: ReactPointerEvent<HTMLLIElement>) => {
    if (e.pointerType !== 'mouse') return;
    const row = e.currentTarget;
    const r = row.getBoundingClientRect();
    const fromTop = e.clientY - r.top < r.height / 2;
    row.dataset.from = fromTop ? 'top' : 'bottom';
    // Let the band be placed at its entry edge before it travels in.
    requestAnimationFrame(() => {
      row.dataset.flow = 'in';
    });
  };
  const onLeave = (e: ReactPointerEvent<HTMLLIElement>) => {
    const row = e.currentTarget;
    const r = row.getBoundingClientRect();
    row.dataset.from = e.clientY - r.top < r.height / 2 ? 'top' : 'bottom';
    row.dataset.flow = 'out';
  };

  return (
    <div
      id="site-menu"
      className="menu"
      data-open={open ? 'true' : 'false'}
      inert={!open}
      aria-hidden={!open}
    >
      <div className="menu-folds" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="menu-fold" style={{ ['--i' as string]: i }} />
        ))}
      </div>

      {geo && (
        <svg className="menu-map" viewBox={MAP_VIEWBOX} aria-hidden="true">
          <path d={geo.all} pathLength={1} />
        </svg>
      )}

      <div ref={panelRef} className="menu-inner" role="dialog" aria-modal="true" aria-label="Site menu">
        <nav aria-label="Primary" className="menu-primary">
          <ul>
            {ITEMS.map((item, i) => {
              const active = isActive(pathname, search, item.to);
              const strip = [...item.strip, ...item.strip];
              return (
                <li
                  key={item.to}
                  className="menu-row"
                  style={{ ['--i' as string]: i }}
                  onPointerEnter={onEnter}
                  onPointerLeave={onLeave}
                >
                  <span className="menu-rule" aria-hidden="true" />
                  <Link
                    to={item.to}
                    className={cn('menu-link', active && 'is-active')}
                    aria-current={active ? 'page' : undefined}
                    data-cursor="Go"
                  >
                    <span className="menu-label-mask">
                      <span className="menu-label">{item.label}</span>
                    </span>
                    <span className="menu-figure">{item.figure}</span>
                  </Link>
                  <div className="menu-flow" aria-hidden="true">
                    <div className="menu-flow-track">
                      {strip.map((word, j) => (
                        <span key={j} className="menu-flow-item">
                          <span className="font-serif italic">{word}</span>
                          <svg viewBox="0 0 40 8" className="menu-flow-line">
                            <path d="M0 4 C 10 0, 30 8, 40 4" />
                          </svg>
                        </span>
                      ))}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="menu-aside">
          <ul className="space-y-2">
            {SECONDARY.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="menu-secondary" data-cursor="Go">
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <button
                type="button"
                className="menu-secondary"
                onClick={() => {
                  onClose();
                  openRandom();
                }}
              >
                Open a species at random
              </button>
            </li>
          </ul>
          <p className="mt-8 max-w-[18rem] text-xs leading-relaxed text-canvas/40">
            Status follows the IUCN Red List. Map locations are indicative localities, not range boundaries.
          </p>
        </div>
      </div>
    </div>
  );
}
