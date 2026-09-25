import { useRef } from 'react';
import { SPECIES } from '../../data/species';
import { formatDeg, MAP_VIEWBOX, useIndiaGeo } from '../../geo/india';
import { useChapter } from '../../motion/chapters';
import { useIntroDone } from '../../motion/intro';
import { conservationRegionCount, statesCovered, totalSpecies } from '../../utils/stats';
import { HeroStage } from '../home/HeroScrollScene';
import { RevealText } from './RevealText';

const LOCALITIES = SPECIES.reduce((n, s) => n + s.distributionPoints.length, 0);

/**
 * Captions laid over the camera's descent. Each is visible between two points
 * of the hero's scroll progress (`--a` → `--b`), computed in CSS from the
 * `--p` variable the stage writes, so the captions cost nothing per frame.
 * Every figure is counted from the dataset.
 */
const CAPTIONS = [
  {
    a: 0.2,
    b: 0.42,
    title: 'Start with the country.',
    body: 'Every map in this atlas is drawn from one file of state boundaries, so a place sits in the same spot wherever you meet it.',
  },
  {
    a: 0.44,
    b: 0.66,
    title: `${LOCALITIES} places.`,
    body: `Each light is an indicative locality for one of ${totalSpecies} species — a named reserve or landscape, not the edge of a range. Its colour is the species' IUCN category.`,
  },
  {
    a: 0.68,
    b: 0.9,
    title: `${conservationRegionCount} regions, ${statesCovered().length} states.`,
    body: 'From the Thar to the Brahmaputra floodplain. The selection was made for spread across the country, not for number.',
  },
];

function FlatIndia() {
  const geo = useIndiaGeo();
  return (
    <svg
      viewBox={MAP_VIEWBOX}
      className="flat-india pointer-events-none absolute right-[-8%] top-1/2 h-[92%] -translate-y-1/2 opacity-80 sm:right-0"
      aria-hidden="true"
    >
      <path d={geo?.all ?? ''} pathLength={1} />
    </svg>
  );
}

export function CinematicHero() {
  const ref = useRef<HTMLDivElement>(null);
  const ready = useIntroDone();
  const geo = useIndiaGeo();
  useChapter(ref, { index: 1, title: 'The map' });
  const ext = geo?.extent;

  return (
    <div ref={ref} id="atlas-top" data-chapter="1">
      <HeroStage
        withPlates={false}
        flatArt={<FlatIndia />}
        overlay={
          <div className="hero-captions pointer-events-none absolute inset-0" aria-hidden="true">
            {CAPTIONS.map((c) => (
              <div
                key={c.title}
                className="hero-caption"
                style={{ ['--a' as string]: c.a, ['--b' as string]: c.b }}
              >
                <p className="font-serif text-[clamp(2rem,3.6vw,3.4rem)] font-light leading-[1.02] tracking-[-0.02em] text-canvas">
                  {c.title}
                </p>
                <p className="mt-4 max-w-[26rem] text-[15px] leading-relaxed text-canvas/70">{c.body}</p>
              </div>
            ))}
          </div>
        }
      >
        <div className="hero-copy">
          <h1 className="font-serif font-light leading-[0.84] tracking-[-0.045em] text-canvas text-[clamp(3.4rem,10.5vw,12rem)]">
            <RevealText text="India Species" play={ready} stagger={0.09} className="block" />
            <RevealText text="Atlas" play={ready} delay={0.22} className="block pl-[0.06em]" />
          </h1>
          <div className="mt-8 grid gap-8 sm:mt-10 md:grid-cols-12">
            <p className="font-serif text-[clamp(1.2rem,1.9vw,1.7rem)] font-light leading-[1.3] text-canvas/85 md:col-span-6">
              <RevealText text="Mapping endangered species." play={ready} delay={0.55} stagger={0.04} className="block" />
              <RevealText text="Tracing the lines that shape survival." play={ready} delay={0.7} stagger={0.04} className="block" />
            </p>
            <div className={`hero-meta md:col-span-6 md:justify-self-end ${ready ? 'is-shown' : ''}`}>
              <dl className="grid grid-cols-2 gap-x-10 gap-y-1 text-[13px] text-canvas/55">
                <dt className="sr-only">Latitude</dt>
                <dd className="tabular-nums">{ext ? `${formatDeg(ext.minLat, 'lat')} to ${formatDeg(ext.maxLat, 'lat')}` : ' '}</dd>
                <dt className="sr-only">Longitude</dt>
                <dd className="tabular-nums">{ext ? `${formatDeg(ext.minLng, 'lng')} to ${formatDeg(ext.maxLng, 'lng')}` : ' '}</dd>
                <dt className="sr-only">Scope</dt>
                <dd>{totalSpecies} threatened species</dd>
                <dd>IUCN Red List categories</dd>
              </dl>
              <p className="scroll-cue mt-6 flex items-center gap-3 text-[13px] text-canvas/55">
                <span className="scroll-cue-line" aria-hidden="true" />
                Scroll to follow the line
              </p>
            </div>
          </div>
        </div>
      </HeroStage>
    </div>
  );
}
