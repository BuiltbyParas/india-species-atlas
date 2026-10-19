import { Link } from 'react-router-dom';
import type { SourceRef, Species } from '../types';
import { SPECIES } from '../data/species';
import { BIBLIOGRAPHY } from '../data/sources';
import { redListYears, STATUS_INFO } from '../data/statusInfo';
import { SectionHeading } from '../components/ui/SectionHeading';

/**
 * Sources as part of the survey instrument.
 *
 * The page is built like a register rather than a link list: every reference
 * the species entries cite appears once, with the organisation that issued
 * it, what kind of body that is, and which species rest on it — so the reader
 * can see that, say, the Wildlife Institute of India stands behind three
 * entries. Below, each species' own record: its Red List assessment year and
 * the date the entry was last checked, from the dataset.
 *
 * Nothing is added to the references. A publication date is shown only where
 * the dataset records one for the reference; "kind" is the atlas' own grouping
 * of the publisher, and is labelled as such.
 */
type Kind = 'Red List' | 'Government of India' | 'Research & conservation';

function kindOf(s: SourceRef): Kind {
  const p = `${s.publisher} ${s.url}`.toLowerCase();
  if (p.includes('iucnredlist') || p.includes('red list') || p.includes('birdlife') || p.includes('10.2305/iucn')) return 'Red List';
  if (
    p.includes('.gov.in') ||
    p.includes('.nic.in') ||
    p.includes('government') ||
    p.includes('moefcc') ||
    p.includes('ntca') ||
    p.includes('wildlife institute of india') ||
    p.includes('clean ganga')
  )
    return 'Government of India';
  return 'Research & conservation';
}

const KIND_ORDER: Kind[] = ['Red List', 'Government of India', 'Research & conservation'];

interface Entry {
  ref: SourceRef;
  kind: Kind;
  species: Species[];
}

