import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SPECIES } from '../../data/species';
import type { DistributionPoint, Species } from '../../types';
import { formatDeg, localityCoords, MAP_HEIGHT, MAP_VIEWBOX, MAP_WIDTH, project, useIndiaGeo } from '../../geo/india';
import { useChapter } from '../../motion/chapters';
import { isIntroDone, useIntroDone } from '../../motion/intro';
import { captiveLocalities, conservationRegionCount, statesAndTerritories, totalSpecies } from '../../utils/stats';
import { HeroStage } from '../home/HeroScrollScene';
import { RELIEF_EXAGGERATION } from '../home/heroRelief';
import { useShadedRelief } from '../home/useShadedRelief';
import { RevealText } from './RevealText';

/** The Tropic of Cancer, the parallel the title is set on (kept in step with `heroScene.ts`). */
const TROPIC_LAT = 23.436;
const LOCALITIES = SPECIES.reduce((n, s) => n + s.distributionPoints.length, 0);

const { states: STATE_COUNT, territories: UT_COUNT } = statesAndTerritories();

/**
 * The last caption, as the camera comes down over the first species' anchor
 * locality: the place, its coordinates and who lives there — all from the
 * record. A record that withholds its coordinates says so instead.
 */
function landing(species: Species, at: DistributionPoint) {
  return {
    a: 0.9,
    b: 1.2,
    title: `${at.label.split(',')[0]}.`,
    body: at.withholdCoordinates
      ? `An indicative locality: for this species the atlas names places, not coordinates. The first line starts here, with the ${species.commonName}.`
      : `${localityCoords(at)}, indicative. The first line starts here, with the ${species.commonName}.`,
  };
}

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
    a: 0.43,
    b: 0.63,
    title: `${LOCALITIES} places.`,
    body: `Each light is an indicative locality for one of ${totalSpecies} species — a named reserve, river or landscape, not the edge of a range${captiveLocalities ? `; ${captiveLocalities === 1 ? 'one is a breeding centre' : `${captiveLocalities} are breeding centres`}, holding captive birds` : ''}. Its colour is the species' IUCN category.`,
  },
  {
    a: 0.66,
    b: 0.86,
    title: `${conservationRegionCount} regions, ${STATE_COUNT} states, ${UT_COUNT} union territories.`,
    body: 'From the Thar to the Brahmaputra floodplain. The selection was made for spread across the country, not for number.',
  },
];

/** The tropic the title is set on, named at the east end of the line. */
function TropicLabel({ shown, delay }: { shown: boolean; delay: number }) {
  return (
    <p
      className={`hero-tropic-label tabular-nums ${shown ? 'is-shown' : ''}`}
      style={{ ['--d' as string]: `${delay}s` }}
      aria-hidden="true"
    >
      Tropic of Cancer <span>{formatDeg(TROPIC_LAT, 'lat')}</span>
    </p>
  );
}

/**
 * The flat hero's map, composed as the relief is rather than standing in for
 * it: a five-degree graticule, the country's ground shaded from the elevation
 * model, the states as fine rules, the outline drawn in, and the tropic
 * running out west under the title.
 */
