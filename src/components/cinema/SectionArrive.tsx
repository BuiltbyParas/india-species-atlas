import { useRef, type HTMLAttributes } from 'react';
import { useSectionProgress } from '../../interaction/sectionProgress';

/**
 * A block that comes up to meet the reader: it rises a little and settles to
 * full size as it travels up the screen, and eases back the other way (CSS:
 * `.section-arrive` in index.css, scrubbed by `useSectionProgress`). Nothing
 * is hidden while it does, so its content is never waiting on the animation.
 */
export function SectionArrive(props: HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  useSectionProgress(ref);
  return <div ref={ref} {...props} className={`section-arrive ${props.className ?? ''}`} />;
}
