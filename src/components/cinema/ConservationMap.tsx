import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type Ref } from 'react';
import type { ConservationProgramme, Species, ThreatId } from '../../types';
import { SPECIES } from '../../data/species';
import { PROGRAMMES } from '../../data/programmes';
import { STATUS_HEX } from '../../theme';
import { MAP_VIEWBOX, project, useIndiaGeo } from '../../geo/india';
import { gsap, ScrollTrigger } from '../../motion/gsap';
import { useReducedMotion, useWideLayout } from '../../motion/preferences';
import { useChapter } from '../../motion/chapters';
import { threatChartData } from '../../utils/stats';
import { GEOJSON_STATE_ALIASES } from '../../utils/stateCounts';
import { programmeSitesFor, programmeStatesFor } from '../map/programmeSites';
import { cn } from '../../utils/cn';
import { FocusText } from './FocusText';
import { RevealText } from './RevealText';
import { GeoLine } from '../../geo/line/GeoLine';
import { threadPath } from '../../geo/line/paths';
import { onAtlasAnchors, setAtlas, setAtlasTrace, setPlate, useAtlasLive } from '../home/atlasWorld';

/**
 * From fragmentation to protection: all twelve species on one map.
 *
 * Each species is a thread through its own indicative localities. Under
 * "fragmentation" the threads break into dashes — a drawing device, stated as
 * one on screen, for the pressures the dataset records against every species.
 * Under "protection" they rejoin, turn water-blue, and the programme sites and
 * the states they cover come up. Last, the threads stand down and only what is
 * protected stays on the sheet, under the chapter's closing statement.
 *
 * Nothing on this map has a geometry the data does not hold: the threads join
 * recorded localities, the sites are the dataset's own programme–species links
 * placed at anchor localities, and the shaded states are the states of record
 * for programme-covered species.
 *
 * A threat is traced the way the data links it: the threat, the species it is
 * recorded against (their threads light), and the programmes on record for
 * those species (their sites ring, ahead of the protection layer). A programme
 * is traced back the same way, to the species it covers.
 */

const THREATS = threatChartData();
const SITES = programmeSitesFor(SPECIES);
const PROTECTED_STATES = [...programmeStatesFor(SPECIES)].map((s) => GEOJSON_STATE_ALIASES[s] ?? s);
const PROGRAMMES_BY_YEAR = [...PROGRAMMES].sort((a, b) => (a.startedYear ?? 9999) - (b.startedYear ?? 9999));
const COVERED = new Set(PROGRAMMES.flatMap((p) => p.speciesIds));

function speciesAgainst(threat: ThreatId): Species[] {
  return SPECIES.filter((s) => s.majorThreats.includes(threat));
}
function programmesFor(species: Species[]): ConservationProgramme[] {
  const ids = new Set(species.map((s) => s.id));
  return PROGRAMMES_BY_YEAR.filter((p) => p.speciesIds.some((id) => ids.has(id)));
}
function speciesOf(programme: ConservationProgramme): Species[] {
  return SPECIES.filter((s) => programme.speciesIds.includes(s.id));
}
const shortName = (p: ConservationProgramme) => p.name.split(' (')[0];
/** The twelve in Red List order, most at risk first: the slots of every threat's strip. */
const RANK: Record<string, number> = { CR: 0, EN: 1, VU: 2 };
const BY_RISK = [...SPECIES].sort((a, b) => (RANK[a.status] ?? 9) - (RANK[b.status] ?? 9));

/** What the map is asked to light: species threads, and the programmes whose sites ring. */
type Trace = { species: Set<string>; programmes: Set<string> } | null;

