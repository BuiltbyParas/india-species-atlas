import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { FieldStudy } from '../../content/fieldStudies';
import { firstSentence } from '../../content/fieldStudies';
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
import type { FieldStage } from '../../world/field/stage';
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

function Onward({ study, next, onNext, onExit }: { study: FieldStudy; next: FieldStudy; onNext: () => void; onExit: () => void }) {
  return (
    <div className="fs-onward">
      <button type="button" className="fs-next" onClick={onNext} data-cursor={next.verb}>
        <span className="fs-next-k">Next field study · {next.n}</span>
        <span className="fs-next-name">{next.species.commonName}</span>
        <span className="fs-next-place">
          {next.place} · {next.verb}
        </span>
      </button>
      <div className="fs-onward-links">
        <button type="button" className="text-link" onClick={onExit} data-cursor="Return">
          Back to the field studies
        </button>
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
  onNext: () => void;
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

function Bustard({ study, current, next, onNext, onExit }: ChapterProps) {
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
        <Onward study={study} next={next} onNext={onNext} onExit={onExit} />
      </Chapter>
    </>
  );
}

function SnowLeopard({ study, current, next, onNext, onExit }: ChapterProps) {
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
        <Onward study={study} next={next} onNext={onNext} onExit={onExit} />
      </Chapter>
    </>
  );
}

function Dolphin({ study, current, next, onNext, onExit }: ChapterProps) {
  const s = study.species;
  const c = { study, current };
  return (
    <>
      <Chapter i={0} {...c} align="right">
        <Lede>{s.summary}</Lede>
        <Note gesture>Move the hand through the water; press and drag to push it.</Note>
      </Chapter>
      <Chapter i={1} {...c} align="right">
        <Lede>{s.habitatNote}</Lede>
      </Chapter>
      <Chapter i={2} {...c} hold>
        <Lede>{firstSentence(s.indianDistribution)}</Lede>
        <Body>Drag along the band to move between the localities the record gives, west to east.</Body>
        <Note>The thread joins recorded localities. It is not the course of the river.</Note>
      </Chapter>
      <Chapter i={3} {...c} align="right">
        <Lede>{sentenceWith(s, 'echolocation', ['description']) ?? s.description}</Lede>
        <Body>{sentenceWith(s, 'National Aquatic Animal', ['description']) ?? ''}</Body>
        <PhotoCredit species={s} className="fs-credit" />
      </Chapter>
      <Chapter i={4} {...c} hold>
        <Lede>{firstSentence(s.threatNote)}</Lede>
        <Threats s={s} />
        <Note>The barrages are marked schematically: the record names dams and barrages, not their sites.</Note>
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
        <Onward study={study} next={next} onNext={onNext} onExit={onExit} />
      </Chapter>
    </>
  );
}

function Tiger({ study, current, next, onNext, onExit }: ChapterProps) {
  const s = study.species;
  const c = { study, current };
  const pt = s.conservationProgrammes.map((id) => PROGRAMME_BY_ID[id]).find((p) => p?.startedYear);
  const estimate = approximateFigure(s, 'roughly');
  return (
    <>
      <Chapter i={0} {...c} align="low">
        <Note gesture>Move the light.</Note>
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
        <Lede>The forest seen from above becomes the map: each mark a reserve the record names.</Lede>
        <Localities s={s} />
        <Note>Reserves are placed at their anchor coordinates; the marks are not reserve boundaries.</Note>
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
        <Onward study={study} next={next} onNext={onNext} onExit={onExit} />
      </Chapter>
    </>
  );
}

