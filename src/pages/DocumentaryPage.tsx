import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link } from 'react-router-dom';
import { SPECIES } from '../data/species';
import { loadIndiaGeo } from '../geo/india';
import { DocumentaryStage } from '../components/documentary/DocumentaryStage';
import { CHAPTERS, CUES, DURATION } from '../components/documentary/timeline';

declare global {
  interface Window {
    __documentary?: {
      duration: number;
      cues: typeof CUES;
      ready: Promise<void>;
      seek: (t: number) => Promise<void>;
    };
  }
}

function fmt(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Documentary mode: the atlas as a five-minute presentation.
 *
 * It uses the site's own maps, photographs, type and data, cut to a fixed
 * running order (`components/documentary/timeline.ts`). It plays like a
 * film — space to pause, arrows to skip — and it can be captured frame by
 * frame: with `?capture=1` the controls are hidden, the clock stops, and
 * `window.__documentary.seek(t)` draws the frame at `t` and resolves once it
 * is on screen. `scripts/documentary/render.mjs` uses that to make a video.
 */
export function DocumentaryPage() {
  const params = new URLSearchParams(window.location.search);
  const capture = params.get('capture') === '1';
  const [t, setT] = useState(() => Math.min(DURATION, Math.max(0, Number(params.get('t')) || 0)));
  const [playing, setPlaying] = useState(!capture);
  const [scale, setScale] = useState(1);
  const [chrome, setChrome] = useState(true);
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  // Fit the 1920×1080 frame to the window.
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // Everything a frame might need, loaded up front so no frame waits on it.
  useEffect(() => {
    const images = SPECIES.map((s) => s.image.src)
      .filter((src): src is string => Boolean(src))
      .map(
        (src) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = img.onerror = () => resolve();
            img.src = src;
          }),
      );
    const ready = Promise.all([loadIndiaGeo(), document.fonts?.ready, ...images]).then(() => undefined);
    window.__documentary = {
      duration: DURATION,
      cues: CUES,
      ready,
      seek: (next: number) =>
        new Promise((resolve) => {
          flushSync(() => setT(next));
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }),
    };
    return () => {
      delete window.__documentary;
    };
  }, []);

  // The playback clock.
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let raf = requestAnimationFrame(function step(now) {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const next = tRef.current + dt;
      if (next >= DURATION) {
        setT(DURATION);
        setPlaying(false);
        return;
      }
      setT(next);
      raf = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const seekBy = useCallback((d: number) => setT((v) => Math.min(DURATION, Math.max(0, v + d))), []);

  useEffect(() => {
    if (capture) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === 'ArrowRight') seekBy(5);
      else if (e.key === 'ArrowLeft') seekBy(-5);
      else if (e.key === 'Home') setT(0);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [capture, seekBy]);

  // Controls fade out while the film plays and the pointer is still.
  useEffect(() => {
    if (capture) return;
    let timer = window.setTimeout(() => setChrome(false), 2500);
    const wake = () => {
      setChrome(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setChrome(false), 2500);
    };
    window.addEventListener('pointermove', wake);
    window.addEventListener('keydown', wake);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('keydown', wake);
    };
  }, [capture]);

  const showChrome = !capture && (chrome || !playing);

  return (
    <div className="fixed inset-0 overflow-hidden bg-black" style={{ cursor: showChrome ? 'auto' : 'none' }}>
      <h1 className="sr-only">India Species Atlas — documentary mode</h1>
      <div
        className="absolute left-1/2 top-1/2"
        style={{ width: 1920, height: 1080, transform: `translate(-50%, -50%) scale(${scale})` }}
        aria-hidden="true"
      >
        <DocumentaryStage t={t} />
      </div>

      {!capture && (
        <div className={`doc-controls ${showChrome ? 'is-shown' : ''}`}>
          <div className="flex items-center gap-5">
            <button type="button" className="doc-btn" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5l12 7-12 7z" /></svg>
              )}
            </button>
            <p className="w-24 text-[13px] tabular-nums text-canvas/70">
              {fmt(t)} / {fmt(DURATION)}
            </p>
            <div className="relative flex-1">
              <input
                type="range"
                min={0}
                max={DURATION}
                step={0.1}
                value={t}
                onChange={(e) => setT(Number(e.target.value))}
                className="doc-range w-full"
                aria-label="Position in the documentary"
              />
              <div className="pointer-events-none absolute inset-x-0 top-1/2" aria-hidden="true">
                {CHAPTERS.map((c) => (
                  <span key={c.id} className="doc-tick" style={{ left: `${(c.t / DURATION) * 100}%` }} />
                ))}
              </div>
            </div>
            <Link to="/" className="text-[13px] text-canvas/70 hover:text-canvas">
              Back to the atlas
            </Link>
          </div>
          <ol className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-canvas/50">
            {CHAPTERS.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => setT(c.t)} className="hover:text-canvas">
                  {c.label}
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
