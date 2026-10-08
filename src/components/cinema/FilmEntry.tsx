import { useRef } from 'react';
import { FILM, FILM_RUNTIME } from '../../content/film';
import { GeoLine } from '../../geo/line/GeoLine';
import { openMedia, prefetchMediaStage } from '../../interaction/media';

/**
 * The way into the film: a print of its opening frame, not a player.
 *
 * At rest it is a still with a title and a running time. Under the hand it
 * turns a little to the light (hover depth), the frame's crop marks close in
 * and the route line beneath it runs out from the left — the same line that
 * becomes the film's progress once it plays. Pressed, the print itself lifts out of its
 * rectangle and becomes the cinema (`MediaStage`); closed, it settles back
 * here. Keyboard and touch open it the same way; it is one button.
 */
export function FilmEntry({ className }: { className?: string }) {
  const frameRef = useRef<HTMLSpanElement>(null);
  return (
    <button
      type="button"
      className={['film-entry', className].filter(Boolean).join(' ')}
      onClick={(e) => openMedia(FILM, frameRef.current, e.currentTarget)}
      onPointerEnter={prefetchMediaStage}
      onFocus={prefetchMediaStage}
      aria-label={`Play the film, ${FILM.title}, ${FILM_RUNTIME}`}
      data-cursor="Play"
    >
      <span ref={frameRef} className="film-entry-frame" data-depth>
        <img src={FILM.poster} alt="" width={1280} height={720} loading="lazy" decoding="async" className="film-entry-poster" />
        <span className="film-entry-marks" aria-hidden="true" />
      </span>
      <span className="film-entry-meta" aria-hidden="true">
        <span className="film-entry-eyebrow">The film</span>
        <span className="film-entry-title">{FILM.title}</span>
        <span className="film-entry-runtime tabular-nums">{FILM_RUNTIME}</span>
      </span>
      <svg className="film-entry-line" viewBox="0 -4 400 8" preserveAspectRatio="none" aria-hidden="true">
        <GeoLine d="M0 0 H400" role="route" still />
      </svg>
    </button>
  );
}
