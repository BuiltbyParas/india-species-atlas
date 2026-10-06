/**
 * 08 · The Atlas. The map hands over to the real site: a browser window
 * opens on the home page, then the interactive map; the site's own cursor
 * presses a pin, opens the species profile (which slides in as the site's
 * drawer does), and walks its tabs; finally the map's three layers.
 *
 * Every pixel of interface is a screenshot of the real site (see
 * atlas-script.ts and capture-ui.mjs). The film adds only the window, the
 * camera and the cursor.
 */
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { TYPE, COLOR, ink } from '../styles/tokens';
import { useTime, prog, clamp01, track, type Key } from '../utils/anim';
import { MaskLine, Label } from '../components/type/Type';
import { BrowserFrame, SiteCursor, useUiManifest, type UiManifest, type Rect } from '../components/ui/UiPlates';
import { PLATES, CURSOR, CURSOR_IN, CURSOR_OUT, CLICKS, UI_CAMERA, LABELS, type PlateId, type Target } from './atlas-script';
import { SCENE_DUR } from '../timeline';
import { PUBLIC_HOST } from '../data/site';

const VW = 1300;
const VH = Math.round((VW * 9) / 16);
const FRAME_X = 500;
const FRAME_Y = Math.round((1080 - VH - 46) / 2);
const PLATE_W = 1920;
const PLATE_H = 1080;
const BASE_K = VW / PLATE_W;

const camKeys = (pick: (k: (typeof UI_CAMERA)[number]) => number): Key[] => UI_CAMERA.map((k) => [k.t, pick(k), k.ease] as Key);
const CAM = { x: camKeys((k) => k.x), y: camKeys((k) => k.y), z: camKeys((k) => Math.log(k.z)) };

function uiCamera(t: number) {
  const z = Math.exp(track(t, CAM.z));
  const k = BASE_K * z;
  // Keep the plate covering the window: never show past its edges.
  const hx = VW / 2 / k;
  const hy = VH / 2 / k;
  const x = Math.min(PLATE_W - hx, Math.max(hx, track(t, CAM.x)));
  const y = Math.min(PLATE_H - hy, Math.max(hy, track(t, CAM.y)));
  return { x, y, k };
}

function resolve(target: Target, m: UiManifest): { x: number; y: number } {
  if ('x' in target) return target;
  const [plate, name] = target.rect.split('.');
  const r = m.shots[plate]?.rects?.[name];
  if (!r) return { x: PLATE_W / 2, y: PLATE_H / 2 };
  return { x: r.x + r.w / 2 + (target.dx ?? 0), y: r.y + r.h / 2 + (target.dy ?? 0) };
}

function plateAt(t: number) {
  let i = 0;
  PLATES.forEach((p, j) => {
    if (t >= p.t) i = j;
  });
  return i;
}

function Plate({ id, m, cam, opacity = 1, clip }: { id: PlateId; m: UiManifest; cam: { x: number; y: number; k: number }; opacity?: number; clip?: string }) {
  const shot = m.shots[id];
  if (!shot) return null;
  return (
    <Img
      src={staticFile(shot.file)}
      style={{
        position: 'absolute',
        left: VW / 2 - cam.x * cam.k,
        top: VH / 2 - cam.y * cam.k,
        width: PLATE_W * cam.k,
        height: PLATE_H * cam.k,
        opacity,
        clipPath: clip,
      }}
    />
  );
}

/** The drawer sliding in, as the site's profile does: the backdrop crossfades, the panel slides. */
function Drawer({ m, cam, from, to, p }: { m: UiManifest; cam: { x: number; y: number; k: number }; from: PlateId; to: PlateId; p: number }) {
  const d: Rect = m.shots[to]?.rects?.drawer ?? { x: 1344, y: 0, w: 576, h: 1080 };
  const slide = (1 - p) * d.w * cam.k;
  const left = VW / 2 + (d.x - cam.x) * cam.k;
  return (
    <>
      <Plate id={from} m={m} cam={cam} />
      <Plate id={to} m={m} cam={cam} opacity={p} clip={`inset(0 ${(PLATE_W - d.x) * cam.k}px 0 0)`} />
      <div style={{ position: 'absolute', left: left, top: 0, width: VW - left + 2, height: VH, overflow: 'hidden', transform: `translateX(${slide}px)` }}>
        <div style={{ position: 'absolute', left: -left, top: 0, width: VW, height: VH }}>
          <Plate id={to} m={m} cam={cam} />
        </div>
      </div>
    </>
  );
}

