import { Fragment, useRef, type ElementType } from 'react';
import { useSectionProgress } from '../../interaction/sectionProgress';
import { cn } from '../../utils/cn';

/**
 * A statement read at the pace of the scroll: its words fill from a faint
 * print to full ink, left to right, as the line travels up the screen, and
 * empty again if the reader goes back.
 *
 * The fill is the line's own `--enter` (useSectionProgress, computed from its
 * position on every sample of the shared scroll signal), so it reverses with
 * the scroll, is right on the first frame after a jump or a reload, and writes
 * nothing to React. Each word reads it through CSS (`.ink-text` in
 * editorial.css); the words are real text from the first render. With reduced
 * motion `--enter` is 1 and the line is simply printed. With `focus` the print
 * waiting to be read is also soft, and each word comes into focus as it fills.
 */
export function InkText({
  text,
  as: Tag = 'span',
  className,
  focus,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  /** The faint print is also out of focus, and each word sharpens as it fills (`.ink-focus`). */
  focus?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  useSectionProgress(ref, { settle: false, enterOnly: true });
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <Tag ref={ref} className={cn('ink-text', focus && 'ink-focus', className)}>
      {words.map((word, i) => (
        <Fragment key={i}>
          <span className="ink-word" style={{ ['--w' as string]: (i / words.length).toFixed(3) }}>
            {word}
          </span>
          {i < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </Tag>
  );
}
