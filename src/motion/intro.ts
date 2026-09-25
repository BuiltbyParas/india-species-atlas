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