/** Every reference cited by a species entry, once, with the species that cite it. */
const REGISTER: Entry[] = (() => {
  const byKey = new Map<string, Entry>();
  for (const s of SPECIES) {
    for (const ref of s.sources) {
      // Each species cites its own Red List assessment, but they come from one source.
      const key = isAssessment(ref) ? ref.publisher : ref.url;
      const e = byKey.get(key) ?? { ref, kind: kindOf(ref), species: [] };
      if (!e.species.includes(s)) e.species.push(s);
      byKey.set(key, e);
    }
  }
  return [...byKey.values()].sort(
    (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || b.species.length - a.species.length,
  );
})();

/** A species' own Red List assessment (linked by DOI), listed once in the register and per species below. */
function isAssessment(ref: SourceRef) {
  return ref.url.includes('doi.org/10.2305/IUCN');
}

/** "2025", or "March 2025" where the dataset records the month. */
function fmtPublished(iso: string) {
  if (/^\d{4}$/.test(iso)) return iso;
  return new Date(iso).toLocaleDateString('en-GB', { ...(iso.length > 7 ? { day: 'numeric' } : {}), month: 'long', year: 'numeric' });
}

const ORGANISATIONS = new Set(REGISTER.map((e) => e.ref.publisher.split(/[,(]/)[0].trim())).size;
const CITATIONS = SPECIES.reduce((n, s) => n + s.sources.length, 0);
const CHECKED = SPECIES.map((s) => s.lastVerified).sort();
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

function SpeciesTag({ s }: { s: Species }) {
  const a = s.distributionPoints[0];
  return (
    <Link
      to={`/species/${s.id}`}
      data-geo={`${a.lng},${a.lat}`}
      className="src-tag"
      style={{ ['--c' as string]: STATUS_INFO[s.status].hex }}
      title={`${s.commonName} (${STATUS_INFO[s.status].name})`}
    >
      {s.commonName}
    </Link>
  );
}

export function SourcesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
      <SectionHeading
        as="h1"
        size="page"
        eyebrow="References"
        title="Sources &amp; bibliography"
        description="The atlas prioritises authoritative sources: the IUCN Red List, Government of India ministries and agencies, national research institutions and established conservation organisations. Links open in a new tab."
      />

      {/* The instrument's reading: how much stands behind the atlas. */}
      <dl className="src-readout">
        <div>
          <dt>References cited</dt>
          <dd>{REGISTER.length}</dd>
        </div>
        <div>
          <dt>Publishers named</dt>
          <dd>{ORGANISATIONS}</dd>
        </div>
        <div>
          <dt>Citations across {SPECIES.length} species</dt>
          <dd>{CITATIONS}</dd>
        </div>
        <div>
          <dt>Entries last checked</dt>
          <dd className="src-readout-dates">
            {CHECKED[0] === CHECKED[CHECKED.length - 1]
              ? fmtDate(CHECKED[0])
              : `${fmtDate(CHECKED[0])} – ${fmtDate(CHECKED[CHECKED.length - 1])}`}
          </dd>
        </div>
      </dl>

      <section className="mt-16" aria-labelledby="src-register">
        <h2 id="src-register" className="font-serif text-subheading font-light text-canvas">
          The source register
        </h2>
        <p className="mt-2 max-w-2xl text-small text-canvas/60">
          Every reference the species entries cite, once, with the species that rest on it. &ldquo;Kind&rdquo; is
          the atlas&rsquo; grouping of the publisher. A date is given where the reference states one.
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="src-table">
            <caption className="sr-only">Source register: reference, organisation, kind and the species citing it</caption>
            <thead>
              <tr>
                <th scope="col">Reference</th>
                <th scope="col">Organisation</th>
                <th scope="col">Kind</th>
                <th scope="col">Species</th>
              </tr>
            </thead>
            <tbody>
              {REGISTER.map((e) => (
                <tr key={e.ref.url} data-kind={e.kind}>
                  <th scope="row">
                    {isAssessment(e.ref) ? (
                      <span>
                        {e.ref.publisher}
                        <span className="block text-label text-canvas/62">One assessment per species — linked below</span>
                      </span>
                    ) : (
                      <a href={e.ref.url} target="_blank" rel="noopener noreferrer" className="src-ref">
                        {e.ref.label}
                      </a>
                    )}
                    {!isAssessment(e.ref) && e.ref.published && (
                      <span className="block text-label tabular-nums text-canvas/62">{fmtPublished(e.ref.published)}</span>
                    )}
                  </th>
                  <td>{e.ref.publisher}</td>
                  <td className="src-kind">{e.kind}</td>
                  <td>
                    <span className="src-count tabular-nums">{e.species.length}</span>
                    <span className="src-tags">
                      {e.species.map((s) => (
                        <SpeciesTag key={s.id} s={s} />
                      ))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-16" aria-labelledby="src-species">
        <h2 id="src-species" className="font-serif text-subheading font-light text-canvas">
          Each species&rsquo; record
        </h2>
        <p className="mt-2 max-w-2xl text-small text-canvas/60">
          The Red List assessment each entry cites, with the year it was made and the year it was published; each
          population figure with what it counts and when; the date the entry was last checked against its sources;
          and the sources themselves.
        </p>
        <ol className="mt-6">
          {SPECIES.map((s, i) => (
            <li key={s.id} className="src-species">
              <span className="src-n tabular-nums">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <p>
                  <SpeciesTag s={s} />{' '}
                  <span className="font-serif italic text-canvas/70">{s.scientificName}</span>
                </p>
                <p className="mt-1 text-label tabular-nums text-canvas/70">
                  <span style={{ color: STATUS_INFO[s.status].colorVar }}>{STATUS_INFO[s.status].name}</span> ·{' '}
                  {redListYears(s)} · checked {fmtDate(s.lastVerified)}
                </p>
                {s.population?.map((e) => (
                  <p key={e.scope} className="src-pop mt-1 text-label text-canvas/70">
                    <span className="tabular-nums text-canvas/85">{e.value}</span> · {e.scope}, {e.surveyed}
                    {e.caveat && <span className="block text-canvas/62">{e.caveat}</span>}
                  </p>
                ))}
              </div>
              <ul className="src-list">
                {s.sources.map((src) => (
                  <li key={src.url}>
                    <a href={src.url} target="_blank" rel="noopener noreferrer" className="src-ref">
                      {src.label}
                    </a>
                    <span className="block text-label text-canvas/62">
                      {src.publisher} · {kindOf(src)}
                      {src.published && <span className="tabular-nums"> · {fmtPublished(src.published)}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16" aria-labelledby="src-general">
        <h2 id="src-general" className="font-serif text-subheading font-light text-canvas">
          General references
        </h2>
        <div className="mt-6 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {BIBLIOGRAPHY.map((group) => (
            <div key={group.category}>
              <h3 className="caps">{group.category}</h3>
              <ul className="src-list mt-3">
                {group.entries.map((e) => (
                  <li key={e.url}>
                    <a href={e.url} target="_blank" rel="noopener noreferrer" className="src-ref">
                      {e.label}
                    </a>
                    <span className="block text-label text-canvas/62">{e.publisher}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16" aria-labelledby="src-terrain">
        <h2 id="src-terrain" className="font-serif text-subheading font-light text-canvas">
          Home page terrain
        </h2>
        <div className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2">
          <div>
            <h3 className="caps">Elevation data</h3>
            <ul className="src-list mt-3">
              <li>
                <a
                  href="https://www.ncei.noaa.gov/products/etopo-global-relief-model"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="src-ref"
                >
                  ETOPO 2022 Global Relief Model
                </a>
                <span className="block text-label text-canvas/62">
                  NOAA National Centers for Environmental Information (NCEI)
                </span>
              </li>
              <li>
                <a href="https://doi.org/10.25921/fd45-gt74" target="_blank" rel="noopener noreferrer" className="src-ref">
                  doi:10.25921/fd45-gt74
                </a>
                <span className="block text-label text-canvas/62">Persistent identifier for the dataset</span>
              </li>
            </ul>
          </div>
          <div className="max-w-xl space-y-3 text-small text-canvas/70">
            <p>
              ETOPO is a global model of land elevation and sea-floor depth. The relief on the home page, under the
              opening, Chapter 04 and the closing, and the shaded maps drawn without it, are made from it.
            </p>
            <p>
              Two build scripts read a coarse subset of the model through NOAA&rsquo;s CoastWatch ERDDAP server and
              store small derived grids. <code>scripts/geo/build-relief.mjs</code> averages it into cells of 3 arc
              minutes (about 5.5&nbsp;km) and keeps the cells inside India&rsquo;s boundary, with the sea at 0&nbsp;m;
              <code>scripts/geo/build-region.mjs</code> averages it into cells of 4 arc minutes (about 7.4&nbsp;km)
              over India, its neighbours and the sea floor around them. Because the cells are averages, individual
              peaks are smoothed away.
            </p>
            <p>
              Heights are drawn about 20&times; taller than they are, so the mountains read at country scale. That is
              a visualisation choice; real slopes are far gentler. The colours, contours, shading and lighting are
              this project&rsquo;s own rendering of the data, not NOAA imagery.
            </p>
            <p className="text-label text-canvas/62">
              NOAA&rsquo;s model gives elevation only. It does not verify the atlas&rsquo; state boundaries, species
              locations or conservation statuses, and the atlas is not affiliated with NOAA.
            </p>
          </div>
        </div>
      </section>

      <p className="mt-12 max-w-2xl text-label text-canvas/62">
        Wikipedia and similar general encyclopaedias were used only for orientation during research and are not
        cited as the authority for any conservation status. Where a fact could not be confirmed against an
        authoritative source, it was omitted or described as approximate.
      </p>
    </div>
  );
}
