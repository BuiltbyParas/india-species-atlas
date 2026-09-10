import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Move3d } from 'lucide-react';
import type { Species } from '../../types';
import { STATUS_INFO } from '../../data/statusInfo';
import { STATUS_HEX } from '../../theme';
import { canRender3D } from '../../utils/canRender3D';
import { buttonClasses } from '../ui/buttonClasses';
import { PhotoCredit } from '../ui/PhotoCredit';
import { StatusBadge } from '../ui/StatusBadge';
import { useSpeciesProfile } from './SpeciesProfileProvider';
import type { Gallery, GalleryCard } from './galleryScene';

/**
 * The species gallery: photographic cards mounted in real 3D space.
 *
 * The cards stand on a ring the visitor turns — by dragging, by the arrow
 * keys, or by clicking a card at the edge to bring it round — and the camera
 * moves with the pointer, so the ring parallaxes the way a real object does
 * rather than the way stacked layers do.
 *
 * The photographs are photographs. Nothing here is a 3D model of an animal,
 * and the note in the corner of the stage says so, because the rest of this
 * atlas is careful about what its pictures claim and this should be too.
 *
 * Everything degrades: without WebGL, on a low-end device, or with reduced
 * motion asked for, the `fallback` grid is rendered instead and no three.js is
 * ever fetched.
 */
