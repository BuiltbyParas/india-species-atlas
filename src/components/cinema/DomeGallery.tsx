import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { Species } from '../../types';
import { STATUS_INFO } from '../../data/statusInfo';
import { REGION_LABELS } from '../../data/regions';
import { localityCoords } from '../../geo/india';
import { prefersReducedMotion } from '../../motion/preferences';
import { useSpeciesProfile } from '../species/SpeciesProfileProvider';
import { PhotoCredit } from '../ui/PhotoCredit';
import { cn } from '../../utils/cn';
import { photoSources } from '../../utils/photo';

/**
 * The twelve species on the outside of a sphere, the one facing you brought
 * forward.
 *
 * The middle band holds the photographs, one species per 30°. The bands above
 * and below hold the dataset's indicative localities — place, coordinates,
 * and whose locality it is — so the dome is made of the atlas's own records
 * rather than decoration, and turning it runs the places past alongside the
 * animals.
 *
 * Built with CSS 3D transforms rather than WebGL: the photographs stay
 * ordinary <img> elements with their alt text and credits, the type stays
 * real type, and the whole thing costs one composited layer per tile. Drag
 * (mouse or touch) turns it with inertia and settles on the nearest species;
 * the arrow keys step one species at a time; the pointer leans it slightly
 * while it rests. It only animates while something is moving it.
 *
 * Set as an object on a lit table rather than in a box: its atmosphere
 * dissolves into the page on every side, a pool of light sits under the
 * species facing the reader, and the corners say what the bands are and how
 * to turn it. A chapter can turn it from outside (`control`) and follow which
 * species faces the reader (`onCenter`) — Chapter 03's index does both.
 *
 * Chapter 03 also stands it on ground (`ground`, laid under the sphere), raises
 * it out of that ground with the scroll (`control.rise`: the lower band first,
 * then the photographs, then the upper band), and adds a line to its caption
 * (`detail`). Choosing the species in front is played before the profile opens:
 * the sphere draws in on it, the rest of the dome dims, a rule runs under its
 * name, and then the existing profile opens. With reduced motion it opens at once.
 */
const LAT = 21;

export interface DomeControl {
  goTo(index: number): void;
  /** 0 → 1: the dome coming up out of its ground, band by band. */
  rise(t: number): void;
}

/** How long the choice is played before the profile opens, in ms. */
const COMMIT_MS = 640;
/** Where in the rise each band starts (lower, middle, upper) and how much of it each takes. */
const RISE_FROM = { down: 0, mid: 0.22, up: 0.42 } as const;
const RISE_SPAN = 0.58;

const smooth01 = (v: number) => {
  const t = v < 0 ? 0 : v > 1 ? 1 : v;
  return t * t * (3 - 2 * t);
};

interface Tile {
  key: string;
  lon: number;
  lat: number;
  species: Species;
  kind: 'photo' | 'place';
  place?: { label: string; lat: number; lng: number; withholdCoordinates?: true };
}

function wrap(deg: number) {
  return ((((deg + 180) % 360) + 360) % 360) - 180;
}

