/**
 * Terrain generation for the hero scene.
 *
 * Turns `india-states.geojson` — the same file the atlas map already ships —
 * into an extruded relief, its state boundaries, and a projector that places
 * species occurrence points on the same surface.
 *
 * The ring simplification and the cap/wall colour baking live in
 * `src/utils/geoExtrude.ts`, shared with the map's Conservation layer.
 *
 * Deliberately asset-free: no downloaded 3D model, no texture, no loader.
 */
import * as THREE from 'three';
import {
  bakeCapAndWallColors,
  fitToHeight,
  preparePolygons,
  toShape,
  type GeoCollection,
} from '../../utils/geoExtrude';

export type { GeoCollection } from '../../utils/geoExtrude';

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
  const prepared = preparePolygons(geojson, SIMPLIFY_TOLERANCE, MIN_ISLAND_SPAN);
  const fit = fitToHeight(prepared, TERRAIN_HEIGHT);

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
    borders,
    project: fit.project,
    halfWidth: fit.halfWidth,
    halfHeight: fit.halfHeight,
  };
}