function FlatIndia({ shown }: { shown: boolean }) {
  const geo = useIndiaGeo();
  const shaded = useShadedRelief();
  const [, tropicY] = project(80, TROPIC_LAT);
  const parallels = [10, 15, 20, 25, 30, 35].map((lat) => project(80, lat)[1]);
  const meridians = [70, 75, 80, 85, 90, 95].map((lng) => project(lng, 20)[0]);
  return (
    <>
      <div className="flat-light pointer-events-none absolute inset-0" aria-hidden="true" />
      <svg viewBox={MAP_VIEWBOX} className="flat-india pointer-events-none absolute" aria-hidden="true">
        <defs>
          {/* The grid thins into the dark away from the country, as the relief's does. */}
          <radialGradient id="flat-grid-fade" cx="50%" cy="50%" r="50%">
            <stop offset="0.3" stopColor="#fff" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id="flat-grid-mask" maskUnits="userSpaceOnUse" x={-400} y={-300} width={MAP_WIDTH + 800} height={MAP_HEIGHT + 600}>
            <rect x={-400} y={-300} width={MAP_WIDTH + 800} height={MAP_HEIGHT + 600} fill="url(#flat-grid-fade)" />
          </mask>
          {geo && (
            <clipPath id="flat-relief-clip">
              <path d={geo.all} />
            </clipPath>
          )}
        </defs>
        <g className="flat-grid" mask="url(#flat-grid-mask)">
          {parallels.map((y) => (
            <line key={`p${y}`} x1={-400} x2={MAP_WIDTH + 400} y1={y} y2={y} />
          ))}
          {meridians.map((x) => (
            <line key={`m${x}`} x1={x} x2={x} y1={-300} y2={MAP_HEIGHT + 300} />
          ))}
        </g>
        {geo && shaded && (
          <image
            className="flat-relief"
            href={shaded.href}
            x={shaded.x}
            y={shaded.y}
            width={shaded.w}
            height={shaded.h}
            preserveAspectRatio="none"
            clipPath="url(#flat-relief-clip)"
          />
        )}
        {geo && (
          <>
            <path className={`flat-states ${shaded ? 'is-over-relief' : ''}`} d={geo.all} />
            <path className="flat-outline" d={geo.all} pathLength={1} />
          </>
        )}
        <line data-tropic className="flat-tropic" x1={-2400} x2={MAP_WIDTH + 260} y1={tropicY} y2={tropicY} />
      </svg>
      {shaded && <p className="flat-relief-note">Shaded relief · ETOPO 2022 elevation (NOAA)</p>}
      <TropicLabel shown={shown} delay={1.6} />
    </>
  );
}

/** The air the descent ends in, from the record's habitats and regions — nothing is added where neither applies. */
function airOf(s: Species): 'dust' | 'snow' | undefined {
  if (s.regions.includes('desert')) return 'dust';
  if (s.habitats.includes('mountain') && s.regions.includes('himalayas')) return 'snow';
  return undefined;
}

