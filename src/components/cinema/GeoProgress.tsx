import { useEffect, useMemo, useRef, useState } from 'react';
import type { Species } from '../../types';
import { localityCoords, MAP_VIEWBOX, project, useIndiaGeo } from '../../geo/india';
import { GeoLine } from '../../geo/line/GeoLine';
import { bowedLeg } from '../../geo/line/paths';
import { useCurrentChapter } from '../../motion/chapters';
import { useVelocityVar } from '../../interaction/velocity';
import { onScroll as subscribeScroll } from '../../interaction/scroll';

/**
 * Scroll progress drawn as a route across a small map of India.
 *
 * The line begins at the first species' anchor locality — the Great Indian
 * Bustard's, in the Thar — and runs through each featured species' anchor in
 * the order the documentary meets them, then closes the loop back to where it
 * began for the ending. Each leg is drawn exactly while its scene is on
 * screen, so the route says where in the story the reader is, and the stops
 * are real places. Underneath, a survey readout names the last place the line
 * reached and gives its coordinates — the same anchor locality the scene's map
 * rings.
 *
 * Stops are found by `[data-route-stop]` elements on the page; the leg from
 * stop i to stop i+1 fills as the page scrolls from the top of the one to the
 * top of the next. The finale is the last stop, so the closing leg returns to
 * the Thar as the ending arrives. The map steps aside once the footer comes
 * up, and once the finale's own map arrives, so it never sits on top of
 * either — nor over a chapter that marks itself `data-geo-quiet` because it
 * draws the whole country itself (Chapter 04).
 *
 * Driven from one RAF-throttled scroll handler that writes `--draw` on each
 * leg and text into the readout; React is touched only when the map shows or
 * hides.
 */
export function GeoProgress({ stops }: { stops: Species[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useVelocityVar(rootRef);
  const geo = useIndiaGeo();
  const chapter = useCurrentChapter();
  const legRefs = useRef<Array<SVGGElement | null>>([]);
  const dotRefs = useRef<Array<SVGCircleElement | null>>([]);
  const placeRef = useRef<HTMLSpanElement>(null);
  const coordRef = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(false);

  const anchors = useMemo(() => stops.map((s) => s.distributionPoints[0]), [stops]);
  const points = useMemo(() => anchors.map((a) => project(a.lng, a.lat)), [anchors]);
  const legs = useMemo(() => {
    const loop = [...points, points[0]];
    // A gentle bow on each leg, alternating sides, so the route reads as a
    // drawn line rather than a set of straight hops.
    return loop.slice(0, -1).map((a, i) => bowedLeg(a, loop[i + 1], i % 2 === 0 ? 0.22 : -0.22, { max: 90, tension: 0.9 }));
  }, [points]);

  useEffect(() => {
    let tops: number[] = [];
    let footerTop = Infinity;
    /** Spans of chapters that carry a national map of their own, over which this one would only repeat it. */
    let quiet: Array<[number, number]> = [];
    let raf = 0;
    let wasShown: boolean | null = null;
    let lastStop = -2;
    const measure = () => {
      const nodes = [...document.querySelectorAll<HTMLElement>('[data-route-stop]')];
      nodes.sort((a, b) => Number(a.dataset.routeStop) - Number(b.dataset.routeStop));
      tops = nodes.map((n) => n.getBoundingClientRect().top + window.scrollY);
      const footer = document.querySelector<HTMLElement>('.site-footer');
      footerTop = footer ? footer.getBoundingClientRect().top + window.scrollY : Infinity;
      quiet = [...document.querySelectorAll<HTMLElement>('[data-geo-quiet]')].map((n) => {
        const r = n.getBoundingClientRect();
        return [r.top + window.scrollY, r.bottom + window.scrollY];
      });
    };
    const update = () => {
      raf = 0;
      const y = window.scrollY + window.innerHeight * 0.5;
      const bottom = window.scrollY + window.innerHeight;
      // Shown from the first scene until the loop has closed at the finale, whose
      // own map takes over; never over the footer.
      const end = tops[tops.length - 1] ?? Infinity;
      const next =
        tops.length > 0 &&
        y > tops[0] - window.innerHeight * 0.4 &&
        y < end + window.innerHeight * 0.2 &&
        bottom < footerTop + 40 &&
        !quiet.some(([a, b]) => bottom > a + window.innerHeight * 0.25 && window.scrollY < b - window.innerHeight * 0.25);
      // Only touch React when visibility actually flips, not on every frame.
      if (next !== wasShown) {
        wasShown = next;
        setShown(next);
      }
      legRefs.current.forEach((leg, i) => {
        if (!leg) return;
        const a = tops[i];
        const b = tops[i + 1];
        let t = 0;
        if (a !== undefined && b !== undefined) t = Math.min(1, Math.max(0, (y - a) / (b - a)));
        leg.style.setProperty('--draw', t.toFixed(4));
      });
      let reached = -1;
      dotRefs.current.forEach((dot, i) => {
        if (!dot) return;
        const passed = tops[i] !== undefined && y >= tops[i];
        dot.dataset.passed = passed ? 'true' : 'false';
        if (passed) reached = i;
      });
      // The readout names the last stop the line has reached, and keeps it
      // while the line travels on to the next.
      if (reached !== lastStop && reached >= 0 && placeRef.current && coordRef.current) {
        lastStop = reached;
        const p = anchors[reached];
        placeRef.current.textContent = p.label.split(',')[0];
        coordRef.current.textContent = localityCoords(p);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    measure();
    update();
    const ro = new ResizeObserver(() => {
      measure();
      update();
    });
    ro.observe(document.body);
    const offScroll = subscribeScroll(onScroll);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      offScroll();
    };
  }, [legs.length, anchors]);

  return (
    <div ref={rootRef} className={`geo-progress ${shown ? 'is-shown' : ''}`} aria-hidden="true">
      <svg viewBox={MAP_VIEWBOX}>
        <path d={geo?.all ?? ''} className="gp-country" />
        {legs.map((d, i) => (
          <g key={i}>
            <GeoLine d={d} role="survey" className="gp-guide" still />
            <GeoLine
              ref={(n) => {
                legRefs.current[i] = n;
              }}
              d={d}
              role={i === legs.length - 1 ? 'protect' : 'route'}
              draw={0}
              nib={22}
            />
          </g>
        ))}
        {points.map(([x, y], i) => (
          <circle
            key={i}
            ref={(n) => {
              dotRefs.current[i] = n;
            }}
            cx={x}
            cy={y}
            r="14"
            className="gp-stop"
          />
        ))}
      </svg>
      <p className="gp-label">
        <span className="gp-chapter">{chapter ? chapter.title : ''}</span>
        <span ref={placeRef} className="gp-place" />
        <span ref={coordRef} className="gp-coord tabular-nums" />
      </p>
    </div>
  );
}
