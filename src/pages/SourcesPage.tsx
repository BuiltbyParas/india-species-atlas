import { Link } from 'react-router-dom';
import type { SourceRef, Species } from '../types';
import { SPECIES } from '../data/species';
import { BIBLIOGRAPHY } from '../data/sources';
import { STATUS_INFO } from '../data/statusInfo';
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
 * Nothing is added to the references. They carry no publication year in the
 * dataset, so none is shown; "kind" is the atlas' own grouping of the
 * publisher, and is labelled as such.
 */
type Kind = 'Red List' | 'Government of India' | 'Research & conservation';

function kindOf(s: SourceRef): Kind {
  const p = `${s.publisher} ${s.url}`.toLowerCase();
  if (p.includes('iucnredlist') || p.includes('red list') || p.includes('birdlife')) return 'Red List';
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
      // The Red List search links differ per species but come from one source.
      const key = ref.url.includes('iucnredlist.org/search') ? ref.publisher : ref.url;
      const e = byKey.get(key) ?? { ref, kind: kindOf(ref), species: [] };
      if (!e.species.includes(s)) e.species.push(s);
      byKey.set(key, e);
    }
  }
  return [...byKey.values()].sort(
    (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || b.species.length - a.species.length,
  );
})();

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
          the atlas&rsquo; grouping of the publisher. The dataset records no publication year for these references,
          so none is given.
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
                    {e.ref.url.includes('iucnredlist.org/search') ? (
                      <span>
                        {e.ref.publisher}
                        <span className="block text-label text-canvas/45">One assessment per species — linked below</span>
                      </span>
                    ) : (
                      <a href={e.ref.url} target="_blank" rel="noopener noreferrer" className="src-ref">
                        {e.ref.label}
                      </a>
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
          The year of the Red List assessment each entry cites, the date the entry was last checked against its
          sources, and the sources themselves.
        </p>
        <ol className="mt-6">
          {SPECIES.map((s, i) => (
            <li key={s.id} className="src-species">
              <span className="src-n tabular-nums">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <p>
                  <SpeciesTag s={s} />{' '}
                  <span className="font-serif italic text-canvas/50">{s.scientificName}</span>
                </p>
                <p className="mt-1 text-label tabular-nums text-canvas/50">
                  <span style={{ color: STATUS_INFO[s.status].colorVar }}>{STATUS_INFO[s.status].name}</span> · assessed{' '}
                  {s.statusAssessedYear} · checked {fmtDate(s.lastVerified)}
                </p>
              </div>
              <ul className="src-list">
                {s.sources.map((src) => (
                  <li key={src.url}>
                    <a href={src.url} target="_blank" rel="noopener noreferrer" className="src-ref">
                      {src.label}
                    </a>
                    <span className="block text-label text-canvas/45">
                      {src.publisher} · {kindOf(src)}
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
                    <span className="block text-label text-canvas/45">{e.publisher}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-12 max-w-2xl text-label text-canvas/45">
        Wikipedia and similar general encyclopaedias were used only for orientation during research and are not
        cited as the authority for any conservation status. Where a fact could not be confirmed against an
        authoritative source, it was omitted or described as approximate.
      </p>
    </div>
  );
}
