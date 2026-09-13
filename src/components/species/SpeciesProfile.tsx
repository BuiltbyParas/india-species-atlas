import { useId, useRef, useState } from 'react';
import { ExternalLink, GitCompareArrows, History, MapPin, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Species } from '../../types';
import { STATUS_INFO } from '../../data/statusInfo';
import { REGION_LABELS, HABITAT_LABELS } from '../../data/regions';
import { THREAT_BY_ID } from '../../data/threats';
import { PROGRAMME_BY_ID } from '../../data/programmes';
import { PhotoCredit } from '../ui/PhotoCredit';
import { SpeciesImage } from '../ui/SpeciesImage';
import { StatusBadge } from '../ui/StatusBadge';
import { FavouriteButton } from './FavouriteButton';
import { cn } from '../../utils/cn';

/**
 * The profile holds five kinds of information — what the species is, where it
 * lives, what is happening to it, what is being done about it, and where all
 * of that was read. As one scroll that is a long column in which the sources
 * are furthest from the claims they support; as tabs each question can be
 * answered on its own. The panel below the tabs is one scrolling region, so
 * switching tab never moves the reader's place in the page.
 */

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'distribution', label: 'Distribution' },
  { id: 'threats', label: 'Threats' },
  { id: 'conservation', label: 'Conservation' },
  { id: 'sources', label: 'Sources' },
] as const;

type TabId = (typeof TABS)[number]['id'];

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-forest-700/60 py-5 first:border-t-0 first:pt-0">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-forest-300">{title}</h3>
      <div className="text-sm leading-relaxed text-canvas/80">{children}</div>
    </section>
  );
}

