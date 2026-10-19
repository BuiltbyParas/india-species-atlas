import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react';
import type { Species } from '../../types';
import { MAP_HEIGHT, MAP_WIDTH, project, useIndiaGeo } from '../../geo/india';
import { STATUS_HEX } from '../../theme';
import { cn } from '../../utils/cn';
import { levelColour, surveyContours, type Level } from '../home/surveyContours';

/**
 * The ground the dome stands on: the survey's sheet again (GroundsPlate), India's 500 m contours from ETOPO 2022,
 * with every indicative locality of the twelve set on it as a survey mark.
 *
 * The sheet is one element the chapter tilts (it never redraws for the scroll). Two things are drawn on it:
 * the contours, once, faint; and the species in front's own ground — the contours within a pool of roughly
 * 80 km around each of its localities, lit, with the line through them in the order the record lists them.
 * That layer is drawn only when the species changes, into whichever of two canvases is hidden, and the two
 * cross-fade, so a change of species is a change of light rather than a cut.
 *
 * With `pan`, the sheet also slides in its own plane to bring the lit species' ground — the middle of its
 * localities — under the dome, so turning the dome to a species carries the country under it to that ground.
 *
 * The pools are a radius around a named reserve or landscape, not a range: they say "the ground here", the
 * marks say where the record is. A locality that withholds its coordinates is marked like any other — the
 * coordinates are only ever withheld from print (geo/india `localityCoords`), and nothing here prints them.
 */
const POOL = 26;
/** The sheet is magnified where it lies back under the dome, so it is drawn finer than the screen. */
const DPR_MAX = 1.75;

interface Mark {
  key: string;
  si: number;
  x: number;
  y: number;
  captive: boolean;
}

function drawBase(ctx: CanvasRenderingContext2D, w: number, dpr: number, levels: Level[] | null, outline: Path2D | null) {
  const k = w / MAP_WIDTH;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
  const px = 1 / k;
  if (outline) {
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = '#e8e1cf';
    ctx.lineWidth = 0.9 * px;
    ctx.stroke(outline);
  }
  if (levels) {
    for (const level of levels) {
      const index = level.metres % 1000 === 0;
      ctx.globalAlpha = index ? 0.42 : 0.24;
      ctx.strokeStyle = levelColour(level.metres);
      ctx.lineWidth = (index ? 0.9 : 0.6) * px;
      ctx.stroke(level.path);
    }
  }
  ctx.globalAlpha = 1;
}

