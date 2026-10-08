import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SPECIES } from '../../data/species';
import { PROGRAMMES } from '../../data/programmes';
import { STATUS_INFO, THREATENED_ORDER } from '../../data/statusInfo';
import { MAP_HEIGHT, MAP_VIEWBOX, MAP_WIDTH, project, useIndiaGeo } from '../../geo/india';
import { GeoLine } from '../../geo/line/GeoLine';
import { chain } from '../../geo/line/paths';
import { smoothPath } from '../../geo/india';
import { schedule } from '../../interaction/loop';
import { cubicBezier } from '../../motion/gsap';
import { useReducedMotion, useWideLayout } from '../../motion/preferences';
import { cn } from '../../utils/cn';
import { onScroll as subscribeScroll } from '../../interaction/scroll';

/**
 * DATA → GEOGRAPHY → NETWORK, and back.
 *
 * The chapter opens on the dataset as data: twelve points in a row, sorted by
 * Red List category. As the reader scrolls, each point travels to the
 * species' anchor locality and India draws itself in around them; the points
 * become survey markers; then the species that one national programme names
 * are joined, and the two the atlas records no national programme for are
 * left standing apart. Scrolling back undoes it: the map gives its points
 * back to the row.
 *
 * Every number and every join is computed from the dataset. The joins are a
 * reading device — "the same programme names these species" — and are
 * labelled as such; they are not corridors and claim no movement of animals.
 *
 * Wide screens get the scrubbed, pinned version. Phones and reduced motion
 * get the finished map with the same captions in order.
 */
const ease = cubicBezier(0.7, 0, 0.2, 1);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const span = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

// The order the data is read in: most threatened first, then by name.
const ORDERED = [...SPECIES].sort(
  (a, b) =>
    THREATENED_ORDER.indexOf(a.status) - THREATENED_ORDER.indexOf(b.status) || a.commonName.localeCompare(b.commonName),
);

/** The programme that names the most of the atlas' species. */
const NETWORK = (() => {
  const best = [...PROGRAMMES].sort((a, b) => b.speciesIds.length - a.speciesIds.length)[0];
  const members = ORDERED.filter((s) => best.speciesIds.includes(s.id));
  const joined = chain(members.map((s) => s.distributionPoints[0]));
  return {
    programme: best,
    members,
    d: smoothPath(
      joined.map((p) => project(p.lng, p.lat)),
      0.15,
    ),
  };
})();
const UNPROGRAMMED = ORDERED.filter((s) => s.conservationProgrammes.length === 0);

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
const sentenceNumber = (n: number) => WORDS[n] ?? String(n);

const COUNTS = THREATENED_ORDER.map((code) => ({ code, n: SPECIES.filter((s) => s.status === code).length })).filter(
  (c) => c.n > 0,
);

/** Positions for the row: evenly across the sheet, at mid-height. */
const ROW_Y = MAP_HEIGHT * 0.5;
const rowX = (i: number) => MAP_WIDTH * (0.08 + (0.84 * i) / Math.max(ORDERED.length - 1, 1));

interface Beat {
  at: number;
  eyebrow: string;
  title: string;
  body: string;
}

const BEATS: Beat[] = [
  {
    at: 0,
    eyebrow: 'The dataset',
    title: `${SPECIES.length} species, as data`,
    body: `${COUNTS.map((c) => `${c.n} ${STATUS_INFO[c.code].name}`).join(', ')}. Sorted by Red List category, most threatened first.`,
  },
  {
    at: 0.22,
    eyebrow: 'As geography',
    title: 'Each point goes to its ground',
    body: 'Every point travels to its species’ anchor locality — the first place the record names — and the country is drawn in around them.',
  },
  {
    at: 0.55,
    eyebrow: 'As markers',
    title: 'Twelve places on one sheet',
    body: 'The same marks the atlas map uses: a disc at the locality, in the category’s colour, with its code.',
  },
  {
    at: 0.75,
    eyebrow: 'As a system',
    title: `${NETWORK.members.length} joined by one programme`,
    body: `${NETWORK.programme.name.replace(/ \(.*\)$/, '')} (${NETWORK.programme.authority.split(',')[0]}, from ${NETWORK.programme.startedYear}) names ${NETWORK.members.length} of the ${SPECIES.length}. ${sentenceNumber(
      UNPROGRAMMED.length,
    )} — ${UNPROGRAMMED.map((s) => s.commonName).join(' and ')} — ${UNPROGRAMMED.length === 1 ? 'has' : 'have'} no national programme recorded in this atlas. The joins say only that one programme names these species; they are not corridors.`,
  },
];

