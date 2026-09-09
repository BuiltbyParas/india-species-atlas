import { STATUS_INFO } from '../../data/statusInfo';
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

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {(['CR', 'EN', 'VU'] as const).map((code) => {
          const info = STATUS_INFO[code];
          return (
            <div
              key={code}
              className="rounded-xl border border-forest-700/70 bg-forest-900 p-4"
              style={{ borderTopColor: info.colorVar, borderTopWidth: 3 }}
            >
              <p className="font-serif text-lg font-semibold" style={{ color: info.colorVar }}>
                {code} — {info.name}
              </p>
              <p className="mt-1 text-sm text-canvas/75">{info.definition}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl border border-forest-700/70 bg-forest-900 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest-300">The full ladder of risk</p>
        <ol className="mt-3 flex flex-wrap items-stretch gap-2">
          {LADDER.map((code) => {
            const info = STATUS_INFO[code];
            return (
              <li
                key={code}
                className="flex-1 rounded-lg border border-forest-800 bg-forest-950 p-3 text-center"
                style={{ minWidth: 120 }}
              >
                <span className="block text-sm font-bold" style={{ color: info.colorVar }}>{code}</span>
                <span className="block text-xs text-canvas/70">{info.name}</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-xs text-canvas/55">
          Beyond these, a species may be <strong className="text-canvas/80">Data Deficient</strong> (not enough
          information), <strong className="text-canvas/80">Extinct in the Wild</strong> or{' '}
          <strong className="text-canvas/80">Extinct</strong>.
        </p>
      </div>

      <div className="mt-4 rounded-xl border-l-2 border-forest-400 bg-forest-800/50 p-4 text-sm text-canvas/80">
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
