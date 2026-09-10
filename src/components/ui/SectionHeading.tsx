import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

/**
 * Two sizes, because a page needs a first rank and a second one. Before this
 * every page title was set at the same size as the section headings beneath
 * it, which left the pages looking like a stack of equal parts rather than a
 * document with a top.
 */
const TITLE_SIZE = {
  page: 'text-3xl sm:text-4xl lg:text-[2.6rem] lg:leading-[1.12]',
  section: 'text-2xl sm:text-3xl',
} as const;

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  size = 'section',
  className,
  as: Tag = 'h2',
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
  size?: keyof typeof TITLE_SIZE;
  className?: string;
  as?: 'h1' | 'h2' | 'h3';
}) {
  return (
    <div className={cn(align === 'center' && 'mx-auto max-w-2xl text-center', 'max-w-3xl', className)}>
      {eyebrow && (
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-forest-400">{eyebrow}</p>
      )}
      <Tag className={cn('font-serif font-semibold leading-tight text-canvas', TITLE_SIZE[size])}>
        {title}
      </Tag>
      {description && (
        <p
          className={cn(
            'mt-3 leading-relaxed text-canvas/70',
            size === 'page' ? 'text-base sm:text-lg' : 'text-sm sm:text-base',
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
