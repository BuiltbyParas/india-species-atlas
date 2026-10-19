import { useEffect, useRef, useState, type ReactNode } from 'react';
import { footageSources, type PlateFootage } from '../../content/footage';
import { useFinePointer, useReducedMotion } from '../../motion/preferences';
import { setPlateVeil } from '../../world/field/plateVeil';
import { cn } from '../../utils/cn';

/**
 * THE LIVING PLATE: the study's animal itself, filmed in the wild, set into its drawn world on the index.
 *
 * It opens out of the world as the scroll moves past the study's name (the index's second beat) and closes as the
 * next study arrives. Only the plate on screen holds a video element at all: it is created when its study becomes the
 * one in view, so the clip has a moment to buffer before the plate opens, and removed a beat after the study is left,
 * so no two clips are ever decoded at once. The still (the clip's first frame) is under it from the start and stays
 * if the clip cannot load or play. It plays silent; with reduced motion it waits for its button. The button pauses
 * it too, and it pauses whenever it is off screen or the tab is hidden.
 *
 * It is a window into the world rather than a picture on it: its edges dissolve into the drawn ground, it is graded
 * toward the world's light, the camera behind it settles and drifts slowly while it is open and leans a few pixels
 * with the pointer — and while the clip is actually playing, the photograph standing in the world steps back
 * (world/field/plateVeil.ts), so the screen holds one animal, the filmed one, moving in its own place.
 */
export function LivingPlate({
  footage,
  study,
  shown,
  current,
  focusable,
  children,
}: {
  footage: PlateFootage;
  study: string;
  /** Open: the scroll has reached the study's second beat. */
  shown: boolean;
  /** The study is the one in view (the clip is mounted and buffers while this holds). */
  current: boolean;
  /** Its controls are in the tab order (only while its composition is the one shown). */
  focusable: boolean;
  /** Under the frame: the caption's actions (the encounter's way in). */
  children?: ReactNode;
}) {
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const box = useRef<HTMLDivElement>(null);
  const figure = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [mounted, setMounted] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [visibleTab, setVisibleTab] = useState(() => typeof document === 'undefined' || document.visibilityState === 'visible');
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  /** The reader's own choice, once made: true plays, false holds. Null follows the defaults. */
  const [choice, setChoice] = useState<boolean | null>(null);

  // Mount with the study, unmount a beat after it is left (after the plate has closed).
  useEffect(() => {
    if (current) {
      setMounted(true);
      return;
    }
    const t = window.setTimeout(() => setMounted(false), 900);
    return () => window.clearTimeout(t);
  }, [current]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    const vis = () => setVisibleTab(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', vis);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', vis);
    };
  }, []);

  const wanted = choice ?? !reduced;
  const run = mounted && shown && wanted && onScreen && visibleTab && !failed;
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (!run) {
      v.pause();
      return;
    }
    v.play().catch((err: unknown) => {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      // Autoplay refused (a browser's data saver, say): the still stays, and the button can still start it.
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setChoice(false);
        return;
      }
      console.warn('[plate] could not play', footage.src, err);
      setFailed(true);
    });
  }, [run, mounted, footage.src]);

  // The world's photograph steps back only while the footage is really moving over it.
  const veiled = shown && playing && !failed;
  useEffect(() => {
    setPlateVeil(study, veiled);
  }, [study, veiled]);
  useEffect(() => () => setPlateVeil(study, false), [study]);

  // The pointer leans the camera behind the window a few pixels (desktop, with motion, while it is open).
  useEffect(() => {
    const el = figure.current;
    if (!el || !shown || reduced || !fine) return;
    let raf = 0;
    let x = 0;
    let y = 0;
    const onMove = (e: PointerEvent) => {
      x = (e.clientX / window.innerWidth) * 2 - 1;
      y = (e.clientY / window.innerHeight) * 2 - 1;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        el.style.setProperty('--plate-lx', x.toFixed(3));
        el.style.setProperty('--plate-ly', y.toFixed(3));
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [shown, reduced, fine]);

  return (
    <figure
      ref={figure}
      className={cn('fs-plate', shown && 'is-shown')}
      data-plate={study}
      data-state={failed ? 'failed' : playing ? 'playing' : 'still'}
      style={{ ['--plate-focus' as string]: footage.focus }}
    >
      <div ref={box} className="fs-plate-frame">
        <div className="fs-plate-cam">
          <img className="fs-plate-still" src={footage.poster} width={footage.width} height={footage.height} alt="" decoding="async" loading="lazy" />
          {mounted && !failed && (
            <video
              ref={video}
              className="fs-plate-video"
              muted
              loop
              playsInline
              preload="auto"
              disablePictureInPicture
              aria-hidden="true"
              tabIndex={-1}
              onPlaying={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            >
              {footageSources(footage).map((s, i, all) => (
                <source
                  key={s.src}
                  src={s.src}
                  type={s.type}
                  // Only the last source's failure means nothing would play: the still stays.
                  onError={
                    i === all.length - 1
                      ? () => {
                          console.warn('[plate] could not load', footage.src);
                          setFailed(true);
                        }
                      : undefined
                  }
                />
              ))}
            </video>
          )}
        </div>
        {!failed && (
          <button
            type="button"
            className="fs-plate-toggle"
            tabIndex={focusable ? 0 : -1}
            aria-pressed={wanted}
            aria-label={`${wanted ? 'Pause' : 'Play'} footage: ${footage.title}`}
            data-cursor={wanted ? 'Pause' : 'Play'}
            onClick={() => setChoice(!wanted)}
          >
            <span aria-hidden="true">{wanted ? 'Pause' : 'Play'}</span>
          </button>
        )}
      </div>
      <figcaption className="fs-plate-cap">
        <span className="fs-plate-k">Footage · wild, India</span>
        <span className="fs-plate-what">{footage.behaviour}.</span>
        <span className="fs-plate-credit">
          <a href={footage.sourceUrl} target="_blank" rel="noreferrer" tabIndex={focusable ? 0 : -1}>
            {footage.credit}
          </a>{' '}
          ·{' '}
          <a href={footage.licenseUrl} target="_blank" rel="noreferrer" tabIndex={focusable ? 0 : -1}>
            {footage.license}
          </a>
        </span>
        {children}
      </figcaption>
    </figure>
  );
}