export function DataGeography() {
  const wide = useWideLayout();
  const reduced = useReducedMotion();
  const scrub = wide && !reduced;
  const geo = useIndiaGeo();
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<Array<SVGGElement | null>>([]);
  const [beat, setBeat] = useState(scrub ? 0 : BEATS.length - 1);

  const anchors = useMemo(() => ORDERED.map((s) => project(s.distributionPoints[0].lng, s.distributionPoints[0].lat)), []);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;

    const apply = (p: number) => {
      const travel = span(p, 0.2, 0.52);
      stage.style.setProperty('--outline', span(p, 0.22, 0.5).toFixed(3));
      stage.style.setProperty('--mark', span(p, 0.52, 0.62).toFixed(3));
      stage.style.setProperty('--row', (1 - span(p, 0.16, 0.26)).toFixed(3));
      stage.style.setProperty('--net', span(p, 0.74, 0.92).toFixed(3));
      ORDERED.forEach((_, i) => {
        // Each point leaves a little after the one before it, so the row unravels rather than jumps.
        const t = ease(clamp01(travel * 1.35 - (i / ORDERED.length) * 0.35));
        const x = rowX(i) + (anchors[i][0] - rowX(i)) * t;
        const y = ROW_Y + (anchors[i][1] - ROW_Y) * t - Math.sin(Math.PI * t) * 60;
        dotRefs.current[i]?.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      });
      let b = 0;
      BEATS.forEach((x, i) => {
        if (p >= x.at) b = i;
      });
      setBeat(b);
    };

    if (!scrub) {
      apply(1);
      return;
    }

    let queued = false;
    const read = () => {
      queued = false;
      const r = section.getBoundingClientRect();
      const run = r.height - window.innerHeight;
      apply(clamp01(-r.top / Math.max(run, 1)));
      return false;
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      schedule(read);
    };
    read();
    const offScroll = subscribeScroll(onScroll);
    window.addEventListener('resize', onScroll);
    return () => {
      offScroll();
      window.removeEventListener('resize', onScroll);
    };
  }, [scrub, anchors]);

  return (
    <section
      ref={sectionRef}
      className={cn('data-geo', scrub && 'is-scrub')}
      aria-labelledby="dg-title"
    >
      <div className="dg-stage">
        <div className="dg-copy">
          <p className="eyebrow">Data → geography</p>
          <h2 id="dg-title" className="sr-only">
            The atlas&rsquo; species, from data to map to programme
          </h2>
          {scrub ? (
            <div className="dg-beats" aria-live="polite">
              {BEATS.map((b, i) => (
                <div key={b.eyebrow} className={cn('dg-beat', i === beat && 'is-on')} aria-hidden={i !== beat}>
                  <p className="caps">{b.eyebrow}</p>
                  <p className="mt-3 font-serif text-subheading font-light text-canvas">{b.title}</p>
                  <p className="mt-4 max-w-md text-body text-canvas/65">{b.body}</p>
                </div>
              ))}
            </div>
          ) : (
            <ol className="mt-6 space-y-6">
              {BEATS.map((b) => (
                <li key={b.eyebrow}>
                  <p className="caps">{b.eyebrow}</p>
                  <p className="mt-2 font-serif text-lede font-light text-canvas">{b.title}</p>
                  <p className="mt-2 text-small text-canvas/65">{b.body}</p>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-8 text-label text-canvas/45">
            Points are each species&rsquo; anchor locality: an indicative place inside the recorded range, not its
            boundary. <Link to="/atlas" className="text-link">Every locality is on the map.</Link>
          </p>
        </div>

        <div ref={stageRef} className="dg-map" style={{ aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}` }}>
          <svg viewBox={MAP_VIEWBOX} className="h-full w-full overflow-visible" role="img" aria-label={`Map of India with the anchor localities of the atlas' ${SPECIES.length} species; ${NETWORK.members.length} of them joined because one national programme names them.`}>
            <GeoLine d={geo?.all ?? ''} role="survey" draw="var(--outline)" className="dg-country" />
            <GeoLine d={NETWORK.d} role="protect" draw="var(--net)" nib={5} className="dg-net" />
            {/* The row the data starts as. */}
            <line x1={rowX(0) - 20} x2={rowX(ORDERED.length - 1) + 20} y1={ROW_Y} y2={ROW_Y} className="dg-row" />
            {ORDERED.map((s, i) => {
              const member = NETWORK.members.includes(s);
              return (
                <g
                  key={s.id}
                  ref={(n) => {
                    dotRefs.current[i] = n;
                  }}
                  className={cn('dg-point', member ? 'is-member' : 'is-apart', s.conservationProgrammes.length === 0 && 'is-none')}
                  style={{ ['--c' as string]: STATUS_INFO[s.status].hex }}
                  transform={`translate(${anchors[i][0]} ${anchors[i][1]})`}
                >
                  <circle r="13" className="dg-ring" />
                  <circle r="7" className="dg-dot" />
                  <text y="34" className="dg-code">
                    {s.status}
                  </text>
                  <title>{`${s.commonName} — ${s.distributionPoints[0].label}`}</title>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </section>
  );
}
