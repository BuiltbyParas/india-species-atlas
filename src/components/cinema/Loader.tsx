import { useEffect, useMemo, useRef, useState } from 'react';
import { SPECIES } from '../../data/species';
import { FEATURED } from '../../content/featured';
import { formatDeg, loadIndiaGeo, MAP_VIEWBOX, project, SHEET_CENTRE, smoothPath, useIndiaGeo } from '../../geo/india';
import { markIntroDone, whenFirstFrame } from '../../motion/intro';
import { prefersReducedMotion } from '../../motion/preferences';
import { lockScroll } from '../../motion/SmoothScroll';
import { canRender3D } from '../../utils/canRender3D';
import { GeoLine } from '../../geo/line/GeoLine';

/**
 * The opening title sequence — about five seconds, once per session.
 *
 *   0.2 s  a survey mark at the middle of the sheet, with its coordinates
 *   0.4 s  the survey line is ruled through it, edge to edge
 *   0.9 s  the country's extent is written at the line's ends
 *   1.0 s  the state boundaries draw in until they resolve into India
 *   3.0 s  the route line is drawn by its nib through the five species the
 *          documentary follows, west to east — the journey the page is about
 *          to take, at the same anchor localities the scenes ring
 *   ~5 s   the sheet lifts off the hero, which is already in place beneath
 *
 * Every mark is the atlas's own: the sheet's centre is computed from the map
 * projection and labelled as the sheet's, not as India's centre; the extents
 * come from the boundary file; the stops are the dataset's anchor
 * localities. A click or a key press skips whatever minimum time remains.
 *
 * The counter is honest: each of the five steps is real work the page needs
 * before the documentary can start — the typefaces, the boundary file, the
 * species records, the hero's map (the 3D relief's code, or the flat map
 * where there is no 3D), and the hero's first painted frame — and a step is
 * only ticked when that work has finished. A minimum running time keeps the
 * sequence from flashing past on a fast connection, and a ceiling keeps a
 * slow GPU from holding the visitor on the sheet; nothing is faked beyond
 * that.
 *
 * Shown once per session, when a visit starts on the home page. Reduced
 * motion skips it entirely.
 */
const MIN_MS = 5200;
/** The longest the sequence will wait for the hero's first frame. */
const FRAME_CEILING_MS = 6000;
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
  const [steps] = useState(() => [
    'Typefaces',
    'State boundaries',
    'Species records',
    canRender3D() ? 'Relief model' : 'Flat map',
    'First frame',
  ]);
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<() => void>(() => undefined);

  // The route: one continuous, gently smoothed stroke through the featured
  // anchors, so a single nib can draw it. Each stop lights when the nib
  // reaches it (its share of the polyline's length).
  const route = useMemo(() => {
    const pts = FEATURED.map((s) => project(s.distributionPoints[0].lng, s.distributionPoints[0].lat));
    let total = 0;
    const at = [0];
    for (let i = 1; i < pts.length; i++) {
      total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      at.push(total);
    }
    return { d: smoothPath(pts, 0.5), pts, at: at.map((v) => v / (total || 1)) };
  }, []);

  useEffect(() => {
    lockScroll(true);
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

    // The minimum running time, which a click or key press cuts short.
    const minimum = new Promise<void>((resolve) => {
      const t = setTimeout(resolve, MIN_MS);
      skipRef.current = () => {
        clearTimeout(t);
        resolve();
      };
    });

    relief
      .catch(() => undefined)
      .then(() => Promise.race([whenFirstFrame(), new Promise((r) => setTimeout(r, FRAME_CEILING_MS))]))
      .then(() => minimum)
      .then(() => {
        if (!live) return;
        tick(5);
        setTimeout(() => live && setLeaving(true), 450);
      });

    const skip = () => skipRef.current();
    window.addEventListener('pointerdown', skip);
    window.addEventListener('keydown', skip);
    return () => {
      live = false;
      window.removeEventListener('pointerdown', skip);
      window.removeEventListener('keydown', skip);
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

  const pct = Math.round((step / steps.length) * 100);
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
      {/* A survey mark at the middle of the sheet, where the first line will cross. */}
      <div className="loader-centre" aria-hidden="true">
        <span className="loader-cross" />
        <span className="loader-centre-label tabular-nums">
          {formatDeg(SHEET_CENTRE.lat, 'lat')} {formatDeg(SHEET_CENTRE.lng, 'lng')}
          <span className="block text-canvas/40">middle of the sheet</span>
        </span>
      </div>

      {/* The survey line: the first line the atlas draws, ruled edge to edge. */}
      <svg className="loader-rule" viewBox="0 0 100 2" preserveAspectRatio="none" aria-hidden="true">
        <GeoLine d="M0 1H100" role="survey" className="loader-rule-line" />
      </svg>

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
          <GeoLine key={s.name} d={s.d} role="survey" className="loader-state" style={{ ['--i' as string]: i }} />
        ))}
        <GeoLine d={route.d} role="route" nib={9} className="loader-route" />
        {route.pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="8" className="loader-stop" style={{ ['--at' as string]: route.at[i] }} />
        ))}
      </svg>

      <div className="loader-title">
        <p className="font-serif text-[clamp(1.6rem,2.6vw,2.4rem)] font-light leading-none tracking-tight text-canvas">
          India Species Atlas
        </p>
        <p className="mt-3 max-w-[22rem] text-small text-canvas/50">
          {SPECIES.length} threatened species, drawn onto the map of the country they depend on.
        </p>
      </div>

      <ol className="loader-steps" aria-hidden="true">
        {steps.map((label, i) => (
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
