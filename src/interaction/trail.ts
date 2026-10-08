import { pointer, pointerVelocity } from './pointer';
import { schedule } from './loop';
import { INTERACTIVE } from './targets';

/**
 * The ink trail: the cursor as a drawing instrument.
 *
 * Inside a region marked `data-trail`, moving the hand leaves a thin line on
 * the sheet that fades in under a second — ink drying, not a glow. It carries
 * chainage ticks, the short marks a surveyor rules along a measured line, so
 * it reads as a traverse rather than a streak. It moves with the page when
 * the page scrolls, as ink on paper would.
 *
 * Near one of the atlas's own lines (a `GeoLine`), the trail is drawn onto
 * that line: the ink eases off the hand and follows the path itself, in the
 * contour colour, and the reticle says "Trace". The trail never invents a
 * line — it only follows one already drawn.
 *
 * Slow movement leaves almost nothing, so reading with a hand on the mouse is
 * undisturbed. Nothing is drawn over controls. Canvas 2D, one layer, stepped
 * on the shared loop only while ink is still visible.
 */
interface Mark {
  x: number;
  y: number;
  t: number;
  /** 0 → 1: how far this point was pulled onto a line. */
  snap: number;
  /** 0 → 1: how firmly the hand was moving. */
  ink: number;
}

const LIFE = 650; // ms
const LIFE_SNAPPED = 1100;
const SNAP_RADIUS = 26; // px
const TICK_EVERY = 56; // px
const MAX_MARKS = 90;

interface Sampled {
  path: SVGPathElement;
  pts: Float32Array;
}

const sampleCache = new WeakMap<SVGPathElement, { d: string; pts: Float32Array }>();
let svgCache: { svg: SVGSVGElement; at: number; paths: Sampled[] } | null = null;

function samplePath(path: SVGPathElement): Float32Array {
  const d = path.getAttribute('d') ?? '';
  const hit = sampleCache.get(path);
  if (hit && hit.d === d) return hit.pts;
  const len = path.getTotalLength();
  const n = Math.max(2, Math.min(240, Math.ceil(len / 3)));
  const pts = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const p = path.getPointAtLength((i / (n - 1)) * len);
    pts[i * 2] = p.x;
    pts[i * 2 + 1] = p.y;
  }
  sampleCache.set(path, { d, pts });
  return pts;
}

/** The atlas lines in this SVG that are fully drawn, sampled in their own units. */
function linesIn(svg: SVGSVGElement, now: number): Sampled[] {
  if (svgCache && svgCache.svg === svg && now - svgCache.at < 700) return svgCache.paths;
  const paths: Sampled[] = [];
  for (const path of svg.querySelectorAll<SVGPathElement>('.gl-path')) {
    const g = path.closest('.gl');
    if (!g) continue;
    const style = getComputedStyle(g);
    const draw = Number.parseFloat(style.getPropertyValue('--draw') || '1');
    if (path.classList.contains('is-still') ? false : draw < 0.98) continue;
    if (Number.parseFloat(getComputedStyle(path).opacity) < 0.2) continue;
    paths.push({ path, pts: samplePath(path) });
  }
  svgCache = { svg, at: now, paths };
  return paths;
}

/** The nearest point on an atlas line to the pointer, in screen pixels, if one is close. */
function nearestLine(x: number, y: number, svg: SVGSVGElement, now: number): { x: number; y: number; d: number } | null {
  let best: { x: number; y: number; d: number } | null = null;
  for (const { path, pts } of linesIn(svg, now)) {
    const m = path.getScreenCTM();
    if (!m) continue;
    const inv = m.inverse();
    const ux = inv.a * x + inv.c * y + inv.e;
    const uy = inv.b * x + inv.d * y + inv.f;
    const k = Math.min(Math.abs(m.a), Math.abs(m.d)) || 1;
    const r = SNAP_RADIUS / k;
    let bi = -1;
    let bd = r * r;
    for (let i = 0; i < pts.length; i += 2) {
      const ddx = pts[i] - ux;
      const ddy = pts[i + 1] - uy;
      const dd = ddx * ddx + ddy * ddy;
      if (dd < bd) {
        bd = dd;
        bi = i;
      }
    }
    if (bi < 0) continue;
    const d = Math.sqrt(bd) * k;
    if (best && best.d <= d) continue;
    const sx = m.a * pts[bi] + m.c * pts[bi + 1] + m.e;
    const sy = m.b * pts[bi] + m.d * pts[bi + 1] + m.f;
    best = { x: sx, y: sy, d };
  }
  return best;
}

const regionCache = new WeakMap<Element, { at: number; svgs: SVGSVGElement[] }>();