export function NationalMap({
  frag,
  prot,
  draw,
  close,
  hlThreat = null,
  hlProgramme = null,
  trace,
  fit,
  ref,
  className,
}: {
  /** Each of these, when omitted, is inherited from a scroll stage above the map. */
  frag?: number;
  prot?: number;
  draw?: number;
  close?: number;
  hlThreat?: ThreatId | null;
  hlProgramme?: string | null;
  /** A full trace; takes precedence over `hlThreat` / `hlProgramme`. */
  trace?: Trace;
  /** How the sheet sits in a box of another shape; the pinned scene sets it flush right, leaving the open sea for its readout. */
  fit?: string;
  ref?: Ref<HTMLDivElement>;
  className?: string;
}) {
  const geo = useIndiaGeo();
  const threads = useMemo(() => SPECIES.map((s) => ({ s, d: threadPath(s.distributionPoints) })), []);
  const protectedD = geo ? PROTECTED_STATES.map((n) => geo.byName.get(n)?.d ?? '').join('') : '';

  const lit: Trace =
    trace ??
    (hlThreat
      ? { species: new Set(speciesAgainst(hlThreat).map((s) => s.id)), programmes: new Set() }
      : hlProgramme
        ? { species: new Set(), programmes: new Set([hlProgramme]) }
        : null);

  const vars: Record<string, number> = {};
  if (frag !== undefined) vars['--frag'] = frag;
  if (prot !== undefined) vars['--prot'] = prot;
  if (draw !== undefined) vars['--draw'] = draw;
  if (close !== undefined) vars['--close'] = close;

  return (
    <div ref={ref} className={cn('national-map', lit && 'has-hl', className)} style={vars as CSSProperties}>
      <svg viewBox={MAP_VIEWBOX} preserveAspectRatio={fit} className="h-full w-full overflow-visible" role="img" aria-label="Map of India with a thread through each species' indicative localities and the conservation programme sites linked to them">
        {/* The sheet lifted a little off the page: the country's own outline, offset and dark, beneath it. */}
        <path d={geo?.all ?? ''} className="nm-shadow" transform="translate(7 12)" />
        <path d={geo?.all ?? ''} className="nm-country" />
        <path d={protectedD} className="nm-protected" />
        <g className="nm-threads">
          {threads.map(({ s, d }) => (
            <GeoLine
              key={s.id}
              d={d}
              role="thread"
              still
              className={cn('nm-thread', lit?.species.has(s.id) && 'is-hl', !COVERED.has(s.id) && 'is-uncovered')}
              style={{ ['--c' as string]: STATUS_HEX[s.status] }}
            />
          ))}
        </g>
        {SPECIES.flatMap((s) =>
          s.distributionPoints.map((p, i) => {
            const [x, y] = project(p.lng, p.lat);
            return (
              <circle
                key={`${s.id}-${p.label}`}
                cx={x}
                cy={y}
                r={i === 0 ? 5 : 4}
                className={cn('nm-point', i === 0 && 'is-anchor', lit?.species.has(s.id) && 'is-hl')}
                style={{ ['--c' as string]: STATUS_HEX[s.status] }}
              />
            );
          }),
        )}
        {SITES.map((site, i) => {
          const [x, y] = project(site.lng, site.lat);
          const angle = (site.fanIndex / Math.max(site.fanCount, 1)) * Math.PI * 2;
          const off = site.fanCount > 1 ? 16 : 0;
          const on = lit?.programmes.has(site.programme.id);
          return (
            <circle
              key={`${site.programme.id}-${site.species.id}-${i}`}
              cx={x + Math.cos(angle) * off}
              cy={y + Math.sin(angle) * off}
              r="15"
              className={cn('nm-site', on && 'is-hl')}
            />
          );
        })}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------- the lists */

function ThreatList({
  active,
  pinned,
  onPreview,
  onPin,
  compact,
}: {
  active: ThreatId | null;
  pinned: ThreatId | null;
  onPreview: (t: ThreatId | null) => void;
  onPin: (t: ThreatId | null) => void;
  /** Under the pinned scene's feature, which carries the strip: names and counts only. */
  compact?: boolean;
}) {
  return (
    <ul className={cn('cons-list', compact && 'is-compact')} aria-label="Threats, by how many of the species each is recorded against">
      {THREATS.map((t, i) => (
        <li key={t.id} style={{ ['--i' as string]: i } as CSSProperties}>
          <button
            type="button"
            aria-pressed={pinned === t.id}
            className={cn('cmap-row cmap-threat', active === t.id && 'is-active')}
            onPointerEnter={() => onPreview(t.id)}
            onPointerLeave={() => onPreview(null)}
            onFocus={() => onPreview(t.id)}
            onBlur={() => onPreview(null)}
            onClick={() => onPin(pinned === t.id ? null : t.id)}
            data-cursor="Trace"
          >
            <span className="flex items-baseline justify-between gap-4">
              <span className="cmap-row-name">{t.name}</span>
              <span className="cmap-row-n tabular-nums">
                {t.value} <span className="text-canvas/45">of {SPECIES.length}</span>
              </span>
            </span>
            {/* One slot per species, most at risk first; a slot is lit, in its species' category colour, where the threat is recorded against it. */}
            <span className="cmap-strip" aria-hidden="true">
              {BY_RISK.map((s) => (
                <span
                  key={s.id}
                  className={cn('cmap-slot', s.majorThreats.includes(t.id) && 'is-on')}
                  style={{ ['--c' as string]: STATUS_HEX[s.status] }}
                />
              ))}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function ProgrammeList({
  active,
  pinned,
  onPreview,
  onPin,
  begun,
}: {
  active: string | null;
  pinned: string | null;
  onPreview: (id: string | null) => void;
  onPin: (id: string | null) => void;
  /** With the year dial: how many programmes (in order of starting) have begun by the year on the dial. */
  begun?: number;
}) {
  return (
    <ul className={cn('cons-list', begun !== undefined && 'is-dialled')} aria-label="Conservation programmes, by the year they began">
      {PROGRAMMES_BY_YEAR.map((p, i) => (
        <li key={p.id} style={{ ['--i' as string]: i } as CSSProperties}>
          <button
            type="button"
            aria-pressed={pinned === p.id}
            className={cn(
              'prog-row cmap-row flex w-full items-baseline gap-4 py-1.5 text-left',
              active === p.id && 'is-active',
              begun !== undefined && i < begun && 'is-begun',
            )}
            onPointerEnter={() => onPreview(p.id)}
            onPointerLeave={() => onPreview(null)}
            onFocus={() => onPreview(p.id)}
            onBlur={() => onPreview(null)}
            onClick={() => onPin(pinned === p.id ? null : p.id)}
            data-cursor="Locate"
          >
            <span className="cmap-year tabular-nums">{p.startedYear ?? '—'}</span>
            <span className="cmap-row-name leading-snug">{shortName(p)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------- the trace readout */

function SpeciesNames({ species, onFocus }: { species: Species[]; onFocus?: (id: string | null) => void }) {
  return (
    <ul className="cons-species">
      {species.map((s) => (
        <li key={s.id} onPointerEnter={() => onFocus?.(s.id)} onPointerLeave={() => onFocus?.(null)}>
          <span className="cons-dot" style={{ background: STATUS_HEX[s.status] }} aria-hidden="true" />
          {s.commonName}
          {!COVERED.has(s.id) && <span className="sr-only"> (no programme on record)</span>}
        </li>
      ))}
    </ul>
  );
}

/**
 * Set in the open sea beside the map: at rest, how to read the layer on show;
 * with a threat or programme active, the whole chain the data records for it.
 */
function Readout({
  phase,
  threat,
  programme,
  onSpecies,
  quiet,
}: {
  phase: 'frag' | 'prot';
  threat: ThreatId | null;
  programme: string | null;
  onSpecies?: (id: string | null) => void;
  /** Set by the scroll's own reading rather than the reader's choice: shown, not announced. */
  quiet?: boolean;
}) {
  const live = quiet ? undefined : 'polite';
  if (phase === 'frag' && threat) {
    const t = THREATS.find((x) => x.id === threat)!;
    const hit = speciesAgainst(threat);
    const answers = programmesFor(hit);
    const unanswered = hit.filter((s) => !COVERED.has(s.id)).length;
    return (
      <div className="cons-readout" aria-live={live}>
        <p className="cons-eyebrow">Recorded against</p>
        <p className="cons-readout-title">{t.name}</p>
        <p className="cons-readout-n tabular-nums">
          {hit.length} of {SPECIES.length} species — their lines are lit
        </p>
        <SpeciesNames species={hit} onFocus={onSpecies} />
        <p className="cons-eyebrow mt-5">Programmes on record for them</p>
        <p className="cons-readout-body">
          {answers.length ? answers.map(shortName).join(' · ') : 'None of the atlas’s programmes names these species.'}
        </p>
        {answers.length > 0 && (
          <p className="cons-readout-note">
            Ringed at each species’ anchor locality.
            {unanswered > 0 && ` ${unanswered === 1 ? 'One' : unanswered} of these species ${unanswered === 1 ? 'has' : 'have'} no programme on record.`}
          </p>
        )}
      </div>
    );
  }
  if (phase === 'prot' && programme) {
    const p = PROGRAMMES.find((x) => x.id === programme)!;
    return (
      <div className="cons-readout" aria-live={live}>
        <p className="cons-eyebrow">{p.startedYear ? `Since ${p.startedYear}` : 'Programme'}</p>
        <p className="cons-readout-title">{shortName(p)}</p>
        <p className="cons-readout-n">{p.authority}</p>
        <p className="cons-eyebrow mt-5">Covers, in the atlas</p>
        <SpeciesNames species={speciesOf(p)} onFocus={onSpecies} />
      </div>
    );
  }
  return (
    <div className="cons-readout is-key">
      <p className="cons-eyebrow">Reading the map</p>
      {phase === 'frag' ? (
        <ul className="cons-key">
          <li>
            <svg viewBox="0 0 28 8" aria-hidden="true"><path d="M1 4 H27" className="k-line" /></svg>
            One species: a line through its recorded localities, coloured by IUCN category.
          </li>
          <li>
            <svg viewBox="0 0 28 8" aria-hidden="true"><path d="M1 4 H27" className="k-line is-broken" /></svg>
            Broken: a drawing device for the threats recorded against it, not where they fall.
          </li>
        </ul>
      ) : (
        <ul className="cons-key">
          <li>
            <svg viewBox="0 0 28 14" aria-hidden="true"><circle cx="14" cy="7" r="5.5" className="k-ring" /></svg>
            A programme site: where a programme meets a species it covers, at that species’ anchor locality.
          </li>
          <li>
            <svg viewBox="0 0 28 14" aria-hidden="true"><rect x="5" y="2" width="18" height="10" className="k-state" /></svg>
            Shaded: the states of record for programme-covered species.
          </li>
          <li>
            <svg viewBox="0 0 28 8" aria-hidden="true"><path d="M1 4 H27" className="k-line is-whole" /></svg>
            Rejoined: a species at least one programme names. {UNCOVERED_NOTE}
          </li>
        </ul>
      )}
    </div>
  );
}

/** One trace from whatever is active: a threat, a programme, or one species picked out of either. */
function useTrace(phase: 'frag' | 'prot', threat: ThreatId | null, programme: string | null, only: string | null, begun = 0): Trace {
  return useMemo(() => {
    // The year dial: every programme begun by the year on it, and the species they name, lit together.
    if (phase === 'prot' && !programme && begun > 0) {
      const started = PROGRAMMES_BY_YEAR.slice(0, begun);
      const ids = new Set(started.flatMap((p) => p.speciesIds));
      if (only && ids.has(only)) {
        return { species: new Set([only]), programmes: new Set(started.filter((p) => p.speciesIds.includes(only)).map((p) => p.id)) };
      }
      return { species: ids, programmes: new Set(started.map((p) => p.id)) };
    }
    if (phase === 'frag' && threat) {
      const hit = speciesAgainst(threat);
      const ids = only && hit.some((s) => s.id === only) ? [only] : hit.map((s) => s.id);
      const answers = programmesFor(hit.filter((s) => ids.includes(s.id)));
      return { species: new Set(ids), programmes: new Set(answers.map((p) => p.id)) };
    }
    if (phase === 'prot' && programme) {
      const p = PROGRAMMES.find((x) => x.id === programme)!;
      const ids = only && p.speciesIds.includes(only) ? [only] : p.speciesIds;
      return { species: new Set(ids), programmes: new Set([programme]) };
    }
    return null;
  }, [phase, threat, programme, only, begun]);
}

/** Preview on hover or focus, pin on click; a preview wins while it lasts. */
function useSelection<T>() {
  const [preview, setPreview] = useState<T | null>(null);
  const [pinned, setPinned] = useState<T | null>(null);
  const clear = () => {
    setPreview(null);
    setPinned(null);
  };
  return { active: preview ?? pinned, pinned, setPreview, setPinned, clear };
}

/* ----------------------------------------------------------- the chapter */

const UNCOVERED = SPECIES.filter((s) => !COVERED.has(s.id));
/** Said in the key, from the record: which threads stay broken, and that the device claims nothing about the threats. */
const UNCOVERED_NOTE = `${
  UNCOVERED.length
    ? `Still broken: ${UNCOVERED.map((s) => s.commonName).join(' and ')}, which none names. `
    : ''
}A drawing device, not a claim that the threats are gone.`;

const DEVICE_NOTE =
  'The threads join each species’ indicative localities; breaking them is a drawing device for the recorded threats, not a map of where those threats fall.';

const CHAPTER = { index: 4, title: 'Fragmentation to protection' };
const CHAPTER_LABEL = `Chapter ${String(CHAPTER.index).padStart(2, '0')}`;

const STATEMENT = ['Mapping is not just about where species are.', 'It is about where we choose to protect them.'];
const CLOSE_WORDS = STATEMENT[1].split(' ');
const PROTECTED_NOTE = `What stays on the sheet: ${SITES.length} programme sites and the ${PROTECTED_STATES.length} states of record they reach.`;

export function ConservationChapter() {
  const wide = useWideLayout();
  const reduced = useReducedMotion();
  const live = useAtlasLive();
  const ref = useRef<HTMLElement>(null);
  useChapter(ref, CHAPTER);
  const pinned = wide && !reduced;
  // Pinned with the atlas world live, the chapter is a plate cut in the selection's canopy, through which the relief is
  // seen (atlasWorld.ts); without the world it is the same plate drawn as a sheet. Stacked, it is set on umber earth.
  const world = pinned && live;
  return (
    <section
      ref={ref}
      id="conservation-chapter"
      data-trail
      data-env="umber"
      data-ground={pinned ? 'canopy' : 'umber'}
      data-over-world={world ? 'true' : undefined}
      data-geo-quiet
      aria-labelledby="cons-title"
      className={cn('relative', world && 'z-[2]')}
    >
      {pinned ? (
        <PinnedConservation world={world} />
      ) : (
        <>
          <StackedConservation />
          <Closing />
        </>
      )}
    </section>
  );
}

type Phase = 'frag' | 'prot' | 'close';

/*
 * The pinned scene, as fractions of its scroll:
 *   0.00–0.04  the map whole, every species in its status colour
 *   0.04–0.14  the threads break                                   (pressure)
 *   0.15–0.45  the threats read in turn, most widely recorded first: each set large, its species' lines lit
 *   0.46–0.54  the threads rejoin and turn water-blue              (response)
 *   0.53–0.79  the year dial: from the first programme's year to the last, each programme's sites lighting as it begins
 *   0.82–0.96  the threads stand down; what is protected stays, under the statement
 * A threat or programme the reader points to or selects wins over the scroll's reading while it lasts.
 */
const AT = { prot: 0.48, close: 0.82 };
const ROLL = { t0: 0.15, t1: 0.45, y0: 0.53, y1: 0.79 };
const YEARS = PROGRAMMES_BY_YEAR.map((p) => p.startedYear).filter((y): y is number => typeof y === 'number');
const FIRST_YEAR = YEARS[0] ?? 0;
const LAST_YEAR = YEARS[YEARS.length - 1] ?? 0;
const begunBy = (year: number) => PROGRAMMES_BY_YEAR.filter((p) => p.startedYear !== undefined && p.startedYear <= year).length;
const pad2 = (n: number) => String(n).padStart(2, '0');

/** The threat the scroll is reading, set large: how many of the twelve it is recorded against, its name, its strip. */
function ThreatFeature({ threat }: { threat: ThreatId | null }) {
  const i = Math.max(0, THREATS.findIndex((t) => t.id === threat));
  const t = THREATS[i];
  return (
    <div className="cons-feature" aria-hidden="true">
      <p className="cons-feature-k tabular-nums">
        Threat {pad2(i + 1)} of {pad2(THREATS.length)} <span>· recorded against</span>
      </p>
      <p key={t.id} className="cons-feature-big font-serif font-light">
        <span className="cons-feature-n tabular-nums">{t.value}</span>
        <span className="cons-feature-of">of {SPECIES.length} species</span>
      </p>
      <FocusText key={`${t.id}-n`} as="p" text={t.name} cut delay={0.12} className="cons-feature-name font-serif font-light" />
      <span key={`${t.id}-s`} className="cmap-strip cons-feature-strip">
        {BY_RISK.map((s) => (
          <span key={s.id} className={cn('cmap-slot', s.majorThreats.includes(t.id) && 'is-on')} style={{ ['--c' as string]: STATUS_HEX[s.status] }} />
        ))}
      </span>
    </div>
  );
}

/** The year dial: the year the scroll has reached (written straight to the node), and what had begun by then. */
function YearFeature({ yearRef, begun }: { yearRef: Ref<HTMLSpanElement>; begun: number }) {
  const latest = begun > 0 ? PROGRAMMES_BY_YEAR[begun - 1] : null;
  const covered = new Set(PROGRAMMES_BY_YEAR.slice(0, begun).flatMap((p) => p.speciesIds)).size;
  return (
    <div className="cons-feature" aria-hidden="true">
      <p className="cons-feature-k">Response · programmes begun by</p>
      <p className="cons-feature-big font-serif font-light">
        <span ref={yearRef} className="cons-feature-n cons-feature-year tabular-nums">
          {FIRST_YEAR}
        </span>
      </p>
      <FocusText
        key={begun}
        as="p"
        text={`${begun} of ${PROGRAMMES.length} programmes, naming ${covered} of ${SPECIES.length} species`}
        cut
        className="cons-feature-name font-serif font-light"
      />
      {latest && (
        <p key={`l-${begun}`} className="cons-feature-latest">
          Latest: {shortName(latest)}
          {latest.startedYear ? `, ${latest.startedYear}` : ''}
        </p>
      )}
    </div>
  );
}
/** The light each part of the scene stands in: pressure on burnt earth, response and the statement on the river. */
const PHASE_ENV: Record<Phase, 'umber' | 'riverbed'> = { frag: 'umber', prot: 'riverbed', close: 'riverbed' };
const RANK_OF = new Map(BY_RISK.map((s, i) => [s.id, i]));

function PinnedConservation({ world }: { world: boolean }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('frag');
  const threat = useSelection<ThreatId>();
  const programme = useSelection<string>();
  const [only, setOnly] = useState<string | null>(null);
  /** What the scroll is reading when the reader has chosen nothing: a threat, then the programmes begun by the dial's year. */
  const [rollThreat, setRollThreat] = useState<ThreatId>(THREATS[0].id);
  const [begun, setBegun] = useState(() => begunBy(FIRST_YEAR));
  const yearRef = useRef<HTMLSpanElement>(null);
  const layer = phase === 'frag' ? 'frag' : 'prot';
  const shownThreat = threat.active ?? (phase === 'frag' ? rollThreat : null);
  const trace = useTrace(layer, shownThreat, programme.active, only, phase === 'prot' ? begun : 0);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;
    let last: Phase = 'frag';
    let lastThreat = -1;
    let lastYear = -1;
    let lastBegun = -1;
    // One set of values, scrubbed by ScrollTrigger and read by both the type and the map — the SVG sheet through the
    // stage's custom properties, or the atlas world (the relief) through `setAtlas` — so the two can never disagree.
    const st = { draw: 0, arrive: 0, frag: 0, prot: 0, close: 0, exit: 0 };
    /** Writes a custom property only when its printed value changes: each write restyles the element's whole subtree. */
    const written = new Map<string, string>();
    const put = (el: HTMLElement | null, name: string, v: number) => {
      if (!el) return;
      const text = v.toFixed(4);
      const key = `${el.className}|${name}`;
      if (written.get(key) === text) return;
      written.set(key, text);
      el.style.setProperty(name, text);
    };
    const q = <T extends HTMLElement>(sel: string) => stage.querySelector<T>(sel);
    const head = q('.cons-plate-head');
    const wash = q('.cons-wash');
    const left = q('.cons-left');
    const readout = q('.cons-readout-slot');
    const hinge = q('.cons-close');
    let arrived: boolean | null = null;
    // The scene can go live (or give up) while the reader is here: start from a stage with neither mode's values on it.
    // That includes the values the world's mode writes on the parts themselves: left on the hinge, an inline `--close: 0`
    // would outrank the sheet's inherited one and the statement would never be set (the world giving up mid-chapter).
    for (const el of [stage, head, wash, hinge, readout]) {
      for (const name of ['--draw', '--frag', '--prot', '--close', '--exit', '--plate-k']) el?.style.removeProperty(name);
    }
    delete stage.dataset.arrived;
    for (const el of [left, readout]) {
      el?.style.removeProperty('opacity');
      el?.style.removeProperty('translate');
    }
    const write = () => {
      if (!world) {
        // The sheet: everything on the stage reads the timeline's values.
        put(stage, '--draw', st.draw);
        put(stage, '--frag', st.frag);
        put(stage, '--prot', st.prot);
        put(stage, '--close', st.close);
        put(stage, '--exit', st.exit);
        return;
      }
      // Over the world the stage holds a long list, a legend and a dozen labels. A value written on the stage would restyle
      // all of them every frame (custom properties inherit), so each value goes only where it is read: the column arrives
      // once, as a class (reversed by the same threshold); the plate's marks, the wash and the hinge take their own values;
      // the column and the legend step back by their own opacity.
      const now = st.draw > 0.32;
      if (now !== arrived) stage.dataset.arrived = String((arrived = now));
      setAtlas({ arrive: st.arrive, frag: st.frag, prot: st.prot, close: st.close });
      // The plate: inset from the sheet's sides and top while the world arrives, grown to the frame as the pin holds.
      const t = Math.min(1, st.arrive / 0.92);
      const plate = t * t * (3 - 2 * t);
      put(head, '--plate-k', plate);
      put(wash, '--plate-k', plate);
      put(wash, '--prot', st.prot);
      put(wash, '--close', st.close);
      put(hinge, '--close', st.close);
      put(readout, '--prot', st.prot);
      put(hinge, '--exit', st.exit);
      const off = Math.min(1, st.close / 0.3);
      for (const el of [left, readout]) {
        if (!el) continue;
        const o = (1 - off).toFixed(3);
        if (el.style.opacity !== o) {
          el.style.opacity = o;
          el.style.translate = `0 ${(off * -28).toFixed(1)}px`;
        }
      }
      setPlate((1 - plate) * window.innerWidth * 0.06, (1 - plate) * window.innerHeight * 0.14);
    };
    write();
    const ctx = gsap.context(() => {
      // The sheet (or the relief) draws as the chapter arrives, so the pin opens on a finished plate.
      gsap.to(st, {
        draw: 1,
        ease: 'power1.out',
        onUpdate: write,
        scrollTrigger: { trigger: section, start: 'top 85%', end: 'top 10%', scrub: 0.6 },
      });
      // The world's own arrival runs the whole way in, unhurried: the camera comes down out of the dark and the light
      // front crosses the country just as the plate takes the frame.
      gsap.to(st, {
        arrive: 1,
        ease: 'none',
        onUpdate: write,
        scrollTrigger: { trigger: section, start: 'top bottom', end: 'top top', scrub: 0.6 },
      });
      // Leaving, the statement steps back before the closing's name arrives under it.
      gsap.to(st, {
        exit: 1,
        ease: 'none',
        onUpdate: write,
        scrollTrigger: { trigger: section, start: 'bottom bottom', end: 'bottom 45%', scrub: 0.4 },
      });
      const tl = gsap.timeline({ defaults: { ease: 'none' }, onUpdate: write });
      tl.to(st, { frag: 1, duration: 0.1, ease: 'power1.inOut' }, 0.04);
      tl.to(st, { frag: 0, prot: 1, duration: 0.08, ease: 'power2.inOut' }, 0.46);
      tl.to(st, { close: 1, duration: 0.14, ease: 'power1.inOut' }, 0.82);
      tl.set({}, {}, 1);
      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.8,
        animation: tl,
        onUpdate: (self) => {
          const pr = self.progress;
          const next: Phase = pr < AT.prot ? 'frag' : pr < AT.close ? 'prot' : 'close';
          if (next !== last) setPhase((last = next));
          // The threats in turn; then the year, written straight to its node, and what had begun by it.
          const ti = Math.min(THREATS.length - 1, Math.max(0, Math.floor(((pr - ROLL.t0) / (ROLL.t1 - ROLL.t0)) * THREATS.length)));
          if (ti !== lastThreat) setRollThreat(THREATS[(lastThreat = ti)].id);
          const yt = Math.min(1, Math.max(0, (pr - ROLL.y0) / (ROLL.y1 - ROLL.y0)));
          const year = Math.round(FIRST_YEAR + yt * (LAST_YEAR - FIRST_YEAR));
          if (year !== lastYear) {
            lastYear = year;
            if (yearRef.current) yearRef.current.textContent = String(year);
            const b = begunBy(year);
            if (b !== lastBegun) setBegun((lastBegun = b));
          }
        },
      });
    }, section);
    return () => {
      ctx.revert();
      if (world) setPlate(0, 0);
    };
  }, [world]);

  // The trace, in the world: the threads, localities and sites it lights; the rest steps back.
  useEffect(() => {
    if (!world) return;
    setAtlasTrace(trace);
    return () => setAtlasTrace(null);
  }, [world, trace]);

  // The traced species' names, set at their anchor localities on the relief (positions come from the scene each frame).
  useEffect(() => {
    if (!world) return;
    const host = labelsRef.current;
    if (!host) return;
    const nodes = [...host.children] as HTMLElement[];
    /** Each label's size, measured the first time it is shown (one forced layout per label for the life of the page). */
    const sizes: Array<[number, number] | undefined> = [];
    const placed: Array<[number, number, number, number]> = [];
    const order: number[] = [];
    return onAtlasAnchors((layout) => {
      // Set from the south up, so a northern name steps up out of the way of the one below it rather than across it.
      order.length = 0;
      for (let i = 0; i < nodes.length; i++) if (layout[i * 3 + 2] >= 0.02) order.push(i);
      order.sort((a, b) => layout[b * 3 + 1] - layout[a * 3 + 1]);
      placed.length = 0;
      for (let i = 0; i < nodes.length; i++) {
        if (layout[i * 3 + 2] < 0.02 && nodes[i].style.visibility !== 'hidden') nodes[i].style.visibility = 'hidden';
      }
      // Nothing traced (the usual frame): no layout is read at all.
      if (!order.length) return;
      // The legend in the plate's corner is in the way too: a name that would run under it is set below its point instead.
      const legend = host.parentElement?.querySelector('.cons-readout-slot')?.getBoundingClientRect();
      const top = host.getBoundingClientRect().top;
      const keepOut: [number, number, number, number] | null = legend ? [legend.left - 8, legend.top - top - 8, legend.right + 8, legend.bottom - top + 8] : null;
      const hits = (b: [number, number, number, number], p: [number, number, number, number]) => b[0] < p[2] && b[2] > p[0] && b[1] < p[3] && b[3] > p[1];
      for (const i of order) {
        const node = nodes[i];
        const size = (sizes[i] ??= [node.offsetWidth, node.offsetHeight]);
        const x = layout[i * 3];
        let y = layout[i * 3 + 1];
        // The label stands above its point (CSS translate); its box, in screen space, before any step.
        const box = (yy: number): [number, number, number, number] => [x - size[0] / 2 - 6, yy - size[1] - 22, x + size[0] / 2 + 6, yy - 18];
        let b = box(y);
        const below = Boolean(keepOut && hits(b, keepOut));
        if (below) {
          // Hung under the point: the same box, mirrored.
          b = [b[0], y + 18, b[2], y + 22 + size[1]];
        } else {
          for (let tries = 0; tries < 4; tries++) {
            const hit = placed.find((p) => hits(b, p));
            if (!hit) break;
            y -= b[3] - hit[1] + 4;
            b = box(y);
          }
        }
        placed.push(b);
        if (below) node.dataset.below = '';
        else delete node.dataset.below;
        node.style.visibility = 'visible';
        node.style.opacity = layout[i * 3 + 2].toFixed(3);
        node.style.setProperty('--lift', `${(layout[i * 3 + 1] - y).toFixed(1)}px`);
        node.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      }
    });
  }, [world]);

  // A selection belongs to its layer; crossing to the next one starts it clean (adjusted during render, not in an effect).
  const [seenPhase, setSeenPhase] = useState(phase);
  if (seenPhase !== phase) {
    setSeenPhase(phase);
    threat.clear();
    programme.clear();
    setOnly(null);
  }

  const closing = phase === 'close';

  return (
    <div ref={sectionRef} className="relative h-[640vh]" data-phase={phase} data-env={PHASE_ENV[phase]}>
      <div
        ref={stageRef}
        data-ground="umber"
        data-over-world={world ? 'true' : undefined}
        data-world={world ? 'true' : undefined}
        className="cons-stage sticky top-0 h-[100svh] overflow-hidden"
      >
        {/*
          The plate: a sheet of night laid on the paper, inset at first with the print's marks and its caption in
          the margin, growing to the frame as it arrives (--draw). Its ground then follows the story (--prot, --close).
        */}
        {world ? <div className="cons-wash" aria-hidden="true" /> : <div className="cons-ground" aria-hidden="true" />}
        <div className="cons-plate-head" aria-hidden="true">
          <span className="cons-plate-mark is-l" />
          <span className="cons-plate-mark is-r" />
          <p className="cons-plate-cap">
            <span>Plate 04 · {CHAPTER.title}</span>
            <span className="tabular-nums">
              {SPECIES.length} species · {THREATS.length} recorded threats · {PROGRAMMES.length} programmes
            </span>
          </p>
        </div>
        <div className="relative mx-auto grid h-full max-w-[1600px] grid-cols-12 grid-rows-[minmax(0,1fr)] gap-x-8 px-12 pb-10 pt-24">
          <div className="cons-left relative col-span-4 flex min-h-0 flex-col" inert={closing}>
            <div className="cons-label plate-label tabular-nums">
              <span className="plate-label-n" aria-hidden="true">
                {String(CHAPTER.index).padStart(2, '0')}
              </span>
              <span className="plate-label-rule" aria-hidden="true" />
              <span className="sr-only">{CHAPTER_LABEL}</span>
              <span className="cons-steps" aria-hidden="true">
                <span className={cn(phase === 'frag' && 'is-on')}>i Pressure</span>
                <span className={cn(phase !== 'frag' && 'is-on')}>ii Response</span>
              </span>
            </div>
            <h2 id="cons-title" className="cons-title mt-4 font-serif font-light text-canvas">
              <span className={cn('cons-word', phase === 'frag' && 'is-on')}>From fragmentation</span>{' '}
              <span className={cn('cons-word', phase !== 'frag' && 'is-on')}>to protection</span>
            </h2>
            <div className="relative mt-8 min-h-0 flex-1">
              <div className={cn('phase-panel', phase === 'frag' && 'is-current')}>
                <ThreatFeature threat={shownThreat} />
                <p className="cons-hint">
                  The scroll reads the threats in turn. Point to one to trace whose lines it cuts and what answers it; select
                  it to hold the trace.
                </p>
                <ThreatList compact active={shownThreat} pinned={threat.pinned} onPreview={threat.setPreview} onPin={threat.setPinned} />
              </div>
              <div className={cn('phase-panel', phase !== 'frag' && 'is-current')}>
                <YearFeature yearRef={yearRef} begun={begun} />
                <p className="cons-hint">
                  {PROGRAMMES.length} programmes, by the year they began. Point to one to find its sites and the species it
                  covers.
                </p>
                <ProgrammeList
                  active={programme.active}
                  pinned={programme.pinned}
                  onPreview={programme.setPreview}
                  onPin={programme.setPinned}
                  begun={begun}
                />
              </div>
            </div>
          </div>

          <div className="cons-map-col relative col-span-8 min-h-0">
            {!world && <NationalMap trace={trace} fit="xMaxYMid meet" className="cons-map absolute" />}
            <div className="cons-readout-slot" inert={closing}>
              <Readout
                phase={layer}
                threat={shownThreat}
                programme={programme.active}
                onSpecies={setOnly}
                quiet={!threat.active && !programme.active}
              />
            </div>
          </div>
        </div>

        {world && (
          // The traced species' names on the relief, in the order of `SPECIES` (the scene's anchor order).
          <div ref={labelsRef} className="atlas-labels pointer-events-none absolute inset-0" aria-hidden="true">
            {SPECIES.map((s) => (
              <span key={s.id} className="atlas-label" style={{ visibility: 'hidden', ['--c' as string]: STATUS_HEX[s.status] }}>
                <span className="atlas-label-name">{s.commonName}</span>
                <span className="atlas-label-n tabular-nums">{String((RANK_OF.get(s.id) ?? 0) + 1).padStart(2, '0')}</span>
              </span>
            ))}
          </div>
        )}
        {/* The hinge: the lists step back, the threads stand down, the camera lifts, and the statement is set across what is protected. */}
        <div className="cons-close pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="cons-close-inner mx-auto flex h-full max-w-[1600px] flex-col justify-center px-12">
            <p className="cons-close-line cons-close-a font-serif font-light">{STATEMENT[0]}</p>
            {/* Resolved a word at a time with the scroll (`--close`), out of depth into focus, so the chapter's last line is read at the reader's pace. */}
            <p className="cons-close-line cons-close-b font-serif font-light text-canvas" style={{ ['--n' as string]: CLOSE_WORDS.length }}>
              {CLOSE_WORDS.map((w, i) => (
                <Fragment key={i}>
                  <span className="cc-w" style={{ ['--i' as string]: i }}>
                    {w}
                  </span>
                  {i < CLOSE_WORDS.length - 1 ? ' ' : null}
                </Fragment>
              ))}
            </p>
            <p className="cons-close-line cons-close-c">
              <span className="cons-close-rule" />
              {PROTECTED_NOTE}
            </p>
          </div>
        </div>
        <p className="sr-only">{`${STATEMENT.join(' ')} ${PROTECTED_NOTE}`}</p>
      </div>
    </div>
  );
}

function StackedConservation() {
  const [phase, setPhase] = useState<'frag' | 'prot'>('frag');
  const threat = useSelection<ThreatId>();
  const programme = useSelection<string>();
  const [only, setOnly] = useState<string | null>(null);
  const trace = useTrace(phase, threat.active, programme.active, only);
  const mapRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const vars = phase === 'frag' ? { '--frag': 1, '--prot': 0, '--draw': 1, '--close': 0 } : { '--frag': 0, '--prot': 1, '--draw': 1, '--close': 0 };
    if (reduced) gsap.set(mapRef.current, vars);
    else gsap.to(mapRef.current, { ...vars, duration: 1.4, ease: 'atlas.cinema' });
  }, [phase, reduced]);

  return (
    <div className="px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-3xl">
        <p className="text-small tabular-nums text-canvas/62">{CHAPTER_LABEL}</p>
        <h2 id="cons-title" className="mt-4 font-serif text-[clamp(2.6rem,9vw,4.6rem)] font-light leading-[0.95] tracking-[-0.03em] text-canvas">
          From fragmentation to protection
        </h2>
        <div className="phase-nav mt-10" role="group" aria-label="Map layer">
          <button type="button" aria-pressed={phase === 'frag'} className={cn('phase-tab', phase === 'frag' && 'is-current')} onClick={() => setPhase('frag')}>
            <span className="tabular-nums">1</span>Fragmentation
          </button>
          <button type="button" aria-pressed={phase === 'prot'} className={cn('phase-tab', phase === 'prot' && 'is-current')} onClick={() => setPhase('prot')}>
            <span className="tabular-nums">2</span>Protection
          </button>
        </div>
        <NationalMap ref={mapRef} trace={trace} className="mt-4 aspect-[1000/1105] w-full" />
        <p className="mt-3 text-label leading-snug text-canvas/62">{DEVICE_NOTE}</p>
        <div className="cons-readout-inline mt-8">
          <Readout phase={phase} threat={threat.active} programme={programme.active} onSpecies={setOnly} />
        </div>
        <div className="mt-12 space-y-12">
          <div>
            <h3 className="facts-heading">Threats, by how many species they are recorded against</h3>
            <ThreatList
              active={threat.active}
              pinned={threat.pinned}
              onPreview={(t) => {
                threat.setPreview(t);
                if (t) setPhase('frag');
              }}
              onPin={(t) => {
                threat.setPinned(t);
                if (t) setPhase('frag');
              }}
            />
          </div>
          <div>
            <h3 className="facts-heading">Programmes, by the year they began</h3>
            <ProgrammeList
              active={programme.active}
              pinned={programme.pinned}
              onPreview={(id) => {
                programme.setPreview(id);
                if (id) setPhase('prot');
              }}
              onPin={(id) => {
                programme.setPinned(id);
                if (id) setPhase('prot');
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** The closing statement for the stacked chapter: the same hinge as the pinned one, as a still frame. */
function Closing() {
  return (
    <div className="closing mx-auto grid max-w-[1600px] items-center gap-10 px-4 py-24 sm:px-8 md:grid-cols-12 lg:px-12">
      <div className="md:col-span-7">
        <p className="font-serif text-headline font-light text-canvas/62">
          <RevealText text={STATEMENT[0]} stagger={0.05} />
        </p>
        <p className="mt-6 font-serif text-headline font-light text-canvas">
          <RevealText text={STATEMENT[1]} delay={0.6} stagger={0.05} />
        </p>
        <p className="mt-8 max-w-sm text-small leading-relaxed text-canvas/62">{PROTECTED_NOTE}</p>
      </div>
      <NationalMap frag={0} prot={1} draw={1} close={1} className="aspect-[1000/1105] w-full max-w-md justify-self-center md:col-span-5" />
    </div>
  );
}
