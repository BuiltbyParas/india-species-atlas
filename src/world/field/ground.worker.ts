/// <reference lib="webworker" />
import { buildGrid, type GridSpec } from './grounds';

/**
 * Builds a field study's ground off the main thread: a few hundred thousand
 * noise samples and their normals, handed back as transferable arrays, so the
 * page keeps scrolling while the next world is made.
 */
self.onmessage = (e: MessageEvent<{ id: number; spec: GridSpec }>) => {
  const { id, spec } = e.data;
  const grid = buildGrid(spec);
  (self as unknown as DedicatedWorkerGlobalScope).postMessage({ id, ...grid }, [grid.position.buffer, grid.normal.buffer, grid.index.buffer]);
};
