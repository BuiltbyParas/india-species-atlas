import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SectionHeading } from '../components/ui/SectionHeading';
import { PresentationSection } from '../components/home/PresentationSection';
import { totalSpecies, conservationRegionCount, statesCovered } from '../utils/stats';
import { SPECIES } from '../data/species';
import { PROGRAMMES } from '../data/programmes';
import { MAX_JOIN_DEG } from '../geo/line/paths';
import { PROJECTION_LAT } from '../geo/india';
import { useInView } from '../motion/useInView';
import { cn } from '../utils/cn';

/**
 * The atlas' own field notebook: why it exists, how it was made, what its map
 * does and does not claim, what its data holds, and who made it — five short
 * chapters on one ruled spine, each ruled in as it is reached.
 */
function Chapter({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref, { rootMargin: '0px 0px -18% 0px' });
  return (
    <section ref={ref} className={cn('about-ch', seen && 'is-seen')} aria-labelledby={`about-${n}`}>
      <div className="about-spine">
        <span className="about-n tabular-nums">{n}</span>
        <h2 id={`about-${n}`} className="about-title">
          {title}
        </h2>
      </div>
      <div className="about-body">{children}</div>
    </section>
  );
}

const LOCALITIES = SPECIES.reduce((n, s) => n + s.distributionPoints.length, 0);
const CITATIONS = SPECIES.reduce((n, s) => n + s.sources.length, 0);

export function AboutPage() {
  return (
    <>
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:py-16">
        <SectionHeading
          as="h1"
          size="page"
          eyebrow="About this project"
          title="An educational atlas of India’s threatened wildlife"
          description="A digital field study of threatened species, designed and built by Paras Attri. It began as an environmental-studies / Computer-Aided Instruction (CAI) project."
        />

        <div className="mt-14">
          <Chapter n="01" title="The field note">
            <p className="font-serif text-lede font-light text-canvas/90">
              To visually connect the <em>geography</em> of {totalSpecies} selected threatened species in India with
              their <em>conservation status</em>, the <em>threats</em> they face and the{' '}
              <em>conservation efforts</em> responding to them — so that extinction risk is not an abstract label but
              something tied to real places and real pressures.
            </p>
            <p>
              Written for students, educators and anyone interested in Indian biodiversity. The language is kept
              concise and non-technical, and every claim links to a source for readers who want to go further.
            </p>
          </Chapter>

          <Chapter n="02" title="The method">
            <p>
              Rather than attempting every threatened species in India, the atlas uses a small set chosen for{' '}
              <strong>geographic spread</strong> across {conservationRegionCount} ecological regions and{' '}
              {statesCovered().length} states and union territories, and for a mix of IUCN categories (CR, EN, VU) and
              animal groups (mammals, birds, a reptile). Quality and accuracy were prioritised over the number of
              entries.
            </p>
            <p>
              Conservation status for every species was checked against the <strong>IUCN Red List</strong> (via the{' '}
              <strong>BirdLife International</strong> Data Zone for birds). Distribution, threats and conservation
              information draw on the IUCN assessments, the Ministry of Environment, Forest and Climate Change, the
              Wildlife Institute of India, the NTCA and WWF India, among others. Each species entry lists its own
              sources and the date it was last checked.
            </p>
          </Chapter>

          <Chapter n="03" title="The map">
            <p>
              Every drawn map on the site — the opening, the species maps, the journeys between pages — is one sheet:
              an equirectangular projection with longitude corrected at {PROJECTION_LAT}°N, the latitude India is
              centred on. The camera moves over that one sheet, so places stay where they are from page to page.
            </p>
            <ul className="about-list">
              <li>
                The map is an <strong>educational representation</strong>. Markers are indicative locations within a
                known range — usually a well-known protected area — and do <strong>not</strong> show exact population
                boundaries or the full range of a species.
              </li>
              <li>
                A species&rsquo; line joins its recorded localities and breaks wherever two are more than{' '}
                {MAX_JOIN_DEG}° apart, so it never implies a corridor the data does not record. Anything drawn that the
                data does not map — the bustard&rsquo;s power line, the lift of the ground in a journey — is labelled
                schematic or as a drawing device where it appears.
              </li>
              <li>
                It is not a substitute for official species distribution datasets (for example those of the WII, the
                Zoological Survey of India or the IUCN range polygons).
              </li>
              <li>
                The state boundary layer is a simplified copy of the Survey of India state and Union Territory
                boundaries as updated in 2020, drawn as India&rsquo;s political map: Jammu &amp; Kashmir and Ladakh form
                one continuous northern territory rather than separate Union Territories. Boundaries are simplified for
                the screen and should not be used for measurement.
              </li>
            </ul>
          </Chapter>

          <Chapter n="04" title="The data">
            <dl className="about-data">
              <div>
                <dt>Species</dt>
                <dd>{totalSpecies}</dd>
              </div>
              <div>
                <dt>Indicative localities</dt>
                <dd>{LOCALITIES}</dd>
              </div>
              <div>
                <dt>States and UTs</dt>
                <dd>{statesCovered().length}</dd>
              </div>
              <div>
                <dt>Programmes</dt>
                <dd>{PROGRAMMES.length}</dd>
              </div>
              <div>
                <dt>Source citations</dt>
                <dd>{CITATIONS}</dd>
              </div>
            </dl>
            <p>
              Every count on the site is computed from the dataset when the page runs; none is typed in. IUCN
              categories describe <strong>global</strong> extinction risk, not the size or trend of the Indian
              population specifically.
            </p>
            <p>
              <Link to="/sources" className="text-link">
                The source register
              </Link>{' '}
              lists every reference and the species that rest on it.
            </p>
          </Chapter>

          <Chapter n="05" title="The maker">
            <p>
              Designed, written and built by Paras Attri, beginning as an environmental-studies / Computer-Aided
              Instruction (CAI) project. The atlas is deliberately small; it is a teaching tool, not a complete
              inventory.
            </p>
            <p>
              Everything on screen is made for it: the geographic line system, the WebGL relief and gallery, the
              journeys between pages, the cursor, the charts and the maps. No template or chart kit is used.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Link to="/atlas" className="cta" data-magnetic="0.25" data-cursor="Enter">
                <span>Explore the map</span>
                <svg viewBox="0 0 40 10" aria-hidden="true" className="cta-line">
                  <path d="M0 5 C 12 1, 26 9, 40 5" />
                </svg>
              </Link>
              <Link to="/sources" className="text-link" data-magnetic="0.2">
                See all sources
              </Link>
            </div>
          </Chapter>
        </div>
      </div>
      {/* The screenshot panel and QR code, for presentations of the project. */}
      <PresentationSection />
    </>
  );
}
