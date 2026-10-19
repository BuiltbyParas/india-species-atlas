import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PresentationSection } from '../components/home/PresentationSection';
import { totalSpecies, conservationRegionCount, statesCovered, threatChartData } from '../utils/stats';
import { SPECIES } from '../data/species';
import { PROGRAMMES } from '../data/programmes';
import { STATUS_HEX } from '../theme';
import { MAX_JOIN_DEG, threadPath } from '../geo/line/paths';
import { formatDeg, MAP_VIEWBOX, PROJECTION_LAT, project, useIndiaGeo } from '../geo/india';
import { GEOJSON_STATE_ALIASES } from '../utils/stateCounts';
import { programmeSitesFor, programmeStatesFor } from '../components/map/programmeSites';
import { useInView } from '../motion/useInView';
import { RevealText } from '../components/cinema/RevealText';
import { cn } from '../utils/cn';

/**
 * The atlas' own account of itself, told over one map.
 *
 * The page reads down a column of short chapters — purpose, method, limits,
 * stakes — while a single sheet of India holds the other half of the frame and
 * changes with them: the places on record, the selection, the projection and
 * the rule every line obeys, what a point does and does not claim, and what is
 * protected. Then the counts as one ledger, the maker, and the way back into
 * the atlas. Every figure is computed from the dataset; every claim is the
 * project's own, with its qualifications kept.
 */

type Layer = 'places' | 'selection' | 'sheet' | 'indicative' | 'protected';

const LOCALITIES = SPECIES.reduce((n, s) => n + s.distributionPoints.length, 0);
const CITATIONS = SPECIES.reduce((n, s) => n + s.sources.length, 0);
const STATES = statesCovered();
const SITES = programmeSitesFor(SPECIES);
const PROTECTED_STATES = [...programmeStatesFor(SPECIES)].map((s) => GEOJSON_STATE_ALIASES[s] ?? s);
const THREAT_ROWS = threatChartData();
const HABITAT = THREAT_ROWS.find((t) => t.id === 'habitat-loss');
/** Whether habitat loss is recorded against more species than any other threat. */
const HABITAT_TOP = !!HABITAT && THREAT_ROWS.every((t) => t.id === HABITAT.id || t.value < HABITAT.value);
/** The locality the "indicative" plate annotates: the first species' anchor, as the hero's descent ends on it. */
const EXAMPLE = SPECIES[0];
const EXAMPLE_AT = EXAMPLE.distributionPoints[0];

/** What each plate of the map is showing, in words — set under the sheet as its caption. */
const CAPTIONS: Record<Layer, string> = {
  places: `Every locality on record: ${LOCALITIES} points for ${totalSpecies} species.`,
  selection: `${totalSpecies} species, ${STATES.length} states and union territories, ${conservationRegionCount} ecological regions.`,
  sheet: `Equirectangular, longitude corrected at ${PROJECTION_LAT}°N. A line breaks where two localities are more than ${MAX_JOIN_DEG}° apart.`,
  indicative: `${EXAMPLE_AT.label.split(',')[0]}: an indicative locality for the ${EXAMPLE.commonName}, not the edge of its range.`,
  protected: `${SITES.length} programme sites, and the ${PROTECTED_STATES.length} states of record for the species they cover.`,
};
const PLATE: Record<Layer, string> = {
  places: 'Plate 1 · Places',
  selection: 'Plate 2 · Selection',
  sheet: 'Plate 3 · The sheet',
  indicative: 'Plate 4 · A point',
  protected: 'Plate 5 · Protection',
};

/* -------------------------------------------------------------- the map */

const GRATICULE = {
  lats: [10, 15, 20, 25, 30, 35],
  lngs: [70, 75, 80, 85, 90, 95],
};

