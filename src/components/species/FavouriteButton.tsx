import { Heart } from 'lucide-react';
import type { Species } from '../../types';
import { useFavourites } from '../../hooks/useFavourites';
import { cn } from '../../utils/cn';

/**
 * The save control. It is a toggle button rather than a checkbox because it
 * acts immediately, and it states what it does in words for a screen reader —
 * a filled heart alone is not a label.
 */
export function FavouriteButton({
  species,
  size = 'md',
  className,
  withLabel = false,
}: {
  species: Species;
  size?: 'sm' | 'md';
  className?: string;
  withLabel?: boolean;
}) {
  const { isFavourite, toggle } = useFavourites();
  const saved = isFavourite(species.id);

  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={(e) => {
        e.stopPropagation();
        toggle(species.id);
      }}
      title={saved ? 'Remove from saved species' : 'Save this species'}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors',
        size === 'sm' ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs',
        saved
          ? 'border-clay/70 bg-clay/15 text-clay'
          : 'border-forest-700 bg-forest-950/70 text-canvas/65 hover:border-forest-500 hover:text-canvas',
        className,
      )}
    >
      <Heart
        className={cn(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4')}
        fill={saved ? 'currentColor' : 'none'}
        aria-hidden="true"
      />
      <span className={cn(!withLabel && 'sr-only')}>
        {saved ? `${species.commonName} is saved` : `Save ${species.commonName}`}
      </span>
    </button>
  );
}
