import { useEffect, useState } from 'react';
import type { GeoCollection, GeoFeature } from '../utils/geoExtrude';

/**
 * India as flat SVG geometry, shared by every drawn map on the site that is
 * not Leaflet: the loader, the species maps, the conservation map, the scroll
 * progress route and the documentary.
 *
 * The projection is fixed rather than fitted to the file, so a point can be
 * placed before the boundaries have loaded, and every map on the site agrees
 * about where Jaisalmer is. It is equirectangular with longitude scaled by
 * cos(22°) — the latitude India is centred on — which keeps the country's
 * proportions honest without any projection library.
 */
const MIN_LNG = 68;
const MAX_LNG = 97.5;
const MIN_LAT = 6.5;
const MAX_LAT = 37.2;
const LNG_SCALE = Math.cos((22 * Math.PI) / 180);

export const MAP_WIDTH = 1000;
const K = MAP_WIDTH / ((MAX_LNG - MIN_LNG) * LNG_SCALE);
export const MAP_HEIGHT = Math.round((MAX_LAT - MIN_LAT) * K);
export const MAP_VIEWBOX = `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`;

export function project(lng: number, lat: number): [number, number] {
  return [(lng - MIN_LNG) * LNG_SCALE * K, (MAX_LAT - lat) * K];
}

export interface StatePath {
  name: string;
  d: string;
}

export interface IndiaGeo {
  states: StatePath[];
  byName: Map<string, StatePath>;
  /** Every state joined into one path, for strokes drawn once. */
  all: string;
  /** Extent of the boundary file in degrees, for the coordinate captions. */
  extent: { minLat: number; maxLat: number; minLng: number; maxLng: number };
}

type Ring = Array<[number, number]>;

function ringsOf(feature: GeoFeature): Ring[][] {
  const { type, coordinates } = feature.geometry;
  if (type === 'Polygon') return [coordinates as Ring[]];
  if (type === 'MultiPolygon') return coordinates as Ring[][];
  return [];
}

function build(geojson: GeoCollection): IndiaGeo {
  const extent = { minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 };
  const states: StatePath[] = [];
  for (const feature of geojson.features) {
    const name = String(feature.properties?.state ?? '');
    let d = '';
    for (const polygon of ringsOf(feature)) {
      for (const ring of polygon) {
        ring.forEach(([lng, lat], i) => {
          if (lat < extent.minLat) extent.minLat = lat;
          if (lat > extent.maxLat) extent.maxLat = lat;
          if (lng < extent.minLng) extent.minLng = lng;
          if (lng > extent.maxLng) extent.maxLng = lng;
          const [x, y] = project(lng, lat);
          d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
        });
        d += 'Z';
      }
    }
    states.push({ name, d });
  }
  return {
    states,
    byName: new Map(states.map((s) => [s.name, s])),
    all: states.map((s) => s.d).join(''),
    extent,
  };
}

let geoPromise: Promise<IndiaGeo> | null = null;
let geoValue: IndiaGeo | null = null;
let rawPromise: Promise<GeoCollection> | null = null;

/** The raw boundary file, fetched once and shared with the 3D relief. */
export function loadIndiaGeoJson(): Promise<GeoCollection> {
  rawPromise ??= fetch(`${import.meta.env.BASE_URL}india-states.geojson`).then((r) =>
    r.ok ? (r.json() as Promise<GeoCollection>) : Promise.reject(new Error('geojson unavailable')),
  );
  // A failed fetch should be retried by the next caller, not cached forever.
  rawPromise.catch(() => {
    rawPromise = null;
  });
  return rawPromise;
}

export function loadIndiaGeo(): Promise<IndiaGeo> {
  geoPromise ??= loadIndiaGeoJson().then((json) => (geoValue = build(json)));
  geoPromise.catch(() => {
    geoPromise = null;
  });
  return geoPromise;
}

export function useIndiaGeo(): IndiaGeo | null {
  const [geo, setGeo] = useState<IndiaGeo | null>(geoValue);
  useEffect(() => {
    if (geo) return;
    let live = true;
    loadIndiaGeo()
      .then((g) => live && setGeo(g))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [geo]);
  return geo;
}

/** Degrees as a cartographer writes them: 26°49′N. */
export function formatDeg(value: number, axis: 'lat' | 'lng'): string {
  const hemi = axis === 'lat' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';
  const abs = Math.abs(value);
  let deg = Math.floor(abs);
  let min = Math.round((abs - deg) * 60);
  if (min === 60) {
    deg += 1;
    min = 0;
  }
  return `${deg}°${String(min).padStart(2, '0')}′${hemi}`;
}

/**
 * A smooth path through points (centripetal-ish Catmull-Rom as cubic Béziers).
 * Used for every drawn "line" that joins places, so they read as a hand's
 * route across a sheet rather than a polyline.
 */
export function smoothPath(points: Array<[number, number]>, tension = 0.5): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${points[0][0]} ${points[0][1]}`;
  let d = `M${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const t = tension / 3;
    const c1x = p1[0] + (p2[0] - p0[0]) * t;
    const c1y = p1[1] + (p2[1] - p0[1]) * t;
    const c2x = p2[0] - (p3[0] - p1[0]) * t;
    const c2y = p2[1] - (p3[1] - p1[1]) * t;
    d += `C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}
