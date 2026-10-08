import { useEffect, useMemo, useRef, useState } from 'react';
import type { Species } from '../../types';
import { formatDeg, project, useIndiaGeo } from '../../geo/india';
import { GeoLine } from '../../geo/line/GeoLine';
import { gsap, ScrollTrigger } from '../../motion/gsap';
import { useReducedMotion, useWideLayout } from '../../motion/preferences';
import { GEOJSON_STATE_ALIASES } from '../../utils/stateCounts';
import { cn } from '../../utils/cn';
import { useInView } from '../../motion/useInView';
import { Photo } from './SpeciesScene';
import { StatusIndicator } from './StatusIndicator';

/**
 * The signature transition: the Great Indian Bustard's way in.
 *
 * Four beats, scrubbed by scroll on a wide screen:
 *
 *   1  the states the bird is recorded in draw in, and the anchor locality is
 *      ringed with its coordinates — the place the hero's descent ended;
 *   2  a transmission line is drawn across the Thar, pylon by pylon;
 *   3  the line opens like a shutter into the photograph of the grassland
 *      and the birds standing in it;
 *   4  the status lands, with the record's own sentence about what kills
 *      them, and the first thing being done about it.
 *
 * The threat is recorded in the dataset ("power-line collisions", with the
 * sentence quoted here); the line's route is not. So the line is drawn as a
 * diagram — straight, with evenly spaced pylons — and says on it that it is
 * schematic and not a mapped alignment. Everything else is from the record.
 *
 * Shown only for a species whose record lists power-line collisions. On a
 * phone, and with reduced motion, it is a still: the same map, line and
 * caption, composed for the narrow screen, with nothing pinned.
 */
export function BustardPrologue({ species }: { species: Species }) {
  const wide = useWideLayout();
  const reduced = useReducedMotion();
  if (!species.majorThreats.includes('power-lines')) return null;
  return wide && !reduced ? <Pinned species={species} /> : <Still species={species} />;
}

/** The sentence the record gives for the threat: its first sentence, verbatim. */
function threatSentence(species: Species) {
  return species.threatNote.split(/(?<=\.)\s/)[0];
}

/** The first conservation action the record lists that answers the power lines. */
function lineAction(species: Species) {
  return species.conservationActions.find((a) => /power line/i.test(a));
}

/**
 * The drawing: the states of record, the anchor ring and the schematic line,
 * framed so the line runs across the exact middle of the box (the shutter
 * opens from it).
 */
function useDrawing(species: Species) {
  const geo = useIndiaGeo();
  return useMemo(() => {
    if (!geo) return null;
    const names = [...new Set(species.states.map((s) => GEOJSON_STATE_ALIASES[s] ?? s))];
    const states = names.map((n) => geo.byName.get(n)).filter((s): s is NonNullable<typeof s> => Boolean(s));
    if (!states.length) return null;
    const minX = Math.min(...states.map((s) => s.bounds[0]));
    const maxX = Math.max(...states.map((s) => s.bounds[2]));
    const anchor = species.distributionPoints[0];
    const [ax, ay] = project(anchor.lng, anchor.lat);
    // The schematic: straight, a little north of the anchor, starting just
    // inside the western border and running east across the Thar — so it reads
    // as a diagram of "lines cross this ground", not as a particular line, and
    // never strays over the international boundary.
    const lineY = ay - 22;
    const x0 = ax - 22;
    const x1 = ax + 190;
    const pylons = Array.from({ length: 9 }, (_, i) => ({ x: x0 + ((i + 0.5) / 9) * (x1 - x0), k: (i + 0.5) / 9 }));
    // Frame the states of record tightly; the shutter finds the line on screen.
    const minY = Math.min(...states.map((s) => s.bounds[1]));
    const maxY = Math.max(...states.map((s) => s.bounds[3]));
    const pad = 24;
    return {
      viewBox: `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`,
      d: states.map((s) => s.d).join(''),
      anchor: [ax, ay] as const,
      line: `M${x0.toFixed(1)} ${lineY.toFixed(1)}H${x1.toFixed(1)}`,
      lineY,
      pylons,
      labelX: (x0 + x1) / 2,
    };
  }, [geo, species]);
}

function Drawing({ species, className }: { species: Species; className?: string }) {
  const drawing = useDrawing(species);
  if (!drawing) return <div className={className} />;
  const anchor = species.distributionPoints[0];
  return (
    <svg viewBox={drawing.viewBox} preserveAspectRatio="xMidYMid meet" className={cn('bp-map', className)} aria-hidden="true">
      <GeoLine d={drawing.d} role="survey" draw="var(--p0)" className="bp-states" />
      <g className="bp-anchor">
        <circle cx={drawing.anchor[0]} cy={drawing.anchor[1]} r="5" className="bp-anchor-dot" />
        <circle cx={drawing.anchor[0]} cy={drawing.anchor[1]} r="13" className="bp-anchor-ring" />
        <text x={drawing.anchor[0] + 20} y={drawing.anchor[1] + 26} className="bp-anchor-label">
          {anchor.label.split(',')[0]} · {formatDeg(anchor.lat, 'lat')} {formatDeg(anchor.lng, 'lng')}
        </text>
      </g>
      <g className="bp-pylons">
        {drawing.pylons.map((p) => (
          <path
            key={p.x}
            d={`M${p.x - 7} ${drawing.lineY - 9}H${p.x + 7}M${p.x} ${drawing.lineY - 9}V${drawing.lineY + 14}`}
            style={{ ['--k' as string]: p.k }}
          />
        ))}
      </g>
      <GeoLine
        d={drawing.line}
        role="schematic"
        draw="var(--p1)"
        nib={4}
        className="bp-line"
        label={{ text: 'Schematic — not a mapped alignment', at: 0.5, size: 6.5, dy: -14 }}
      />
    </svg>
  );
}

