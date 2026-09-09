import { ExternalLink } from 'lucide-react';
import { SPECIES } from '../data/species';
import { BIBLIOGRAPHY } from '../data/sources';
import { SectionHeading } from '../components/ui/SectionHeading';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useSpeciesProfile } from '../components/species/SpeciesProfileProvider';

function SourceLink({ label, publisher, url }: { label: string; publisher: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-2 rounded-md px-1 py-1 text-sm hover:bg-forest-800/50"
    >
      <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-forest-300" aria-hidden="true" />
      <span>
        <span className="text-canvas/85 group-hover:text-canvas">{label}</span>
        <span className="block text-xs text-canvas/45">{publisher}</span>
      </span>
    </a>
  );
}

export function SourcesPage() {
  const { open } = useSpeciesProfile();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:py-16">
      <SectionHeading
        as="h1"
        size="page"
        eyebrow="References"
        title="Sources &amp; bibliography"
        description="The atlas prioritises authoritative sources: the IUCN Red List, Government of India ministries and agencies, national research institutions and established conservation organisations. Links open in a new tab."
      />

      <section className="mt-10">
        <h2 className="font-serif text-xl font-semibold text-canvas">General references</h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          {BIBLIOGRAPHY.map((group) => (
            <div key={group.category}>
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-forest-300">
                {group.category}
              </h3>
              <div className="mt-1.5 space-y-0.5">
                {group.entries.map((e) => (
                  <SourceLink key={e.url} {...e} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-xl font-semibold text-canvas">Per-species sources</h2>
        <p className="mt-1 text-sm text-canvas/60">
          Every species entry is backed by the sources listed below and states the date it was last checked.
        </p>
        <div className="mt-4 space-y-4">
          {SPECIES.map((s) => (
            <article key={s.id} className="rounded-xl border border-forest-700/70 bg-forest-900 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => open(s.id)}
                  className="text-left font-serif text-base font-semibold text-canvas hover:text-forest-200"
                >
                  {s.commonName} <span className="font-sans text-sm font-normal italic text-canvas/55">{s.scientificName}</span>
                </button>
                <div className="flex items-center gap-2">
                  <StatusBadge status={s.status} size="sm" />
                  <span className="text-xs text-canvas/45">checked {s.lastVerified}</span>
                </div>
              </div>
              <div className="mt-2 space-y-0.5">
                {s.sources.map((src) => (
                  <SourceLink key={src.url} {...src} />
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <p className="mt-10 text-xs text-canvas/45">
        Wikipedia and similar general encyclopaedias were used only for orientation during research and are not
        cited as the authority for any conservation status. Where a fact could not be confirmed against an
        authoritative source, it was omitted or described as approximate.
      </p>
    </div>
  );
}
