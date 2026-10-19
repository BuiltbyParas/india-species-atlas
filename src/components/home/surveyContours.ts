import { project } from '../../geo/india';
import { loadRelief, type ReliefGrid } from './heroRelief';

/**
 * The survey's contours: India's relief (`india-relief`, ETOPO 2022) traced every 500 m with d3-contour, as paths
 * in the site's map coordinates. Traced once per page and shared by the two plates that draw them — the survey
 * (GroundsPlate) and the ground the dome stands on in Chapter 03 (SelectionGround).
 */
export const CONTOUR_STEP = 500;

export interface Level {
  metres: number;
  path: Path2D;
}

/** The grid's contours every 500 m, as paths in the site's map coordinates (geo/india `project`). */
async function traceContours(grid: ReliefGrid): Promise<Level[]> {
  const { contours } = await import('d3-contour');
  const thresholds: number[] = [];
  for (let m = CONTOUR_STEP; m < grid.peakInside.metres; m += CONTOUR_STEP) thresholds.push(m);
  const shapes = contours()
    .size([grid.width, grid.height])
    .thresholds(thresholds)(grid.metres as unknown as number[]);
  const [x0, y0] = project(grid.west, grid.north);
  const [x1, y1] = project(grid.east, grid.south);
  const sx = (x1 - x0) / grid.width;
  const sy = (y1 - y0) / grid.height;
  return shapes.map((shape) => {
    const path = new Path2D();
    for (const polygon of shape.coordinates) {
      for (const ring of polygon) {
        for (let i = 0; i < ring.length; i++) {
          const x = x0 + ring[i][0] * sx;
          const y = y0 + ring[i][1] * sy;
          if (i) path.lineTo(x, y);
          else path.moveTo(x, y);
        }
        path.closePath();
      }
    }
    return { metres: shape.value, path };
  });
}

let traced: Promise<Level[]> | null = null;
/** The survey's contours, traced once per page and shared: Chapter 03 stands its dome on the same sheet. */
export function surveyContours(): Promise<Level[]> {
  traced ??= loadRelief().then(traceContours);
  traced.catch(() => (traced = null));
  return traced;
}

/** The contour colour climbing from the survey's warm line at the coast to the pale of the summits. */
export function levelColour(metres: number): string {
  const t = Math.min(1, metres / 5500);
  const a = [176, 122, 82];
  const b = [232, 225, 207];
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(' ')})`;
}

