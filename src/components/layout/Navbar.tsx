import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCurrentChapter } from '../../motion/chapters';
import { lockScroll } from '../../motion/SmoothScroll';
import { cn } from '../../utils/cn';
import { FlowingMenu } from './FlowingMenu';

/**
 * The site header: a wordmark, the running title of the chapter on screen,
 * and the menu. On the documentary page it floats over the film; on the
 * working pages it is a quiet sticky bar, so the map and tables keep their
 * layout.
 */
export function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const home = pathname === '/';
  const chapter = useCurrentChapter();
  const [scrolled, setScrolled] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    lockScroll(open);
    return () => {
      if (open) lockScroll(false);
    };
  }, [open]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          'site-header z-[1500] w-full',
          home ? 'fixed inset-x-0 top-0' : 'sticky top-0',
          !home && 'border-b border-canvas/[0.07] bg-forest-950/85 backdrop-blur-md',
          home && scrolled && !open && 'is-scrolled',
        )}
        data-open={open ? 'true' : 'false'}
      >
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-6 px-4 sm:px-8 lg:h-20 lg:px-12">
          <Link to="/" className="group flex items-baseline gap-3" aria-label="India Species Atlas, home">
            <span className="font-serif text-[1.15rem] font-normal leading-none tracking-[-0.01em] text-canvas">
              India Species Atlas
            </span>
          </Link>

          {home && (
            <p className="chapter-title hidden text-[13px] text-canvas/60 md:block" aria-live="polite">
              <span className={cn('chapter-title-inner', chapter && 'is-shown')} key={chapter?.index ?? -1}>
                {chapter ? (
                  <>
                    <span className="tabular-nums text-canvas/40">{String(chapter.index).padStart(2, '0')}</span>
                    <span className="chapter-title-rule" aria-hidden="true" />
                    {chapter.title}
                  </>
                ) : null}
              </span>
            </p>
          )}

          <button
            type="button"
            className="menu-button"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="menu-button-text">
              <span>{open ? 'Close' : 'Menu'}</span>
            </span>
            <span className="menu-button-lines" aria-hidden="true">
              <span />
              <span />
            </span>
          </button>
        </div>
      </header>
      <FlowingMenu open={open} onClose={close} />
    </>
  );
}
