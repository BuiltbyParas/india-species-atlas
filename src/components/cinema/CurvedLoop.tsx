import { useEffect, useId, useRef } from 'react';
import { getLenis } from '../../motion/SmoothScroll';
import { prefersReducedMotion } from '../../motion/preferences';

/**
 * A line of type running along a curve, like a river's name lettered along
 * its course on a sheet map.
 *
 * The words drift slowly on their own, run faster while the page is being
 * scrolled, and can be dragged along the line. The curve itself is drawn as a
 * hairline underneath, so between chapters the page is literally joined by a
 * line. Only animates while on screen; with reduced motion it is still.
 */
export function CurvedLoop({
  words,
  curve = 'M-40 118 C 260 30, 520 40, 760 108 S 1240 170, 1480 70',
  speed = 0.35,
  className,
  label,
}: {
  words: string[];
  curve?: string;
  speed?: number;
  className?: string;
  /** What the loop lists, for assistive technology. */
  label: string;
}) {
  const id = useId().replace(/:/g, '');
  const svgRef = useRef<SVGSVGElement>(null);
  const textPathRef = useRef<SVGTextPathElement>(null);
  const measureRef = useRef<SVGTextElement>(null);
  const unit = words.join('   ·   ') + '   ·   ';
  const text = unit.repeat(6);

  useEffect(() => {
    const svg = svgRef.current;
    const tp = textPathRef.current;
    const measure = measureRef.current;
    if (!svg || !tp || !measure) return;
    let unitLen = measure.getComputedTextLength() || 1000;
    let offset = -unitLen;
    let raf = 0;
    let visible = false;
    let dragging = false;
    let lastX = 0;
    let dir = -1;
    const reduced = prefersReducedMotion();

    const place = () => {
      if (offset > 0) offset -= unitLen;
      if (offset < -unitLen * 2) offset += unitLen;
      tp.setAttribute('startOffset', offset.toFixed(1));
    };
    place();

    const loop = () => {
      if (!dragging) {
        const v = getLenis()?.velocity ?? 0;
        if (Math.abs(v) > 0.5) dir = v > 0 ? -1 : 1;
        offset += dir * (speed + Math.min(Math.abs(v) * 0.25, 6));
      }
      place();
      raf = visible ? requestAnimationFrame(loop) : 0;
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf && !reduced) raf = requestAnimationFrame(loop);
    });
    io.observe(svg);

    const toUser = () => {
      const r = svg.getBoundingClientRect();
      return 1440 / Math.max(r.width, 1);
    };
    const down = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      svg.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = (e.clientX - lastX) * toUser();
      lastX = e.clientX;
      offset += dx;
      dir = dx > 0 ? 1 : -1;
      place();
    };
    const up = () => {
      dragging = false;
    };
    const onResize = () => {
      unitLen = measure.getComputedTextLength() || unitLen;
    };
    svg.addEventListener('pointerdown', down);
    svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerup', up);
    svg.addEventListener('pointercancel', up);
    window.addEventListener('resize', onResize);
    document.fonts?.ready.then(onResize);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      svg.removeEventListener('pointerdown', down);
      svg.removeEventListener('pointermove', move);
      svg.removeEventListener('pointerup', up);
      svg.removeEventListener('pointercancel', up);
      window.removeEventListener('resize', onResize);
    };
  }, [speed, unit]);

  return (
    <div className={className}>
      <p className="sr-only">
        {label}: {words.join(', ')}.
      </p>
      <svg
        ref={svgRef}
        viewBox="0 0 1440 200"
        className="curved-loop block w-full touch-pan-y select-none"
        aria-hidden="true"
        data-cursor-drag
      >
        <defs>
          <path id={`${id}-curve`} d={curve} />
        </defs>
        <use href={`#${id}-curve`} className="curved-loop-line" />
        <text ref={measureRef} className="curved-loop-text" opacity="0" x="-9999">
          {unit}
        </text>
        <text className="curved-loop-text" dy="-14">
          <textPath ref={textPathRef} href={`#${id}-curve`} startOffset="0">
            {text}
          </textPath>
        </text>
      </svg>
    </div>
  );
}
