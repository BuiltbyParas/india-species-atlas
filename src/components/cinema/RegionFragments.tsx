import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Region, Species } from '../../types';
import { REGIONS } from '../../data/regions';
import { SPECIES } from '../../data/species';
import { STATUS_INFO } from '../../data/statusInfo';
import { MAP_VIEWBOX, project, useIndiaGeo, type IndiaGeo } from '../../geo/india';
import { gsap } from '../../motion/gsap';
import { scrollToTarget } from '../../motion/SmoothScroll';
import { useReducedMotion, useWideLayout } from '../../motion/preferences';
import { useInView } from '../../motion/useInView';
import { STATUS_HEX } from '../../theme';
import { GEOJSON_STATE_ALIASES } from '../../utils/stateCounts';
import { cn } from '../../utils/cn';
import { useShadedRelief, type ShadedRelief } from '../home/useShadedRelief';
import { useSpeciesProfile } from '../species/SpeciesProfileProvider';
import { FocusText } from './FocusText';

/**
 * The map, in fragments: the end of Chapter 01. The descent has come down over the whole country; here the sheet
 * comes apart along the atlas' eight regions and they pass, one after another, as the page scrolls — each piece
 * lifted out of the sheet as it reaches the middle of the frame, its ground the same ETOPO 2022 relief the opening
 * stood on, its marks the indicative localities of the species the atlas records there. At the end the pieces are
 * back in place and the sheet is whole, and below it the working map takes over (WorkingMapSection).
 *
 * What is drawn claims no more than the record holds. A region is the atlas' own coarse grouping (data/regions.ts),
 * not a biogeographic boundary, so each fragment is cut along the region's key states — real boundaries, named as
 * such — rather than along a drawn edge. The species are those the dataset assigns to the region; the marks are their
 * recorded localities that fall inside the cut. No coordinate is printed here at all.
 *
 * Desktop with motion: one sticky frame, and the vertical scroll moves a single track sideways (ScrollTrigger scrub;
 * the wheel is never taken over). Values are written only on the few elements that read them, never on the section.
 * Narrow or reduced motion: the same fragments, stacked, read straight down.
 */

const RANK: Record<string, number> = { CR: 0, EN: 1, VU: 2 };
const LOCALITY_COUNT = SPECIES.reduce((n, s) => n + s.distributionPoints.length, 0);

interface Fragment {
  region: Region;
  /** The region's key states, as the boundary file names them. */
  states: string[];
  species: Species[];
}

const FRAGMENTS: Fragment[] = REGIONS.map((region) => ({
  region,
  states: [...new Set(region.keyStates.map((n) => GEOJSON_STATE_ALIASES[n] ?? n))],
  species: SPECIES.filter((s) => s.regions.includes(region.id)).sort(
    (a, b) => (RANK[a.status] ?? 9) - (RANK[b.status] ?? 9) || a.commonName.localeCompare(b.commonName),
  ),
}));

const pad2 = (n: number) => String(n).padStart(2, '0');
const listNames = (names: string[]) =>
  names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

/** The fragment's frame on the sheet: its states' extent, padded so the cut keeps a margin of the country around it. */
function frameOf(geo: IndiaGeo, states: string[]): { view: string; side: number } {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const name of states) {
    const st = geo.byName.get(name);
    if (!st) continue;
    x0 = Math.min(x0, st.bounds[0]);
    y0 = Math.min(y0, st.bounds[1]);
    x1 = Math.max(x1, st.bounds[2]);
    y1 = Math.max(y1, st.bounds[3]);
  }
  if (!Number.isFinite(x0)) return { view: MAP_VIEWBOX, side: 1000 };
  const pad = Math.max(x1 - x0, y1 - y0) * 0.16 + 24;
  // Square, so every fragment is drawn at a scale the eye can compare from one to the next.
  const side = Math.max(x1 - x0, y1 - y0) + pad * 2;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  return { view: `${(cx - side / 2).toFixed(1)} ${(cy - side / 2).toFixed(1)} ${side.toFixed(1)} ${side.toFixed(1)}`, side };
}

/**
 * Recorded localities inside the cut. Sea records are attached to the nearest coastal cut when they fall within
 * half a degree; this keeps every Dugong locality visible in the Coastal & Marine panel.
 */
