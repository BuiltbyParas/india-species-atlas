import * as THREE from 'three';
import { buildGrid, GROUNDS, sampleHeights, type GridSpec, type GroundName } from '../grounds';
import type { SolidGrid } from './sunlight';

/**
 * A field study's ground: a grid shaped by one of the height functions in
 * `grounds.ts`, built in a worker so a world can be made while the reader is
 * still scrolling, and on the main thread only where workers are missing.
 *
 * The same function is returned, so the world can ask "how high is the
 * ground here?" — to lay a line on it, stand a pylon on it, keep a camera
 * above it — and get exactly the height the mesh has.
 */
export interface Heightfield {
  geometry: THREE.BufferGeometry;
  height: (x: number, z: number) => number;
}

type Grid = { position: Float32Array; normal: Float32Array; index: Uint32Array };
type Reply = Grid & { solid?: Float32Array };

let worker: Worker | null = null;
let failed = false;
let seq = 0;
const waiting = new Map<number, (reply: Reply | null) => void>();

function getWorker(): Worker | null {
  if (worker || failed || typeof Worker === 'undefined') return worker;
  try {
    worker = new Worker(new URL('../ground.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<Reply & { id: number }>) => {
      waiting.get(e.data.id)?.(e.data);
      waiting.delete(e.data.id);
    };
    worker.onerror = () => {
      failed = true;
      worker = null;
      for (const resolve of waiting.values()) resolve(null);
      waiting.clear();
    };
  } catch {
    failed = true;
    worker = null;
  }
  return worker;
}

function gridOffThread(spec: GridSpec): Promise<Grid> {
  const w = getWorker();
  if (!w) return Promise.resolve(buildGrid(spec));
  const id = ++seq;
  return new Promise<Grid | null>((resolve) => {
    waiting.set(id, resolve);
    w.postMessage({ id, spec });
  }).then((grid) => grid ?? buildGrid(spec));
}

export async function makeHeightfield(
  ground: GroundName,
  width: number,
  depth: number,
  segX: number,
  segZ: number,
  center: [number, number] = [0, 0],
): Promise<Heightfield> {
  const grid = await gridOffThread({ ground, width, depth, segX, segZ, cx: center[0], cz: center[1] });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(grid.position, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(grid.normal, 3));
  geometry.setIndex(new THREE.BufferAttribute(grid.index, 1));
  geometry.computeBoundingSphere();
  return { geometry, height: GROUNDS[ground] };
}

/**
 * A ground's heights on a finer grid than its mesh, for a world's sun grid (gl/sunlight.ts) — sampled in the
 * worker, so the page keeps scrolling while it is made.
 */
export async function groundGrid(ground: GroundName, rect: [number, number, number, number], nx: number, nz: number): Promise<SolidGrid> {
  const w = getWorker();
  let solid: Float32Array | null = null;
  if (w) {
    const id = ++seq;
    const reply = await new Promise<Reply | null>((resolve) => {
      waiting.set(id, resolve);
      w.postMessage({ id, heights: { ground, rect, nx, nz } });
    });
    solid = reply?.solid ?? null;
  }
  return { rect, nx, nz, solid: solid ?? sampleHeights(ground, rect, nx, nz) };
}
