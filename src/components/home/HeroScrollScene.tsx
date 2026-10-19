import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SPECIES } from '../../data/species';
import { STATUS_HEX } from '../../theme';
import { StatusBadge } from '../ui/StatusBadge';
import { HeroArt } from './HeroArt';
import { canRender3D } from '../../utils/canRender3D';
import { formatDeg, loadIndiaGeo, loadIndiaGeoJson } from '../../geo/india';
import { isIntroDone, markFirstFrame, setHeroFootprint, useIntroDone } from '../../motion/intro';
import { hasFinePointer } from '../../motion/preferences';
import type { GeoCollection, HeroPlate, HeroPoint, HeroScene } from './heroScene';
import { onScrollVelocity } from '../../interaction/velocity';
import { setWorld } from '../../world/worldState';
import { camAt, INDIA_CAM } from '../../world/geoCamera';
import { onScroll as subscribeScroll } from '../../interaction/scroll';
import { onPointerExit, onPointerMove } from '../../interaction/pointer';
import { qualityTier } from '../../world/quality';
import { loadRegion, loadRelief, RELIEF_EXAGGERATION } from './heroRelief';
import { atlasWorldData, PROTECTED_STATES } from './atlasData';
import {
  atlasSpan,
  attachSpan,
  bindAtlasScene,
  emitAtlasAnchors,
  emitAtlasMarks,
  mountAtlasLayer,
  unmountAtlasLayer,
} from './atlasWorld';

/**
 * Scroll progress over which the twelve species are introduced.
 *
 * The procession finishes well before the end of the journey. Past roughly
 * 0.8 the camera is low and south of the peninsula looking back up the
 * country, which puts the southernmost anchors almost underneath it — plates
 * placed there end up jammed against the bottom of the frame. Stopping early
 * also leaves the final approach as a clean pass over the relief.
 */
const REVEAL_FROM = 0.22;
const REVEAL_TO = 0.76;

/**
 * The species journey: who appears, where, and when.
 *
 * Ordered by the latitude of each species' anchor locality — the first point
 * in its distribution list, which in this dataset is always its flagship
 * landscape — so the sequence runs north to south with the camera. The reveal
 * points are then spaced *evenly* across the span rather than placed at true
 * latitude. The positions stay real; only the timing is regularised, because
 * six of the twelve anchors sit between 25°N and 27°N and at true latitude
 * they would arrive as one unreadable pile-up while the peninsula ran empty.
 *
 * Derived, never hard-coded: adding a species to `src/data/species.ts` adds it
 * to the journey and re-spaces the rest.
 */
const JOURNEY = [...SPECIES]
  .sort((a, b) => b.distributionPoints[0].lat - a.distributionPoints[0].lat)
  .map((species, index, all) => ({
    species,
    anchor: species.distributionPoints[0],
    revealAt: REVEAL_FROM + (index / Math.max(all.length - 1, 1)) * (REVEAL_TO - REVEAL_FROM),
  }));

const REVEAL_BY_SPECIES = new Map(JOURNEY.map((entry) => [entry.species.id, entry.revealAt]));

/**
 * Every indicative occurrence point in the dataset, coloured by the species'
 * IUCN category and lit on the species' own schedule, so a species' markers
 * come up together with its plate.
 */
const POINT_NAMES = SPECIES.flatMap((species) =>
  species.distributionPoints.map((point) => ({ place: point.label.split(',')[0], species: species.commonName })),
);
const POINTS: HeroPoint[] = SPECIES.flatMap((species, group) =>
  species.distributionPoints.map((point) => ({
    lng: point.lng,
    lat: point.lat,
    color: STATUS_HEX[species.status],
    revealAt: REVEAL_BY_SPECIES.get(species.id) ?? REVEAL_FROM,
    group,
  })),
);

/** One silhouette plate per species, standing over its anchor locality. */
const PLATES: HeroPlate[] = JOURNEY.map(({ species, anchor, revealAt }) => ({
  id: species.id,
  lng: anchor.lng,
  lat: anchor.lat,
  color: STATUS_HEX[species.status],
  revealAt,
}));

/**
 * The copy fades out over this span — early, and finishing before the first
 * species arrives. The headline and the plates compete for the same part of
 * the frame on wide layouts, and a caption laid over the strapline is worse
 * than either on its own.
 */
