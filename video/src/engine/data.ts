import { SPECIES_BY_ID } from '../../../src/data/species';
import type { Species } from '../../../src/types';
import statesUrl from '../../../public/india-states.geojson?url';
import { FEATURED } from '../timeline.mjs';

/**
 * Everything the film draws from, loaded once before the first frame.
 *
 * Species facts come straight from the atlas's own `src/data/species.ts`, so
 * the film cannot state a status or a place the atlas does not. Geography is
 * the atlas's state boundaries plus the public-domain layers fetched by
 * `scripts/video/fetch-data.mjs`. A missing file is recorded, not thrown:
 * the stage draws a visible placeholder and QC reports it.
 */

export type LngLat = [number, number];

export interface Grid {
  cols: number;
  rows: number;
  west: number;
  east: number;
  south: number;
  north: number;
  cellsize: number;
  min: number;
  max: number;
  data: Int16Array;
}

export interface GeoLine {
  coords: LngLat[];
  name: string | null;
  rank: number;
}

export interface StateShape {
  name: string;
  rings: LngLat[][];
}

export interface PhotoMeta {
  id: string;
  file: string;
  width: number;
  height: number;
  artist: string;
  licence: string;
  licenceUrl: string | null;
  source: string;
}

export interface Assets {
  states: StateShape[];
  stateByName: Map<string, StateShape>;
  rivers: GeoLine[];
  roads: GeoLine[];
  india: Grid | null;
  himalaya: Grid | null;
  photos: Map<string, HTMLImageElement>;
  photoMeta: Map<string, PhotoMeta>;
  species: Map<string, Species>;
  extent: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  missing: string[];
}

async function json<T>(url: string, missing: string[]): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(String(r.status));
    return (await r.json()) as T;
  } catch {
    missing.push(url);
    return null;
  }
}

async function grid(name: string, missing: string[]): Promise<Grid | null> {
  const meta = await json<Omit<Grid, 'data'>>(`/data/${name}.json`, missing);
  if (!meta) return null;
  try {
    const r = await fetch(`/data/${name}.bin`);
    if (!r.ok) throw new Error(String(r.status));
    const data = new Int16Array(await r.arrayBuffer());
    if (data.length !== meta.cols * meta.rows) throw new Error('size mismatch');
    return { ...meta, data };
  } catch {
    missing.push(`/data/${name}.bin`);
    return null;
  }
}

function image(src: string, missing: string[]): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'sync';
    img.onload = () => img.decode().then(() => resolve(img), () => resolve(img));
    img.onerror = () => {
      missing.push(src);
      resolve(null);
    };
    img.src = src;
  });
}

type FC = { features: Array<{ properties: Record<string, unknown>; geometry: { type: string; coordinates: unknown } }> };

function linesOf(fc: FC | null, rankKey = 'scalerank'): GeoLine[] {
  if (!fc) return [];
  const out: GeoLine[] = [];
  for (const f of fc.features) {
    const g = f.geometry;
    const parts = (g.type === 'LineString' ? [g.coordinates] : g.coordinates) as LngLat[][];
    for (const coords of parts) {
      out.push({ coords, name: (f.properties.name as string) ?? null, rank: Number(f.properties[rankKey] ?? 10) });
    }
  }
  return out;
}

export async function loadAssets(): Promise<Assets> {
  const missing: string[] = [];
  const [statesFc, riversFc, roadsFc, india, himalaya, photoList] = await Promise.all([
    json<FC>(statesUrl, missing),
    json<FC>('/data/rivers.geojson', missing),
    json<FC>('/data/roads.geojson', missing),
    grid('etopo-india', missing),
    grid('etopo-himalaya', missing),
    json<PhotoMeta[]>('/species/photos.json', missing),
  ]);

  const states: StateShape[] = [];
  const extent = { minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 };
  for (const f of statesFc?.features ?? []) {
    const g = f.geometry;
    const polys = (g.type === 'Polygon' ? [g.coordinates] : g.coordinates) as LngLat[][][];
    const rings = polys.flat();
    for (const ring of rings) {
      for (const [lng, lat] of ring) {
        extent.minLat = Math.min(extent.minLat, lat);
        extent.maxLat = Math.max(extent.maxLat, lat);
        extent.minLng = Math.min(extent.minLng, lng);
        extent.maxLng = Math.max(extent.maxLng, lng);
      }
    }
    states.push({ name: String(f.properties.state ?? ''), rings });
  }

  const photos = new Map<string, HTMLImageElement>();
  const photoMeta = new Map<string, PhotoMeta>();
  await Promise.all(
    FEATURED.map(async (id: string) => {
      const meta = photoList?.find((p) => p.id === id);
      if (!meta) {
        missing.push(`/species/${id}.jpg (no entry in photos.json)`);
        return;
      }
      photoMeta.set(id, meta);
      const img = await image(`/${meta.file}`, missing);
      if (img) photos.set(id, img);
    }),
  );

  const species = new Map<string, Species>();
  for (const id of FEATURED) {
    const s = SPECIES_BY_ID[id];
    if (s) species.set(id, s);
    else missing.push(`species record ${id}`);
  }

  return {
    states,
    stateByName: new Map(states.map((s) => [s.name, s])),
    rivers: linesOf(riversFc),
    roads: linesOf(roadsFc),
    india,
    himalaya,
    photos,
    photoMeta,
    species,
    extent,
    missing,
  };
}

/** Bilinear elevation in metres at a point, or 0 outside the grid. */
export function sampleGrid(g: Grid | null, lng: number, lat: number): number {
  if (!g) return 0;
  const fx = ((lng - g.west) / (g.east - g.west)) * (g.cols - 1);
  const fy = ((g.north - lat) / (g.north - g.south)) * (g.rows - 1);
  if (fx < 0 || fy < 0 || fx > g.cols - 1 || fy > g.rows - 1) return 0;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(x0 + 1, g.cols - 1);
  const y1 = Math.min(y0 + 1, g.rows - 1);
  const dx = fx - x0;
  const dy = fy - y0;
  const d = g.data;
  const a = d[y0 * g.cols + x0];
  const b = d[y0 * g.cols + x1];
  const c = d[y1 * g.cols + x0];
  const e = d[y1 * g.cols + x1];
  return (a * (1 - dx) + b * dx) * (1 - dy) + (c * (1 - dx) + e * dx) * dy;
}
