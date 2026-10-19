/**
 * Terrain for the hero scene.
 *
 * The country's shape is `india-states.geojson` — the same file the atlas map
 * ships — and its ground is NOAA's ETOPO 2022 elevation model (`heroRelief.ts`):
 * a heightfield inside the boundary, standing on a thin plinth, with the state
 * lines draped over it. Heights are exaggerated `RELIEF_EXAGGERATION` times,
 * as a relief model's are, and the page says so.
 *
 * Without the elevation grid (it failed to load, or the browser cannot inflate
 * it) the country is the flat extruded slab it used to be; everything else in
 * the scene reads the ground through `groundAt`, which then returns the slab's
 * top.
 *
 * The ring simplification and the cap/wall colour baking live in
 * `src/utils/geoExtrude.ts`, shared with the map's Conservation layer.
 */
import * as THREE from 'three';
import {
  bakeCapAndWallColors,
  fitToHeight,
  LON_SCALE,
  preparePolygons,
  toShape,
  type GeoCollection,
  type PreparedGeometry,
} from '../../utils/geoExtrude';
import { RELIEF_EXAGGERATION, type ReliefGrid } from './heroRelief';

export type { GeoCollection } from '../../utils/geoExtrude';

/** Height of the plinth: the top of the slab is sea level. */
export const TERRAIN_DEPTH = 0.06;
/** Normalised height the projected map is fitted to. */
export const TERRAIN_HEIGHT = 3.15;
export { RELIEF_EXAGGERATION };
/**
 * Coastline simplification tolerance, in projected degrees (~3.9 km).
 * The source geometry carries several times more detail than the hero can
 * resolve; simplifying roughly halves the triangle count and cuts the one-off
 * extrusion cost from ~95 ms to ~35 ms of main-thread time.
 */
const SIMPLIFY_TOLERANCE = 0.035;
/** Islets whose longest side is below this (in projected degrees) are dropped. */
const MIN_ISLAND_SPAN = 0.05;
/** Width of the boundary mask texture, in texels (~2.4 km each over India). */
const MASK_WIDTH = 1280;
/** Width of the soft shadow the plinth throws on the sea, in texels. */
const SHADOW_WIDTH = 176;

/** Everything a material needs to read the elevation model on the GPU. */
export interface ReliefField {
  /**
   * One texel per grid cell, row 0 at v = 0 (the north): r = metres, g and b =
   * the east–west and north–south rise across the cell (metres, central
   * differences), a = the Laplacian (metres). Packed so the ground shader reads
   * one texel per pixel rather than five.
   */
  heightTexture: THREE.DataTexture;
  /** The country, white on transparent, in the same frame as the heights. */
  maskTexture: THREE.CanvasTexture;
  /** The same, blurred, for the shadow the plinth throws on the sea. */
  shadowTexture: THREE.CanvasTexture;
  /** World x/y → texture u/v: u = x·uv.x + uv.y, v = y·uv.z + uv.w. */
  uv: THREE.Vector4;
  /** World size of one texel, east–west and north–south. */
  cell: THREE.Vector2;
  zPerMetre: number;
  peakMetres: number;
  /**
   * True for the regional grid: the ground runs on past the boundary to the neighbours and the sea floor,
   * signed (r < 0 under the sea), and the mask only says which ground is India's.
   */
  region: boolean;
  /** Texels across and down the height texture. */
  size: THREE.Vector2;
  /** Vertices and triangles in the ground mesh, for the record. */
  stats: { vertices: number; triangles: number };
  dispose: () => void;
}

export interface Terrain {
  /** The ground: the relief's surface, or the extruded slab without one. One draw call. */
  land: THREE.BufferGeometry;
  /** The relief's walls, down from the ground's edge to the sea. Null for the slab, which carries its own. */
  walls: THREE.BufferGeometry | null;
  /** State outlines, draped just above the ground. */
  borders: THREE.BufferGeometry;
  /** Places a lon/lat on the relief's surface, in world units. */
  project: (lng: number, lat: number) => [number, number];
  /** World z of the ground at full relief, for a world x/y. */
  groundAt: (x: number, y: number) => number;
  /** Elevation in metres for a world x/y (0 without the model). */
  metresAt: (x: number, y: number) => number;
  /** Whether a world x/y falls in India (to the elevation grid's 3′ cell; always true for the slab). */
  onLand: (x: number, y: number) => boolean;
  relief: ReliefField | null;
  /** Half-extents of the relief, for framing the camera. */
  halfWidth: number;
  halfHeight: number;
}