function marksOf(geo: IndiaGeo, f: Fragment) {
  if (typeof Path2D === 'undefined' || typeof document === 'undefined') return [];
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return [];
  const paths = f.states.map((n) => geo.byName.get(n)).filter(Boolean).map((st) => new Path2D(st!.d));
  const land = new Path2D(geo.all);
  const [ax] = project(80, 20);
  const [bx] = project(80.5, 20);
  ctx.lineWidth = 2 * Math.abs(bx - ax);
  const offshore = (x: number, y: number) => !ctx.isPointInPath(land, x, y) && paths.some((path) => ctx.isPointInStroke(path, x, y));
  return f.species.flatMap((s) =>
    s.distributionPoints
      .map((p) => {
        const [x, y] = project(p.lng, p.lat);
        return { s, label: p.label, captive: p.captive, x, y };
      })
      .filter((m) => paths.some((path) => ctx.isPointInPath(path, m.x, m.y)) || offshore(m.x, m.y)),
  );
}

/** One fragment's drawing: the country faint around it, and the piece itself — relief, edges, marks — lifted out. */
function FragmentFigure({
  geo,
  f,
  shaded,
  hot,
}: {
  geo: IndiaGeo | null;
  f: Fragment;
  shaded: ShadedRelief | null;
  hot: string | null;
}) {
  const uid = useId().replace(/:/g, '');
  const { view, side } = useMemo(() => (geo ? frameOf(geo, f.states) : { view: MAP_VIEWBOX, side: 1000 }), [geo, f]);
  // A mark is the same size on the page whatever the fragment's scale.
  const r = side * 0.0105;
  const marks = useMemo(() => (geo ? marksOf(geo, f) : []), [geo, f]);
  const cut = geo ? f.states.map((n) => geo.byName.get(n)?.d ?? '').join('') : '';
  return (
    <div className="frag-figure" aria-hidden="true">
      <svg viewBox={view} className="frag-sheet" preserveAspectRatio="xMidYMid meet">
        {geo && <path d={geo.all} className="frag-sheet-land" />}
      </svg>
      <div className="frag-piece">
        <svg viewBox={view} preserveAspectRatio="xMidYMid meet">
          <defs>
            <clipPath id={`frag-cut-${uid}`}>
              <path d={cut} />
            </clipPath>
          </defs>
          <path d={cut} className="frag-piece-ground" />
          {shaded && (
            <image
              href={shaded.href}
              x={shaded.x}
              y={shaded.y}
              width={shaded.w}
              height={shaded.h}
              preserveAspectRatio="none"
              clipPath={`url(#frag-cut-${uid})`}
              className="frag-piece-relief"
            />
          )}
          <path d={cut} className="frag-piece-edge" />
          {marks.map((m, i) => (
            <circle
              key={i}
              cx={m.x}
              cy={m.y}
              r={hot === m.s.id ? r * 1.5 : r}
              className={cn('frag-mark', hot && hot !== m.s.id && 'is-back')}
              style={{ ['--c' as string]: STATUS_HEX[m.s.status] }}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

function FragmentText({
  f,
  index,
  near,
  onHot,
}: {
  f: Fragment;
  index: number;
  near: boolean;
  onHot: (id: string | null) => void;
}) {
  const { open } = useSpeciesProfile();
  const id = `frag-${f.region.id}`;
  return (
    <div className="frag-text">
      <p className="frag-k plate-label tabular-nums">
        <span className="plate-label-n">{pad2(index + 1)}</span>
        <span className="plate-label-rule" aria-hidden="true" />
        <span>
          Fragment {pad2(index + 1)} of {pad2(FRAGMENTS.length)}
        </span>
      </p>
      <h3 id={id} className="frag-name font-serif font-light">
        <FocusText text={f.region.name} play={near} />
      </h3>
      <p className="frag-blurb">{f.region.blurb}</p>
      <p className="frag-states">
        <span className="frag-states-k">Cut along</span> {listNames(f.region.keyStates)}
      </p>
      <p className="frag-count tabular-nums">
        <span className="frag-count-n font-serif font-light">{f.species.length}</span>
        <span>of {SPECIES.length} species recorded here</span>
      </p>
      <ul className="frag-species" aria-labelledby={id}>
        {f.species.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              className="frag-sp"
              onPointerEnter={() => onHot(s.id)}
              onPointerLeave={() => onHot(null)}
              onFocus={() => onHot(s.id)}
              onBlur={() => onHot(null)}
              onClick={() => open(s.id)}
              data-cursor="Profile"
              aria-label={`${s.commonName}, ${STATUS_INFO[s.status].name}: open its profile`}
            >
              <span className="frag-sp-dot" style={{ ['--c' as string]: STATUS_HEX[s.status] }} aria-hidden="true" />
              <span className="frag-sp-name">{s.commonName}</span>
              <span className="frag-sp-status tabular-nums">{s.status}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const NOTE =
  'The regions are the atlas’ own broad groupings, not biogeographic boundaries; each fragment is cut along the states the region names. A state can belong to two. Ground: ETOPO 2022 elevation (NOAA), heights ×20.';

export function RegionFragments() {
  const wide = useWideLayout();
  const reduced = useReducedMotion();
  const moving = wide && !reduced;
  const geo = useIndiaGeo();
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLSpanElement>(null);
  // The relief is shaded once for the eight pieces — a few tens of milliseconds on the main thread — and only once
  // the section is on screen: any sooner and it would land in the hero's descent, whose frame
  // governor would count it against the live relief. It fades in where it lands (.frag-piece-relief).
  const near = useInView(sectionRef, { rootMargin: '0px' });
  const shaded = useShadedRelief(near);
  /** The fragment nearest the middle of the frame (-1: the opening, FRAGMENTS.length: the end). */
  const [at, setAt] = useState(-1);
  const [hot, setHot] = useState<{ i: number; id: string } | null>(null);

  useEffect(() => {
    if (!moving) return;
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;
    const panels = [...track.querySelectorAll<HTMLElement>('[data-frag]')];
    const parts = panels.map((p) => ({
      piece: p.querySelector<HTMLElement>('.frag-piece'),
      sheet: p.querySelector<HTMLElement>('.frag-sheet'),
      text: p.querySelector<HTMLElement>('.frag-text'),
    }));
    let distance = 0;
    let centres: number[] = [];
    let width = 1;
    const measure = () => {
      distance = Math.max(0, track.scrollWidth - window.innerWidth);
      centres = panels.map((p) => p.offsetLeft + p.offsetWidth / 2);
      width = panels[0]?.offsetWidth || 1;
    };
    measure();
    const st = { p: 0 };
    let last = -2;
    const write = () => {
      const x = st.p * distance;
      track.style.transform = `translate3d(${(-x).toFixed(1)}px, 0, 0)`;
      const mid = x + window.innerWidth / 2;
      let best = -1;
      let bestD = Infinity;
      for (let i = 0; i < panels.length; i++) {
        // Where this fragment stands from the middle of the frame, in fragment widths: 0 is centred.
        const d = (centres[i] - mid) / width;
        const a = Math.abs(d);
        if (a < bestD) {
          bestD = a;
          best = i;
        }
        // Far off the frame nothing is written (each stays where it was left, unseen); it is never hidden, so the
        // keyboard can still reach its buttons (and bring it to the middle, below).
        if (a > 1.9) continue;
        const part = parts[i];
        // The piece lifts out of the sheet as it reaches the middle and settles back as it goes; the sheet behind it
        // lags (the far plane), the words lead (the near one).
        const t = Math.min(1, a);
        const lift = 1 - t * t * (3 - 2 * t);
        if (part.piece) part.piece.style.transform = `translate3d(${(d * -18).toFixed(1)}px, ${(-lift * 14).toFixed(1)}px, 0) rotate(${(d * -0.65).toFixed(2)}deg) scale(${(0.9 + lift * 0.1).toFixed(4)})`;
        if (part.sheet) part.sheet.style.transform = `translate3d(${(d * 46).toFixed(1)}px, 0, 0) scale(${(1.08 - lift * 0.08).toFixed(4)})`;
        if (part.text) {
          part.text.style.transform = `translate3d(${(d * -28).toFixed(1)}px, 0, 0)`;
          part.text.style.opacity = Math.max(0, 1 - Math.max(0, a - 0.3) * 1.6).toFixed(3);
        }
      }
      if (rulerRef.current) rulerRef.current.style.transform = `scaleX(${st.p.toFixed(4)})`;
      // The track opens on the whole sheet (panel 0) and ends on it again (the last panel): fragments are 1…8.
      const next = Math.min(FRAGMENTS.length, Math.max(-1, best - 1));
      if (next !== last) setAt((last = next));
    };
    write();
    const ctx = gsap.context(() => {
      gsap.to(st, {
        p: 1,
        ease: 'none',
        onUpdate: write,
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.5,
          invalidateOnRefresh: true,
          onRefresh: () => {
            measure();
            write();
          },
        },
      });
    }, section);
    // A key that moves focus into a fragment off the frame: scroll the page so that fragment comes to the middle,
    // instead of letting the browser scroll the clipped frame sideways.
    const onFocus = (e: FocusEvent) => {
      const panel = (e.target as HTMLElement).closest<HTMLElement>('[data-frag]');
      if (!panel || !distance) return;
      const i = panels.indexOf(panel);
      const p = Math.min(1, Math.max(0, (centres[i] - window.innerWidth / 2) / distance));
      const top = section.getBoundingClientRect().top + window.scrollY;
      const run = section.offsetHeight - window.innerHeight;
      if (Math.abs(p - st.p) > 0.02) scrollToTarget(top + p * run);
    };
    track.addEventListener('focusin', onFocus);
    return () => {
      track.removeEventListener('focusin', onFocus);
      ctx.revert();
      track.style.transform = '';
      for (let i = 0; i < panels.length; i++) {
        const part = parts[i];
        for (const el of [part.piece, part.sheet, part.text]) {
          el?.style.removeProperty('transform');
          el?.style.removeProperty('opacity');
        }
      }
    };
  }, [moving]);

  const current = at >= 0 && at < FRAGMENTS.length ? FRAGMENTS[at] : null;

  return (
    <section
      ref={sectionRef}
      id="fragments"
      data-env="atlas"
      aria-labelledby="fragments-title"
      className={cn('frags', moving ? 'is-moving' : 'is-stacked')}
    >
      <div className="frags-frame">
        <div ref={trackRef} className="frags-track">
          <div className="frags-intro" data-frag="intro">
            <div className="frags-intro-text">
              <p className="plate-label tabular-nums">
                <span className="plate-label-n">01</span>
                <span className="plate-label-rule" aria-hidden="true" />
                <span>The map, in fragments</span>
              </p>
              <h2 id="fragments-title" className="frags-title font-serif font-light">
                <FocusText text="Eight ecological" className="block" />
                <FocusText text="regions." from={2} className="block" />
              </h2>
              <p className="frags-lead">
                Scroll through the atlas’ {REGIONS.length} regions. Each ground carries the species recorded there and
                the places named for them.
              </p>
              {moving && (
                <p className="frags-cue" aria-hidden="true">
                  <span className="frags-cue-line" />
                  Scroll to travel across the regions
                </p>
              )}
            </div>
          </div>

          {FRAGMENTS.map((f, i) => (
            <article
              key={f.region.id}
              className={cn('frag', at === i && 'is-at', hot?.i === i && 'is-hot')}
              data-frag={f.region.id}
              aria-labelledby={`frag-${f.region.id}`}
              style={{
                ['--frag-grade' as string]: hot?.i === i
                  ? STATUS_HEX[f.species.find((s) => s.id === hot.id)?.status ?? 'VU']
                  : undefined,
              }}
            >
              <FragmentFigure geo={geo} f={f} shaded={shaded} hot={hot?.i === i ? hot.id : null} />
              <FragmentText
                f={f}
                index={i}
                near={!moving || at >= i - 1}
                onHot={(id) => setHot(id ? { i, id } : null)}
              />
            </article>
          ))}

          <div className="frags-outro" data-frag="whole">
            <div className="frags-outro-text">
              <p className="plate-label tabular-nums">
                <span className="plate-label-n">01</span>
                <span className="plate-label-rule" aria-hidden="true" />
                <span>The atlas, continued</span>
              </p>
              <p className="frags-outro-line font-serif font-light">
                <FocusText text={`${LOCALITY_COUNT} places, ${SPECIES.length} species.`} play={moving ? at >= FRAGMENTS.length - 1 : undefined} />
              </p>
              <p className="frags-lead">
                The full map keeps every recorded place in view, with search, filters and state selection.
              </p>
              <a href="/atlas" className="text-link frags-down" data-cursor="Open">
                Open the interactive map <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>

        {moving && (
          <div className="frags-foot" aria-hidden="true">
            <p className="frags-now tabular-nums">
              {current ? (
                <>
                  <span>{pad2(at + 1)}</span> / {pad2(FRAGMENTS.length)} · {current.region.name}
                </>
              ) : at < 0 ? (
                <>
                  <span>00</span> / {pad2(FRAGMENTS.length)} · The regions ahead
                </>
              ) : (
                <>
                  <span>{pad2(FRAGMENTS.length)}</span> / {pad2(FRAGMENTS.length)} · Journey complete
                </>
              )}
            </p>
            <span className="frags-ruler">
              <span ref={rulerRef} className="frags-ruler-fill" />
            </span>
            <p className="frags-note">{NOTE}</p>
          </div>
        )}
      </div>
      {!moving && <p className="frags-note frags-note-stacked">{NOTE}</p>}
    </section>
  );
}
