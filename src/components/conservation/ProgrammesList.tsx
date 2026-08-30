import { ExternalLink } from 'lucide-react';
import { PROGRAMMES } from '../../data/programmes';
import { SPECIES_BY_ID } from '../../data/species';
import { SectionHeading } from '../ui/SectionHeading';
import { useSpeciesProfile } from '../species/SpeciesProfileProvider';

export function ProgrammesList() {
  const { open } = useSpeciesProfile();

  return (
    <section id="programmes">
      <SectionHeading
        eyebrow="Government &amp; partner action"
        title="Conservation programmes"
        description="Selected programmes run by the Government of India and partners. A programme is linked to a species here only where public government or IUCN sources describe that species as a focus."
      />
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {PROGRAMMES.map((p) => (
          <article key={p.id} className="rounded-xl border border-forest-700/70 bg-forest-900 p-5">
            <h3 className="font-serif text-lg font-semibold text-canvas">{p.name}</h3>
            <p className="mt-0.5 text-xs text-canvas/55">
              {p.authority}
              {p.startedYear ? ` · since ${p.startedYear}` : ''}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-canvas/75">{p.description}</p>

            {p.speciesIds.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-forest-300">In this atlas</p>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {p.speciesIds.map((id) => {
                    const s = SPECIES_BY_ID[id];
                    if (!s) return null;
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          onClick={() => open(id)}
                          className="rounded-full bg-forest-800 px-2 py-0.5 text-xs text-canvas/80 hover:bg-forest-700"
                        >
                          {s.commonName}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <ul className="mt-3 space-y-1">
              {p.sources.map((src) => (
                <li key={src.url}>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-start gap-1.5 text-xs text-forest-200 hover:text-forest-100"
                  >
                    <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
                    <span>{src.label} — <span className="text-canvas/45">{src.publisher}</span></span>
                  </a>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
