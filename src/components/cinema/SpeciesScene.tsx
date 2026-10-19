import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Species, ThreatId } from '../../types';
import { THREAT_BY_ID } from '../../data/threats';
import { PROGRAMME_BY_ID } from '../../data/programmes';
import { gsap, ScrollTrigger } from '../../motion/gsap';
import { scrollToTarget } from '../../motion/SmoothScroll';
import { useInView } from '../../motion/useInView';
import { useInkBleed } from '../../interaction/ink';
import { bindVelocity } from '../../interaction/velocity';
import { photoContours, type ContourSet } from '../../interaction/photoContours';
import { openMedia } from '../../interaction/media';
import { useReducedMotion, useWideLayout } from '../../motion/preferences';
import { photoSources } from '../../utils/photo';
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

export function setVars(el: HTMLElement | null, v: { range: number; threat: number; cons: number; zoom: number }, animate: boolean) {
  if (!el) return;
  const vars = { '--range': v.range, '--threat': v.threat, '--cons': v.cons, '--zoom': v.zoom };
  if (animate) gsap.to(el, { ...vars, duration: 1.4, ease: 'atlas.cinema', overwrite: true });
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
      <p className="scene-count text-small tabular-nums text-canvas/62">
        {index + 1} of {total}
      </p>
      <h3 className="mt-4 font-serif text-title font-light text-canvas">
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
      <p className="max-w-md font-serif text-lede font-light text-canvas/90">{species.habitatNote}</p>
      <div className="mt-6 grid max-w-md grid-cols-3 gap-6">
        <InteractiveStat size="md" value={species.states.length} label="States and UTs" note={states !== species.states.length ? "Ladakh counted with J&K" : "where it is recorded"} play={play} />
        <InteractiveStat size="md" value={species.distributionPoints.length} label="Localities" note="indicative, on the map" play={play} />
        <div>
          <p className="font-serif text-[clamp(2.4rem,4vw,3.6rem)] font-light leading-none tabular-nums tracking-[-0.03em] text-canvas">
            {species.statusAssessedYear}
          </p>
          <p className="mt-3 text-sm text-canvas/80">Assessed</p>
          <p className="mt-1 text-xs text-canvas/62">
            year of the cited IUCN assessment
            {species.statusPublishedYear !== species.statusAssessedYear && `, published ${species.statusPublishedYear}`}
          </p>
        </div>
      </div>
      <p className="mt-6 max-w-md text-small leading-relaxed text-canvas/70">
        {brief ? species.indianDistribution.split(/(?<=\.)\s/)[0] : species.indianDistribution}
      </p>
    </div>
  );
}

export function ThreatFacts({ species, onHover }: { species: Species; onHover: (t: ThreatId | null) => void }) {
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
      <p className="mt-5 max-w-md text-small leading-relaxed text-canvas/60">{species.threatNote}</p>
    </div>
  );
}

export function ConservationFacts({ species, onHover }: { species: Species; onHover: (on: boolean) => void }) {
  return (
    <div onPointerEnter={() => onHover(true)} onPointerLeave={() => onHover(false)}>
      <ul className="max-w-md space-y-2.5">
        {species.conservationActions.map((a) => (
          <li key={a} className="cons-row text-sm leading-snug text-canvas/85">
            {a}
          </li>
        ))}
      </ul>
      {species.conservationProgrammes.length > 0 && (
        <p className="mt-5 max-w-md text-small leading-relaxed text-canvas/70">
          Programmes:{' '}
          {species.conservationProgrammes.map((id) => PROGRAMME_BY_ID[id]?.name ?? id).join('; ')}.
        </p>
      )}
      {species.protectedAreas.length > 0 && (
        <p className="mt-2 max-w-md text-small leading-relaxed text-canvas/70">
          Protected areas: {species.protectedAreas.join('; ')}.
        </p>
      )}
    </div>
  );
}

