import { useSyncExternalStore } from 'react';

/**
 * Visitor preferences that decide how much of the motion runs.
 *
 * Read through `useSyncExternalStore` so a visitor who switches reduced motion
 * on while the page is open gets the calm version immediately, not on reload.
 */
function mediaStore(query: string) {
  const get = () => (typeof window === 'undefined' ? false : window.matchMedia(query).matches);
  const subscribe = (cb: () => void) => {
    const mq = window.matchMedia(query);
    mq.addEventListener('change', cb);
    return () => mq.removeEventListener('change', cb);
  };
  return { get, subscribe };
}

const reduced = mediaStore('(prefers-reduced-motion: reduce)');
const fine = mediaStore('(hover: hover) and (pointer: fine)');
const wide = mediaStore('(min-width: 1180px) and (min-height: 680px)');

export const prefersReducedMotion = reduced.get;
export const hasFinePointer = fine.get;
export const isWideLayout = wide.get;

export function useReducedMotion(): boolean {
  return useSyncExternalStore(reduced.subscribe, reduced.get, () => false);
}

export function useFinePointer(): boolean {
  return useSyncExternalStore(fine.subscribe, fine.get, () => false);
}

/** The cinematic, pinned layout is a desktop layout; phones get their own. */
export function useWideLayout(): boolean {
  return useSyncExternalStore(wide.subscribe, wide.get, () => true);
}
