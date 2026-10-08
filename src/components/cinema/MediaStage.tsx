import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { GeoLine } from '../../geo/line/GeoLine';
import { emit } from '../../interaction/events';
import { schedule } from '../../interaction/loop';
import { boxOf, clearMedia, fit, flipFrom, useOpenMedia, type Box, type FilmRequest, type OpenMedia } from '../../interaction/media';
import { lockScroll } from '../../motion/SmoothScroll';
import { prefersReducedMotion } from '../../motion/preferences';
import { holdEnvironment } from '../../world/environment';

/**
 * The cinema: where a photograph or the film goes when it is opened
 * (`interaction/media.ts`).
 *
 * One element — the picture — makes the whole move. It is laid out at its
 * full-screen size and started from its origin's rectangle with a transform
 * and a crop, then both are animated away; closing runs the same move in
 * reverse into the origin's rectangle, which is measured again at that moment.
 * Everything else (the dark, the title, the controls) only fades. With
 * reduced motion the picture is simply there, and simply gone.
 *
 * While open: the page's scroll is held, the 3D scenes pause (the scene
 * registry hears `media:open`), the environment is `cinema`, focus stays
 * inside, Escape closes, and focus goes back to whatever opened it.
 *
 * The film's controls are the atlas's own: a route line along the bottom is
 * the progress (a range input lies over it for the keyboard, touch and
 * dragging), and three words — play, sound, close. Captions are on.
 */
const OPEN_MS = 900;
const CLOSE_MS = 700;
const EASE_OPEN = 'cubic-bezier(0.7, 0, 0.2, 1)';
const EASE_CLOSE = 'cubic-bezier(0.6, 0, 0.25, 1)';

type Phase = 'enter' | 'open' | 'leave';

function area(kind: 'film' | 'image'): Box {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (kind === 'film') return { x: 0, y: 0, w, h };
  // A print keeps a margin and room for its credit underneath.
  const m = Math.min(48, Math.max(16, w * 0.04));
  return { x: m, y: m + 24, w: w - 2 * m, h: h - 2 * m - 72 };
}

/** An origin the picture can return to: still in the page, laid out, and on screen. */
function usable(el: HTMLElement | null): el is HTMLElement {
  if (!el?.isConnected) return false;
  const r = el.getBoundingClientRect();
  return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < window.innerHeight;
}

