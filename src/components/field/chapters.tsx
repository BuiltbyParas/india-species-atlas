import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { FieldStudy } from '../../content/fieldStudies';
import { FIELD_STUDIES, firstSentence } from '../../content/fieldStudies';
import type { Species } from '../../types';
import { PROGRAMME_BY_ID } from '../../data/programmes';
import { STATUS_INFO } from '../../data/statusInfo';
import { THREAT_BY_ID } from '../../data/threats';
import { formatDeg } from '../../geo/india';
import { useReducedMotion } from '../../motion/preferences';
import { cn } from '../../utils/cn';
import { PhotoCredit } from '../ui/PhotoCredit';
import { SpeciesMap } from '../cinema/SpeciesMap';
import { PHASE_VARS, setVars, type Phase } from '../cinema/SpeciesScene';
import { StatusIndicator } from '../cinema/StatusIndicator';
import { approximateFigure, habitatBand, populationFigures, sentenceWith } from './studyFacts';

/**
 * The words of the five field studies, chapter by chapter.
 *
 * Every sentence is the record's: quoted from the species entry, the
 * programmes or the threat categories, never paraphrased into a stronger
 * claim. Where the world draws something the dataset does not hold — a
 * procedural ground, a schematic power line, a thread that is not a river —
 * the chapter says so at that moment, in the small print the atlas uses for
 * every such note.
 */

/* ------------------------------------------------------------ primitives */

function Chapter({
  i,
  study,
  current,
  align = 'left',
  children,
  hold,
}: {
  i: number;
  study: FieldStudy;
  current: number;
  align?: 'left' | 'right' | 'centre' | 'low' | 'low-right';
  children: ReactNode;
  /** A longer chapter, for one that carries a map or a list. */
  hold?: boolean;
}) {
  const label = study.stages[i].label;
  const n = study.stages.length;
  return (
    <section
      className={cn('fs-ch', i === current && 'is-current', i < current && 'is-past', hold && 'is-long')}
      data-align={align}
      aria-labelledby={`fs-ch-${i}`}
    >
      <div className="fs-ch-inner">
        <h2 id={`fs-ch-${i}`} className="fs-ch-label">
          <span className="tabular-nums">{String(i + 1).padStart(2, '0')}</span> {label}
          <span className="sr-only">
            , chapter {i + 1} of {n}
          </span>
        </h2>
        {children}
      </div>
    </section>
  );
}

const Lede = ({ children }: { children: ReactNode }) => <p className="fs-lede">{children}</p>;
const Body = ({ children }: { children: ReactNode }) => <p className="fs-body">{children}</p>;
/** What the world draws that the record does not hold. */
const Note = ({ children, gesture }: { children: ReactNode; gesture?: boolean }) => (
  <p className={cn('fs-note', gesture && 'fs-note--gesture')}>
    <span className="fs-note-rule" aria-hidden="true" />
    {children}
  </p>
);

function Figure({ value, label, note }: { value: ReactNode; label: string; note?: string }) {
  return (
    <div className="fs-figure">
      <p className="fs-figure-value tabular-nums">{value}</p>
      <p className="fs-figure-label">{label}</p>
      {note && <p className="fs-figure-note">{note}</p>}
    </div>
  );
}

function Status({ s }: { s: Species }) {
  const info = STATUS_INFO[s.status];
  return (
    <div className="fs-status">
      <StatusIndicator status={s.status} />
      <p className="fs-status-line">
        <span style={{ color: info.colorVar }}>{s.statusFullName}</span>, IUCN Red List, assessed {s.statusAssessedYear}.
      </p>
      {s.statusHistory?.map((h) => (
        <p key={h.year} className="fs-body">
          {h.year}: {h.note}
        </p>
      ))}
    </div>
  );
}

