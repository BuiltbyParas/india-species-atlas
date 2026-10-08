/**
 * How many screen pixels one map unit covers, per SVG, written to the SVG as
 * `--gl-k` so every line inside can set its weight in pixels.
 *
 * A line that is drawn on is dashed along its own length (a unit
 * `pathLength`), which only works in map units — a non-scaling stroke has its
 * dashes measured in screen pixels instead. So drawn lines scale with the map,
 * and divide their pixel weight by this factor to keep it. One observer per
 * SVG however many lines it holds; re-measured when the SVG is resized.
 *
 * The smaller of the two axis scales is used, so a line in a box stretched to
 * the screen's width (the loader's survey rule) keeps its thickness.
 */
const watched = new WeakMap<SVGSVGElement, number>();
let observer: ResizeObserver | null = null;

function measure(svg: SVGSVGElement) {
  const m = svg.getScreenCTM();
  if (!m) return;
  const k = Math.min(Math.abs(m.a), Math.abs(m.d)) || 1;
  svg.style.setProperty('--gl-k', k.toFixed(4));
}

export function watchScale(svg: SVGSVGElement | null | undefined): () => void {
  if (!svg) return () => undefined;
  const count = watched.get(svg) ?? 0;
  watched.set(svg, count + 1);
  if (count === 0) {
    observer ??= new ResizeObserver((entries) => {
      for (const e of entries) measure(e.target as SVGSVGElement);
    });
    observer.observe(svg);
    measure(svg);
  }
  return () => {
    const n = (watched.get(svg) ?? 1) - 1;
    if (n <= 0) {
      watched.delete(svg);
      observer?.unobserve(svg);
    } else watched.set(svg, n);
  };
}
