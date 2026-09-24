import { useEffect, useMemo, useRef, useState, type Ref } from 'react';
import type { ThreatId } from '../../types';
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
import { RevealText } from './RevealText';
import { threadPath } from './SpeciesMap';

/**
 * From fragmentation to protection: all twelve species on one map.
 *
 * Each species is a thread through its own indicative localities. Under
 * "fragmentation" the threads break into dashes — a drawing device, stated as
 * one on screen, for the pressures the dataset records against every species.
 * Under "protection" they rejoin, turn water-blue, and the programme sites and
 * the states they cover come up. Nothing on this map has a geometry the data
 * does not hold: the threads join recorded localities, the sites are the
 * dataset's own programme–species links placed at anchor localities, and the
 * shaded states are the states of record for programme-covered species.
 *
 * Hovering a threat lights the threads of exactly the species it is recorded
 * against; hovering a programme lights its sites.
 */

const THREATS = threatChartData();
const MAX_THREAT = Math.max(...THREATS.map((t) => t.value));
const SITES = programmeSitesFor(SPECIES);
const PROTECTED_STATES = [...programmeStatesFor(SPECIES)].map((s) => GEOJSON_STATE_ALIASES[s] ?? s);

export function NationalMap({
  frag = 0,
  prot = 0,
  draw = 1,
  hlThreat = null,
  hlProgramme = null,
  ref,
  className,
}: {
  frag?: number;
  prot?: number;
  draw?: number;
  hlThreat?: ThreatId | null;
  hlProgramme?: string | null;
  ref?: Ref<HTMLDivElement>;
  className?: string;
}) {
  const geo = useIndiaGeo();
  const threads = useMemo(
    () =>
      SPECIES.map((s) => ({
        s,
        d: threadPath(s.distributionPoints),
      })),
    [],
  );
  const protectedD = geo ? PROTECTED_STATES.map((n) => geo.byName.get(n)?.d ?? '').join('') : '';

  return (
    <div
      ref={ref}
      className={cn('national-map relative', (hlThreat || hlProgramme) && 'has-hl', className)}
      style={{ '--frag': frag, '--prot': prot, '--draw': draw } as React.CSSProperties}
    >
      <svg viewBox={MAP_VIEWBOX} className="h-full w-full overflow-visible" role="img" aria-label="Map of India with a thread through each species' indicative localities and the conservation programme sites linked to them">
        <path d={geo?.all ?? ''} className="nm-country" />
        <path d={protectedD} className="nm-protected" />
        <g className="nm-threads">
          {threads.map(({ s, d }) => (
            <path
              key={s.id}
              d={d}
              pathLength={1}
              className={cn('nm-thread', hlThreat && s.majorThreats.includes(hlThreat) && 'is-hl')}
              style={{ ['--c' as string]: STATUS_HEX[s.status] }}
            />
          ))}
        </g>
        {SPECIES.flatMap((s) =>
          s.distributionPoints.map((p) => {
            const [x, y] = project(p.lng, p.lat);
            return (
              <circle
                key={`${s.id}-${p.label}`}
                cx={x}
                cy={y}
                r="4"
                className={cn('nm-point', hlThreat && s.majorThreats.includes(hlThreat) && 'is-hl')}
                style={{ ['--c' as string]: STATUS_HEX[s.status] }}
              />
            );
          }),
        )}
        {SITES.map((site, i) => {
          const [x, y] = project(site.lng, site.lat);
          const angle = (site.fanIndex / Math.max(site.fanCount, 1)) * Math.PI * 2;
          const off = site.fanCount > 1 ? 16 : 0;
          return (
            <circle
              key={`${site.programme.id}-${site.species.id}-${i}`}
              cx={x + Math.cos(angle) * off}
              cy={y + Math.sin(angle) * off}
              r="15"
              className={cn('nm-site', hlProgramme === site.programme.id && 'is-hl')}
            />
          );
        })}
      </svg>
    </div>
  );
}

