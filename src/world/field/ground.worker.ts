/// <reference lib="webworker" />
import { buildGrid, sampleHeights, type GridSpec, type GroundName } from './grounds';

/**
 * Builds a field study's ground off the main thread: a few hundred thousand
 * noise samples and their normals, handed back as transferable arrays, so the
 * page keeps scrolling while the next world is made.
 */
type HeightsSpec = { ground: GroundName; rect: [number, number, number, number]; nx: number; nz: number };

self.onmessage = (e: MessageEvent<{ id: number; spec?: GridSpec; heights?: HeightsSpec }>) => {
  const { id, spec, heights } = e.data;
  if (heights) {
    const solid = sampleHeights(heights.ground, heights.rect, heights.nx, heights.nz);
    (self as unknown as DedicatedWorkerGlobalScope).postMessage({ id, solid }, [solid.buffer]);
    return;
  }
  if (!spec) return;
  const grid = buildGrid(spec);
  (self as unknown as DedicatedWorkerGlobalScope).postMessage({ id, ...grid }, [grid.position.buffer, grid.normal.buffer, grid.index.buffer]);
};
