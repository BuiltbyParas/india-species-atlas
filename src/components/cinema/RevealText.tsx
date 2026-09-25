import { Fragment, useRef, type ElementType } from 'react';
import { useInView } from '../../motion/useInView';
import { cn } from '../../utils/cn';

/**
 * Text that is set word by word from below a mask, the way a title card is
 * cut in rather than faded up.
 *
 * The words are real text in the DOM from the first render — the mask only
 * clips them — so the line reads correctly to a screen reader, to search and
 * with animation switched off. The motion is CSS transitions keyed off one
 * class, with the stagger carried by a custom property per word.
 */
export function RevealText({
  text,
  as: Tag = 'span',
  className,
  wordClassName,
  play,
  delay = 0,
  stagger = 0.055,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  wordClassName?: string;
  /** Drive it from outside; otherwise it plays on entering the viewport. */
  play?: boolean;
  delay?: number;
  stagger?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref);
  const shown = play ?? seen;
  const words = text.split(/\s+/).filter(Boolean);

  return (
    <Tag ref={ref} className={cn('reveal-text', shown && 'is-shown', className)}>
      {words.map((word, i) => (
        <Fragment key={i}>
          <span className="reveal-word">
            <span
              className={cn('reveal-word-inner', wordClassName)}
              style={{ transitionDelay: `${(delay + i * stagger).toFixed(3)}s` }}
            >
              {word}
            </span>
          </span>
          {i < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </Tag>
  );
}

/**
 * A block that is uncovered by a wipe — for images, maps and rules. The clip
 * runs in the direction the content is read, left to right or top down.
 */
export function Reveal({
  children,
  className,
  direction = 'up',
  play,
  delay = 0,
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  direction?: 'up' | 'right' | 'fade';
  play?: boolean;
  delay?: number;
  as?: ElementType;
}) {
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref);
  const shown = play ?? seen;
  return (
    <Tag
      ref={ref}
      className={cn('reveal-block', `reveal-${direction}`, shown && 'is-shown', className)}
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </Tag>
  );
}