function ThreatList({ onHover }: { onHover: (t: ThreatId | null) => void }) {
  return (
    <ul className="max-w-md">
      {THREATS.map((t) => (
        <li key={t.id}>
          <button
            type="button"
            className="line-bar group w-full py-2 text-left"
            onPointerEnter={() => onHover(t.id)}
            onPointerLeave={() => onHover(null)}
            onFocus={() => onHover(t.id)}
            onBlur={() => onHover(null)}
            data-cursor="Trace"
          >
            <span className="flex items-baseline justify-between gap-4 text-[14px] text-canvas/85">
              <span>{t.name}</span>
              <span className="tabular-nums text-canvas/45">
                {t.value} of {SPECIES.length}
              </span>
            </span>
            <span className="line-bar-track" aria-hidden="true">
              <span className="line-bar-fill" style={{ width: `${(t.value / MAX_THREAT) * 100}%` }} />
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function ProgrammeList({ onHover }: { onHover: (id: string | null) => void }) {
  const programmes = [...PROGRAMMES].sort((a, b) => (a.startedYear ?? 9999) - (b.startedYear ?? 9999));
  return (
    <ul className="max-w-md">
      {programmes.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            className="prog-row group flex w-full items-baseline gap-4 py-1.5 text-left"
            onPointerEnter={() => onHover(p.id)}
            onPointerLeave={() => onHover(null)}
            onFocus={() => onHover(p.id)}
            onBlur={() => onHover(null)}
            data-cursor="Locate"
          >
            <span className="w-11 shrink-0 tabular-nums text-[13px] text-canvas/45">{p.startedYear ?? '—'}</span>
            <span className="text-[14px] leading-snug text-canvas/85 transition-colors group-hover:text-canvas">{p.name.split(' (')[0]}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

const DEVICE_NOTE =
  'The threads join each species’ indicative localities; breaking them is a drawing device for the recorded threats, not a map of where those threats fall.';

export function ConservationChapter() {
  const wide = useWideLayout();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  useChapter(ref, { index: 4, title: 'Fragmentation to protection' });
  return (
    <section ref={ref} id="conservation-chapter" aria-labelledby="cons-title" className="relative">
      {wide && !reduced ? <PinnedConservation /> : <StackedConservation />}
      <Closing />
    </section>
  );
}

function PinnedConservation() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<'frag' | 'prot'>('frag');
  const [hlThreat, setHlThreat] = useState<ThreatId | null>(null);
  const [hlProgramme, setHlProgramme] = useState<string | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const map = mapRef.current;
    if (!section || !map) return;
    const ctx = gsap.context(() => {
      gsap.set(map, { '--frag': 0, '--prot': 0, '--draw': 0 });
      const tl = gsap.timeline({ defaults: { ease: 'none' } });
      tl.to(map, { '--draw': 1, duration: 0.18, ease: 'power2.out' }, 0);
      tl.to(map, { '--frag': 1, duration: 0.22, ease: 'power1.inOut' }, 0.14);
      tl.to(map, { '--frag': 0, '--prot': 1, duration: 0.28, ease: 'power2.inOut' }, 0.52);
      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.8,
        animation: tl,
        onUpdate: (self) => setPhase(self.progress < 0.5 ? 'frag' : 'prot'),
      });
    }, section);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={sectionRef} className="relative h-[320vh]" data-phase={phase}>
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div className="mx-auto grid h-full max-w-[1600px] grid-cols-12 gap-x-8 px-12 pb-12 pt-28">
          <div className="relative col-span-5 flex flex-col">
            <p className="text-[13px] tabular-nums text-canvas/45">Chapter 04</p>
            <h2 id="cons-title" className="mt-4 font-serif text-[clamp(2.8rem,5.2vw,5.8rem)] font-light leading-[0.92] tracking-[-0.035em] text-canvas">
              <span className={cn('cons-word', phase === 'frag' && 'is-on')}>From fragmentation</span>
              <br />
              <span className={cn('cons-word', phase === 'prot' && 'is-on')}>to protection</span>
            </h2>
            <div className="relative mt-10 flex-1">
              <div className={cn('phase-panel', phase === 'frag' && 'is-current')}>
                <p className="mb-5 max-w-md text-[14px] leading-relaxed text-canvas/65">
                  How many of the {SPECIES.length} species each threat is recorded against. Point to one to see whose lines it cuts.
                </p>
                <ThreatList onHover={setHlThreat} />
              </div>
              <div className={cn('phase-panel', phase === 'prot' && 'is-current')}>
                <p className="mb-5 max-w-md text-[14px] leading-relaxed text-canvas/65">
                  {PROGRAMMES.length} programmes, by the year they began. Point to one to find its sites.
                </p>
                <ProgrammeList onHover={setHlProgramme} />
              </div>
            </div>
            <p className="max-w-md text-[12px] leading-snug text-canvas/40">{DEVICE_NOTE}</p>
          </div>
          <div className="relative col-span-7">
            <NationalMap ref={mapRef} hlThreat={hlThreat} hlProgramme={hlProgramme} className="absolute inset-0" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StackedConservation() {
  const [phase, setPhase] = useState<'frag' | 'prot'>('frag');
  const [hlThreat, setHlThreat] = useState<ThreatId | null>(null);
  const [hlProgramme, setHlProgramme] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const vars = phase === 'frag' ? { '--frag': 1, '--prot': 0, '--draw': 1 } : { '--frag': 0, '--prot': 1, '--draw': 1 };
    if (reduced) gsap.set(mapRef.current, vars);
    else gsap.to(mapRef.current, { ...vars, duration: 1.4, ease: 'power3.inOut' });
  }, [phase, reduced]);

  return (
    <div className="px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-3xl">
        <p className="text-[13px] tabular-nums text-canvas/45">Chapter 04</p>
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
        <NationalMap ref={mapRef} hlThreat={hlThreat} hlProgramme={hlProgramme} className="mt-4 aspect-[1000/1105] w-full" />
        <p className="mt-3 text-[12px] leading-snug text-canvas/45">{DEVICE_NOTE}</p>
        <div className="mt-12 space-y-12">
          <div>
            <h3 className="facts-heading">Threats, by how many species they are recorded against</h3>
            <ThreatList
              onHover={(t) => {
                setHlThreat(t);
                if (t) setPhase('frag');
              }}
            />
          </div>
          <div>
            <h3 className="facts-heading">Programmes, by the year they began</h3>
            <ProgrammeList
              onHover={(id) => {
                setHlProgramme(id);
                if (id) setPhase('prot');
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Closing() {
  return (
    <div className="closing mx-auto flex min-h-[90svh] max-w-[1600px] flex-col justify-center px-4 py-24 sm:px-8 lg:px-12">
      <p className="max-w-5xl font-serif text-[clamp(2.2rem,5.4vw,5.6rem)] font-light leading-[1.02] tracking-[-0.03em] text-canvas/55">
        <RevealText text="Mapping is not just about where species are." stagger={0.05} />
      </p>
      <p className="mt-6 max-w-5xl font-serif text-[clamp(2.2rem,5.4vw,5.6rem)] font-light leading-[1.02] tracking-[-0.03em] text-canvas">
        <RevealText text="It is about where we choose to protect them." delay={0.6} stagger={0.05} />
      </p>
    </div>
  );
}
