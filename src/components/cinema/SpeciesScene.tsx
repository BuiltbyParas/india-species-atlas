import { useEffect, useRef, useState } from 'react';
import type { Species, ThreatId } from '../../types';
import { THREAT_BY_ID } from '../../data/threats';
import { PROGRAMME_BY_ID } from '../../data/programmes';
import { gsap, ScrollTrigger } from '../../motion/gsap';
import { scrollToTarget } from '../../motion/SmoothScroll';
import { useReducedMotion, useWideLayout } from '../../motion/preferences';
import { cn } from '../../utils/cn';
import { GEOJSON_STATE_ALIASES } from '../../utils/stateCounts';
import { PhotoCredit } from '../ui/PhotoCredit';
import { useSpeciesProfile } from '../species/SpeciesProfileProvider';
import { SpeciesMap } from './SpeciesMap';
import { StatusIndicator } from './StatusIndicator';
import { InteractiveStat } from './InteractiveStat';
import { RevealText, Reveal } from './RevealText';
import { Magnetic } from './Magnetic';

export type Phase = 'range' | 'threats' | 'conservation';
const PHASES: Array<{ id: Phase; label: string }> = [
  { id: 'range', label: 'Where it lives' },
  { id: 'threats', label: 'What cuts through it' },
  { id: 'conservation', label: 'What protects it' },
];

/** Target values of the map's layer variables for each phase. */
export const PHASE_VARS: Record<Phase, { range: number; threat: number; cons: number; zoom: number }> = {
  range: { range: 1, threat: 0, cons: 0, zoom: 1 },
  threats: { range: 1, threat: 1, cons: 0, zoom: 1 },
  conservation: { range: 1, threat: 1, cons: 1, zoom: 1 },
};

function setVars(el: HTMLElement | null, v: { range: number; threat: number; cons: number; zoom: number }, animate: boolean) {
  if (!el) return;
  const vars = { '--range': v.range, '--threat': v.threat, '--cons': v.cons, '--zoom': v.zoom };
  if (animate) gsap.to(el, { ...vars, duration: 1.4, ease: 'power3.inOut', overwrite: true });
  else gsap.set(el, vars);
}

/**
 * One species, told as a scene: its name set large, its photograph, then its
 * map — where it lives, what cuts through that ground, and what protects it.
 *
 * On a wide screen with motion allowed, the scene holds still while the page
 * scrolls past it and the scroll plays the three layers of the map in turn.
 * Everywhere else — phones, tablets, reduced motion — the same content is
 * laid out as a column the reader moves through at their own pace, and the
 * map's layers are switched by three plain buttons. Every fact is in the DOM
 * in both layouts from the first render.
 */
export function SpeciesScene({ species, index, total }: { species: Species; index: number; total: number }) {
  const wide = useWideLayout();
  const reduced = useReducedMotion();
  const cinematic = wide && !reduced;
  return cinematic ? (
    <PinnedScene species={species} index={index} total={total} />
  ) : (
    <StackedScene species={species} index={index} total={total} />
  );
}

function Header({ species, index, total, play }: { species: Species; index: number; total: number; play?: boolean }) {
  return (
    <div>
      <p className="scene-count text-[13px] tabular-nums text-canvas/45">
        {index + 1} of {total}
      </p>
      <h3 className="mt-4 font-serif text-[clamp(3rem,5.4vw,6.4rem)] font-light leading-[0.9] tracking-[-0.035em] text-canvas">
        <RevealText text={species.commonName} play={play} stagger={0.08} />
      </h3>
      <p className="mt-4 font-serif text-xl italic text-canvas/65 sm:text-2xl">
        <RevealText text={species.scientificName} play={play} delay={0.25} />
      </p>
      <StatusIndicator status={species.status} className="mt-5" />
    </div>
  );
}

