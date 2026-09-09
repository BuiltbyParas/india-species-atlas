import { Suspense, lazy, useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Boxes, Map as MapIcon, SlidersHorizontal } from 'lucide-react';
import type { ConservationMode } from '../types';

const MODES: ConservationMode[] = ['species', 'threats', 'conservation'];
import { useSpeciesFilters } from '../hooks/useSpeciesFilters';
import { SearchBar } from '../components/species/SearchBar';
import { FilterPanel } from '../components/species/FilterPanel';
import { ModeSwitch } from '../components/map/ModeSwitch';
import { MapLegend } from '../components/map/MapLegend';
import { ProgrammeLegend } from '../components/map/ProgrammeLegend';
import { StatePanel } from '../components/map/StatePanel';
import { cn } from '../utils/cn';

const AtlasMap = lazy(() =>
  import('../components/map/AtlasMap').then((m) => ({ default: m.AtlasMap })),
);

/**
 * The 3D Conservation view is opt-in and lives behind its own lazy chunk, so
 * a reader who never asks for it never downloads three.js.
 */
const ConservationView = lazy(() =>
  import('../components/map/ConservationView').then((m) => ({ default: m.ConservationView })),
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

  // The 3D view is a companion to the Conservation mode, never the default:
  // the flat map is what the reader evaluates the data on, and it is what
  // loads unless the reader asks for the other one.
  const [wants3D, setWants3D] = useState(false);
  const [unavailable, setUnavailable] = useState<'unsupported' | 'slow' | null>(null);
  const show3D = mode === 'conservation' && wants3D && !unavailable;

  const onUnavailable = useCallback((reason: 'unsupported' | 'slow') => {
    setUnavailable(reason);
  }, []);

  const pointCount = useMemo(() => {
    return filters.results
      .filter((s) => !selectedState || s.states.includes(selectedState))
      .reduce((n, s) => n + s.distributionPoints.length, 0);
  }, [filters.results, selectedState]);

  return (
    <div className="mx-auto max-w-[1600px] px-3 py-6 sm:px-5 lg:py-8">
      <div className="mb-5">
        <h1 className="font-serif text-2xl font-semibold text-canvas sm:text-3xl">Interactive map</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-canvas/65">
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
              'mt-2 scroll-slim rounded-xl border border-forest-800 bg-forest-900 p-4 lg:mt-3 lg:block lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto',
              showFilters ? 'block' : 'hidden',
            )}
          >
            <FilterPanel filters={filters} />
          </div>
        </aside>

        {/* Map + context */}
        <div className="min-w-0">
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
            <ModeSwitch mode={mode} onChange={setMode} />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {mode === 'conservation' && (
                <div
                  role="group"
                  aria-label="Conservation view"
                  className="inline-flex rounded-lg border border-forest-700 bg-forest-900 p-1"
                >
                  <button
                    type="button"
                    aria-pressed={!show3D}
                    onClick={() => setWants3D(false)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition',
                      show3D ? 'text-canvas/65 hover:text-canvas' : 'bg-forest-600 text-white',
                    )}
                  >
                    <MapIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    Map
                  </button>
                  <button
                    type="button"
                    aria-pressed={show3D}
                    onClick={() => {
                      setUnavailable(null);
                      setWants3D(true);
                    }}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition',
                      show3D ? 'bg-forest-600 text-white' : 'text-canvas/65 hover:text-canvas',
                    )}
                  >
                    <Boxes className="h-3.5 w-3.5" aria-hidden="true" />
                    3D sites
                  </button>
                </div>
              )}
              <p className="text-sm text-canvas/60" aria-live="polite">
                {filters.results.length} species · {pointCount} mapped location{pointCount === 1 ? '' : 's'}
                {selectedState ? ` in ${selectedState}` : ''}
              </p>
            </div>
          </div>

          <div className="h-[62vh] min-h-[420px] overflow-hidden rounded-xl border border-forest-800">
            <Suspense
              fallback={
                <div className="grid h-full place-items-center bg-forest-900 text-sm text-canvas/50">
                  Loading map…
                </div>
              }
            >
              {show3D ? (
                <ConservationView results={filters.results} onUnavailable={onUnavailable} />
              ) : (
                <AtlasMap
                  results={filters.results}
                  mode={mode}
                  selectedState={selectedState}
                  onSelectState={setSelectedState}
                />
              )}
            </Suspense>
          </div>

          {mode === 'conservation' && wants3D && unavailable && (
            <p className="mt-2 rounded-lg border border-dashed border-forest-700/70 bg-forest-900/50 px-3 py-2 text-xs text-canvas/60">
              {unavailable === 'unsupported'
                ? 'The 3D view needs WebGL and is turned off where reduced motion is requested, so the map is shown instead. Everything it would show is in the map and in the species profiles.'
                : 'The 3D view was running too slowly on this device to be worth the battery, so the map is shown instead.'}
            </p>
          )}

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {show3D ? <ProgrammeLegend results={filters.results} /> : <MapLegend mode={mode} />}
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
