import { useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type Ref } from 'react';
import { STATUS_INFO } from '../data/statusInfo';
import { formatDeg, KM_PER_UNIT, loadIndiaGeo, project, unproject, type IndiaGeo } from '../geo/india';
import { bowedLeg } from '../geo/line/paths';
import { schedule } from '../interaction/loop';
import { cubicBezier } from '../motion/gsap';
import { describeRoute } from '../interaction/routeCaption';
import { GEOJSON_STATE_ALIASES } from '../utils/stateCounts';
import { photoSources } from '../utils/photo';
import { camPath, type GeoCam } from './geoCamera';
import { atlasLanding, type Journey } from './journeys';
import { setWorld } from './worldState';
import './world.css';

/**
 * The journey between two views of the world.
 *
 * One overlay, one sheet, one camera. It opens exactly where the reader was
 * looking — over the atlas map's panel, over the species page's photograph,
 * over the hero's last frame — and moves the camera to where the next page
 * looks, so the page change is read as travel rather than as a cut:
 *
 *   MARKER → COORDINATE    the chosen locality is ringed; the readout gives
 *                          the camera's centre, live, and a scale bar
 *   COORDINATE → CAMERA    van Wijk–Nuij zoom/pan: far places rise and fall,
 *                          near ones glide; the duration is the distance
 *   CAMERA → TERRAIN       the states of record gain depth — a uniform lift,
 *                          not elevation, which the atlas has no data for —
 *                          and survey rings rise at the anchor
 *   TERRAIN → LINE         a ruled line is drawn through the anchor
 *   LINE → PHOTOGRAPH      the line opens like a shutter onto the species'
 *                          photograph
 *   PHOTOGRAPH → SPECIES   the photograph moves into its place on the species
 *                          page, which has been laid out underneath
 *
 * and in reverse to the atlas (PHOTOGRAPH → LINE → POINT → CAMERA → MAP),
 * landing inside the map's own frame.
 *
 * Rendering: the sheet under the moving camera is a 2D canvas — the country
 * and the states of record are `Path2D`s in map units, and a frame is one
 * transform and a few strokes. (An SVG whose viewBox changes every frame is
 * re-rasterised whole, which cost 30–50 ms a frame at full screen.) The
 * lifted layers are drawn once, into canvases the size of the states of
 * record, and from then on only their 3D transforms change, which the
 * compositor does alone. The 3D scenes are paused while a journey plays
 * (`sceneRegistry.ts`).
 *
 * Nothing here runs when the reader prefers reduced motion (the page turn
 * fades instead), and a click or key press during a journey hurries it to its
 * end.
 */
export interface JourneyHandle {
  play: (journey: Journey, go: () => void, ready: () => Promise<void>) => Promise<void>;
}

const cinema = cubicBezier(0.7, 0, 0.2, 1);
const outExpo = cubicBezier(0.16, 1, 0.3, 1);
const emphasis = cubicBezier(0.2, 0.75, 0.25, 1);
const linear = (t: number) => t;

/** Lifted copies of the states of record. Fewer on small screens. */
const layerCount = () => (window.innerWidth < 700 ? 4 : 6);
/** Pixel density for the moving sheet: sharp, but never more than twice the CSS pixels. */
const density = () => Math.min(window.devicePixelRatio || 1, 2);

let speed = 1;

function tween(ms: number, step: (e: number) => void, ease: (t: number) => number = cinema): Promise<void> {
  return new Promise((resolve) => {
    let t = 0;
    schedule((dt) => {
      t += dt * 1000 * speed;
      const p = Math.min(1, t / ms);
      step(ease(p));
      if (p >= 1) {
        resolve();
        return false;
      }
      return true;
    });
  });
}

const after = (ms: number) => tween(ms, () => undefined, linear);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** A camera that shows `cam` inside `box` while filling the whole screen. */
function fullscreenOf(cam: GeoCam, box: DOMRect): GeoCam {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const k = box.width / cam.w;
  return {
    x: cam.x - (box.left + box.width / 2 - W / 2) / k,
    y: cam.y - (box.top + box.height / 2 - H / 2) / k,
    w: W / k,
  };
}

