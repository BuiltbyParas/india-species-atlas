import type { ReactNode } from 'react';
import { useSyncExternalStore } from 'react';

/**
 * Media that leaves the page and comes back.
 *
 * A photograph or a film sits in the page at its own size. Opened, it does
 * not cut to a player: the same picture lifts out of its rectangle and grows
 * to fill the screen (a FLIP of one element, `MediaStage.tsx`), the page
 * behind goes dark, the scroll holds, the 3D scenes pause and the reader is in
 * the cinema environment. Closed, it shrinks back into exactly the rectangle
 * it came from, at the same scroll position, and focus returns to whatever
 * opened it.
 *
 * Anything can open media with `openMedia(request, origin)`: the origin is
 * the element whose rectangle the picture starts from and returns to (a
 * poster, a print, or just the link that was pressed). Only one item is open
 * at a time.
 */
export interface FilmRequest {
  kind: 'film';
  title: string;
  /** In order of preference; the browser plays the first it can. */
  sources: Array<{ src: string; type: string }>;
  poster: string;
  /** WebVTT captions, on by default. */
  captions?: { src: string; label: string; lang: string };
  /** The film's frame, width / height. */
  aspect: number;
}

export interface ImageRequest {
  kind: 'image';
  src: string;
  srcSet?: string;
  alt: string;
  width: number;
  height: number;
  /** Shown under the picture: the photograph's credit, which must travel with it. */
  caption?: ReactNode;
}

export type MediaRequest = FilmRequest | ImageRequest;

export interface OpenMedia {
  request: MediaRequest;
  /** Where the picture starts from and returns to. */
  origin: HTMLElement | null;
  /** What to give focus back to. */
  trigger: HTMLElement | null;
  /** Increments per open, so a second open of the same request remounts. */
  id: number;
}

let open: OpenMedia | null = null;
let serial = 0;
const listeners = new Set<() => void>();
const notify = () => {
  for (const l of listeners) l();
};

/** Fetch the stage's code ahead of a likely open (the hand is on a film entry). */
export function prefetchMediaStage() {
  void import('../components/cinema/MediaStage');
}

export function openMedia(request: MediaRequest, origin: HTMLElement | null, trigger?: HTMLElement | null) {
  open = {
    request,
    origin,
    trigger: trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null),
    id: ++serial,
  };
  notify();
}

/** Called by the stage once its closing move has finished. */
export function clearMedia() {
  open = null;
  notify();
}

export function useOpenMedia(): OpenMedia | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => open,
    () => null,
  );
}

/** A rectangle, in viewport pixels. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The largest box of `aspect` that fits `area`, centred in it. */
export function fit(aspect: number, area: Box): Box {
  let w = area.w;
  let h = w / aspect;
  if (h > area.h) {
    h = area.h;
    w = h * aspect;
  }
  return { x: area.x + (area.w - w) / 2, y: area.y + (area.h - h) / 2, w, h };
}

/**
 * The transform and clip that make a picture laid out at `to` look exactly as
 * it did at `from`, where it was cropped to cover a box of a different shape.
 * Animating both to identity is the whole FLIP: the picture grows and its crop
 * opens at the same time, so a landscape print that was shown as a tall crop
 * unfolds rather than jumping.
 */
export function flipFrom(from: Box, to: Box): { transform: string; clipPath: string } {
  const s = Math.max(from.w / to.w, from.h / to.h);
  // The visible part, in the picture's own (unscaled) pixels.
  const vw = from.w / s;
  const vh = from.h / s;
  const ix = (to.w - vw) / 2;
  const iy = (to.h - vh) / 2;
  // Scale about the picture's centre, then move that centre onto the origin's centre.
  const dx = from.x + from.w / 2 - (to.x + to.w / 2);
  const dy = from.y + from.h / 2 - (to.y + to.h / 2);
  return {
    transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(${s.toFixed(5)})`,
    clipPath: `inset(${iy.toFixed(2)}px ${ix.toFixed(2)}px ${iy.toFixed(2)}px ${ix.toFixed(2)}px)`,
  };
}

/**
 * The rectangle a picture actually occupies on screen. For an image drawn with
 * `object-fit: contain` that is the letterboxed picture inside the element,
 * not the element, so the move starts from the print and not from its margins.
 */
export function boxOf(el: Element): Box {
  const r = el.getBoundingClientRect();
  const box = { x: r.left, y: r.top, w: r.width, h: r.height };
  if (!(el instanceof HTMLImageElement) || !el.naturalWidth) return box;
  const style = getComputedStyle(el);
  if (style.objectFit !== 'contain') return box;
  const drawn = fit(el.naturalWidth / el.naturalHeight, { x: 0, y: 0, w: r.width, h: r.height });
  const [px, py] = style.objectPosition.split(' ').map((v) => (v.endsWith('%') ? Number.parseFloat(v) / 100 : 0.5));
  return {
    x: r.left + (r.width - drawn.w) * (px ?? 0.5),
    y: r.top + (r.height - drawn.h) * (py ?? 0.5),
    w: drawn.w,
    h: drawn.h,
  };
}