export function buildTerrain(
  geojson: GeoCollection,
  topColor: string,
  sideColor: string,
  grid: ReliefGrid | null = null,
  step = 1,
): Terrain {
  const prepared = preparePolygons(geojson, SIMPLIFY_TOLERANCE, MIN_ISLAND_SPAN);
  const fit = fitToHeight(prepared, TERRAIN_HEIGHT);
  if (grid?.kind === 'region') return buildRegion(prepared, fit, grid, Math.max(1, Math.round(step)), sideColor);
  if (grid) return buildRelief(prepared, fit, grid, Math.max(1, Math.round(step)), sideColor);

  const shapes: THREE.Shape[] = [];
  const borderVertices: number[] = [];
  const borderZ = TERRAIN_DEPTH + 0.0015;

  for (const polygon of prepared.polygons) {
    const built = toShape(polygon, fit);
    if (!built) continue;
    shapes.push(built.shape);
    for (const ring of built.rings) {
      for (let i = 0; i < ring.length - 1; i++) {
        borderVertices.push(ring[i].x, ring[i].y, borderZ, ring[i + 1].x, ring[i + 1].y, borderZ);
      }
    }
  }

  const land = new THREE.ExtrudeGeometry(shapes, {
    depth: TERRAIN_DEPTH,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 1,
  });

  bakeCapAndWallColors(land, topColor, sideColor);

  const borders = new THREE.BufferGeometry();
  borders.setAttribute('position', new THREE.Float32BufferAttribute(borderVertices, 3));

  return {
    land,
    walls: null,
    borders,
    project: fit.project,
    groundAt: () => TERRAIN_DEPTH,
    metresAt: () => 0,
    onLand: () => true,
    relief: null,
    halfWidth: fit.halfWidth,
    halfHeight: fit.halfHeight,
  };
}

/* ------------------------------------------------------------------ relief */

/** Even-odd scanline fill of the prepared rings at the grid's cell centres. */
function rasteriseCells(prepared: PreparedGeometry, grid: ReliefGrid): Uint8Array {
  const { width, height, west, north, cellDeg } = grid;
  const inside = new Uint8Array(width * height);
  const edges: number[] = [];
  for (const polygon of prepared.polygons)
    for (const ring of polygon.rings)
      for (let i = 0; i < ring.length - 1; i++)
        edges.push(ring[i][0] / LON_SCALE, ring[i][1], ring[i + 1][0] / LON_SCALE, ring[i + 1][1]);
  const xs: number[] = [];
  for (let r = 0; r < height; r++) {
    const y = north - (r + 0.5) * cellDeg;
    xs.length = 0;
    for (let e = 0; e < edges.length; e += 4) {
      const y0 = edges[e + 1];
      const y1 = edges[e + 3];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) xs.push(edges[e] + ((y - y0) / (y1 - y0)) * (edges[e + 2] - edges[e]));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const c0 = Math.max(0, Math.ceil((xs[k] - west) / cellDeg - 0.5));
      const c1 = Math.min(width - 1, Math.floor((xs[k + 1] - west) / cellDeg - 0.5));
      for (let c = c0; c <= c1; c++) inside[r * width + c] = 1;
    }
  }
  return inside;
}

