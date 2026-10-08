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
  'inline-flex items-center justify-center gap-2 rounded-xs font-medium ' +
  'transition-[background-color,border-color,color,box-shadow,transform] ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'disabled:pointer-events-none disabled:opacity-50';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    // Buff on the dark sheet: the same ink-and-paper pairing as the cursor's label.
    'bg-canvas text-ink hover:bg-parchment active:bg-sand focus-visible:outline-canvas',
  secondary:
    'border border-canvas/20 bg-transparent text-canvas ' +
    'hover:border-canvas/60 hover:bg-canvas/[0.04] ' +
    'focus-visible:outline-forest-400',
  ghost:
    'text-canvas/70 hover:bg-canvas/[0.05] hover:text-canvas focus-visible:outline-forest-400',
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
