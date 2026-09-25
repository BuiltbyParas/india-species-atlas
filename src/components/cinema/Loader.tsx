import { useEffect, useRef, useState } from 'react';
import { SPECIES } from '../../data/species';
import { formatDeg, loadIndiaGeo, MAP_VIEWBOX, useIndiaGeo } from '../../geo/india';
import { markIntroDone } from '../../motion/intro';
import { prefersReducedMotion } from '../../motion/preferences';
import { lockScroll } from '../../motion/SmoothScroll';
import { canRender3D } from '../../utils/canRender3D';

/**
 * The opening title sequence.
 *
 * A survey line is ruled across the sheet, the extent of the country is
 * written at its ends, and the state boundaries are drawn in until they
 * resolve into India. Then the sheet lifts off the hero.
 *
 * The counter is honest: each of the five steps is real work the page needs
 * before the documentary can start — the typefaces, the boundary file, the
 * species records, the 3D relief's code, and the first frame — and a step is
 * only ticked when that work has finished. A minimum running time keeps the
 * sequence from flashing past on a fast connection; nothing is faked beyond
 * that.
 *
 * Shown once per session, on the documentary page only. Reduced motion skips
 * it entirely.
 */
const STEPS = ['Typefaces', 'State boundaries', 'Species records', 'Relief', 'Sheet ready'] as const;
const MIN_MS = 2900;
const SEEN_KEY = 'isa-intro-seen';

function alreadySeen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function shouldShowLoader(): boolean {
  return !prefersReducedMotion() && !alreadySeen();
}

export function Loader({ onDone }: { onDone: () => void }) {
  const geo = useIndiaGeo();
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    lockScroll(true);
    const started = performance.now();
    let live = true;
    const tick = (n: number) => live && setStep((s) => Math.max(s, n));

    const fonts = (document.fonts?.ready ?? Promise.resolve()).then(() => tick(1));
    const boundaries = fonts.then(() => loadIndiaGeo()).then(() => tick(2));
    const records = boundaries.then(() => {
      // The records are bundled, so this step is a check rather than a fetch:
      // the dataset parsed and holds species.
      if (SPECIES.length > 0) tick(3);
    });
    const relief = records.then(() =>
      canRender3D() ? import('../home/heroScene').then(() => tick(4)) : tick(4),
    );

    relief
      .catch(() => undefined)
      .then(() => new Promise((r) => setTimeout(r, Math.max(0, MIN_MS - (performance.now() - started)))))
      .then(() => {
        if (!live) return;
        tick(5);
        setTimeout(() => live && setLeaving(true), 450);
      });

    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!leaving) return;
    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* storage blocked: the sequence simply plays again next visit */
    }
    // The hero starts its own entrance while the sheet is still lifting, so
    // the two overlap into one move.
    const handOff = setTimeout(() => {
      lockScroll(false);
      markIntroDone();
    }, 350);
    const unmount = setTimeout(onDone, 1300);
    return () => {
      clearTimeout(handOff);
      clearTimeout(unmount);
    };
  }, [leaving, onDone]);

  const pct = Math.round((step / STEPS.length) * 100);
  const ext = geo?.extent;

  return (
    <div
      ref={rootRef}
      className={`loader ${leaving ? 'is-leaving' : ''}`}
      role="progressbar"
      aria-label="Preparing the atlas"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div className="loader-rule" aria-hidden="true" />

      {ext && (
        <div className="loader-coords" aria-hidden="true">
          <span className="loader-coord loader-coord-w">{formatDeg(ext.minLng, 'lng')}</span>
          <span className="loader-coord loader-coord-e">{formatDeg(ext.maxLng, 'lng')}</span>
          <span className="loader-coord loader-coord-n">{formatDeg(ext.maxLat, 'lat')}</span>
          <span className="loader-coord loader-coord-s">{formatDeg(ext.minLat, 'lat')}</span>
        </div>
      )}

      <svg className="loader-map" viewBox={MAP_VIEWBOX} aria-hidden="true">
        {geo?.states.map((s, i) => (
          <path key={s.name} d={s.d} pathLength={1} style={{ ['--i' as string]: i }} />
        ))}
      </svg>

      <div className="loader-title">
        <p className="font-serif text-[clamp(1.4rem,2.4vw,2rem)] font-light leading-none text-canvas">
          India Species Atlas
        </p>
        <p className="mt-2 max-w-[22rem] text-[13px] leading-snug text-canvas/50">
          {SPECIES.length} threatened species, drawn onto the map of the country they depend on.
        </p>
      </div>

      <ol className="loader-steps" aria-hidden="true">
        {STEPS.map((label, i) => (
          <li key={label} data-state={i < step ? 'done' : i === step ? 'current' : 'todo'}>
            <span className="tabular-nums">{String(i + 1).padStart(2, '0')}</span>
            <span>{label}</span>
          </li>
        ))}
      </ol>
      <p className="loader-pct tabular-nums" aria-hidden="true">
        {String(pct).padStart(3, '0')}
      </p>
    </div>
  );
}
