import { Fragment, useRef, type ReactNode } from 'react';
import { useChapter } from '../../motion/chapters';
import { useParallax } from '../../interaction/parallax';
import { useSectionProgress } from '../../interaction/sectionProgress';
import { RevealText } from './RevealText';

/**
 * The card that opens a chapter: its number in the sequence, a statement set
 * large, and a short paragraph. Registers the chapter for the header.
 *
 * Three layers move with the scroll (`useSectionProgress` writes `--enter`,
 * `--cp` and `--leave`; the CSS is `.chapter-intro` in index.css): the
 * numeral drifts slowly against the page, the statement a little faster the
 * other way, and the whole card lifts and quietens as the chapter hands over.
 * `lead` sets the first sentence large and the rest as a paragraph beneath it.
 * `dawn` warms the foot of the chapter when the next one is a daylit world.
 * `lit` sets the lead and the paragraph as one statement at display size across
 * the whole measure, its words lighting in reading order as the chapter comes
 * up the screen (from `--cp`; CSS `.chapter-lit`), so the reader's scroll sets
 * the pace it is read at. With reduced motion it is simply lit.
 */
export function ChapterIntro({
  index,
  title,
  statement,
  lead,
  dawn,
  lit,
  children,
  id,
}: {
  index: number;
  title: string;
  statement: string;
  lead?: string;
  dawn?: boolean;
  lit?: boolean;
  children?: ReactNode;
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const labelRef = useRef<HTMLParagraphElement>(null);
  const statementRef = useRef<HTMLHeadingElement>(null);
  useChapter(ref, { index, title });
  useSectionProgress(ref);
  // Two planes under the pointer: the chapter's label sits back, its statement forward.
  useParallax(labelRef, -6);
  useParallax(statementRef, 5);
  const number = String(index).padStart(2, '0');
  if (lit) {
    const lead_ = (lead ?? statement).split(/\s+/).filter(Boolean);
    const rest = lead ? statement.split(/\s+/).filter(Boolean) : [];
    // The italic second sentence waits a beat (two words' worth of scroll) after the first has resolved.
    const BEAT = 2;
    const n = lead_.length + rest.length + (rest.length ? BEAT : 0);
    return (
      <section
        ref={ref}
        id={id}
        data-trail
        data-env="atlas"
        data-dawn={dawn ? '' : undefined}
        className="chapter-intro chapter-lit mx-auto max-w-[1600px] px-4 pb-16 pt-16 sm:px-8 lg:px-12 lg:pb-24 lg:pt-12"
        style={{ ['--n' as string]: n }}
      >
        <div className="chapter-intro-card">
          <p ref={labelRef} className="chapter-lit-label text-small">
            <span className="tabular-nums">{number}</span>
            <span className="chapter-lit-rule" aria-hidden="true" />
            <span className="sr-only">Chapter {number}, </span>
            {title}
          </p>
          <h2 ref={statementRef} className="chapter-lit-statement font-serif font-light text-canvas">
            {/* Each word its own box (for its depth), the spaces left as text between them so the measure wraps as written. */}
            {lead_.map((w, i) => (
              <Fragment key={`l${i}`}>
                <span className="lit-word" style={{ ['--i' as string]: i }}>
                  {w}
                </span>{' '}
              </Fragment>
            ))}
            {rest.length > 0 && (
              <span className="chapter-lit-rest">
                {rest.map((w, i) => (
                  <Fragment key={`r${i}`}>
                    <span className="lit-word" style={{ ['--i' as string]: lead_.length + BEAT + i }}>
                      {w}
                    </span>
                    {i < rest.length - 1 ? ' ' : null}
                  </Fragment>
                ))}
              </span>
            )}
          </h2>
          {children && <div className="chapter-lit-foot">{children}</div>}
        </div>
      </section>
    );
  }
  return (
    <section
      ref={ref}
      id={id}
      data-trail
      // Declared night, so a reader coming back up from the field studies is not left in the last world's light.
      data-env="atlas"
      data-dawn={dawn ? '' : undefined}
      className="chapter-intro mx-auto max-w-[1600px] px-4 pb-16 pt-32 sm:px-8 lg:px-12 lg:pb-24 lg:pt-44"
    >
      <div className="chapter-intro-card grid gap-10 lg:grid-cols-12">
        <div className="chapter-label-plane lg:col-span-3">
          <p ref={labelRef} className="text-small text-canvas/62">
            <span className="chapter-numeral" aria-hidden="true">
              {number}
            </span>
            <span className="tabular-nums chapter-word">Chapter {number}</span>
            <span className="chapter-intro-title">{title}</span>
          </p>
        </div>
        <div className="chapter-statement-plane lg:col-span-9">
          <h2 ref={statementRef} className="max-w-5xl font-serif text-headline font-light text-canvas">
            <RevealText text={lead ?? statement} stagger={0.035} />
          </h2>
          {lead && (
            <p className="chapter-body mt-6 max-w-2xl font-serif font-light text-canvas/72">
              <RevealText text={statement} stagger={0.02} delay={0.35} />
            </p>
          )}
          {children && <div className="mt-10">{children}</div>}
        </div>
      </div>
    </section>
  );
}
