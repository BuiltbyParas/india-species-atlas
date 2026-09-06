import { useEffect, useRef, useState } from 'react';
import { SPECIES } from '../../data/species';
import { STATUS_HEX } from '../../theme';
import { HeroArt } from './HeroArt';
import type { GeoCollection, HeroPoint, HeroScene } from './heroScene';

/**
 * Every indicative occurrence point in the dataset, coloured by the species'
 * IUCN category. Derived, never hard-coded — adding a species to
 * `src/data/species.ts` adds its markers to the relief.
 */
const POINTS: HeroPoint[] = SPECIES.flatMap((species) =>
  species.distributionPoints.map((point) => ({
    lng: point.lng,
    lat: point.lat,
    color: STATUS_HEX[species.status],
  })),
);

/**
 * Result of the WebGL probe, which is a device fact and cannot change within a
 * session — unlike the motion preference, which is re-read on every call.
 */
let webglSupported: boolean | null = null;

function hasWebGL(): boolean {
  if (webglSupported !== null) return webglSupported;
  // Probe for a real context rather than trusting feature detection, then hand
  // it straight back — some devices advertise WebGL and fail to allocate.
  try {
    const probe = document.createElement('canvas');
    const gl = (probe.getContext('webgl2') ?? probe.getContext('webgl')) as WebGLRenderingContext | null;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    webglSupported = Boolean(gl);
  } catch {
    webglSupported = false;
  }
  return webglSupported;
}

/**
 * Whether it is reasonable to spend a WebGL context and ~137 kB (gzipped) of
 * three.js on decoration for this visitor. Anything short of a clear yes falls
 * back to the flat SVG, which is what the hero shipped with.
 */
function canRender3D(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;

  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
    deviceMemory?: number;
  };
  if (nav.connection?.saveData) return false;
  if (nav.connection?.effectiveType && /^(slow-)?2g$/.test(nav.connection.effectiveType)) return false;
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2) return false;
  if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 2) return false;

  return hasWebGL();
}

/**
 * The hero's scroll-linked 3D relief of India.
 *
 * Scoped to the hero on purpose: the map, species cards, filters and charts
 * below stay flat and data-first. This is the only place on the site that
 * touches WebGL, and it is loaded in its own async chunk so visitors who never
 * qualify for it never download it.
 */
export function HeroScrollScene() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Decided before first paint, so the flat art never flashes in and out.
  const [mode, setMode] = useState<'probing' | 'live' | 'flat'>(() => (canRender3D() ? 'probing' : 'flat'));
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!canRender3D()) return;

    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    let scene: HeroScene | null = null;
    let cancelled = false;
    const cleanups: Array<() => void> = [];

    /** Scroll distance over which the hero pose plays out, in pixels. */
    let runway = 1;

    const measure = () => {
      const rect = wrap.getBoundingClientRect();
      // The hero sits at the top of the document, so scroll position alone is
      // the progress input. The travel has to finish while the relief is still
      // in view, which means anchoring the end of it to the panel's centre
      // reaching the top of the viewport rather than its bottom edge — the
      // latter lands the final pose after it has already scrolled past.
      const centre = rect.top + window.scrollY + rect.height / 2;
      runway = Math.max(240, centre - window.innerHeight * 0.08);
      scene?.resize(Math.round(rect.width), Math.round(rect.height));
      scene?.setProgress(window.scrollY / runway);
    };

    const bail = () => {
      if (cancelled) return;
      setMode('flat');
      setVisible(false);
    };

    Promise.all([
      import('./heroScene'),
      fetch(`${import.meta.env.BASE_URL}india-states.geojson`).then((r) =>
        r.ok ? (r.json() as Promise<GeoCollection>) : Promise.reject(new Error('geojson unavailable')),
      ),
    ])
      .then(([module, geojson]) => {
        if (cancelled) return;

        scene = module.createHeroScene({
          canvas,
          geojson,
          points: POINTS,
          onFirstFrame: () => {
            if (!cancelled) setVisible(true);
          },
          // The scene has already stepped its own quality down and still can't
          // keep up on this device, so stop asking it to.
          onTooSlow: bail,
        });
        setMode('live');
        measure();

        const onScroll = () => scene?.setProgress(window.scrollY / runway);
        window.addEventListener('scroll', onScroll, { passive: true });
        cleanups.push(() => window.removeEventListener('scroll', onScroll));

        const resizeObserver = new ResizeObserver(measure);
        resizeObserver.observe(wrap);
        cleanups.push(() => resizeObserver.disconnect());

        // Pause the render loop whenever the hero is off-screen or the tab is
        // in the background — a static relief costs nothing to leave mounted.
        let onScreen = true;
        const sync = () => scene?.setActive(onScreen && !document.hidden);
        const intersectionObserver = new IntersectionObserver((entries) => {
          onScreen = entries.some((entry) => entry.isIntersecting);
          sync();
        });
        intersectionObserver.observe(wrap);
        cleanups.push(() => intersectionObserver.disconnect());
        document.addEventListener('visibilitychange', sync);
        cleanups.push(() => document.removeEventListener('visibilitychange', sync));

        if (window.matchMedia('(pointer: fine)').matches) {
          const onPointerMove = (event: PointerEvent) => {
            const rect = wrap.getBoundingClientRect();
            scene?.setPointer(
              ((event.clientX - rect.left) / rect.width) * 2 - 1,
              ((event.clientY - rect.top) / rect.height) * 2 - 1,
            );
          };
          const onPointerLeave = () => scene?.setPointer(0, 0);
          wrap.addEventListener('pointermove', onPointerMove);
          wrap.addEventListener('pointerleave', onPointerLeave);
          cleanups.push(() => {
            wrap.removeEventListener('pointermove', onPointerMove);
            wrap.removeEventListener('pointerleave', onPointerLeave);
          });
        }

        // If the user switches reduced motion on, drop back to the flat art.
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const onMotionChange = () => {
          if (motionQuery.matches) bail();
        };
        motionQuery.addEventListener('change', onMotionChange);
        cleanups.push(() => motionQuery.removeEventListener('change', onMotionChange));

        canvas.addEventListener('webglcontextlost', bail);
        cleanups.push(() => canvas.removeEventListener('webglcontextlost', bail));
      })
      .catch(bail);

    return () => {
      cancelled = true;
      for (const cleanup of cleanups) cleanup();
      scene?.dispose();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative mx-auto aspect-[200/230] w-full max-w-sm rounded-2xl border border-forest-800 bg-forest-900/40 p-2"
    >
      {/* Soft glow behind the relief, in CSS rather than a lit backdrop. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          background:
            'radial-gradient(70% 65% at 50% 35%, color-mix(in srgb, var(--color-forest-600) 45%, transparent), transparent 70%)',
        }}
      />
      {mode !== 'live' && (
        <div className="relative h-full w-full">
          <HeroArt />
        </div>
      )}
      {mode !== 'flat' && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full transition-opacity duration-700 motion-reduce:transition-none"
          style={{ opacity: mode === 'live' && visible ? 1 : 0 }}
        />
      )}
      {mode === 'live' && (
        <span className="sr-only">
          A three-dimensional relief of India showing indicative occurrence points for the species in this
          atlas, coloured by IUCN Red List category. It rotates as the page scrolls; the same information is
          available on the interactive map.
        </span>
      )}
    </div>
  );
}