export function CinematicHero({ focus }: { focus?: Species }) {
  const ref = useRef<HTMLDivElement>(null);
  const ready = useIntroDone();
  useChapter(ref, { index: 1, title: 'The map' });
  // On a first visit the relief emerges as the loader clears, and the name waits for the outline to be drawn.
  const [wait] = useState(() => (isIntroDone() ? 0 : 0.85));
  const anchor = focus?.distributionPoints[0];
  const captions = anchor ? [...CAPTIONS, landing(focus!, anchor)] : CAPTIONS;

  return (
    // Declared night (world/environment.ts): coming back up from the field studies, the descent's foot must not keep the Thar's light.
    <div ref={ref} id="atlas-top" data-chapter="1" data-trail data-env="atlas">
      <HeroStage
        withPlates={false}
        endFocus={anchor ? { lng: anchor.lng, lat: anchor.lat } : undefined}
        atmosphere={focus ? airOf(focus) : undefined}
        flatArt={<FlatIndia shown={ready} />}
        overlay={
          <>
          <div className="hero-light pointer-events-none absolute inset-0" aria-hidden="true" />
          <TropicLabel shown={ready} delay={wait + 1.9} />
          {/* The plate's neatline, drawn in as the relief comes up; with a fine pointer, a note on how to survey the ground. */}
          <div className={`hero-plate pointer-events-none ${ready ? 'is-shown' : ''}`} aria-hidden="true">
            <span className="hero-plate-edge is-t" />
            <span className="hero-plate-edge is-r" />
            <span className="hero-plate-edge is-b" />
            <span className="hero-plate-edge is-l" />
            <p className="hero-plate-note">
              {/* Says what the relief stands on only once the scene has been built from it (HeroStage → data-relief). */}
              <span className="hero-note-elevation">
                Relief of India · ETOPO 2022 elevation (NOAA), heights &times;{RELIEF_EXAGGERATION}
              </span>
              <span className="hero-note-region">
                India and its neighbours, land and sea floor · ETOPO 2022 (NOAA), heights &times;{RELIEF_EXAGGERATION}
              </span>
              <span className="hero-note-boundaries">Relief of India, drawn from one file of state boundaries</span>
              <span className="hero-hint">Move to turn the light · point at the ground to read it</span>
            </p>
            {/* The key to the ground's tint and its contours, as a sheet carries one in its margin. */}
            <div className="hero-key-elev">
              <span className="hero-key-elev-bar" />
              <span className="hero-key-elev-scale">
                <span>0</span>
                <span>5,500 m</span>
              </span>
              <span className="hero-key-elev-note">Contours every 500 m</span>
            </div>
          </div>
          <div className="hero-captions pointer-events-none absolute inset-0" aria-hidden="true">
            {captions.map((c) => (
              <div
                key={c.title}
                className="hero-caption"
                style={{ ['--a' as string]: c.a, ['--b' as string]: c.b }}
              >
                <p className="font-serif text-[clamp(2rem,3.6vw,3.4rem)] font-light leading-[1.02] tracking-[-0.02em] text-canvas">
                  {c.title}
                </p>
                <p className="mt-4 max-w-[26rem] text-body leading-relaxed text-canvas/70">{c.body}</p>
              </div>
            ))}
          </div>
          </>
        }
      >
        {/*
          The opening is set as a title card. The relief stands in the upper
          frame; the name runs the full width of the plate across its foot, over
          the peninsula, the largest thing on the sheet by an order of magnitude.
          Under it one ruled line of credits: the sentence, the atlas's figures
          (counted from the record), and the two ways in.
        */}
        <div className="hero-copy">
          {/*
            The name assembles out of the ground: "India" comes in from the west, "Atlas" from the east and "Species"
            rises between them, out of focus into focus. Scrolling, the outer words part to the sides and the camera
            goes down through the italic (HeroScrollScene `applyProgress`). Beneath, its shadow, cast on the relief by
            the lamp the pointer swings (`.hero-title-shadow`).
          */}
          <div className="hero-title-wrap" style={{ ['--d' as string]: `${wait + 0.7}s` }}>
          {/* The shadow is a sibling of the heading, not inside it, so the name is read (and copied) once. */}
          <span className={`hero-title hero-title-shadow font-serif font-light ${ready ? 'is-shown' : ''}`} aria-hidden="true">
            <span className="hero-word">India</span> <span className="hero-word hero-word-em">Species</span>{' '}
            <span className="hero-word">Atlas</span>
          </span>
          <h1 className={`hero-title font-serif font-light text-canvas ${ready ? 'is-shown' : ''}`} data-hero-anchor>
            <span className="hero-word hero-word-w" data-w="w">
              <span className="hero-word-in">India</span>
            </span>{' '}
            <span className="hero-word hero-word-em hero-word-c" data-w="c">
              <span className="hero-word-in">Species</span>
            </span>{' '}
            <span className="hero-word hero-word-e" data-w="e">
              <span className="hero-word-in">Atlas</span>
            </span>
          </h1>
          {/* The lamp on the letters: where the hand holds the light, the name catches it. */}
          <span className={`hero-title hero-title-glint font-serif font-light ${ready ? 'is-shown' : ''}`} aria-hidden="true">
            <span className="hero-word">India</span> <span className="hero-word hero-word-em">Species</span>{' '}
            <span className="hero-word">Atlas</span>
          </span>
          </div>
          <div className={`hero-credits ${ready ? 'is-shown' : ''}`} style={{ ['--d' as string]: `${wait + 1.35}s` }}>
            <p className="hero-lede font-serif font-light text-canvas/85">
              <RevealText text="Mapping India's threatened species," play={ready} delay={wait + 1.4} stagger={0.03} className="block" focus />
              <RevealText text="and the lines that shape their survival." play={ready} delay={wait + 1.52} stagger={0.03} className="block" focus />
            </p>
            <dl className="hero-figures">
              {[
                [totalSpecies, 'species'],
                [LOCALITIES, 'localities'],
                [conservationRegionCount, 'ecological regions'],
              ].map(([n, label]) => (
                <div key={label} className="hero-figure">
                  <dt className="sr-only">{label}</dt>
                  <dd>
                    <span className="hero-figure-n tabular-nums">{n}</span>
                    <span className="hero-figure-l" aria-hidden="true">
                      {label}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
            {/* The way in: the descent below, or the relief laid flat as the working map. */}
            <div className="hero-ways">
              <p className="hero-enter">
                <span className="scroll-cue-line" aria-hidden="true" />
                Scroll to enter the atlas
              </p>
              <Link to="/atlas" className="text-link" data-cursor="Open">
                Or open the working map
              </Link>
            </div>
          </div>
        </div>
      </HeroStage>
    </div>
  );
}