/** Smallest gap kept between a caption and the edge of the frame, in pixels. */
const LABEL_MARGIN = 12;

// Gone a beat before the first caption arrives (CinematicHero CAPTIONS, a = 0.2), so the title and the caption
// are never read through each other.
const COPY_FADE_FROM = 0.05;
const COPY_FADE_TO = 0.19;

/** The parts of the title card the descent moves, found once per copy node. */
interface CopyParts {
  w: HTMLElement | null;
  c: HTMLElement | null;
  e: HTMLElement | null;
  shadow: HTMLElement | null;
  glint: HTMLElement | null;
  credits: HTMLElement | null;
  last: string;
}
const copyParts = new WeakMap<HTMLElement, CopyParts>();

/**
 * Writes the descent's progress where CSS reads it (`--p`), and takes the title card apart over the copy's span: the
 * outer words part to the sides of the frame, the italic between them grows past the camera as it goes down through
 * the name, and the credits drop away first. A copy without the parted name (another page's hero) lifts as one.
 */
function applyProgress(stage: HTMLElement, copy: HTMLElement | null, p: number) {
  stage.style.setProperty('--p', p.toFixed(4));
  if (!copy) return;
  const t = Math.min(1, Math.max(0, (p - COPY_FADE_FROM) / (COPY_FADE_TO - COPY_FADE_FROM)));
  const fade = 1 - t;
  let parts = copyParts.get(copy);
  if (!parts) {
    const q = (sel: string) => copy.querySelector<HTMLElement>(sel);
    parts = { w: q('[data-w="w"]'), c: q('[data-w="c"]'), e: q('[data-w="e"]'), shadow: q('.hero-title-shadow'), glint: q('.hero-title-glint'), credits: q('.hero-credits'), last: '' };
    copyParts.set(copy, parts);
  }
  copy.style.pointerEvents = fade < 0.12 ? 'none' : '';
  if (!parts.w || !parts.c || !parts.e) {
    copy.style.opacity = String(fade);
    // The title card lifts off the plate as the camera starts down: a lift with a little depth, not a fade in place.
    copy.style.transform = `translate3d(0, ${(t * -8).toFixed(2)}svh, 0) scale(${(1 - t * 0.03).toFixed(4)})`;
    return;
  }
  // At rest (and back at rest) nothing is written, so the entrance's own animation is left alone.
  const key = t.toFixed(4);
  if (key === parts.last) return;
  parts.last = key;
  const k = t * t * (3 - 2 * t);
  // Accelerating away: the parting starts slow, as a camera move does, and is out of frame by the first caption.
  const go = k * k;
  const still = t === 0;
  const set = (el: HTMLElement, transform: string, opacity: number, blur = 0) => {
    el.style.transform = still ? '' : transform;
    el.style.opacity = still ? '' : opacity.toFixed(3);
    // Depth of field: what the camera passes goes soft (in em of the name, so it holds at every size). Cleared at
    // rest and once gone, so a filter is only ever on the name while it is moving and visible.
    el.style.filter = still || blur < 0.002 || opacity <= 0.01 ? '' : `blur(${blur.toFixed(3)}em)`;
  };
  set(parts.w, `translate3d(${(-go * 46).toFixed(2)}vw, ${(-k * 3).toFixed(2)}svh, 0)`, 1 - Math.max(0, (k - 0.45) / 0.55), go * 0.035);
  set(parts.e, `translate3d(${(go * 46).toFixed(2)}vw, ${(-k * 3).toFixed(2)}svh, 0)`, 1 - Math.max(0, (k - 0.45) / 0.55), go * 0.035);
  set(parts.c, `translate3d(0, ${(-k * 9).toFixed(2)}svh, 0) scale(${(1 + go * 2.4).toFixed(4)})`, 1 - Math.max(0, (k - 0.25) / 0.75), go * 0.05);
  for (const el of [parts.shadow, parts.glint]) if (el) el.style.opacity = still ? '' : (1 - Math.min(1, k * 3)).toFixed(3);
  if (parts.credits) set(parts.credits, `translate3d(0, ${(k * 5).toFixed(2)}svh, 0)`, 1 - Math.min(1, k * 2.4));
}