/** The prepared rings drawn into a 2D context whose pixels cover the grid's extent. */
function drawCountry(ctx: CanvasRenderingContext2D, prepared: PreparedGeometry, grid: ReliefGrid, w: number, h: number) {
  const sx = w / (grid.east - grid.west);
  const sy = h / (grid.north - grid.south);
  ctx.beginPath();
  for (const polygon of prepared.polygons)
    for (const ring of polygon.rings)
      ring.forEach(([x, y], i) => {
        const px = (x / LON_SCALE - grid.west) * sx;
        const py = (grid.north - y) * sy;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
  ctx.fillStyle = '#fff';
  // Non-zero: the states do not overlap, and an enclave drawn inside its neighbour's hole stays land.
  ctx.fill('nonzero');
}

function buildRelief(
  prepared: PreparedGeometry,
  fit: ReturnType<typeof fitToHeight>,
  grid: ReliefGrid,
  step: number,
  sideColor: string,
): Terrain {
  const { width, height, west, north, cellDeg, metres } = grid;

  // World frame: the projection is affine in degrees, so the grid is regular in world units too.
  const [ox, oy] = fit.project(west, north);
  const [ex] = fit.project(west + 1, north);
  const [, ny] = fit.project(west, north - 1);
  const perLng = ex - ox;
  const perLat = oy - ny;
  const cellX = cellDeg * perLng;
  const cellY = cellDeg * perLat;
  // World units per metre: one degree of latitude is 111.32 km.
  const zPerMetre = (perLat / 111320) * RELIEF_EXAGGERATION;
  const surface = (m: number) => TERRAIN_DEPTH + m * zPerMetre;

  // Which cells are India, and an integral image of that for box queries.
  const inside = rasteriseCells(prepared, grid);
  const sum = new Uint32Array((width + 1) * (height + 1));
  for (let r = 0; r < height; r++) {
    let row = 0;
    for (let c = 0; c < width; c++) {
      row += inside[r * width + c];
      sum[(r + 1) * (width + 1) + c + 1] = sum[r * (width + 1) + c + 1] + row;
    }
  }
  const anyInside = (r0: number, c0: number, r1: number, c1: number) => {
    r0 = Math.max(0, r0);
    c0 = Math.max(0, c0);
    r1 = Math.min(height - 1, r1);
    c1 = Math.min(width - 1, c1);
    if (r0 > r1 || c0 > c1) return false;
    const W = width + 1;
    return sum[(r1 + 1) * W + c1 + 1] - sum[r0 * W + c1 + 1] - sum[(r1 + 1) * W + c0] + sum[r0 * W + c0] > 0;
  };

  // Mesh nodes sit on every `step`-th cell centre.
  const nodeCols = Math.floor((width - 1) / step) + 1;
  const nodeRows = Math.floor((height - 1) / step) + 1;
  const nodeX = (j: number) => ox + (j * step + 0.5) * cellX;
  const nodeY = (i: number) => oy - (i * step + 0.5) * cellY;
  // A coarser mesh takes a tent-weighted average of the cells about each node rather than every
  // step-th cell, so its summits are the grid's, low-passed, not whichever cell the step lands on.
  const nodeHeights = new Float32Array(nodeRows * nodeCols);
  for (let i = 0; i < nodeRows; i++) {
    for (let j = 0; j < nodeCols; j++) {
      let sumH = 0;
      let sumW = 0;
      for (let dr = 1 - step; dr < step; dr++) {
        for (let dc = 1 - step; dc < step; dc++) {
          const r = i * step + dr;
          const c = j * step + dc;
          if (r < 0 || c < 0 || r >= height || c >= width) continue;
          const wt = (step - Math.abs(dr)) * (step - Math.abs(dc));
          sumH += metres[r * width + c] * wt;
          sumW += wt;
        }
      }
      nodeHeights[i * nodeCols + j] = sumH / sumW;
    }
  }
  const nodeMetres = (i: number, j: number) => nodeHeights[i * nodeCols + j];

  // A quad is kept if any cell within one node spacing of it is India.
  const index = new Int32Array(nodeRows * nodeCols).fill(-1);
  const keep: number[] = [];
  for (let i = 0; i < nodeRows - 1; i++)
    for (let j = 0; j < nodeCols - 1; j++)
      if (anyInside(i * step - step, j * step - step, (i + 1) * step + step, (j + 1) * step + step)) keep.push(i, j);

  const positions: number[] = [];
  const normals: number[] = [];
  const vertex = (i: number, j: number) => {
    const at = i * nodeCols + j;
    if (index[at] >= 0) return index[at];
    const id = positions.length / 3;
    index[at] = id;
    const m = nodeMetres(i, j);
    positions.push(nodeX(j), nodeY(i), surface(m));
    // Analytic normal from the neighbouring nodes.
    const mw = nodeMetres(i, Math.max(0, j - 1));
    const me = nodeMetres(i, Math.min(nodeCols - 1, j + 1));
    const mn = nodeMetres(Math.max(0, i - 1), j);
    const ms = nodeMetres(Math.min(nodeRows - 1, i + 1), j);
    const dx = ((me - mw) * zPerMetre) / (2 * cellX * step);
    const dy = ((mn - ms) * zPerMetre) / (2 * cellY * step);
    const len = Math.hypot(dx, dy, 1);
    normals.push(-dx / len, -dy / len, 1 / len);
    return id;
  };
  const indices: number[] = [];
  for (let k = 0; k < keep.length; k += 2) {
    const i = keep[k];
    const j = keep[k + 1];
    const a = vertex(i, j);
    const b = vertex(i, j + 1);
    const c = vertex(i + 1, j);
    const d = vertex(i + 1, j + 1);
    // Split each quad along its flatter diagonal, so ridges and valleys are not sawn across.
    const ad = Math.abs(nodeMetres(i, j) - nodeMetres(i + 1, j + 1));
    const bc = Math.abs(nodeMetres(i, j + 1) - nodeMetres(i + 1, j));
    // Counter-clockwise seen from above (+z): north is +y, so row i+1 lies south of row i.
    if (ad <= bc) indices.push(a, c, d, a, d, b);
    else indices.push(a, c, b, b, c, d);
  }
  const land = new THREE.BufferGeometry();
  land.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  land.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  land.setIndex(indices);

  // The ground under any world x/y, bilinear between mesh nodes so walls and markers meet the mesh.
  const metresAt = (x: number, y: number) => {
    const fj = (x - ox) / (cellX * step) - 0.5 / step;
    const fi = (oy - y) / (cellY * step) - 0.5 / step;
    if (fj < 0 || fi < 0 || fj > nodeCols - 1 || fi > nodeRows - 1) return 0;
    const j = Math.min(Math.floor(fj), nodeCols - 2);
    const i = Math.min(Math.floor(fi), nodeRows - 2);
    const tx = fj - j;
    const ty = fi - i;
    const top = nodeMetres(i, j) + (nodeMetres(i, j + 1) - nodeMetres(i, j)) * tx;
    const bottom = nodeMetres(i + 1, j) + (nodeMetres(i + 1, j + 1) - nodeMetres(i + 1, j)) * tx;
    return top + (bottom - top) * ty;
  };
  const groundAt = (x: number, y: number) => surface(metresAt(x, y));
  const onLand = (x: number, y: number) => {
    const c = Math.floor((x - ox) / cellX);
    const r = Math.floor((oy - y) / cellY);
    return c >= 0 && r >= 0 && c < width && r < height && inside[r * width + c] === 1;
  };

  // Walls and draped borders, from the same simplified rings, densified to the mesh spacing.
  const maxSegment = Math.min(cellX, cellY) * step * 0.8;
  const wallPositions: number[] = [];
  const wallColors: number[] = [];
  const borderVertices: number[] = [];
  const side = new THREE.Color(sideColor);
  const foot = side.clone().multiplyScalar(0.45);
  for (const polygon of prepared.polygons) {
    for (const ring of polygon.rings) {
      for (let p = 0; p < ring.length - 1; p++) {
        const [ax, ay] = fit.place(ring[p][0], ring[p][1]);
        const [bx, by] = fit.place(ring[p + 1][0], ring[p + 1][1]);
        const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / maxSegment));
        for (let s = 0; s < n; s++) {
          const x0 = ax + ((bx - ax) * s) / n;
          const y0 = ay + ((by - ay) * s) / n;
          const x1 = ax + ((bx - ax) * (s + 1)) / n;
          const y1 = ay + ((by - ay) * (s + 1)) / n;
          const z0 = groundAt(x0, y0);
          const z1 = groundAt(x1, y1);
          borderVertices.push(x0, y0, z0 + 0.0025, x1, y1, z1 + 0.0025);
          // Two triangles, from the sea up to the ground's edge.
          wallPositions.push(x0, y0, 0, x1, y1, 0, x1, y1, z1, x0, y0, 0, x1, y1, z1, x0, y0, z0);
          for (const top of [false, false, true, false, true, true]) {
            const c = top ? side : foot;
            wallColors.push(c.r, c.g, c.b);
          }
        }
      }
    }
  }
  const walls = new THREE.BufferGeometry();
  walls.setAttribute('position', new THREE.Float32BufferAttribute(wallPositions, 3));
  walls.setAttribute('color', new THREE.Float32BufferAttribute(wallColors, 3));
  // Rings run either way round, so the walls are lit from both faces.
  walls.computeVertexNormals();
  const borders = new THREE.BufferGeometry();
  borders.setAttribute('position', new THREE.Float32BufferAttribute(borderVertices, 3));

  // The heights on the GPU, as half floats (a few metres of precision at the summits), with their
  // gradient and Laplacian alongside.
  const half = new Uint16Array(width * height * 4);
  const cellAt = (r: number, c: number) => metres[Math.min(height - 1, Math.max(0, r)) * width + Math.min(width - 1, Math.max(0, c))];
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const h = metres[r * width + c];
      const w = cellAt(r, c - 1);
      const e = cellAt(r, c + 1);
      const n = cellAt(r - 1, c);
      const so = cellAt(r + 1, c);
      const i = (r * width + c) * 4;
      half[i] = THREE.DataUtils.toHalfFloat(h);
      half[i + 1] = THREE.DataUtils.toHalfFloat((e - w) / 2);
      half[i + 2] = THREE.DataUtils.toHalfFloat((n - so) / 2);
      half[i + 3] = THREE.DataUtils.toHalfFloat(w + e + n + so - 4 * h);
    }
  }
  const heightTexture = new THREE.DataTexture(half, width, height, THREE.RGBAFormat, THREE.HalfFloatType);
  heightTexture.magFilter = THREE.LinearFilter;
  heightTexture.minFilter = THREE.LinearFilter;
  heightTexture.wrapS = THREE.ClampToEdgeWrapping;
  heightTexture.wrapT = THREE.ClampToEdgeWrapping;
  heightTexture.colorSpace = THREE.NoColorSpace;
  heightTexture.needsUpdate = true;

  // The boundary, drawn once into a canvas and uploaded as is — never read back.
  const maskHeight = Math.round((MASK_WIDTH * (grid.north - grid.south)) / (grid.east - grid.west));
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = MASK_WIDTH;
  maskCanvas.height = maskHeight;
  const maskCtx = maskCanvas.getContext('2d');
  if (maskCtx) drawCountry(maskCtx, prepared, grid, MASK_WIDTH, maskHeight);
  const maskTexture = new THREE.CanvasTexture(maskCanvas);
  maskTexture.flipY = false;
  maskTexture.generateMipmaps = false;
  maskTexture.minFilter = THREE.LinearFilter;
  maskTexture.colorSpace = THREE.NoColorSpace;

  const shadowHeight = Math.round((SHADOW_WIDTH * maskHeight) / MASK_WIDTH);
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = SHADOW_WIDTH;
  shadowCanvas.height = shadowHeight;
  const shadowCtx = shadowCanvas.getContext('2d');
  if (shadowCtx) {
    // Inset a few texels so the edge columns stay empty whatever the blur does.
    shadowCtx.imageSmoothingEnabled = true;
    shadowCtx.imageSmoothingQuality = 'high';
    if ('filter' in shadowCtx) shadowCtx.filter = 'blur(3px)';
    shadowCtx.drawImage(maskCanvas, 4, 4, SHADOW_WIDTH - 8, shadowHeight - 8);
  }
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  shadowTexture.flipY = false;
  shadowTexture.colorSpace = THREE.NoColorSpace;

  // u runs west → east across the grid, v north → south.
  const spanX = width * cellX;
  const spanY = height * cellY;
  const uv = new THREE.Vector4(1 / spanX, -ox / spanX, -1 / spanY, oy / spanY);

  return {
    land,
    walls,
    borders,
    project: fit.project,
    groundAt,
    metresAt,
    onLand,
    relief: {
      heightTexture,
      maskTexture,
      shadowTexture,
      uv,
      cell: new THREE.Vector2(cellX, cellY),
      zPerMetre,
      peakMetres: grid.peakInside.metres,
      region: false,
      size: new THREE.Vector2(width, height),
      stats: { vertices: positions.length / 3, triangles: indices.length / 3 },
      dispose() {
        heightTexture.dispose();
        maskTexture.dispose();
        shadowTexture.dispose();
      },
    },
    halfWidth: fit.halfWidth,
    halfHeight: fit.halfHeight,
  };
}

