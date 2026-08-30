import { Search, X } from 'lucide-react';
import { cn } from '../../utils/cn';

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search species, scientific name, state or region…',
  className,
  id = 'species-search',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">
        Search species
      </label>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-canvas/40"
        aria-hidden="true"
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-lg border border-forest-700 bg-forest-900 py-2.5 pl-9 pr-9 text-sm text-canvas placeholder:text-canvas/40 focus:border-forest-400 focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-canvas/50 hover:bg-forest-800 hover:text-canvas"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
