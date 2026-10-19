import { ExternalLink } from 'lucide-react';
import { PROGRAMMES } from '../../data/programmes';
import { SPECIES_BY_ID } from '../../data/species';
import { SectionHeading } from '../ui/SectionHeading';
import { useSpeciesProfile } from '../species/SpeciesProfileProvider';

// Oldest first; programmes with no recorded start year follow, in their listed order.
const LEDGER = PROGRAMMES.map((p, i) => ({ p, i })).sort(
  (a, b) => (a.p.startedYear ?? Infinity) - (b.p.startedYear ?? Infinity) || a.i - b.i,
);

/**
 * The programmes as a ledger: one ruled entry per programme, its start year
 * set large in the margin, so the section reads as a dated record of action
 * rather than a grid of text blocks. Years and links are the dataset's own.
 */
export function ProgrammesList() {
  const { open } = useSpeciesProfile();

  return (
    <section id="programmes">
      <SectionHeading
        eyebrow="Government &amp; partner action"
        title="Conservation programmes"
        description="Selected programmes run by the Government of India and partners, oldest first. A programme is linked to a species here only where public government or IUCN sources describe that species as a focus."
      />
      <ol className="ledger mt-10">
        {LEDGER.map(({ p }) => (
          <li key={p.id} className="ledger-row">
            <p className="ledger-year font-serif tabular-nums" aria-label={p.startedYear ? `Since ${p.startedYear}` : 'Start year not recorded'}>
              {p.startedYear ?? <span className="ledger-undated">Year not recorded</span>}
            </p>
            <article className="ledger-body">
              <h3 className="font-serif text-subheading font-light text-canvas">{p.name}</h3>
              <p className="mt-1 text-small text-canvas/70">{p.authority}</p>
              <p className="mt-3 max-w-[40rem] text-body text-canvas/80">{p.description}</p>

              {p.speciesIds.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <p className="caps">In this atlas</p>
                  <ul className="flex flex-wrap gap-1.5">
                    {p.speciesIds.map((id) => {
                      const s = SPECIES_BY_ID[id];
                      if (!s) return null;
                      return (
                        <li key={id}>
                          <button type="button" onClick={() => open(id)} className="ledger-chip">
                            {s.commonName}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <ul className="mt-4 space-y-1">
                {p.sources.map((src) => (
                  <li key={src.url}>
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-start gap-1.5 text-small text-forest-200 hover:text-canvas"
                    >
                      <ExternalLink className="mt-1 h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
                      <span>
                        {src.label} — <span className="text-canvas/62">{src.publisher}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}
