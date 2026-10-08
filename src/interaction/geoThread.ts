import { formatDeg } from '../geo/india';
import { schedule } from './loop';

/**
 * The temporary geographic thread.
 *
 * Anything on the page that stands for a place carries it (`data-geo="lng,lat"`):
 * a directory card, an atlas marker, a link to a species. When the hand (or
 * keyboard focus) moves from one such place to another, a survey line is
 * ruled between the two on screen, with the distance between the two
 * localities set along it — the great-circle distance, anchor to anchor, from
 * the dataset's coordinates. It dries in a second or two, like the ink trail.
 *
 * It measures; it never draws a route. The line is bowed so it reads as a
 * surveyor's chord rather than a path, and its label says what it is.
 *
 * One canvas in the cursor layer, stepped by the shared loop only while a
 * thread is visible. The two ends are re-read from the elements' boxes each
 * frame, so a thread drawn across a scrolling page stays attached.
 */
export interface GeoPlace {
  lng: number;
  lat: number;
}

export function placeOf(el: Element | null): GeoPlace | null {
  const raw = el?.getAttribute('data-geo');
  if (!raw) return null;
  const [lng, lat] = raw.split(',').map(Number);
  return Number.isFinite(lng) && Number.isFinite(lat) ? { lng, lat } : null;
}

export function readPlace(p: GeoPlace): string {
  return `${formatDeg(p.lat, 'lat')}  ${formatDeg(p.lng, 'lng')}`;
}

/** Great-circle distance in km (haversine, mean Earth radius). */
export function kmBetween(a: GeoPlace, b: GeoPlace): number {
  const R = 6371;
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

interface Thread {
  from: Element;
  to: Element;
  label: string;
  font: string;
  age: number;
}

const DRAW = 0.42; // s: the pen crosses
const HOLD = 1.1; // s: it stays wet
const DRY = 0.75; // s: it fades
const RECENT = 4; // s: how long the last place is remembered

export function createGeoThread(canvas: HTMLCanvasElement, color: () => string) {
  const ctx = canvas.getContext('2d')!;
  let thread: Thread | null = null;
  let last: { el: Element; place: GeoPlace; at: number } | null = null;
  let running = false;
  let dpr = 1;

  const size = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(window.innerWidth * dpr);
    const h = Math.round(window.innerHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  };

  const anchor = (el: Element): [number, number] | null => {
    // An element can name the exact point its place is drawn at (a row's dot).
    const r = (el.querySelector('[data-geo-anchor]') ?? el).getBoundingClientRect();
    if (!r.width || r.bottom < -40 || r.top > window.innerHeight + 40) return null;
    return [r.left + r.width / 2, r.top + r.height / 2];
  };

  const frame = (dt: number) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!thread) {
      running = false;
      return false;
    }
    thread.age += dt;
    const t = thread.age;
    if (t > DRAW + HOLD + DRY) {
      thread = null;
      running = false;
      return false;
    }
    const a = anchor(thread.from);
    const b = anchor(thread.to);
    if (!a || !b) return true;
    const draw = Math.min(1, t / DRAW);
    const pen = 1 - (1 - draw) ** 3;
    const wet = t < DRAW + HOLD ? 1 : 1 - (t - DRAW - HOLD) / DRY;

    // A gentle chord: bowed by a sixth of its length, always to the same side.
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len < 24) return true;
    const nx = -dy / len;
    const ny = dx / len;
    // Bowed out into the margin: left of a column, above a row.
    const side = Math.abs(dy) > Math.abs(dx) ? (nx > 0 ? -1 : 1) : ny > 0 ? -1 : 1;
    const bow = Math.min(90, len / 6) * side;
    const cx = (a[0] + b[0]) / 2 + nx * bow;
    const cy = (a[1] + b[1]) / 2 + ny * bow;
    const at = (u: number): [number, number] => {
      const v = 1 - u;
      return [v * v * a[0] + 2 * v * u * cx + u * u * b[0], v * v * a[1] + 2 * v * u * cy + u * u * b[1]];
    };

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ink = color();
    ctx.globalAlpha = wet;
    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';

    // The chord, drawn by the pen, with chainage ticks every 48 px.
    const steps = 48;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    for (let i = 1; i <= steps; i++) {
      const [x, y] = at((i / steps) * pen);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalAlpha = wet * 0.7;
    const ticks = Math.floor((len * pen) / 48);
    for (let i = 1; i <= ticks; i++) {
      const u = (i * 48) / len;
      const [x0, y0] = at(u - 0.01);
      const [x1, y1] = at(u);
      const tl = Math.hypot(x1 - x0, y1 - y0) || 1;
      const tx = (-(y1 - y0) / tl) * 3;
      const ty = ((x1 - x0) / tl) * 3;
      ctx.beginPath();
      ctx.moveTo(x1 - tx, y1 - ty);
      ctx.lineTo(x1 + tx, y1 + ty);
      ctx.stroke();
    }
    // Survey marks at both ends: the far one arrives with the pen.
    ctx.globalAlpha = wet;
    ctx.beginPath();
    ctx.arc(a[0], a[1], 2.5, 0, Math.PI * 2);
    ctx.fill();
    if (pen > 0.98) {
      ctx.beginPath();
      ctx.arc(b[0], b[1], 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(b[0], b[1], 7, 0, Math.PI * 2);
      ctx.stroke();
    }

    // The distance, set along the chord at its middle, upright and reading left to right.
    if (draw > 0.6 && len > 90) {
      const [mx, my] = at(0.5);
      const [ax, ay] = at(0.46);
      const [bx, by] = at(0.54);
      let ang = Math.atan2(by - ay, bx - ax);
      if (ang > Math.PI / 2) ang -= Math.PI;
      if (ang < -Math.PI / 2) ang += Math.PI;
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(ang);
      ctx.globalAlpha = wet * Math.min(1, (draw - 0.6) / 0.4);
      ctx.font = thread.font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(thread.label.toUpperCase().split('').join(' '), 0, -5);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    return true;
  };

  const start = () => {
    if (running) return;
    running = true;
    schedule(frame);
  };

  /** The hand (or focus) has arrived at an element; rule a thread from the last place, if it was recent. */
  function visit(el: Element) {
    const place = placeOf(el);
    if (!place) return;
    const now = performance.now() / 1000;
    if (last && last.el !== el && last.el.isConnected && now - last.at < RECENT) {
      const km = kmBetween(last.place, place);
      if (km >= 1) {
        size();
        thread = {
          from: last.el,
          to: el,
          label: `${Math.round(km).toLocaleString('en-GB')} km apart`,
          font: `500 10.5px ${getComputedStyle(document.documentElement).getPropertyValue('--font-sans').trim() || 'sans-serif'}`,
          age: 0,
        };
        start();
      }
    }
    last = { el, place, at: now };
  }

  /** The hand is still on a place: keep it as the last one. */
  function hold(el: Element) {
    if (last && last.el === el) last.at = performance.now() / 1000;
  }

  window.addEventListener('resize', size);
  size();
  return {
    visit,
    hold,
    dispose() {
      window.removeEventListener('resize', size);
      thread = null;
    },
  };
}
