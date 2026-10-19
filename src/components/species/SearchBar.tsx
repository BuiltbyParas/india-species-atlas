import { Search, X } from 'lucide-react';
import { cn } from '../../utils/cn';

export function SearchBar({
  value,
  onChange,
  placeholder = 'Name, state or region',
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
      {/* The full description is the label; the placeholder is short enough to show whole in the narrowest column. */}
      <label htmlFor={id} className="sr-only">
        Search species by common or scientific name, state or region
      </label>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-canvas/62"
        aria-hidden="true"
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-xs border border-forest-700 bg-forest-900 py-2.5 pl-9 pr-9 text-sm text-canvas placeholder:text-canvas/62 focus:border-forest-400"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xs p-1 text-canvas/70 hover:bg-forest-800 hover:text-canvas"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
