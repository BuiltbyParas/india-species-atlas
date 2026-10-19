import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SPECIES } from '../../data/species';
import { formatDeg, MAP_HEIGHT, MAP_VIEWBOX, project, useIndiaGeo } from '../../geo/india';
import { GeoLine } from '../../geo/line/GeoLine';
import { bowedLeg } from '../../geo/line/paths';
import { useChapter } from '../../motion/chapters';
import { gsap } from '../../motion/gsap';
import { useReducedMotion, useWideLayout } from '../../motion/preferences';
import { useInView } from '../../motion/useInView';
import { cn } from '../../utils/cn';
import { canRender3D } from '../../utils/canRender3D';
import { Magnetic } from './Magnetic';
import { FilmEntry } from './FilmEntry';
import { PlateFrame } from './PlateFrame';
import { useShadedRelief } from '../home/useShadedRelief';
import { RELIEF_EXAGGERATION } from '../home/heroRelief';
import { ATLAS_CENTRE } from '../home/atlasData';
import { onAtlasMarks, setAtlas, useAtlasLive } from '../home/atlasWorld';

/**
 * CHAPTER 05 — WHAT REMAINS: the return to India, composed as the plate the
 * page opened on.
 *
 * The opening frames the relief in a neatline and hangs the atlas's name on
 * the Tropic of Cancer. The close does the same on the same relief. With the
 * atlas world live (atlasWorld.ts) it is literally the same scene: the camera
 * climbs out of Chapter 04's statement back to the opening's view — north up,
 * looking down — while every species' line is drawn from its anchor locality
 * to one drawing point in the middle of the country, the parallel is drawn
 * across the plate again, and the name rides it. The chapter holds still for
 * that (its frame is pinned for a screen); as the colophon arrives the lamp
 * lowers and the relief sinks into the slate the colophon is printed on.
 *
 * Without the world (no WebGL, reduced motion, a narrow screen, or after the
 * scene gave up) it is the same composition drawn as a sheet: the shaded
 * elevation, the outline, the lines, and the map moved the small distance that
 * puts its parallel on the name's baseline.
 *
 * The point the lines meet is a drawing device, not a place with a claim on
 * it, so it is labelled with nothing but its coordinates.
 */
const [CENTRE_LNG, CENTRE_LAT] = ATLAS_CENTRE;
const CENTRE = project(CENTRE_LNG, CENTRE_LAT);
/** The same parallel the opening hangs its title on (CinematicHero). */
const TROPIC_LAT = 23.436;
const TROPIC_FRACTION = project(80, TROPIC_LAT)[1] / MAP_HEIGHT;

/**
 * The sheet version: keeps the map's Tropic of Cancer on the line the name is
 * set on. The name's baseline is measured (a zero-height span), the map is
 * moved the small distance that puts its parallel there, and the plate's line
 * is drawn at the same height. Re-measured when anything changes size.
 */
