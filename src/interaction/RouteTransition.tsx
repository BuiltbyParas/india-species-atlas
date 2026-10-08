import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { prefersReducedMotion } from '../motion/preferences';
import { emit } from './events';
import { describeRoute, type Caption } from './routeCaption';

/**
 * Moving between pages as one sheet.
 *
 * A route change used to be a cut. Now a ruled line is drawn across the
 * screen from the point that was pressed, the sheet closes onto it from above
 * and below, and the destination is named on the line — the species and its
 * anchor coordinates, or the page and what it holds. The route changes under
 * cover; when the new page has painted, the sheet opens from the same line
 * and the line lifts away. It is the loader's survey rule and the bustard's
 * shutter, used as the atlas's way of turning a page.
 *
 * Only plain same-site link clicks that change the path are taken over:
 * modified clicks, new tabs, downloads, hash-only and query-only changes (the
 * `?species=` panel), and back / forward keep the browser's own behaviour. A
 * click during a transition is ignored rather than queued.
 *
 * With reduced motion the line is not drawn: the sheet fades in, names the
 * page, and fades out.
 *
 * After every page change focus moves to the new page's main landmark and
 * its name is announced, which the instant cut never did.
 */
type Phase = 'idle' | 'close' | 'hold' | 'open';

const CLOSE_MS = 560;
const CLOSE_MS_REDUCED = 200;
const OPEN_MS = 760;
const OPEN_MS_REDUCED = 260;
const READY_TIMEOUT = 3000;

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
const frames = (n: number) =>
  new Promise<void>((r) => {
    const step = (left: number) => (left <= 0 ? r() : requestAnimationFrame(() => step(left - 1)));
    step(n);
  });

/** Resolves once the new route has rendered past its loading fallback. */
async function pageReady() {
  const start = performance.now();
  await frames(2);
  while (document.querySelector('main [aria-busy="true"]') && performance.now() - start < READY_TIMEOUT) {
    await frames(1);
  }
  await frames(2);
}

function linkFrom(e: MouseEvent): HTMLAnchorElement | null {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
  const a = e.target instanceof Element ? e.target.closest('a[href]') : null;
  if (!(a instanceof HTMLAnchorElement)) return null;
  if (a.target && a.target !== '_self') return null;
  if (a.hasAttribute('download') || a.dataset.transition === 'none') return null;
  const url = new URL(a.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  // The documentary player is a separate shell, outside this one.
  if (url.pathname.endsWith('/documentary')) return null;
  return a;
}

export function RouteTransition() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [phase, setPhase] = useState<Phase>('idle');
  const [caption, setCaption] = useState<Caption>(() => describeRoute('/'));
  const [reduced, setReduced] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const announceRef = useRef<HTMLParagraphElement>(null);
  const busy = useRef(false);
  const ours = useRef(false);
  const lastPath = useRef(pathname);

  // Intercept plain link clicks that change the path.
  useEffect(() => {
    const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
    const onClick = (e: MouseEvent) => {
      const a = linkFrom(e);
      if (!a) return;
      const url = new URL(a.href, window.location.href);
      if (url.pathname === window.location.pathname) return;
      e.preventDefault();
      if (busy.current) return;
      const to = (base && url.pathname.startsWith(base) ? url.pathname.slice(base.length) || '/' : url.pathname) + url.search + url.hash;
      const r = a.getBoundingClientRect();
      // A keyboard "click" has no position; draw from the link itself.
      const x = e.detail === 0 || (e.clientX === 0 && e.clientY === 0) ? r.left + r.width / 2 : e.clientX;
      const y = e.detail === 0 || (e.clientX === 0 && e.clientY === 0) ? r.top + r.height / 2 : e.clientY;
      void run(to, x, y);
    };

    const run = async (to: string, x: number, y: number) => {
      busy.current = true;
      ours.current = true;
      const from = window.location.pathname;
      const calm = prefersReducedMotion();
      const root = rootRef.current;
      if (root) {
        const vh = window.innerHeight;
        // Keep the line off the very edges, where the halves would be slivers.
        root.style.setProperty('--line-y', `${Math.round(Math.min(Math.max(y, vh * 0.18), vh * 0.82))}px`);
        root.style.setProperty('--line-x', `${Math.round(x)}px`);
      }
      setReduced(calm);
      setCaption(describeRoute(to));
      emit('navigation:start', { from, to });
      setPhase('close');
      await wait(calm ? CLOSE_MS_REDUCED : CLOSE_MS);
      setPhase('hold');
      // Under cover, whatever was open (the menu) closes without its own
      // exit animation, so the new page is revealed clean.
      document.documentElement.classList.add('is-turning');
      navigate(to);
      await pageReady();
      document.documentElement.classList.remove('is-turning');
      setPhase('open');
      await wait(calm ? OPEN_MS_REDUCED : OPEN_MS);
      setPhase('idle');
      busy.current = false;
    };

    // Capture, so the router's own link handler sees the click as handled.
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [navigate]);

  // Every page change, ours or the browser's: move focus and announce.
  useEffect(() => {
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;
    const main = document.getElementById('main');
    const settle = async () => {
      if (ours.current) await pageReady();
      ours.current = false;
      // The heading as assistive technology reads it: without presentation-only copies.
      const heading = main?.querySelector('h1')?.cloneNode(true) as HTMLElement | undefined;
      heading?.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
      const h1 = heading?.textContent?.replace(/\s+/g, ' ').trim();
      if (announceRef.current) announceRef.current.textContent = h1 || describeRoute(pathname).title;
      if (main && !main.contains(document.activeElement)) main.focus({ preventScroll: true });
      emit('navigation:end', { path: pathname });
    };
    void settle();
  }, [pathname]);

  return (
    <>
      <div
        ref={rootRef}
        className="sheet-cover"
        data-phase={phase}
        data-reduced={reduced ? 'true' : 'false'}
        aria-hidden="true"
      >
        <div className="sheet-half sheet-top" />
        <div className="sheet-half sheet-bottom" />
        <div className="sheet-rule">
          <span className="sheet-rule-line sheet-rule-left" />
          <span className="sheet-rule-line sheet-rule-right" />
          <span className="sheet-nib sheet-nib-left" />
          <span className="sheet-nib sheet-nib-right" />
        </div>
        <div className="sheet-caption">
          <span className="sheet-eyebrow">{caption.eyebrow}</span>
          <span className="sheet-title">{caption.title}</span>
          <span className="sheet-note">{caption.note}</span>
        </div>
      </div>
      <p ref={announceRef} className="sr-only" aria-live="polite" />
    </>
  );
}
