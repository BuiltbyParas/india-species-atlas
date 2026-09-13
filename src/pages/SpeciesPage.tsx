import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Boxes, Check, Heart, LayoutGrid, Link2, Share2, SlidersHorizontal } from 'lucide-react';
import { useSpeciesFilters } from '../hooks/useSpeciesFilters';
import { useFavourites } from '../hooks/useFavourites';
import { SPECIES_BY_ID } from '../data/species';
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
  const [savedOnly, setSavedOnly] = useState(false);
  // On a phone the unfiltered directory is what a reader wants first: with the
  // panel open by default, seventeen checkboxes stand between the page heading
  // and the first species. It stays open from `lg` up, where it costs nothing.
  const [showFilters, setShowFilters] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { ids: savedIds, count: savedCount, isFavourite, addMany } = useFavourites();

  /**
   * A shared list is a list of ids in the address bar. There is no server and
   * no account here, so this is what "sharing a collection" means: the list
   * travels in the link, and the person opening it decides whether to keep it.
   */
  const sharedIds = useMemo(() => {
    const raw = searchParams.get('list');
    if (!raw) return null;
    const ids = raw
      .split(',')
      .map((s) => s.trim())
      .filter((id) => !!SPECIES_BY_ID[id]);
    return ids.length > 0 ? ids : null;
  }, [searchParams]);

  const shown = useMemo(() => {
    if (sharedIds) return filters.results.filter((s) => sharedIds.includes(s.id));
    if (savedOnly) return filters.results.filter((s) => isFavourite(s.id));
    return filters.results;
  }, [filters.results, sharedIds, savedOnly, isFavourite]);

  const clearSharedList = () =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('list');
        return next;
      },
      { replace: true },
    );

  const shareUrl = () => {
    const url = new URL(window.location.href);
    url.search = `?list=${savedIds.join(',')}`;
    return url.toString();
  };

  const copyShareLink = async () => {
    const link = shareUrl();
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Clipboard access can be refused; put the link in the address bar so it
      // can still be copied by hand.
      setSearchParams({ list: savedIds.join(',') }, { replace: false });
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };

  const grid = (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {shown.map((s) => (
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

      {sharedIds && (
        <div className="mt-8 flex flex-wrap items-center gap-3 rounded-xl border border-forest-600 bg-forest-800/50 p-4">
          <Share2 className="h-4 w-4 shrink-0 text-forest-300" aria-hidden="true" />
          <p className="flex-1 text-sm text-canvas/85">
            You are looking at a shared list of {sharedIds.length} species. It is held in the link, not in
            this browser.
          </p>
          <button type="button" onClick={() => addMany(sharedIds)} className={buttonClasses('secondary', 'sm')}>
            <Heart className="h-4 w-4" aria-hidden="true" />
            Save these
          </button>
          <button type="button" onClick={clearSharedList} className={buttonClasses('ghost', 'sm')}>
            Show all species
          </button>
        </div>
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-[264px_1fr] lg:gap-10">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <SearchBar value={filters.filters.query} onChange={filters.setQuery} />
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            className="mt-2 inline-flex min-h-11 w-full items-center justify-between rounded-lg border border-forest-700 bg-forest-900 px-3 py-2 text-sm font-medium text-canvas lg:hidden"
          >
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Filters &amp; saved list {filters.activeCount > 0 && `(${filters.activeCount})`}
            </span>
            <span>{showFilters ? 'Hide' : 'Show'}</span>
          </button>
          <div
            className={cn(
              'mt-3 rounded-xl border border-forest-800 bg-forest-900/70 p-4 lg:block',
              showFilters ? 'block' : 'hidden',
            )}
          >
            <FilterPanel filters={filters} />

            <div className="mt-3 border-t border-forest-700/60 pt-3">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-forest-300">
                Saved species
              </p>
              <button
                type="button"
                aria-pressed={savedOnly}
                disabled={savedCount === 0 || !!sharedIds}
                onClick={() => setSavedOnly((v) => !v)}
                className={cn(
                  'flex w-full items-center justify-between rounded-md border px-2.5 py-2 text-sm transition-colors disabled:opacity-50',
                  savedOnly && !sharedIds
                    ? 'border-clay/70 bg-clay/15 text-clay'
                    : 'border-forest-700 text-canvas/75 hover:border-forest-500 hover:text-canvas',
                )}
              >
                <span className="inline-flex items-center gap-2">
                  <Heart className="h-4 w-4" fill={savedOnly ? 'currentColor' : 'none'} aria-hidden="true" />
                  Show only saved
                </span>
                <span className="font-mono text-xs">{savedCount}</span>
              </button>
              {savedCount > 0 && (
                <button
                  type="button"
                  onClick={copyShareLink}
                  className="mt-1.5 inline-flex w-full items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-forest-300 hover:bg-forest-800 hover:text-forest-200"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      Link copied
                    </>
                  ) : (
                    <>
                      <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Copy a link to this list
                    </>
                  )}
                </button>
              )}
              <p className="mt-1.5 text-[11px] leading-snug text-canvas/45">
                Saved species are kept in this browser only — there are no accounts here.
              </p>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-canvas/60" aria-live="polite">
              Showing {shown.length} species
              {sharedIds
                ? ' from a shared list'
                : savedOnly
                  ? ' from your saved list'
                  : filters.activeCount > 0 || filters.filters.query
                    ? ' (filtered)'
                    : ''}
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
                      'inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200 sm:min-h-0',
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

          {shown.length === 0 ? (
            <div className="rounded-xl border border-dashed border-forest-700 bg-forest-900/40 p-10 text-center">
              <p className="font-medium text-canvas">
                {savedOnly && savedCount === 0
                  ? 'You have not saved any species yet'
                  : 'No species match those filters'}
              </p>
              <p className="mt-1 text-sm text-canvas/60">
                {savedOnly && savedCount === 0
                  ? 'Use the heart on any species card to keep it here.'
                  : 'Try removing a filter or clearing the search.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  filters.reset();
                  setSavedOnly(false);
                }}
                className={buttonClasses('secondary', 'md', 'mt-5')}
              >
                Reset filters
              </button>
            </div>
          ) : view === 'gallery' ? (
            <SpeciesGallery species={shown} fallback={grid} />
          ) : (
            grid
          )}
        </div>
      </div>
    </div>
  );
}
