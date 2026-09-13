import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { GitCompareArrows, Heart, X } from 'lucide-react';
import type { Species } from '../types';
import { SPECIES, SPECIES_BY_ID } from '../data/species';
import { HABITAT_LABELS, REGION_LABELS } from '../data/regions';
import { THREAT_BY_ID } from '../data/threats';
import { PROGRAMME_BY_ID } from '../data/programmes';
import { STATUS_INFO } from '../data/statusInfo';
import { useFavourites } from '../hooks/useFavourites';
import { SpeciesImage } from '../components/ui/SpeciesImage';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SectionHeading } from '../components/ui/SectionHeading';
import { buttonClasses } from '../components/ui/buttonClasses';
import { useSpeciesProfile } from '../components/species/SpeciesProfileProvider';

/**
 * Side-by-side comparison of up to three species.
 *
 * The selection lives in the URL rather than in component state, so a
 * comparison can be linked to, bookmarked and handed in — the same reason the
 * species profiles are deep-linkable.
 *
 * Every row is read straight from the dataset. Where an entry holds nothing
 * for a row the cell says so in words; it is never left blank, because a blank
 * cell in a comparison reads as "none" when it may mean "not recorded".
 */

const MAX = 3;

/** One row of the table: a label and how to render it for a species. */
const ROWS: Array<{
  label: string;
  render: (s: Species) => React.ReactNode;
}> = [
  {
    label: 'Scientific name',
    render: (s) => <span className="italic">{s.scientificName}</span>,
  },
  {
    label: 'Group',
    render: (s) => <span className="capitalize">{s.group}</span>,
  },
  {
    label: 'IUCN status',
    render: (s) => (
      <span className="flex flex-col items-start gap-1">
        <StatusBadge status={s.status} size="sm" />
        <span className="text-xs text-canvas/60">{STATUS_INFO[s.status].name}</span>
      </span>
    ),
  },
  {
    label: 'Assessment cited',
    render: (s) => <span className="font-mono text-xs">{s.statusAssessedYear}</span>,
  },
  {
    label: 'Listed in this category since',
    render: (s) => {
      const first = s.statusHistory?.[0];
      return first ? (
        <span>
          <span className="font-mono text-xs">{first.year}</span>
          <span className="block text-xs text-canvas/55">{first.note}</span>
        </span>
      ) : (
        <span className="text-xs text-canvas/50">Not recorded in this atlas</span>
      );
    },
  },
  {
    label: 'Endemic to India',
    render: (s) => (s.endemicToIndia ? 'Yes' : 'No'),
  },
  {
    label: 'Ecological regions',
    render: (s) => s.regions.map((r) => REGION_LABELS[r]).join(', '),
  },
  {
    label: 'States / UTs',
    render: (s) => (
      <span>
        <span className="font-medium text-canvas">{s.states.length}</span>
        <span className="block text-xs text-canvas/60">{s.states.join(', ')}</span>
      </span>
    ),
  },
  {
    label: 'Habitats',
    render: (s) => s.habitats.map((h) => HABITAT_LABELS[h]).join(', '),
  },
  {
    label: 'Major threats',
    render: (s) => (
      <ul className="space-y-0.5">
        {s.majorThreats.map((t) => (
          <li key={t}>{THREAT_BY_ID[t].name}</li>
        ))}
      </ul>
    ),
  },
  {
    label: 'Programmes',
    render: (s) =>
      s.conservationProgrammes.length === 0 ? (
        <span className="text-xs text-canvas/50">None linked in this atlas</span>
      ) : (
        <ul className="space-y-0.5">
          {s.conservationProgrammes.map((id) => {
            const p = PROGRAMME_BY_ID[id];
            return p ? (
              <li key={id}>
                {p.name}
                {p.startedYear && <span className="text-canvas/50"> · {p.startedYear}</span>}
              </li>
            ) : null;
          })}
        </ul>
      ),
  },
  {
    label: 'Key protected areas',
    render: (s) =>
      s.protectedAreas.length === 0 ? (
        <span className="text-xs text-canvas/50">None listed</span>
      ) : (
        <ul className="space-y-0.5">
          {s.protectedAreas.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      ),
  },
  {
    label: 'Mapped locations',
    render: (s) => s.distributionPoints.length,
  },
  {
    label: 'Entry last checked',
    render: (s) => <span className="font-mono text-xs">{s.lastVerified}</span>,
  },
];

export function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { ids: savedIds, count: savedCount } = useFavourites();
  const { open } = useSpeciesProfile();

  const selected = useMemo(() => {
    const raw = searchParams.get('ids');
    if (!raw) return [];
    const seen = new Set<string>();
    return raw
      .split(',')
      .map((id) => id.trim())
      .filter((id) => {
        if (!SPECIES_BY_ID[id] || seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .slice(0, MAX)
      .map((id) => SPECIES_BY_ID[id]);
  }, [searchParams]);

  const setSelection = (ids: string[]) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (ids.length === 0) next.delete('ids');
        else next.set('ids', ids.join(','));
        return next;
      },
      { replace: false },
    );

  const add = (id: string) => setSelection([...selected.map((s) => s.id), id].slice(0, MAX));
  const remove = (id: string) => setSelection(selected.filter((s) => s.id !== id).map((s) => s.id));

  const remaining = SPECIES.filter((s) => !selected.some((sel) => sel.id === s.id));
  const full = selected.length >= MAX;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
      <SectionHeading
        as="h1"
        size="page"
        eyebrow="Compare"
        title="Two or three species, side by side"
        description="Comparison makes the differences between categories concrete: two species can share an IUCN status and face completely different threats, or hold the same threat across very different ranges. Every cell is read from the atlas dataset, and the selection is kept in the address bar so a comparison can be linked to."
      />

      <div className="mt-8 flex flex-wrap items-center gap-3 rounded-xl border border-forest-800 bg-forest-900/70 p-4">
        <label className="flex w-full flex-col gap-2 text-sm text-canvas/75 sm:w-auto sm:flex-row sm:items-center">
          <span className="inline-flex items-center gap-2 font-medium">
            <GitCompareArrows className="h-4 w-4 text-forest-300" aria-hidden="true" />
            Add a species
          </span>
          <select
            value=""
            disabled={full || remaining.length === 0}
            onChange={(e) => e.target.value && add(e.target.value)}
            className="w-full rounded-lg border border-forest-700 bg-forest-900 px-3 py-2 text-sm text-canvas disabled:opacity-50 sm:w-auto"
          >
            <option value="">{full ? `Maximum of ${MAX} selected` : 'Choose…'}</option>
            {remaining.map((s) => (
              <option key={s.id} value={s.id}>
                {s.commonName} ({s.status})
              </option>
            ))}
          </select>
        </label>

        {savedCount >= 2 && (
          <button
            type="button"
            onClick={() => setSelection(savedIds.slice(0, MAX))}
            className={buttonClasses('secondary', 'sm')}
          >
            <Heart className="h-4 w-4" aria-hidden="true" />
            Compare my saved species
          </button>
        )}

        {selected.length > 0 && (
          <button type="button" onClick={() => setSelection([])} className={buttonClasses('ghost', 'sm')}>
            Clear
          </button>
        )}
      </div>

      {selected.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-forest-700 bg-forest-900/40 p-10 text-center">
          <p className="font-medium text-canvas">Nothing selected yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-canvas/60">
            Choose up to {MAX} species above, or open any species profile and use “Compare with another
            species”.
          </p>
          <Link to="/species" className={buttonClasses('secondary', 'md', 'mt-5')}>
            Browse the directory
          </Link>
        </div>
      ) : (
        <div className="mt-8">
          <p className="mb-2 text-xs text-canvas/55 sm:hidden">
            Scroll the table sideways to reach the other species — the attribute column stays in place.
          </p>
          <div className="overflow-x-auto rounded-xl border border-forest-800">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <caption className="sr-only">
              Comparison of {selected.map((s) => s.commonName).join(', ')}
            </caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 w-32 bg-forest-900 p-3 align-bottom text-xs font-semibold uppercase tracking-[0.14em] text-forest-300 sm:w-40"
                >
                  Attribute
                </th>
                {selected.map((s) => (
                  <th key={s.id} scope="col" className="border-l border-forest-800 bg-forest-900 p-3 align-bottom">
                    <div className="relative">
                      <SpeciesImage species={s} className="mb-2.5 h-28 w-full rounded-lg" />
                      <button
                        type="button"
                        onClick={() => remove(s.id)}
                        aria-label={`Remove ${s.commonName} from the comparison`}
                        className="absolute right-1.5 top-1.5 rounded-full bg-forest-950/80 p-1 text-canvas/70 hover:text-canvas"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => open(s.id)}
                      className="font-serif text-base font-semibold text-canvas hover:text-forest-200"
                    >
                      {s.commonName}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr key={row.label} className={i % 2 === 1 ? 'bg-forest-900/40' : undefined}>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border-t border-forest-800 bg-forest-900 p-3 align-top text-xs font-semibold uppercase tracking-[0.12em] text-forest-300"
                  >
                    {row.label}
                  </th>
                  {selected.map((s) => (
                    <td key={s.id} className="border-l border-t border-forest-800 p-3 align-top text-canvas/80">
                      {row.render(s)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