function Pinned({ species }: { species: Species }) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const colRef = useRef<HTMLDivElement>(null);
  const shutterRef = useRef<HTMLDivElement>(null);

  // The shutter opens from wherever the line falls in the column, measured
  // rather than assumed, since the map is letterboxed into the column.
  useEffect(() => {
    const col = colRef.current;
    const shutter = shutterRef.current;
    if (!col || !shutter) return;
    const place = () => {
      const line = col.querySelector('.bp-line .gl-path');
      if (!line) return;
      const c = col.getBoundingClientRect();
      const l = line.getBoundingClientRect();
      const ly = ((l.top + l.height / 2 - c.top) / Math.max(c.height, 1)) * 100;
      shutter.style.setProperty('--ly', `${Math.min(95, Math.max(5, ly)).toFixed(2)}%`);
    };
    const ro = new ResizeObserver(place);
    ro.observe(col);
    const t = setTimeout(place, 300);
    return () => {
      ro.disconnect();
      clearTimeout(t);
    };
  }, []);
  const [beat, setBeat] = useState(0);
  const status = species.statusFullName;
  const anchor = species.distributionPoints[0];

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;
    let last = -1;
    const ctx = gsap.context(() => {
      gsap.set(stage, { '--p0': 0, '--p1': 0, '--p2': 0, '--p3': 0 });
      const tl = gsap.timeline({ defaults: { ease: 'none' } });
      tl.to(stage, { '--p0': 1, duration: 0.22, ease: 'power1.inOut' }, 0.02);
      tl.to(stage, { '--p1': 1, duration: 0.28 }, 0.26);
      tl.to(stage, { '--p2': 1, duration: 0.2, ease: 'power2.inOut' }, 0.6);
      tl.to(stage, { '--p3': 1, duration: 0.12 }, 0.82);
      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.6,
        animation: tl,
        onUpdate: (self) => {
          const p = self.progress;
          const next = p < 0.25 ? 0 : p < 0.58 ? 1 : p < 0.8 ? 2 : 3;
          if (next !== last) setBeat((last = next));
        },
      });
    }, section);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} data-trail data-env="thar" className="bustard-prologue relative h-[320vh]" aria-label={`${species.commonName}: the way in`}>
      <div ref={stageRef} className="sticky top-0 h-[100svh] overflow-hidden">
        <div className="mx-auto grid h-full max-w-[1600px] grid-cols-12 gap-x-8 px-12 pb-10 pt-28">
          <div className="relative col-span-5">
            <Beat on={beat === 0}>
              <p className="eyebrow">The Thar · {species.states.join(' and ')}</p>
              <p className="mt-6 font-serif text-headline font-light text-canvas">Where the line starts.</p>
              <p className="mt-6 max-w-md text-body text-canvas/65">
                {anchor.label.split(',')[0]}, {formatDeg(anchor.lat, 'lat')} {formatDeg(anchor.lng, 'lng')} — the anchor
                locality the descent came down over. {species.habitatNote}
              </p>
            </Beat>
            <Beat on={beat === 1}>
              <p className="eyebrow">What cuts through it</p>
              <p className="mt-6 font-serif text-headline font-light text-canvas">A line across open ground.</p>
              <p className="mt-6 max-w-md font-serif text-lede font-light text-canvas/85">{threatSentence(species)}</p>
              <p className="mt-4 max-w-md text-label text-canvas/45">
                The line on the map is schematic. The dataset records the threat for the species, not the route of any
                line.
              </p>
            </Beat>
            <Beat on={beat === 2}>
              <p className="eyebrow">Open ground</p>
              <p className="mt-6 font-serif text-headline font-light text-canvas">A bird that needs to see far.</p>
              <p className="mt-6 max-w-md text-body text-canvas/65">{species.summary}</p>
            </Beat>
            <Beat on={beat === 3}>
              <p className="eyebrow">Status</p>
              <StatusIndicator status={species.status} className="mt-6" />
              <p className="mt-6 font-serif text-headline font-light" style={{ color: 'var(--color-status-cr)' }}>
                {status}.
              </p>
              {lineAction(species) && (
                <p className="mt-6 max-w-md text-body text-canvas/70">
                  <span className="text-canvas/45">Being done: </span>
                  {lineAction(species)}.
                </p>
              )}
            </Beat>
          </div>
          <div ref={colRef} className="relative col-span-7">
            <Drawing species={species} className="absolute inset-0 h-full w-full" />
            <div ref={shutterRef} className="bp-shutter absolute inset-0">
              <Photo species={species} className="h-full w-full" sizes="58vw" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Beat({ on, children }: { on: boolean; children: React.ReactNode }) {
  return <div className={cn('phase-panel', on && 'is-current')}>{children}</div>;
}

function Still({ species }: { species: Species }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref, { rootMargin: '0px 0px -30% 0px' });
  return (
    <section
      ref={ref}
      className={cn('bustard-prologue is-still px-4 pt-20 sm:px-8 sm:pt-28', !reduced && 'is-animated', seen && 'is-seen')}
      aria-label={`${species.commonName}: the way in`}
    >
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">The Thar · what cuts through it</p>
        <p className="mt-5 font-serif text-headline font-light text-canvas">A line across open ground.</p>
        <Drawing species={species} className="mt-6 aspect-[4/3] w-full" />
        <p className="mt-6 font-serif text-lede font-light text-canvas/85">{threatSentence(species)}</p>
        <p className="mt-3 text-label text-canvas/45">
          The line on the map is schematic: the dataset records the threat for the species, not the route of any line.
        </p>
      </div>
    </section>
  );
}