export function S08Atlas() {
  const t = useTime();
  const m = useUiManifest();
  const dur = SCENE_DUR.atlas;

  // The window: in from the map's hand-over, and out as the system view pulls back.
  const inP = prog(t, 0.35, 1.1, 'cinema');
  const outP = prog(t, dur - 0.15, 0.85, 'cinema');
  const rot = -11 * (1 - prog(t, 0.35, 1.9, 'inOutSine')) + 7 * outP;
  const scale = (0.88 + 0.12 * inP) * (1 - 0.32 * outP);
  const opacity = clamp01(inP * 1.6) * (1 - outP);

  if (m === undefined) return null;
  if (m === null) {
    return (
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ ...TYPE.body, color: '#ff5a5a', border: '2px solid #ff5a5a', padding: 40 }}>
          Missing interface plates — run npm run video:promo:capture
        </div>
      </AbsoluteFill>
    );
  }

  const cam = uiCamera(t);
  const pi = plateAt(t);
  const cur = PLATES[pi];
  const prev = PLATES[pi - 1];
  const since = t - cur.t;

  let content: React.ReactNode;
  if (cur.via === 'drawer' && prev && since < 0.7) {
    content = <Drawer m={m} cam={cam} from={prev.id} to={cur.id} p={prog(since, 0, 0.65, 'emphasis')} />;
  } else if (cur.via === 'fade' && prev && since < 0.35) {
    content = (
      <>
        <Plate id={prev.id} m={m} cam={cam} />
        <Plate id={cur.id} m={m} cam={cam} opacity={prog(since, 0, 0.35, 'inOutSine')} />
      </>
    );
  } else {
    content = <Plate id={cur.id} m={m} cam={cam} />;
  }

  // The cursor, in plate px → window px.
  const pts = CURSOR.map((c) => ({ t: c.t, p: resolve(c.at, m), ease: c.ease }));
  const cx = track(t, pts.map((c) => [c.t, c.p.x, c.ease] as Key));
  const cy = track(t, pts.map((c) => [c.t, c.p.y, c.ease] as Key));
  const rects = Object.values(m.shots[cur.id]?.rects ?? {}).filter((r) => r.w < 400);
  const near = Math.min(
    ...rects.map((r) => Math.hypot(Math.max(r.x - cx, 0, cx - r.x - r.w), Math.max(r.y - cy, 0, cy - r.y - r.h))),
    999,
  );
  const hover = clamp01(1 - near / 24);
  const sx = VW / 2 + (cx - cam.x) * cam.k;
  const sy = VH / 2 + (cy - cam.y) * cam.k;
  const cursorOn = clamp01((t - CURSOR_IN) / 0.3) * (1 - clamp01((t - CURSOR_OUT) / 0.3));
  const presses = CLICKS.map((c) => (t - c) / 1.0);

  const url = `${PUBLIC_HOST}${m.shots[cur.id]?.url ?? '/'}`;

  // The label beside the window.
  const li = LABELS.reduce((acc, l, i) => (t >= l.t ? i : acc), 0);

  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 120, top: 330, width: 330 }}>
        {LABELS.map((l, i) => {
          const next = LABELS[i + 1]?.t ?? dur + 1;
          if (t < l.t - 0.05 || t > next + 0.4) return null;
          // The outgoing label clears before the incoming one rises.
          const p = prog(t, l.t + (i ? 0.2 : 0), 0.7);
          const o = i === li ? prog(t, dur - 0.4, 0.5, 'inExpo') : prog(t, next - 0.05, 0.22, 'inExpo');
          return (
            <div key={l.word} style={{ position: 'absolute', left: 0, top: 0, width: 330 }}>
              <Label p={p} style={{ opacity: 1 - o }}>
                {l.index}
              </Label>
              <MaskLine p={p} out={o} style={{ marginTop: 18 }}>
                <div style={{ ...TYPE.heading, fontSize: 54, color: COLOR.ink }}>{l.word}</div>
              </MaskLine>
              <div style={{ ...TYPE.body, fontSize: 21, color: ink(0.68), marginTop: 14, opacity: prog(t, l.t + 0.2, 0.6) * (1 - o) }}>{l.line}</div>
            </div>
          );
        })}
      </div>

      <div style={{ position: 'absolute', left: FRAME_X, top: FRAME_Y, perspective: 2400, opacity }}>
        <div style={{ transform: `rotateY(${rot}deg) scale(${scale})`, transformOrigin: '30% 50%' }}>
          <BrowserFrame width={VW} height={VH} url={url}>
            {content}
            {cursorOn > 0 && (
              <div style={{ position: 'absolute', inset: 0, opacity: cursorOn }}>
                <SiteCursor x={sx} y={sy} hover={hover} presses={presses} scale={Math.max(0.9, cam.k)} />
              </div>
            )}
          </BrowserFrame>
        </div>
      </div>
    </AbsoluteFill>
  );
}
