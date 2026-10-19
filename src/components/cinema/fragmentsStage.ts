import { formatDeg, MAP_HEIGHT, MAP_WIDTH, project, type IndiaGeo } from '../../geo/india';

/**
 * The map, in fragments — the moving stage (RegionFragments' wide, full-motion path).
 *
 * One 2D canvas, one camera, one sheet. The eight regions are cut out of the same ETOPO 2022 relief the opening
 * stood on, each along its key states, and kept as sprites; every frame lays them back on the sheet under a camera
 * that the scroll moves from region to region. Nothing in the drawing is decided by time except the air: the
 * position of the camera, the separation of the pieces, which piece stands up out of the sheet, where the light
 * comes from, which marks have surfaced and which labels are read — all of it is a function of the scroll's stop
 * position `s`, so scrolling back plays the same states in reverse and a jump lands on the state it would reach.
 *
 *   s = -1        the whole sheet, its eight regions numbered (the opening)
 *   s = 0 … 7     region `s` lifted to the middle of the frame, the camera down on it, its marks surfaced
 *   s = 8         the pieces back in place, every recorded locality on the sheet (the end)
 *
 * Between two stops the camera pulls back a little as it travels, so the country is glimpsed on the way, and it
 * looks across the sheet at a slight angle (a table, not a screen) that straightens as it arrives. The sun moves
 * from the north-east to the west-north-west across the whole run: two shadings of the relief, crossfaded — the
 * terrain's own shadows move, not a gradient laid over them.
 *
 * Pointer and keyboard are a second, lighter layer on top: a lamp that follows the pointer, a region that answers
 * hover or focus with an emerald edge and a lift, and a species that answers with its marks and their place names.
 * Those ease with time (a few hundred ms). The loop runs only while the stage is on screen (`setVisible`), and at
 * half rate when only the air is moving.
 */

export interface StageMark {
  x: number;
  y: number;
  species: string;
  /** The species' common name, for the names read on arrival. */
  name: string;
  color: string;
  label: string;
  /** A record from a captive or ex-situ population: drawn as a ring, not a solid mark (as the working map does). */
  captive: boolean;
}

export interface StageRegion {
  id: string;
  name: string;
  /** The region's key states, as the boundary file names them. */
  states: string[];
  /** The atlas' reference point for the region, lng/lat (data/regions.ts). */
  center: { lng: number; lat: number };
  marks: StageMark[];
}

