import { Suspense, lazy, useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Boxes, Layers, Map as MapIcon, SlidersHorizontal, Spline } from 'lucide-react';
import type { ConservationMode } from '../types';

const MODES: ConservationMode[] = ['species', 'threats', 'conservation'];
import { useSpeciesFilters } from '../hooks/useSpeciesFilters';
import { SearchBar } from '../components/species/SearchBar';
import { FilterPanel } from '../components/species/FilterPanel';
import { ModeSwitch } from '../components/map/ModeSwitch';
import { MapLegend } from '../components/map/MapLegend';
import { ProgrammeLegend } from '../components/map/ProgrammeLegend';
import { StatePanel } from '../components/map/StatePanel';
import { StateDensityLegend } from '../components/map/StateDensityLegend';
import { countSpeciesByState, recordedInDrawnState } from '../utils/stateCounts';
import { cn } from '../utils/cn';
import { LineTitle } from '../components/cinema/LineTitle';

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
  // Density shading is an overlay on the same map rather than a fourth mode:
  // it answers "where are these species concentrated?" without taking away
  // the pins that answer "which species, and where exactly?".
  const [shadeByCount, setShadeByCount] = useState(false);
  // The threads are the documentary's line, carried onto the working map. On
  // by default: they say "these places belong to one species" at a glance.
  const [showThreads, setShowThreads] = useState(true);

  // The 3D view is a companion to the Conservation mode, never the default:
  // the flat map is what the reader evaluates the data on, and it is what
  // loads unless the reader asks for the other one.
  const [wants3D, setWants3D] = useState(false);
  const [unavailable, setUnavailable] = useState<'unsupported' | 'slow' | null>(null);
  const show3D = mode === 'conservation' && wants3D && !unavailable;

  const onUnavailable = useCallback((reason: 'unsupported' | 'slow') => {
    setUnavailable(reason);
  }, []);

  const maxStateCount = useMemo(() => {
    const counts = countSpeciesByState(filters.results);
    return Math.max(0, ...counts.values());
  }, [filters.results]);

  const pointCount = useMemo(() => {
    return filters.results
      .filter((s) => !selectedState || recordedInDrawnState(s, selectedState))
      .reduce((n, s) => n + s.distributionPoints.length, 0);
  }, [filters.results, selectedState]);

  return (
    <div className="mx-auto max-w-[1600px] px-3 py-6 sm:px-5 lg:px-12 lg:py-8">
      <header className="page-head page-head--compact mb-6">
        <div className="page-head-title">
          <p className="eyebrow mb-4">The working map</p>
          <h1 className="font-serif font-light text-canvas">
            <LineTitle text="Interactive map" seed={2} />
          </h1>
        </div>
        <p className="page-head-lede">
          Pan and zoom, click a state to list its species, click a marker to open a profile, and switch between
          Species, Threats and Conservation. The filters narrow every view at once.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <SearchBar value={filters.filters.query} onChange={filters.setQuery} />
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            className="mt-2 inline-flex min-h-11 w-full items-center justify-between rounded-xs border border-forest-700 bg-forest-900 px-3 py-2 text-sm font-medium text-canvas lg:hidden"
          >
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Filters {filters.activeCount > 0 && `(${filters.activeCount})`}
            </span>
            <span>{showFilters ? 'Hide' : 'Show'}</span>
          </button>
          <div
            className={cn(
              'mt-2 scroll-slim rounded-xs border border-forest-800 bg-forest-900 p-4 lg:mt-3 lg:block lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto',
              showFilters ? 'block' : 'hidden',
            )}
          >
            <FilterPanel filters={filters} />
          </div>
        </aside>

        {/* Map + context */}
        <div className="min-w-0">
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
            <ModeSwitch mode={mode} onChange={setMode} panelId="atlas-map-panel" />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {mode === 'conservation' && (
                <div
                  role="group"
                  aria-label="Conservation view"
                  className="inline-flex rounded-xs border border-canvas/15 p-1"
                >
                  <button
                    type="button"
                    data-magnetic="0.18"
                    aria-pressed={!show3D}
                    onClick={() => setWants3D(false)}
                    className={cn(
                      'inline-flex min-h-11 items-center gap-1.5 rounded-xs px-2.5 py-1 text-xs font-medium transition sm:min-h-0',
                      show3D ? 'text-canvas/65 hover:text-canvas' : 'bg-canvas text-ink',
                    )}
                  >
                    <MapIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    Map
                  </button>
                  <button
                    type="button"
                    data-magnetic="0.18"
                    aria-pressed={show3D}
                    onClick={() => {
                      setUnavailable(null);
                      setWants3D(true);
                    }}
                    className={cn(
                      'inline-flex min-h-11 items-center gap-1.5 rounded-xs px-2.5 py-1 text-xs font-medium transition sm:min-h-0',
                      show3D ? 'bg-canvas text-ink' : 'text-canvas/65 hover:text-canvas',
                    )}
                  >
                    <Boxes className="h-3.5 w-3.5" aria-hidden="true" />
                    3D sites
                  </button>
                </div>
              )}
              {!show3D && (
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xs border border-canvas/15 px-2.5 py-1.5 text-xs text-canvas/75 hover:border-canvas/40 hover:text-canvas sm:min-h-0">
                  <input
                    type="checkbox"
                    checked={showThreads}
                    onChange={(e) => setShowThreads(e.target.checked)}
                    className="h-4 w-4 accent-[var(--color-contour)]"
                  />
                  <Spline className="h-3.5 w-3.5" aria-hidden="true" />
                  Threads
                </label>
              )}
              {!show3D && (
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xs border border-canvas/15 px-2.5 py-1.5 text-xs text-canvas/75 hover:border-canvas/40 hover:text-canvas sm:min-h-0">
                  <input
                    type="checkbox"
                    checked={shadeByCount}
                    onChange={(e) => setShadeByCount(e.target.checked)}
                    className="h-4 w-4 accent-[var(--color-contour)]"
                  />
                  <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sm:hidden">Shade by count</span>
                  <span className="hidden sm:inline">Shade states by species count</span>
                </label>
              )}
              <p className="text-sm text-canvas/60" aria-live="polite">
                {filters.results.length} species · {pointCount} mapped location{pointCount === 1 ? '' : 's'}
                {selectedState ? ` in ${selectedState}` : ''}
              </p>
            </div>
          </div>

          {/* The map is the page on a phone, so it gets more of the screen
              there than it needs on a desktop with a sidebar beside it. */}
          <div id="atlas-map-panel" role="tabpanel" aria-label="Map" className="h-[70vh] min-h-[420px] overflow-hidden rounded-xs border border-forest-800 sm:h-[62vh]">
            <Suspense
              fallback={
                <div className="grid h-full place-items-center bg-forest-900 text-sm text-canvas/70">
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
                  shadeByCount={shadeByCount}
                  showThreads={showThreads}
                />
              )}
            </Suspense>
          </div>

          {mode === 'conservation' && wants3D && unavailable && (
            <p className="callout mt-3 text-xs text-canvas/60">
              {unavailable === 'unsupported'
                ? 'The 3D view needs WebGL and is turned off where reduced motion is requested, so the map is shown instead. Everything it would show is in the map and in the species profiles.'
                : 'The 3D view was running too slowly on this device to be worth the battery, so the map is shown instead.'}
            </p>
          )}

          <div className="mt-5 grid gap-x-10 gap-y-6 md:grid-cols-2">
            {show3D ? (
              <ProgrammeLegend results={filters.results} />
            ) : shadeByCount ? (
              <StateDensityLegend max={maxStateCount} />
            ) : (
              <MapLegend mode={mode} threads={showThreads} />
            )}
            {selectedState ? (
              <StatePanel state={selectedState} onClear={() => setSelectedState(null)} />
            ) : (
              <div className="sheet text-sm text-canvas/70">
                <p className="text-canvas/80">No state selected</p>
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