/* ------------------------------------------------------------------ region */

/** India's ground and this far around it (degrees) is meshed at the fine spacing; beyond it, at twice that. */
const FINE_MARGIN_DEG = 1.5;

/**
 * The regional relief: the subcontinent, the plateau north of it and the sea floor around it as one surface,
 * so the country is seen standing in its own geography rather than as a slab cut out of the dark.
 *
 * Land stands at its height; the sea is a level surface at the plinth (the sea floor is drawn by the shader, as
 * a tint read through the water). The mesh is fine (`step` cells) over India and its margin and coarse (twice
 * that) beyond, where the ground is far, dim and hazed. A coarse block next to a fine one picks up the fine
 * one's midpoints in a fan about its own centre, so the two meet without cracks.
 */
function buildRegion(
  prepared: PreparedGeometry,
  fit: ReturnType<typeof fitToHeight>,
  grid: ReliefGrid,
  step: number,
  sideColor: string,
): Terrain {
  const { width, height, west, north, cellDeg, metres } = grid;

  const [ox, oy] = fit.project(west, north);
  const [ex] = fit.project(west + 1, north);
  const [, ny] = fit.project(west, north - 1);
  const perLng = ex - ox;
  const perLat = oy - ny;
  const cellX = cellDeg * perLng;
  const cellY = cellDeg * perLat;
  const zPerMetre = (perLat / 111320) * RELIEF_EXAGGERATION;
  const surface = (m: number) => TERRAIN_DEPTH + Math.max(0, m) * zPerMetre;

  const inside = rasteriseCells(prepared, grid);
  const sum = new Uint32Array((width + 1) * (height + 1));
  for (let r = 0; r < height; r++) {
    let row = 0;
    for (let c = 0; c < width; c++) {
      row += inside[r * width + c];
      sum[(r + 1) * (width + 1) + c + 1] = sum[r * (width + 1) + c + 1] + row;
    }
  }
  const anyInside = (r0: number, c0: number, r1: number, c1: number) => {
    r0 = Math.max(0, r0);
    c0 = Math.max(0, c0);
    r1 = Math.min(height - 1, r1);
    c1 = Math.min(width - 1, c1);
    if (r0 > r1 || c0 > c1) return false;
    const W = width + 1;
    return sum[(r1 + 1) * W + c1 + 1] - sum[r0 * W + c1 + 1] - sum[(r1 + 1) * W + c0] + sum[r0 * W + c0] > 0;
  };

  // Nodes every `step` cells, in whole blocks of 2 × 2 node intervals.
  const f = step;
  const blocksX = Math.floor((width - 1) / f / 2);
  const blocksY = Math.floor((height - 1) / f / 2);
  const nodeCols = blocksX * 2 + 1;
  const nodeRows = blocksY * 2 + 1;
  const nodeX = (j: number) => ox + (j * f + 0.5) * cellX;
  const nodeY = (i: number) => oy - (i * f + 0.5) * cellY;
  // Land heights, tent-filtered about each node so a coarse node carries the ground's low-passed height. The
  // sea counts as 0: under the water the surface is level.
  const nodeHeights = new Float32Array(nodeRows * nodeCols);
  for (let i = 0; i < nodeRows; i++) {
    for (let j = 0; j < nodeCols; j++) {
      let sumH = 0;
      let sumW = 0;
      for (let dr = 1 - f; dr < f; dr++) {
        for (let dc = 1 - f; dc < f; dc++) {
          const r = i * f + dr;
          const c = j * f + dc;
          if (r < 0 || c < 0 || r >= height || c >= width) continue;
          const wt = (f - Math.abs(dr)) * (f - Math.abs(dc));
          sumH += Math.max(0, metres[r * width + c]) * wt;
          sumW += wt;
        }
      }
      nodeHeights[i * nodeCols + j] = sumW > 0 ? sumH / sumW : 0;
    }
  }
  const nodeMetres = (i: number, j: number) => nodeHeights[i * nodeCols + j];

  const margin = Math.ceil(FINE_MARGIN_DEG / cellDeg);
  const fine = new Uint8Array(blocksX * blocksY);
  for (let bi = 0; bi < blocksY; bi++)
    for (let bj = 0; bj < blocksX; bj++)
      fine[bi * blocksX + bj] = anyInside(bi * 2 * f - margin, bj * 2 * f - margin, (bi + 1) * 2 * f + margin, (bj + 1) * 2 * f + margin) ? 1 : 0;
  const isFine = (bi: number, bj: number) => bi >= 0 && bj >= 0 && bi < blocksY && bj < blocksX && fine[bi * blocksX + bj] === 1;

  const index = new Int32Array(nodeRows * nodeCols).fill(-1);
  const positions: number[] = [];
  const normals: number[] = [];
  const vertex = (i: number, j: number) => {
    const at = i * nodeCols + j;
    if (index[at] >= 0) return index[at];
    const id = positions.length / 3;
    index[at] = id;
    positions.push(nodeX(j), nodeY(i), surface(nodeMetres(i, j)));
    // The shader lights the ground from the height texture; the attribute only has to exist.
    normals.push(0, 0, 1);
    return id;
  };
  const indices: number[] = [];
  const quad = (i: number, j: number) => {
    const a = vertex(i, j);
    const b = vertex(i, j + 1);
    const c = vertex(i + 1, j);
    const d = vertex(i + 1, j + 1);
    const ad = Math.abs(nodeMetres(i, j) - nodeMetres(i + 1, j + 1));
    const bc = Math.abs(nodeMetres(i, j + 1) - nodeMetres(i + 1, j));
    if (ad <= bc) indices.push(a, c, d, a, d, b);
    else indices.push(a, c, b, b, c, d);
  };
  let fineBlocks = 0;
  for (let bi = 0; bi < blocksY; bi++) {
    for (let bj = 0; bj < blocksX; bj++) {
      const i0 = bi * 2;
      const j0 = bj * 2;
      if (isFine(bi, bj)) {
        fineBlocks++;
        quad(i0, j0);
        quad(i0, j0 + 1);
        quad(i0 + 1, j0);
        quad(i0 + 1, j0 + 1);
        continue;
      }
      // Clockwise seen from above (north-west, north-east, south-east, south-west), with a fine neighbour's
      // midpoint on each shared edge; the fan is wound the other way, counter-clockwise, as the quads are.
      const ring: number[] = [vertex(i0, j0)];
      if (isFine(bi - 1, bj)) ring.push(vertex(i0, j0 + 1));
      ring.push(vertex(i0, j0 + 2));
      if (isFine(bi, bj + 1)) ring.push(vertex(i0 + 1, j0 + 2));
      ring.push(vertex(i0 + 2, j0 + 2));
      if (isFine(bi + 1, bj)) ring.push(vertex(i0 + 2, j0 + 1));
      ring.push(vertex(i0 + 2, j0));
      if (isFine(bi, bj - 1)) ring.push(vertex(i0 + 1, j0));
      if (ring.length === 4) {
        // No fine neighbour: one quad over the block, split along its flatter diagonal.
        const [a, b, d, c] = ring;
        const ad = Math.abs(nodeMetres(i0, j0) - nodeMetres(i0 + 2, j0 + 2));
        const bc = Math.abs(nodeMetres(i0, j0 + 2) - nodeMetres(i0 + 2, j0));
        if (ad <= bc) indices.push(a, c, d, a, d, b);
        else indices.push(a, c, b, b, c, d);
        continue;
      }
      const centre = vertex(i0 + 1, j0 + 1);
      for (let k = 0; k < ring.length; k++) indices.push(centre, ring[(k + 1) % ring.length], ring[k]);
    }
  }
  const land = new THREE.BufferGeometry();
  land.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  land.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  land.setIndex(indices);

  const metresAt = (x: number, y: number) => {
    const fj = (x - ox) / (cellX * f) - 0.5 / f;
    const fi = (oy - y) / (cellY * f) - 0.5 / f;
    if (fj < 0 || fi < 0 || fj > nodeCols - 1 || fi > nodeRows - 1) return 0;
    const j = Math.min(Math.floor(fj), nodeCols - 2);
    const i = Math.min(Math.floor(fi), nodeRows - 2);
    const tx = fj - j;
    const ty = fi - i;
    const top = nodeMetres(i, j) + (nodeMetres(i, j + 1) - nodeMetres(i, j)) * tx;
    const bottom = nodeMetres(i + 1, j) + (nodeMetres(i + 1, j + 1) - nodeMetres(i + 1, j)) * tx;
    return top + (bottom - top) * ty;
  };
  const groundAt = (x: number, y: number) => surface(metresAt(x, y));
  const onLand = (x: number, y: number) => {
    const c = Math.floor((x - ox) / cellX);
    const r = Math.floor((oy - y) / cellY);
    return c >= 0 && r >= 0 && c < width && r < height && inside[r * width + c] === 1;
  };

  // The state lines, draped on the ground as before.
  const maxSegment = Math.min(cellX, cellY) * f * 0.8;
  const borderVertices: number[] = [];
  for (const polygon of prepared.polygons) {
    for (const ring of polygon.rings) {
      for (let p = 0; p < ring.length - 1; p++) {
        const [ax, ay] = fit.place(ring[p][0], ring[p][1]);
        const [bx, by] = fit.place(ring[p + 1][0], ring[p + 1][1]);
        const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / maxSegment));
        for (let k = 0; k < n; k++) {
          const x0 = ax + ((bx - ax) * k) / n;
          const y0 = ay + ((by - ay) * k) / n;
          const x1 = ax + ((bx - ax) * (k + 1)) / n;
          const y1 = ay + ((by - ay) * (k + 1)) / n;
          borderVertices.push(x0, y0, groundAt(x0, y0) + 0.0025, x1, y1, groundAt(x1, y1) + 0.0025);
        }
      }
    }
  }
  const borders = new THREE.BufferGeometry();
  borders.setAttribute('position', new THREE.Float32BufferAttribute(borderVertices, 3));

  // A skirt round the grid's edge, down to the open sea beyond it, so high ground at the edge (the plateau,
  // the Hindu Kush) ends in a wall the haze swallows rather than a sheet floating over the water.
  const wallPositions: number[] = [];
  const wallColors: number[] = [];
  const side = new THREE.Color(sideColor);
  const foot = side.clone().multiplyScalar(0.45);
  const skirt = (i0: number, j0: number, i1: number, j1: number) => {
    const x0 = nodeX(j0);
    const y0 = nodeY(i0);
    const x1 = nodeX(j1);
    const y1 = nodeY(i1);
    const z0 = surface(nodeMetres(i0, j0));
    const z1 = surface(nodeMetres(i1, j1));
    if (z0 <= TERRAIN_DEPTH + 1e-4 && z1 <= TERRAIN_DEPTH + 1e-4) return;
    wallPositions.push(x0, y0, 0, x1, y1, 0, x1, y1, z1, x0, y0, 0, x1, y1, z1, x0, y0, z0);
    for (const top of [false, false, true, false, true, true]) {
      const c = top ? side : foot;
      wallColors.push(c.r, c.g, c.b);
    }
  };
  for (let j = 0; j < nodeCols - 1; j++) {
    skirt(0, j, 0, j + 1);
    skirt(nodeRows - 1, j, nodeRows - 1, j + 1);
  }
  for (let i = 0; i < nodeRows - 1; i++) {
    skirt(i, 0, i + 1, 0);
    skirt(i, nodeCols - 1, i + 1, nodeCols - 1);
  }
  const walls = new THREE.BufferGeometry();
  walls.setAttribute('position', new THREE.Float32BufferAttribute(wallPositions, 3));
  walls.setAttribute('color', new THREE.Float32BufferAttribute(wallColors, 3));
  walls.computeVertexNormals();

  // r: signed metres (the sea floor below 0); g, b: the rise of the land across the cell (the sea counts as
  // level), a: the land's Laplacian — the ground the light falls on, as the India grid packs it.
  const half = new Uint16Array(width * height * 4);
  const landAt = (r: number, c: number) => Math.max(0, metres[Math.min(height - 1, Math.max(0, r)) * width + Math.min(width - 1, Math.max(0, c))]);
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const h = landAt(r, c);
      const w = landAt(r, c - 1);
      const e = landAt(r, c + 1);
      const n = landAt(r - 1, c);
      const so = landAt(r + 1, c);
      const i = (r * width + c) * 4;
      half[i] = THREE.DataUtils.toHalfFloat(metres[r * width + c]);
      half[i + 1] = THREE.DataUtils.toHalfFloat((e - w) / 2);
      half[i + 2] = THREE.DataUtils.toHalfFloat((n - so) / 2);
      half[i + 3] = THREE.DataUtils.toHalfFloat(w + e + n + so - 4 * h);
    }
  }
  const heightTexture = new THREE.DataTexture(half, width, height, THREE.RGBAFormat, THREE.HalfFloatType);
  heightTexture.magFilter = THREE.LinearFilter;
  heightTexture.minFilter = THREE.LinearFilter;
  heightTexture.wrapS = THREE.ClampToEdgeWrapping;
  heightTexture.wrapT = THREE.ClampToEdgeWrapping;
  heightTexture.colorSpace = THREE.NoColorSpace;
  heightTexture.needsUpdate = true;

  // India, white on transparent, over the grid's extent: which ground is the country's.
  const maskWidth = Math.round(MASK_WIDTH * 1.4);
  const maskHeight = Math.round((maskWidth * (grid.north - grid.south)) / (grid.east - grid.west));
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = maskWidth;
  maskCanvas.height = maskHeight;
  const maskCtx = maskCanvas.getContext('2d');
  if (maskCtx) drawCountry(maskCtx, prepared, grid, maskWidth, maskHeight);
  const maskTexture = new THREE.CanvasTexture(maskCanvas);
  maskTexture.flipY = false;
  maskTexture.generateMipmaps = false;
  maskTexture.minFilter = THREE.LinearFilter;
  maskTexture.colorSpace = THREE.NoColorSpace;
  // No plinth stands in the water here, so it throws no shadow on it.
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 1;
  shadowCanvas.height = 1;
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);

  const spanX = width * cellX;
  const spanY = height * cellY;
  const uv = new THREE.Vector4(1 / spanX, -ox / spanX, -1 / spanY, oy / spanY);

  return {
    land,
    walls,
    borders,
    project: fit.project,
    groundAt,
    metresAt,
    onLand,
    relief: {
      heightTexture,
      maskTexture,
      shadowTexture,
      uv,
      cell: new THREE.Vector2(cellX, cellY),
      zPerMetre,
      peakMetres: grid.peakInside.metres,
      region: true,
      size: new THREE.Vector2(width, height),
      stats: { vertices: positions.length / 3, triangles: indices.length / 3, fineBlocks } as ReliefField['stats'],
      dispose() {
        heightTexture.dispose();
        maskTexture.dispose();
        shadowTexture.dispose();
      },
    },
    halfWidth: fit.halfWidth,
    halfHeight: fit.halfHeight,
  };
}