export function DomeGallery({
  species,
  control,
  onCenter,
  ground,
  detail,
}: {
  species: Species[];
  control?: RefObject<DomeControl | null>;
  onCenter?: (index: number) => void;
  /** Laid under the sphere, inside the dome's own box. */
  ground?: ReactNode;
  /** A further line for the caption, about the species in front. */
  detail?: (s: Species) => ReactNode;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const sphereRef = useRef<HTMLDivElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<Array<HTMLDivElement | null>>([]);
  const { open } = useSpeciesProfile();
  const [center, setCenter] = useState(0);
  const [radius, setRadius] = useState(640);

  const count = species.length;
  const step = 360 / count;

  const tiles = useMemo<Tile[]>(() => {
    const out: Tile[] = species.map((s, i) => ({ key: s.id, lon: i * step, lat: 0, species: s, kind: 'photo' }));
    // Localities for the upper and lower bands, taken in turn from each species.
    const places = species.flatMap((s) => s.distributionPoints.slice(1, 3).map((p) => ({ s, p })));
    const band = (lat: number, offset: number, from: number) => {
      for (let i = 0; i < count; i++) {
        const entry = places[(from + i) % places.length];
        if (!entry) continue;
        out.push({
          key: `${lat}-${i}`,
          lon: i * step + offset,
          lat,
          species: entry.s,
          kind: 'place',
          // The record's withholding travels with the place, so the band prints "coordinates withheld" where it should.
          place: { label: entry.p.label, lat: entry.p.lat, lng: entry.p.lng, withholdCoordinates: entry.p.withholdCoordinates },
        });
      }
    };
    band(LAT, step / 2, 0);
    band(-LAT, step / 2, count);
    return out;
  }, [species, count, step]);

  // Pose state lives outside React; only the centred species is state.
  const pose = useRef({ ry: 0, rx: -4, vy: 0, tx: 0, ty: 0, lx: 0, ly: 0, dragging: false, target: null as number | null });
  const raf = useRef(0);

  const apply = useCallback(() => {
    const p = pose.current;
    const sphere = sphereRef.current;
    if (!sphere) return;
    sphere.style.transform = `translateZ(${-radius}px) rotateX(${(p.rx + p.ly).toFixed(3)}deg) rotateY(${(p.ry + p.lx).toFixed(3)}deg)`;
    const facing = p.ry + p.lx;
    tiles.forEach((t, i) => {
      const el = tileRefs.current[i];
      if (!el) return;
      const d = Math.min(1, Math.abs(wrap(t.lon + facing)) / 90);
      el.style.setProperty('--d', d.toFixed(3));
    });
    const idx = ((Math.round(-p.ry / step) % count) + count) % count;
    setCenter((c) => (c === idx ? c : idx));
  }, [radius, tiles, step, count]);

  const loopRef = useRef<() => void>(() => undefined);
  const loop = useCallback(() => {
    const p = pose.current;
    let moving = false;
    if (!p.dragging) {
      if (p.target !== null) {
        const diff = p.target - p.ry;
        p.ry += diff * 0.12;
        if (Math.abs(diff) < 0.02) {
          p.ry = p.target;
          p.target = null;
        } else moving = true;
      } else if (Math.abs(p.vy) > 0.02) {
        p.ry += p.vy;
        p.vy *= 0.93;
        moving = true;
      } else {
        p.vy = 0;
        p.target = Math.round(p.ry / step) * step;
        if (Math.abs(p.target - p.ry) > 0.02) moving = true;
        else p.target = null;
      }
    } else moving = true;
    // The pointer lean eases towards its target whether or not we are dragging.
    p.lx += (p.tx - p.lx) * 0.08;
    p.ly += (p.ty - p.ly) * 0.08;
    if (Math.abs(p.tx - p.lx) > 0.01 || Math.abs(p.ty - p.ly) > 0.01) moving = true;
    apply();
    raf.current = moving ? requestAnimationFrame(() => loopRef.current()) : 0;
  }, [apply, step]);
  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  const kick = useCallback(() => {
    if (!raf.current) raf.current = requestAnimationFrame(() => loopRef.current());
  }, []);

  // The choice being played (the species' id), and the timers that end it.
  const [opening, setOpening] = useState<string | null>(null);
  const openTimers = useRef<number[]>([]);
  const cancelOpening = useCallback(() => {
    openTimers.current.forEach((t) => window.clearTimeout(t));
    openTimers.current = [];
    setOpening(null);
  }, []);
  useEffect(() => () => openTimers.current.forEach((t) => window.clearTimeout(t)), []);

  const goTo = useCallback(
    (index: number) => {
      const p = pose.current;
      // Take the short way round.
      const current = p.ry;
      const want = -index * step;
      const target = current + wrap(want - current);
      if (prefersReducedMotion()) {
        p.ry = target;
        p.target = null;
        apply();
        return;
      }
      p.vy = 0;
      p.target = target;
      kick();
    },
    [apply, kick, step],
  );

  const commit = useCallback(
    (index: number) => {
      const s = species[index];
      if (!s) return;
      cancelOpening();
      if (prefersReducedMotion()) {
        open(s.id);
        return;
      }
      goTo(index);
      setOpening(s.id);
      openTimers.current = [
        window.setTimeout(() => open(s.id), COMMIT_MS),
        // Back to rest behind the profile, so closing it returns to the dome as it was.
        window.setTimeout(() => setOpening(null), COMMIT_MS + 900),
      ];
    },
    [species, cancelOpening, goTo, open],
  );

  // The rise is written straight to the tiles and the lens: it follows the scroll, never React.
  const riseAt = useRef(1);
  const rise = useCallback(
    (t: number) => {
      if (Math.abs(t - riseAt.current) < 0.0005) return;
      riseAt.current = t;
      tiles.forEach((tile, i) => {
        const el = tileRefs.current[i];
        if (!el) return;
        const from = tile.lat < 0 ? RISE_FROM.down : tile.lat > 0 ? RISE_FROM.up : RISE_FROM.mid;
        el.style.setProperty('--rise', smooth01((t - from) / RISE_SPAN).toFixed(3));
      });
      const lens = lensRef.current;
      if (lens) lens.style.translate = `0 ${((1 - smooth01(t)) * 14).toFixed(2)}%`;
    },
    [tiles],
  );

  useImperativeHandle(control, () => ({ goTo, rise }), [goTo, rise]);

  useEffect(() => {
    onCenter?.(center);
  }, [onCenter, center]);

  // Size the sphere to its stage.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const ro = new ResizeObserver(() => {
      const w = stage.clientWidth;
      setRadius(Math.round(Math.min(Math.max(w * 0.46, 300), 820)));
    });
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    apply();
  }, [apply]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // Pointer: drag to turn, lean while resting.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const p = pose.current;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastT = 0;
    let moved = 0;
    let pointerId: number | null = null;
    let horizontal: boolean | null = null;

    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      pointerId = e.pointerId;
      startX = lastX = e.clientX;
      startY = e.clientY;
      lastT = performance.now();
      moved = 0;
      horizontal = e.pointerType === 'mouse' ? true : null;
      p.vy = 0;
      p.target = null;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && pointerId === null) {
        const r = stage.getBoundingClientRect();
        p.tx = ((e.clientX - r.left) / r.width - 0.5) * 6;
        p.ty = -((e.clientY - r.top) / r.height - 0.5) * 4;
        kick();
        return;
      }
      if (e.pointerId !== pointerId) return;
      // On touch, decide once whether this gesture is a turn or a page scroll.
      if (horizontal === null) {
        const dx = Math.abs(e.clientX - startX);
        const dy = Math.abs(e.clientY - startY);
        if (dx < 6 && dy < 6) return;
        horizontal = dx > dy;
        if (!horizontal) {
          pointerId = null;
          return;
        }
      }
      if (!p.dragging) {
        // A turn of the dome takes back a choice still being played.
        cancelOpening();
        p.dragging = true;
        stage.setPointerCapture(e.pointerId);
        stage.dataset.dragging = 'true';
      }
      const now = performance.now();
      const dx = e.clientX - lastX;
      const sens = 150 / radius;
      p.ry += dx * sens * 0.6;
      p.vy = (dx * sens * 0.6 * 16) / Math.max(now - lastT, 8);
      lastX = e.clientX;
      lastT = now;
      moved += Math.abs(dx);
      kick();
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      if (p.dragging) {
        p.dragging = false;
        stage.dataset.dragging = 'false';
        if (prefersReducedMotion()) p.vy = 0;
        kick();
      }
      // A press that did not travel is a click, handled by the tile's button.
      if (moved > 6) {
        const block = (ev: MouseEvent) => {
          ev.stopPropagation();
          ev.preventDefault();
        };
        stage.addEventListener('click', block, { capture: true, once: true });
        window.setTimeout(() => stage.removeEventListener('click', block, { capture: true }), 50);
      }
    };
    const leave = () => {
      p.tx = 0;
      p.ty = 0;
      kick();
    };
    stage.addEventListener('pointerdown', down);
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    stage.addEventListener('pointerleave', leave);
    return () => {
      stage.removeEventListener('pointerdown', down);
      stage.removeEventListener('pointermove', move);
      stage.removeEventListener('pointerup', up);
      stage.removeEventListener('pointercancel', up);
      stage.removeEventListener('pointerleave', leave);
    };
  }, [kick, radius, cancelOpening]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      cancelOpening();
      goTo((center + 1) % count);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      cancelOpening();
      goTo((center - 1 + count) % count);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commit(center);
    }
  };

  const focus = species[center];
  const focusPhoto = photoSources(focus);
  const info = STATUS_INFO[focus.status];
  const tileW = Math.round(((2 * Math.PI * radius) / count) * 0.8);
  const tileH = Math.round(tileW * 1.18);
  const placeH = Math.round(tileW * 0.62);

  return (
    <div className="dome" style={{ ['--status' as string]: info.hex }} data-opening={opening ? 'true' : undefined}>
      <div className="dome-atmos" aria-hidden="true">
        {focusPhoto && <img key={focus.id} src={focusPhoto.small} alt="" className="dome-atmos-img" />}
      </div>
      {ground}
      <div className="dome-lamp" aria-hidden="true" />
      <div className="dome-furniture" aria-hidden="true">
        <p className="dome-key">
          <span className="dome-key-rule" />
          Above and below: indicative localities from the atlas&rsquo;s records
        </p>
        <p className="dome-key is-right">
          Drag, or use the arrow keys, to turn
          <span className="dome-key-rule" />
        </p>
      </div>

      <div
        ref={stageRef}
        className="dome-stage"
        style={{ perspective: `${Math.round(radius * 2.1)}px` }}
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label={`Species gallery. ${focus.commonName} is in front. Use the arrow keys to turn, Enter to open the profile.`}
        onKeyDown={onKey}
        data-cursor-drag
        data-cursor-area="Turn"
      >
        <div ref={lensRef} className="dome-lens">
        <div ref={sphereRef} className="dome-sphere">
          {tiles.map((t, i) => {
            const speciesIndex = species.indexOf(t.species);
            const tilePhoto = t.kind === 'photo' ? photoSources(t.species) : null;
            return (
              <div
                key={t.key}
                ref={(n) => {
                  tileRefs.current[i] = n;
                }}
                className={cn('dome-tile', t.kind === 'photo' ? 'is-photo' : 'is-place', t.kind === 'photo' && speciesIndex === center && 'is-center')}
                data-band={t.lat < 0 ? 'down' : t.lat > 0 ? 'up' : 'mid'}
                style={{
                  width: tileW,
                  height: t.kind === 'photo' ? tileH : placeH,
                  marginLeft: -tileW / 2,
                  marginTop: -(t.kind === 'photo' ? tileH : placeH) / 2,
                  transform: `rotateY(${t.lon}deg) rotateX(${t.lat}deg) translateZ(${radius}px)`,
                }}
              >
                {t.kind === 'photo' ? (
                  <button
                    type="button"
                    tabIndex={-1}
                    className="dome-card"
                    onClick={() => (speciesIndex === center ? commit(speciesIndex) : goTo(speciesIndex))}
                    data-cursor={speciesIndex === center ? 'Discover' : 'Turn'}
                    aria-hidden="true"
                  >
                    {tilePhoto && (
                      <img
                        src={tilePhoto.small}
                        width={tilePhoto.width}
                        height={tilePhoto.height}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                      />
                    )}
                    <span className="dome-card-name font-serif">{t.species.commonName}</span>
                  </button>
                ) : (
                  <div className="dome-place" aria-hidden="true">
                    <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="dome-place-line">
                      <path d="M0 18 C 20 4, 40 22, 60 10 S 90 6, 100 14" />
                    </svg>
                    <p className="dome-place-name font-serif text-[0.95em] leading-tight">{t.place!.label.split(',')[0]}</p>
                    <p className="dome-place-coord mt-1 text-[0.7em] tabular-nums">
                      {localityCoords(t.place!)}
                    </p>
                    <p className="dome-place-of mt-0.5 text-[0.7em] italic">{t.species.commonName}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </div>
      </div>

      <div className="dome-caption" aria-live="polite">
        <div key={focus.id} className="dome-caption-inner">
          <p className="dome-count tabular-nums">
            <span className="dome-count-n">{String(center + 1).padStart(2, '0')}</span>
            <span className="dome-count-of">of {count}</span>
          </p>
          <div className="dome-caption-text">
            <p className="dome-name font-serif">
              <span>{focus.commonName}</span>
            </p>
            <p className="dome-sci font-serif">{focus.scientificName}</p>
            <p className="dome-meta">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: info.colorVar }} aria-hidden="true" />
                {info.name}
              </span>
              <span>{focus.regions.map((r) => REGION_LABELS[r]).join(', ')}</span>
            </p>
            {detail?.(focus)}
            <PhotoCredit species={focus} className="dome-credit" />
          </div>
        </div>
        <div className="dome-controls flex items-center gap-2">
          <button type="button" className="dome-arrow" onClick={() => {
            cancelOpening();
            goTo((center - 1 + count) % count);
          }} aria-label="Previous species" data-cursor="Turn" data-magnetic="0.4">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7" /></svg>
          </button>
          <button type="button" className="dome-arrow" onClick={() => {
            cancelOpening();
            goTo((center + 1) % count);
          }} aria-label="Next species" data-cursor="Turn" data-magnetic="0.4">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
          </button>
          <button type="button" className="text-link ml-4" onClick={() => commit(center)} data-cursor="Discover" data-magnetic="0.22">
            Open profile
          </button>
        </div>
      </div>

      <ul className="sr-only">
        {species.map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => open(s.id)}>
              {s.commonName}, {s.scientificName}, {STATUS_INFO[s.status].name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