function AboutMap({ layer }: { layer: Layer }) {
  const geo = useIndiaGeo();
  const threads = useMemo(() => SPECIES.map((s) => ({ s, d: threadPath(s.distributionPoints) })), []);
  const covered = geo ? STATES.map((n) => geo.byName.get(GEOJSON_STATE_ALIASES[n] ?? n)?.d ?? '').join('') : '';
  const protectedD = geo ? PROTECTED_STATES.map((n) => geo.byName.get(n)?.d ?? '').join('') : '';
  const [ex, ey] = project(EXAMPLE_AT.lng, EXAMPLE_AT.lat);
  // The corrected parallel's label sits out in the Bay of Bengal, clear of every line.
  const [px, py] = project(88.6, PROJECTION_LAT);

  return (
    <svg viewBox={MAP_VIEWBOX} className="about-map-svg" data-layer={layer} role="img" aria-label={`Map of India. ${CAPTIONS[layer]}`}>
      <g className="am-grid">
        {GRATICULE.lats.map((lat) => {
          const [x0, y] = project(66, lat);
          const [x1] = project(99, lat);
          return <line key={`lat${lat}`} x1={x0} y1={y} x2={x1} y2={y} />;
        })}
        {GRATICULE.lngs.map((lng) => {
          const [x, y0] = project(lng, 38);
          const [, y1] = project(lng, 5);
          return <line key={`lng${lng}`} x1={x} y1={y0} x2={x} y2={y1} />;
        })}
        {GRATICULE.lats.map((lat) => {
          const [x, y] = project(97.6, lat);
          return (
            <text key={`t${lat}`} x={x} y={y - 6} className="am-grid-label">
              {lat}°N
            </text>
          );
        })}
      </g>
      <line x1={0} y1={py} x2={1000} y2={py} className="am-parallel" />
      <text x={px} y={py + 26} className="am-parallel-label">
        {PROJECTION_LAT}°N — longitude corrected here
      </text>
      <path d={covered} className="am-covered" />
      <path d={protectedD} className="am-protected" />
      <path d={geo?.all ?? ''} className="am-country" />
      <g className="am-threads">
        {threads.map(({ s, d }) => (
          <path key={s.id} d={d} style={{ ['--c' as string]: STATUS_HEX[s.status] }} />
        ))}
      </g>
      <g className="am-halos">
        {SPECIES.flatMap((s) =>
          s.distributionPoints.map((p) => {
            const [x, y] = project(p.lng, p.lat);
            return <circle key={`${s.id}-${p.label}`} cx={x} cy={y} r={20} />;
          }),
        )}
      </g>
      <g className="am-points">
        {SPECIES.flatMap((s) =>
          s.distributionPoints.map((p) => {
            const [x, y] = project(p.lng, p.lat);
            return <circle key={`${s.id}-${p.label}`} cx={x} cy={y} r={4.5} style={{ ['--c' as string]: STATUS_HEX[s.status] }} />;
          }),
        )}
      </g>
      <g className="am-sites">
        {SITES.map((site, i) => {
          const [x, y] = project(site.lng, site.lat);
          const angle = (site.fanIndex / Math.max(site.fanCount, 1)) * Math.PI * 2;
          const off = site.fanCount > 1 ? 16 : 0;
          return <circle key={i} cx={x + Math.cos(angle) * off} cy={y + Math.sin(angle) * off} r={14} />;
        })}
      </g>
      <g className="am-example">
        <circle cx={ex} cy={ey} r={46} />
        <line x1={ex + 46} y1={ey} x2={ex + 120} y2={ey} />
        <text x={ex + 128} y={ey - 6}>{EXAMPLE_AT.label.split(',')[0]}</text>
        <text x={ex + 128} y={ey + 20} className="am-example-sub">
          {formatDeg(EXAMPLE_AT.lat, 'lat')} {formatDeg(EXAMPLE_AT.lng, 'lng')} · indicative
        </text>
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------- chapters */

const PART = { purpose: 'Purpose', method: 'Method', limits: 'Limits', stakes: 'Stakes' } as const;

function Chapter({
  n,
  part,
  title,
  layer,
  children,
}: {
  n: string;
  part: keyof typeof PART;
  title: string;
  layer: Layer;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref, { rootMargin: '0px 0px -22% 0px' });
  return (
    <section ref={ref} data-layer={layer} className={cn('ab-ch', `is-${part}`, seen && 'is-seen')} aria-labelledby={`about-${n}`}>
      <p className="ab-part">
        <span className="tabular-nums">{n}</span>
        <span>{PART[part]}</span>
      </p>
      <h2 id={`about-${n}`} className="ab-title">
        {title}
      </h2>
      <div className="ab-body">{children}</div>
    </section>
  );
}

/** Which chapter holds the middle of the screen decides the map's plate. */
function useActiveLayer(root: React.RefObject<HTMLElement | null>, initial: Layer): Layer {
  const [layer, setLayer] = useState<Layer>(initial);
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setLayer((e.target as HTMLElement).dataset.layer as Layer);
      },
      { rootMargin: '-48% 0px -48% 0px' },
    );
    el.querySelectorAll('.ab-ch[data-layer]').forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [root]);
  return layer;
}

