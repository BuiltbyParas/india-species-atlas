import { useSyncExternalStore } from 'react';

/**
 * Whether the opening sequence has finished.
 *
 * The loader owns the first seconds of a visit; the hero holds its headline
 * back until this flips, so the two read as one continuous shot rather than
 * two animations fighting over the same frame.
 */
let done = false;
const listeners = new Set<() => void>();

export function markIntroDone() {
  if (done) return;
  done = true;
  for (const l of listeners) l();
}

export function isIntroDone() {
  return done;
}

export function useIntroDone(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => done,
    () => true,
  );
}

/**
 * Whether the hero has painted. The loader's last step waits on this, so
 * "First frame" is ticked by the frame itself rather than by a timer: the
 * relief's first rendered frame, or the flat map mounting where there is no
 * 3D. Resolves once and stays resolved.
 */
let firstFrame = false;
let resolveFirstFrame: () => void = () => undefined;
const firstFramePromise = new Promise<void>((r) => {
  resolveFirstFrame = r;
});

export function markFirstFrame() {
  if (firstFrame) return;
  firstFrame = true;
  resolveFirstFrame();
}

export function whenFirstFrame(): Promise<void> {
  return firstFramePromise;
}