/**
 * Sets the title on the map: the copy marks one line of its title with
 * `data-hero-baseline` (a zero-height box at that line's baseline) and the
 * title itself with `data-hero-anchor`. Writes how far that baseline sits
 * below the title's top, and how far the copy's box sits below the stage's,
 * so CSS can hang the title from the tropic the scene (or the flat map)
 * reports in `--tropic-y`. Layout offsets only — transforms are ignored, so
 * it holds while the copy is fading.
 */
function measureTitleBaseline(root: HTMLElement) {
  const anchor = root.querySelector<HTMLElement>('[data-hero-anchor]');
  const base = root.querySelector<HTMLElement>('[data-hero-baseline]');
  const copy = anchor?.closest<HTMLElement>('[data-hero-copy]');
  if (!anchor || !base || !copy) return;
  root.style.setProperty('--hero-base', `${(base.getBoundingClientRect().top - anchor.getBoundingClientRect().top).toFixed(1)}px`);
  root.style.setProperty('--copy-top', `${copy.offsetTop}px`);
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
export function HeroStage({
  children,
  withPlates = true,
  overlay,
  flatArt,
  endFocus,
  atmosphere,
}: {
  children: ReactNode;
  /** The silhouette plates. The documentary page introduces species itself, so it turns them off. */
  withPlates?: boolean;
  /** Extra layers inside the sticky stage, driven by the `--p` progress variable. */
  overlay?: ReactNode;
  /** Artwork for the flat fallback, in place of the default illustration. */
  flatArt?: ReactNode;
  /** The locality the camera's descent ends over (see `HeroSceneOptions.endFocus`). */
  endFocus?: { lng: number; lat: number };
  /** The air over the end focus (see `HeroSceneOptions.atmosphere`). */
  atmosphere?: 'dust' | 'snow';
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Array<HTMLDivElement | null>>([]);
  const probeRef = useRef<HTMLParagraphElement>(null);
  /**
   * Half the rendered width of each caption, measured once and reused to keep
   * it inside the frame. Cleared on resize, since the copy can rewrap.
   */
  const labelHalfWidths = useRef<number[]>([]);

  // Decided before first paint, so the flat hero never flashes in and out. 'held' is a scene given up after the
  // page was laid out around it: the flat map inside the descent's own pinned stage.
  const [mode, setMode] = useState<'probing' | 'live' | 'held' | 'flat'>(() => (canRender3D() ? 'probing' : 'flat'));
  const [visible, setVisible] = useState(false);
  /** Whether the live relief stands on the elevation model (true) or is the boundary-only slab; null until it is built. */
  const [elevation, setElevation] = useState<boolean | null>(null);
  /** Whether that model is the regional grid (India, its neighbours and the sea floor) rather than India's own. */
  const [regional, setRegional] = useState(false);
  /** The live scene, for the emergence cue below. */
  const sceneRef = useRef<HeroScene | null>(null);
  const introDone = useIntroDone();

  useEffect(() => {
    if (!canRender3D()) return;

    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;

    let scene: HeroScene | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let cancelled = false;
    const cleanups: Array<() => void> = [];

    /** Scroll distance over which the journey plays out, in pixels. */
    let runway = 1;
    /** Document offset of the section's top edge. */
    let sectionTop = 0;
    let descended: boolean | null = null;
    const focusLng = endFocus?.lng;
    const focusLat = endFocus?.lat;

    const measure = () => {
      const rect = section.getBoundingClientRect();
      sectionTop = rect.top + window.scrollY;
      // The stage is sticky, so the journey lasts exactly as long as the
      // section can scroll underneath it.
      runway = Math.max(240, rect.height - window.innerHeight);
      labelHalfWidths.current.length = 0;
      measureTitleBaseline(stage);
      // The scene draws into the page's atlas layer (atlasWorld.ts), which spans the viewport.
      if (canvas) scene?.resize(Math.round(canvas.clientWidth), Math.round(canvas.clientHeight));
      update();
    };

    /**
     * Driven straight from the scroll event with no React state in the path —
     * a re-render per scroll frame would cost far more than the scene does.
     */
    const update = () => {
      const p = Math.min(1, Math.max(0, (window.scrollY - sectionTop) / runway));
      scene?.setProgress(p);
      // The world remembers where the descent has brought the reader: over the
      // first anchor once the camera has come down, the whole country before.
      const down = p > 0.8;
      if (down !== descended) {
        descended = down;
        setWorld({ camera: down && focusLng !== undefined && focusLat !== undefined ? camAt(focusLng, focusLat) : INDIA_CAM });
      }
      applyProgress(stage, copyRef.current, p);
    };

    /** Give the live scene up: the layer goes, and the chapters after the hero draw their own maps again. */
    const release = () => {
      for (const cleanup of cleanups.splice(0)) cleanup();
      sceneRef.current = null;
      bindAtlasScene(null);
      scene?.dispose();
      scene = null;
      unmountAtlasLayer();
      canvas = null;
    };

    // Giving up holds the descent's height (mode 'held'): collapsing to the short flat hero moved every chapter
    // below it by thousands of pixels, under a reader who might be anywhere on the page.
    const bail = () => {
      if (cancelled) return;
      release();
      setMode('held');
      setVisible(false);
    };

    Promise.all([
      import('./heroScene'),
      loadIndiaGeoJson() as Promise<GeoCollection>,
      // The elevation model is the relief's ground: the subcontinent and its sea floor, or India's own grid if that
      // fails; without either the country is the flat slab, not a blank hero.
      loadRegion().catch(() => loadRelief()).catch(() => null),
      // The protected states' outlines, for the atlas act's glaze; the act stands without them.
      loadIndiaGeo().catch(() => null),
    ])
      .then(([module, geojson, relief, geo]) => {
        if (cancelled) return;
        canvas = mountAtlasLayer();
        canvas.style.opacity = '0';
        const protectedPaths = geo ? PROTECTED_STATES.map((n) => geo.byName.get(n)?.d ?? '').filter(Boolean) : [];

        scene = module.createHeroScene({
          canvas,
          geojson,
          relief,
          // Mesh nodes every second cell of the grid (every third on phones and the lowest tier), twice that away
          // from India on the regional grid; the texture still carries the full grid for the light and the
          // contours. At India's 3′ the triangles averaged two or three pixels each, which cost ~1.8 ms a frame
          // at 1440×900 on an integrated GPU for a silhouette no one could see.
          meshStep:
            (import.meta.env.DEV && Number(new URLSearchParams(window.location.search).get('meshstep'))) ||
            (hasFinePointer() && qualityTier() !== 'low' ? 2 : 3),
          points: POINTS,
          onFirstFrame: () => {
            if (cancelled) return;
            setVisible(true);
            if (canvas) canvas.style.opacity = '1';
            markFirstFrame();
          },
          world: atlasWorldData(protectedPaths),
          onAnchors: emitAtlasAnchors,
          onWorldMarks: emitAtlasMarks,
          plates: withPlates ? PLATES : [],
          endFocus,
          atmosphere,
          // On a first visit the relief is held back and emerges as the loader clears.
          emerge: !isIntroDone(),
          // Captions are moved by writing transforms straight onto the nodes,
          // for the same reason the scroll handler avoids React: twelve state
          // updates per animation frame would cost more than the scene does.
          onLabels: (layout) => {
            const nodes = labelRefs.current;
            const frameWidth = stage.clientWidth;
            for (let i = 0; i < nodes.length; i++) {
              const node = nodes[i];
              if (!node) continue;
              const alpha = layout[i * 3 + 2];
              if (alpha <= 0.005) {
                node.style.visibility = 'hidden';
                continue;
              }
              // Measured lazily, on the frame a caption first appears: one
              // forced layout per caption for the life of the page.
              let halfWidth = labelHalfWidths.current[i];
              if (halfWidth === undefined) {
                halfWidth = (node.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0;
                halfWidth /= 2;
                labelHalfWidths.current[i] = halfWidth;
              }
              // Held inside the frame, so a plate near the edge of a narrow
              // screen still gets a whole name rather than half of one. A
              // caption too wide to fit at all is simply centred.
              const lo = halfWidth + LABEL_MARGIN;
              const hi = frameWidth - halfWidth - LABEL_MARGIN;
              const x = lo > hi ? frameWidth / 2 : Math.min(Math.max(layout[i * 3], lo), hi);
              node.style.visibility = 'visible';
              node.style.opacity = String(alpha);
              node.style.transform = `translate3d(${x.toFixed(1)}px, ${layout[i * 3 + 1].toFixed(
                1,
              )}px, 0)`;
            }
          },
          // The probe's reading, set beside its ring on the ground: the
          // coordinates under the hand, or the locality it has closed on.
          onProbe: (reading) => {
            const node = probeRef.current;
            if (!node) return;
            if (!reading) {
              node.dataset.on = 'false';
              return;
            }
            // The model's height for the ground under the probe: a 3′ cell mean, so given to the nearest 10 m and marked approximate.
            // Under the sea the regional grid holds the floor's depth; say so rather than reading it as ground at 0 m.
            const rounded = reading.metres === null ? 0 : Math.round(Math.abs(reading.metres) / 10) * 10;
            const height =
              reading.metres === null
                ? ''
                : reading.metres < -5
                  ? `  ·  sea floor ≈ ${rounded.toLocaleString('en-GB')} m down`
                  : `  ·  ≈ ${rounded.toLocaleString('en-GB')} m`;
            const at = `${formatDeg(reading.lat, 'lat')}  ${formatDeg(reading.lng, 'lng')}${height}`;
            const named = reading.snapped >= 0 ? POINT_NAMES[reading.snapped] : null;
            const text = named ? `${named.place} · ${named.species}\n${at}` : at;
            if (node.textContent !== text) node.textContent = text;
            node.dataset.on = 'true';
            node.dataset.snapped = named ? 'true' : 'false';
            // Set on whichever side of the ring has room.
            node.dataset.side = reading.x > stage.clientWidth * 0.55 ? 'left' : 'right';
            node.style.transform = `translate3d(${reading.x.toFixed(1)}px, ${reading.y.toFixed(1)}px, 0)`;
          },
          // The tropic as it crosses the frame: the title is hung from it.
          onMarks: (marks) => {
            if (marks) {
              stage.style.setProperty('--tropic-y', `${marks.tropicY}px`);
              stage.dataset.marks = 'on';
            } else delete stage.dataset.marks;
          },
          onFootprint: setHeroFootprint,
          // The scene has already stepped its own quality down and still can't
          // keep up on this device, so stop asking it to.
          onTooSlow: bail,
        });
        sceneRef.current = scene;
        if (isIntroDone()) scene.reveal();
        setElevation(Boolean(relief));
        setRegional(relief?.kind === 'region');
        setMode('live');
        const live = scene;
        // The world's first span is the hero's own section; Chapter 04 and the closing attach the second.
        // A journey to the atlas still lays the relief flat from the descent (world/journeys.ts).
        bindAtlasScene(live, stage, (cam, t) => {
          stage.style.setProperty('--sheet', t.toFixed(3));
          live.toSheet(cam, t);
        });
        cleanups.push(attachSpan('hero', section));
        measure();

        // One update per animation frame, however many scroll events arrive.
        let raf = 0;
        const onScroll = () => {
          if (!raf)
            raf = requestAnimationFrame(() => {
              raf = 0;
              update();
            });
        };
        const offScroll = subscribeScroll(onScroll);
        cleanups.push(() => {
          offScroll();
          cancelAnimationFrame(raf);
        });

        // The title's baseline moves once the display face has loaded.
        document.fonts?.ready.then(() => !cancelled && measure()).catch(() => undefined);

        const resizeObserver = new ResizeObserver(measure);
        resizeObserver.observe(stage);
        resizeObserver.observe(section);
        resizeObserver.observe(canvas);
        cleanups.push(() => resizeObserver.disconnect());

        // The shared scroll-velocity signal reaches the camera as momentum.
        cleanups.push(onScrollVelocity((level) => scene?.setMomentum(level)));

        const frameXY = (event: { clientX: number; clientY: number }): [number, number] => {
          const rect = stage.getBoundingClientRect();
          return [((event.clientX - rect.left) / rect.width) * 2 - 1, ((event.clientY - rect.top) / rect.height) * 2 - 1];
        };

        // The name stands in the lamp's light too: its shadow, cast on the relief, swings away from wherever the hand
        // holds the lamp. Transform only (the shadow is blurred once, as its own layer), eased on a frame loop that
        // runs only while it is catching up.
        const shadow = stage.querySelector<HTMLElement>('.hero-title-shadow');
        const glint = stage.querySelector<HTMLElement>('.hero-title-glint');
        const lean = { x: 0, y: 0, tx: 0, ty: 0, raf: 0 };
        const stepShadow = () => {
          lean.raf = 0;
          if (!shadow) return;
          lean.x += (lean.tx - lean.x) * 0.08;
          lean.y += (lean.ty - lean.y) * 0.08;
          shadow.style.transform = `translate3d(${(-lean.x * 0.26).toFixed(4)}em, ${(0.08 + (lean.y + 1) * 0.03).toFixed(4)}em, 0) skewX(${(-lean.x * 24).toFixed(2)}deg) scaleY(${(1.05 - lean.y * 0.05).toFixed(4)})`;
          // The glint is painted inside the letters only, so moving it repaints three words, nothing else.
          glint?.style.setProperty('--gx', `${((lean.x + 1) * 50).toFixed(1)}%`);
          glint?.style.setProperty('--gy', `${((lean.y + 1) * 50).toFixed(1)}%`);
          if (Math.abs(lean.tx - lean.x) + Math.abs(lean.ty - lean.y) > 0.002) lean.raf = requestAnimationFrame(stepShadow);
        };
        const castShadow = (x: number, y: number) => {
          lean.tx = x;
          lean.ty = y;
          if (!lean.raf) lean.raf = requestAnimationFrame(stepShadow);
        };
        cleanups.push(() => cancelAnimationFrame(lean.raf));
        if (hasFinePointer()) {
          // The hand moves the camera a little (parallax) and surveys the
          // ground under it (the probe). No drag, no orbit: scroll stays the
          // way through the descent.
          // Read from the site's one pointer tracker (interaction/pointer.ts), not a listener of its own.
          let over = false;
          const leave = () => {
            if (!over) return;
            over = false;
            scene?.setPointer(0, 0);
            scene?.setProbe(null, 0);
            castShadow(0, 0);
          };
          const offMove = onPointerMove((event) => {
            if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
            // In the atlas act (Chapter 04, the closing) the hand leans the camera a little wherever it is; the probe stays home.
            if (atlasSpan() === 'atlas') {
              over = true;
              scene?.setPointer((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1);
              return;
            }
            if (!(event.target instanceof Node) || !stage.contains(event.target)) return leave();
            over = true;
            const [x, y] = frameXY(event);
            scene?.setPointer(x, y);
            scene?.setProbe(x, y);
            castShadow(x, y);
          });
          const offExit = onPointerExit(leave);
          cleanups.push(offMove, offExit);
        } else {
          // Touch: a tap (not a scroll) sets the probe down where the finger
          // was, reads the ground there, and lifts it again; the lamp swings
          // towards the tap while the probe is down, then back to rest.
          let lift = 0;
          const onTap = (event: MouseEvent) => {
            if ((event.target as Element | null)?.closest('a, button')) return;
            const [x, y] = frameXY(event);
            scene?.setProbe(x, y);
            scene?.setPointer(x, y);
            castShadow(x, y);
            window.clearTimeout(lift);
            lift = window.setTimeout(() => {
              scene?.setProbe(null, 0);
              scene?.setPointer(0, 0);
              castShadow(0, 0);
            }, 2200);
          };
          stage.addEventListener('click', onTap);
          cleanups.push(() => {
            stage.removeEventListener('click', onTap);
            window.clearTimeout(lift);
          });
        }

        // If the user switches reduced motion on, drop back to the flat hero.
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const onMotionChange = () => {
          if (motionQuery.matches) bail();
        };
        motionQuery.addEventListener('change', onMotionChange);
        cleanups.push(() => motionQuery.removeEventListener('change', onMotionChange));

        const lost = canvas;
        lost.addEventListener('webglcontextlost', bail);
        cleanups.push(() => lost.removeEventListener('webglcontextlost', bail));
      })
      .catch(bail);

    return () => {
      cancelled = true;
      release();
    };
  }, [withPlates, endFocus?.lng, endFocus?.lat, atmosphere]);

  useEffect(() => {
    if (introDone) sceneRef.current?.reveal();
  }, [introDone, mode]);

  // The flat hero is plain SVG: it is ready as soon as it has painted once.
  useEffect(() => {
    if (mode !== 'flat' && mode !== 'held') return;
    const id = requestAnimationFrame(() => markFirstFrame());
    return () => cancelAnimationFrame(id);
  }, [mode]);

  // Held, the descent's captions still play from the scroll, as cheaply as before: one write per frame.
  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (mode !== 'held' || !section || !stage) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = section.getBoundingClientRect();
      const runway = Math.max(240, rect.height - window.innerHeight);
      applyProgress(stage, copyRef.current, Math.min(1, Math.max(0, -rect.top / runway)));
    };
    const off = subscribeScroll(() => {
      if (!raf) raf = requestAnimationFrame(update);
    });
    update();
    return () => {
      off();
      cancelAnimationFrame(raf);
    };
  }, [mode]);

  // The flat map draws the same tropic, so the title is hung from it there too. Held, it is measured inside the
  // pinned stage, which is what the copy is laid out in.
  useEffect(() => {
    const root = mode === 'held' ? stageRef.current : sectionRef.current;
    if ((mode !== 'flat' && mode !== 'held') || !root) return;
    let live = true;
    const place = () => {
      const line = root.querySelector<SVGElement>('[data-tropic]');
      if (!live || !line || window.innerWidth / window.innerHeight <= 1.15) {
        delete root.dataset.marks;
        return;
      }
      const y = line.getBoundingClientRect().top - root.getBoundingClientRect().top;
      root.style.setProperty('--tropic-y', `${y.toFixed(1)}px`);
      measureTitleBaseline(root);
      root.dataset.marks = 'on';
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(root);
    // The map arrives with the boundary file, and the title's baseline moves once the face has loaded.
    const mutations = new MutationObserver(place);
    mutations.observe(root, { childList: true, subtree: true });
    document.fonts?.ready.then(place).catch(() => undefined);
    return () => {
      live = false;
      observer.disconnect();
      mutations.disconnect();
    };
  }, [mode]);

  if (mode === 'flat') {
    return (
      <section ref={sectionRef} className="relative overflow-hidden bg-forest-950">
        {flatArt ? (
          <div className="relative min-h-[100svh]">
            {flatArt}
            <div className="relative mx-auto flex min-h-[100svh] max-w-[1600px] items-end px-4 pb-16 pt-28 sm:px-8 lg:px-12">
              <div data-hero-copy className="relative flex w-full flex-col justify-end self-stretch">
                {children}
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
            <div>{children}</div>
            <div className="relative mx-auto aspect-[200/230] w-full max-w-sm rounded-xs border border-forest-800 bg-forest-900/40 p-2">
              <HeroArt />
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      // Transparent: the relief is the page's atlas layer, behind this section (atlasWorld.ts).
      className={withPlates ? 'relative border-b border-forest-800 h-[250vh] lg:h-[310vh]' : 'relative h-[300vh] lg:h-[380vh]'}
    >
      <div
        ref={stageRef}
        className="hero-stage sticky top-0 z-[2] h-screen h-[100svh] overflow-hidden"
        style={{ ['--p' as string]: 0 }}
        // What the relief stands on, so the margin note can say so (and never claims an elevation model that failed to load).
        // Held, the flat map carries its own note; the relief's (heights ×20, its key) would describe a scene no longer shown.
        data-relief={mode !== 'live' || elevation === null ? undefined : elevation ? (regional ? 'region' : 'elevation') : 'boundaries'}
        // The hand surveys the ground here: the reticle takes a fix (interaction/intent.ts) while the probe reads the place.
        data-cursor-area={mode === 'live' ? 'Locate' : undefined}
        data-held={mode === 'held' ? '' : undefined}
      >
        {/* The relief itself is drawn behind this stage, in the page's atlas layer (atlasWorld.ts). Until its
            first frame the stage keeps the page's ground, so nothing flashes. */}
        {!visible && <div aria-hidden="true" className="absolute inset-0 bg-forest-950" />}
        {mode === 'held' && flatArt && <div className="hero-held-art pointer-events-none absolute inset-0">{flatArt}</div>}
        {/* Legibility scrims: darkened top and bottom everywhere, plus a
            left-hand wash on wide screens where the copy sits beside the relief. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-forest-950/80 via-forest-950/38 to-forest-950/28 lg:from-forest-950/45 lg:via-transparent lg:via-45% lg:to-forest-950/80"
        />
        {/* The hand-over: as the descent ends the foot of the relief sinks into the page's own ground, so the next chapter starts on it, not under a cut edge. */}
        <div aria-hidden="true" className="hero-sink pointer-events-none absolute inset-x-0 bottom-0" />
        <div
          aria-hidden="true"
          className="hero-side-wash pointer-events-none absolute inset-0 hidden lg:block lg:bg-gradient-to-r lg:from-forest-950/70 lg:via-transparent lg:via-40% lg:to-transparent"
        />
        {/* Captions for the species plates. Positioned by the scene each frame,
            so they are plain DOM text rather than pixels baked into the atlas:
            crisp under the depth-of-field pass, and free to set. Hidden from
            assistive technology because the summary below reads the same list
            in one pass instead of twelve. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          {withPlates && PLATES.map((plate, index) => {
            const entry = JOURNEY[index];
            return (
              <div
                key={plate.id}
                ref={(node) => {
                  labelRefs.current[index] = node;
                }}
                className="absolute left-0 top-0 will-change-[transform,opacity]"
                style={{ visibility: 'hidden', opacity: 0 }}
              >
                <div className="-translate-x-1/2 translate-y-3.5 text-center">
                  <div className="whitespace-nowrap text-small font-semibold tracking-wide text-canvas drop-shadow-[0_1px_6px_rgba(5,12,8,0.9)]">
                    {entry.species.commonName}
                  </div>
                  <div className="whitespace-nowrap text-micro italic text-forest-300 drop-shadow-[0_1px_6px_rgba(5,12,8,0.9)]">
                    {entry.species.scientificName}
                  </div>
                  <StatusBadge status={entry.species.status} size="sm" className="mt-1.5 bg-forest-950/70" />
                </div>
              </div>
            );
          })}
        </div>
        {withPlates ? (
          <div className="relative mx-auto flex h-full max-w-7xl items-start pt-24 sm:pt-28 lg:items-center lg:pt-0 px-4 sm:px-6">
            <div ref={copyRef} className="max-w-xl lg:max-w-2xl will-change-[opacity,transform]">
              {children}
            </div>
          </div>
        ) : (
          <div className="relative mx-auto flex h-full max-w-[1600px] items-end px-4 pb-14 pt-24 sm:px-8 lg:px-12 lg:pb-16">
            <div
              ref={copyRef}
              data-hero-copy
              className="relative flex w-full flex-col justify-end self-stretch will-change-[opacity,transform]"
            >
              {children}
            </div>
          </div>
        )}
        {overlay}
        {mode === 'live' && <p ref={probeRef} className="hero-probe" data-on="false" aria-hidden="true" />}
        {mode === 'live' && withPlates && (
          <p
            aria-hidden="true"
            className="pointer-events-none absolute bottom-3 right-4 max-w-[13rem] text-right text-micro leading-snug text-forest-300/50"
          >
            Species drawn as schematic silhouettes — outlines, not photographs.
          </p>
        )}
      </div>
      {mode === 'live' && !withPlates && (
        <span className="sr-only">
          {elevation && regional
            ? `A three-dimensional relief of India and its neighbours, land and sea floor, from NOAA's ETOPO 2022 relief model with heights exaggerated ${RELIEF_EXAGGERATION} times, lit by a single low light that casts the mountains' shadows; India's state boundaries are drawn on it, its neighbours are shown in grey, and contours run every 500 metres. `
            : elevation
            ? `A three-dimensional relief of India: its ground is NOAA's ETOPO 2022 elevation model, with heights exaggerated ${RELIEF_EXAGGERATION} times, inside the same state boundaries as the atlas's maps, and contours every 500 metres. `
            : "A three-dimensional relief of India, drawn from the same state boundaries as the atlas's maps. "}
          As the page scrolls the view descends towards the terrain and lights the indicative localities recorded for
          each species, coloured by IUCN Red List category. The same localities are listed on the interactive map.
        </span>
      )}
      {mode === 'live' && withPlates && (
        <span className="sr-only">
          A three-dimensional relief of India showing indicative occurrence points for the species in this
          atlas, coloured by IUCN Red List category. The view descends towards the terrain as the page
          scrolls, and each species is introduced over its anchor locality with a schematic silhouette —
          a drawn outline of the animal, not a photograph or a scan. Species appear in this order:{' '}
          {JOURNEY.map(
            ({ species, anchor }) =>
              `${species.commonName} (${species.scientificName}), ${species.statusFullName}, at ${anchor.label}`,
          ).join('; ')}
          . The same information is available on the interactive map.
        </span>
      )}
    </section>
  );
}