/** The way back in: the line set over the country's outline, which runs on past the frame — the rest of it is on the map. */
function CloseSection() {
  const geo = useIndiaGeo();
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref, { rootMargin: '0px 0px -25% 0px' });
  return (
    <section ref={ref} className={cn('ab-close', seen && 'is-seen')} aria-labelledby="about-close">
      <svg viewBox={MAP_VIEWBOX} className="ab-close-map" aria-hidden="true">
        <path d={geo?.all ?? ''} pathLength={1} />
      </svg>
      <div className="relative mx-auto max-w-[1600px] px-4 sm:px-8 lg:px-12">
        <h2 id="about-close" className="ab-close-title font-serif font-light text-canvas">
          <RevealText text="The rest is" play={seen} className="block" />
          <RevealText text="on the map." play={seen} delay={0.18} className="ab-close-2 block" />
        </h2>
        <div className="mt-12 flex flex-wrap items-center gap-x-10 gap-y-4">
          <Link to="/atlas" className="cta" data-magnetic="0.25" data-cursor="Enter">
            <span>Explore the map</span>
            <svg viewBox="0 0 40 10" aria-hidden="true" className="cta-line">
              <path d="M0 5 C 12 1, 26 9, 40 5" />
            </svg>
          </Link>
          <Link to="/species" className="text-link" data-magnetic="0.2">
            Browse the species
          </Link>
          <Link to="/sources" className="text-link" data-magnetic="0.2">
            See all sources
          </Link>
        </div>
      </div>
    </section>
  );
}