function insetOf(box: DOMRect | null, t: number): string {
  if (!box) return 'inset(0px)';
  const W = window.innerWidth;
  const H = window.innerHeight;
  const f = 1 - t;
  return `inset(${(box.top * f).toFixed(1)}px ${((W - box.right) * f).toFixed(1)}px ${((H - box.bottom) * f).toFixed(1)}px ${(box.left * f).toFixed(1)}px)`;
}

/** A 1–2–5 scale bar about 90 px long. */
function scaleBar(cam: GeoCam): { px: number; label: string } {
  const kmPerPx = (cam.w * KM_PER_UNIT) / window.innerWidth;
  const target = kmPerPx * 90;
  const p = 10 ** Math.floor(Math.log10(target));
  const n = [1, 2, 5, 10].find((m) => m * p >= target * 0.7) ?? 10;
  const km = n * p;
  return { px: km / kmPerPx, label: km >= 1 ? `${Math.round(km).toLocaleString('en-GB')} km` : `${Math.round(km * 1000)} m` };
}

/** Sample a path, so a partial line can be drawn at any scale. */
function sample(d: string, n = 64): Array<[number, number]> {
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', d);
  const len = p.getTotalLength();
  return Array.from({ length: n + 1 }, (_, i) => {
    const q = p.getPointAtLength((len * i) / n);
    return [q.x, q.y];
  });
}

