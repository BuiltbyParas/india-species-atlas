/**
 * Terrain generation for the hero scene.
 *
 * Turns `india-states.geojson` — the same file the atlas map already ships —
 * into an extruded relief, its state boundaries, and a projector that places
 * species occurrence points on the same surface.
 *
 * Deliberately asset-free: no downloaded 3D model, no texture, no loader.
 */
import * as THREE from 'three';

/** A GeoJSON position: [longitude, latitude]. */
type Position = [number, number];
type Ring = Position[];

interface GeoFeature {
  geometry: { type: string; coordinates: unknown };
}

export interface GeoCollection {
  features: GeoFeature[];
}

/** Extrusion depth of the landmass, in normalised world units. */
export const TERRAIN_DEPTH = 0.09;
/** Normalised height the projected map is fitted to. */
export const TERRAIN_HEIGHT = 3.15;
/**
 * Coastline simplification tolerance, in projected degrees (~3.9 km).
 * The source geometry carries several times more detail than the hero can
 * resolve; simplifying roughly halves the triangle count and cuts the one-off
 * extrusion cost from ~95 ms to ~35 ms of main-thread time.
 */
const SIMPLIFY_TOLERANCE = 0.035;
/** Islets whose longest side is below this (in projected degrees) are dropped. */
const MIN_ISLAND_SPAN = 0.05;

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/**
 * Equirectangular projection with the longitude axis corrected by cos(lat0),
 * so India is not stretched horizontally. Exact geodesy is irrelevant here —
 * this is a decorative relief, not a measurement surface — but an uncorrected
 * plate carrée looks visibly wrong, so it is worth the one cosine.
 */
const LAT0 = 22.5;
const LON_SCALE = Math.cos((LAT0 * Math.PI) / 180);

/**
 * Ramer-Douglas-Peucker simplification of a closed ring, iterative so a long
 * coastline cannot blow the stack. Returns null if the ring collapses below a
 * triangle.
 *
 * Rings are simplified independently, so shared state boundaries can drift
 * apart by up to the tolerance. At this scale that is well under a pixel, and
 * the boundary lines are drawn over the seams anyway.
 */
function simplifyRing(ring: Ring, tolerance: number): Ring | null {
  if (ring.length < 5) return ring;
  const last = ring.length - 1;
  const isClosed = ring[0][0] === ring[last][0] && ring[0][1] === ring[last][1];
  const pts = isClosed ? ring.slice(0, last) : ring.slice();
  if (pts.length < 4) return ring;

  const keep = new Uint8Array(pts.length);
  keep[0] = 1;
  keep[pts.length - 1] = 1;
  const tolerance2 = tolerance * tolerance;
  const stack: Array<[number, number]> = [[0, pts.length - 1]];

  while (stack.length) {
    const [a, b] = stack.pop()!;
    if (b - a < 2) continue;
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let furthest = -1;
    let furthestDistance = tolerance2;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = pts[i];
      let distance: number;
      if (len2 === 0) {
        distance = (px - ax) ** 2 + (py - ay) ** 2;
      } else {
        const t = clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
        distance = (px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2;
      }
      if (distance > furthestDistance) {
        furthestDistance = distance;
        furthest = i;
      }
    }
    if (furthest !== -1) {
      keep[furthest] = 1;
      stack.push([a, furthest], [furthest, b]);
    }
  }

  const out: Ring = [];
  for (let i = 0; i < pts.length; i++) if (keep[i]) out.push(pts[i]);
  if (out.length < 3) return null;
  out.push(out[0]);
  return out;
}

/** Longest bounding-box side of a ring, used to cull sub-pixel islets. */
function ringSpan(ring: Ring): number {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return Math.max(maxX - minX, maxY - minY);
}

/** Pull every linear ring out of a Polygon / MultiPolygon feature. */
function ringsOf(feature: GeoFeature): Ring[][] {
  const { type, coordinates } = feature.geometry;
  if (type === 'Polygon') return [coordinates as Ring[]];
  if (type === 'MultiPolygon') return coordinates as Ring[][];
  return [];
}

