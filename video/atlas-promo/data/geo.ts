/**
 * India's geometry for the film.
 *
 * ONE source: the state polygons are imported from public/india-states.geojson
 * — the same file the site's Leaflet map, species maps and conservation map
 * draw — and projected with the site's own `project()` from src/geo/india.ts.
 * The film therefore shows exactly the political-map convention the site
 * shows: the north drawn as one Jammu and Kashmir territory that includes
 * Ladakh, the Northeast, and both island groups.
 *
 * The outline is derived from the same state file by
 * scripts/video/atlas-promo/prep-geo.mjs, which also bakes the relief,
 * contours and rivers into rasters in video/public/promo/geo/.
 */
import { useEffect, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';
import indiaStates from '../../../public/india-states.geojson';
import { MAP_HEIGHT, MAP_WIDTH, project } from '../../../src/geo/india';

export { MAP_WIDTH, MAP_HEIGHT, project };

type Ring = Array<[number, number]>;

export interface StateShape {
  name: string;
  d: string;
  /** Area-weighted centre in map units, used to drift states apart. */
  cx: number;
  cy: number;
  area: number;
  /** Outer rings in map units, for point-in-state tests. */
  rings: Array<Array<[number, number]>>;
}

function ringsOf(geometry: { type: string; coordinates: unknown }): Ring[][] {
  if (geometry.type === 'Polygon') return [geometry.coordinates as Ring[]];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates as Ring[][];
  return [];
}

const extent = { minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 };

export const STATES: StateShape[] = indiaStates.features.map((f) => {
  let d = '';
  let ax = 0;
  let ay = 0;
  let area = 0;
  const rings: StateShape['rings'] = [];
  for (const polygon of ringsOf(f.geometry)) {
    polygon.forEach((ring, ri) => {
      const pts = ring.map(([lng, lat]) => {
        extent.minLat = Math.min(extent.minLat, lat);
        extent.maxLat = Math.max(extent.maxLat, lat);
        extent.minLng = Math.min(extent.minLng, lng);
        extent.maxLng = Math.max(extent.maxLng, lng);
        return project(lng, lat);
      });
      d += pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('') + 'Z';
      if (ri > 0) return; // holes do not move the centre
      rings.push(pts);
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[i + 1];
        const c = x0 * y1 - x1 * y0;
        area += c;
        ax += (x0 + x1) * c;
        ay += (y0 + y1) * c;
      }
    });
  }
  const a = area / 2;
  return { name: f.properties.state, d, rings, area: Math.abs(a), cx: ax / (6 * a || 1), cy: ay / (6 * a || 1) };
});

export const STATE_BY_NAME = new Map(STATES.map((s) => [s.name, s]));
export const ALL_STATES_D = STATES.map((s) => s.d).join('');

function inRing(x: number, y: number, ring: Array<[number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** The state a map point falls in; offshore points take the nearest state centre. */
export function stateAt(x: number, y: number): StateShape {
  for (const s of STATES) if (s.rings.some((r) => inRing(x, y, r))) return s;
  let best = STATES[0];
  let bd = Infinity;
  for (const s of STATES) {
    const d = Math.hypot(s.cx - x, s.cy - y);
    if (d < bd) {
      bd = d;
      best = s;
    }
  }
  return best;
}

/** The extent of the boundary file in degrees (for the coordinate captions). */
export const EXTENT = extent;

/** The map's centre of mass, in map units. */
export const MAP_CENTRE = (() => {
  let x = 0;
  let y = 0;
  let w = 0;
  for (const s of STATES) {
    x += s.cx * s.area;
    y += s.cy * s.area;
    w += s.area;
  }
  return { x: x / w, y: y / w };
})();

/** Map units → degrees (the inverse of the site's projection). */
const [x0, y0] = project(68, 37.2);
const [x1, y1] = project(97.5, 6.5);
export function unproject(x: number, y: number): [number, number] {
  return [68 + ((x - x0) / (x1 - x0)) * 29.5, 37.2 - ((y - y0) / (y1 - y0)) * 30.7];
}

/** Map units per kilometre (north–south, where the projection is exact). */
export const UNITS_PER_KM = (y1 - y0) / 30.7 / 111.32;

// --- Pre-projected layers ------------------------------------------------------------

export interface GeoLayers {
  outline: Array<{ length: number; d: string }>;
  missing: string[];
}

/**
 * The static layers, baked by prep-geo.mjs into rasters that cover the map
 * sheet (0..MAP_WIDTH × 0..MAP_HEIGHT) and are already clipped to India.
 */
export const RASTERS = {
  relief: 'promo/geo/relief.png',
  contoursLow: 'promo/geo/contours-low.png',
  contoursHigh: 'promo/geo/contours-high.png',
  rivers: 'promo/geo/rivers.png',
} as const;

let layersPromise: Promise<GeoLayers> | null = null;

function loadLayers(): Promise<GeoLayers> {
  layersPromise ??= (async () => {
    const missing: string[] = [];
    const get = async <T,>(file: string, pick: (j: any) => T, empty: T): Promise<T> => {
      try {
        const r = await fetch(staticFile(`promo/geo/${file}`));
        if (!r.ok) throw new Error(String(r.status));
        return pick(await r.json());
      } catch {
        missing.push(file);
        return empty;
      }
    };
    const outline = await get('outline.json', (j) => j.paths, []);
    // Decode the baked rasters before the first frame, so no frame is
    // captured with a layer still loading.
    await Promise.all(
      Object.values(RASTERS).map(async (src) => {
        const img = new Image();
        img.src = staticFile(src);
        try {
          await img.decode();
        } catch {
          missing.push(src);
        }
      }),
    );
    if (missing.length) console.warn(`[atlas-promo] missing ${missing.join(', ')} — run npm run video:promo:prep`);
    return { outline, missing };
  })();
  return layersPromise;
}

/** The pre-projected layers; holds the render until they have loaded. */
export function useGeoLayers(): GeoLayers | null {
  const [layers, setLayers] = useState<GeoLayers | null>(null);
  const [handle] = useState(() => delayRender('geo layers'));
  useEffect(() => {
    loadLayers().then((l) => {
      setLayers(l);
      continueRender(handle);
    });
  }, [handle]);
  return layers;
}
