/**
 * Shared GeoJSON → extruded-geometry primitives.
 *
 * Factored out of the hero relief so the atlas map's Conservation layer can
 * raise the same landmass, from the same `india-states.geojson`, by the same
 * method — rather than growing a second, subtly different extruder.
 *
 * Deliberately asset-free: no downloaded 3D model, no texture, no loader.
 */
import * as THREE from 'three';

/** A GeoJSON position: [longitude, latitude]. */
export type Position = [number, number];
export type Ring = Position[];

export interface GeoFeature {
  properties?: Record<string, unknown>;
  geometry: { type: string; coordinates: unknown };
}

export interface GeoCollection {
  features: GeoFeature[];
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/**
 * Ramer-Douglas-Peucker simplification of a closed ring, iterative so a long
 * coastline cannot blow the stack. Returns null if the ring collapses below a
 * triangle.
 *
 * Rings are simplified independently, so shared state boundaries can drift
 * apart by up to the tolerance. At the scales this is used at that is well
 * under a pixel, and the boundary lines are drawn over the seams anyway.
 */
export function simplifyRing(ring: Ring, tolerance: number): Ring | null {
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
export function ringSpan(ring: Ring): number {
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
export function ringsOf(feature: GeoFeature): Ring[][] {
  const { type, coordinates } = feature.geometry;
  if (type === 'Polygon') return [coordinates as Ring[]];
  if (type === 'MultiPolygon') return coordinates as Ring[][];
  return [];
}

/**
 * Bake a cap colour and a wall colour into a vertex attribute, then drop the
 * geometry groups.
 *
 * `ExtrudeGeometry` emits a cap group and a wall group *per shape*, so a
 * two-material mesh would cost one draw call per group — around 200 for the
 * Indian coastline. A vertex attribute gets the same light-top/dark-side read
 * in a single draw call.
 */
export function bakeCapAndWallColors(
  geometry: THREE.ExtrudeGeometry,
  topColor: THREE.ColorRepresentation,
  sideColor: THREE.ColorRepresentation,
): void {
  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3);
  const top = new THREE.Color(topColor);
  const side = new THREE.Color(sideColor);
  for (const group of geometry.groups) {
    const c = group.materialIndex === 0 ? top : side;
    const end = group.start + group.count;
    for (let i = group.start; i < end; i++) {
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.clearGroups();
}

/**
 * Equirectangular projection with the longitude axis corrected by cos(lat0),
 * so India is not stretched horizontally. Exact geodesy is irrelevant to
 * either scene — both are illustrations, not measurement surfaces — but an
 * uncorrected plate carrée looks visibly wrong, so it is worth the one cosine.
 */
export const LAT0 = 22.5;
export const LON_SCALE = Math.cos((LAT0 * Math.PI) / 180);

/** One polygon of the source, projected and simplified. Outer ring first. */
export interface PreparedPolygon {
  /** `properties.state`, where the source carries one. */
  state?: string;
  rings: Ring[];
}

export interface PreparedGeometry {
  polygons: PreparedPolygon[];
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Project, simplify and cull every polygon in a feature collection, and
 * return them with the bounds of what survived.
 *
 * Culling happens before the bounds are taken, so a dropped islet cannot
 * stretch the frame the caller then fits its camera to.
 */
export function preparePolygons(
  geojson: GeoCollection,
  tolerance: number,
  minIslandSpan: number,
): PreparedGeometry {
  const polygons: PreparedPolygon[] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const feature of geojson.features) {
    const state = typeof feature.properties?.state === 'string' ? feature.properties.state : undefined;
    for (const poly of ringsOf(feature)) {
      const rings: Ring[] = [];
      for (let r = 0; r < poly.length; r++) {
        const ring = poly[r];
        if (!Array.isArray(ring) || ring.length < 4) continue;
        let out: Ring | null = ring.map(([lng, lat]) => [lng * LON_SCALE, lat] as Position);
        // An outer ring too small to resolve takes its whole polygon with it.
        if (r === 0 && ringSpan(out) < minIslandSpan) break;
        out = simplifyRing(out, tolerance);
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
        rings.push(out);
      }
      if (rings.length) polygons.push({ state, rings });
    }
  }

  return { polygons, minX, minY, maxX, maxY };
}

/**
 * A prepared collection fitted to a given world height and centred on the
 * origin, with the projector that puts a lon/lat into the same frame.
 */
export interface Fit {
  /** Longitude/latitude in degrees → world units. */
  project: (lng: number, lat: number) => [number, number];
  /** Projected degrees, as a `PreparedPolygon` carries them → world units. */
  place: (x: number, y: number) => [number, number];
  halfWidth: number;
  halfHeight: number;
}

export function fitToHeight(prepared: PreparedGeometry, height: number): Fit {
  const { minX, minY, maxX, maxY } = prepared;
  const scale = height / Math.max(maxY - minY, 1e-6);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const place = (x: number, y: number): [number, number] => [(x - cx) * scale, (y - cy) * scale];
  return {
    project: (lng, lat) => place(lng * LON_SCALE, lat),
    place,
    halfWidth: ((maxX - minX) * scale) / 2,
    halfHeight: height / 2,
  };
}

/**
 * A polygon as a `THREE.Shape` ready to extrude, alongside its rings as plain
 * point lists so a caller can also stroke them as outlines.
 */
export function toShape(
  polygon: PreparedPolygon,
  fit: Fit,
): { shape: THREE.Shape; rings: THREE.Vector2[][] } | null {
  const rings = polygon.rings.map((ring) =>
    ring.map(([x, y]) => {
      const [wx, wy] = fit.place(x, y);
      return new THREE.Vector2(wx, wy);
    }),
  );
  if (!rings.length) return null;
  const shape = new THREE.Shape(rings[0]);
  for (let r = 1; r < rings.length; r++) shape.holes.push(new THREE.Path(rings[r]));
  return { shape, rings };
}
