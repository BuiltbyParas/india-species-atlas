import { useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type Ref } from 'react';
import { STATUS_INFO } from '../data/statusInfo';
import { formatDeg, KM_PER_UNIT, loadIndiaGeo, project, unproject, type IndiaGeo } from '../geo/india';
import { bowedLeg } from '../geo/line/paths';
import { schedule } from '../interaction/loop';
import { cubicBezier } from '../motion/gsap';
import { describeRoute } from '../interaction/routeCaption';
import { GEOJSON_STATE_ALIASES } from '../utils/stateCounts';
import { photoSources } from '../utils/photo';
import { camPath, viewBoxOf, type GeoCam } from './geoCamera';
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
 * Nothing here runs when the reader prefers reduced motion (the page turn
 * fades instead), and a click or key press during a journey hurries it to its
 * end. All moving parts are transforms, opacity and one SVG viewBox; the 3D
 * scenes are paused while it plays (`sceneRegistry.ts`).
 */
export interface JourneyHandle {
  play: (journey: Journey, go: () => void, ready: () => Promise<void>) => Promise<void>;
}

const cinema = cubicBezier(0.7, 0, 0.2, 1);
const outExpo = cubicBezier(0.16, 1, 0.3, 1);
const emphasis = cubicBezier(0.2, 0.75, 0.25, 1);
const linear = (t: number) => t;

/** Extruded copies of the states of record. Fewer on small screens, where each layer costs more of the budget. */
const layerCount = () => (window.innerWidth < 700 ? 4 : 6);

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

/** Sample a path so a partial line can be drawn at any viewBox (dashes would not measure true there). */
function sample(d: string, n = 64): Array<[number, number]> {
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', d);
  const len = p.getTotalLength();
  return Array.from({ length: n + 1 }, (_, i) => {
    const q = p.getPointAtLength((len * i) / n);
    return [q.x, q.y];
  });
}

