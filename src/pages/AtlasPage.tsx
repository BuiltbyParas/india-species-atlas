import { Suspense, lazy, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import type { ConservationMode } from '../types';

const MODES: ConservationMode[] = ['species', 'threats', 'conservation'];
import { useSpeciesFilters } from '../hooks/useSpeciesFilters';
import { SearchBar } from '../components/species/SearchBar';
import { FilterPanel } from '../components/species/FilterPanel';
import { ModeSwitch } from '../components/map/ModeSwitch';
import { MapLegend } from '../components/map/MapLegend';
import { StatePanel } from '../components/map/StatePanel';
import { cn } from '../utils/cn';

const AtlasMap = lazy(() =>
  import('../components/map/AtlasMap').then((m) => ({ default: m.AtlasMap })),
);

export function AtlasPage() {
  const filters = useSpeciesFilters();
  const [searchParams, setSearchParams] = useSearchParams();
  const modeParam = searchParams.get('mode') as ConservationMode | null;
  const mode: ConservationMode = modeParam && MODES.includes(modeParam) ? modeParam : 'species';
  const setMode = (m: ConservationMode) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (m === 'species') next.delete('mode');
        else next.set('mode', m);
        return next;
      },
      { replace: true },
    );
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const pointCount = useMemo(() => {
    return filters.results
      .filter((s) => !selectedState || s.states.includes(selectedState))
      .reduce((n, s) => n + s.distributionPoints.length, 0);
  }, [filters.results, selectedState]);

  return (
    <div className="mx-auto max-w-[1600px] px-3 py-5 sm:px-5">
      <div className="mb-4">
        <h1 className="font-serif text-2xl font-semibold text-canvas sm:text-3xl">Interactive map</h1>
        <p className="mt-1 max-w-2xl text-sm text-canvas/65">
          Pan and zoom the map, click a state to list its species, click a pin to open a profile, and switch
          between Species, Threats and Conservation views. Use the filters to narrow the selection.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <SearchBar value={filters.filters.query} onChange={filters.setQuery} />
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            className="mt-2 inline-flex w-full items-center justify-between rounded-lg border border-forest-700 bg-forest-900 px-3 py-2 text-sm font-medium text-canvas lg:hidden"
          >
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Filters {filters.activeCount > 0 && `(${filters.activeCount})`}
            </span>
            <span>{showFilters ? 'Hide' : 'Show'}</span>
          </button>
          <div
            className={cn(
              'mt-2 scroll-slim rounded-lg border border-forest-700/70 bg-forest-900 p-3 lg:mt-3 lg:block lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto',
              showFilters ? 'block' : 'hidden',
            )}
          >
            <FilterPanel filters={filters} />
          </div>
        </aside>

        {/* Map + context */}
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <ModeSwitch mode={mode} onChange={setMode} />
            <p className="text-sm text-canvas/60" aria-live="polite">
              {filters.results.length} species · {pointCount} mapped location{pointCount === 1 ? '' : 's'}
              {selectedState ? ` in ${selectedState}` : ''}
            </p>
          </div>

          <div className="h-[62vh] min-h-[420px] overflow-hidden rounded-xl border border-forest-700">
            <Suspense
              fallback={
                <div className="grid h-full place-items-center bg-forest-900 text-sm text-canvas/50">
                  Loading map…
                </div>
              }
            >
              <AtlasMap
                results={filters.results}
                mode={mode}
                selectedState={selectedState}
                onSelectState={setSelectedState}
              />
            </Suspense>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <MapLegend mode={mode} />
            {selectedState ? (
              <StatePanel state={selectedState} onClear={() => setSelectedState(null)} />
            ) : (
              <div className="rounded-lg border border-dashed border-forest-700/70 bg-forest-900/50 p-4 text-sm text-canvas/55">
                <p className="font-medium text-canvas/75">No state selected</p>
                <p className="mt-1">
                  Click any state on the map to see which of the atlas&rsquo; species occur there and open their
                  profiles.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
