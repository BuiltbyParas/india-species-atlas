import { useEffect, useLayoutEffect } from 'react';
import { holdScrollTrigger } from '../motion/gsap';
import { SPECIES } from '../data/species';
import { FEATURED } from '../content/featured';
import { FIELD_STUDIES } from '../content/fieldStudies';
import { REGIONS } from '../data/regions';
import { CinematicHero } from '../components/cinema/CinematicHero';
import { CurvedLoop } from '../components/cinema/CurvedLoop';
import { ChapterIntro } from '../components/cinema/ChapterIntro';
import { ConservationChapter } from '../components/cinema/ConservationMap';
import { FinalChapter } from '../components/cinema/FinalChapter';
import { FieldStudiesIndex } from '../components/field/FieldStudiesIndex';
import { GeoProgress } from '../components/cinema/GeoProgress';
import { StatusLedger } from '../components/cinema/StatusLedger';
import { SelectionChapter } from '../components/cinema/SelectionChapter';
import { GroundsPlate } from '../components/cinema/GroundsPlate';
import { RegionFragments } from '../components/cinema/RegionFragments';
import { attachSpan, useAtlasLive } from '../components/home/atlasWorld';
import { useReducedMotion, useWideLayout } from '../motion/preferences';
import '../components/cinema/editorial.css';

/**
 * The atlas world's second span: Chapter 04, the closing and the colophon, one transparent stretch of the page
 * through which the relief is seen again (components/home/atlasWorld.ts). Only where the pinned chapter runs.
 */
function useAtlasSpan() {
  const live = useAtlasLive();
  const wide = useWideLayout();
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!live || !wide || reduced) return;
    const first = document.getElementById('conservation-chapter');
    const last = document.querySelector<HTMLElement>('.site-footer');
    if (!first || !last) return;
    return attachSpan('atlas', first, last);
  }, [live, wide, reduced]);
}

export function HomePage() {
  // The documentary's scenes scrub with ScrollTrigger; it runs only while this page is mounted.
  useLayoutEffect(holdScrollTrigger, []);
  useAtlasSpan();
  return (
    <div className="documentary-page">
      <CinematicHero focus={FEATURED[0]} />

      <CurvedLoop
        className="hero-tail-loop relative z-[3] py-6 lg:py-10"
        words={REGIONS.map((r) => r.name)}
        label="The ecological regions the atlas covers"
      />

      {/* Chapter 01's end: the sheet apart along the eight regions, sideways with the scroll, then whole again. */}
      <RegionFragments />

      <ChapterIntro
        index={2}
        id="species-chapter"
        title="The species"
        lead="Five species, five kinds of ground."
        statement="Each is shown where it is recorded, what cuts through that ground, and what protects it."
        lit
      >
        <StatusLedger />
      </ChapterIntro>

      {/* The relief again as contours, the five studies set on it, and the dive into the first: the way into the field studies. */}
      <GroundsPlate />

      {/* The five flagship species as featured field studies: each a world of its own, entered from here. */}
      <FieldStudiesIndex />

      {/* Chapter 03: the statement, the index of the twelve and the dome they turn, composed as one plate. */}
      <SelectionChapter />

      {/* The register closes on the twelve's scientific names, still under the canopy; Chapter 04's plate then opens in it.
          Quiet for the route map too: between two chapters that hide it, it would only blink on over the names. */}
      <div data-geo-quiet data-ground="canopy" data-env="canopy" className="names-ground ground-grain relative">
        <CurvedLoop
          className="names-loop py-6 lg:py-10"
          words={SPECIES.map((s) => s.scientificName)}
          curve="M-40 70 C 300 160, 560 150, 760 90 S 1180 20, 1480 120"
          label="The scientific names of the species in the atlas"
        />
      </div>

      <ConservationChapter />
      <FinalChapter />
      <GeoProgress stops={FIELD_STUDIES.map((f) => f.species)} />
    </div>
  );
}
