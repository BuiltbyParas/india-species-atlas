import { MAP_HEIGHT, MAP_WIDTH, project } from '../geo/india';

/**
 * The atlas's camera, on the flat sheet.
 *
 * Every drawn map on the site shares one projection (`geo/india.ts`), so a
 * single camera can describe what any of them is looking at: a centre on the
 * sheet and how much of the sheet is in view. Two pages that both show
 * geography can therefore hand the view from one to the other — the atlas
 * map's framing becomes the first frame of the journey to a species, and the
 * journey's last frame is where the species page's map is looking.
 *
 * Units are the sheet's own (`MAP_WIDTH` across), not pixels or degrees, so a
 * camera means the same thing at any screen size.
 */
export interface GeoCam {
  /** Centre on the sheet, in map units. */
  x: number;
  y: number;
  /** Width of sheet in view, in map units. Smaller is closer. */
  w: number;
}

/** The whole country, centred on the sheet. */
export const INDIA_CAM: GeoCam = { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2, w: MAP_WIDTH * 1.04 };

/**
 * A region around a locality: about seven degrees of longitude, which on this
 * sheet is a landscape — the Thar, the Terai, a stretch of the Ghats — rather
 * than a single reserve. Close enough to read the place; far enough that the
 * states of record stay in the frame.
 */
export const REGION_W = 230;

export function camAt(lng: number, lat: number, w = REGION_W): GeoCam {
  const [x, y] = project(lng, lat);
  return { x, y, w };
}

/** A camera that fits a sheet-unit box into a viewport of the given aspect (width / height). */
export function fitCam(box: [number, number, number, number], aspect: number, pad = 0.08): GeoCam {
  const [x0, y0, x1, y1] = box;
  const bw = (x1 - x0) * (1 + pad * 2);
  const bh = (y1 - y0) * (1 + pad * 2);
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: Math.max(bw, bh * aspect) };
}

/** The SVG viewBox a camera produces in a viewport of the given aspect. */
export function viewBoxOf(cam: GeoCam, aspect: number): string {
  const h = cam.w / aspect;
  return `${(cam.x - cam.w / 2).toFixed(2)} ${(cam.y - h / 2).toFixed(2)} ${cam.w.toFixed(2)} ${h.toFixed(2)}`;
}

/** Where a sheet point lands on screen, inside a viewport rect, under a camera. */
export function toScreen(
  cam: GeoCam,
  rect: { left: number; top: number; width: number; height: number },
  px: number,
  py: number,
): [number, number] {
  const k = rect.width / cam.w;
  return [rect.left + rect.width / 2 + (px - cam.x) * k, rect.top + rect.height / 2 + (py - cam.y) * k];
}

/**
 * A camera move between two framings, as a cartographer would want it read.
 *
 * This is van Wijk and Nuij's "smooth and efficient zooming and panning"
 * (2003) — the same path d3's `interpolateZoom` takes. For a short hop it is
 * a glide; for a long one the camera rises to see both places, travels, and
 * comes down again, so the reader is shown how far apart they are. The
 * move's natural duration grows with that distance, which is what the
 * journey uses to pace itself: scale and distance are said by the camera,
 * not by a caption.
 */
export interface CamPath {
  (t: number): GeoCam;
  /** Natural duration of the move in milliseconds (before any clamp). */
  duration: number;
}

const RHO = Math.SQRT2;
const RHO2 = 2;
const RHO4 = 4;
const EPS = 1e-12;

export function camPath(a: GeoCam, b: GeoCam): CamPath {
  const { x: ux0, y: uy0, w: w0 } = a;
  const { x: ux1, y: uy1, w: w1 } = b;
  const dx = ux1 - ux0;
  const dy = uy1 - uy0;
  const d2 = dx * dx + dy * dy;
  let S: number;
  let f: (t: number) => GeoCam;

  if (d2 < EPS) {
    // Same centre: only the scale changes.
    S = Math.log(w1 / w0) / RHO;
    f = (t) => ({ x: ux0 + t * dx, y: uy0 + t * dy, w: w0 * Math.exp(RHO * t * S) });
  } else {
    const d1 = Math.sqrt(d2);
    const b0 = (w1 * w1 - w0 * w0 + RHO4 * d2) / (2 * w0 * RHO2 * d1);
    const b1 = (w1 * w1 - w0 * w0 - RHO4 * d2) / (2 * w1 * RHO2 * d1);
    const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
    const r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
    S = (r1 - r0) / RHO;
    const cr0 = Math.cosh(r0);
    const sr0 = Math.sinh(r0);
    f = (t) => {
      const s = t * S;
      const u = (w0 / (RHO2 * d1)) * (cr0 * Math.tanh(RHO * s + r0) - sr0);
      return { x: ux0 + u * dx, y: uy0 + u * dy, w: (w0 * cr0) / Math.cosh(RHO * s + r0) };
    };
  }
  const path = ((t: number) => (t >= 1 ? { ...b } : t <= 0 ? { ...a } : f(t))) as CamPath;
  path.duration = Math.abs(S) * 1000;
  return path;
}