function RangeFacts({ species, play, brief }: { species: Species; play?: boolean; brief?: boolean }) {
  const states = new Set(species.states.map((s) => GEOJSON_STATE_ALIASES[s] ?? s)).size;
  return (
    <div>
      <p className="max-w-md font-serif text-[1.18rem] font-light leading-[1.5] text-canvas/90">{species.habitatNote}</p>
      <div className="mt-6 grid max-w-md grid-cols-3 gap-6">
        <InteractiveStat size="md" value={species.states.length} label="States and UTs" note={states !== species.states.length ? 'Ladakh drawn on the older J&K boundary' : 'where it is recorded'} play={play} />
        <InteractiveStat size="md" value={species.distributionPoints.length} label="Localities" note="indicative, on the map" play={play} />
        <div>
          <p className="font-serif text-[clamp(2.4rem,4vw,3.6rem)] font-light leading-none tabular-nums tracking-[-0.03em] text-canvas">
            {species.statusAssessedYear}
          </p>
          <p className="mt-3 text-sm text-canvas/80">Assessed</p>
          <p className="mt-1 text-xs text-canvas/45">year of the cited IUCN assessment</p>
        </div>
      </div>
      <p className="mt-6 max-w-md text-[13px] leading-relaxed text-canvas/55">
        {brief ? species.indianDistribution.split(/(?<=\.)\s/)[0] : species.indianDistribution}
      </p>
    </div>
  );
}

