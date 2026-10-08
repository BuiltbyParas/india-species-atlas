import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Species, ThreatId } from '../types';
import { SPECIES, SPECIES_BY_ID } from '../data/species';
import { STATUS_INFO } from '../data/statusInfo';
import { HABITAT_LABELS, REGION_LABELS } from '../data/regions';
import { PROGRAMME_BY_ID } from '../data/programmes';
import { formatDeg, MAP_VIEWBOX, project, useIndiaGeo } from '../geo/india';
import { GeoLine } from '../geo/line/GeoLine';
import { bowedLeg, chain } from '../geo/line/paths';
import { useReducedMotion } from '../motion/preferences';
import { useInView } from '../motion/useInView';
import { GEOJSON_STATE_ALIASES } from '../utils/stateCounts';
import { photoSources } from '../utils/photo';
import { cn } from '../utils/cn';
import { SpeciesMap } from '../components/cinema/SpeciesMap';
import { ConservationFacts, PHASE_VARS, Photo, setVars, ThreatFacts, type Phase } from '../components/cinema/SpeciesScene';
import { StatusIndicator } from '../components/cinema/StatusIndicator';
import { StatusScale } from '../components/cinema/StatusScale';
import { LineTitle } from '../components/cinema/LineTitle';
import { useParallax } from '../interaction/parallax';
import { emit } from '../interaction/events';
import { enterSpecies, takeArrival } from '../world/worldState';
import { camAt } from '../world/geoCamera';
import { PhotoCredit } from '../components/ui/PhotoCredit';
import { NotFoundPage } from './NotFoundPage';

/**
 * A species' own page: the scene from the documentary, given room.
 *
 * The opening sets the species beside its photograph — at the photograph's
 * own proportions, never cropped to fit — with the survey facts the dataset
 * holds. Below, the map stays on screen while four short chapters pass it:
 * where the species is recorded (with every locality and its coordinates),
 * what cuts through that ground, what protects it, and its Red List record.
 * Each chapter sets the map's layer as it reaches the middle of the screen,
 * the way the home page's scroll does, but at the reader's own pace and with
 * nothing pinned. The page ends on a line drawn to the next species' anchor.
 *
 * It claims nothing the profile does not: the same fields, the same sources,
 * the same drawing rules. The `?species=` profile panel still works on top.
 */
export function SpeciesWorldPage() {
  const { id = '' } = useParams();
  const species = SPECIES_BY_ID[id];
  if (!species) return <NotFoundPage />;
  // Keyed, so moving to the next species starts its page fresh.
  return <World key={species.id} species={species} />;
}

const CHAPTERS: Array<{ phase: Phase | 'record'; n: string; title: string }> = [
  { phase: 'range', n: '01', title: 'Where it lives' },
  { phase: 'threats', n: '02', title: 'What cuts through it' },
  { phase: 'conservation', n: '03', title: 'What protects it' },
  { phase: 'record', n: '04', title: 'The record' },
];

