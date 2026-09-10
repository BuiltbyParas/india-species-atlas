import {
  ExternalLink,
  MapPin,
  ShieldCheck,
  Sprout,
  TriangleAlert,
} from 'lucide-react';
import type { Species } from '../../types';
import { STATUS_INFO } from '../../data/statusInfo';
import { REGION_LABELS, HABITAT_LABELS } from '../../data/regions';
import { THREAT_BY_ID } from '../../data/threats';
import { PROGRAMME_BY_ID } from '../../data/programmes';
import { PhotoCredit } from '../ui/PhotoCredit';
import { SpeciesImage } from '../ui/SpeciesImage';
import { StatusBadge } from '../ui/StatusBadge';

function Block({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof MapPin;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-forest-700/60 py-5">
      <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-forest-300">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {title}
      </h3>
      <div className="text-sm leading-relaxed text-canvas/80">{children}</div>
    </section>
  );
}

export function SpeciesProfile({ species }: { species: Species }) {
  const status = STATUS_INFO[species.status];

  return (
    <article>
      <div className="relative">
        <SpeciesImage species={species} className="h-52 w-full sm:h-64" />
        {/* A scrim, so the badge holds up over a pale photograph. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-forest-950/80 to-transparent"
        />
        <div className="absolute left-4 top-4">
          <StatusBadge status={species.status} showName />
        </div>
      </div>

      <div className="px-5 py-5 sm:px-7">
        <PhotoCredit species={species} className="mb-4" />
        <header>
          <h2 className="font-serif text-2xl font-semibold text-canvas">{species.commonName}</h2>
          <p className="italic text-canvas/60">{species.scientificName}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {species.endemicToIndia && (
              <span className="rounded-full bg-forest-700/70 px-2 py-0.5 text-[11px] font-medium text-forest-100">
                Endemic to India
              </span>
            )}
            {species.regions.map((r) => (
              <span key={r} className="rounded-full bg-forest-800 px-2 py-0.5 text-[11px] text-canvas/70">
                {REGION_LABELS[r]}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-canvas/85">{species.description}</p>
        </header>

        <div
          className="mt-5 rounded-lg border-l-2 bg-forest-800/60 p-3 text-sm"
          style={{ borderColor: status.colorVar }}
        >
          <p className="font-semibold" style={{ color: status.colorVar }}>
            IUCN status — {status.name} ({status.code})
          </p>
          <p className="mt-1 text-canvas/75">{status.definition}</p>
          <p className="mt-2 text-xs text-canvas/55">
            Based on the IUCN Red List assessment cited below ({species.statusAssessedYear}). The IUCN category
            describes global extinction risk, not the number of individuals in India.
          </p>
        </div>

        <Block icon={MapPin} title="Where it lives in India">
          <p>{species.indianDistribution}</p>
          {species.states.length > 0 && (
            <p className="mt-2 text-xs text-canvas/55">
              States / UTs: {species.states.join(', ')}
            </p>
          )}
        </Block>

        <Block icon={Sprout} title="Habitat">
          <p>{species.habitatNote}</p>
          <p className="mt-2 text-xs text-canvas/55">
            Habitat types: {species.habitats.map((h) => HABITAT_LABELS[h]).join(', ')}
          </p>
        </Block>

        <Block icon={TriangleAlert} title="Major threats">
          <ul className="mb-2 flex flex-wrap gap-1.5">
            {species.majorThreats.map((t) => (
              <li key={t} className="rounded-full bg-forest-800 px-2 py-0.5 text-[11px] text-canvas/75">
                {THREAT_BY_ID[t].name}
              </li>
            ))}
          </ul>
          <p>{species.threatNote}</p>
        </Block>

        <Block icon={ShieldCheck} title="Conservation measures">
          <ul className="ml-4 list-disc space-y-1">
            {species.conservationActions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          {species.conservationProgrammes.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-forest-300">
                Government / partner programmes
              </p>
              <ul className="mt-1 space-y-1">
                {species.conservationProgrammes.map((id) => {
                  const p = PROGRAMME_BY_ID[id];
                  if (!p) return null;
                  return (
                    <li key={id} className="text-canvas/80">
                      <span className="font-medium text-canvas">{p.name}</span>
                      <span className="text-canvas/55"> — {p.authority}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {species.protectedAreas.length > 0 && (
            <p className="mt-3 text-xs text-canvas/55">
              Key protected areas: {species.protectedAreas.join(' · ')}
            </p>
          )}
        </Block>

        <Block icon={Sprout} title="Why it matters">
          <p>{species.whyItMatters}</p>
        </Block>

        <section className="border-t border-forest-700/60 pt-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-forest-300">Sources</h3>
          <ul className="space-y-1.5">
            {species.sources.map((src) => (
              <li key={src.url}>
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-start gap-1.5 text-sm text-forest-200 hover:text-forest-100"
                >
                  <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
                  <span>
                    {src.label}
                    <span className="block text-xs text-canvas/45">{src.publisher}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-canvas/45">
            Entry last checked against these sources on {species.lastVerified}.
          </p>
        </section>
      </div>
    </article>
  );
}
