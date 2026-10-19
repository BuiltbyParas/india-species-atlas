import { useEffect, useRef, useState } from 'react';
import { FIELD_STUDIES } from '../../content/fieldStudies';
import { localityCoords, MAP_HEIGHT, MAP_WIDTH, project, useIndiaGeo } from '../../geo/india';
import { onScroll } from '../../interaction/scroll';
import { useReducedMotion, useWideLayout } from '../../motion/preferences';
import { STATUS_HEX } from '../../theme';
import { loadRelief, metresAt } from '../home/heroRelief';
import { CONTOUR_STEP, levelColour, surveyContours, type Level } from '../home/surveyContours';
import { habitatBand } from '../field/studyFacts';

/**
 * Five kinds of ground: the hinge between the descent and the field studies.
 *
 * The relief the page opened on comes back as what a surveyor reads it as — its contours, every 500 m, traced from
 * the same ETOPO 2022 grid — and they draw in from the lowlands up, so the country rises line by line under the
 * chapter's statement. Then the five field studies are set on it, one survey mark at a time, each at its species'
 * anchor locality with the kind of ground it stands for; a line joins them in the order the studies run. Last, the
 * camera crosses the sheet back to the first mark and goes down into it, the Thar warming as it arrives, and the
 * first study's world opens beneath (FieldStudiesIndex).
 *
 * Everything drawn is from the record or the elevation model: the marks are the anchor localities (a record that
 * withholds its coordinates is marked but not given them), the heights are the grid's cell means. The sheet is a
 * canvas, drawn only when the scroll moves it; with reduced motion it is one still plate with all five marks.
 */

const STUDIES = FIELD_STUDIES.map((f) => {
  const at = f.species.distributionPoints[0];
  const [x, y] = project(at.lng, at.lat);
  return { f, at, x, y, band: habitatBand(f.species) };
});

/** The plate's scroll, as fractions: the contours draw in, the marks arrive one by one, the camera dives into the first. */
const DRAW_TO = 0.3;
const MARK_FROM = 0.2;
const MARK_GAP = 0.095;
const DIVE_FROM = 0.7;
/** The dive is down by here: the rest of the run is the dissolve into the first world (DISSOLVE), the camera still sinking. */
const DIVE_TO = 0.88;
/** How far the dive goes in: enough to be among the Thar's lines, not so far that a mark reads as a precise place. */
const DIVE_ZOOM = 4.2;
/**
 * The plate's last stretch, in screens: the first study's world is already whole beneath it (the index overlaps the
 * plate's last screen and holds its stage at the top, FieldStudiesIndex), and the sheet dissolves into it.
 */
const DISSOLVE = 0.45;
/** Where the still plate (reduced motion) is drawn: every mark set, no dive. */
const STILL_AT = 0.68;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
const markAt = (i: number) => MARK_FROM + i * MARK_GAP;
const diveAt = (p: number) => clamp01((p - DIVE_FROM) / (DIVE_TO - DIVE_FROM));

interface Camera {
  scale: number;
  ox: number;
  oy: number;
}

/** Where the sheet sits for a point of the plate's scroll: framed beside the text, then across to the first mark and down. */
function cameraAt(p: number, w: number, h: number, wide: boolean): Camera {
  const fit = wide ? Math.min((w * 0.54) / MAP_WIDTH, (h * 0.86) / MAP_HEIGHT) : Math.min((w * 0.92) / MAP_WIDTH, (h * 0.5) / MAP_HEIGHT);
  const homeX = wide ? w * 0.66 : w * 0.5;
  const homeY = wide ? h * 0.52 : h * 0.66;
  const d = diveAt(p);
  // Across first, then down: a pan that settles into a dive, as a camera crane would.
  const pan = smooth(d / 0.55);
  const fall = smooth((d - 0.2) / 0.8);
  // The plate settles a little as it arrives, so the first contours are drawn on a sheet already moving.
  const settle = 1 + (1 - smooth(p / DRAW_TO)) * 0.06;
  // Past the dive the camera keeps sinking, slowly, while the sheet dissolves into the world beneath it.
  const sink = 1 + 0.35 * smooth((p - DIVE_TO) / (1 - DIVE_TO));
  const scale = fit * settle * (1 + fall * fall * (DIVE_ZOOM - 1)) * sink;
  const first = STUDIES[0];
  const mx = MAP_WIDTH / 2 + (first.x - MAP_WIDTH / 2) * pan;
  const my = MAP_HEIGHT / 2 + (first.y - MAP_HEIGHT / 2) * pan;
  const sx = homeX + ((wide ? w * 0.56 : w * 0.5) - homeX) * pan;
  const sy = homeY + ((wide ? h * 0.5 : h * 0.62) - homeY) * pan;
  return { scale, ox: sx - mx * scale, oy: sy - my * scale };
}

