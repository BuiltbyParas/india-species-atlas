import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { SPECIES } from '../../data/species';
import { MAP_VIEWBOX, project, smoothPath, useIndiaGeo } from '../../geo/india';
import { useChapter } from '../../motion/chapters';
import { useInView } from '../../motion/useInView';
import { cn } from '../../utils/cn';
import { Magnetic } from './Magnetic';
import { RevealText } from './RevealText';

/**
 * The return to India. Every species' thread is drawn from its anchor
 * locality towards the middle of the country and the outline closes around
 * them — the lines converge, and the map is what remains on screen.
 */
const CENTRE = project(79.0, 22.5);

export function FinalChapter() {
  const ref = useRef<HTMLElement>(null);
  const geo = useIndiaGeo();
  const seen = useInView(ref, { rootMargin: '0px 0px -30% 0px' });
  useChapter(ref, { index: 5, title: 'What remains' });

  const converge = SPECIES.map((s) => {
    const a = project(s.distributionPoints[0].lng, s.distributionPoints[0].lat);
    const mid: [number, number] = [(a[0] + CENTRE[0]) / 2 + (a[1] - CENTRE[1]) * 0.18, (a[1] + CENTRE[1]) / 2 - (a[0] - CENTRE[0]) * 0.18];
    return { id: s.id, d: smoothPath([a, mid, CENTRE], 0.8), a };
  });

  return (
    <section ref={ref} data-route-stop="5" className={cn('final relative overflow-hidden', seen && 'is-shown')} aria-labelledby="final-title">
      <div className="mx-auto grid min-h-[100svh] max-w-[1600px] items-center gap-12 px-4 py-28 sm:px-8 lg:grid-cols-12 lg:px-12">
        <div className="relative lg:col-span-7">
          <h2 id="final-title" className="font-serif text-[clamp(3.2rem,9vw,10rem)] font-light leading-[0.86] tracking-[-0.045em] text-canvas">
            <RevealText text="India Species" play={seen} className="block" />
            <RevealText text="Atlas" play={seen} delay={0.2} className="block" />
          </h2>
          <div className="mt-10 space-y-1 font-serif text-[clamp(1.25rem,2vw,1.8rem)] font-light leading-snug">
            <RevealText as="p" text="Mapping what remains." play={seen} delay={0.6} className="block text-canvas/90" />
            <RevealText as="p" text="Understanding what is at risk." play={seen} delay={0.8} className="block text-canvas/70" />
            <RevealText as="p" text="Protecting what can still be saved." play={seen} delay={1.0} className="block text-canvas/50" />
          </div>
          <div className="final-links mt-14 flex flex-wrap items-center gap-x-10 gap-y-4">
            <Magnetic>
              <Link to="/atlas" className="cta" data-cursor="Open">
                <span>Open the map</span>
                <svg viewBox="0 0 40 10" aria-hidden="true" className="cta-line"><path d="M0 5 C 12 1, 26 9, 40 5" /></svg>
              </Link>
            </Magnetic>
            <Link to="/species" className="text-link">Browse the species</Link>
            <Link to="/documentary" className="text-link">Documentary mode</Link>
            <Link to="/sources" className="text-link">Sources</Link>
          </div>
        </div>
        <div className="relative lg:col-span-5">
          <svg viewBox={MAP_VIEWBOX} className="final-map mx-auto w-full max-w-[34rem]" aria-hidden="true">
            <path d={geo?.all ?? ''} pathLength={1} className="fm-country" />
            {converge.map((c, i) => (
              <g key={c.id} style={{ ['--i' as string]: i }}>
                <path d={c.d} pathLength={1} className="fm-line" />
                <circle cx={c.a[0]} cy={c.a[1]} r="5" className="fm-dot" />
              </g>
            ))}
            <circle cx={CENTRE[0]} cy={CENTRE[1]} r="7" className="fm-centre" />
          </svg>
        </div>
      </div>
    </section>
  );
}
