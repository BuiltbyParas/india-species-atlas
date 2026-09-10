import { useState } from 'react';
import { Boxes, LayoutGrid } from 'lucide-react';
import { useSpeciesFilters } from '../hooks/useSpeciesFilters';
import { SearchBar } from '../components/species/SearchBar';
import { FilterPanel } from '../components/species/FilterPanel';
import { SpeciesCard } from '../components/species/SpeciesCard';
import { SpeciesGallery } from '../components/species/SpeciesGallery';
import { SectionHeading } from '../components/ui/SectionHeading';
import { buttonClasses } from '../components/ui/buttonClasses';
import { cn } from '../utils/cn';

type View = 'gallery' | 'grid';

const VIEWS: Array<{ id: View; label: string; icon: typeof Boxes }> = [
  { id: 'gallery', label: 'Gallery', icon: Boxes },
  { id: 'grid', label: 'Grid', icon: LayoutGrid },
];

export function SpeciesPage() {
  const filters = useSpeciesFilters();
  const [view, setView] = useState<View>('gallery');

  const grid = (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {filters.results.map((s) => (
        <SpeciesCard key={s.id} species={s} />
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
      <SectionHeading
        as="h1"
        size="page"
        eyebrow="Directory"
        title="Species in the atlas"
        description="A small, geographically balanced selection of threatened species. Turn the gallery to browse them, or switch to the grid to scan the whole set at once. Search and filters apply to both."
      />

      <div className="mt-10 grid gap-8 lg:grid-cols-[264px_1fr] lg:gap-10">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <SearchBar value={filters.filters.query} onChange={filters.setQuery} />
          <div className="mt-3 rounded-xl border border-forest-800 bg-forest-900/70 p-4">
            <FilterPanel filters={filters} />
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-canvas/60" aria-live="polite">
              Showing {filters.results.length} species
              {filters.activeCount > 0 || filters.filters.query ? ' (filtered)' : ''}
            </p>
            <div
              role="tablist"
              aria-label="Directory view"
              className="inline-flex rounded-lg border border-forest-800 bg-forest-900 p-1"
            >
              {VIEWS.map((v) => {
                const Icon = v.icon;
                const active = v.id === view;
                return (
                  <button
                    key={v.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setView(v.id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200',
                      active
                        ? 'bg-forest-600 text-white'
                        : 'text-canvas/60 hover:bg-forest-800/70 hover:text-canvas',
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>

          {filters.results.length === 0 ? (
            <div className="rounded-xl border border-dashed border-forest-700 bg-forest-900/40 p-10 text-center">
              <p className="font-medium text-canvas">No species match those filters</p>
              <p className="mt-1 text-sm text-canvas/60">Try removing a filter or clearing the search.</p>
              <button
                type="button"
                onClick={filters.reset}
                className={buttonClasses('secondary', 'md', 'mt-5')}
              >
                Reset filters
              </button>
            </div>
          ) : view === 'gallery' ? (
            <SpeciesGallery species={filters.results} fallback={grid} />
          ) : (
            grid
          )}
        </div>
      </div>
    </div>
  );
}