function drawSheet(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  dpr: number,
  p: number,
  wide: boolean,
  levels: Level[] | null,
  outline: Path2D | null,
): Camera {
  const cam = cameraAt(p, w, h, wide);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.setTransform(dpr * cam.scale, 0, 0, dpr * cam.scale, dpr * cam.ox, dpr * cam.oy);
  const px = 1 / cam.scale;
  const dive = diveAt(p);
  if (outline) {
    ctx.globalAlpha = 0.5 * smooth(p / 0.05);
    ctx.strokeStyle = '#e8e1cf';
    ctx.lineWidth = 0.9 * px;
    ctx.stroke(outline);
  }
  if (levels) {
    const n = levels.length;
    // The lowlands first, the summits last: each level comes up over about three levels' worth of the draw.
    const drawn = (p / DRAW_TO) * (n + 3);
    for (let i = 0; i < n; i++) {
      const a = clamp01((drawn - i) / 3);
      if (a <= 0) break;
      const index = levels[i].metres % 1000 === 0;
      ctx.globalAlpha = a * (index ? 0.85 : 0.5);
      ctx.strokeStyle = levelColour(levels[i].metres);
      ctx.lineWidth = (index ? 1 : 0.6) * px * (1 + dive * 0.4);
      ctx.stroke(levels[i].path);
    }
  }
  // The line through the five, in the order the studies run, drawn as each mark arrives.
  ctx.globalAlpha = 0.55 * (1 - smooth(dive / 0.5));
  ctx.strokeStyle = '#e8e1cf';
  ctx.lineWidth = 0.9 * px;
  ctx.setLineDash([4 * px, 5 * px]);
  ctx.beginPath();
  for (let i = 1; i < STUDIES.length; i++) {
    const t = clamp01((p - markAt(i) + 0.02) / 0.06);
    if (t <= 0) break;
    const a = STUDIES[i - 1];
    const b = STUDIES[i];
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  return cam;
}

/** Which study the text column speaks for: the last mark set (−1 before the first), the first again for the dive. */
function currentAt(p: number): number {
  if (p >= DIVE_FROM) return 0;
  let cur = -1;
  for (let i = 0; i < STUDIES.length; i++) if (p >= markAt(i)) cur = i;
  return cur;
}

export function GroundsPlate() {
  const reduced = useReducedMotion();
  const wide = useWideLayout();
  const geo = useIndiaGeo();
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const marksRef = useRef<Array<HTMLDivElement | null>>([]);
  const warmRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [levels, setLevels] = useState<Level[] | null>(null);
  const [heights, setHeights] = useState<number[] | null>(null);
  const [current, setCurrent] = useState(reduced ? STUDIES.length - 1 : -1);
  const [diving, setDiving] = useState(false);

  // The contours are traced once the plate is a screen or so away: a few tens of milliseconds, never on load.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || near) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '120% 0px' });
    io.observe(section);
    // A landing straight on the field studies (/#field-studies) can jump past the observer's first look; the plate's
    // last screen lies over them, so it must still wake and dissolve.
    const check = () => {
      const r = section.getBoundingClientRect();
      const m = window.innerHeight * 1.2;
      if (r.bottom > -m && r.top < window.innerHeight + m) setNear(true);
    };
    const off = onScroll(check);
    return () => {
      io.disconnect();
      off();
    };
  }, [near]);

  useEffect(() => {
    if (!near) return;
    let live = true;
    loadRelief()
      .then(async (grid) => {
        const traced = await surveyContours();
        if (!live) return;
        setLevels(traced);
        setHeights(STUDIES.map((s) => metresAt(grid, s.at.lng, s.at.lat)));
      })
      // Without the grid the sheet is the outline and the marks: still the five places, just not their ground.
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [near]);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!near || !section || !stage || !canvas || !ctx) return;
    const outline = geo ? new Path2D(geo.all) : null;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let top = 0;
    let runway = 1;
    let lead = 0;
    let raf = 0;
    let lastP = -1;
    let lastCur = Number.NaN;
    let lastDive: boolean | null = null;

    const frame = () => {
      raf = 0;
      // The plate's scroll starts while it is still coming up the screen, so the country is already drawing as it arrives.
      const p = reduced ? STILL_AT : clamp01((window.scrollY - top + lead) / (runway + lead));
      if (p === lastP) return;
      lastP = p;
      // Arriving in the Thar: the sheet lets go of the screen over its last stretch, its words a little ahead of its lines.
      const out = reduced ? 0 : smooth(1 - (top + runway - window.scrollY) / (window.innerHeight * DISSOLVE));
      stage.style.opacity = out > 0 ? (1 - out).toFixed(3) : '';
      stage.style.visibility = out >= 1 ? 'hidden' : '';
      if (textRef.current) textRef.current.style.opacity = out > 0 ? (1 - smooth(out * 2.4)).toFixed(3) : '';
      if (out >= 1) return;
      const cam = drawSheet(ctx, w, h, dpr, p, wide, levels, outline);
      const dive = diveAt(p);
      for (let i = 0; i < STUDIES.length; i++) {
        const node = marksRef.current[i];
        if (!node) continue;
        const s = STUDIES[i];
        const shown = smooth((p - markAt(i)) / 0.05) * (i === 0 ? 1 : 1 - smooth(dive / 0.35));
        node.style.opacity = shown.toFixed(3);
        node.style.visibility = shown > 0.01 ? 'visible' : 'hidden';
        // Its label comes into focus as it settles; written on the mark alone, which nothing else reads.
        node.style.setProperty('--s', shown.toFixed(2));
        node.style.transform = `translate3d(${(cam.ox + s.x * cam.scale).toFixed(1)}px, ${(cam.oy + s.y * cam.scale).toFixed(1)}px, 0)`;
      }
      // The Thar's warmth comes up around the first mark as the camera reaches it: the first study's light, arriving.
      const warm = warmRef.current;
      if (warm) {
        const t = smooth((dive - 0.45) / 0.55);
        warm.style.opacity = t.toFixed(3);
        warm.style.transform = `translate3d(${(cam.ox + STUDIES[0].x * cam.scale).toFixed(1)}px, ${(cam.oy + STUDIES[0].y * cam.scale).toFixed(1)}px, 0) scale(${(0.4 + t * 1.6).toFixed(3)})`;
      }
      const cur = reduced ? STUDIES.length - 1 : currentAt(p);
      if (cur !== lastCur) setCurrent((lastCur = cur));
      const isDiving = !reduced && p >= DIVE_FROM;
      if (isDiving !== lastDive) setDiving((lastDive = isDiving));
    };
    const request = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const measure = () => {
      const rect = stage.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const srect = section.getBoundingClientRect();
      top = srect.top + window.scrollY;
      runway = Math.max(1, srect.height - window.innerHeight);
      lead = window.innerHeight * 0.6;
      lastP = -1;
      request();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    ro.observe(section);
    // And when the page above it settles (a landing on /#field-studies measures early): the plate's last screen lies over
    // the field studies, so a stale top would leave the sheet standing over the first world.
    ro.observe(document.body);
    const off = onScroll(request);
    return () => {
      off();
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [near, levels, geo, wide, reduced]);

  const pinned = !reduced;
  const s = current >= 0 ? STUDIES[current] : null;
  const height = s && heights ? Math.round(heights[current] / 10) * 10 : null;

  return (
    <section
      ref={sectionRef}
      data-env="atlas"
      data-geo-quiet
      aria-labelledby="grounds-title"
      className={`grounds ${pinned ? 'is-pinned' : 'is-still'}`}
    >
      <div ref={stageRef} className="grounds-stage">
        <canvas ref={canvasRef} className="grounds-canvas" aria-hidden="true" />
        <div ref={warmRef} className="grounds-warm" aria-hidden="true" />
        <div className="grounds-marks" aria-hidden="true">
          {STUDIES.map((st, i) => (
            <div
              key={st.f.id}
              ref={(node) => {
                marksRef.current[i] = node;
              }}
              className={`grounds-mark ${i === current ? 'is-current' : ''}`}
              style={{ visibility: 'hidden', ['--c' as string]: STATUS_HEX[st.f.species.status] }}
            >
              <span className="grounds-ring" />
              <span className="grounds-mark-label">
                <span className="grounds-mark-n tabular-nums">{st.f.n}</span>
                <span className="grounds-mark-h">{st.f.habitat}</span>
              </span>
            </div>
          ))}
        </div>

        <div ref={textRef} className="grounds-text">
          <p className="grounds-eyebrow">
            <span className="tabular-nums">{s ? `${s.f.n} / ${String(STUDIES.length).padStart(2, '0')}` : '00'}</span>
            <span className="grounds-rule" aria-hidden="true" />
            Five kinds of ground
          </p>
          <h3 id="grounds-title" className="sr-only">
            Five kinds of ground: where the five field studies stand
          </h3>
          {/* The habitat word, set at display size and cut in fresh each time the ground changes. */}
          <p key={s ? s.f.id + (diving ? '-in' : '') : 'intro'} className="grounds-word font-serif font-light" aria-hidden="true">
            <span className="grounds-word-in">{s ? (diving ? `Into the ${s.f.habitat.toLowerCase()}` : s.f.habitat) : 'Read the ground'}</span>
          </p>
          <div key={`d-${current}-${diving}`} className="grounds-detail" aria-hidden="true">
            {s ? (
              <>
                <p className="grounds-species">
                  {s.f.species.commonName} <em>{s.f.species.scientificName}</em>
                </p>
                <p className="grounds-place">{s.f.place}</p>
                <dl className="grounds-read tabular-nums">
                  <div>
                    <dt>Anchor</dt>
                    <dd>{s.at.withholdCoordinates ? 'Coordinates withheld' : localityCoords(s.at)}</dd>
                  </div>
                  {height !== null && (
                    <div>
                      <dt>Ground there</dt>
                      <dd>≈ {height.toLocaleString('en-GB')} m</dd>
                    </div>
                  )}
                  {s.band && (
                    <div>
                      <dt>Recorded band</dt>
                      <dd>{s.band}</dd>
                    </div>
                  )}
                </dl>
              </>
            ) : (
              <p className="grounds-lede">
                The relief again, as a surveyor reads it: a line every {CONTOUR_STEP} m, from the lowlands up. The five
                field studies stand on five kinds of it.
              </p>
            )}
          </div>
          <ol className="grounds-index" aria-hidden="true">
            {STUDIES.map((st, i) => (
              <li key={st.f.id} className={i === current ? 'is-current' : i < current ? 'is-past' : ''}>
                <span className="tabular-nums">{st.f.n}</span> {st.f.habitat}
              </li>
            ))}
          </ol>
          <p className="grounds-source">Contours every {CONTOUR_STEP} m · ETOPO 2022 (NOAA) · marks at indicative anchor localities</p>
        </div>
      </div>
      <ul className="sr-only">
        {STUDIES.map((st) => (
          <li key={st.f.id}>
            {`${st.f.habitat}: ${st.f.species.commonName} (${st.f.species.scientificName}), ${st.f.place}, at ${st.at.label}${
              st.at.withholdCoordinates ? ' (coordinates withheld)' : ''
            }.`}
          </li>
        ))}
      </ul>
    </section>
  );
}
