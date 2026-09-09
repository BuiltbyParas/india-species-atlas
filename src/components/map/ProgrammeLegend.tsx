import { useMemo } from 'react';
import type { Species } from '../../types';
import { ProgrammeShape } from './ProgrammeShape';
import { programmeSitesFor, type ProgrammeIdentity } from './programmeSites';

/**
 * The legend for the 3D Conservation view: one row per programme that has a
 * marker standing in the current selection.
 *
 * Shape is the primary channel and colour the secondary, so a reader who
 * cannot separate two of the tints can still separate a square from a
 * pentagon — and so the legend survives being printed in grey.
 */
export function ProgrammeLegend({ results }: { results: Species[] }) {
  const rows = useMemo(() => {
    const byProgramme = new Map<
      string,
      { name: string; identity: ProgrammeIdentity; species: string[] }
    >();
    for (const site of programmeSitesFor(results)) {
      const row = byProgramme.get(site.programme.id);
      if (row) row.species.push(site.species.commonName);
      else
        byProgramme.set(site.programme.id, {
          name: site.programme.name,
          identity: site.identity,
          species: [site.species.commonName],
        });
    }
    return [...byProgramme.values()];
  }, [results]);

  return (
    <div className="rounded-lg border border-forest-700/70 bg-forest-900/95 p-3 text-xs">
      <p className="mb-2 font-semibold uppercase tracking-[0.14em] text-forest-300">Legend</p>
      {rows.length === 0 ? (
        <p className="text-canvas/55">
          No species in the current selection is linked to a conservation programme.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((row) => (
            <li key={row.name} className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0">
                <ProgrammeShape identity={row.identity} />
              </span>
              <span className="text-canvas/80">
                <span className="font-semibold">{row.name}</span>
                <span className="text-canvas/55"> — {row.species.join(', ')}</span>
              </span>
            </li>
          ))}
          <li className="flex items-start gap-2 pt-1 text-canvas/50">
            <span
              aria-hidden="true"
              className="mt-1 h-2.5 w-3.5 shrink-0 rounded-[2px] border-t-2 border-forest-300/70 bg-forest-600"
            />
            <span>
              Raised states are those where a programme-covered species occurs. The step is a yes/no, not a
              quantity.
            </span>
          </li>
        </ul>
      )}
    </div>
  );
}