function World({ species }: { species: Species }) {
  const reduced = useReducedMotion();
  const mapRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('range');
  const [hlThreat, setHlThreat] = useState<ThreatId | null>(null);
  const [hlSites, setHlSites] = useState(false);
  const [hlLocality, setHlLocality] = useState<string | null>(null);
  const mapSeen = useInView(mapRef, { rootMargin: '0px 0px -20% 0px' });
  const status = STATUS_INFO[species.status];
  // The atmosphere drifts away from the hand, so the photograph and title read as nearer.
  const washRef = useRef<HTMLImageElement>(null);
  useParallax(washRef, -18);
  const anchor = species.distributionPoints[0];
  const order = SPECIES.findIndex((s) => s.id === species.id);
  const next = SPECIES[(order + 1) % SPECIES.length];
  const prev = SPECIES[(order - 1 + SPECIES.length) % SPECIES.length];
  const backdrop = photoSources(species)?.small;

  // Delivered by a journey, the photograph is already open: the journey opened it.
  const [arrived] = useState(() => takeArrival(species.id));

  useEffect(() => {
    enterSpecies(species.id, camAt(anchor.lng, anchor.lat));
    emit('species:enter', { id: species.id });
    return () => emit('species:exit', { id: species.id });
  }, [species.id]);

  useEffect(() => {
    document.title = `${species.commonName} (${species.scientificName}) — India Species Atlas`;
    return () => {
      document.title = 'India Species Atlas — Mapping Endangered Species & Conservation Status in India';
    };
  }, [species]);

  // The map holds its layers back until it is on screen, then follows the chapter in view.
  useEffect(() => {
    if (!mapSeen && !reduced) {
      setVars(mapRef.current, { range: 0, threat: 0, cons: 0, zoom: 0 }, false);
      return;
    }
    setVars(mapRef.current, PHASE_VARS[phase], !reduced);
  }, [phase, mapSeen, reduced]);

  // The chapter whose body crosses the middle of the screen sets the phase.
  useEffect(() => {
    const nodes = [...document.querySelectorAll<HTMLElement>('[data-world-phase]')];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const p = (e.target as HTMLElement).dataset.worldPhase as Phase | 'record';
          setPhase(p === 'record' ? 'conservation' : p);
        }
      },
      { rootMargin: '-48% 0px -48% 0px' },
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  const stateCount = new Set(species.states.map((s) => GEOJSON_STATE_ALIASES[s] ?? s)).size;

  return (
    <article className="species-world" aria-labelledby="world-title" style={{ ['--status' as string]: status.hex }}>
      {/* ---------------------------------------------------------------- opening */}
      <header className="sw-open relative isolate overflow-hidden">
        {backdrop && <img ref={washRef} src={backdrop} alt="" aria-hidden="true" className="sw-wash" />}
        <div className="mx-auto grid max-w-[1600px] gap-10 px-(--gutter) pb-16 pt-28 lg:min-h-[calc(100svh-5rem)] lg:grid-cols-12 lg:items-end lg:gap-x-12 lg:pb-20 lg:pt-32">
          <div className="lg:col-span-5 lg:pb-4">
            <nav aria-label="Breadcrumb" className="eyebrow">
              <Link to="/species" className="hover:text-canvas" data-cursor="Return">
                Species
              </Link>
              <span aria-hidden="true">/</span>
              <span className="tabular-nums">
                {String(order + 1).padStart(2, '0')} of {SPECIES.length}
              </span>
            </nav>
            <h1 id="world-title" className="mt-8 font-serif text-title font-light text-canvas">
              <LineTitle key={species.id} text={species.commonName} seed={order} />
            </h1>
            <p className="mt-4 font-serif text-xl italic text-canvas/65 sm:text-2xl">{species.scientificName}</p>
            <StatusIndicator status={species.status} className="mt-6" />
            <StatusScale status={species.status} className="mt-3" />
            <dl className="sw-facts mt-10">
              <div>
                <dt>Anchor locality</dt>
                <dd>
                  {anchor.label.split(',')[0]}
                  <span className="block tabular-nums text-contour">
                    {formatDeg(anchor.lat, 'lat')} {formatDeg(anchor.lng, 'lng')}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Recorded in</dt>
                <dd className="tabular-nums">
                  {stateCount} {stateCount === 1 ? 'state or UT' : 'states and UTs'}
                </dd>
              </div>
              <div>
                <dt>Localities</dt>
                <dd className="tabular-nums">{species.distributionPoints.length} indicative</dd>
              </div>
              <div>
                <dt>Assessed</dt>
                <dd className="tabular-nums">{species.statusAssessedYear}, IUCN Red List</dd>
              </div>
            </dl>
          </div>
          <figure className="lg:col-span-7">
            <Photo key={species.id} species={species} className="sw-photo" sizes="(min-width: 1024px) 58vw, 100vw" shutter={!arrived} eager={arrived} />
            <figcaption className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <span className="text-label text-canvas/45">{species.image.alt}</span>
              <PhotoCredit species={species} />
            </figcaption>
          </figure>
        </div>
      </header>

      {/* ------------------------------------------------------------------ lede */}
      <section className="mx-auto max-w-[1600px] px-(--gutter) py-(--space-block)">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-x-12">
          <p className="font-serif text-headline font-light text-canvas lg:col-span-9">{species.summary}</p>
          <div className="space-y-5 lg:col-span-6 lg:col-start-4">
            <p className="font-serif text-lede font-light text-canvas/80">{species.description}</p>
            <p className="text-body text-canvas/65">
              <span className="text-canvas/85">Why it matters. </span>
              {species.whyItMatters}
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- map and chapters */}
      <section data-trail className="sw-body mx-auto max-w-[1600px] px-(--gutter)" aria-label={`${species.commonName}: the map`}>
        <div className="sw-grid">
          <div className="sw-map-col">
            <div className="sw-map-sticky">
              <SpeciesMap
                ref={mapRef}
                species={species}
                highlightThreat={hlThreat}
                highlightSites={hlSites}
                legendPhase={phase}
                highlightLocality={hlLocality}
                onLocality={setHlLocality}
                className="sw-map"
              />
            </div>
          </div>

          <div className="sw-chapters">
            {CHAPTERS.map((c) => (
              <section key={c.n} className="sw-chapter" data-world-phase={c.phase} aria-labelledby={`sw-${c.n}`}>
                <h2 id={`sw-${c.n}`} className="sw-chapter-head">
                  <span className="tabular-nums">{c.n}</span>
                  {c.title}
                </h2>
                {c.phase === 'range' && (
                  <RangeChapter species={species} mapRef={mapRef} highlight={hlLocality} onHover={setHlLocality} />
                )}
                {c.phase === 'threats' && (
                  <>
                    <ThreatFacts species={species} onHover={setHlThreat} />
                  </>
                )}
                {c.phase === 'conservation' && <ProtectChapter species={species} onHover={setHlSites} />}
                {c.phase === 'record' && <RecordChapter species={species} />}
              </section>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- onwards */}
      <Onwards from={species} next={next} prev={prev} />
    </article>
  );
}

/**
 * MAP → POINTS → ROWS. The first time the locality register comes into view,
 * each locality leaves its point on the map and travels to its row, and the
 * row is written as it lands: the table is the map's points, read as data.
 * Afterwards the two stay joined — pointing at a row lights its point on the
 * map, and pointing at a point lights its row. Reduced motion shows the table
 * as it is.
 */
function useLocalityFlight(tableRef: React.RefObject<HTMLTableElement | null>, mapRef: React.RefObject<HTMLDivElement | null>) {
  const reduced = useReducedMotion();
  useEffect(() => {
    const table = tableRef.current;
    if (!table || reduced || typeof table.animate !== 'function') return;
    table.dataset.flight = 'waiting';
    const timers: number[] = [];
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        void fly();
      },
      { rootMargin: '0px 0px -30% 0px' },
    );
    let live = true;
    // The map draws its points in as it arrives; wait until they are there to be lifted off.
    const pointsDrawn = async () => {
      const start = performance.now();
      while (live && performance.now() - start < 1400) {
        const dot = mapRef.current?.querySelector('.sm-point:last-of-type .sm-point-dot');
        const r = dot?.getBoundingClientRect();
        if (r && r.width >= 4 && getComputedStyle(dot!.closest('.sm-point')!).opacity === '1') return;
        await new Promise((res) => window.setTimeout(res, 60));
      }
    };
    const fly = async () => {
        await pointsDrawn();
        if (!live) return;
        const rows = [...table.querySelectorAll<HTMLTableRowElement>('tbody tr')];
        const map = mapRef.current;
        const box = map?.getBoundingClientRect();
        const mapOnScreen = !!box && box.bottom > 0 && box.top < window.innerHeight && box.width > 0;
        rows.forEach((row, i) => {
          row.style.setProperty('--k', String(i));
          if (!mapOnScreen) return;
          const label = row.dataset.locality ?? '';
          const dot = map!.querySelector(`[data-locality="${CSS.escape(label)}"] .sm-point-dot`);
          const mark = row.querySelector('.sw-reg-dot, .sw-anchor');
          const a = dot?.getBoundingClientRect();
          const b = mark?.getBoundingClientRect();
          if (!a || !b || !a.width) return;
          const ax = a.left + a.width / 2;
          const ay = a.top + a.height / 2;
          const bx = b.left + b.width / 2;
          const by = b.top + b.height / 2;
          const flyer = document.createElement('span');
          flyer.className = 'locality-flyer';
          flyer.setAttribute('aria-hidden', 'true');
          document.body.appendChild(flyer);
          // A shallow arc, so the point is seen to be lifted off the map rather than slid.
          const mx = (ax + bx) / 2;
          const my = Math.min(ay, by) - 40;
          const anim = flyer.animate(
            [
              { transform: `translate(${ax}px, ${ay}px) scale(0.6)`, opacity: 0 },
              { transform: `translate(${ax}px, ${ay}px) scale(1)`, opacity: 1, offset: 0.12 },
              { transform: `translate(${mx}px, ${my}px) scale(1)`, opacity: 1, offset: 0.55 },
              { transform: `translate(${bx}px, ${by}px) scale(1)`, opacity: 1 },
            ],
            { duration: 820, delay: i * 70, easing: 'cubic-bezier(0.7, 0, 0.2, 1)', fill: 'backwards' },
          );
          anim.onfinish = () => flyer.remove();
          anim.oncancel = () => flyer.remove();
        });
        // Rows write themselves in as their points arrive (CSS, staggered by --k).
        requestAnimationFrame(() => (table.dataset.flight = 'flying'));
        timers.push(window.setTimeout(() => (table.dataset.flight = 'done'), rows.length * 70 + 900));
    };
    io.observe(table);
    return () => {
      live = false;
      io.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
      document.querySelectorAll('.locality-flyer').forEach((n) => n.remove());
      delete table.dataset.flight;
    };
  }, [tableRef, mapRef, reduced]);
}

