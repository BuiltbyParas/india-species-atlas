import { useEffect, useMemo, useRef, useState } from 'react';
import type { Species } from '../../types';
import { MAP_VIEWBOX, project, smoothPath, useIndiaGeo } from '../../geo/india';
import { useCurrentChapter } from '../../motion/chapters';

/**
 * Scroll progress drawn as a route across a small map of India.
 *
 * The line begins at the first species' anchor locality — the Great Indian
 * Bustard's, in the Thar — and runs through each featured species' anchor in
 * the order the documentary meets them, then closes the loop back to where it
 * began for the ending. Each leg is drawn exactly while its scene is on
 * screen, so the route says where in the story the reader is, and the stops
 * are real places.
 *
 * Stops are found by `[data-route-stop]` elements on the page; the leg from
 * stop i to stop i+1 fills as the page scrolls from the top of the one to the
 * top of the next.
 */
export function GeoProgress({ stops }: { stops: Species[] }) {
  const geo = useIndiaGeo();
  const chapter = useCurrentChapter();
  const rootRef = useRef<HTMLDivElement>(null);
  const legRefs = useRef<Array<SVGPathElement | null>>([]);
  const dotRefs = useRef<Array<SVGCircleElement | null>>([]);
  const [shown, setShown] = useState(false);

  const points = useMemo(() => stops.map((s) => project(s.distributionPoints[0].lng, s.distributionPoints[0].lat)), [stops]);
  const legs = useMemo(() => {
    const loop = [...points, points[0]];
    const out: string[] = [];
    for (let i = 0; i < loop.length - 1; i++) {
      const a = loop[i];
      const b = loop[i + 1];
      // A gentle bow on each leg, alternating sides, so the route reads as a
      // drawn line rather than a set of straight hops.
      const mx = (a[0] + b[0]) / 2;
      const my = (a[1] + b[1]) / 2;
      const nx = -(b[1] - a[1]);
      const ny = b[0] - a[0];
      const len = Math.hypot(nx, ny) || 1;
      const bow = (i % 2 === 0 ? 1 : -1) * Math.min(90, len * 0.22);
      out.push(smoothPath([a, [mx + (nx / len) * bow, my + (ny / len) * bow], b], 0.9));
    }
    return out;
  }, [points]);

  useEffect(() => {
    let tops: number[] = [];
    let raf = 0;
    const measure = () => {
      const nodes = [...document.querySelectorAll<HTMLElement>('[data-route-stop]')];
      nodes.sort((a, b) => Number(a.dataset.routeStop) - Number(b.dataset.routeStop));
      tops = nodes.map((n) => n.getBoundingClientRect().top + window.scrollY);
    };
    const update = () => {
      raf = 0;
      const y = window.scrollY + window.innerHeight * 0.5;
      // Step aside once the footer arrives, so the map never sits over its links.
      const footerTop = document.querySelector('footer')?.getBoundingClientRect().top ?? Infinity;
      setShown(tops.length > 0 && y > tops[0] - window.innerHeight * 0.4 && footerTop > window.innerHeight);
      legRefs.current.forEach((leg, i) => {
        if (!leg) return;
        const a = tops[i];
        const b = tops[i + 1];
        let t = 0;
        if (a !== undefined && b !== undefined) t = Math.min(1, Math.max(0, (y - a) / (b - a)));
        leg.style.strokeDashoffset = String(1 - t);
      });
      dotRefs.current.forEach((dot, i) => {
        if (!dot) return;
        dot.dataset.passed = tops[i] !== undefined && y >= tops[i] ? 'true' : 'false';
      });
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
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [legs.length]);

  return (
    <div ref={rootRef} className={`geo-progress ${shown ? 'is-shown' : ''}`} aria-hidden="true">
      <svg viewBox={MAP_VIEWBOX}>
        <path d={geo?.all ?? ''} className="gp-country" />
        {legs.map((d, i) => (
          <g key={i}>
            <path d={d} pathLength={1} className="gp-leg-base" />
            <path
              ref={(n) => {
                legRefs.current[i] = n;
              }}
              d={d}
              pathLength={1}
              className={i === legs.length - 1 ? 'gp-leg gp-leg-return' : 'gp-leg'}
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
      <p className="gp-label">{chapter ? chapter.title : ''}</p>
    </div>
  );
}