export interface StageRelief {
  /** Two shadings of the same relief: light from the first stop's sun and from the last's. */
  a: HTMLCanvasElement;
  b: HTMLCanvasElement;
  /** Placement on the sheet, map units. */
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The stops: -1 (the whole sheet), 0…n-1 (the regions), n (whole again). */
export const stopCount = (regions: number) => regions + 2;

/**
 * Scroll progress (0…1) to the stop position. Each stop holds for a stretch of scroll (the dwell) and the camera
 * travels between them, so every region has a moment of near stillness in which its marks surface and its labels
 * are read; `raw` keeps moving through the dwell and drives the slow push-in that keeps it from freezing.
 */
export function stopAt(p: number, regions: number): { s: number; raw: number } {
  const segs = stopCount(regions) - 1;
  const g = Math.min(segs, Math.max(0, p * segs));
  const k = Math.min(segs - 1, Math.floor(g));
  const u = g - k;
  return { s: -1 + k + smooth(0.2, 0.8, u), raw: -1 + g };
}

/** The scroll progress at which a stop is centred. */
export const progressOf = (stop: number, regions: number) => (stop + 1) / (stopCount(regions) - 1);

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
function smooth(a: number, b: number, x: number) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** A 2D affine transform [a b c d e f], as canvas takes it. */
type M = [number, number, number, number, number, number];
const mul = (m: M, n: M): M => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
const T = (x: number, y: number): M => [1, 0, 0, 1, x, y];
const S = (x: number, y = x): M => [x, 0, 0, y, 0, 0];
const R = (r: number): M => [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0];
const apply = (m: M, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
function invert(m: M): M {
  const det = m[0] * m[3] - m[1] * m[2] || 1e-9;
  return [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det, (m[2] * m[5] - m[3] * m[4]) / det, (m[1] * m[4] - m[0] * m[5]) / det];
}

/** The sun at the first stop and at the last (azimuth clockwise from north, altitude), for the two shadings. */
export const LIGHT_A = { azimuth: 35, altitude: 30 };
export const LIGHT_B = { azimuth: 290, altitude: 27 };

const EMERALD = '111, 231, 170';
/** The page's own ground (--color-forest-950): the frame's edges fall into it, so the chapters either side meet it. */
const GROUND = '#0b0e0c';
const GROUND_RGB = '11, 14, 12';
const INK = '232, 225, 207';

interface Piece {
  r: StageRegion;
  path: Path2D;
  box: [number, number, number, number];
  cx: number;
  cy: number;
  /** Map units → sprite pixels. */
  res: number;
  pad: number;
  topA: HTMLCanvasElement | null;
  topB: HTMLCanvasElement | null;
  side: HTMLCanvasElement;
  shadow: HTMLCanvasElement;
  /** Its own slight turn and drift when the sheet comes apart. */
  turn: number;
  out: [number, number];
  /** Hover / focus, eased. */
  hover: number;
  hoverTo: number;
  /** Last frame's sheet → screen transform (CSS px), for hit-testing. */
  m: M;
}

interface Cam {
  cx: number;
  cy: number;
  zoom: number;
  ax: number;
  ay: number;
  tilt: number;
  turn: number;
}

function sprite(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

/** A soft, tileable fog: value noise in a few octaves, as alpha. Made once. */
function fogSprite(): HTMLCanvasElement {
  const n = 256;
  const c = sprite(n, n);
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  const img = ctx.createImageData(n, n);
  const lattice = (size: number, seed: number) => {
    const g = new Float32Array(size * size);
    let x = seed;
    for (let i = 0; i < g.length; i++) {
      x = (x * 1664525 + 1013904223) >>> 0;
      g[i] = x / 4294967296;
    }
    return g;
  };
  const octaves = [4, 8, 16].map((size, i) => ({ size, g: lattice(size, 97 + i * 31), w: [0.6, 0.28, 0.12][i] }));
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let v = 0;
      for (const o of octaves) {
        const fx = (x / n) * o.size;
        const fy = (y / n) * o.size;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const tx = fx - x0;
        const ty = fy - y0;
        const sx = tx * tx * (3 - 2 * tx);
        const sy = ty * ty * (3 - 2 * ty);
        const at = (i: number, j: number) => o.g[((j + o.size) % o.size) * o.size + ((i + o.size) % o.size)];
        const top = lerp(at(x0, y0), at(x0 + 1, y0), sx);
        const bot = lerp(at(x0, y0 + 1), at(x0 + 1, y0 + 1), sx);
        v += lerp(top, bot, sy) * o.w;
      }
      const a = smooth(0.42, 0.85, v);
      const i = (y * n + x) * 4;
      img.data[i] = 205;
      img.data[i + 1] = 230;
      img.data[i + 2] = 215;
      img.data[i + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export class FragmentsStage {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly probe: CanvasRenderingContext2D;
  private readonly pieces: Piece[];
  private readonly country: Path2D;
  private readonly countryBox: [number, number, number, number] = [0, 0, MAP_WIDTH, MAP_HEIGHT];
  private sheet: HTMLCanvasElement | null = null;
  private readonly fog: HTMLCanvasElement;
  private relief: StageRelief | null = null;
  private readonly graticule: Path2D;
  private w = 1;
  private h = 1;
  private dpr = 1;
  private readonly maxDpr: number;
  private s = -1;
  private raw = -1;
  private p = 0;
  private hot: { region: number; species: string } | null = null;
  private hotT = 0;
  private pointer = { x: 0.5, y: 0.5, on: 0, onTo: 0, sx: 0.5, sy: 0.5 };
  private frame = 0;
  private running = false;
  private visible = false;
  private t0 = performance.now();
  private reliefFade = 0;

  constructor(canvas: HTMLCanvasElement, geo: IndiaGeo, regions: StageRegion[], opts: { maxDpr: number; spriteRes: number }) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2D canvas unavailable');
    this.ctx = ctx;
    const probe = document.createElement('canvas').getContext('2d');
    if (!probe) throw new Error('2D canvas unavailable');
    this.probe = probe;
    this.maxDpr = opts.maxDpr;
    this.country = new Path2D(geo.all);
    this.fog = fogSprite();
    this.graticule = new Path2D();
    // A degree grid every 2°, the sheet's far plane: it moves less than the ground does, so the ground reads as lifted.
    // Wide enough that its ends never come into the frame, however far the camera pulls back.
    for (let lng = 40; lng <= 126; lng += 2) {
      const [x0, y0] = project(lng, -16);
      const [x1, y1] = project(lng, 58);
      this.graticule.moveTo(x0, y0);
      this.graticule.lineTo(x1, y1);
    }
    for (let lat = -16; lat <= 58; lat += 2) {
      const [x0, y0] = project(40, lat);
      const [x1, y1] = project(126, lat);
      this.graticule.moveTo(x0, y0);
      this.graticule.lineTo(x1, y1);
    }
    const [mx, my] = [MAP_WIDTH / 2, MAP_HEIGHT / 2];
    this.pieces = regions.map((r, i) => {
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      const path = new Path2D();
      for (const name of r.states) {
        const st = geo.byName.get(name);
        if (!st) continue;
        path.addPath(new Path2D(st.d));
        x0 = Math.min(x0, st.bounds[0]);
        y0 = Math.min(y0, st.bounds[1]);
        x1 = Math.max(x1, st.bounds[2]);
        y1 = Math.max(y1, st.bounds[3]);
      }
      if (!Number.isFinite(x0)) [x0, y0, x1, y1] = [0, 0, MAP_WIDTH, MAP_HEIGHT];
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      const dx = cx - mx;
      const dy = cy - my;
      const len = Math.hypot(dx, dy) || 1;
      const res = Math.min(opts.spriteRes, 1400 / Math.max(x1 - x0, y1 - y0));
      const pad = 6;
      const piece: Piece = {
        r,
        path,
        box: [x0, y0, x1, y1],
        cx,
        cy,
        res,
        pad,
        topA: null,
        topB: null,
        side: sprite(1, 1),
        shadow: sprite(1, 1),
        // Alternate a little either way, more for the pieces further out.
        turn: (i % 2 ? 1 : -1) * (0.012 + 0.018 * Math.min(1, len / 420)),
        out: [(dx / len) * Math.min(64, len * 0.15), (dy / len) * Math.min(64, len * 0.15)],
        hover: 0,
        hoverTo: 0,
        m: [1, 0, 0, 1, 0, 0],
      };
      this.bakeSilhouettes(piece);
      return piece;
    });
    this.resize();
  }

  /** The sheet's relief, in two lights. Until it lands the pieces are flat ground with their edges. */
  setRelief(relief: StageRelief) {
    this.relief = relief;
    this.sheet = this.bakeSheet(relief);
    for (const piece of this.pieces) {
      piece.topA = this.bakeTop(piece, relief.a);
      piece.topB = this.bakeTop(piece, relief.b);
    }
    this.reliefFade = 0;
    this.kick();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, rect.width);
    this.h = Math.max(1, rect.height);
    this.dpr = Math.min(this.maxDpr, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.kick();
  }

  setProgress(p: number) {
    const { s, raw } = stopAt(p, this.pieces.length);
    if (s === this.s && raw === this.raw) return;
    this.s = s;
    this.raw = raw;
    this.p = p;
    this.kick();
  }

  setVisible(v: boolean) {
    this.visible = v;
    if (v) this.kick();
    else {
      cancelAnimationFrame(this.frame);
      this.running = false;
    }
  }

  /** A region answering hover or focus (null: none). */
  setHover(region: number | null) {
    this.pieces.forEach((piece, i) => (piece.hoverTo = i === region ? 1 : 0));
    this.kick();
  }

  /** A species answering hover or focus in the region's list: its marks grow and are named. */
  setHot(hot: { region: number; species: string } | null) {
    if (hot) this.hot = hot;
    this.hotTarget = hot ? 1 : 0;
    this.kick();
  }
  private hotTarget = 0;
  /** This frame's reference-point readings (screen rects), which names on the ground step clear of. */
  private readonly reading: Array<[number, number, number, number]> = [];

  /** The pointer, in CSS px of the canvas (null: it left). */
  setPointer(x: number | null, y = 0) {
    if (x === null) {
      this.pointer.onTo = 0;
    } else {
      this.pointer.x = x / this.w;
      this.pointer.y = y / this.h;
      this.pointer.onTo = 1;
    }
    this.kick();
  }

  /** For the audit scripts: where the stage stands. */
  state() {
    return { s: this.s, raw: this.raw, p: this.p, hover: this.pieces.map((piece) => +piece.hover.toFixed(3)), relief: Boolean(this.relief), running: this.running };
  }

  /** The region under a point (CSS px of the canvas), front-most first; null where only sheet or air. */
  hit(x: number, y: number): number | null {
    const order = this.drawOrder();
    for (let k = order.length - 1; k >= 0; k--) {
      const piece = this.pieces[order[k]];
      const [mx, my] = apply(invert(piece.m), x, y);
      if (this.probe.isPointInPath(piece.path, mx, my)) return order[k];
    }
    return null;
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.running = false;
    for (const piece of this.pieces) {
      for (const c of [piece.topA, piece.topB, piece.side, piece.shadow]) if (c) c.width = c.height = 0;
    }
    if (this.sheet) this.sheet.width = this.sheet.height = 0;
    this.fog.width = this.fog.height = 0;
  }

  private kick() {
    this.lastInput = performance.now();
    if (this.running || !this.visible) return;
    this.running = true;
    this.frame = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    this.frame = 0;
    this.running = false;
    if (!this.visible) return;
    const dt = Math.min(0.1, (now - this.t0) / 1000);
    this.t0 = now;
    // Eased layers: hover, the hot species, the pointer's lamp, the relief arriving.
    const k = 1 - Math.exp(-dt * 9);
    let moving = false;
    for (const piece of this.pieces) {
      piece.hover += (piece.hoverTo - piece.hover) * k;
      if (Math.abs(piece.hoverTo - piece.hover) > 0.002) moving = true;
      else piece.hover = piece.hoverTo;
    }
    this.hotT += (this.hotTarget - this.hotT) * k;
    if (Math.abs(this.hotTarget - this.hotT) > 0.002) moving = true;
    else this.hotT = this.hotTarget;
    const pt = this.pointer;
    pt.on += (pt.onTo - pt.on) * k;
    const kp = 1 - Math.exp(-dt * 5);
    pt.sx += (pt.x - pt.sx) * kp;
    pt.sy += (pt.y - pt.sy) * kp;
    if (Math.abs(pt.onTo - pt.on) > 0.002 || Math.abs(pt.x - pt.sx) > 0.0005 || Math.abs(pt.y - pt.sy) > 0.0005) moving = true;
    if (this.relief && this.reliefFade < 1) {
      this.reliefFade = Math.min(1, this.reliefFade + dt * 1.6);
      moving = true;
    }
    // While the stage is on screen the air keeps drifting; with nothing else moving it is drawn every other frame.
    const idle = !moving && now - this.lastInput > 600;
    this.skip = idle && !this.skip;
    if (!this.skip) this.draw(now / 1000);
    this.running = true;
    this.frame = requestAnimationFrame(this.tick);
  };
  private skip = false;
  private lastInput = 0;

  /** Pieces from the lowest to the most lifted (the hovered and the current last). */
  private drawOrder(): number[] {
    return this.pieces
      .map((piece, i) => ({ i, z: this.lift(i) + piece.hover * 0.3 }))
      .sort((a, b) => a.z - b.z)
      .map((o) => o.i);
  }

  /** How apart the sheet is: 0 whole (the opening and the end), 1 in pieces. */
  private apart() {
    const n = this.pieces.length;
    return smooth(-1, -0.4, this.s) * (1 - smooth(n - 1.4, n, this.s));
  }

  /** How much region i is the one in the middle (1 at its stop). */
  private at(i: number) {
    return smooth(0, 1, 1 - Math.abs(this.s - i));
  }

  private lift(i: number) {
    return 0.2 * this.apart() + 0.8 * this.at(i);
  }

  /** The camera at a stop. */
  private camAt(stop: number): Cam {
    const n = this.pieces.length;
    const { w, h } = this;
    const whole = stop < 0 || stop >= n;
    const [x0, y0, x1, y1] = whole ? this.countryBox : this.pieces[stop].box;
    // The text holds the left of the frame; the ground the right.
    const boxW = w * (whole ? 0.5 : 0.48);
    const boxH = h * (whole ? 0.84 : 0.62);
    const zoom = Math.min(boxW / (x1 - x0), boxH / (y1 - y0), whole ? Infinity : (h / MAP_HEIGHT) * 3.2);
    return {
      cx: (x0 + x1) / 2,
      cy: (y0 + y1) / 2,
      zoom,
      ax: w * (whole ? 0.66 : 0.66),
      ay: h * 0.5,
      // Across the sheet at an angle while whole; straight down on a region.
      tilt: whole ? 0.86 : 0.97,
      turn: whole ? -0.06 : (stop % 2 ? 0.025 : -0.025),
    };
  }

  private camera(): Cam {
    const s = this.s;
    const k = Math.min(this.pieces.length - 1 + 1, Math.max(-1, Math.floor(s)));
    const u = s - k;
    const a = this.camAt(k);
    const b = u > 0 ? this.camAt(k + 1) : a;
    // Travelling, the camera pulls back by as much as the distance it has to cover. It rises early and glides down
    // onto the next stop: the pull-back peaks before half-way, so the arrival is the longer, slower part of the flight.
    const dist = Math.hypot((b.cx - a.cx) * Math.min(a.zoom, b.zoom), (b.cy - a.cy) * Math.min(a.zoom, b.zoom));
    const dip = Math.min(0.42, (dist / Math.max(this.w, 1)) * 0.38) * Math.sin(Math.PI * Math.pow(u, 0.72));
    const cam: Cam = {
      cx: lerp(a.cx, b.cx, u),
      cy: lerp(a.cy, b.cy, u),
      zoom: Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom), u)) * (1 - dip),
      ax: lerp(a.ax, b.ax, u),
      ay: lerp(a.ay, b.ay, u),
      tilt: lerp(a.tilt, b.tilt, u) - dip * 0.12,
      turn: lerp(a.turn, b.turn, u),
    };
    // Through a stop's dwell the scroll still moves: the camera keeps settling in, a slow push and a little drift.
    const drift = this.raw - s;
    cam.zoom *= 1 + drift * 0.16;
    cam.turn += drift * 0.03;
    // The pointer leans the view a few pixels (desktop only; touch never sets it).
    cam.ax += (this.pointer.sx - 0.5) * -14 * this.pointer.on;
    cam.ay += (this.pointer.sy - 0.5) * -10 * this.pointer.on;
    return cam;
  }

  private camMatrix(c: Cam, parallax = 1): M {
    const z = c.zoom * parallax;
    return mul(mul(mul(mul(T(c.ax, c.ay), S(1, c.tilt)), R(c.turn)), S(z)), T(-c.cx, -c.cy));
  }

  private draw(time: number) {
    const { ctx, w, h, dpr } = this;
    const n = this.pieces.length;
    const cam = this.camera();
    const camM = this.camMatrix(cam);
    const screen = S(dpr);
    const apart = this.apart();
    const lightMix = smooth(0.05, 0.95, this.p);
    const fade = this.reliefFade;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = GROUND;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // The far plane: a degree grid, moving less than the ground.
    ctx.setTransform(...mul(screen, this.camMatrix(cam, 0.82)));
    ctx.lineWidth = 1 / (cam.zoom * 0.82);
    ctx.strokeStyle = `rgba(${EMERALD}, 0.055)`;
    ctx.stroke(this.graticule);

    // The sheet the pieces are cut from: dark, its relief faint, so a piece lifted off it leaves its place visible.
    ctx.setTransform(...mul(screen, camM));
    if (this.sheet && this.relief) {
      ctx.globalAlpha = 0.9;
      ctx.drawImage(this.sheet, 0, 0, MAP_WIDTH, MAP_HEIGHT);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = '#0c130f';
      ctx.fill(this.country);
    }

    // With a region in the middle, the rest of the room goes down: the sheet and the far plane sink toward the
    // ground, so the piece that has the light is the brightest thing in the frame.
    const focus = apart * Math.max(...this.pieces.map((_, i) => this.at(i)));
    if (focus > 0.01) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 0.42 * focus;
      ctx.fillStyle = GROUND;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.globalAlpha = 1;
    }

    const order = this.drawOrder();
    const lightAz = lerp(LIGHT_A.azimuth, LIGHT_B.azimuth > LIGHT_A.azimuth ? LIGHT_B.azimuth : LIGHT_B.azimuth - 360, lightMix);
    // Shadows fall away from the sun (screen y is south).
    const shAng = ((lightAz + 180) * Math.PI) / 180;
    const shDir: [number, number] = [Math.sin(shAng), -Math.cos(shAng)];
    const anyHover = Math.max(...this.pieces.map((piece) => piece.hover));

    for (const i of order) {
      const piece = this.pieces[i];
      const at = this.at(i);
      // Arriving, the piece rises a little past its height and settles as the camera lands (and the reverse going).
      const settle = 0.24 * Math.sin(Math.PI * smooth(0.45, 1, at)) * apart;
      const z = this.lift(i) + piece.hover * 0.22 + settle;
      const liftPx = z * 26;
      // Apart, the pieces away from the middle sink a little below the sheet's plane; the current one stands up.
      const scale = 1 + z * 0.035 + piece.hover * 0.012 - apart * (1 - at) * 0.02;
      const turn = piece.turn * apart * (1 - at);
      const ox = piece.out[0] * apart * (1 - 0.5 * at);
      const oy = piece.out[1] * apart * (1 - 0.5 * at);
      // Sheet → piece: turn and grow about its own middle, drift outward; then lifted, in screen space.
      const local = mul(mul(mul(mul(T(piece.cx + ox, piece.cy + oy), R(turn)), S(scale)), T(-piece.cx, -piece.cy)), [1, 0, 0, 1, 0, 0]);
      const onSheet = mul(camM, local);
      const top = mul(T(0, -liftPx), onSheet);
      piece.m = top;
      // Whole (the opening, the end) every piece is full; apart, the pieces away from the middle recede.
      const presence = Math.max(at, 1 - apart);
      const alpha = (0.2 + 0.8 * presence) * (anyHover > 0.01 && piece.hover < anyHover ? 1 - 0.22 * anyHover : 1);

      // Its shadow on the sheet, offset away from the sun by its height.
      if (z > 0.02) {
        const sh = mul(T(shDir[0] * liftPx * 0.9, shDir[1] * liftPx * 0.9 + liftPx * 0.25), onSheet);
        ctx.setTransform(...mul(screen, sh));
        ctx.globalAlpha = Math.min(0.75, z * 0.9);
        ctx.drawImage(piece.shadow, piece.box[0] - piece.pad * 4, piece.box[1] - piece.pad * 4, piece.box[2] - piece.box[0] + piece.pad * 8, piece.box[3] - piece.box[1] + piece.pad * 8);
      }
      // Its thickness: the cut's side, seen below the top as it lifts.
      const sx = piece.box[0] - piece.pad / piece.res;
      const sy = piece.box[1] - piece.pad / piece.res;
      const sw = piece.box[2] - piece.box[0] + (2 * piece.pad) / piece.res;
      const shh = piece.box[3] - piece.box[1] + (2 * piece.pad) / piece.res;
      if (z > 0.02) {
        ctx.globalAlpha = alpha;
        for (const f of [0.35, 0.7]) {
          ctx.setTransform(...mul(screen, mul(T(0, -liftPx * (1 - f) + 1.5), onSheet)));
          ctx.drawImage(piece.side, sx, sy, sw, shh);
        }
      }
      ctx.setTransform(...mul(screen, top));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#18241c';
      ctx.fill(piece.path);
      if (piece.topA && piece.topB) {
        ctx.globalAlpha = alpha * fade;
        ctx.drawImage(piece.topA, sx, sy, sw, shh);
        ctx.globalAlpha = alpha * fade * lightMix;
        ctx.drawImage(piece.topB, sx, sy, sw, shh);
        // The piece in the middle takes the light: its own relief added back, for local contrast.
        if (at * apart > 0.01) {
          ctx.globalCompositeOperation = 'overlay';
          ctx.globalAlpha = at * apart * 0.45 * fade;
          ctx.drawImage(lightMix > 0.5 ? piece.topB : piece.topA, sx, sy, sw, shh);
          ctx.globalCompositeOperation = 'source-over';
          // And the sun finds it: a pool of light on its sunward half that falls off across the ground, laid over
          // the relief (soft-light keeps the relief's own shading), with its far side in shade. On the ground only.
          const lit = at * apart * fade;
          const [pcx, pcy] = apply(top, piece.cx, piece.cy);
          const span = 0.5 * Math.hypot(piece.box[2] - piece.box[0], piece.box[3] - piece.box[1]) * cam.zoom * scale;
          const [lx, ly] = [pcx - shDir[0] * span * 0.6, pcy - shDir[1] * span * 0.6];
          ctx.save();
          ctx.clip(piece.path);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          const pool = ctx.createRadialGradient(lx, ly, 0, lx, ly, span * 1.7);
          pool.addColorStop(0, 'rgba(255, 238, 200, 1)');
          pool.addColorStop(0.45, 'rgba(236, 228, 196, 0.45)');
          pool.addColorStop(1, 'rgba(236, 228, 196, 0)');
          ctx.globalCompositeOperation = 'soft-light';
          ctx.globalAlpha = 0.85 * lit;
          ctx.fillStyle = pool;
          ctx.fillRect(pcx - span * 3, pcy - span * 3, span * 6, span * 6);
          const shade = ctx.createLinearGradient(lx, ly, pcx + shDir[0] * span, pcy + shDir[1] * span);
          shade.addColorStop(0, 'rgba(255, 255, 255, 1)');
          shade.addColorStop(1, 'rgba(120, 140, 128, 1)');
          ctx.globalCompositeOperation = 'multiply';
          ctx.globalAlpha = 0.5 * lit;
          ctx.fillStyle = shade;
          ctx.fillRect(pcx - span * 3, pcy - span * 3, span * 6, span * 6);
          ctx.restore();
        }
        // Hover: the piece itself brightens, a little toward emerald.
        if (piece.hover > 0.005) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = piece.hover * 0.09 * fade;
          ctx.drawImage(lightMix > 0.5 ? piece.topB : piece.topA, sx, sy, sw, shh);
          ctx.globalCompositeOperation = 'soft-light';
          ctx.globalAlpha = piece.hover * 0.2;
          ctx.fillStyle = `rgb(${EMERALD})`;
          ctx.fill(piece.path);
          ctx.globalCompositeOperation = 'source-over';
        }
      }
      // The cut's edge: the contour line of the sheet, emerald where the region is answering.
      const px = 1 / (cam.zoom * scale);
      ctx.globalAlpha = 1;
      if (piece.hover > 0.01) {
        ctx.lineWidth = 7 * px;
        ctx.strokeStyle = `rgba(${EMERALD}, ${(0.16 * piece.hover).toFixed(3)})`;
        ctx.stroke(piece.path);
      }
      ctx.lineWidth = (0.8 + 0.7 * Math.max(at, piece.hover)) * px;
      ctx.strokeStyle =
        piece.hover > 0.01 || at * apart > 0.01
          ? `rgba(${EMERALD}, ${(0.12 + 0.5 * at * apart + 0.5 * piece.hover).toFixed(3)})`
          : `rgba(176, 122, 82, ${(0.18 + 0.5 * (1 - apart)).toFixed(3)})`;
      ctx.stroke(piece.path);

      // The region's localities surface one after another as it arrives; the end puts every one back on the sheet.
      const surfacing = smooth(0.35, 1, at);
      const whole = smooth(n - 0.6, n, this.s);
      const show = Math.max(surfacing, whole);
      if (show > 0.001) {
        const m = piece.r.marks;
        const r0 = 4.2 * px;
        for (let j = 0; j < m.length; j++) {
          const mk = m[j];
          const delay = m.length > 1 ? (j / (m.length - 1)) * 0.55 : 0;
          const t = Math.max(clamp01((surfacing - delay) / 0.45), whole);
          if (t <= 0) continue;
          const isHot = this.hot && this.hot.region === i && this.hot.species === mk.species ? this.hotT : 0;
          const back = this.hot && this.hot.region === i && !isHot ? this.hotT : 0;
          const rad = r0 * (0.4 + 0.6 * t) * (1 + isHot * 0.7);
          ctx.globalAlpha = t * (1 - back * 0.7);
          // A ring that opens as the mark surfaces and settles to a halo.
          ctx.beginPath();
          ctx.arc(mk.x, mk.y, rad * (1 + 2.2 * (1 - t) + isHot * 0.8), 0, Math.PI * 2);
          ctx.lineWidth = px;
          ctx.strokeStyle = mk.color;
          ctx.globalAlpha = t * (0.25 + 0.5 * (1 - t) + isHot * 0.4) * (1 - back * 0.7);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(mk.x, mk.y, rad, 0, Math.PI * 2);
          ctx.globalAlpha = t * (1 - back * 0.7);
          ctx.fillStyle = mk.captive ? 'rgba(6, 10, 8, 0.85)' : mk.color;
          ctx.fill();
          ctx.lineWidth = (mk.captive ? 1.6 : 1.2) * px;
          ctx.strokeStyle = mk.captive ? mk.color : 'rgba(6, 10, 8, 0.85)';
          ctx.stroke();
        }
      }
    }

