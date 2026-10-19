/**
 * The page's scroll, as one signal.
 *
 * Every part of the atlas that reads the scroll — the camera's descent, the
 * running chapter title, the route progress, the cursor re-checking what is
 * under a still hand, magnetic controls, scroll velocity — subscribes here
 * instead of adding its own `scroll` listener. One passive listener on the
 * window reads `scrollY` once per event and hands every subscriber the same
 * numbers, so nothing reads layout twice for the same scroll.
 *
 * Subscribers run inside the scroll event, as their own listeners did, and
 * must stay cheap: write a target and let a spring or a frame task do the
 * work (see `loop.ts`). For how fast the page is moving, use `velocity.ts`,
 * which is itself a subscriber.
 *
 * Lenis drives the documentary page by setting the window's scroll position,
 * so its smoothed scroll arrives here as ordinary scroll events.
 */
export interface ScrollSample {
  /** `window.scrollY`. */
  y: number;
  /** +1 scrolling down the page, −1 up. Holds its last value at rest. */
  direction: 1 | -1;
  /** The event's timestamp, ms. */
  t: number;
}

type Subscriber = (s: ScrollSample) => void;

const subscribers = new Set<Subscriber>();
const sample: ScrollSample = { y: 0, direction: 1, t: 0 };
let listening = false;

function onScrollEvent(e: Event) {
  const y = window.scrollY;
  if (y !== sample.y) sample.direction = y > sample.y ? 1 : -1;
  sample.y = y;
  sample.t = e.timeStamp || performance.now();
  for (const s of subscribers) s(sample);
}

/** Subscribe to the page scrolling. Returns the unsubscribe. */
export function onScroll(fn: Subscriber): () => void {
  if (!listening && typeof window !== 'undefined') {
    listening = true;
    sample.y = window.scrollY;
    window.addEventListener('scroll', onScrollEvent, { passive: true });
  }
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

/** The last scroll sample, without subscribing. */
export function scrollSample(): Readonly<ScrollSample> {
  return sample;
}
