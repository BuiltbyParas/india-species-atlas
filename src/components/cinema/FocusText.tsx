import { Fragment, useRef, type ElementType } from 'react';
import { useInView } from '../../motion/useInView';
import { cn } from '../../utils/cn';

/**
 * Text whose words resolve out of the atmosphere in reading order: soft, faint, a little low and a little near,
 * then sharp (`.fx-focus` in index.css, the "focus" pattern of documentation/HOMEPAGE_TYPE_MOTION.md).
 *
 * The words are real text from the first render, split on spaces only — never inside a word — and the spaces stay
 * text between them, so the line wraps, reads to a screen reader and copies exactly as written. Nothing changes
 * size, so nothing around it moves. Three ways to play it: on entering the viewport (the default), from outside
 * (`play`), or on mount (`cut`), for a line that is replaced whenever what it names changes. `sci` is the
 * scientific-name variant. With reduced motion it is simply set.
 */
export function FocusText({
  text,
  as: Tag = 'span',
  className,
  play,
  cut,
  sci,
  delay = 0,
  from = 0,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  play?: boolean;
  cut?: boolean;
  sci?: boolean;
  /** Seconds before the first word. */
  delay?: number;
  /** The first word's place in a longer sequence (the stagger continues from it). */
  from?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref, { once: true });
  const shown = cut || (play ?? seen);
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <Tag
      ref={ref}
      className={cn('fx-focus', sci && 'fx-sci', cut ? 'is-cut' : !shown && 'is-waiting', className)}
      style={delay ? { ['--fx-d' as string]: `${Math.round(delay * 1000)}ms` } : undefined}
    >
      {words.map((word, i) => (
        <Fragment key={i}>
          <span className="fx-w" style={{ ['--fx-i' as string]: from + i }}>
            {word}
          </span>
          {i < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </Tag>
  );
}