function useTropicLine(
  enabled: boolean,
  section: React.RefObject<HTMLElement | null>,
  baseline: React.RefObject<HTMLElement | null>,
  map: React.RefObject<SVGSVGElement | null>,
) {
  useEffect(() => {
    const s = section.current;
    const b = baseline.current;
    const m = map.current;
    if (!enabled || !s || !b || !m) return;
    const measure = () => {
      const sr = s.getBoundingClientRect();
      // The name may still be below its mask (or rising): measure where it will rest, not where it is.
      const lift = b.parentElement ? new DOMMatrixReadOnly(getComputedStyle(b.parentElement).transform).m42 : 0;
      const y = b.getBoundingClientRect().top - lift - sr.top;
      const shift = parseFloat(s.style.getPropertyValue('--map-shift')) || 0;
      const mr = m.getBoundingClientRect();
      const tropic = mr.top - shift - sr.top + mr.height * TROPIC_FRACTION;
      s.style.setProperty('--tropic-y', `${y.toFixed(1)}px`);
      s.style.setProperty('--map-shift', `${(window.innerWidth >= 1024 ? y - tropic : 0).toFixed(1)}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(s);
    ro.observe(m);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [enabled, section, baseline, map]);
}

/**
 * The world version: the relief reports where its Tropic crosses the frame
 * (heroScene `onWorldMarks`), and the name is moved onto it — the reverse of
 * the sheet version, since the world cannot be moved for the type. The frame
 * is pinned while this holds, so frame and screen coordinates agree.
 */
function useWorldTropic(enabled: boolean, frame: React.RefObject<HTMLElement | null>, baseline: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const f = frame.current;
    const b = baseline.current;
    if (!enabled || !f || !b) return;
    let rest = NaN;
    const measureRest = () => {
      // Where the baseline sits with no shift applied (transforms ignored: offsets up to the frame).
      let y = 0;
      let el: HTMLElement | null = b;
      while (el && el !== f) {
        y += el.offsetTop;
        el = el.offsetParent as HTMLElement | null;
      }
      rest = y;
    };
    measureRest();
    const ro = new ResizeObserver(measureRest);
    ro.observe(f);
    document.fonts?.ready.then(measureRest);
    const off = onAtlasMarks((marks) => {
      if (!marks || Number.isNaN(rest)) {
        f.dataset.tropic = 'off';
        return;
      }
      f.dataset.tropic = 'on';
      f.style.setProperty('--tropic-y', `${marks.tropicY.toFixed(1)}px`);
      // Never further than a quarter of the screen: past that the camera is still climbing and the name waits.
      const shift = Math.max(-0.25 * f.clientHeight, Math.min(0.25 * f.clientHeight, marks.tropicY - rest));
      f.style.setProperty('--copy-shift', `${shift.toFixed(1)}px`);
    });
    return () => {
      off();
      ro.disconnect();
    };
  }, [enabled, frame, baseline]);
}

const CODA = ['Mapping what remains.', 'Understanding what is at risk.', 'Protecting what can still be saved.'];

export function FinalChapter() {
  const ref = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const baselineRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const codaRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<SVGSVGElement>(null);
  const live = useAtlasLive();
  const wide = useWideLayout();
  const reduced = useReducedMotion();
  const world = live && wide && !reduced;
  // Laid out for the world from the first paint wherever the world is expected, and kept so if it is given up
  // under load: the sheet version is shown in the same pinned frame, so the page never changes length beneath the
  // reader (it grew by 810 px when the world arrived, and shrank by as much when it went).
  const [expectWorld] = useState(canRender3D);
  const tall = world || (expectWorld && wide && !reduced);
  const geo = useIndiaGeo();
  const seen = useInView(frameRef, { rootMargin: '0px 0px -30% 0px' });
  // The sheet version stands on the opening's own shaded elevation, loaded a screen ahead.
  const near = useInView(ref, { rootMargin: '0px 0px 120% 0px' });
  const shaded = useShadedRelief(near && !world);
  useChapter(ref, { index: 5, title: 'What remains' });
  useTropicLine(!world, ref, baselineRef, mapRef);
  useWorldTropic(world, frameRef, baselineRef);

  // The act's last two values: the climb back to the opening's plate, and the colophon's arrival.
  useEffect(() => {
    const section = ref.current;
    if (!world || !section) return;
    const st = { remain: 0, sink: 0 };
    const title = titleRef.current;
    const coda = codaRef.current;
    let lastMeet = '';
    let lastResolve = '';
    const write = () => {
      setAtlas({ remain: st.remain, sink: st.sink });
      section.style.setProperty('--sink', st.sink.toFixed(4));
      // The opening, reversed: the name the camera went down through comes back together as it climbs out — the outer
      // words in from the sides, the italic down from past the camera onto the parallel. Written on the title alone.
      const t = Math.min(1, Math.max(0, (st.remain - 0.2) / 0.62));
      const meet = (t * t * (3 - 2 * t)).toFixed(4);
      if (title && meet !== lastMeet) title.style.setProperty('--meet', (lastMeet = meet));
      // Then the coda resolves under it, a line at a time, as the name settles: the journey's last words come into
      // focus once its name is whole. Written on the coda alone.
      const r = Math.min(1, Math.max(0, (st.remain - 0.55) / 0.4));
      const resolve = (r * r * (3 - 2 * r)).toFixed(3);
      if (coda && resolve !== lastResolve) coda.style.setProperty('--resolve', (lastResolve = resolve));
    };
    const footer = document.querySelector<HTMLElement>('.site-footer');
    const ctx = gsap.context(() => {
      gsap.to(st, {
        remain: 1,
        ease: 'none',
        onUpdate: write,
        scrollTrigger: { trigger: section, start: 'top 90%', end: 'top -45%', scrub: 0.6 },
      });
      if (footer)
        gsap.to(st, {
          sink: 1,
          ease: 'none',
          onUpdate: write,
          scrollTrigger: { trigger: footer, start: 'top bottom', end: 'bottom bottom', scrub: 0.6 },
        });
    }, section);
    write();
    return () => {
      ctx.revert();
      title?.style.removeProperty('--meet');
      coda?.style.removeProperty('--resolve');
    };
  }, [world]);

  const converge = SPECIES.map((s) => {
    const a = project(s.distributionPoints[0].lng, s.distributionPoints[0].lat);
    return { id: s.id, d: bowedLeg(a, CENTRE, 0.18), a };
  });

  const note = world ? (
    <span>Ground: ETOPO 2022 elevation (NOAA), heights &times;{RELIEF_EXAGGERATION}</span>
  ) : shaded ? (
    <span>Ground: ETOPO 2022 elevation (NOAA), shaded</span>
  ) : undefined;

  return (
    // The opening's twin, in the same night: the relief the page began on, seen again from above (documentation/HOMEPAGE_DARK_JOURNEY.md).
    <section
      ref={ref}
      data-route-stop="5"
      data-trail
      data-env="slate"
      data-ground="slate"
      data-over-world={world ? 'true' : undefined}
      className={cn('final ground-grain mo relative', world ? 'is-world z-[2] h-[190svh]' : tall ? 'h-[190svh]' : 'overflow-hidden', seen && 'is-shown')}
      aria-labelledby="final-title"
    >
      <div ref={frameRef} className={cn('final-frame relative', tall && 'sticky top-0 h-[100svh] overflow-hidden')}>
        <PlateFrame shown={seen} note={note} />
        <div className="final-tropic" aria-hidden="true">
          <span className="final-tropic-line" />
          <span className="final-tropic-label">
            Tropic of Cancer <span className="tabular-nums">{formatDeg(TROPIC_LAT, 'lat')}</span>
          </span>
        </div>

        <div className="final-grid mx-auto grid min-h-[100svh] max-w-[1600px] gap-12 px-4 py-24 sm:px-8 lg:grid-cols-12 lg:gap-8 lg:px-12 lg:py-20">
          {/* Set from the foot of the plate, so the name falls near the middle, where the country's parallel is. */}
          <div className="final-copy relative self-end lg:col-span-6">
            <p className="plate-label mo-meta" style={{ ['--mo-d' as string]: '-200ms' }}>
              <span className="plate-label-n tabular-nums" aria-hidden="true">
                05
              </span>
              <span className="plate-label-rule" aria-hidden="true" />
              <span className="sr-only">Chapter 05, </span>
              What remains
            </p>
            <h2 ref={titleRef} id="final-title" className="final-title font-serif font-light">
              <span className="mo-line">
                <span>
                  <span className="fw fw-w">India</span> <span className="fw fw-c final-em">Species</span>{' '}
                  <span className="fw fw-e">Atlas</span>
                  <span ref={baselineRef} className="final-baseline" aria-hidden="true" />
                </span>
              </span>
            </h2>
            {/* Over the world, resolved by the climb once the name has met (`--resolve`); on the sheet, a line at a time on arrival. */}
            <div ref={codaRef} className="final-coda font-serif font-light">
              {CODA.map((line, k) => (
                <p key={line} className={cn('final-coda-line block', k === 0 ? 'text-canvas' : 'text-canvas/80')} style={{ ['--k' as string]: k }}>
                  {line}
                </p>
              ))}
            </div>
            <div className="final-actions">
              <div className="final-routes">
                <Magnetic>
                  <Link to="/atlas" className="cta" data-cursor="Enter">
                    <span data-magnetic-inner>Open the map</span>
                    <svg viewBox="0 0 40 10" aria-hidden="true" className="cta-line">
                      <path d="M0 5 C 12 1, 26 9, 40 5" />
                    </svg>
                  </Link>
                </Magnetic>
                <ul className="final-links mo-meta" style={{ ['--mo-d' as string]: '400ms' }}>
                  <li>
                    <Link to="/species" className="line-link">
                      Browse the species
                    </Link>
                  </li>
                  <li>
                    <Link to="/documentary" className="line-link">
                      Documentary mode
                    </Link>
                  </li>
                  <li>
                    <Link to="/sources" className="line-link">
                      Sources
                    </Link>
                  </li>
                </ul>
              </div>
              <FilmEntry className="final-film mo-meta" />
            </div>
          </div>

          <div className="final-map-col relative self-center lg:col-span-6">
            {!world && (
              <svg ref={mapRef} viewBox={MAP_VIEWBOX} className="final-map mx-auto w-full" aria-hidden="true">
                {geo && shaded && (
                  <>
                    {/* The relief stands a little off the slate: its own outline, offset and soft, beneath it. */}
                    <path d={geo.all} className="fm-shadow" transform="translate(5 9)" />
                    <clipPath id="fm-relief-clip">
                      <path d={geo.all} />
                    </clipPath>
                    <image className="fm-relief" href={shaded.href} x={shaded.x} y={shaded.y} width={shaded.w} height={shaded.h} preserveAspectRatio="none" clipPath="url(#fm-relief-clip)" />
                  </>
                )}
                <GeoLine d={geo?.all ?? ''} role="survey" className="fm-country" />
                {converge.map((c, i) => (
                  <g key={c.id} style={{ ['--i' as string]: i }}>
                    <GeoLine d={c.d} role="protect" nib={6} className="fm-line" />
                    <circle cx={c.a[0]} cy={c.a[1]} r="5" className="fm-dot" />
                  </g>
                ))}
                <circle cx={CENTRE[0]} cy={CENTRE[1]} r="7" className="fm-centre" />
              </svg>
            )}
            <p className="fm-coord final-map-note text-micro">
              Lines from each species&rsquo; anchor locality, meeting at{' '}
              <span className="tabular-nums text-river">
                {formatDeg(CENTRE_LAT, 'lat')} {formatDeg(CENTRE_LNG, 'lng')}
              </span>
              , a drawing point rather than a place.
              {world
                ? ` The relief is the one the atlas opened on: ETOPO 2022 elevation (NOAA), heights exaggerated ${RELIEF_EXAGGERATION} times.`
                : shaded && ' Ground: ETOPO 2022 elevation (NOAA), shaded.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