export interface Terrain {
  /** Extruded landmass, one draw call, cap and wall colours in vertex data. */
  land: THREE.BufferGeometry;
  /** State outlines, sitting just above the extruded top face. */
  borders: THREE.BufferGeometry;
  /** Places a lon/lat on the relief's surface, in world units. */
  project: (lng: number, lat: number) => [number, number];
  /** Half-extents of the relief, for framing the camera. */
  halfWidth: number;
  halfHeight: number;
}

export function buildTerrain(geojson: GeoCollection, topColor: string, sideColor: string): Terrain {
  const polygons: Ring[][] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const feature of geojson.features) {
    for (const poly of ringsOf(feature)) {
      const projected: Ring[] = [];
      for (let r = 0; r < poly.length; r++) {
        const ring = poly[r];
        if (!Array.isArray(ring) || ring.length < 4) continue;
        let out: Ring | null = ring.map(([lng, lat]) => [lng * LON_SCALE, lat] as Position);
        // An outer ring too small to resolve takes its whole polygon with it.
        if (r === 0 && ringSpan(out) < MIN_ISLAND_SPAN) break;
        out = simplifyRing(out, SIMPLIFY_TOLERANCE);
        if (!out) {
          if (r === 0) break;
          continue;
        }
        for (const p of out) {
          if (p[0] < minX) minX = p[0];
          if (p[0] > maxX) maxX = p[0];
          if (p[1] < minY) minY = p[1];
          if (p[1] > maxY) maxY = p[1];
        }
        projected.push(out);
      }
      if (projected.length) polygons.push(projected);
    }
  }

  const scale = TERRAIN_HEIGHT / Math.max(maxY - minY, 1e-6);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const project = (lng: number, lat: number): [number, number] => [
    (lng * LON_SCALE - cx) * scale,
    (lat - cy) * scale,
  ];

  const shapes: THREE.Shape[] = [];
  const borderVertices: number[] = [];

  for (const poly of polygons) {
    let shape: THREE.Shape | null = null;
    for (let r = 0; r < poly.length; r++) {
      const pts = poly[r].map(([x, y]) => new THREE.Vector2((x - cx) * scale, (y - cy) * scale));
      if (r === 0) {
        shape = new THREE.Shape(pts);
      } else if (shape) {
        shape.holes.push(new THREE.Path(pts));
      }
      const z = TERRAIN_DEPTH + 0.0015;
      for (let i = 0; i < pts.length - 1; i++) {
        borderVertices.push(pts[i].x, pts[i].y, z, pts[i + 1].x, pts[i + 1].y, z);
      }
    }
    if (shape) shapes.push(shape);
  }

  const land = new THREE.ExtrudeGeometry(shapes, {
    depth: TERRAIN_DEPTH,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 1,
  });

  // ExtrudeGeometry emits a cap group and a wall group *per shape*, so a
  // two-material mesh would cost one draw call per group — around 200 for the
  // Indian coastline. Baking the two colours into a vertex attribute instead
  // gets the same light-top/dark-side read in a single draw call.
  const count = land.attributes.position.count;
  const colors = new Float32Array(count * 3);
  const top = new THREE.Color(topColor);
  const side = new THREE.Color(sideColor);
  for (const group of land.groups) {
    const c = group.materialIndex === 0 ? top : side;
    const end = group.start + group.count;
    for (let i = group.start; i < end; i++) {
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
  }
  land.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  land.clearGroups();

  const borders = new THREE.BufferGeometry();
  borders.setAttribute('position', new THREE.Float32BufferAttribute(borderVertices, 3));

  return {
    land,
    borders,
    project,
    halfWidth: ((maxX - minX) * scale) / 2,
    halfHeight: TERRAIN_HEIGHT / 2,
  };
}