function clock(t: number) {
  if (!Number.isFinite(t)) return '0:00';
  const s = Math.max(0, Math.floor(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function MediaStage() {
  const open = useOpenMedia();
  if (!open) return null;
  return createPortal(<Stage key={open.id} open={open} />, document.body);
}

function Stage({ open }: { open: OpenMedia }) {
  const { request, origin, trigger } = open;
  const aspect = request.kind === 'film' ? request.aspect : request.width / request.height;
  const [phase, setPhase] = useState<Phase>('enter');
  const [box, setBox] = useState<Box>(() => fit(aspect, area(request.kind)));
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const leavingRef = useRef(false);

  // The page holds still, the scenes pause and the light goes down while the stage is up.
  useEffect(() => {
    lockScroll(true);
    const release = holdEnvironment('cinema');
    emit('media:open', { kind: request.kind });
    origin?.setAttribute('data-media-origin', '');
    return () => {
      lockScroll(false);
      release();
      emit('media:close', { kind: request.kind });
      origin?.removeAttribute('data-media-origin');
    };
  }, [origin, request.kind]);

  // The opening move: from the origin's rectangle to the stage.
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const to = fit(aspect, area(request.kind));
    setBox(to);
    const done = () => {
      // Closed before the picture landed: the closing move owns the stage now.
      if (leavingRef.current) return;
      setPhase('open');
      // The film's first control is Play/Pause, so Space does what a viewer expects; a print's is Close.
      const first = rootRef.current?.querySelector<HTMLElement>('[data-autofocus]') ?? closeRef.current;
      first?.focus({ preventScroll: true });
    };
    if (prefersReducedMotion()) {
      done();
      return;
    }
    if (!usable(origin)) {
      // Opened from somewhere with no picture of its own (the menu): the frame simply comes forward.
      const anim = frame.animate([{ opacity: 0, transform: 'scale(0.97)' }, { opacity: 1, transform: 'none' }], { duration: 600, easing: EASE_OPEN });
      anim.onfinish = done;
      return () => anim.cancel();
    }
    const from = flipFrom(boxOf(origin), to);
    const anim = frame.animate(
      [
        { transform: from.transform, clipPath: from.clipPath },
        { transform: 'none', clipPath: 'inset(0px 0px 0px 0px)' },
      ],
      { duration: OPEN_MS, easing: EASE_OPEN },
    );
    anim.onfinish = done;
    return () => anim.cancel();
  }, [aspect, origin, request.kind]);

  useEffect(() => {
    const onResize = () => setBox(fit(aspect, area(request.kind)));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [aspect, request.kind]);

  const close = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setPhase('leave');
    const frame = frameRef.current;
    frame?.querySelector('video')?.pause();
    for (const a of frame?.getAnimations() ?? []) a.cancel();
    const finish = () => {
      clearMedia();
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
    if (!frame || prefersReducedMotion()) {
      finish();
      return;
    }
    if (!usable(origin)) {
      const anim = frame.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(0.97)' }], { duration: 400, easing: EASE_CLOSE, fill: 'forwards' });
      anim.onfinish = finish;
      return;
    }
    const from = flipFrom(boxOf(origin), boxOf(frame));
    const anim = frame.animate(
      [
        { transform: 'none', clipPath: 'inset(0px 0px 0px 0px)' },
        { transform: from.transform, clipPath: from.clipPath },
      ],
      { duration: CLOSE_MS, easing: EASE_CLOSE, fill: 'forwards' },
    );
    anim.onfinish = finish;
  }, [origin, trigger]);

  // Focus stays on the stage; Escape closes it.
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = [...(rootRef.current?.querySelectorAll<HTMLElement>('button, input, a[href]') ?? [])].filter((el) => !el.hasAttribute('disabled'));
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const title = request.kind === 'film' ? request.title : request.alt;

  return (
    <div
      ref={rootRef}
      className="media-stage"
      data-phase={phase}
      data-kind={request.kind}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onKeyDown={onKeyDown}
    >
      <div className="media-backdrop" onClick={close} aria-hidden="true" />
      <div
        ref={frameRef}
        className="media-frame"
        style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
      >
        {request.kind === 'film' ? (
          <Film film={request} playing={phase === 'open'} />
        ) : (
          <img src={request.src} srcSet={request.srcSet} sizes="100vw" alt={request.alt} className="media-picture" decoding="async" />
        )}
      </div>
      <div className="media-chrome">
        <div className="media-head">
          <p className="media-title">
            <span className="media-eyebrow">{request.kind === 'film' ? 'The film' : 'Photograph'}</span>
            {request.kind === 'film' ? request.title : null}
          </p>
          <button ref={closeRef} type="button" className="media-word" onClick={close} data-cursor="Close" data-magnetic="0.2">
            Close <span className="media-key" aria-hidden="true">Esc</span>
          </button>
        </div>
        {request.kind === 'image' && request.caption ? (
          <div className="media-caption" style={{ top: box.y + box.h + 12, left: box.x, width: box.w }}>
            {request.caption}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The film and its three words. Time is read from the video element; the
 * route line's draw is written straight onto it on the interaction loop while
 * playing, and React only hears the time a few times a second (for the clock
 * and the range input's value).
 */
function Film({ film, playing }: { film: FilmRequest; playing: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lineRef = useRef<SVGSVGElement>(null);
  const [paused, setPaused] = useState(true);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [width, setWidth] = useState(1000);

  // Start once the picture has arrived on the stage: the press that opened it is the gesture that allows sound.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !playing) return;
    v.play().catch(() => {
      // Sound refused (no gesture reached us): play muted rather than not at all.
      v.muted = true;
      setMuted(true);
      void v.play().catch(() => undefined);
    });
  }, [playing]);

  // The progress line follows the film on the shared loop, only while it plays.
  useEffect(() => {
    const v = videoRef.current;
    const line = lineRef.current;
    if (!v || !line || paused) return;
    let live = true;
    const stop = schedule(() => {
      if (!live) return false;
      line.style.setProperty('--draw', v.duration ? (v.currentTime / v.duration).toFixed(4) : '0');
      return true;
    });
    return () => {
      live = false;
      stop();
    };
  }, [paused]);

  // The line is drawn in screen pixels, so its viewBox is its own measured width.
  useLayoutEffect(() => {
    const line = lineRef.current;
    if (!line) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(1, Math.round(e.contentRect.width))));
    ro.observe(line);
    return () => ro.disconnect();
  }, []);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused || v.ended) void v.play().catch(() => undefined);
    else v.pause();
  };

  const seek = (t: number) => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(t)) return;
    v.currentTime = Math.max(0, Math.min(t, v.duration || t));
    setTime(v.currentTime);
    lineRef.current?.style.setProperty('--draw', v.duration ? (v.currentTime / v.duration).toFixed(4) : '0');
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if ((e.key === ' ' || e.key === 'k') && target.tagName !== 'BUTTON' && target.tagName !== 'INPUT') {
      e.preventDefault();
      toggle();
    } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && target.tagName !== 'INPUT') {
      e.preventDefault();
      seek((videoRef.current?.currentTime ?? 0) + (e.key === 'ArrowLeft' ? -5 : 5));
    }
  };

  return (
    <div className="media-film" onKeyDown={onKeyDown}>
      <video
        ref={videoRef}
        className="media-picture"
        poster={film.poster}
        playsInline
        preload="auto"
        muted={muted}
        onClick={toggle}
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
        onEnded={() => setPaused(true)}
        // Read the length from every event that can carry it: metadata can arrive before the handler is attached.
        onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          setTime(v.currentTime);
          if (Number.isFinite(v.duration) && v.duration !== duration) setDuration(v.duration);
        }}
        data-cursor={paused ? 'Play' : 'Pause'}
      >
        {film.sources.map((s) => (
          <source key={s.src} src={s.src} type={s.type} />
        ))}
        {film.captions && <track kind="captions" src={film.captions.src} srcLang={film.captions.lang} label={film.captions.label} default />}
      </video>
      <div className="media-controls">
        <button type="button" className="media-word" onClick={toggle} data-cursor={paused ? 'Play' : 'Pause'} data-autofocus>
          {paused ? 'Play' : 'Pause'}
        </button>
        <div className="media-progress">
          <svg ref={lineRef} className="media-line" viewBox={`0 -6 ${width} 12`} preserveAspectRatio="none" aria-hidden="true">
            <GeoLine d={`M0 0 H${width}`} role="survey" still className="media-line-track" />
            <GeoLine d={`M0 0 H${width}`} role="route" nib={3.5} className="media-line-drawn" />
          </svg>
          <input
            type="range"
            className="media-scrub"
            min={0}
            max={duration || 69}
            step={0.1}
            value={time}
            onChange={(e) => seek(Number(e.currentTarget.value))}
            aria-label="Position in the film"
            aria-valuetext={`${clock(time)} of ${clock(duration)}`}
            data-cursor="Drag"
          />
        </div>
        <span className="media-time tabular-nums" aria-hidden="true">
          {clock(time)} / {clock(duration)}
        </span>
        <button
          type="button"
          className="media-word"
          onClick={() => {
            const v = videoRef.current;
            if (v) v.muted = !muted;
            setMuted(!muted);
          }}
          aria-pressed={!muted}
        >
          {muted ? 'Sound off' : 'Sound on'}
        </button>
      </div>
    </div>
  );
}
