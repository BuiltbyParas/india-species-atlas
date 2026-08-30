import { SPECIES } from '../../data/species';
import { THREATS } from '../../data/threats';
import { SectionHeading } from '../ui/SectionHeading';
import { useSpeciesProfile } from '../species/SpeciesProfileProvider';

export function ThreatsOverview() {
  const { open } = useSpeciesProfile();

  return (
    <section id="threats">
      <SectionHeading
        eyebrow="Pressures"
        title="The threats behind the status"
        description="Most threatened species face several pressures at once. These are the categories used in the map’s Threats mode."
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {THREATS.map((t) => {
          const affected = SPECIES.filter((s) => s.majorThreats.includes(t.id));
          return (
            <article key={t.id} className="rounded-xl border border-forest-700/70 bg-forest-900 p-5">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-serif text-lg font-semibold text-canvas">{t.name}</h3>
                <span className="shrink-0 rounded-full bg-forest-800 px-2 py-0.5 text-xs text-canvas/70">
                  {affected.length} species
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-canvas/75">{t.description}</p>
              {affected.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {affected.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => open(s.id)}
                        className="rounded-full bg-forest-800 px-2 py-0.5 text-xs text-canvas/80 hover:bg-forest-700"
                      >
                        {s.commonName}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
