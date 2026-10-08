import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

/**
 * A heading in the documentary's voice, for the working pages.
 *
 * Two ranks, because a page needs a first rank and a second one. Both are
 * light Newsreader with tight tracking — the same hand that sets the chapter
 * statements on the home page — so moving from the film to the map or the
 * directory does not change typeface weight half-way through the atlas. The
 * eyebrow is the chapter label's form: a short rule, then the words, in small
 * sentence case rather than shouted capitals.
 */
const TITLE_SIZE = {
  page: 'text-heading',
  section: 'text-subheading',
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
        <p className={cn('eyebrow', size === 'page' ? 'mb-5' : 'mb-3', align === 'center' && 'justify-center')}>
          {eyebrow}
        </p>
      )}
      <Tag className={cn('font-serif font-light text-canvas', TITLE_SIZE[size])}>{title}</Tag>
      {description && (
        <p
          className={cn(
            'max-w-[42rem]',
            size === 'page' ? 'mt-5 font-serif text-lede font-light text-canvas/75' : 'mt-3 text-body text-canvas/70',
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