/** The dated Red List record, or a plain statement that none is held. */
function AssessmentHistory({ species }: { species: Species }) {
  const history = species.statusHistory ?? [];

  return (
    <Block title="Assessment history">
      {history.length === 0 ? (
        <p className="text-canvas/65">
          No earlier assessment is recorded in this atlas for {species.commonName}. The status above is taken
          from the {species.statusAssessedYear} assessment cited under Sources; the Red List may hold earlier
          assessments that have not been checked here.
        </p>
      ) : (
        <ol className="space-y-3">
          {history.map((h) => (
            <li key={`${h.year}-${h.status}`} className="flex gap-3">
              <span className="w-12 shrink-0 pt-0.5 font-mono text-sm text-canvas/70">{h.year}</span>
              <span className="flex-1">
                <StatusBadge status={h.status} size="sm" />
                <span className="mt-1 block text-canvas/75">{h.note}</span>
                <a
                  href={h.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 inline-flex items-center gap-1 text-xs text-forest-300 hover:text-forest-200"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  {h.source.publisher}
                </a>
              </span>
            </li>
          ))}
          <li className="flex gap-3">
            <span className="w-12 shrink-0 font-mono text-sm text-canvas/70">{species.statusAssessedYear}</span>
            <span className="flex-1 text-canvas/65">
              Assessment cited by this atlas entry.
            </span>
          </li>
        </ol>
      )}
    </Block>
  );
}

export function SpeciesProfile({ species }: { species: Species }) {
  const status = STATUS_INFO[species.status];
  const [tab, setTab] = useState<TabId>('overview');
  const baseId = useId();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Arrow keys move between tabs and select as they go, which is the expected
  // behaviour for a tab set whose panels are cheap to render.
  const onTabKeyDown = (e: React.KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === tab);
    let next = i;
    if (e.key === 'ArrowRight') next = (i + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    else return;
    e.preventDefault();
    setTab(TABS[next].id);
    tabRefs.current[TABS[next].id]?.focus();
  };

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

      <div className="px-5 pt-5 sm:px-7">
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
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <FavouriteButton species={species} withLabel />
            <Link
              to={`/compare?ids=${species.id}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-forest-700 px-2.5 py-1.5 text-xs font-medium text-canvas/65 transition-colors hover:border-forest-500 hover:text-canvas"
            >
              <GitCompareArrows className="h-4 w-4" aria-hidden="true" />
              Compare with another species
            </Link>
          </div>
        </header>
      </div>

      <div className="mt-5 border-b border-forest-700/60 px-5 sm:px-7">
        <div
          role="tablist"
          aria-label={`${species.commonName} profile sections`}
          onKeyDown={onTabKeyDown}
          className="scroll-slim -mb-px flex gap-1 overflow-x-auto"
        >
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[t.id] = el;
                }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${t.id}`}
                aria-selected={active}
                aria-controls={`${baseId}-panel-${t.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setTab(t.id)}
                className={cn(
                  'shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'border-forest-400 text-canvas'
                    : 'border-transparent text-canvas/55 hover:text-canvas',
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel-${tab}`}
        aria-labelledby={`${baseId}-tab-${tab}`}
        tabIndex={0}
        className="px-5 py-5 focus-visible:outline-none sm:px-7"
      >
        {tab === 'overview' && (
          <>
            <div
              className="mb-5 rounded-lg border-l-2 bg-forest-800/60 p-3 text-sm"
              style={{ borderColor: status.colorVar }}
            >
              <p className="font-semibold" style={{ color: status.colorVar }}>
                IUCN status — {status.name} ({status.code})
              </p>
              <p className="mt-1 text-canvas/75">{status.definition}</p>
              <p className="mt-2 text-xs text-canvas/55">
                Based on the IUCN Red List assessment cited under Sources ({species.statusAssessedYear}). The
                IUCN category describes global extinction risk, not the number of individuals in India.
              </p>
            </div>

            <Block title="Habitat">
              <p>{species.habitatNote}</p>
              <p className="mt-2 text-xs text-canvas/55">
                Habitat types: {species.habitats.map((h) => HABITAT_LABELS[h]).join(', ')}
              </p>
            </Block>

            <Block title="Why it matters">
              <p>{species.whyItMatters}</p>
            </Block>

            <AssessmentHistory species={species} />
          </>
        )}

        {tab === 'distribution' && (
          <>
            <Block title="Where it lives in India">
              <p>{species.indianDistribution}</p>
              {species.states.length > 0 && (
                <p className="mt-2 text-xs text-canvas/55">States / UTs: {species.states.join(', ')}</p>
              )}
            </Block>

            <Block title={`Mapped locations (${species.distributionPoints.length})`}>
              <ul className="space-y-2.5">
                {species.distributionPoints.map((p) => (
                  <li key={`${p.lat},${p.lng}`}>
                    <span className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-forest-300" aria-hidden="true" />
                      <span>
                        <span className="font-medium text-canvas">{p.label}</span>
                        {p.note && <span className="block text-xs text-canvas/55">{p.note}</span>}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-canvas/45">
                Indicative locations within a known range, not population boundaries.
              </p>
            </Block>

            <Block title="Ecological regions">
              <ul className="flex flex-wrap gap-1.5">
                {species.regions.map((r) => (
                  <li key={r} className="rounded-full bg-forest-800 px-2 py-0.5 text-[11px] text-canvas/75">
                    {REGION_LABELS[r]}
                  </li>
                ))}
              </ul>
            </Block>
          </>
        )}

        {tab === 'threats' && (
          <Block title="Major threats">
            <ul className="mb-3 space-y-1.5">
              {species.majorThreats.map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-en" aria-hidden="true" />
                  <span>
                    <span className="font-medium text-canvas">{THREAT_BY_ID[t].name}</span>
                    <span className="block text-xs text-canvas/55">{THREAT_BY_ID[t].description}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p>{species.threatNote}</p>
          </Block>
        )}

        {tab === 'conservation' && (
          <>
            <Block title="Conservation measures">
              <ul className="ml-4 list-disc space-y-1">
                {species.conservationActions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </Block>

            {species.conservationProgrammes.length > 0 && (
              <Block title="Government / partner programmes">
                <ul className="space-y-2">
                  {species.conservationProgrammes.map((id) => {
                    const p = PROGRAMME_BY_ID[id];
                    if (!p) return null;
                    return (
                      <li key={id}>
                        <span className="font-medium text-canvas">{p.name}</span>
                        {p.startedYear && <span className="text-canvas/55"> · from {p.startedYear}</span>}
                        <span className="block text-xs text-canvas/55">{p.authority}</span>
                      </li>
                    );
                  })}
                </ul>
              </Block>
            )}

            {species.protectedAreas.length > 0 && (
              <Block title="Key protected areas">
                <ul className="ml-4 list-disc space-y-1">
                  {species.protectedAreas.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </Block>
            )}
          </>
        )}

        {tab === 'sources' && (
          <>
            <Block title="Sources for this entry">
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
              <p className="mt-3 flex items-center gap-1.5 text-xs text-canvas/45">
                <History className="h-3.5 w-3.5" aria-hidden="true" />
                Entry last checked against these sources on {species.lastVerified}.
              </p>
            </Block>

            <Block title="Photograph">
              <PhotoCredit species={species} />
              <p className="mt-2 text-xs text-canvas/45">{species.image.alt}</p>
            </Block>
          </>
        )}
      </div>
    </article>
  );
}
