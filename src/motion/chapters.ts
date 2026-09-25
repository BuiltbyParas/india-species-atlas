import { useEffect, useSyncExternalStore, type RefObject } from 'react';

/**
 * Which chapter of the documentary is on screen, for the header's running
 * title and the route-line progress.
 *
 * The current chapter is the last one whose top edge has passed the middle of
 * the viewport. That is computed from positions on scroll rather than from
 * intersection events, so a jump (a link, the End key, a fast fling) lands on
 * the right title even when the chapters in between were never on screen.
 */
export interface Chapter {
  index: number;
  title: string;
}

let current: Chapter | null = null;
const listeners = new Set<() => void>();
const registered = new Map<Element, Chapter>();
let raf = 0;
let listening = false;

function emit(next: Chapter | null) {
  if (current?.index === next?.index) return;
  current = next;
  for (const l of listeners) l();
}

function compute() {
  raf = 0;
  const line = window.innerHeight * 0.5;
  let best: { top: number; chapter: Chapter } | null = null;
  for (const [el, chapter] of registered) {
    const top = el.getBoundingClientRect().top;
    if (top <= line && (!best || top > best.top)) best = { top, chapter };
  }
  emit(best?.chapter ?? null);
}

function schedule() {
  if (!raf) raf = requestAnimationFrame(compute);
}

function ensureListening() {
  if (listening) return;
  listening = true;
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
}

export function useCurrentChapter(): Chapter | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => null,
  );
}

export function useChapter(ref: RefObject<Element | null>, chapter: Chapter) {
  const { index, title } = chapter;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    registered.set(el, { index, title });
    ensureListening();
    schedule();
    return () => {
      registered.delete(el);
      schedule();
    };
  }, [ref, index, title]);
}