/** `#rrggbb` (or any CSS colour the page resolves) at an alpha. */
function alpha(color: string, a: number): string {
  const c = color.trim();
  if (/^#[0-9a-f]{6}$/i.test(c)) {
    const n = parseInt(c.slice(1), 16);
    return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a)).toFixed(3)})`;
  }
  return c;
}

interface Ink {
  canvas: string;
  contour: string;
  river: string;
  ground: string;
  status: string;
}

interface Sheet {
  country: Path2D;
  record: Path2D | null;
  /** The states of record's extent, in map units. */
  recordBox: [number, number, number, number] | null;
  legPts: Array<[number, number]> | null;
  origin: [number, number] | null;
  ink: Ink;
}

export function WorldJourney({ ref }: { ref?: Ref<JourneyHandle> }) {
  const [j, setJ] = useState<Journey | null>(null);
  const [geo, setGeo] = useState<IndiaGeo | null>(null);
  const [layers, setLayers] = useState(6);
  const [lifted, setLifted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const layerRefs = useRef<HTMLCanvasElement[]>([]);
  const ringsRef = useRef<HTMLDivElement>(null);
  const readRef = useRef<HTMLParagraphElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const barLabelRef = useRef<HTMLSpanElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const mounted = useRef<(() => void) | null>(null);
  const camRef = useRef<GeoCam>({ x: 0, y: 0, w: 1 });
  const sheetRef = useRef<Sheet | null>(null);

  useEffect(() => {
    // The boundary file is shared with every map; by the time anyone can
    // click a journey it has almost always been fetched already.
    loadIndiaGeo().then(setGeo).catch(() => undefined);
  }, []);

  // The skeleton is rendered by React once per journey; the frames are not.
  useEffect(() => {
    if (j && mounted.current) {
      mounted.current();
      mounted.current = null;
    }
  }, [j]);

  useImperativeHandle(ref, () => ({
    async play(journey, go, ready) {
      const root = rootRef.current;
      if (!root) {
        go();
        return;
      }
      speed = 1;
      let gone = false;
      const navigate = () => {
        if (!gone) {
          gone = true;
          go();
        }
      };
      const hurry = () => {
        speed = 4;
      };
      window.addEventListener('pointerdown', hurry, { capture: true });
      window.addEventListener('keydown', hurry, { capture: true });
      try {
        const g = geo ?? (await loadIndiaGeo().catch(() => null));
        if (!g) {
          navigate();
          await ready();
          return;
        }
        if (!geo) setGeo(g);
        sheetRef.current = prepare(g, journey);
        layerRefs.current = [];
        setLayers(layerCount());
        setLifted(Boolean(sheetRef.current.record) && journey.kind !== 'ascend');
        await new Promise<void>((r) => {
          mounted.current = r;
          setJ(journey);
        });
        await run(journey, navigate, ready);
      } finally {
        navigate();
        window.removeEventListener('pointerdown', hurry, { capture: true });
        window.removeEventListener('keydown', hurry, { capture: true });
        root.dataset.state = 'idle';
        root.removeAttribute('style');
        delete root.dataset.closing;
        sheetRef.current = null;
        setJ(null);
        speed = 1;
      }
    },
  }));

  /* ------------------------------------------------------------- the sheet */

  function prepare(g: IndiaGeo, journey: Journey): Sheet {
    const css = getComputedStyle(document.documentElement);
    const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    const species = journey.species;
    let record: Path2D | null = null;
    let recordBox: Sheet['recordBox'] = null;
    if (species) {
      const names = new Set(species.states.map((s) => GEOJSON_STATE_ALIASES[s] ?? s));
      const states = g.states.filter((s) => names.has(s.name));
      if (states.length) {
        record = new Path2D(states.map((s) => s.d).join(''));
        recordBox = states.reduce<[number, number, number, number]>(
          (b, s) => [Math.min(b[0], s.bounds[0]), Math.min(b[1], s.bounds[1]), Math.max(b[2], s.bounds[2]), Math.max(b[3], s.bounds[3])],
          [Infinity, Infinity, -Infinity, -Infinity],
        );
      }
    }
    return {
      country: new Path2D(g.all),
      record,
      recordBox,
      legPts: journey.leg ? sample(bowedLeg(journey.leg[0], journey.leg[1], 0.2, { max: 160 })) : null,
      origin: journey.origin ? project(journey.origin.lng, journey.origin.lat) : null,
      ink: {
        canvas: v('--color-canvas', '#e8e1cf'),
        contour: v('--color-contour', '#b07a52'),
        river: v('--color-river', '#7ea3b5'),
        ground: v('--color-forest-950', '#0e1411'),
        status: species ? STATUS_INFO[species.status].hex : v('--color-contour', '#b07a52'),
      },
    };
  }

  /** Size a canvas to a CSS box at the sheet's density, and return its context with map units mapped in. */
  function frame(c: HTMLCanvasElement, cssW: number, cssH: number, cam: GeoCam, offX = 0, offY = 0) {
    const d = density();
    const w = Math.round(cssW * d);
    const h = Math.round(cssH * d);
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    const ctx = c.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const W = window.innerWidth;
    const H = window.innerHeight;
    const k = (W / cam.w) * d;
    // Screen point of map (x, y): W/2 + (x - cam.x) * W/cam.w, offset by the canvas' own position.
    ctx.setTransform(k, 0, 0, k, (W / 2 - offX) * d - cam.x * k, (H / 2 - offY) * d - cam.y * k);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    /** A line width in CSS pixels, in map units. */
    const px = (n: number) => (n * d) / k;
    return { ctx, px };
  }

  /** One frame of the moving sheet. */
  function drawBase(cam: GeoCam, fly: number, legT: number, kind: Journey['kind']) {
    const c = baseRef.current;
    const s = sheetRef.current;
    if (!c || !s) return;
    const { ctx, px } = frame(c, window.innerWidth, window.innerHeight, cam);
    const { ink } = s;
    ctx.strokeStyle = alpha(ink.canvas, 0.34);
    ctx.lineWidth = px(0.8);
    ctx.stroke(s.country);
    if (s.record) {
      // The states of record warm as the camera arrives over them; on the way out, they cool.
      const warm = kind === 'ascend' ? 1 - fly : fly;
      ctx.fillStyle = alpha(ink.status, warm * 0.07);
      ctx.fill(s.record);
      ctx.strokeStyle = alpha(ink.status, 0.3 + warm * 0.4);
      ctx.lineWidth = px(1.1);
      ctx.stroke(s.record);
    }
    if (s.legPts && legT > 0) {
      const n = Math.max(1, Math.round(legT * (s.legPts.length - 1)));
      ctx.beginPath();
      ctx.moveTo(s.legPts[0][0], s.legPts[0][1]);
      for (let i = 1; i <= n; i++) ctx.lineTo(s.legPts[i][0], s.legPts[i][1]);
      ctx.strokeStyle = ink.river;
      ctx.lineWidth = px(1.6);
      ctx.stroke();
      if (legT < 1) {
        const [x, y] = s.legPts[n];
        ctx.beginPath();
        ctx.arc(x, y, px(3.5), 0, Math.PI * 2);
        ctx.fillStyle = ink.contour;
        ctx.fill();
      }
    }
    if (s.origin) {
      const a = 1 - fly * 0.7;
      const [x, y] = s.origin;
      ctx.beginPath();
      ctx.arc(x, y, px(4), 0, Math.PI * 2);
      ctx.fillStyle = alpha(ink.contour, a);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, px(14), 0, Math.PI * 2);
      ctx.strokeStyle = alpha(ink.contour, a);
      ctx.lineWidth = px(1);
      ctx.stroke();
    }
  }

  /**
   * The lifted layers: drawn once, at the camera's final framing, into
   * canvases cut to the states of record. After this only their transforms move.
   */
  function drawLayers(cam: GeoCam) {
    const s = sheetRef.current;
    if (!s?.record || !s.recordBox) return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const k = W / cam.w;
    const pad = 4;
    const left = Math.max(-W * 0.25, W / 2 + (s.recordBox[0] - cam.x) * k - pad);
    const top = Math.max(-H * 0.25, H / 2 + (s.recordBox[1] - cam.y) * k - pad);
    const right = Math.min(W * 1.25, W / 2 + (s.recordBox[2] - cam.x) * k + pad);
    const bottom = Math.min(H * 1.25, H / 2 + (s.recordBox[3] - cam.y) * k + pad);
    const w = Math.max(1, right - left);
    const h = Math.max(1, bottom - top);
    const { ink } = s;
    layerRefs.current.forEach((c, i) => {
      if (!c) return;
      Object.assign(c.style, { left: `${left}px`, top: `${top}px`, width: `${w}px`, height: `${h}px` });
      const { ctx, px } = frame(c, w, h, cam, left, top);
      const isTop = i === layerRefs.current.length - 1;
      if (isTop) {
        ctx.fillStyle = ink.ground;
        ctx.fill(s.record!);
        ctx.fillStyle = alpha(ink.status, 0.08);
        ctx.fill(s.record!);
        ctx.strokeStyle = alpha(ink.canvas, 0.72);
        ctx.lineWidth = px(1.1);
      } else {
        ctx.strokeStyle = alpha(ink.status, 0.26);
        ctx.lineWidth = px(0.9);
      }
      ctx.stroke(s.record!);
    });
  }

  function setCam(next: GeoCam, fly: number, legT: number, kind: Journey['kind']) {
    camRef.current = next;
    drawBase(next, fly, legT, kind);
    const [lng, lat] = unproject(next.x, next.y);
    if (readRef.current) readRef.current.textContent = `${formatDeg(lat, 'lat')}  ${formatDeg(lng, 'lng')}`;
    const bar = scaleBar(next);
    if (barRef.current) barRef.current.style.width = `${bar.px.toFixed(1)}px`;
    if (barLabelRef.current && barLabelRef.current.textContent !== bar.label) barLabelRef.current.textContent = bar.label;
  }

  /* ------------------------------------------------------------- the frames */

  async function run(journey: Journey, navigate: () => void, ready: () => Promise<void>) {
    const root = rootRef.current!;
    const view = viewRef.current!;
    const world = worldRef.current!;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const wide = W >= 700;

    const start = journey.fromBox ? fullscreenOf(journey.from, journey.fromBox) : journey.from;
    setCam(start, 0, 0, journey.kind);
    view.style.clipPath = insetOf(journey.fromBox, 0);
    root.dataset.state = 'on';
    root.dataset.kind = journey.kind;

    if (journey.kind === 'ascend') return ascend(journey, navigate, ready);

    /* ---- DESCEND / TRAVEL ------------------------------------------------ */
    const species = journey.species!;
    const to = journey.to!;
    const path = camPath(start, to);
    const flight = Math.min(Math.max(path.duration * 0.85, 700), journey.kind === 'travel' ? 1700 : 1400);

    // The photograph starts loading now, so it is ready when the line opens.
    const img = imgRef.current!;
    const ps = photoSources(species);
    if (ps) img.src = ps.src;
    const decoded = img.decode().catch(() => undefined);

    // 1. The sheet comes up over the page; the chosen place is ringed.
    await tween(360, (e) => root.style.setProperty('--in', e.toFixed(3)), outExpo);

    // 2. The camera travels, drawing the leg as it follows it. Over the atlas,
    //    the view grows out of the map's panel as it goes.
    await tween(
      flight,
      (e) => {
        setCam(path(e), e, e, journey.kind);
        if (journey.fromBox) view.style.clipPath = insetOf(journey.fromBox, Math.min(1, e * 2.2));
        root.style.setProperty('--fly', e.toFixed(3));
      },
      cinema,
    );
    setCam(to, 1, 1, journey.kind);
    view.style.clipPath = 'inset(0px)';

    // 3. The ground gains depth: the states of record lift, the survey rings rise.
    drawLayers(to);
    const tilt = wide ? 52 : 44;
    const lift = wide ? 7 : 5;
    await tween(
      720,
      (e) => {
        world.style.transform = `rotateX(${(tilt * e).toFixed(2)}deg)`;
        root.style.setProperty('--lift', `${(lift * e).toFixed(2)}px`);
        root.style.setProperty('--depth', e.toFixed(3));
      },
      emphasis,
    );

    // 4. A line is ruled through the anchor, and 5. opens onto the photograph.
    // The page is laid out underneath meanwhile; it shows its photograph already open.
    setWorld({ arrival: species.id });
    navigate();
    const landed = ready();
    await tween(320, (e) => root.style.setProperty('--rule', e.toFixed(3)), outExpo);

    const aspect = ps?.width && ps?.height ? ps.width / ps.height : 1.5;
    const tw = Math.min(W * (wide ? 0.46 : 0.84), H * 0.62 * aspect);
    const th = tw / aspect;
    const photo = photoRef.current!;
    Object.assign(photo.style, { width: `${tw}px`, height: `${th}px`, left: `${(W - tw) / 2}px`, top: `${(H - th) / 2}px` });
    await Promise.race([decoded, after(500)]);
    await tween(560, (e) => root.style.setProperty('--open', e.toFixed(3)), cinema);

    // 6. The photograph takes its place on the species page.
    await landed;
    const target = document.querySelector<HTMLImageElement>('.sw-photo img');
    const t = target?.getBoundingClientRect();
    if (t && t.width > 20) {
      const dx = t.left - (W - tw) / 2;
      const dy = t.top - (H - th) / 2;
      const s = t.width / tw;
      await Promise.race([target!.decode().catch(() => undefined), after(400)]);
      await tween(
        720,
        (e) => {
          photo.style.transform = `translate(${(dx * e).toFixed(1)}px, ${(dy * e).toFixed(1)}px) scale(${lerp(1, s, e).toFixed(4)})`;
          root.style.setProperty('--out', Math.min(1, e * 1.6).toFixed(3));
        },
        outExpo,
      );
    } else {
      await tween(420, (e) => root.style.setProperty('--out', e.toFixed(3)), outExpo);
    }
    await tween(160, (e) => root.style.setProperty('--gone', e.toFixed(3)), linear);
    photo.removeAttribute('style');
    world.removeAttribute('style');
  }

  async function ascend(journey: Journey, navigate: () => void, ready: () => Promise<void>) {
    const root = rootRef.current!;
    const view = viewRef.current!;
    const photo = photoRef.current!;
    const img = imgRef.current!;

    // PHOTOGRAPH → LINE: the photograph on screen closes into a ruled line.
    const shot = journey.closeFrom;
    if (shot) {
      const r = shot.getBoundingClientRect();
      img.src = shot.currentSrc || shot.src;
      Object.assign(photo.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
      root.style.setProperty('--rule-y', `${r.top + r.height / 2}px`);
      root.style.setProperty('--open', '1');
      root.style.setProperty('--rule', '1');
      root.style.setProperty('--in', '0');
      root.dataset.closing = 'true';
      await tween(520, (e) => root.style.setProperty('--open', (1 - e).toFixed(3)), cinema);
    }
    // LINE → POINT: the sheet comes up and the line gathers to the place it belongs to.
    await tween(
      360,
      (e) => {
        root.style.setProperty('--in', e.toFixed(3));
        root.style.setProperty('--rule', (1 - e).toFixed(3));
      },
      outExpo,
    );
    delete root.dataset.closing;

    // Under cover, the atlas is laid out; its map's panel is where the camera lands.
    navigate();
    await ready();
    const panel = await waitFor('#atlas-map-panel', 1500);
    const box = panel?.getBoundingClientRect() ?? null;
    const end = box ? fullscreenOf(atlasLanding(box), box) : journey.from;
    const path = camPath(camRef.current, end);
    const flight = Math.min(Math.max(path.duration * 0.85, 700), 1500);
    // POINT → CAMERA → MAP: up from the ground, and into the map's frame.
    await tween(
      flight,
      (e) => {
        setCam(path(e), e, 0, 'ascend');
        view.style.clipPath = insetOf(box, Math.max(0, (e - 0.45) / 0.55));
        root.style.setProperty('--fly', e.toFixed(3));
      },
      cinema,
    );
    view.style.clipPath = insetOf(box, 1);
    // Leaflet's own drawing is underneath now; the sheet lifts off it.
    await tween(420, (e) => root.style.setProperty('--out', e.toFixed(3)), outExpo);
    await tween(160, (e) => root.style.setProperty('--gone', e.toFixed(3)), linear);
    photo.removeAttribute('style');
  }

  /* --------------------------------------------------------------- skeleton */

  const species = j?.species ?? null;
  const caption = j ? describeRoute(j.kind === 'ascend' ? '/atlas' : `/species/${species?.id ?? ''}`) : null;
  const status = species ? STATUS_INFO[species.status] : null;

  return (
    <div
      ref={rootRef}
      className="wj"
      data-state="idle"
      aria-hidden="true"
      style={status ? ({ ['--status' as string]: status.hex } as CSSProperties) : undefined}
    >
      <div className="wj-sheet" />
      {j && geo && (
        <>
          <div ref={viewRef} className="wj-view">
            <div className="wj-persp">
              <div ref={worldRef} className="wj-world">
                <canvas ref={baseRef} className="wj-map" />
                {lifted &&
                  Array.from({ length: layers }, (_, i) => (
                    <canvas
                      key={i}
                      ref={(node) => {
                        if (node) layerRefs.current[i] = node;
                      }}
                      className="wj-layer"
                      style={{ ['--i' as string]: i + 1 } as CSSProperties}
                    />
                  ))}
                {lifted && (
                  <div ref={ringsRef} className="wj-rings" style={{ ['--i' as string]: layers + 0.5 } as CSSProperties}>
                    <svg viewBox="-110 -110 220 220">
                      <circle r="5" />
                      <circle r="26" />
                      <circle r="54" />
                      <circle r="92" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="wj-instruments">
            <p ref={readRef} className="wj-readout" />
            <p className="wj-scale">
              <span ref={barRef} className="wj-bar" />
              <span ref={barLabelRef} />
            </p>
          </div>
          {caption && (
            <div className="wj-caption">
              <span className="wj-eyebrow">{caption.eyebrow}</span>
              <span className="wj-title">{caption.title}</span>
              <span className="wj-note">
                {caption.note}
                {status && j.kind !== 'ascend' && <span className="wj-status"> · {status.name}</span>}
              </span>
              {lifted && <span className="wj-disclaimer">States of record, lifted for legibility — not elevation</span>}
            </div>
          )}
          <div className="wj-rule">
            <span />
          </div>
          <div ref={photoRef} className="wj-photo">
            <img ref={imgRef} alt="" decoding="async" />
          </div>
        </>
      )}
    </div>
  );
}

async function waitFor(selector: string, ms: number): Promise<Element | null> {
  const start = performance.now();
  while (performance.now() - start < ms) {
    const el = document.querySelector(selector);
    if (el && el.getBoundingClientRect().width > 40) return el;
    await new Promise((r) => requestAnimationFrame(r));
  }
  return document.querySelector(selector);
}