export function SpeciesGallery({
  species,
  fallback,
}: {
  species: Species[];
  fallback: ReactNode;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const galleryRef = useRef<Gallery | null>(null);
  const { open } = useSpeciesProfile();

  const [mode, setMode] = useState<'probing' | 'live' | 'flat'>(() =>
    canRender3D() ? 'probing' : 'flat',
  );
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(0);

  // The identity of the set, so a filter change rebuilds the ring but a
  // re-render for any other reason does not.
  const signature = species.map((s) => s.id).join(',');

  useEffect(() => {
    if (mode === 'flat' || !species.length) return;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    let cancelled = false;
    let gallery: Gallery | null = null;
    const cleanups: Array<() => void> = [];
    setReady(false);
    setIndex(0);

    const cards: GalleryCard[] = species.map((s) => ({
      id: s.id,
      commonName: s.commonName,
      scientificName: s.scientificName,
      statusCode: s.status,
      statusName: STATUS_INFO[s.status].name,
      statusColor: STATUS_HEX[s.status],
      src: s.image.src ?? '',
    }));

    const bail = () => {
      if (cancelled) return;
      setMode('flat');
      setReady(false);
    };

    // Nothing is fetched or allocated until the gallery is close to being
    // looked at. On the home page it shares a tab with the hero's scene, and
    // two WebGL contexts should not be built for a section still four
    // screenfuls away.
    const start = () => {
      import('./galleryScene')
        .then((module) =>
          module.createGallery({
            canvas,
            cards,
            onFocus: (i) => {
              if (!cancelled) setIndex(i);
            },
            onActivate: (i) => {
              if (!cancelled) open(cards[i].id);
            },
            onFirstFrame: () => {
              if (!cancelled) setReady(true);
            },
            onTooSlow: bail,
          }),
        )
        .then((instance) => {
          if (cancelled) {
            instance.dispose();
            return;
          }
          gallery = instance;
          galleryRef.current = instance;
          setMode('live');

          const resizeObserver = new ResizeObserver(() => {
            const rect = stage.getBoundingClientRect();
            instance.resize(Math.round(rect.width), Math.round(rect.height));
          });
          resizeObserver.observe(stage);
          cleanups.push(() => resizeObserver.disconnect());
          const rect = stage.getBoundingClientRect();
          instance.resize(Math.round(rect.width), Math.round(rect.height));

          // Idle whenever it is off-screen or the tab is in the background.
          let onScreen = true;
          const sync = () => instance.setActive(onScreen && !document.hidden);
          const visibility = new IntersectionObserver((entries) => {
            onScreen = entries.some((e) => e.isIntersecting);
            sync();
          });
          visibility.observe(stage);
          cleanups.push(() => visibility.disconnect());
          document.addEventListener('visibilitychange', sync);
          cleanups.push(() => document.removeEventListener('visibilitychange', sync));

          // The ring tips a little as the section travels the viewport, which
          // ties it to the page instead of leaving it floating in a box.
          const onScroll = () => {
            const box = stage.getBoundingClientRect();
            const centre = box.top + box.height / 2;
            instance.setScroll((centre - window.innerHeight / 2) / window.innerHeight);
          };
          onScroll();
          window.addEventListener('scroll', onScroll, { passive: true });
          cleanups.push(() => window.removeEventListener('scroll', onScroll));

          canvas.addEventListener('webglcontextlost', bail);
          cleanups.push(() => canvas.removeEventListener('webglcontextlost', bail));
        })
        .catch(bail);
    };

    const trigger = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          trigger.disconnect();
          start();
        }
      },
      { rootMargin: '300px' },
    );
    trigger.observe(stage);

    return () => {
      cancelled = true;
      trigger.disconnect();
      for (const cleanup of cleanups) cleanup();
      gallery?.dispose();
      galleryRef.current = null;
    };
    // `signature` stands in for the contents of `species`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, mode === 'flat', open]);

  const step = useCallback((delta: number) => galleryRef.current?.step(delta), []);
  const focus = useCallback((i: number) => galleryRef.current?.focus(i), []);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const current = species[index];
      if (current) open(current.id);
    }
  };

  if (mode === 'flat' || !species.length) return <>{fallback}</>;

  const current = species[Math.min(index, species.length - 1)];

  return (
    <div>
      <div
        ref={stageRef}
        role="group"
        tabIndex={0}
        aria-label="Species gallery. Use the left and right arrow keys to turn the ring, and Enter to open the species in front."
        onKeyDown={onKeyDown}
        className="relative isolate h-[26rem] overflow-hidden rounded-2xl border border-forest-800 bg-[radial-gradient(120%_100%_at_50%_0%,var(--color-forest-900),var(--color-forest-950)_70%)] outline-none ring-forest-500/70 transition-shadow focus-visible:ring-2 sm:h-[32rem] lg:h-[36rem]"
      >
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full transition-opacity duration-700"
          style={{ opacity: ready ? 1 : 0 }}
        />

        {!ready && (
          <p className="absolute inset-0 grid place-items-center text-sm text-canvas/45">
            Preparing the gallery…
          </p>
        )}

        <p className="pointer-events-none absolute bottom-3 right-4 max-w-[15rem] text-right text-[10px] leading-snug text-forest-300/45">
          Photographs mounted in a 3D frame — the cards are modelled, the animals are not.
        </p>

        <p className="pointer-events-none absolute bottom-3 left-4 hidden items-center gap-1.5 text-[10px] text-forest-300/45 sm:flex">
          <Move3d className="h-3.5 w-3.5" aria-hidden="true" />
          Drag to turn · click a card to bring it forward
        </p>
      </div>

      {/* The caption for whatever is at the front. Kept out of the canvas so it
          stays real text: selectable, translatable and crisp at any zoom. */}
      <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
        <div aria-live="polite" className="min-h-[6.5rem]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <StatusBadge status={current.status} showName size="sm" />
            <span className="text-xs text-canvas/40">
              {index + 1} / {species.length}
            </span>
          </div>
          <h3 className="mt-2 font-serif text-2xl font-semibold leading-tight text-canvas">
            {current.commonName}
          </h3>
          <p className="text-sm italic text-canvas/55">{current.scientificName}</p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-canvas/70">{current.summary}</p>
          <PhotoCredit species={current} className="mt-2" />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous species"
            className={buttonClasses('secondary', 'sm', 'h-10 w-10 rounded-full p-0')}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next species"
            className={buttonClasses('secondary', 'sm', 'h-10 w-10 rounded-full p-0')}
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => open(current.id)}
            className={buttonClasses('primary', 'md', 'ml-1')}
          >
            View profile
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* The whole set, for assistive technology and for anyone navigating by
          keyboard who would rather jump than turn. Focusing an entry brings its
          card round, so the two views never disagree about what is selected. */}
      <ul className="sr-only">
        {species.map((s, i) => (
          <li key={s.id}>
            <button type="button" onFocus={() => focus(i)} onClick={() => open(s.id)}>
              {s.commonName} ({s.scientificName}) — {s.statusFullName}. Open profile.
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