export function WorldJourney({ ref }: { ref?: Ref<JourneyHandle> }) {
  const [j, setJ] = useState<Journey | null>(null);
  const [geo, setGeo] = useState<IndiaGeo | null>(null);
  const [layers, setLayers] = useState(6);
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const svgs = useRef<SVGSVGElement[]>([]);
  const legRef = useRef<SVGPathElement>(null);
  const nibRef = useRef<SVGCircleElement>(null);
  const ringsRef = useRef<SVGGElement>(null);
  const originRef = useRef<SVGGElement>(null);
  const readRef = useRef<HTMLParagraphElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const barLabelRef = useRef<HTMLSpanElement>(null);
  const ruleRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const mounted = useRef<(() => void) | null>(null);

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
        setLayers(layerCount());
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
        setJ(null);
        speed = 1;
      }
    },
  }));

  /* ------------------------------------------------------------- the frames */

  const camRef = useRef<GeoCam>({ x: 0, y: 0, w: 1 });

  function setCam(next: GeoCam) {
    camRef.current = next;
    // Marks that stay the same size on screen whatever the camera's scale.
    const u = next.w / window.innerWidth;
    nibRef.current?.setAttribute('r', (3.5 * u).toFixed(3));
    originRef.current?.children[0]?.setAttribute('r', (4 * u).toFixed(3));
    originRef.current?.children[1]?.setAttribute('r', (14 * u).toFixed(3));
    const vb = viewBoxOf(next, window.innerWidth / window.innerHeight);
    for (const s of svgs.current) s?.setAttribute('viewBox', vb);
    const [lng, lat] = unproject(next.x, next.y);
    if (readRef.current) readRef.current.textContent = `${formatDeg(lat, 'lat')}  ${formatDeg(lng, 'lng')}`;
    const bar = scaleBar(next);
    if (barRef.current) barRef.current.style.width = `${bar.px.toFixed(1)}px`;
    if (barLabelRef.current && barLabelRef.current.textContent !== bar.label) barLabelRef.current.textContent = bar.label;
  }

  /** Map units for a size in screen pixels at the current camera. */
  const px = (n: number) => (n * camRef.current.w) / window.innerWidth;

  async function run(journey: Journey, navigate: () => void, ready: () => Promise<void>) {
    const root = rootRef.current!;
    const view = viewRef.current!;
    const world = worldRef.current!;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const wide = W >= 700;

    const start = journey.fromBox ? fullscreenOf(journey.from, journey.fromBox) : journey.from;
    setCam(start);
    view.style.clipPath = insetOf(journey.fromBox, 0);
    root.dataset.state = 'on';
    root.dataset.kind = journey.kind;

    const ring = (r: SVGGElement | null, at: { lng: number; lat: number } | null) => {
      if (!r || !at) return;
      const [x, y] = project(at.lng, at.lat);
      r.setAttribute('transform', `translate(${x} ${y})`);
    };
    ring(originRef.current, journey.origin);

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

    // The leg, sampled once; drawn by hand each frame as the camera follows it.
    const legPts = journey.leg ? sample(bowedLeg(journey.leg[0], journey.leg[1], 0.2, { max: 160 })) : null;
    const drawLeg = (t: number) => {
      if (!legPts || !legRef.current) return;
      const n = Math.max(1, Math.round(t * (legPts.length - 1)));
      legRef.current.setAttribute('d', `M${legPts.slice(0, n + 1).map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L')}`);
      const tip = legPts[n];
      nibRef.current?.setAttribute('transform', `translate(${tip[0]} ${tip[1]})`);
    };

    // 1. The sheet comes up over the page; the chosen place is ringed.
    await tween(360, (e) => root.style.setProperty('--in', e.toFixed(3)), outExpo);

    // 2. The camera travels. Over the atlas, the view grows out of the map's panel as it goes.
    await tween(
      flight,
      (e) => {
        setCam(path(e));
        if (journey.fromBox) view.style.clipPath = insetOf(journey.fromBox, Math.min(1, e * 2.2));
        root.style.setProperty('--fly', e.toFixed(3));
        drawLeg(e);
      },
      cinema,
    );
    setCam(to);
    view.style.clipPath = 'inset(0px)';

    // 3. The ground gains depth: the states of record lift, the survey rings rise.
    const rings = ringsRef.current;
    if (rings) {
      const [x, y] = project(species.distributionPoints[0].lng, species.distributionPoints[0].lat);
      rings.setAttribute('transform', `translate(${x} ${y})`);
      rings.querySelectorAll('circle').forEach((c, i) => c.setAttribute('r', String(px([5, 26, 54, 92][i] ?? 92))));
    }
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
    photo.style.width = `${tw}px`;
    photo.style.height = `${th}px`;
    photo.style.left = `${(W - tw) / 2}px`;
    photo.style.top = `${(H - th) / 2}px`;
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
        setCam(path(e));
        view.style.clipPath = insetOf(box, Math.max(0, (e - 0.45) / 0.55));
        root.style.setProperty('--fly', e.toFixed(3));
      },
      cinema,
    );
    view.style.clipPath = insetOf(box, 1);
    // Leaflet's own drawing is underneath now; the sheet lifts off it.
    await tween(420, (e) => root.style.setProperty('--out', e.toFixed(3)), outExpo);
    await tween(160, (e) => root.style.setProperty('--gone', e.toFixed(3)), linear);
  }

  /* --------------------------------------------------------------- skeleton */

  const species = j?.species ?? null;
  const record = (() => {
    if (!geo || !species) return '';
    const names = new Set(species.states.map((s) => GEOJSON_STATE_ALIASES[s] ?? s));
    return geo.states
      .filter((s) => names.has(s.name))
      .map((s) => s.d)
      .join('');
  })();
  const caption = j ? describeRoute(j.kind === 'ascend' ? '/atlas' : `/species/${species?.id ?? ''}`) : null;
  const status = species ? STATUS_INFO[species.status] : null;
  const keep = (i: number) => (node: SVGSVGElement | null) => {
    if (node) svgs.current[i] = node;
  };

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
                <svg ref={keep(0)} className="wj-map" preserveAspectRatio="none">
                  <path d={geo.all} className="wj-country" />
                  {record && <path d={record} className="wj-record" />}
                  {j.leg && (
                    <>
                      <path ref={legRef} className="wj-leg" />
                      <circle ref={nibRef} className="wj-nib" />
                    </>
                  )}
                  <g ref={originRef} className="wj-origin">
                    <circle />
                    <circle className="wj-origin-ring" />
                  </g>
                </svg>
                {record &&
                  j.kind !== 'ascend' &&
                  Array.from({ length: layers }, (_, i) => (
                    <svg
                      key={i}
                      ref={keep(i + 1)}
                      className="wj-map wj-layer"
                      preserveAspectRatio="none"
                      style={{ ['--i' as string]: i + 1 } as CSSProperties}
                    >
                      <path d={record} className={i === layers - 1 ? 'wj-top' : 'wj-wall'} />
                      {i === layers - 1 && (
                        <g ref={ringsRef} className="wj-rings">
                          <circle className="wj-anchor" />
                          <circle />
                          <circle />
                          <circle />
                        </g>
                      )}
                    </svg>
                  ))}
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
            <div ref={captionRef} className="wj-caption">
              <span className="wj-eyebrow">{caption.eyebrow}</span>
              <span className="wj-title">{caption.title}</span>
              <span className="wj-note">
                {caption.note}
                {status && j.kind !== 'ascend' && <span className="wj-status"> · {status.name}</span>}
              </span>
              {record && j.kind !== 'ascend' && (
                <span className="wj-disclaimer">States of record, lifted for legibility — not elevation</span>
              )}
            </div>
          )}
          <div ref={ruleRef} className="wj-rule">
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
