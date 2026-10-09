import { fbm, ridged } from './noise';

/**
 * The field studies' grounds, as pure height functions.
 *
 * Kept apart from the worlds (which need three.js) so the same function can
 * run in the ground worker (`ground.worker.ts`) that builds the mesh off the
 * main thread, and on the main thread wherever a world asks for a single
 * height — to lay a line on the dunes or keep the camera above a ridge. One
 * function, two places, the same numbers.
 *
 * Every one of these is an impression of a landscape, not terrain data; the
 * study pages say so.
 */

/** The Thar: crescents along the wind, warped, on a gently rolling floor. */
export function dunes(x: number, z: number): number {
  const a = 0.38;
  const u = x * Math.cos(a) + z * Math.sin(a);
  const w = -x * Math.sin(a) + z * Math.cos(a);
  const warp = (fbm(x * 0.006, z * 0.006, 3, 11) - 0.5) * 70;
  const phase = (u + warp + w * 0.18) * 0.034;
  const f = phase - Math.floor(phase);
  // Long windward slope, short steep slip face.
  const profile = f < 0.8 ? Math.pow(f / 0.8, 1.7) : Math.pow((1 - f) / 0.2, 1.4);
  const field = 0.45 + 0.75 * fbm(x * 0.004 + 3, z * 0.004, 3, 5);
  const floor = (fbm(x * 0.012, z * 0.012, 4, 2) - 0.5) * 3.2;
  return profile * 7.5 * field + floor;
}

/**
 * The Thar's arid grassland: a gravelly plain that swells a few metres over
 * hundreds, with low sand hummocks gathered where scrub holds them. No
 * crests, no slip faces — the open ground the bustard walks.
 */
export function grassland(x: number, z: number): number {
  const swell = (fbm(x * 0.0045 + 7, z * 0.0045, 3, 21) - 0.5) * 7;
  const roll = (fbm(x * 0.018, z * 0.018, 3, 22) - 0.5) * 1.6;
  const hum = Math.pow(Math.max(0, fbm(x * 0.05 + 2, z * 0.05, 2, 23) - 0.52) * 4, 1.6) * 0.9;
  return swell + roll + hum;
}

/** Where the snow leopard's ledge lies in the Himalayan ground (x, z, height of the terrace). */
export const LEDGE = { x: 0, z: -40, y: 16 };

const sstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * The high Himalaya: a snowy terrace in front, a valley that meanders away,
 * its walls rising, and ranges standing behind it, taller and sharper with
 * distance. The terrace is the leopard's ledge.
 */
export function mountains(x: number, z: number): number {
  const dist = Math.min(1, Math.max(0, (-z - 30) / 1500));
  const axis = Math.sin(z * 0.006) * 40 + Math.sin(z * 0.0021 + 1) * 90;
  const wall = sstep(50, 380, Math.abs(x - axis));
  // Broad massifs, then the spurs and gullies cut into them. Detail fades with distance: the far
  // sheet's cells are too wide to carry it, and it would alias into needles.
  const farMix = sstep(200, 800, -z);
  const massif = Math.pow(ridged(x * 0.0017 + 3, z * 0.0017, 5, 9), 1.15);
  const spurs = (1 - farMix) * ridged(x * 0.011 + 5, z * 0.011, 4, 4) + farMix * ridged(x * 0.0042 + 5, z * 0.0042, 3, 4);
  const gully = (1 - farMix) * ridged(x * 0.04, z * 0.04 + 9, 3, 6);
  const relief = 30 + 560 * Math.pow(dist, 0.85) + 150 * wall;
  let h = massif * relief * (0.5 + 0.4 * spurs + 0.12 * gully);
  // The range behind the terrace: a long snow slope that climbs to a ridge.
  h += sstep(30, 170, -z) * (1 - sstep(170, 330, -z)) * 55 * (0.65 + 0.35 * fbm(x * 0.01, z * 0.01, 3, 12));
  // Broken crags across the middle ground, behind the terrace and along the valley's walls.
  h += sstep(40, 130, -z) * (1 - sstep(300, 620, -z)) * 36 * Math.pow(ridged(x * 0.013 + 1, z * 0.013, 4, 15), 1.5) * (0.4 + wall);
  h += fbm(x * 0.03, z * 0.03, 3, 4) * 4;
  // The terrace: flat enough to stand on, tilted back, with a lip toward the viewer.
  const lx = Math.abs(x - LEDGE.x) / 52;
  const lz = Math.abs(z - LEDGE.z) / 40;
  const m = 1 / (1 + lx ** 4 + lz ** 4);
  const terrace = LEDGE.y + Math.min(40, Math.max(-30, LEDGE.z - z)) * 0.14 + (fbm(x * 0.05, z * 0.05, 3, 7) - 0.5) * 2.4;
  return h + (terrace - h) * Math.min(1, m * 1.25);
}

/** The floodplain: almost flat, a little swell. */
export function floodplain(x: number, z: number): number {
  return (fbm(x * 0.012, z * 0.012, 3, 6) - 0.5) * 3;
}

export const GROUNDS = { dunes, grassland, mountains, floodplain } as const;
export type GroundName = keyof typeof GROUNDS;

export interface GridSpec {
  ground: GroundName;
  width: number;
  depth: number;
  segX: number;
  segZ: number;
  cx: number;
  cz: number;
}

/**
 * Positions, normals and triangles for a ground: rows run far → near (z
 * increasing), columns west → east, triangles wound to face up. Normals are
 * central differences of the height function itself, so they are smooth
 * across the whole sheet with no seams.
 */
export function buildGrid(spec: GridSpec): { position: Float32Array; normal: Float32Array; index: Uint32Array } {
  const h = GROUNDS[spec.ground];
  const { width, depth, segX, segZ, cx, cz } = spec;
  const nx = segX + 1;
  const nz = segZ + 1;
  const position = new Float32Array(nx * nz * 3);
  const normal = new Float32Array(nx * nz * 3);
  const dx = width / segX;
  const dz = depth / segZ;
  const e = Math.min(dx, dz) * 0.5;
  for (let iz = 0; iz < nz; iz++) {
    const z = cz - depth / 2 + iz * dz;
    for (let ix = 0; ix < nx; ix++) {
      const x = cx - width / 2 + ix * dx;
      const k = (iz * nx + ix) * 3;
      position[k] = x;
      position[k + 1] = h(x, z);
      position[k + 2] = z;
      const gx = (h(x + e, z) - h(x - e, z)) / (2 * e);
      const gz = (h(x, z + e) - h(x, z - e)) / (2 * e);
      const len = Math.hypot(gx, 1, gz);
      normal[k] = -gx / len;
      normal[k + 1] = 1 / len;
      normal[k + 2] = -gz / len;
    }
  }
  const index = new Uint32Array(segX * segZ * 6);
  let n = 0;
  for (let iz = 0; iz < segZ; iz++) {
    for (let ix = 0; ix < segX; ix++) {
      const a = iz * nx + ix;
      const b = (iz + 1) * nx + ix;
      const c = (iz + 1) * nx + ix + 1;
      const d = iz * nx + ix + 1;
      index[n++] = a;
      index[n++] = b;
      index[n++] = d;
      index[n++] = b;
      index[n++] = c;
      index[n++] = d;
    }
  }
  return { position, normal, index };
}