    // Screen space from here: labels, light, air.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;

    // The opening: the regions numbered where they sit, fading as the sheet comes apart.
    const numbers = (1 - apart) * (1 - smooth(n - 1, n, this.s));
    if (numbers > 0.01) {
      ctx.font = '500 11px "Geist Mono", ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      this.pieces.forEach((piece, i) => {
        const [lx, ly] = project(piece.r.center.lng, piece.r.center.lat);
        const [x, y] = apply(piece.m, lx, ly);
        ctx.globalAlpha = numbers;
        ctx.beginPath();
        ctx.arc(x, y, 13, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(8, 12, 10, 0.82)';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = piece.hover > 0.01 ? `rgba(${EMERALD}, 0.9)` : 'rgba(176, 122, 82, 0.9)';
        ctx.stroke();
        ctx.fillStyle = `rgb(${INK})`;
        ctx.fillText(String(i + 1).padStart(2, '0'), x, y + 0.5);
      });
    }

    // The current region's reference point: a crosshair and its coordinates, read once the camera has arrived.
    this.reading.length = 0;
    this.pieces.forEach((piece, i) => {
      const read = Math.max(smooth(0.6, 0.95, this.at(i)) * apart, smooth(0.6, 0.95, piece.hover) * 0.85);
      if (read < 0.01) return;
      const [lx, ly] = project(piece.r.center.lng, piece.r.center.lat);
      const [x, y] = apply(piece.m, lx, ly);
      const lead = 46 * read;
      ctx.globalAlpha = read;
      ctx.strokeStyle = `rgba(${EMERALD}, 0.75)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 7, y);
      ctx.lineTo(x + 7, y);
      ctx.moveTo(x, y - 7);
      ctx.lineTo(x, y + 7);
      ctx.moveTo(x + 10, y - 10);
      ctx.lineTo(x + 10 + lead, y - 10 - lead * 0.55);
      ctx.stroke();
      ctx.font = '500 10px "Geist Mono", ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = `rgba(${INK}, 0.92)`;
      const tx = x + 14 + lead;
      const ty = y - 12 - lead * 0.55;
      ctx.fillText(piece.r.name.toUpperCase(), tx, ty - 13);
      ctx.fillStyle = `rgba(${EMERALD}, 0.9)`;
      const coords = `${formatDeg(piece.r.center.lat, 'lat')}  ${formatDeg(piece.r.center.lng, 'lng')}  ·  REFERENCE POINT`;
      ctx.fillText(coords, tx, ty);
      // Names placed on the ground step clear of the reading and of the crosshair.
      const tw = Math.max(ctx.measureText(coords).width, ctx.measureText(piece.r.name.toUpperCase()).width);
      this.reading.push([tx - 4, ty - 25, tw + 8, 31], [x - 11, y - 11, 22, 22]);
    });

    // Arrived, the region's species are named on the ground, once each at the recorded locality nearest the region's
    // reference point (always in the frame at its stop), so no mark is a dot without a name. A species picked in the list takes over: its places are named.
    this.pieces.forEach((piece, i) => {
      const named = smooth(0.82, 1, this.at(i)) * apart * (1 - (this.hot?.region === i ? this.hotT : 0));
      if (named < 0.01) return;
      const seen = new Set<string>();
      const [rx, ry] = project(piece.r.center.lng, piece.r.center.lat);
      const items = [...piece.r.marks]
        .sort((a, b) => Math.hypot(a.x - rx, a.y - ry) - Math.hypot(b.x - rx, b.y - ry))
        .filter((mk) => !seen.has(mk.species) && seen.add(mk.species))
        .map((mk) => ({ at: apply(piece.m, mk.x, mk.y), text: mk.name }));
      this.labelMarks(items, named, false);
    });

    // The hot species' places, named beside their marks.
    if (this.hot && this.hotT > 0.01) {
      const piece = this.pieces[this.hot.region];
      const seen = new Set<string>();
      const items = piece.r.marks
        .filter((mk) => mk.species === this.hot!.species && !seen.has(mk.label) && seen.add(mk.label))
        .map((mk) => ({ at: apply(piece.m, mk.x, mk.y), text: mk.label }));
      this.labelMarks(items, this.hotT, true);
    }

    // The flight. Leaving a region, a line runs out ahead of the camera from the reference point it leaves toward the
    // one it is flying to, and the destination is named and ringed before the camera gets there; as the camera lands
    // the line draws back into it and the ring closes onto the crosshair. Every flight has a heading and an arrival.
    // The line is the camera's path between two reference points, not a route anything travels: it exists only in
    // flight and is gone at every stop.
    const leg = Math.floor(this.s);
    const u = this.s - leg;
    if (u > 0.002 && leg + 1 <= n - 1) {
      const to = this.pieces[leg + 1];
      const [bx, by] = apply(to.m, ...project(to.r.center.lng, to.r.center.lat));
      const arrived = smooth(0.6, 0.95, this.at(leg + 1)) * apart;
      if (leg >= 0) {
        const from = this.pieces[leg];
        const [ax, ay] = apply(from.m, ...project(from.r.center.lng, from.r.center.lat));
        const head = smooth(0.04, 0.62, u);
        const tail = smooth(0.42, 0.96, u);
        if (head - tail > 0.004) {
          const [hx, hy] = [lerp(ax, bx, head), lerp(ay, by, head)];
          ctx.globalAlpha = 1;
          ctx.lineWidth = 1;
          ctx.strokeStyle = `rgba(${EMERALD}, 0.75)`;
          ctx.setLineDash([2, 5]);
          ctx.lineDashOffset = -u * 80;
          ctx.beginPath();
          ctx.moveTo(lerp(ax, bx, tail), lerp(ay, by, tail));
          ctx.lineTo(hx, hy);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = `rgb(${EMERALD})`;
          ctx.beginPath();
          ctx.arc(hx, hy, 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      const tag = smooth(0.06, 0.3, u) * (1 - arrived);
      if (tag > 0.01) {
        ctx.globalAlpha = tag;
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(${EMERALD}, 0.8)`;
        ctx.beginPath();
        ctx.arc(bx, by, 7 + 16 * (1 - smooth(0.3, 0.95, u)), 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = '500 10px "Geist Mono", ui-monospace, monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        const text = `${String(leg + 2).padStart(2, '0')}  ${to.r.name.toUpperCase()}`;
        // Kept inside the frame while the destination is still near its edge.
        const tx = Math.min(w - 24 - ctx.measureText(text).width, Math.max(24, bx + 30));
        const ty = Math.min(h - 80, Math.max(80, by - 26));
        ctx.fillStyle = `rgba(${INK}, 0.92)`;
        ctx.fillText(text, tx, ty);
      }
    }

    // The light: a broad wash from the sun's side of the frame, so the frame itself is lit from where the relief is.
    const az = (lightAz * Math.PI) / 180;
    const lx = w / 2 + Math.sin(az) * w * 0.7;
    const ly = h / 2 - Math.cos(az) * h * 0.7;
    const wash = ctx.createLinearGradient(lx, ly, w - lx, h - ly);
    wash.addColorStop(0, 'rgba(214, 196, 150, 0.22)');
    wash.addColorStop(0.5, 'rgba(40, 90, 64, 0.0)');
    wash.addColorStop(1, 'rgba(0, 18, 10, 0.5)');
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = 1;
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);

    // The pointer's lamp: a soft emerald-white light where the reader is looking.
    if (this.pointer.on > 0.01) {
      const px = this.pointer.sx * w;
      const py = this.pointer.sy * h;
      const rad = Math.max(w, h) * 0.28;
      const lamp = ctx.createRadialGradient(px, py, 0, px, py, rad);
      lamp.addColorStop(0, `rgba(190, 255, 220, ${(0.36 * this.pointer.on).toFixed(3)})`);
      lamp.addColorStop(1, 'rgba(190, 255, 220, 0)');
      ctx.fillStyle = lamp;
      ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    }
    ctx.globalCompositeOperation = 'source-over';

    // The air: two sheets of fog at different heights, drifting with time and moving faster than the ground (the near
    // plane), thicker while the camera travels.
    const travel = Math.sin(Math.PI * (this.s - Math.floor(this.s)));
    const fogA = 0.05 + 0.07 * travel;
    for (const [i, layer] of [
      [0, { par: 1.25, speed: 6, size: 1.6, alpha: fogA }],
      [1, { par: 1.6, speed: -4, size: 2.4, alpha: fogA * 0.7 }],
    ] as const) {
      const size = Math.max(w, h) * layer.size;
      const wrap = (v: number) => ((v % size) + size) % size;
      const ox = wrap(-cam.cx * cam.zoom * layer.par * 0.35 + time * layer.speed + i * 300);
      const oy = wrap(-cam.cy * cam.zoom * layer.par * 0.2);
      ctx.globalAlpha = layer.alpha;
      ctx.globalCompositeOperation = 'screen';
      for (let x = ox - size; x < w; x += size) for (let y = oy - size; y < h; y += size) ctx.drawImage(this.fog, x, y, size, size);
    }
    ctx.globalCompositeOperation = 'source-over';

    // The frame's edges fall into the dark.
    const vig = ctx.createRadialGradient(w * 0.6, h * 0.5, Math.min(w, h) * 0.3, w * 0.55, h * 0.5, Math.max(w, h) * 0.78);
    vig.addColorStop(0, `rgba(${GROUND_RGB}, 0)`);
    vig.addColorStop(1, `rgba(${GROUND_RGB}, 0.9)`);
    ctx.globalAlpha = 1;
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
    // And its top and foot, so the frame arrives and leaves as a depth of the page, not a box.
    const edge = ctx.createLinearGradient(0, 0, 0, h);
    edge.addColorStop(0, `rgba(${GROUND_RGB}, 1)`);
    edge.addColorStop(0.1, `rgba(${GROUND_RGB}, 0)`);
    edge.addColorStop(0.86, `rgba(${GROUND_RGB}, 0)`);
    edge.addColorStop(1, `rgba(${GROUND_RGB}, 0.95)`);
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, w, h);
  }

  /**
   * Names beside marks (screen space). Placed top to bottom; a name that would sit on one already placed steps down
   * below it, with a leader. Boxed names (a species' places) sit on a dark tab; unboxed (the species read on arrival)
   * are quieter, the ground showing through.
   */
  private labelMarks(items: Array<{ at: [number, number]; text: string }>, alpha: number, boxed: boolean) {
    const { ctx } = this;
    ctx.font = boxed ? '400 11px "Geist", ui-sans-serif, sans-serif' : '400 10.5px "Geist", ui-sans-serif, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const placed: Array<[number, number, number, number]> = [...this.reading];
    for (const { at, text } of [...items].sort((a, b) => a.at[1] - b.at[1])) {
      const [x, y] = at;
      const tw = ctx.measureText(text).width;
      let ly = y;
      for (const r of placed) if (x + 11 < r[0] + r[2] && x + 21 + tw > r[0] && ly - 9 < r[1] + r[3] && ly + 9 > r[1]) ly = r[1] + r[3] + 11;
      placed.push([x + 11, ly - 9, tw + 10, 18]);
      ctx.globalAlpha = alpha;
      if (ly !== y) {
        ctx.strokeStyle = `rgba(${INK}, 0.5)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 5, y);
        ctx.lineTo(x + 11, ly);
        ctx.stroke();
      }
      if (boxed) {
        ctx.fillStyle = `rgba(${GROUND_RGB}, 0.78)`;
        ctx.fillRect(x + 11, ly - 9, tw + 10, 18);
        ctx.fillStyle = `rgb(${INK})`;
      } else {
        ctx.fillStyle = `rgba(${GROUND_RGB}, 0.5)`;
        ctx.fillRect(x + 12, ly - 7, tw + 8, 14);
        ctx.fillStyle = `rgba(${INK}, 0.82)`;
      }
      ctx.fillText(text, x + 16, ly + 0.5);
    }
  }

  /** The cut's solid shape (for the side) and its blurred shadow, baked once. */
  private bakeSilhouettes(piece: Piece) {
    const [x0, y0, x1, y1] = piece.box;
    const res = piece.res;
    const side = sprite((x1 - x0) * res + 2 * piece.pad, (y1 - y0) * res + 2 * piece.pad);
    const sctx = side.getContext('2d');
    if (sctx) {
      sctx.setTransform(res, 0, 0, res, -x0 * res + piece.pad, -y0 * res + piece.pad);
      sctx.fillStyle = '#07120c';
      sctx.fill(piece.path);
      sctx.lineWidth = 1.2 / res;
      sctx.strokeStyle = 'rgba(111, 231, 170, 0.12)';
      sctx.stroke(piece.path);
    }
    piece.side = side;
    // The shadow at a quarter of the resolution, blurred; drawn with a margin of 4 × pad map units around the box.
    const q = Math.min(0.5, res * 0.25);
    const m = piece.pad * 4;
    const shadow = sprite((x1 - x0 + 2 * m) * q, (y1 - y0 + 2 * m) * q);
    const hctx = shadow.getContext('2d');
    if (hctx) {
      hctx.filter = `blur(${Math.max(2, 7 * q).toFixed(1)}px)`;
      hctx.setTransform(q, 0, 0, q, (-x0 + m) * q, (-y0 + m) * q);
      hctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
      hctx.fill(piece.path);
    }
    piece.shadow = shadow;
  }

  /** A piece's top in one light: the relief cut along its states and graded — deep shadow, forest midtones. */
  private bakeTop(piece: Piece, relief: HTMLCanvasElement): HTMLCanvasElement | null {
    if (!this.relief) return null;
    const [x0, y0, x1, y1] = piece.box;
    const res = piece.res;
    const c = sprite((x1 - x0) * res + 2 * piece.pad, (y1 - y0) * res + 2 * piece.pad);
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.setTransform(res, 0, 0, res, -x0 * res + piece.pad, -y0 * res + piece.pad);
    ctx.save();
    ctx.clip(piece.path);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(relief, this.relief.x, this.relief.y, this.relief.w, this.relief.h);
    this.grade(ctx, piece.path);
    ctx.restore();
    return c;
  }

  /** The sheet itself, in the first light, dim: what the pieces leave behind and the states no region names. */
  private bakeSheet(relief: StageRelief): HTMLCanvasElement {
    const res = 1.1;
    const c = sprite(MAP_WIDTH * res, MAP_HEIGHT * res);
    const ctx = c.getContext('2d');
    if (!ctx) return c;
    ctx.setTransform(res, 0, 0, res, 0, 0);
    ctx.fillStyle = '#0a110d';
    ctx.fill(this.country);
    ctx.save();
    ctx.clip(this.country);
    ctx.globalAlpha = 0.3;
    ctx.drawImage(relief.a, relief.x, relief.y, relief.w, relief.h);
    ctx.globalAlpha = 1;
    this.grade(ctx, this.country);
    ctx.restore();
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = 'rgba(140, 190, 160, 0.1)';
    ctx.stroke(this.country);
    return c;
  }

  /** The colour grade: hue pulled toward forest green, keeping the relief's own values; the darks deepened. */
  private grade(ctx: CanvasRenderingContext2D, path: Path2D) {
    ctx.globalCompositeOperation = 'color';
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#2f7a55';
    ctx.fill(path);
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#1d3a2b';
    ctx.fill(path);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
}