function ThreatFacts({ species, onHover }: { species: Species; onHover: (t: ThreatId | null) => void }) {
  return (
    <div>
      <ul className="max-w-md">
        {species.majorThreats.map((t) => (
          <li key={t}>
            <button
              type="button"
              className="threat-row group flex w-full items-baseline justify-between gap-4 py-2.5 text-left"
              onPointerEnter={() => onHover(t)}
              onPointerLeave={() => onHover(null)}
              onFocus={() => onHover(t)}
              onBlur={() => onHover(null)}
              data-cursor="Trace"
            >
              <span className="font-serif text-[1.3rem] font-light leading-tight text-canvas transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-2">
                {THREAT_BY_ID[t].name}
              </span>
              <span className="threat-swatch" aria-hidden="true" data-threat={t} />
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-5 max-w-md text-[13px] leading-relaxed text-canvas/60">{species.threatNote}</p>
    </div>
  );
}

function ConservationFacts({ species, onHover }: { species: Species; onHover: (on: boolean) => void }) {
  return (
    <div onPointerEnter={() => onHover(true)} onPointerLeave={() => onHover(false)}>
      <ul className="max-w-md space-y-2.5">
        {species.conservationActions.map((a) => (
          <li key={a} className="cons-row text-[14px] leading-snug text-canvas/85">
            {a}
          </li>
        ))}
      </ul>
      {species.conservationProgrammes.length > 0 && (
        <p className="mt-5 max-w-md text-[13px] leading-relaxed text-canvas/55">
          Programmes:{' '}
          {species.conservationProgrammes.map((id) => PROGRAMME_BY_ID[id]?.name ?? id).join('; ')}.
        </p>
      )}
      {species.protectedAreas.length > 0 && (
        <p className="mt-2 max-w-md text-[13px] leading-relaxed text-canvas/55">
          Protected areas: {species.protectedAreas.join('; ')}.
        </p>
      )}
    </div>
  );
}

function Photo({ species, className, imgRef }: { species: Species; className?: string; imgRef?: React.Ref<HTMLImageElement> }) {
  const frameRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = frameRef.current;
    if (!el || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--px', x.toFixed(3));
      el.style.setProperty('--py', y.toFixed(3));
    };
    const onLeave = () => {
      el.style.setProperty('--px', '0');
      el.style.setProperty('--py', '0');
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, []);
  if (!species.image.src) return null;
  return (
    <div ref={frameRef} className={cn('photo-frame', className)}>
      <img
        ref={imgRef}
        src={species.image.src}
        alt={species.image.alt}
        loading="lazy"
        decoding="async"
        className="photo-img"
      />
      <span className="photo-grain" aria-hidden="true" />
    </div>
  );
}

function PinnedScene({ species, index, total }: { species: Species; index: number; total: number }) {
  const sectionRef = useRef<HTMLElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [entered, setEntered] = useState(false);
  const [hlThreat, setHlThreat] = useState<ThreatId | null>(null);
  const [hlSites, setHlSites] = useState(false);
  const { open } = useSpeciesProfile();

  useEffect(() => {
    const section = sectionRef.current;
    const map = mapRef.current;
    const mapWrap = mapWrapRef.current;
    const photo = photoRef.current;
    const img = imgRef.current;
    if (!section || !map || !mapWrap || !photo) return;

    const ctx = gsap.context(() => {
      gsap.set(map, { '--range': 0, '--threat': 0, '--cons': 0, '--zoom': 0 });
      const tl = gsap.timeline({ defaults: { ease: 'none' } });
      // 0 → 0.16: the photograph holds the frame.
      tl.fromTo(photo, { clipPath: 'inset(18% 0% 18% 30%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.12 }, 0);
      if (img) tl.fromTo(img, { yPercent: -6, scale: 1.18 }, { yPercent: 6, scale: 1.04, duration: 0.3 }, 0);
      // 0.16 → 0.3: the photograph gives way to the map.
      tl.to(photo, { scale: 0.3, duration: 0.14, ease: 'power2.inOut' }, 0.17);
      tl.fromTo(mapWrap, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.08 }, 0.2);
      // Range: states, localities and the thread; the camera closes on the region.
      tl.to(map, { '--range': 1, '--zoom': 1, duration: 0.2, ease: 'power2.inOut' }, 0.22);
      // Threats hatch across it.
      tl.to(map, { '--threat': 1, duration: 0.16 }, 0.5);
      // Conservation replaces them.
      tl.to(map, { '--cons': 1, duration: 0.16 }, 0.74);

      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.7,
        animation: tl,
        onUpdate: (self) => {
          const p = self.progress;
          setPhase(p < 0.2 ? null : p < 0.48 ? 'range' : p < 0.72 ? 'threats' : 'conservation');
        },
        onEnter: () => setEntered(true),
      });
    }, section);
    return () => ctx.revert();
  }, []);

  const jumpTo = (id: Phase) => {
    const section = sectionRef.current;
    if (!section) return;
    const target = { range: 0.36, threats: 0.6, conservation: 0.86 }[id];
    const top = section.getBoundingClientRect().top + window.scrollY;
    const runway = section.offsetHeight - window.innerHeight;
    scrollToTarget(top + runway * target);
  };

  return (
    <section
      ref={sectionRef}
      className="species-scene relative h-[440vh]"
      aria-labelledby={`scene-${species.id}`}
      data-phase={phase ?? 'intro'}
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div className="mx-auto grid h-full max-w-[1600px] grid-cols-12 gap-x-8 px-12 pb-10 pt-28">
          <div className="relative z-10 col-span-5 flex flex-col">
            <div id={`scene-${species.id}`}>
              <Header species={species} index={index} total={total} play={entered} />
            </div>

            <div className="relative mt-8 flex-1">
              <div className={cn('phase-panel', phase === 'range' && 'is-current')}>
                <RangeFacts species={species} play={phase === 'range'} brief />
              </div>
              <div className={cn('phase-panel', phase === 'threats' && 'is-current')}>
                <ThreatFacts species={species} onHover={setHlThreat} />
              </div>
              <div className={cn('phase-panel', phase === 'conservation' && 'is-current')}>
                <ConservationFacts species={species} onHover={setHlSites} />
              </div>
              <div className={cn('phase-panel', phase === null && 'is-current')}>
                <p className="max-w-md font-serif text-[1.3rem] font-light leading-[1.5] text-canvas/85">{species.summary}</p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-4">
              <nav aria-label={`${species.commonName}: map layers`} className="phase-nav flex-nowrap">
                {PHASES.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => jumpTo(p.id)}
                    aria-current={phase === p.id ? 'step' : undefined}
                    className={cn('phase-tab', phase === p.id && 'is-current')}
                  >
                    <span className="tabular-nums">{i + 1}</span>
                    {p.label}
                  </button>
                ))}
              </nav>
              <Magnetic>
                <button type="button" className="text-link whitespace-nowrap" onClick={() => open(species.id)} data-cursor="Open">
                  Full profile and sources
                </button>
              </Magnetic>
            </div>
          </div>

          <div className="relative col-span-7">
            <div ref={mapWrapRef} className="invisible absolute inset-0">
              <SpeciesMap ref={mapRef} species={species} highlightThreat={hlThreat} highlightSites={hlSites} className="h-full w-full" align="left" />
            </div>
            <div ref={photoRef} className="photo-stage absolute inset-0 origin-top-right" style={{ clipPath: 'inset(18% 0% 18% 30%)' }}>
              <Photo species={species} className="h-full w-full" imgRef={imgRef} />
            </div>
            <PhotoCredit species={species} className="absolute -top-7 right-0 text-right" />
          </div>
        </div>
      </div>
    </section>
  );
}