function Ledger() {
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref);
  const rows: Array<[string, number]> = [
    ['Species', totalSpecies],
    ['Indicative localities', LOCALITIES],
    ['States and UTs', STATES.length],
    ['Ecological regions', conservationRegionCount],
    ['Programmes', PROGRAMMES.length],
    ['Source citations', CITATIONS],
  ];
  return (
    <section ref={ref} className={cn('ab-ledger', seen && 'is-seen')} aria-labelledby="about-ledger">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-8 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="ab-part">
              <span className="tabular-nums">07</span>
              <span>The data</span>
            </p>
            <h2 id="about-ledger" className="ab-title">
              Counted, not typed.
            </h2>
            <div className="ab-body">
              <p>
                Every count on the site is computed from the dataset when the page runs; none is typed in. IUCN categories
                describe <strong>global</strong> extinction risk, not the size or trend of the Indian population
                specifically.
              </p>
              <p>
                <Link to="/sources" className="text-link">
                  The source register
                </Link>{' '}
                lists every reference and the species that rest on it.
              </p>
            </div>
          </div>
          <dl className="ab-ledger-rows lg:col-span-7 lg:col-start-6">
            {rows.map(([label, value], i) => (
              <div key={label} style={{ ['--i' as string]: i }}>
                <dt>{label}</dt>
                <dd className="tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- page */

/** A run of chapters beside one sticky plate; the second run sets its plate on the left, so the page turns rather than repeats. */
function Scrolly({ side, initial, children }: { side: 'right' | 'left'; initial: Layer; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const active = useActiveLayer(ref, initial);
  return (
    <div ref={ref} className={cn('ab-scrolly mx-auto max-w-[1600px] px-4 sm:px-8 lg:px-12', side === 'left' && 'is-left')}>
      <div className="ab-text">{children}</div>
      <aside className="ab-plate" aria-label="The atlas' map, changing with the chapter in view">
        <div className="ab-plate-inner">
          <p className="ab-plate-label" aria-hidden="true">
            <span key={active} className="ab-swap">
              {PLATE[active]}
            </span>
          </p>
          <AboutMap layer={active} />
          <p className="ab-plate-caption" aria-live="polite">
            <span key={active} className="ab-swap">
              {CAPTIONS[active]}
            </span>
          </p>
        </div>
      </aside>
    </div>
  );
}

/** The twelve in Red List order, most at risk first. */
const RANK: Record<string, number> = { CR: 0, EN: 1, VU: 2 };
const BY_RISK = [...SPECIES].sort((a, b) => (RANK[a.status] ?? 9) - (RANK[b.status] ?? 9));

/**
 * Between the two runs: the atlas's own caveat about its size, set as large as
 * the page allows, and under it the whole selection by name — what "small"
 * means, counted out.
 */
function Interlude() {
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref, { rootMargin: '0px 0px -20% 0px' });
  return (
    <section ref={ref} className={cn('ab-interlude', seen && 'is-seen')} aria-label="The selection">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-8 lg:px-12">
        <p className="ab-interlude-quote font-serif font-light text-canvas">
          <RevealText text="The atlas is deliberately small;" play={seen} stagger={0.04} className="block" />
          <RevealText text="it is a teaching tool, not a complete inventory." play={seen} delay={0.35} stagger={0.04} className="ab-interlude-b block" />
        </p>
        <ol className="ab-roll" aria-label={`The ${totalSpecies} species, most at risk first`}>
          {BY_RISK.map((s, i) => (
            <li key={s.id} style={{ ['--i' as string]: i, ['--c' as string]: STATUS_HEX[s.status] }}>
              <span className="ab-roll-mark" aria-hidden="true" />
              <span className="ab-roll-name">{s.commonName}</span>
              <span className="ab-roll-sci">{s.scientificName}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function AboutPage() {
  const openRef = useRef<HTMLElement>(null);
  const opened = useInView(openRef, { rootMargin: '0px' });

  return (
    <>
      {/* The opening plate: the title runs across the sheet, the selection's lines drawn large beneath it. */}
      <header ref={openRef} className={cn('ab-open', opened && 'is-shown')}>
        <div className="ab-open-map" aria-hidden="true">
          <AboutMap layer="selection" />
        </div>
        <div className="ab-open-inner mx-auto max-w-[1600px] px-4 sm:px-8 lg:px-12">
          <p className="ab-eyebrow">About this project</p>
          <h1 className="ab-display font-serif font-light text-canvas">
            <RevealText text="Risk has" play={opened} className="block" />
            <RevealText text="a place." play={opened} delay={0.16} className="ab-display-2 block" />
          </h1>
          <p className="ab-lede">
            An educational atlas of India&rsquo;s threatened wildlife: {totalSpecies} species, the places they are recorded,
            the threats recorded against them and the programmes that respond. A digital field study designed and built
            by Paras Attri, which began as an environmental-studies / Computer-Aided Instruction (CAI) project.
          </p>
        </div>
      </header>

      <Scrolly side="right" initial="places">
          <Chapter n="01" part="purpose" title="Why map it" layer="places">
            <p className="ab-lead-p">
              To visually connect the <em>geography</em> of {totalSpecies} selected threatened species in India with their{' '}
              <em>conservation status</em>, the <em>threats</em> they face and the <em>conservation efforts</em> responding
              to them — so that extinction risk is not an abstract label but something tied to real places and real
              pressures.
            </p>
            <p>
              Written for students, educators and anyone interested in Indian biodiversity. The language is kept concise and
              non-technical, and every claim links to a source for readers who want to go further.
            </p>
          </Chapter>

          <Chapter n="02" part="purpose" title="What it holds" layer="selection">
            <p>
              Rather than attempting every threatened species in India, the atlas uses a small set chosen for{' '}
              <strong>geographic spread</strong> across {conservationRegionCount} ecological regions and {STATES.length}{' '}
              states and union territories, and for a mix of IUCN categories (CR, EN, VU) and animal groups (mammals, birds,
              a reptile). Quality and accuracy were prioritised over the number of entries.
            </p>
          </Chapter>

          <Chapter n="03" part="method" title="Where it comes from" layer="selection">
            <p>
              Conservation status for every species was checked against the <strong>IUCN Red List</strong> (via the{' '}
              <strong>BirdLife International</strong> Data Zone for birds). Distribution, threats and conservation
              information draw on the IUCN assessments, the Ministry of Environment, Forest and Climate Change, the Wildlife
              Institute of India, the NTCA and WWF India, among others. Each species entry lists its own sources and the date
              it was last checked.
            </p>
          </Chapter>
      </Scrolly>

      <Interlude />

      <Scrolly side="left" initial="sheet">
          <Chapter n="04" part="method" title="How it is drawn" layer="sheet">
            <p>
              Every drawn map on the site — the opening, the species maps, the journeys between pages — is one sheet: an
              equirectangular projection with longitude corrected at {PROJECTION_LAT}°N, the latitude India is centred on.
              The camera moves over that one sheet, so places stay where they are from page to page.
            </p>
            <p>
              A species&rsquo; line joins its recorded localities and breaks wherever two are more than {MAX_JOIN_DEG}°
              apart, so it never implies a corridor the data does not record. Anything drawn that the data does not map —
              the bustard&rsquo;s power line, the lift of the ground in a journey — is labelled schematic or as a drawing
              device where it appears.
            </p>
          </Chapter>

          <Chapter n="05" part="limits" title="What a point does not say" layer="indicative">
            <ol className="ab-notes">
              <li>
                The map is an <strong>educational representation</strong>. Markers are indicative locations within a known
                range — usually a well-known protected area — and do <strong>not</strong> show exact population boundaries
                or the full range of a species.
              </li>
              <li>
                It is not a substitute for official species distribution datasets (for example those of the WII, the
                Zoological Survey of India or the IUCN range polygons).
              </li>
              <li>
                The state boundary layer is a simplified copy of the Survey of India state and Union Territory boundaries as
                updated in 2020, drawn as India&rsquo;s political map: Jammu &amp; Kashmir and Ladakh form one continuous
                northern territory rather than separate Union Territories. Boundaries are simplified for the screen and
                should not be used for measurement.
              </li>
            </ol>
          </Chapter>

          <Chapter n="06" part="stakes" title="Why connection matters" layer="protected">
            {HABITAT && (
              <p className="ab-lead-p">
                {HABITAT.value === SPECIES.length ? `All ${SPECIES.length}` : `${HABITAT.value} of the ${SPECIES.length}`}{' '}
                species have habitat loss and fragmentation recorded among their major threats
                {HABITAT_TOP ? ' — more than any other pressure in the atlas.' : '.'}
              </p>
            )}
            <p>
              The atlas can show where a species is recorded and where a programme is on record for it. It cannot show
              whether the ground between those places is still whole: no line here is a corridor, because the data records
              none. What it can draw is the other half of the question — the {SITES.length} sites where a programme meets a
              species it covers, and the {PROTECTED_STATES.length} states they reach.
            </p>
            <p>
              On the{' '}
              <Link to="/" className="text-link">
                opening documentary
              </Link>
              , Chapter 04 — <em>From fragmentation to protection</em> — traces each threat to the species it is recorded
              against and the programmes on record for them.
            </p>
          </Chapter>
      </Scrolly>

      <Ledger />

      <section className="ab-maker" aria-labelledby="about-maker">
        <div className="mx-auto grid max-w-[1600px] gap-10 px-4 sm:px-8 lg:grid-cols-12 lg:px-12">
          <div className="lg:col-span-7">
            <p className="ab-part">
              <span className="tabular-nums">08</span>
              <span>The maker</span>
            </p>
            <h2 id="about-maker" className="ab-maker-title font-serif font-light text-canvas">
              Made for it, by <span className="ab-maker-name">Paras Attri.</span>
            </h2>
          </div>
          <div className="ab-body lg:col-span-4 lg:col-start-9">
            <p>
              Designed, written and built by Paras Attri, beginning as an environmental-studies / Computer-Aided Instruction
              (CAI) project.
            </p>
            <p>
              Everything on screen is made for it: the geographic line system, the WebGL relief and gallery, the journeys
              between pages, the cursor, the charts and the maps. No template or chart kit is used.
            </p>
          </div>
        </div>
      </section>

      <CloseSection />

      {/* The screenshot panel and QR code, for presentations of the project. */}
      <PresentationSection />
    </>
  );
}