function drawLit(
  ctx: CanvasRenderingContext2D,
  mask: CanvasRenderingContext2D,
  w: number,
  dpr: number,
  levels: Level[] | null,
  points: Array<[number, number]>,
  hex: string,
) {
  const k = w / MAP_WIDTH;
  const px = 1 / k;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (!points.length) return;
  ctx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
  // The pools' ground: a wash of the category's colour, then the contours inside them at full strength.
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
  if (levels) {
    for (const level of levels) {
      const index = level.metres % 1000 === 0;
      ctx.globalAlpha = index ? 1 : 0.72;
      ctx.strokeStyle = levelColour(level.metres);
      ctx.lineWidth = (index ? 1.3 : 0.9) * px;
      ctx.stroke(level.path);
    }
  }
  // Keep only the pools: a soft disc around each locality, drawn into the mask at the mask's own (half) scale.
  const mk = mask.canvas.width / MAP_WIDTH;
  mask.setTransform(1, 0, 0, 1, 0, 0);
  mask.clearRect(0, 0, mask.canvas.width, mask.canvas.height);
  mask.setTransform(mk, 0, 0, mk, 0, 0);
  for (const [x, y] of points) {
    const g = mask.createRadialGradient(x, y, 0, x, y, POOL);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.75)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    mask.fillStyle = g;
    mask.beginPath();
    mask.arc(x, y, POOL, 0, Math.PI * 2);
    mask.fill();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(mask.canvas, 0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.globalCompositeOperation = 'source-over';
  // The line through its localities, in the record's order: the survey's dashed traverse.
  if (points.length > 1) {
    ctx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#e8e1cf';
    ctx.lineWidth = 0.8 * px;
    ctx.setLineDash([3 * px, 4 * px]);
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
}

export function SelectionGround({
  species,
  lit,
  pan = false,
  groundRef,
}: {
  species: Species[];
  /** The species whose ground is lit (index into `species`), or none. */
  lit: number | null;
  /** Slide the sheet to bring the lit species' ground to its middle. */
  pan?: boolean;
  groundRef: RefObject<HTMLDivElement | null>;
}) {
  const geo = useIndiaGeo();
  const baseRef = useRef<HTMLCanvasElement>(null);
  const litRefs = [useRef<HTMLCanvasElement>(null), useRef<HTMLCanvasElement>(null)];
  const maskRef = useRef<HTMLCanvasElement | null>(null);
  const [levels, setLevels] = useState<Level[] | null>(null);
  const [size, setSize] = useState({ w: 0, dpr: 1 });
  const [front, setFront] = useState(0);
  const drawn = useRef<{ key: string; layer: number }>({ key: '', layer: 0 });

  const marks = useMemo<Mark[]>(
    () =>
      species.flatMap((s, si) =>
        s.distributionPoints.map((p) => {
          const [x, y] = project(p.lng, p.lat);
          return { key: `${s.id}:${p.label}`, si, x, y, captive: Boolean(p.captive) };
        }),
      ),
    [species],
  );

  // The contours are the survey's, traced once for the page; the sheet is outline and marks until they are in.
  useEffect(() => {
    let live = true;
    surveyContours()
      .then((l) => live && setLevels(l))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const ground = groundRef.current;
    if (!ground) return;
    const ro = new ResizeObserver(() => {
      // Layout size, not the tilted box: the sheet is drawn flat and tilted on the compositor.
      const w = ground.offsetWidth;
      setSize((s) => (s.w === w ? s : { w, dpr: Math.min(window.devicePixelRatio || 1, DPR_MAX) }));
    });
    ro.observe(ground);
    return () => ro.disconnect();
  }, [groundRef]);

  // The middle of the lit species' localities, as the offset that brings it to the sheet's middle.
  const shift = useMemo(() => {
    if (!pan || lit === null) return null;
    const pts = species[lit].distributionPoints.map((p) => project(p.lng, p.lat));
    const cx = pts.reduce((n, q) => n + q[0], 0) / pts.length;
    const cy = pts.reduce((n, q) => n + q[1], 0) / pts.length;
    return `translate3d(${((0.5 - cx / MAP_WIDTH) * 100).toFixed(2)}%, ${((0.5 - cy / MAP_HEIGHT) * 100).toFixed(2)}%, 0)`;
  }, [pan, lit, species]);

  const outline = useMemo(() => (geo ? new Path2D(geo.all) : null), [geo]);

  // The faint sheet: once per size, and again when the contours arrive.
  useEffect(() => {
    const canvas = baseRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !size.w) return;
    const h = (size.w * MAP_HEIGHT) / MAP_WIDTH;
    canvas.width = Math.round(size.w * size.dpr);
    canvas.height = Math.round(h * size.dpr);
    drawBase(ctx, size.w, size.dpr, levels, outline);
    for (const r of litRefs) {
      if (!r.current) continue;
      r.current.width = canvas.width;
      r.current.height = canvas.height;
    }
    drawn.current.key = '';
    // litRefs are stable refs; the redraw below follows `size` and `levels`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, levels, outline]);

  // The lit ground: drawn into the hidden canvas, then brought forward.
  useEffect(() => {
    if (!size.w) return;
    const key = `${lit ?? '-'}|${size.w}|${levels ? levels.length : 0}`;
    if (drawn.current.key === key) return;
    const next = drawn.current.key ? 1 - drawn.current.layer : drawn.current.layer;
    const canvas = litRefs[next].current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    if (!maskRef.current) maskRef.current = document.createElement('canvas');
    const mask = maskRef.current;
    mask.width = Math.max(1, Math.round(canvas.width / 2));
    mask.height = Math.max(1, Math.round(canvas.height / 2));
    const mctx = mask.getContext('2d');
    if (!mctx) return;
    const s = lit === null ? null : species[lit];
    const points: Array<[number, number]> = s ? s.distributionPoints.map((p) => project(p.lng, p.lat)) : [];
    drawLit(ctx, mctx, size.w, size.dpr, levels, points, s ? STATUS_HEX[s.status] : '#000');
    drawn.current = { key, layer: next };
    setFront(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lit, size, levels, species]);

  return (
    <div ref={groundRef} className={cn('sel-ground', lit !== null && 'is-lit')} aria-hidden="true">
      <div className="sel-pan" style={shift ? { transform: shift } : undefined}>
      <canvas ref={baseRef} className="sel-ground-canvas" />
      {litRefs.map((r, i) => (
        <canvas key={i} ref={r} className={cn('sel-ground-canvas sel-ground-lit', i === front && 'is-front')} />
      ))}
      <div className="sel-marks">
        {marks.map((m) => (
          <span
            key={m.key}
            className={cn('sel-mark', m.si === lit && 'is-lit', m.captive && 'is-captive')}
            style={
              {
                left: `${((m.x / MAP_WIDTH) * 100).toFixed(3)}%`,
                top: `${((m.y / MAP_HEIGHT) * 100).toFixed(3)}%`,
                ['--c' as string]: STATUS_HEX[species[m.si].status],
                ['--i' as string]: m.si,
              } as CSSProperties
            }
          />
        ))}
      </div>
      </div>
    </div>
  );
}
