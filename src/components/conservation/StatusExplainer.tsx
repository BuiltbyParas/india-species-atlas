import { Link } from 'react-router-dom';
import { STATUS_INFO } from '../../data/statusInfo';
import { SPECIES } from '../../data/species';
import { SectionHeading } from '../ui/SectionHeading';

const LADDER = ['LC', 'NT', 'VU', 'EN', 'CR'] as const;

export function StatusExplainer() {
  return (
    <section id="understanding-status">
      <SectionHeading
        as="h1"
        size="page"
        eyebrow="Educational"
        title="Understanding conservation status"
        description="The IUCN Red List places each assessed species in a category of extinction risk, using standard criteria such as population size and trend, range size and fragmentation."
      />

      <div className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-3">
        {(['CR', 'EN', 'VU'] as const).map((code) => {
          const info = STATUS_INFO[code];
          return (
            <div
              key={code}
              className="sheet"
              style={{ borderTopColor: info.colorVar, borderTopWidth: 2 }}
            >
              <p className="font-serif text-xl font-normal tracking-tight" style={{ color: info.colorVar }}>
                {code} — {info.name}
              </p>
              <p className="mt-1 text-sm text-canvas/75">{info.definition}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-10">
        <h2 className="font-serif text-2xl font-light tracking-tight text-canvas">The ladder of risk</h2>
        <p className="mt-1 max-w-2xl text-sm text-canvas/70">
          The steps show order only: each category is a higher risk of extinction than the one before. Their height
          is not a count of species and not a measure of the distance between categories. The names are the atlas
          species recorded in each.
        </p>
        <ol className="risk-ladder mt-6" aria-label="IUCN categories from Least Concern to Critically Endangered">
          {LADDER.map((code, i) => {
            const info = STATUS_INFO[code];
            const here = SPECIES.filter((s) => s.status === code);
            return (
              <li key={code} className="risk-rung" style={{ ['--rise' as string]: i, ['--tone' as string]: info.colorVar }}>
                <p className="risk-rung-name">
                  <span className="risk-rung-code">{code}</span> {info.name}
                </p>
                {here.length ? (
                  <ul className="risk-rung-species">
                    {here.map((s) => (
                      <li key={s.id}>
                        <Link to={`/species/${s.id}`} className="text-link">{s.commonName}</Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="risk-rung-none">None in the atlas</p>
                )}
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-xs text-canvas/70">
          Beyond these, a species may be <strong className="text-canvas/80">Data Deficient</strong> (not enough
          information), <strong className="text-canvas/80">Extinct in the Wild</strong> or{' '}
          <strong className="text-canvas/80">Extinct</strong>.
        </p>
      </div>

      <div className="mt-4 callout text-sm text-canvas/80">
        <p className="font-semibold text-canvas">A common misconception</p>
        <p className="mt-1">
          The IUCN category describes a species&rsquo; <em>global</em> risk of extinction. It is <strong>not</strong>{' '}
          simply a count of how many individuals are left, and it is not specific to India. A species can be
          globally Vulnerable while its Indian population is tiny and declining, or globally Endangered while
          locally recovering. National assessments and schedules of the Wildlife (Protection) Act, 1972 give
          the India-specific picture.
        </p>
      </div>
    </section>
  );
}