/** Lines often sit in an SVG that ignores the pointer; find the one under it. */
function lineSvgAt(region: Element, x: number, y: number, now: number): SVGSVGElement | null {
  let hit = regionCache.get(region);
  if (!hit || now - hit.at > 700) {
    const svgs = [...region.querySelectorAll<SVGSVGElement>('svg')].filter((s) => s.querySelector('.gl-path'));
    hit = { at: now, svgs };
    regionCache.set(region, hit);
  }
  for (const svg of hit.svgs) {
    const r = svg.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return svg;
  }
  return null;
}

export interface Trail {
  /** Called on every pointer move. Returns whether the trail is tracing a line. */
  move(): boolean;
  dispose(): void;
}

export function createTrail(canvas: HTMLCanvasElement): Trail {
  const ctx = canvas.getContext('2d');
  const marks: Mark[] = [];
  let running = false;
  let lastScroll = window.scrollY;
  let dpr = 1;
  let ink = '236, 229, 211';
  let contour = '201, 168, 106';

  const css = getComputedStyle(document.documentElement);
  const rgb = (v: string, fallback: string) => {
    const probe = document.createElement('span');
    probe.style.color = v;
    document.body.appendChild(probe);
    const c = getComputedStyle(probe).color;
    probe.remove();
    const m = c.match(/[\d.]+/g);
    return m && m.length >= 3 ? `${m[0]}, ${m[1]}, ${m[2]}` : fallback;
  };
  ink = rgb(css.getPropertyValue('--color-canvas').trim() || '#ece5d3', ink);
  contour = rgb(css.getPropertyValue('--color-contour').trim() || '#c9a86a', contour);

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
  };
  resize();
  window.addEventListener('resize', resize);

  const draw = (now: number) => {
    if (!ctx) return false;
    const y = window.scrollY;
    const dy = y - lastScroll;
    lastScroll = y;
    if (dy) for (const m of marks) m.y -= dy;

    while (marks.length && now - marks[0].t > (marks[0].snap > 0.5 ? LIFE_SNAPPED : LIFE)) marks.shift();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    if (marks.length < 2) return marks.length > 0;

    ctx.lineCap = 'round';
    let run = 0;
    for (let i = 1; i < marks.length; i++) {
      const a = marks[i - 1];
      const b = marks[i];
      const life = b.snap > 0.5 ? LIFE_SNAPPED : LIFE;
      const age = Math.min(1, (now - b.t) / life);
      const fade = (1 - age) * (1 - age);
      const alpha = fade * (0.16 + 0.34 * b.ink + 0.4 * b.snap);
      if (alpha < 0.01) continue;
      const col = b.snap > 0.5 ? contour : ink;
      ctx.strokeStyle = `rgba(${col}, ${alpha.toFixed(3)})`;
      ctx.lineWidth = 0.9 + 0.6 * b.snap;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      const seg = Math.hypot(b.x - a.x, b.y - a.y);
      const before = run;
      run += seg;
      if (Math.floor(before / TICK_EVERY) !== Math.floor(run / TICK_EVERY) && seg > 0.01) {
        // A chainage tick, square to the line.
        const nx = -(b.y - a.y) / seg;
        const ny = (b.x - a.x) / seg;
        ctx.beginPath();
        ctx.moveTo(b.x - nx * 3.5, b.y - ny * 3.5);
        ctx.lineTo(b.x + nx * 3.5, b.y + ny * 3.5);
        ctx.stroke();
      }
    }
    return true;
  };

  const task = (_dt: number, now: number) => {
    const alive = draw(now);
    if (!alive) running = false;
    return alive;
  };

  return {
    move() {
      if (pointer.type !== 'mouse') return false;
      const target = pointer.target;
      const region = target?.closest('[data-trail]');
      if (!region || target?.closest(INTERACTIVE)) return false;
      const now = performance.now();
      const { speed } = pointerVelocity(now);
      let x = pointer.x;
      let y = pointer.y;
      let snap = 0;
      const svg = target?.closest('svg') ?? lineSvgAt(region, x, y, now);
      if (svg) {
        const near = nearestLine(x, y, svg, now);
        if (near) {
          const t = 1 - near.d / SNAP_RADIUS;
          snap = t * t * (3 - 2 * t);
          x += (near.x - x) * snap;
          y += (near.y - y) * snap;
        }
      }
      const last = marks[marks.length - 1];
      if (last && Math.hypot(last.x - x, last.y - y) < 2.5) return snap > 0.5;
      marks.push({ x, y, t: now, snap, ink: Math.min(1, speed / 900) });
      if (marks.length > MAX_MARKS) marks.shift();
      if (!running) {
        running = true;
        lastScroll = window.scrollY;
        schedule(task);
      }
      return snap > 0.5;
    },
    dispose() {
      window.removeEventListener('resize', resize);
      marks.length = 0;
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}
