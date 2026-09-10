import { cn } from '../../utils/cn';

/**
 * The one place the site decides what a button looks like.
 *
 * Before this, every call to action carried its own hand-written stack of
 * utilities, which is how a site ends up with four slightly different greens
 * and three focus rings. `buttonClasses` is exported separately because the
 * primary calls to action are router `Link`s, and a `Link` cannot be a
 * `<button>` — it takes the same classes instead.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold ' +
  'transition-[background-color,border-color,color,box-shadow,transform] ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'disabled:pointer-events-none disabled:opacity-50';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-forest-500 text-white shadow-sm shadow-forest-950/40 ' +
    'hover:bg-forest-400 hover:shadow-md hover:shadow-forest-950/50 ' +
    'active:bg-forest-500 focus-visible:outline-forest-300',
  secondary:
    'border border-forest-700 bg-forest-900/60 text-canvas ' +
    'hover:border-forest-500 hover:bg-forest-800 ' +
    'focus-visible:outline-forest-400',
  ghost:
    'text-canvas/70 hover:bg-forest-800/70 hover:text-canvas focus-visible:outline-forest-400',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
};

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
) {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}
