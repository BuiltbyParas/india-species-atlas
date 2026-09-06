/**
 * Species "specimen plates" for the hero scene.
 *
 * Each of the twelve species gets one plate: a small card carrying its profile
 * silhouette, drawn once into a single canvas atlas and uploaded as one
 * texture. The plates are then rendered as camera-facing quads in world space
 * at the species' anchor locality, so they fog, sort and parallax with the
 * terrain the way the occurrence markers already do.
 *
 * The atlas is built with 2D canvas rather than shipped as an image for the
 * same reason the terrain is generated from GeoJSON rather than loaded as a
 * model: no asset to fetch, nothing to keep in sync, and the status colours
 * come straight from the palette the rest of the site uses.
 *
 * Typography deliberately does *not* live in here. Names and IUCN categories
 * are rendered as real DOM text anchored to each plate's projected position —
 * canvas text at this size would be soft under the depth-of-field pass, would
 * cost several megabytes of atlas to keep crisp, and would be invisible to a
 * screen reader.
 */
import { SPECIES_SILHOUETTES, type Silhouette, type SilhouettePoint } from './speciesSilhouettes';

/** Edge of one square atlas cell, in pixels. */
export const PLATE_CELL = 256;
/** Cells across the atlas; twelve species fit a 4x3 sheet. */
export const PLATE_COLUMNS = 4;

/** Padding from the cell edge to the plate's rounded frame. */
const FRAME_INSET = 9;
const FRAME_RADIUS = 15;
/** Height of the IUCN status rule along the bottom of the frame. */
const STATUS_RULE = 7;
/** Padding from the frame to the silhouette's bounding box. */
const ART_PAD = 24;

const FRAME_FILL = 'rgba(8, 19, 13, 0.82)';
const FRAME_LINE = 'rgba(143, 199, 170, 0.30)';
const ART_FILL = '#cbe4d6';

export interface PlateSpec {
  /** Species id, used to look up the silhouette. */
  id: string;
  /** Literal hex for the species' IUCN category, e.g. from `STATUS_HEX`. */
  color: string;
}

const px = (p: SilhouettePoint) => p[0];
const py = (p: SilhouettePoint) => p[1];
/** Smoothing at a vertex: 1 is fully rounded, 0 is a hard corner. */
const tension = (p: SilhouettePoint) => (p.length > 2 ? (p[2] as number) : 1);

/**
 * Traces one closed subpath as a Catmull-Rom spline converted to cubic
 * beziers, with per-vertex tension so hooves, wingtips and tail tips stay
 * sharp while backs and bellies curve.
 */
function traceLoop(
  ctx: CanvasRenderingContext2D,
  pts: ReadonlyArray<SilhouettePoint>,
  scale: number,
  dx: number,
  dy: number,
) {
  const n = pts.length;
  if (n < 3) return;

  // Every subpath is walked in the same rotational direction before it is
  // traced. Under the nonzero fill rule two overlapping loops only union if
  // they wind the same way; wound against each other they cancel, and a head
  // laid over a shoulder punches a hole in it instead of joining it. Deriving
  // the direction from the signed area means the outlines can be authored in
  // whichever direction reads naturally for that body part.
  let twiceArea = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    twiceArea += px(a) * py(b) - px(b) * py(a);
  }
  const step = twiceArea < 0 ? -1 : 1;

  const at = (i: number) => pts[(((i * step) % n) + n) % n];
  const X = (i: number) => px(at(i)) * scale + dx;
  const Y = (i: number) => py(at(i)) * scale + dy;
  const T = (i: number) => tension(at(i));

  ctx.moveTo(X(0), Y(0));
  for (let i = 0; i < n; i++) {
    const t1 = T(i) / 6;
    const t2 = T(i + 1) / 6;
    ctx.bezierCurveTo(
      X(i) + (X(i + 1) - X(i - 1)) * t1,
      Y(i) + (Y(i + 1) - Y(i - 1)) * t1,
      X(i + 1) - (X(i + 2) - X(i)) * t2,
      Y(i + 1) - (Y(i + 2) - Y(i)) * t2,
      X(i + 1),
      Y(i + 1),
    );
  }
  ctx.closePath();
}

/** Fits a silhouette into the given box and fills it, nonzero so blobs union. */
export function drawSilhouette(
  ctx: CanvasRenderingContext2D,
  art: Silhouette,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const [boxWidth, boxHeight] = art.box;
  const scale = Math.min(width / boxWidth, height / boxHeight);
  const dx = x + (width - boxWidth * scale) / 2;
  const dy = y + (height - boxHeight * scale) / 2;
  ctx.beginPath();
  for (const loop of art.paths) traceLoop(ctx, loop, scale, dx, dy);
  ctx.fill('nonzero');
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws one plate — frame, silhouette, status rule — into a cell. */
export function drawPlate(
  ctx: CanvasRenderingContext2D,
  spec: PlateSpec,
  originX: number,
  originY: number,
  cell = PLATE_CELL,
) {
  const art = SPECIES_SILHOUETTES[spec.id];
  if (!art) return;

  const scale = cell / PLATE_CELL;
  const inset = FRAME_INSET * scale;
  const frameX = originX + inset;
  const frameY = originY + inset;
  const frameW = cell - inset * 2;
  const frameH = cell - inset * 2;

  ctx.save();
  roundedRect(ctx, frameX, frameY, frameW, frameH, FRAME_RADIUS * scale);
  ctx.fillStyle = FRAME_FILL;
  ctx.fill();
  // The status rule is clipped by the frame so it picks up the bottom corners.
  ctx.clip();
  ctx.fillStyle = spec.color;
  ctx.fillRect(frameX, frameY + frameH - STATUS_RULE * scale, frameW, STATUS_RULE * scale);
  ctx.restore();

  ctx.save();
  ctx.lineWidth = 2 * scale;
  ctx.strokeStyle = FRAME_LINE;
  roundedRect(ctx, frameX, frameY, frameW, frameH, FRAME_RADIUS * scale);
  ctx.stroke();
  ctx.restore();

  const pad = ART_PAD * scale;
  ctx.save();
  ctx.fillStyle = ART_FILL;
  drawSilhouette(
    ctx,
    art,
    frameX + pad,
    frameY + pad,
    frameW - pad * 2,
    frameH - pad * 2 - STATUS_RULE * scale,
  );
  ctx.restore();
}

/**
 * Renders every plate into one atlas canvas, row-major, in the order given.
 * The caller keeps that order: cell index `i` is `specs[i]`.
 */
export function buildPlateAtlas(specs: readonly PlateSpec[], cell = PLATE_CELL): HTMLCanvasElement {
  const columns = PLATE_COLUMNS;
  const rows = Math.max(1, Math.ceil(specs.length / columns));
  const canvas = document.createElement('canvas');
  canvas.width = columns * cell;
  canvas.height = rows * cell;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < specs.length; i++) {
    drawPlate(ctx, specs[i], (i % columns) * cell, Math.floor(i / columns) * cell, cell);
  }
  return canvas;
}