function StackedScene({ species, index, total }: { species: Species; index: number; total: number }) {
  const [phase, setPhase] = useState<Phase>('range');
  const [hlThreat, setHlThreat] = useState<ThreatId | null>(null);
  const [hlSites, setHlSites] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { open } = useSpeciesProfile();

  useEffect(() => {
    setVars(mapRef.current, PHASE_VARS[phase], !reduced);
  }, [phase, reduced]);

  return (
    <section className="species-scene relative px-4 py-20 sm:px-8 sm:py-28" aria-labelledby={`scene-${species.id}`}>
      <div className="mx-auto max-w-3xl">
        <div id={`scene-${species.id}`}>
          <Header species={species} index={index} total={total} />
        </div>
        <Reveal className="mt-10" direction="up">
          <Photo species={species} className="aspect-[4/3] w-full" />
          <PhotoCredit species={species} className="mt-2" />
        </Reveal>
        <p className="mt-10 font-serif text-[1.2rem] font-light leading-[1.55] text-canvas/85">{species.summary}</p>

        <div className="mt-12">
          <div className="phase-nav" role="group" aria-label={`${species.commonName}: map layers`}>
            {PHASES.map((p, i) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={phase === p.id}
                onClick={() => setPhase(p.id)}
                className={cn('phase-tab', phase === p.id && 'is-current')}
              >
                <span className="tabular-nums">{i + 1}</span>
                {p.label}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <SpeciesMap ref={mapRef} species={species} highlightThreat={hlThreat} highlightSites={hlSites} className="aspect-[1000/1105] w-full" showLegend={false} />
          </div>
          <p className="mt-3 text-[12px] leading-snug text-canvas/45">
            {phase === 'range' && 'Shaded: states of record. Points: indicative localities, not a range boundary.'}
            {phase === 'threats' && 'Each hatch is one recorded threat. Threats are recorded for the species, not mapped by place.'}
            {phase === 'conservation' && 'Rings mark programme sites the dataset links to this species, at its anchor locality.'}
          </p>
        </div>

        <div className="mt-12 space-y-12">
          <div>
            <h4 className="facts-heading">Where it lives</h4>
            <RangeFacts species={species} />
          </div>
          <div>
            <h4 className="facts-heading">What cuts through it</h4>
            <ThreatFacts
              species={species}
              onHover={(t) => {
                setHlThreat(t);
                if (t) setPhase('threats');
              }}
            />
          </div>
          <div>
            <h4 className="facts-heading">What protects it</h4>
            <ConservationFacts
              species={species}
              onHover={(on) => {
                setHlSites(on);
                if (on) setPhase('conservation');
              }}
            />
          </div>
          <button type="button" className="text-link" onClick={() => open(species.id)}>
            Full profile and sources
          </button>
        </div>
      </div>
    </section>
  );
}
