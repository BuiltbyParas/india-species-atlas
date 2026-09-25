import { SPECIES_BY_ID, SPECIES } from '../data/species';
import { REGIONS } from '../data/regions';
import { STATUS_INFO } from '../data/statusInfo';
import { countByStatus } from '../utils/stats';
import { CinematicHero } from '../components/cinema/CinematicHero';
import { CurvedLoop } from '../components/cinema/CurvedLoop';
import { ChapterIntro } from '../components/cinema/ChapterIntro';
import { SpeciesScene } from '../components/cinema/SpeciesScene';
import { DomeGallery } from '../components/cinema/DomeGallery';
import { ConservationChapter } from '../components/cinema/ConservationMap';
import { FinalChapter } from '../components/cinema/FinalChapter';
import { GeoProgress } from '../components/cinema/GeoProgress';
import { InteractiveStat } from '../components/cinema/InteractiveStat';

/**
 * The five species the documentary follows, in the order the route line
 * visits them: west to east, desert to floodplain — the Thar, the central
 * forests, the Ganga, the high Himalaya, the Brahmaputra.
 */
const FEATURED = ['great-indian-bustard', 'bengal-tiger', 'ganges-river-dolphin', 'snow-leopard', 'indian-rhinoceros']
  .map((id) => SPECIES_BY_ID[id])
  .filter(Boolean);

export function HomePage() {
  const byStatus = countByStatus();
  return (
    <div className="documentary-page">
      <CinematicHero />

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

      {FEATURED.map((s, i) => (
        <div key={s.id} data-route-stop={i}>
          <SpeciesScene species={s} index={i} total={FEATURED.length} />
        </div>
      ))}

      <ChapterIntro
        index={3}
        id="selection-chapter"
        title="The selection"
        statement={`All ${SPECIES.length}, in the round. Turn the sphere; the bands above and below carry the places the atlas records them.`}
      />
      <DomeGallery species={SPECIES} />

      <CurvedLoop
        className="py-6 lg:py-10"
        words={SPECIES.map((s) => s.scientificName)}
        curve="M-40 70 C 300 160, 560 150, 760 90 S 1180 20, 1480 120"
        label="The scientific names of the species in the atlas"
      />

      <ConservationChapter />
      <FinalChapter />
      <GeoProgress stops={FEATURED} />
    </div>
  );
}