function RangeChapter({
  species,
  mapRef,
  highlight,
  onHover,
}: {
  species: Species;
  mapRef: React.RefObject<HTMLDivElement | null>;
  highlight: string | null;
  onHover: (label: string | null) => void;
}) {
  const ordered = useMemo(() => chain(species.distributionPoints), [species]);
  const tableRef = useRef<HTMLTableElement>(null);
  useLocalityFlight(tableRef, mapRef);
  return (
    <div className="space-y-6">
      <p className="font-serif text-lede font-light text-canvas/90">{species.habitatNote}</p>
      <p className="text-body text-canvas/65">{species.indianDistribution}</p>
      <dl className="sw-tags">
        <dt className="caps">Habitats</dt>
        <dd>{species.habitats.map((h) => HABITAT_LABELS[h]).join(' · ')}</dd>
        <dt className="caps">Regions</dt>
        <dd>{species.regions.map((r) => REGION_LABELS[r]).join(' · ')}</dd>
      </dl>
      <div>
        <p className="caps">Locality register</p>
        <table ref={tableRef} className="sw-register">
          <caption className="sr-only">Indicative localities for {species.commonName}, with coordinates</caption>
          <thead>
            <tr>
              <th scope="col">Locality</th>
              <th scope="col">Latitude</th>
              <th scope="col">Longitude</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((p, i) => (
              <tr
                key={p.label}
                data-locality={p.label}
                className={cn(highlight === p.label && 'is-hl')}
                onPointerEnter={() => onHover(p.label)}
                onPointerLeave={() => onHover(null)}
              >
                <th scope="row">
                  {i === 0 ? (
                    <span className="sw-anchor" title="Anchor locality" aria-label="Anchor locality: " />
                  ) : (
                    <span className="sw-reg-dot" aria-hidden="true" />
                  )}
                  {p.label}
                  {p.note && <span className="block text-label text-canvas/45">{p.note}</span>}
                </th>
                <td>{formatDeg(p.lat, 'lat')}</td>
                <td>{formatDeg(p.lng, 'lng')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-label text-canvas/45">
          Indicative localities: named reserves or landscapes inside the recorded range, not its boundary. The ringed
          point on the map is the anchor.
        </p>
      </div>
    </div>
  );
}

function ProtectChapter({ species, onHover }: { species: Species; onHover: (on: boolean) => void }) {
  const programmes = species.conservationProgrammes.map((id) => PROGRAMME_BY_ID[id]).filter(Boolean);
  return (
    <div className="space-y-8">
      <ConservationFacts species={{ ...species, conservationProgrammes: [], protectedAreas: [] }} onHover={onHover} />
      {programmes.length > 0 && (
        <div>
          <p className="caps">Programmes</p>
          <ol className="mt-3">
            {[...programmes]
              .sort((a, b) => (a.startedYear ?? 9999) - (b.startedYear ?? 9999))
              .map((p) => (
                <li key={p.id} className="sw-prog">
                  <span className="tabular-nums text-canvas/45">{p.startedYear ?? '—'}</span>
                  <span>
                    <span className="block text-canvas/90">{p.name}</span>
                    <span className="block text-label text-canvas/45">{p.authority}</span>
                  </span>
                </li>
              ))}
          </ol>
        </div>
      )}
      {species.protectedAreas.length > 0 && (
        <div>
          <p className="caps">Protected areas named in the record</p>
          <p className="mt-3 text-body text-canvas/75">{species.protectedAreas.join(' · ')}</p>
        </div>
      )}
    </div>
  );
}

function RecordChapter({ species }: { species: Species }) {
  const status = STATUS_INFO[species.status];
  const history = species.statusHistory ?? [];
  return (
    <div className="space-y-8">
      <div className="callout">
        <p className="font-serif text-lede font-light" style={{ color: status.colorVar }}>
          {status.name}
        </p>
        <p className="mt-2 text-body text-canvas/70">{status.definition}</p>
        <p className="mt-2 text-label text-canvas/45">
          From the {species.statusAssessedYear} assessment. {species.endemicToIndia ? 'Endemic to India.' : ''}
        </p>
      </div>
      {history.length > 0 ? (
        <ol className="sw-history">
          {history.map((h) => (
            <li key={`${h.year}-${h.status}`}>
              <span className="tabular-nums">{h.year}</span>
              <span style={{ color: STATUS_INFO[h.status].colorVar }}>{h.status}</span>
              <span className="text-canvas/70">{h.note}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-body text-canvas/55">
          No earlier assessment is recorded in this atlas for the {species.commonName}; the Red List may hold ones not
          checked here.
        </p>
      )}
      <div>
        <p className="caps">Sources</p>
        <ul className="mt-3 space-y-2">
          {species.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer" className="sw-source">
                {s.label}
                {s.publisher && <span className="block text-label text-canvas/45">{s.publisher}</span>}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-label text-canvas/45">
          Entry last checked against its sources on{' '}
          {new Date(species.lastVerified).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
        </p>
      </div>
    </div>
  );
}

/** The way on: a line drawn from this species' anchor to the next one's. */
function Onwards({ from, next, prev }: { from: Species; next: Species; prev: Species }) {
  const geo = useIndiaGeo();
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref, { rootMargin: '0px 0px -30% 0px' });
  const a = project(from.distributionPoints[0].lng, from.distributionPoints[0].lat);
  const b = project(next.distributionPoints[0].lng, next.distributionPoints[0].lat);
  const d = bowedLeg(a, b, 0.2, { max: 160 });
  return (
    <nav ref={ref} className={cn('sw-onwards', seen && 'is-shown')} aria-label="More species">
      <div className="mx-auto grid max-w-[1600px] items-center gap-10 px-(--gutter) py-(--space-chapter) lg:grid-cols-12 lg:gap-x-12">
        <div className="lg:col-span-6">
          <p className="eyebrow">Next on the line</p>
          <Link to={`/species/${next.id}`} className="sw-next" data-cursor="Follow" data-magnetic="0.12">
            <span className="font-serif text-headline font-light">{next.commonName}</span>
            <span className="mt-2 block font-serif text-lg italic text-canvas/55">{next.scientificName}</span>
          </Link>
          <p className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-small">
            <Link to={`/species/${prev.id}`} className="text-link" data-cursor="Return" data-magnetic="0.2">
              Previous: {prev.commonName}
            </Link>
            <Link to="/species" className="text-link">
              All species
            </Link>
            <Link to="/atlas" className="text-link">
              The map
            </Link>
          </p>
        </div>
        <div className="lg:col-span-5 lg:col-start-8">
          <svg viewBox={MAP_VIEWBOX} className="mx-auto w-full max-w-[26rem]" aria-hidden="true">
            <path d={geo?.all ?? ''} className="sw-country" />
            <GeoLine d={d} role="route" nib={7} className="sw-leg" />
            <circle cx={a[0]} cy={a[1]} r="7" className="sw-stop" />
            <circle cx={b[0]} cy={b[1]} r="7" className="sw-stop is-next" />
          </svg>
          <p className="mt-3 text-right text-label tabular-nums text-canvas/45">
            {formatDeg(from.distributionPoints[0].lat, 'lat')} {formatDeg(from.distributionPoints[0].lng, 'lng')} →{' '}
            {formatDeg(next.distributionPoints[0].lat, 'lat')} {formatDeg(next.distributionPoints[0].lng, 'lng')}
          </p>
        </div>
      </div>
    </nav>
  );
}
