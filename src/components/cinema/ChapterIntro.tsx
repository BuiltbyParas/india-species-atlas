import { useRef, type ReactNode } from 'react';
import { useChapter } from '../../motion/chapters';
import { useParallax } from '../../interaction/parallax';
import { RevealText } from './RevealText';

/**
 * The card that opens a chapter: its number in the sequence, a statement set
 * large, and a short paragraph. Registers the chapter for the header.
 */
export function ChapterIntro({
  index,
  title,
  statement,
  children,
  id,
}: {
  index: number;
  title: string;
  statement: string;
  children?: ReactNode;
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const labelRef = useRef<HTMLParagraphElement>(null);
  const statementRef = useRef<HTMLHeadingElement>(null);
  useChapter(ref, { index, title });
  // Two planes: the chapter's label sits back, its statement forward.
  useParallax(labelRef, -6);
  useParallax(statementRef, 5);
  return (
    <section ref={ref} id={id} data-trail className="chapter-intro mx-auto max-w-[1600px] px-4 pb-16 pt-32 sm:px-8 lg:px-12 lg:pb-24 lg:pt-44">
      <div className="grid gap-10 lg:grid-cols-12">
        <p ref={labelRef} className="text-small text-canvas/45 lg:col-span-3">
          <span className="tabular-nums">Chapter {String(index).padStart(2, '0')}</span>
          <span className="mt-1 block text-canvas/70">{title}</span>
        </p>
        <div className="lg:col-span-9">
          <h2 ref={statementRef} className="max-w-5xl font-serif text-headline font-light text-canvas">
            <RevealText text={statement} stagger={0.035} />
          </h2>
          {children && <div className="mt-10">{children}</div>}
        </div>
      </div>
    </section>
  );
}