export function Photo({
  species,
  className,
  imgRef,
  sizes,
  shutter,
  eager,
  expand,
}: {
  species: Species;
  /** The print can be opened full screen, with its credit (interaction/media.ts). */
  expand?: boolean;
  className?: string;
  imgRef?: React.Ref<HTMLImageElement>;
  /** Load at once rather than lazily (a journey is about to hand its photograph to this one). */
  eager?: boolean;
  /** Open from a ruled line the first time it comes into view. */
  shutter?: boolean;
  /** The slot's width, so the browser can choose between the WebP and the master. */
  sizes: string;
}) {
  const photo = photoSources(species);
  const frameRef = useRef<HTMLDivElement>(null);
  const seen = useInView(frameRef, { rootMargin: '0px 0px -8% 0px' });
  const reduced = useReducedMotion();
  const [contours, setContours] = useState<ContourSet | null>(null);
  // The print's own contours (interaction/photoContours.ts): measured once it is
  // near the screen, in idle time, from the image the browser chose.
  useEffect(() => {
    if (!seen || reduced || contours) return;
    const img = frameRef.current?.querySelector('img');
    let cancelled = false;
    const run = () => {
      const src = img?.currentSrc || img?.src;
      if (src) void photoContours(src).then((c) => !cancelled && setContours(c));
    };
    const idle = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 200));
    const id = idle(run);
    return () => {
      cancelled = true;
      (window.cancelIdleCallback ?? window.clearTimeout)(id as number);
    };
  }, [seen, reduced, contours]);
  // While on screen, the print feels the scroll: it lags a little inside its
  // frame in the direction of travel, and settles when the page does.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || reduced) return;
    let unbind: (() => void) | null = null;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !unbind) unbind = bindVelocity(frame);
      else if (!e.isIntersecting && unbind) {
        unbind();
        unbind = null;
        frame.style.removeProperty('--atlas-velocity');
      }
    });
    io.observe(frame);
    return () => {
      io.disconnect();
      unbind?.();
    };
  }, [reduced]);
  // The shutter's edges run like ink as the print opens (interaction/ink.ts).
  useInkBleed(frameRef, Boolean(shutter && seen));
  // A print still on its way develops in the frame (a graticule, then the photograph fades up)
  // instead of leaving an empty dark box. A photograph already decoded is shown as it is.
  useEffect(() => {
    const frame = frameRef.current;
    const img = frame?.querySelector('img');
    if (!frame || !img || (img.complete && img.naturalWidth > 0)) return;
    frame.dataset.developing = '';
    const done = () => delete frame.dataset.developing;
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
    return () => {
      img.removeEventListener('load', done);
      img.removeEventListener('error', done);
    };
  }, []);
  if (!photo) return null;
  return (
    // `data-depth`: the interaction engine eases --dx/--dy/--dh on the frame;
    // the photograph drifts inside it, a light crosses it and crop marks close in.
    <div ref={frameRef} className={cn('photo-frame', shutter && 'photo-shutter', shutter && seen && 'is-open', className)} data-depth>
      <img
        ref={imgRef}
        src={photo.src}
        srcSet={photo.srcSet}
        sizes={sizes}
        width={photo.width}
        height={photo.height}
        alt={species.image.alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className="photo-img"
      />
      {contours && (
        <svg
          className="photo-contours"
          viewBox={`0 0 ${contours.w} ${contours.h}`}
          preserveAspectRatio={className?.includes('sw-photo') ? 'xMidYMax meet' : 'xMidYMid slice'}
          aria-hidden="true"
        >
          {contours.paths.map((d, i) => (
            <path key={i} d={d} style={{ ['--k' as string]: i }} />
          ))}
        </svg>
      )}
      <span className="photo-grain" aria-hidden="true" />
      <span className="photo-marks" aria-hidden="true" />
      {shutter && <span className="photo-shutter-line" aria-hidden="true" />}
      {expand && (
        // PHOTOGRAPH → CINEMA: the print itself lifts out of the page and comes back to it.
        <button
          type="button"
          className="photo-expand"
          aria-label={`View the photograph of the ${species.commonName} full screen`}
          data-cursor="Discover"
          onClick={(e) => {
            const img = frameRef.current?.querySelector('img') ?? null;
            openMedia(
              {
                kind: 'image',
                src: photo.src,
                srcSet: photo.srcSet,
                alt: species.image.alt,
                width: photo.width ?? img?.naturalWidth ?? 1400,
                height: photo.height ?? img?.naturalHeight ?? 933,
                caption: <PhotoCredit species={species} />,
              },
              img,
              e.currentTarget,
            );
          }}
        />
      )}
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

    let last: Phase | null = null;
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
          const next = p < 0.2 ? null : p < 0.48 ? 'range' : p < 0.72 ? 'threats' : 'conservation';
          // Only reach React when the phase changes, not on every scrubbed frame.
          if (next !== last) setPhase((last = next));
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
      data-trail
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
                <p className="max-w-md font-serif text-lede font-light text-canvas/85">{species.summary}</p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-4">
              <nav aria-label={`${species.commonName}: map layers`} className="phase-nav">
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
              <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                <Magnetic>
                  <Link to={`/species/${species.id}`} className="text-link whitespace-nowrap" data-cursor="Enter" data-geo={`${species.distributionPoints[0].lng},${species.distributionPoints[0].lat}`} data-geo-kind="link">
                    The {species.commonName}&rsquo;s page
                  </Link>
                </Magnetic>
                <button type="button" className="text-link whitespace-nowrap text-canvas/60" onClick={() => open(species.id)} data-cursor="Discover" data-magnetic="0.22">
                  Quick profile
                </button>
              </div>
            </div>
          </div>

          <div className="relative col-span-7">
            <div ref={mapWrapRef} className="invisible absolute inset-0">
              <SpeciesMap
                ref={mapRef}
                species={species}
                highlightThreat={hlThreat}
                highlightSites={hlSites}
                className="h-full w-full"
                align="left"
                legendPhase={phase ?? 'range'}
              />
            </div>
            <div ref={photoRef} className="photo-stage absolute inset-0 origin-top-right" style={{ clipPath: 'inset(18% 0% 18% 30%)' }}>
              <Photo species={species} className="h-full w-full" imgRef={imgRef} sizes="58vw" />
            </div>
            <PhotoCredit species={species} className="absolute -bottom-7 right-0 text-right" />
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
  const mapSeen = useInView(mapRef, { rootMargin: '0px 0px -25% 0px' });
  const { open } = useSpeciesProfile();

  // The map waits, blank but for the country, until it is properly on screen;
  // then the range comes in and the thread is drawn by its nib, as it is in
  // the pinned scene. With reduced motion everything is simply there.
  useEffect(() => {
    if (!mapSeen && !reduced) {
      setVars(mapRef.current, { range: 0, threat: 0, cons: 0, zoom: 1 }, false);
      return;
    }
    setVars(mapRef.current, PHASE_VARS[phase], !reduced);
  }, [phase, reduced, mapSeen]);

  return (
    <section className="species-scene relative px-4 py-20 sm:px-8 sm:py-28" aria-labelledby={`scene-${species.id}`}>
      <div className="mx-auto max-w-3xl">
        <div id={`scene-${species.id}`}>
          <Header species={species} index={index} total={total} />
        </div>
        <Reveal className="mt-10" direction="up">
          <Photo species={species} className="aspect-[4/3] w-full" sizes="(min-width: 800px) 768px, calc(100vw - 2rem)" shutter />
          <PhotoCredit species={species} className="mt-2" />
        </Reveal>
        <p className="mt-10 font-serif text-lede font-light text-canvas/85">{species.summary}</p>

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
          {/* Never taller than the screen: on a landscape tablet the whole map stays in view. */}
          <div className="mx-auto mt-4" style={{ width: 'min(100%, calc(78svh * 1000 / 1105))' }}>
            <SpeciesMap ref={mapRef} species={species} highlightThreat={hlThreat} highlightSites={hlSites} className="aspect-[1000/1105] w-full" showLegend={false} />
          </div>
          <p className="mt-3 text-label leading-snug text-canvas/62">
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
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            <Link to={`/species/${species.id}`} className="text-link">
              The {species.commonName}&rsquo;s page
            </Link>
            <button type="button" className="text-link text-canvas/60" onClick={() => open(species.id)}>
              Quick profile
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
