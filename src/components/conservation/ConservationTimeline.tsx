import { useMemo, useState } from 'react';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { SPECIES } from '../../data/species';
import { timelineEvents, speciesWithoutHistory } from '../../utils/timeline';
import { StatusBadge } from '../ui/StatusBadge';
import { SectionHeading } from '../ui/SectionHeading';
import { useSpeciesProfile } from '../species/SpeciesProfileProvider';
import { cn } from '../../utils/cn';

/**
 * The timeline. Move the year and the record fills in behind it.
 *
 * Two rules keep it honest. It shows events, not trends: nothing is
 * interpolated between two dates, because the atlas holds no population
 * series to interpolate. And a species with no dated listing is named as
 * such underneath rather than quietly left out, so the gaps in the record
 * are as visible as the record.
 */
export function ConservationTimeline() {
  const events = useMemo(() => timelineEvents(), []);
  const missing = useMemo(() => speciesWithoutHistory(), []);
  const { open } = useSpeciesProfile();

  const firstYear = events[0]?.year ?? 1970;
  const lastYear = new Date().getFullYear();
  const [year, setYear] = useState(lastYear);

  const shown = events.filter((e) => e.year <= year);
  const hidden = events.length - shown.length;

  const listedSpecies = new Set(
    shown.filter((e) => e.kind === 'status' && e.speciesId).map((e) => e.speciesId),
  ).size;
  const programmes = shown.filter((e) => e.kind === 'programme').length;

  return (
    <section>
      <SectionHeading
        eyebrow="Timeline"
        title="The record, year by year"
        description="Two kinds of dated fact sit on one line: the year a species was listed in the Red List category it still holds, and the year a conservation programme began. Move the slider to read the record as it stood at any point."
      />

      <div className="mt-6 rounded-xl border border-forest-800 bg-forest-900/70 p-4 sm:p-5">
        <label htmlFor="timeline-year" className="block text-xs font-semibold uppercase tracking-[0.14em] text-forest-300">
          Show the record as at
        </label>
        <div className="mt-2 flex items-center gap-4">
          <input
            id="timeline-year"
            type="range"
            min={firstYear}
            max={lastYear}
            step={1}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-describedby="timeline-summary"
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-forest-700 accent-forest-400"
          />
          <output htmlFor="timeline-year" className="w-16 shrink-0 text-right font-mono text-xl text-canvas">
            {year}
          </output>
        </div>
        <p id="timeline-summary" className="mt-2.5 text-sm text-canvas/65">
          By {year}: {listedSpecies} of the {SPECIES.length} species in the atlas had a dated listing on
          record here, and {programmes} of the {events.filter((e) => e.kind === 'programme').length}{' '}
          programmes had begun.
        </p>
      </div>

      <ol className="mt-6 space-y-3">
        {shown
          .slice()
          .reverse()
          .map((e) => (
            <li
              key={e.id}
              className="relative flex gap-4 rounded-lg border border-forest-800 bg-forest-900/50 p-3.5 pl-4"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'absolute inset-y-3 left-0 w-0.5 rounded-full',
                  e.kind === 'programme' ? 'bg-forest-500' : 'bg-forest-700',
                )}
              />
              <span className="w-12 shrink-0 font-mono text-sm text-canvas/70">{e.year}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {e.kind === 'status' && e.status ? (
                    <StatusBadge status={e.status} size="sm" />
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-forest-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-forest-300">
                      <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                      Programme
                    </span>
                  )}
                  {e.speciesId ? (
                    <button
                      type="button"
                      onClick={() => open(e.speciesId as string)}
                      className="text-left text-sm font-medium text-canvas hover:text-forest-200"
                    >
                      {e.title}
                    </button>
                  ) : (
                    <span className="text-sm font-medium text-canvas">{e.title}</span>
                  )}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-canvas/65">{e.detail}</p>
                {e.source && (
                  <a
                    href={e.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-forest-300 hover:text-forest-200"
                  >
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    {e.source.publisher}
                  </a>
                )}
              </div>
            </li>
          ))}
      </ol>

      {hidden > 0 && (
        <p className="mt-3 text-sm text-canvas/55" aria-live="polite">
          {hidden} later event{hidden === 1 ? '' : 's'} {hidden === 1 ? 'is' : 'are'} not shown. Move the
          slider to {lastYear} for the whole record.
        </p>
      )}

      <div className="mt-6 rounded-lg border border-dashed border-forest-700/70 bg-forest-900/40 p-4 text-sm text-canvas/65">
        <p className="font-medium text-canvas/80">What this timeline does not show</p>
        <p className="mt-1.5">
          A listing year is recorded here only where a source states it outright. No dated listing has been
          found and checked for{' '}
          {missing.map((s, i) => (
            <span key={s.id}>
              {i > 0 && (i === missing.length - 1 ? ' and ' : ', ')}
              <button
                type="button"
                onClick={() => open(s.id)}
                className="underline decoration-forest-700 underline-offset-2 hover:text-canvas hover:decoration-forest-400"
              >
                {s.commonName}
              </button>
            </span>
          ))}
          , so they appear nowhere on the line above. Their current category and the year of the assessment
          the atlas cites are on their profiles. The Red List publishes a fuller assessment history for every
          taxon; it is not machine-readable, and an unchecked year would look exactly like a checked one here.
        </p>
        <p className="mt-2">
          Nothing between two events is interpolated. The line is a record of dated facts, not a population
          trend.
        </p>
      </div>
    </section>
  );
}
