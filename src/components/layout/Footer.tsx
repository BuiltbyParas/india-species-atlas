import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { SPECIES } from '../../data/species';
import { formatDeg } from '../../geo/india';
import { useInView } from '../../motion/useInView';
import { totalSpecies } from '../../utils/stats';
import { cn } from '../../utils/cn';

const LINKS = [
  { to: '/atlas', label: 'Map' },
  { to: '/species', label: 'Species' },
  { to: '/compare', label: 'Compare' },
  { to: '/conservation', label: 'Conservation' },
  { to: '/about', label: 'About' },
  { to: '/sources', label: 'Sources' },
  { to: '/documentary', label: 'Documentary mode' },
];

// Everything the colophon states is read from the dataset, like every other count on the site.
const ANCHORS = SPECIES.map((s) => ({ id: s.id, status: s.status, lng: s.distributionPoints[0].lng }));
const MIN_LNG = Math.min(...ANCHORS.map((a) => a.lng));
const MAX_LNG = Math.max(...ANCHORS.map((a) => a.lng));
const LOCALITIES = SPECIES.reduce((n, s) => n + s.distributionPoints.length, 0);
const CITATIONS = SPECIES.reduce((n, s) => n + s.sources.length, 0);
const CHECKED = SPECIES.map((s) => s.lastVerified).sort().at(-1) ?? '';
const fmtDate = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

/**
 * The colophon, printed where an art book prints its own: after the last page.
 *
 * A survey line runs across the top with a tick for every species' anchor
 * locality, placed by longitude, so the last thing the atlas draws is the line
 * it opened with. Under it: what the atlas is, who made it, and how.
 */
export function Footer() {
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref, { rootMargin: '0px 0px -8% 0px' });

  return (
    <footer ref={ref} className={cn('site-footer colophon', seen && 'is-shown')}>
      <div className="mx-auto max-w-[1600px] px-4 pb-10 pt-16 sm:px-8 lg:px-12 lg:pt-20">
        <div className="colophon-scale" aria-hidden="true">
          <span className="colophon-scale-line" />
          {ANCHORS.map((a, i) => (
            <span
              key={a.id}
              className="colophon-tick"
              data-status={a.status}
              style={{ left: `${((a.lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * 100}%`, ['--i' as string]: i }}
            />
          ))}
          <span className="colophon-scale-label">
            <span className="tabular-nums">{formatDeg(MIN_LNG, 'lng')}</span>
            <span>{totalSpecies} anchor localities, by longitude</span>
            <span className="tabular-nums">{formatDeg(MAX_LNG, 'lng')}</span>
          </span>
        </div>

        <div className="mt-14 grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="colophon-title lg:col-span-5">
            <p className="caps">India Species Atlas</p>
            <p className="mt-4 max-w-[26rem] font-serif text-[clamp(1.6rem,2.4vw,2.2rem)] font-light leading-[1.1] tracking-[-0.015em] text-canvas">
              A digital field study of {totalSpecies} threatened species, drawn on one sheet of India.
            </p>
            <p className="colophon-sign mt-8 text-small">
              <span className="text-canvas/50">Designed and built by</span>{' '}
              <span className="colophon-name">Paras Attri</span>
            </p>
          </div>

          <dl className="colophon-facts lg:col-span-4">
            <div>
              <dt className="caps">Set in</dt>
              <dd>
                <span className="font-serif text-[1.05em]">Newsreader</span> for the narrative, Geist for the data
              </dd>
            </div>
            <div>
              <dt className="caps">Drawn on</dt>
              <dd>One equirectangular sheet corrected at 22°N; Leaflet for the working map</dd>
            </div>
            <div>
              <dt className="caps">Built with</dt>
              <dd>React, three.js and WebGL, canvas and SVG, GSAP; no template or chart kit</dd>
            </div>
            <div>
              <dt className="caps">Data</dt>
              <dd className="tabular-nums">
                {totalSpecies} species · {LOCALITIES} localities · {CITATIONS} citations, last checked {fmtDate(CHECKED)}
              </dd>
            </div>
          </dl>

          <nav aria-label="Footer" className="lg:col-span-3">
            <ul className="colophon-links">
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

        <p className="mt-14 max-w-4xl text-micro leading-relaxed text-canvas/35">
          An educational atlas, begun as an environmental-studies / CAI project. Status follows the IUCN Red List (via
          BirdLife International for birds); map locations are indicative localities, not range boundaries. Basemap
          &copy; Esri, Garmin, GEBCO, NOAA NGDC and other contributors. Species photographs by their individual
          photographers, used under Creative Commons licences via Wikimedia Commons. Not affiliated with the IUCN or the
          Government of India.
        </p>
      </div>
    </footer>
  );
}
