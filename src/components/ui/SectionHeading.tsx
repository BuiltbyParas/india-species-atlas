import { LineTitle } from '../cinema/LineTitle';
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
  if (size === 'page') {
    // A page's opening: the title large on the left, what the page is for set beside it, one hairline under both.
    return (
      <header className={cn('page-head', className)}>
        <div className="page-head-title">
          {eyebrow && <p className="eyebrow mb-6">{eyebrow}</p>}
          <Tag className="font-serif font-light text-canvas">
            {Tag === 'h1' && typeof title === 'string' ? <LineTitle text={title} seed={title.length % 7} /> : title}
          </Tag>
        </div>
        {description && <p className="page-head-lede">{description}</p>}
      </header>
    );
  }
  return (
    <div className={cn(align === 'center' && 'mx-auto max-w-2xl text-center', 'max-w-3xl', className)}>
      {eyebrow && (
        <p className={cn('eyebrow', 'mb-3', align === 'center' && 'justify-center')}>
          {eyebrow}
        </p>
      )}
      <Tag className={cn('font-serif font-light text-canvas', TITLE_SIZE.section)}>
        {/* A page's own title is written along a contour that straightens into its rule. */}
        {Tag === 'h1' && typeof title === 'string' ? <LineTitle text={title} seed={title.length % 7} /> : title}
      </Tag>
      {description && (
        <p
          className={cn(
            'max-w-[42rem]',
            'mt-3 text-body text-canvas/70',
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
