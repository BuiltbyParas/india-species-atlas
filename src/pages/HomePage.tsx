import { useLayoutEffect } from 'react';
import { holdScrollTrigger } from '../motion/gsap';
import { SPECIES } from '../data/species';
import { FEATURED } from '../content/featured';
import { FIELD_STUDIES } from '../content/fieldStudies';
import { REGIONS } from '../data/regions';
import { STATUS_INFO } from '../data/statusInfo';
import { countByStatus } from '../utils/stats';
import { CinematicHero } from '../components/cinema/CinematicHero';
import { CurvedLoop } from '../components/cinema/CurvedLoop';
import { ChapterIntro } from '../components/cinema/ChapterIntro';
import { DomeGallery } from '../components/cinema/DomeGallery';
import { ConservationChapter } from '../components/cinema/ConservationMap';
import { FinalChapter } from '../components/cinema/FinalChapter';
import { FieldStudiesIndex } from '../components/field/FieldStudiesIndex';
import { GeoProgress } from '../components/cinema/GeoProgress';
import { InteractiveStat } from '../components/cinema/InteractiveStat';

export function HomePage() {
  // The documentary's scenes scrub with ScrollTrigger; it runs only while this page is mounted.
  useLayoutEffect(holdScrollTrigger, []);
  const byStatus = countByStatus();
  return (
    <div className="documentary-page">
      <CinematicHero focus={FEATURED[0]} />

      <CurvedLoop
        className="-mt-px py-6 lg:py-10"
        words={REGIONS.map((r) => r.name)}
        label="The ecological regions the atlas covers"
      />

      <ChapterIntro
        index={2}
        id="species-chapter"
        title="The species"
        statement="Five species, five kinds of ground. Each is shown where it is recorded, what cuts through that ground, and what protects it."
      >
        <div className="grid max-w-3xl grid-cols-3 gap-8 border-t border-canvas/10 pt-8">
          {(['CR', 'EN', 'VU'] as const).map((code) => (
            <InteractiveStat
              key={code}
              size="md"
              value={byStatus[code]}
              label={STATUS_INFO[code].name}
              note={`of the ${SPECIES.length} species in the atlas`}
              color={STATUS_INFO[code].colorVar}
            />
          ))}
        </div>
      </ChapterIntro>

      {/* The five flagship species as featured field studies: each a world of its own, entered from here. */}
      <FieldStudiesIndex />

      <ChapterIntro
        index={3}
        id="selection-chapter"
        title="The selection"
        statement={`All ${SPECIES.length}, in the round. Turn the sphere; the bands above and below carry the places the atlas records them.`}
      />
      <div data-env="data">
        <DomeGallery species={SPECIES} />
      </div>

      <CurvedLoop
        className="py-6 lg:py-10"
        words={SPECIES.map((s) => s.scientificName)}
        curve="M-40 70 C 300 160, 560 150, 760 90 S 1180 20, 1480 120"
        label="The scientific names of the species in the atlas"
      />

      <ConservationChapter />
      <FinalChapter />
      <GeoProgress stops={FIELD_STUDIES.map((f) => f.species)} />
    </div>
  );
}
