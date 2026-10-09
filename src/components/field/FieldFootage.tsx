import { useEffect, useRef, useState } from 'react';
import type { Footage } from '../../content/footage';
import { useReducedMotion } from '../../motion/preferences';
import { cn } from '../../utils/cn';

/**
 * A short, silent clip of the study's animal, set in its chapter.
 *
 * The photograph (the poster) is on screen at once. The clip is not fetched
 * until the panel is within a screen of the viewport, plays while the pointer
 * or keyboard focus is on it (or when the button is pressed), and pauses when
 * either leaves or the panel scrolls away. With reduced motion nothing plays
 * on its own; the button still can. If the clip cannot load or play, the
 * photograph stays and nothing else changes.
 */
export function FieldFootage({ footage, active = true, className }: { footage: Footage; /** False while the chapter holding it is not the one on screen. */ active?: boolean; className?: string }) {
  const reduced = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [wanted, setWanted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const pressed = useRef(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const far = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '100% 0px' });
    const here = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.25 });
    far.observe(el);
    here.observe(el);
    return () => {
      far.disconnect();
      here.disconnect();
    };
  }, []);

  const run = wanted && active && onScreen && near && !failed;
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (!run) {
      v.pause();
      return;
    }
    v.play().catch((err: unknown) => {
      // Autoplay refused or the file would not play: the photograph stays.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.warn('[footage] could not play', footage.src, err);
      setFailed(true);
    });
  }, [run, footage.src]);

  const hover = (on: boolean) => {
    if (reduced || pressed.current) return;
    setWanted(on);
  };

  return (
    <figure className={cn('fs-footage', className)} data-state={failed ? 'failed' : playing ? 'playing' : 'still'}>
      <div
        ref={box}
        className="fs-footage-frame"
        style={{ aspectRatio: `${footage.width} / ${footage.height}` }}
        onPointerEnter={(e) => e.pointerType === 'mouse' && hover(true)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && hover(false)}
        onFocus={(e) => e.target.matches(':focus-visible') && hover(true)}
        onBlur={() => hover(false)}
      >
        <img className="fs-footage-poster" src={footage.poster} width={footage.width} height={footage.height} alt="" decoding="async" loading="lazy" />
        {near && !failed && (
          <video
            ref={video}
            className="fs-footage-video"
            src={footage.src}
            poster={footage.poster}
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            tabIndex={-1}
            onPlaying={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onError={() => {
              console.warn('[footage] could not load', footage.src);
              setFailed(true);
            }}
          />
        )}
        {!failed && (
          <button
            type="button"
            className="fs-footage-toggle"
            aria-pressed={wanted}
            aria-label={`${wanted ? 'Pause' : 'Play'} footage: ${footage.title}`}
            data-cursor={wanted ? 'Pause' : 'Play'}
            onClick={() => {
              pressed.current = !wanted;
              setWanted(!wanted);
            }}
          >
            <span aria-hidden="true">{wanted ? 'Pause' : 'Play'}</span>
          </button>
        )}
      </div>
      <figcaption className="fs-footage-cap">
        <span>Footage</span> {footage.title}.{' '}
        <a href={footage.sourceUrl} target="_blank" rel="noreferrer">
          {footage.credit}
        </a>{' '}
        ·{' '}
        <a href={footage.licenseUrl} target="_blank" rel="noreferrer">
          {footage.license}
        </a>{' '}
        · via Wikimedia Commons. {footage.note}
      </figcaption>
    </figure>
  );
}
