import { useSpeciesFilters } from '../hooks/useSpeciesFilters';
import { SearchBar } from '../components/species/SearchBar';
import { FilterPanel } from '../components/species/FilterPanel';
import { SpeciesCard } from '../components/species/SpeciesCard';
import { SectionHeading } from '../components/ui/SectionHeading';

export function SpeciesPage() {
  const filters = useSpeciesFilters();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <SectionHeading
        eyebrow="Directory"
        title="Species in the atlas"
        description="A small, geographically balanced selection of threatened species. Search by name, scientific name, state or region, and combine the filters."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <SearchBar value={filters.filters.query} onChange={filters.setQuery} />
          <div className="mt-3 rounded-lg border border-forest-700/70 bg-forest-900 p-3">
            <FilterPanel filters={filters} />
          </div>
        </aside>

        <div>
          <p className="mb-3 text-sm text-canvas/60" aria-live="polite">
            Showing {filters.results.length} species
            {filters.activeCount > 0 ? ` (filtered)` : ''}
          </p>
          {filters.results.length === 0 ? (
            <div className="rounded-xl border border-dashed border-forest-700 bg-forest-900/50 p-8 text-center">
              <p className="font-medium text-canvas">No species match those filters</p>
              <p className="mt-1 text-sm text-canvas/60">Try removing a filter or clearing the search.</p>
              <button
                type="button"
                onClick={filters.reset}
                className="mt-4 rounded-md border border-forest-600 px-3 py-1.5 text-sm text-canvas hover:bg-forest-800"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filters.results.map((s) => (
                <SpeciesCard key={s.id} species={s} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