function Threats({ s }: { s: Species }) {
  return (
    <ul className="fs-list" aria-label="Recorded threats">
      {s.majorThreats.map((t) => (
        <li key={t}>
          <span className="threat-swatch" aria-hidden="true" data-threat={t} />
          {THREAT_BY_ID[t].name}
        </li>
      ))}
    </ul>
  );
}

function Actions({ s, only }: { s: Species; only?: RegExp }) {
  const list = only ? s.conservationActions.filter((a) => only.test(a)) : s.conservationActions;
  return (
    <ul className="fs-list fs-list--actions" aria-label="Conservation actions">
      {list.map((a) => (
        <li key={a}>{a}</li>
      ))}
    </ul>
  );
}

function Programmes({ s }: { s: Species }) {
  return (
    <ul className="fs-programmes" aria-label="Programmes">
      {s.conservationProgrammes.map((id) => {
        const p = PROGRAMME_BY_ID[id];
        if (!p) return null;
        return (
          <li key={id}>
            <span className="fs-programme-year tabular-nums">{p.startedYear ?? '—'}</span>
            <span>
              {p.name}
              <span className="fs-programme-by">{p.authority}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Localities({ s }: { s: Species }) {
  return (
    <ul className="fs-localities" aria-label="Indicative localities">
      {s.distributionPoints.map((p) => (
        <li key={p.label}>
          <span>{p.label}</span>
          <span className="tabular-nums">
            {formatDeg(p.lat, 'lat')} {formatDeg(p.lng, 'lng')}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The atlas's own map of the record, its layer set by the chapter. */
function RecordMap({ s, phase, on }: { s: Species; phase: Phase; on: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    setVars(ref.current, on ? PHASE_VARS[phase] : { range: 0, threat: 0, cons: 0, zoom: 1 }, !reduced);
  }, [on, phase, reduced]);
  return (
    <div className="fs-map">
      <SpeciesMap ref={ref} species={s} className="aspect-[1000/1105] w-full" showLegend={false} />
      <p className="fs-figure-note">
        {phase === 'range' && 'Shaded: states of record. Points: indicative localities, not a range boundary.'}
        {phase === 'threats' && 'Each hatch is one recorded threat. Threats are recorded for the species, not mapped by place.'}
        {phase === 'conservation' && 'Rings mark programme sites the dataset links to this species, at its anchor locality.'}
      </p>
    </div>
  );
}

function Sources({ s }: { s: Species }) {
  return (
    <div className="fs-sources">
      <p className="fs-figure-label">Sources</p>
      <ul>
        {s.sources.map((src) => (
          <li key={src.url}>
            <a href={src.url} target="_blank" rel="noreferrer">
              {src.label}
            </a>
            <span> · {src.publisher}</span>
          </li>
        ))}
      </ul>
      <p className="fs-figure-note">Entry last checked against its sources on {s.lastVerified}.</p>
    </div>
  );
}

function Onward({ study, next, previous, onNext, onPrevious, onExit }: { study: FieldStudy; next: FieldStudy; previous: FieldStudy; onNext: () => void; onPrevious: () => void; onExit: () => void }) {
  const last = next.n === FIELD_STUDIES[0].n;
  return (
    <div className="fs-onward">
      <p className="fs-onward-done tabular-nums">
        Field study {study.n} complete <span aria-hidden="true">·</span> {String(study.stages.length).padStart(2, '0')} / {String(study.stages.length).padStart(2, '0')}
      </p>
      <button type="button" className="fs-next" onClick={onNext} data-cursor="Enter">
        <span className="fs-next-k">{last ? 'Begin again' : 'Next field study'} · {next.n}</span>
        <span className="fs-next-name">{next.species.commonName}</span>
        <span className="fs-next-place">
          {next.place} · {next.habitat}
        </span>
      </button>
      <div className="fs-onward-links">
        <button type="button" className="text-link" onClick={onPrevious} data-cursor="Enter">
          Previous: {previous.species.commonName}
        </button>
        <button type="button" className="text-link" onClick={onExit} data-cursor="Return">
          All field studies
        </button>
        <Link to="/atlas" className="text-link" data-cursor="Enter">
          Open the map
        </Link>
        <Link to={`/species/${study.id}`} className="text-link" data-cursor="Enter">
          The {study.species.commonName}&rsquo;s page
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- studies */

interface ChapterProps {
  study: FieldStudy;
  current: number;
  next: FieldStudy;
  previous: FieldStudy;
  onNext: () => void;
  onPrevious: () => void;
  onExit: () => void;
}

export function StudyChapters(props: ChapterProps) {
  switch (props.study.id) {
    case 'great-indian-bustard':
      return <Bustard {...props} />;
    case 'snow-leopard':
      return <SnowLeopard {...props} />;
    case 'ganges-river-dolphin':
      return <Dolphin {...props} />;
    case 'bengal-tiger':
      return <Tiger {...props} />;
    default:
      return <Rhino {...props} />;
  }
}

function Bustard({ study, current, next, previous, onNext, onPrevious, onExit }: ChapterProps) {
  const s = study.species;
  const c = { study, current };
  return (
    <>
      <Chapter i={0} {...c} align="right">
        <Lede>{s.summary}</Lede>
        <Note>The grassland is drawn: an impression of the Thar, not a terrain model. The birds are the record&rsquo;s photograph, set into it.</Note>
      </Chapter>
      <Chapter i={1} {...c} hold>
        <Lede>{firstSentence(s.indianDistribution)}</Lede>
        <Body>{s.habitatNote}</Body>
        <Localities s={s} />
      </Chapter>
      <Chapter i={2} {...c} align="right">
        <Lede>{firstSentence(s.threatNote)}</Lede>
        <Note>The record names this threat for the species; it does not give the route of any line, so none is drawn.</Note>
      </Chapter>
      <Chapter i={3} {...c} align="low">
        <Body>{s.image.alt}</Body>
        <PhotoCredit species={s} className="fs-credit" />
      </Chapter>
      <Chapter i={4} {...c} hold>
        <Status s={s} />
        <Body>{sentenceWith(s, 'low hundreds') ?? s.description}</Body>
        <Threats s={s} />
        <RecordMap s={s} phase="threats" on={current === 4} />
      </Chapter>
      <Chapter i={5} {...c} align="right" hold>
        <Lede>What protects it.</Lede>
        <Actions s={s} />
        <Programmes s={s} />
        <Body>Protected areas: {s.protectedAreas.join('; ')}.</Body>
      </Chapter>
      <Chapter i={6} {...c} align="centre" hold>
        <Lede>{s.whyItMatters}</Lede>
        <Sources s={s} />
        <Onward study={study} next={next} previous={previous} onNext={onNext} onPrevious={onPrevious} onExit={onExit} />
      </Chapter>
    </>
  );
}

function SnowLeopard({ study, current, next, previous, onNext, onPrevious, onExit }: ChapterProps) {
  const s = study.species;
  const c = { study, current };
  const spai = sentenceWith(s, 'SPAI');
  return (
    <>
      <Chapter i={0} {...c} align="low">
        <Lede>{s.summary}</Lede>
        <Note>The mountains are drawn, an impression of high Himalayan country and not a map of any valley. The leopard is a photograph.</Note>
      </Chapter>
      <Chapter i={1} {...c} align="right">
        <Lede>{firstSentence(s.habitatNote)}</Lede>
      </Chapter>
      <Chapter i={2} {...c} align="right">
        <Lede>{habitatBand(s) ? `Typically between ${habitatBand(s)}.` : s.habitatNote}</Lede>
        <Body>That band is the record&rsquo;s. The heights of the mountains drawn here are not measured.</Body>
      </Chapter>
      <Chapter i={3} {...c} align="right" hold>
        <Lede>{firstSentence(s.indianDistribution)}</Lede>
        <Body>{s.indianDistribution.split(/(?<=\.)\s/).slice(1).join(' ')}</Body>
      </Chapter>
      <Chapter i={4} {...c} align="low">
        <Body>{s.image.alt}</Body>
        <PhotoCredit species={s} className="fs-credit" />
      </Chapter>
      <Chapter i={5} {...c} hold>
        <Localities s={s} />
        <RecordMap s={s} phase="range" on={current === 5} />
      </Chapter>
      <Chapter i={6} {...c} align="right" hold>
        <Status s={s} />
        {spai && <Body>{spai}</Body>}
        <Threats s={s} />
        <Actions s={s} />
        <Programmes s={s} />
      </Chapter>
      <Chapter i={7} {...c} align="centre" hold>
        <Lede>{s.whyItMatters}</Lede>
        <Sources s={s} />
        <Onward study={study} next={next} previous={previous} onNext={onNext} onPrevious={onPrevious} onExit={onExit} />
      </Chapter>
    </>
  );
}

function Dolphin({ study, current, next, previous, onNext, onPrevious, onExit }: ChapterProps) {
  const s = study.species;
  const c = { study, current };
  return (
    <>
      <Chapter i={0} {...c} align="right">
        <Lede>{s.summary}</Lede>
        <Note>The river, its banks and sandbars are drawn, an impression of a lowland river and not of any reach. The dolphin is the record’s photograph.</Note>
      </Chapter>
      <Chapter i={1} {...c} align="right">
        <Lede>{s.habitatNote}</Lede>
      </Chapter>
      <Chapter i={2} {...c} hold>
        <Lede>{firstSentence(s.indianDistribution)}</Lede>
        <Localities s={s} />
        <Note>These are the localities the record gives. The river drawn behind them is not their course.</Note>
      </Chapter>
      <Chapter i={3} {...c} align="right">
        <Lede>{sentenceWith(s, 'echolocation', ['description']) ?? s.description}</Lede>
        <Body>{sentenceWith(s, 'National Aquatic Animal', ['description']) ?? ''}</Body>
        <PhotoCredit species={s} className="fs-credit" />
      </Chapter>
      <Chapter i={4} {...c} hold>
        <Lede>{firstSentence(s.threatNote)}</Lede>
        <Threats s={s} />
        <Note>The record names dams and barrages as a threat, not their sites, so none is drawn.</Note>
      </Chapter>
      <Chapter i={5} {...c} align="right" hold>
        <Status s={s} />
        <Actions s={s} />
        <Programmes s={s} />
        <Body>Protected areas: {s.protectedAreas.join('; ')}.</Body>
      </Chapter>
      <Chapter i={6} {...c} align="centre" hold>
        <Lede>{s.whyItMatters}</Lede>
        <Sources s={s} />
        <Onward study={study} next={next} previous={previous} onNext={onNext} onPrevious={onPrevious} onExit={onExit} />
      </Chapter>
    </>
  );
}

function Tiger({ study, current, next, previous, onNext, onPrevious, onExit }: ChapterProps) {
  const s = study.species;
  const c = { study, current };
  const pt = s.conservationProgrammes.map((id) => PROGRAMME_BY_ID[id]).find((p) => p?.startedYear);
  const estimate = approximateFigure(s, 'roughly');
  return (
    <>
      <Chapter i={0} {...c} align="low">
        <Note>The forest is drawn, an impression of a central Indian forest and not of any one reserve. The tiger is the record’s photograph, cut out of its background.</Note>
      </Chapter>
      <Chapter i={1} {...c} align="right">
        <Lede>{s.habitatNote}</Lede>
        <PhotoCredit species={s} className="fs-credit" />
      </Chapter>
      <Chapter i={2} {...c}>
        {pt && <Figure value={pt.startedYear} label={pt.name} note={pt.authority} />}
        {pt && <Body>{pt.description}</Body>}
      </Chapter>
      <Chapter i={3} {...c} align="right" hold>
        <Lede>The crowns seen from above. These are the reserves the record names.</Lede>
        <Localities s={s} />
        <Note>The reserves are listed, not drawn: the forest here is not a map of them.</Note>
      </Chapter>
      <Chapter i={4} {...c} hold>
        {estimate && <Figure value={estimate.value} label="Tigers in India, the 2022 national estimate" note="as the record gives it: roughly" />}
        {estimate && <Body>{estimate.sentence}</Body>}
        <Status s={s} />
        <Note>The record holds the 2022 estimate only, so no trend is drawn.</Note>
      </Chapter>
      <Chapter i={5} {...c} align="right" hold>
        <Lede>{firstSentence(s.threatNote)}</Lede>
        <Threats s={s} />
        <Actions s={s} />
      </Chapter>
      <Chapter i={6} {...c} align="centre" hold>
        <Lede>{s.whyItMatters}</Lede>
        <Sources s={s} />
        <Onward study={study} next={next} previous={previous} onNext={onNext} onPrevious={onPrevious} onExit={onExit} />
      </Chapter>
    </>
  );
}

/** The photograph the drawn rhinoceros is cut from (src/assets/field/CREDITS.md). */
const RHINO_CUTOUT_CREDIT = {
  credit: 'Tisha Mukherjee',
  license: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Indian_rhinoceros_in_Kaziranga_National_Park_March_2025_by_Tisha_Mukherjee_08.jpg',
};

function Rhino({ study, current, next, previous, onNext, onPrevious, onExit }: ChapterProps) {
  const s = study.species;
  const c = { study, current };
  const figures = populationFigures(s);
  const concentration = sentenceWith(s, 'two-thirds');
  const irv = PROGRAMME_BY_ID['indian-rhino-vision'];
  return (
    <>
      <Chapter i={0} {...c} align="low-right">
        <Lede>{s.summary}</Lede>
      </Chapter>
      <Chapter i={1} {...c} align="right">
        <Lede>{s.habitatNote}</Lede>
        <Body>{firstSentence(s.indianDistribution)}</Body>
        <Note>The floodplain is drawn, an impression of a Brahmaputra floodplain and not of any one park. The rhinoceros is a photograph, cut out of its background.</Note>
      </Chapter>
      <Chapter i={2} {...c} hold>
        {concentration && <Lede>{concentration}</Lede>}
        <Body>{s.threatNote}</Body>
      </Chapter>
      <Chapter i={3} {...c} align="right" hold>
        {irv && <Figure value={irv.startedYear} label={irv.name} note={irv.authority} />}
        {irv && <Body>{irv.description}</Body>}
        <Localities s={s} />
        <Note>The sites are listed, not drawn: the floodplain here is not a map of them.</Note>
      </Chapter>
      <Chapter i={4} {...c} hold>
        {figures && (
          <div className="fs-figures">
            <Figure value={`< ${figures.past.toLocaleString('en-IN')}`} label="a century ago" note="the record: fewer than" />
            <Figure value={`~ ${figures.now.toLocaleString('en-IN')}`} label="today, India and Nepal" note="the record: around" />
          </div>
        )}
        {figures && <Body>{figures.pastSentence}</Body>}
        <Note>Two figures, two states. The record gives nothing between them, so no trend is drawn.</Note>
      </Chapter>
      <Chapter i={5} {...c} align="right">
        <Body>An Indian rhinoceros in Kaziranga National Park, Assam, photographed in March 2025 and cut out of its background. It is not the photograph the species record carries, which has branches across the animal.</Body>
        <PhotoCredit species={{ ...s, image: { ...s.image, ...RHINO_CUTOUT_CREDIT } }} className="fs-credit" />
      </Chapter>
      <Chapter i={6} {...c} align="right" hold>
        <Status s={s} />
        <Lede>{s.whyItMatters}</Lede>
        <Sources s={s} />
        <Onward study={study} next={next} previous={previous} onNext={onNext} onPrevious={onPrevious} onExit={onExit} />
      </Chapter>
    </>
  );
}
