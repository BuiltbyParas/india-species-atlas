import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCurrentChapter } from '../../motion/chapters';
import { lockScroll } from '../../motion/SmoothScroll';
import { cn } from '../../utils/cn';
import { describeRoute } from '../../interaction/routeCaption';
import { FlowingMenu } from './FlowingMenu';
import { LpuCredit, LPU_CREDIT_OFFSET } from './LpuCredit';
import { onScroll as subscribeScroll } from '../../interaction/scroll';

/**
 * The four destinations a first-time visitor is looking for, always in view on
 * a wide screen. The menu still holds everything (and is the only navigation
 * on a phone, where these would crowd the wordmark).
 */
const PRIMARY = [
  { to: '/atlas', label: 'Map' },
  { to: '/species', label: 'Species' },
  { to: '/#field-studies', label: 'Field studies' },
  { to: '/about', label: 'About' },
] as const;

/**
 * The site header: a wordmark, the running title of the chapter on screen,
 * and the menu. On the documentary page it floats over the film; on the
 * working pages it is a quiet sticky bar, so the map and tables keep their
 * layout.
 */
export function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  // A field study is a documentary page too: the header floats over its world.
  const home = pathname === '/' || pathname.startsWith('/field/');
  const chapter = useCurrentChapter();
  // Working pages carry the same running head as the documentary: where you are on the sheet.
  const page = home || pathname === '/documentary' ? null : describeRoute(pathname);
  const [scrolled, setScrolled] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  // A journey that needs the screen (the hero laid flat into the atlas) folds the menu away first.
  useEffect(() => {
    window.addEventListener('atlas:menu:close', close);
    return () => window.removeEventListener('atlas:menu:close', close);
  }, [close]);

  useEffect(() => {
    if (!open) return;
    lockScroll(true);
    return () => lockScroll(false);
  }, [open]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    const offScroll = subscribeScroll(onScroll);
    return () => offScroll();
  }, []);

  return (
    <>
      <header
        className={cn(
          'site-header z-(--z-header) w-full',
          home ? 'fixed inset-x-0 top-0' : 'sticky top-0',
          !home && 'border-b border-canvas/[0.07] bg-forest-950/85 backdrop-blur-md',
          home && scrolled && !open && 'is-scrolled',
        )}
        data-open={open ? 'true' : 'false'}
      >
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-6 px-4 sm:px-8 lg:h-20 lg:px-12">
          <Link to="/" className={cn('group flex items-baseline gap-3', LPU_CREDIT_OFFSET)} aria-label="India Species Atlas, home" data-magnetic="0.15" data-cursor="Return">
            <span className="font-serif text-[1.15rem] font-normal leading-none tracking-[-0.01em] text-canvas">
              India Species Atlas
            </span>
          </Link>

          {home && (
            <p className="chapter-title hidden text-small text-canvas/60 md:block lg:hidden xl:block" aria-live="polite">
              <span className={cn('chapter-title-inner', chapter && 'is-shown')} key={chapter?.index ?? -1}>
                {chapter ? (
                  <>
                    <span className="tabular-nums text-canvas/62">{String(chapter.index).padStart(2, '0')}</span>
                    <span className="chapter-title-rule" aria-hidden="true" />
                    {chapter.title}
                  </>
                ) : null}
              </span>
            </p>
          )}
          {page && (
            <p className="chapter-title hidden text-small text-canvas/60 md:block lg:hidden xl:block">
              <span className="chapter-title-inner is-shown" key={pathname}>
                <span className="text-canvas/62">{page.eyebrow}</span>
                <span className="chapter-title-rule" aria-hidden="true" />
                {page.title}
              </span>
            </p>
          )}

          <div className="flex items-center gap-8 xl:gap-10">
            <nav aria-label="Primary" className="hidden lg:block">
              <ul className="primary-nav">
                {PRIMARY.map((l) => {
                  const here =
                    l.to === '/#field-studies' ? pathname.startsWith('/field/') : pathname === l.to || pathname.startsWith(`${l.to}/`);
                  return (
                    <li key={l.to}>
                      <Link to={l.to} className="primary-nav-link" aria-current={here ? 'page' : undefined}>
                        {l.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          <button
            type="button"
            className="menu-button"
            data-magnetic="0.35"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="menu-button-text" data-magnetic-inner>
              <span>{open ? 'Close' : 'Menu'}</span>
            </span>
            <span className="menu-button-lines" aria-hidden="true">
              <span />
              <span />
            </span>
          </button>
          </div>
        </div>
      </header>
      <LpuCredit />
      <FlowingMenu open={open} onClose={close} />
    </>
  );
}
