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

export const MOUNTAIN_MAX = 92;

/** The high Himalaya: a valley in front, ranges rising behind it. */
export function mountains(x: number, z: number): number {
  const far = Math.min(1, Math.max(0, (40 - z) / 280));
  const valley = Math.min(1, Math.abs(x + Math.sin(z * 0.012) * 30) / 90);
  const r = Math.pow(ridged(x * 0.0052, z * 0.0052, 6, 9), 1.25);
  const lift = 0.22 + 0.78 * far * (0.35 + 0.65 * valley);
  return r * MOUNTAIN_MAX * lift + fbm(x * 0.03, z * 0.03, 3, 4) * 3.5;
}

/** The floodplain: almost flat, a little swell. */
export function floodplain(x: number, z: number): number {
  return (fbm(x * 0.012, z * 0.012, 3, 6) - 0.5) * 3;
}

export const GROUNDS = { dunes, mountains, floodplain } as const;
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
