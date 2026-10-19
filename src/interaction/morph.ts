/**
 * Lines that change shape.
 *
 * The atlas's line can be drawn; with this it can also become something
 * else — a contour becomes a rule under a title, a rule becomes a graph of a
 * record. Any two paths are resampled to the same number of points along
 * their length and interpolated point by point, so they need not share
 * commands. Geometry only: the caller decides what the shapes mean, and a
 * shape that stands for something unmapped is still labelled schematic.
 */
export type Points = Float32Array;

let probe: SVGPathElement | null = null;

/** `n` points evenly spaced along `d`, as [x0, y0, x1, y1, …]. */
export function resample(d: string, n: number): Points {
  if (!probe) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    probe = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svg.appendChild(probe);
    document.body.appendChild(svg);
  }
  probe.setAttribute('d', d);
  const len = probe.getTotalLength();
  const out = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const p = probe.getPointAtLength((i / (n - 1)) * len);
    out[i * 2] = p.x;
    out[i * 2 + 1] = p.y;
  }
  return out;
}

/** A function sampled at `n` evenly spaced x positions from x0 to x1. */
export function sampleFn(fn: (x: number) => number, x0: number, x1: number, n: number): Points {
  const out = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const x = x0 + ((x1 - x0) * i) / (n - 1);
    out[i * 2] = x;
    out[i * 2 + 1] = fn(x);
  }
  return out;
}

export function lerpPoints(a: Points, b: Points, t: number, out: Points = new Float32Array(a.length)): Points {
  for (let i = 0; i < a.length; i++) out[i] = a[i] + (b[i] - a[i]) * t;
  return out;
}

/** A smooth path through the points (Catmull–Rom as cubic Béziers). */
export function toPath(p: Points, precision = 2): string {
  const n = p.length / 2;
  if (n < 2) return '';
  const f = (v: number) => v.toFixed(precision);
  let d = `M${f(p[0])} ${f(p[1])}`;
  for (let i = 0; i < n - 1; i++) {
    const i0 = Math.max(0, i - 1);
    const i2 = i + 1;
    const i3 = Math.min(n - 1, i + 2);
    const c1x = p[i * 2] + (p[i2 * 2] - p[i0 * 2]) / 6;
    const c1y = p[i * 2 + 1] + (p[i2 * 2 + 1] - p[i0 * 2 + 1]) / 6;
    const c2x = p[i2 * 2] - (p[i3 * 2] - p[i * 2]) / 6;
    const c2y = p[i2 * 2 + 1] - (p[i3 * 2 + 1] - p[i * 2 + 1]) / 6;
    d += `C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p[i2 * 2])} ${f(p[i2 * 2 + 1])}`;
  }
  return d;
}

/** A straight polyline through the points, for shapes with corners (steps, graphs). */
export function toPolyline(p: Points, precision = 2): string {
  let d = '';
  for (let i = 0; i < p.length; i += 2) d += `${i ? 'L' : 'M'}${p[i].toFixed(precision)} ${p[i + 1].toFixed(precision)}`;
  return d;
}