function Rhino({ study, current, next, onNext, onExit }: ChapterProps) {
  const s = study.species;
  const c = { study, current };
  const figures = populationFigures(s);
  const concentration = sentenceWith(s, 'two-thirds');
  const irv = PROGRAMME_BY_ID['indian-rhino-vision'];
  return (
    <>
      <Chapter i={0} {...c} align="low-right">
        <Lede>{s.summary}</Lede>
        <Note gesture>A form raised from the atlas's schematic outline of the species: body plan and posture only, not a model of the animal.</Note>
      </Chapter>
      <Chapter i={1} {...c} align="right">
        <Lede>{s.habitatNote}</Lede>
        <Body>{firstSentence(s.indianDistribution)}</Body>
      </Chapter>
      <Chapter i={2} {...c} hold>
        {concentration && <Lede>{concentration}</Lede>}
        <Body>{s.threatNote}</Body>
        <Note>The form breaks into its points; each point stands for one animal of the record&rsquo;s figure.</Note>
      </Chapter>
      <Chapter i={3} {...c} align="right" hold>
        {irv && <Figure value={irv.startedYear} label={irv.name} note={irv.authority} />}
        {irv && <Body>{irv.description}</Body>}
        <Localities s={s} />
      </Chapter>
      <Chapter i={4} {...c} hold>
        {figures && (
          <div className="fs-figures">
            <Figure value={`< ${figures.past.toLocaleString('en-IN')}`} label="a century ago" note="drawn as its upper bound" />
            <Figure value={`~ ${figures.now.toLocaleString('en-IN')}`} label="today, India and Nepal" note="one point each" />
          </div>
        )}
        {figures && <Body>{figures.pastSentence}</Body>}
        <Note>Two figures, two states. Nothing between them is drawn, because the record gives nothing between them.</Note>
      </Chapter>
      <Chapter i={5} {...c} align="right">
        <Body>{s.image.alt}</Body>
        <PhotoCredit species={s} className="fs-credit" />
      </Chapter>
      <Chapter i={6} {...c} align="right" hold>
        <Status s={s} />
        <Lede>{s.whyItMatters}</Lede>
        <Sources s={s} />
        <Onward study={study} next={next} onNext={onNext} onExit={onExit} />
      </Chapter>
    </>
  );
}

/* ---------------------------------------------------- study instruments */

/**
 * The one study-specific control in the frame: the river's drag band. The
 * others carry their gesture in the world itself
 * (the light, the line, the form).
 */
export function StudyInstrument({ study, current, stage }: { study: FieldStudy; current: number; stage: FieldStage | null }) {
  if (study.id === 'ganges-river-dolphin') return <RiverBand study={study} on={current === 2} stage={stage} />;
  return null;
}

/**
 * DRAG: the river's localities, west to east, on a band the hand drags.
 * The value is continuous (the world moves the camera along the thread);
 * the readout names the nearest locality. Keyboard: arrows step between
 * localities. Touch: a horizontal drag on the band; the page still scrolls
 * vertically (`touch-action: pan-y`).
 */
function RiverBand({ study, on, stage }: { study: FieldStudy; on: boolean; stage: FieldStage | null }) {
  const points = useMemo(() => [...study.species.distributionPoints].sort((a, b) => a.lng - b.lng), [study]);
  const [value, setValue] = useState(0);
  const bandRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const n = points.length;
  const nearest = Math.round(value * (n - 1));
  const p = points[nearest];

  useEffect(() => {
    stage?.set({ drag: value });
  }, [stage, value]);

  const fromEvent = (clientX: number) => {
    const r = bandRef.current?.getBoundingClientRect();
    if (!r) return;
    setValue(Math.min(1, Math.max(0, (clientX - r.left) / r.width)));
  };

  return (
    <div className={cn('fs-band', on && 'is-on')} aria-hidden={!on}>
      <p className="fs-band-read">
        <span className="fs-band-name">{p.label}</span>
        <span className="tabular-nums">
          {formatDeg(p.lat, 'lat')} {formatDeg(p.lng, 'lng')}
        </span>
      </p>
      <div
        ref={bandRef}
        className="fs-band-track"
        role="slider"
        tabIndex={on ? 0 : -1}
        aria-label="Recorded localities, west to east"
        aria-valuemin={1}
        aria-valuemax={n}
        aria-valuenow={nearest + 1}
        aria-valuetext={p.label}
        data-cursor-drag
        data-cursor-area="Drag"
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          fromEvent(e.clientX);
        }}
        onPointerMove={(e) => dragging.current && fromEvent(e.clientX)}
        onPointerUp={() => {
          dragging.current = false;
          setValue((v) => Math.round(v * (n - 1)) / (n - 1));
        }}
        onPointerCancel={() => (dragging.current = false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') setValue(Math.min(n - 1, nearest + 1) / (n - 1));
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') setValue(Math.max(0, nearest - 1) / (n - 1));
          else return;
          e.preventDefault();
        }}
      >
        <span className="fs-band-line" />
        {points.map((q, i) => (
          <span key={q.label} className={cn('fs-band-stop', i === nearest && 'is-near')} style={{ left: `${(i / (n - 1)) * 100}%` }} />
        ))}
        <span className="fs-band-handle" style={{ left: `${value * 100}%` }} />
      </div>
      <p className="fs-band-ends" aria-hidden="true">
        <span>West</span>
        <span>Drag</span>
        <span>East</span>
      </p>
    </div>
  );
}
