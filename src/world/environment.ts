import { emit, on } from '../interaction/events';
import { onScroll } from '../interaction/scroll';

/**
 * The atmosphere the reader is standing in.
 *
 * The atlas moves through grounds — the calibration sheet, the Thar, the
 * forests, the river, the high Himalaya, the evidence pages, the cinema — and
 * each has its own line colour, accent and ground. They are not themes: they
 * are one visual language whose tokens change with the geography, the way a
 * printed atlas changes paper tint between plates.
 *
 * A section declares where it is with `data-env="thar"`. Whichever declared
 * section crosses the middle of the viewport is the current environment
 * (checked from the shared scroll signal, a few times a second), written
 * once to `<html data-env>` (CSS in index.css turns that into `--env-line`,
 * `--env-accent`, `--env-ground`, `--env-ink`) and announced as
 * `environment:change`. It changes only at a boundary, never per frame, so
 * the one restyle it costs is spent where the story itself changes.
 *
 * An overlay that takes the screen (the film) holds an environment over
 * whatever the page says (`holdEnvironment`), and gives it back on release.
 *
 * Today the environments drive the instrument's line and accent, the running
 * head's rule and the film; the home page's grounds are left as they are until
 * its recomposition is decided (documentation/HOMEPAGE_CREATIVE_DECONSTRUCTION.md §4, §16).
 */
export type Environment =
  | 'calibration'
  | 'atlas'
  | 'thar'
  | 'himalaya'
  | 'river'
  | 'forest'
  | 'floodplain'
  | 'data'
  | 'cinema'
  | 'final';

let page: Environment = 'atlas';
let held: Environment | null = null;
let published: Environment | null = null;
let installed = false;
let sections: HTMLElement[] = [];
let rescanQueued = false;
let timer = 0;
let lastCheck = 0;
/** At most this often while scrolling, plus once when the scroll stops. */
const CHECK_MS = 120;

function publish() {
  const next = held ?? page;
  if (next === published) return;
  published = next;
  document.documentElement.dataset.env = next;
  emit('environment:change', { env: next });
}

/**
 * Which declared section crosses the middle of the viewport. A handful of
 * rectangle reads, at most every CHECK_MS: scrolling does not dirty layout,
 * so they are cheap. (An IntersectionObserver on a hairline root was tried
 * first; through the GSAP-pinned scenes its callbacks arrived seconds late.)
 */
function check() {
  timer = 0;
  lastCheck = performance.now();
  const mid = window.innerHeight / 2;
  let best: HTMLElement | null = null;
  for (const el of sections) {
    const r = el.getBoundingClientRect();
    if (r.top > mid || r.bottom < mid) continue;
    // The innermost declared section wins (a field study inside a chapter).
    if (!best || best.contains(el)) best = el;
  }
  const env = best?.dataset.env as Environment | undefined;
  if (env && env !== page) {
    page = env;
    publish();
  }
}

function queueCheck() {
  if (timer) return;
  const wait = Math.max(0, CHECK_MS - (performance.now() - lastCheck));
  timer = window.setTimeout(check, wait);
}

function rescan() {
  rescanQueued = false;
  sections = [...document.querySelectorAll<HTMLElement>('[data-env]')].filter((el) => el !== document.documentElement);
  queueCheck();
}

function queueRescan() {
  if (rescanQueued) return;
  rescanQueued = true;
  requestAnimationFrame(rescan);
}

/** Start watching. Called once by the InteractionProvider. */
export function installEnvironments() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  onScroll(queueCheck);
  window.addEventListener('resize', queueCheck);
  // Sections arrive with routes and lazy chunks; look again whenever the tree grows.
  new MutationObserver((records) => {
    for (const r of records) if (r.addedNodes.length) return queueRescan();
  }).observe(document.body, { childList: true, subtree: true });
  on('navigation:end', () => {
    // A page without declared sections is on the atlas sheet.
    page = 'atlas';
    publish();
    queueRescan();
  });
  rescan();
  publish();
}

/** Hold `env` over the page's own environment until the returned release is called. */
export function holdEnvironment(env: Environment): () => void {
  held = env;
  publish();
  return () => {
    if (held === env) held = null;
    publish();
  };
}

export function currentEnvironment(): Environment {
  return held ?? page;
}

if (typeof window !== 'undefined') {
  (window as unknown as { __atlasEnv?: () => object }).__atlasEnv = () => ({
    page,
    held,
    sections: sections.map((el) => `${el.dataset.env}${el.isConnected ? '' : ' (detached)'}`),
  });
}
