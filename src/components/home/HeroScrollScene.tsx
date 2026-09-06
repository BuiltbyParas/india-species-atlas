import { useEffect, useRef, useState, type ReactNode } from 'react';
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

/** The copy fades out over this span so the closest pass is unobstructed. */
const COPY_FADE_FROM = 0.52;
const COPY_FADE_TO = 0.76;

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
 * Whether it is reasonable to spend a WebGL context and ~140 kB (gzipped) of
 * three.js on decoration for this visitor. Anything short of a clear yes falls
 * back to the flat hero, which is the layout the site shipped with.
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
 * The hero: a scroll-driven camera journey over a 3D relief of India.
 *
 * Two layouts live here on purpose. When the journey runs, the section becomes
 * a tall scroll stage with a sticky, full-bleed canvas and the copy laid over
 * it — a camera descent has nowhere to go inside a small side panel. Every
 * degraded path instead gets the original hero: normal height, copy left, flat
 * SVG artwork right. Nothing below the hero changes in either case.
 */
export function HeroStage({ children }: { children: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);

  // Decided before first paint, so the flat hero never flashes in and out.
  const [mode, setMode] = useState<'probing' | 'live' | 'flat'>(() => (canRender3D() ? 'probing' : 'flat'));
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!canRender3D()) return;

    const section = sectionRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!section || !stage || !canvas) return;

    let scene: HeroScene | null = null;
    let cancelled = false;
    const cleanups: Array<() => void> = [];

    /** Scroll distance over which the journey plays out, in pixels. */
    let runway = 1;
    /** Document offset of the section's top edge. */
    let sectionTop = 0;

    const measure = () => {
      const rect = section.getBoundingClientRect();
      sectionTop = rect.top + window.scrollY;
      // The stage is sticky, so the journey lasts exactly as long as the
      // section can scroll underneath it.
      runway = Math.max(240, rect.height - window.innerHeight);
      const stageRect = stage.getBoundingClientRect();
      scene?.resize(Math.round(stageRect.width), Math.round(stageRect.height));
      update();
    };

    /**
     * Driven straight from the scroll event with no React state in the path —
     * a re-render per scroll frame would cost far more than the scene does.
     */
    const update = () => {
      const p = Math.min(1, Math.max(0, (window.scrollY - sectionTop) / runway));
      scene?.setProgress(p);
      const copy = copyRef.current;
      if (copy) {
        const fade = 1 - Math.min(1, Math.max(0, (p - COPY_FADE_FROM) / (COPY_FADE_TO - COPY_FADE_FROM)));
        copy.style.opacity = String(fade);
        copy.style.transform = `translateY(${(1 - fade) * -28}px)`;
        copy.style.pointerEvents = fade < 0.12 ? 'none' : '';
      }
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

        window.addEventListener('scroll', update, { passive: true });
        cleanups.push(() => window.removeEventListener('scroll', update));

        const resizeObserver = new ResizeObserver(measure);
        resizeObserver.observe(stage);
        resizeObserver.observe(section);
        cleanups.push(() => resizeObserver.disconnect());

        // Pause the render loop whenever the hero is off-screen or the tab is
        // in the background — a static scene costs nothing to leave mounted.
        let onScreen = true;
        const sync = () => scene?.setActive(onScreen && !document.hidden);
        const intersectionObserver = new IntersectionObserver((entries) => {
          onScreen = entries.some((entry) => entry.isIntersecting);
          sync();
        });
        intersectionObserver.observe(stage);
        cleanups.push(() => intersectionObserver.disconnect());
        document.addEventListener('visibilitychange', sync);
        cleanups.push(() => document.removeEventListener('visibilitychange', sync));

        if (window.matchMedia('(pointer: fine)').matches) {
          const onPointerMove = (event: PointerEvent) => {
            const rect = stage.getBoundingClientRect();
            scene?.setPointer(
              ((event.clientX - rect.left) / rect.width) * 2 - 1,
              ((event.clientY - rect.top) / rect.height) * 2 - 1,
            );
          };
          const onPointerLeave = () => scene?.setPointer(0, 0);
          stage.addEventListener('pointermove', onPointerMove);
          stage.addEventListener('pointerleave', onPointerLeave);
          cleanups.push(() => {
            stage.removeEventListener('pointermove', onPointerMove);
            stage.removeEventListener('pointerleave', onPointerLeave);
          });
        }

        // If the user switches reduced motion on, drop back to the flat hero.
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

  if (mode === 'flat') {
    return (
      <section className="relative overflow-hidden border-b border-forest-800 bg-forest-950">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
          <div>{children}</div>
          <div className="relative mx-auto aspect-[200/230] w-full max-w-sm rounded-2xl border border-forest-800 bg-forest-900/40 p-2">
            <HeroArt />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="relative border-b border-forest-800 bg-forest-950 h-[145vh] lg:h-[178vh]"
    >
      <div ref={stageRef} className="sticky top-0 h-screen h-[100svh] overflow-hidden">
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full transition-opacity duration-[900ms] motion-reduce:transition-none"
          style={{ opacity: visible ? 1 : 0 }}
        />
        {/* Legibility scrims: darkened top and bottom everywhere, plus a
            left-hand wash on wide screens where the copy sits beside the relief. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-forest-950/94 via-forest-950/62 to-forest-950/28 lg:from-forest-950/80 lg:via-transparent lg:to-forest-950/70"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden lg:block lg:bg-gradient-to-r lg:from-forest-950/92 lg:via-forest-950/40 lg:to-transparent"
        />
        <div className="relative mx-auto flex h-full max-w-7xl items-start pt-24 sm:pt-28 lg:items-center lg:pt-0 px-4 sm:px-6">
          <div ref={copyRef} className="max-w-xl lg:max-w-2xl will-change-[opacity,transform]">
            {children}
          </div>
        </div>
      </div>
      {mode === 'live' && (
        <span className="sr-only">
          A three-dimensional relief of India showing indicative occurrence points for the species in this
          atlas, coloured by IUCN Red List category. The view descends towards the terrain as the page
          scrolls; the same information is available on the interactive map.
        </span>
      )}
    </section>
  );
}
