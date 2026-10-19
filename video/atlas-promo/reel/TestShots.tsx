/**
 * Phase-1 visual tests: S03 Rajasthan, S04 the wire, S05 the bustard, plus the
 * line morph (transition A) that carries S04 into S05.
 *
 * Times below are ABSOLUTE reel seconds (each shot adds its own `in`), so they
 * read the same as the shot list and the voice script.
 */
import { AbsoluteFill } from 'remotion';
import { useTime, prog, windowed, track, hash01, lerp, clamp01 } from '../utils/anim';
import { COLOR, TYPE, EASE, ink } from '../styles/tokens';
import { StatusChip } from '../components/type/Type';
import { SPECIES_BY_ID } from '../../../src/data/species';
import { Plate, GroundFalloff, microInk, flowPath } from './Plate';
import { SHOT, SAFE, FPS } from './shots';

const useAbs = (id: string) => useTime() + SHOT[id].in;

// --- S03 · Rajasthan ------------------------------------------------------------------------

/** A closed contour-like loop: a circle whose radius wanders with seeded noise, like an isoline. */
function contourPoints(cx: number, cy: number, r: number, n = 72): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + 0.1 * Math.sin(a * 3 + 0.7) + 0.06 * Math.sin(a * 7 + 2.1) + 0.03 * (hash01(i) - 0.5);
    pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k * 1.35]);
  }
  return pts;
}

/** Coordinates that settle digit by digit, the way the map's labels do. */
function Coordinates({ t, start, text }: { t: number; start: number; text: string }) {
  const chars = [...text];
  return (
    <span>
      {chars.map((c, i) => {
        const settled = t > start + 0.05 * i + 0.35;
        const shown = /\d/.test(c) && !settled ? String(Math.floor(hash01(i * 31 + Math.floor(t * FPS)) * 10)) : c;
        return (
          <span key={i} style={{ opacity: t > start + 0.03 * i ? 1 : 0 }}>
            {shown}
          </span>
        );
      })}
    </span>
  );
}

export function S03Grass() {
  const t = useAbs('S03');
  // Transition I: the plate opens through a widening contour, its edge drawn as a line.
  // Exponential growth reads as a camera moving through the opening, not as a shape scaling up.
  const open = prog(t, 6.0, 0.95, 'inOutSine');
  const pts = contourPoints(540, 900, 40 * Math.pow(1500 / 40, open));
  const poly = pts.map(([x, y]) => `${x}px ${y}px`).join(', ');
  const svgPath = `M ${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ')} Z`;
  // A slow push and a little rise: the camera is moving through the grass, never parked.
  const scale = track(t, [[6, 1.0], [10.2, 1.085, 'linear']]);
  const dy = track(t, [[6, 0], [10.2, -40, 'linear']]);
  const label = windowed(t, 6.35, 9.3, 0.5, 0.5);
  return (
    <AbsoluteFill style={{ background: COLOR.ground }}>
      <AbsoluteFill style={{ clipPath: open < 0.999 ? `polygon(${poly})` : undefined }}>
        <Plate flowFile={SHOT.S03.flowFile} standIn={{ src: 'reel/standin/grassland.jpg', w: 1080, h: 1920, x: 0, y: 0, label: 'Gemini still, not Flow footage' }} scale={scale} dy={dy} origin="50% 40%">
          <GroundFalloff top={0.5} bottom={0.55} />
        </Plate>
      </AbsoluteFill>
      <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0, opacity: 1 - prog(t, 6.7, 0.35) }}>
        <path d={svgPath} fill="none" stroke={ink(0.9)} strokeWidth={2} />
      </svg>
      <div style={{ position: 'absolute', left: SAFE.left, top: SAFE.top + 30, opacity: label }}>
        <div style={{ ...microInk, color: ink(0.62), marginBottom: 14 }}>Thar · Rajasthan</div>
        <div style={{ ...microInk, letterSpacing: '0.18em' }}>
          <Coordinates t={t} start={6.45} text="26.2°N  71.4°E" />
        </div>
      </div>
    </AbsoluteFill>
  );
}

// --- S04 · The wire -------------------------------------------------------------------------

export const FREEZE_AT = 12.87;

/** The wire as a quadratic sag from upper left to right, about a third of the way down the frame. */
const WIRE = { a: [-60, 610], c: [560, 900], b: [1140, 690] } as const;
/** Where the bustard's feet stand in S05's framing: the line morph lands here. */
const GROUND_LINE_Y = 1308;

/** How far the camera has drifted sideways (it stops on the freeze). The wire is nearer than the grass, so it moves more. */
const drift = (t: number) => track(Math.min(t, FREEZE_AT), [[10, 0], [FREEZE_AT, 1, 'linear']]);

const wirePath = (shift: number) => `M ${WIRE.a[0] + shift} ${WIRE.a[1]} Q ${WIRE.c[0] + shift} ${WIRE.c[1]} ${WIRE.b[0] + shift} ${WIRE.b[1]}`;

export function S04Wire() {
  const t = useAbs('S04');
  const d = drift(t);
  // Focus pull: grass sharp → wire sharp, landing as the voice says "a line".
  const rack = prog(t, 10.3, 1.5, 'inOutSine');
  // On the freeze the footage drains toward the forest ground: it is becoming a map.
  const drain = prog(t, FREEZE_AT, 0.35, 'outExpo');
  return (
    <AbsoluteFill style={{ background: COLOR.ground }}>
      <Plate
        flowFile={SHOT.S04.flowFile}
        freezeAt={Math.round((FREEZE_AT - SHOT.S04.in) * FPS)}
        standIn={{ src: 'reel/standin/wire-plate.jpg', w: 1140, h: 2027, x: -30, y: -40, label: 'still plate, drawn wire' }}
        dx={-36 * d}
        scale={1.04}
        blur={lerp(0, 2.6, rack)}
        extraFilter={`saturate(${1 - 0.55 * drain}) brightness(${1 - 0.35 * drain})`}
      >
        {/* The drawn wire exists only for the stand-in; a Flow clip brings its own. */}
        {!flowPath(SHOT.S04.flowFile) && (
          <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0, filter: `blur(${lerp(5, 0, rack)}px)` }}>
            <path d={wirePath(-110 * d)} fill="none" stroke="rgba(22,19,14,0.92)" strokeWidth={4.5} strokeLinecap="round" />
            <path d={wirePath(-110 * d).replace(/(\d+(?:\.\d+)?) (\d+(?:\.\d+)?)/g, (_, x, y) => `${x} ${Number(y) - 64}`)} fill="none" stroke="rgba(22,19,14,0.55)" strokeWidth={2.5} strokeLinecap="round" />
          </svg>
        )}
        <GroundFalloff top={0.45} bottom={0.55 + 0.3 * drain} />
      </Plate>
    </AbsoluteFill>
  );
}

/**
 * Transition A, the line morph, drawn over the S04→S05 cut: the line traces the
 * frozen wire, then straightens and drops to become the ground the bustard stands on.
 */
export function LineMorph() {
  const t = useTime(); // this layer runs on the reel's own clock
  const draw = prog(t, FREEZE_AT, 0.32, 'outExpo');
  const morph = prog(t, 13.05, 0.6, 'cinema');
  const fade = 1 - prog(t, 13.75, 0.5, 'inOutSine');
  if (t < FREEZE_AT || fade <= 0) return null;
  const shift = -110 * drift(t);
  const y = (v: number) => lerp(v, GROUND_LINE_Y, morph);
  const path = `M ${WIRE.a[0] + shift} ${y(WIRE.a[1])} Q ${WIRE.c[0] + shift} ${y(WIRE.c[1])} ${WIRE.b[0] + shift} ${y(WIRE.b[1])}`;
  const len = 1400;
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0, opacity: fade }}>
      <path d={path} fill="none" stroke={COLOR.ink} strokeWidth={lerp(3, 1.6, morph)} strokeDasharray={len} strokeDashoffset={len * (1 - draw)} strokeLinecap="round" />
    </svg>
  );
}

// --- S05 · Great Indian Bustard --------------------------------------------------------------

const BUSTARD = SPECIES_BY_ID['great-indian-bustard'];
/** The left-hand bird's body in frame px (the photo is framed so the bird sits above the caption band). */
const BIRD = { x: 553, y: 1163 };

export function S05Bustard() {
  const t = useAbs('S05');
  // The plate comes up under the line from the forest ground (the line is the ground it stands on).
  // It starts at the drained level S04 froze on, so the cut never dips to black.
  const rise = lerp(0.5, 1, prog(t, 13.0, 0.7, 'outExpo'));
  const scale = track(t, [[13, 1.0], [17, 1.09, 'linear']]);
  // Transition K out: everything softens as the card takes focus.
  const exitBlur = prog(t, 16.45, 0.55, 'emphasis');
  const num = prog(t, 14.0, 0.7, 'outExpo');
  const name = prog(t, 14.15, 0.9, 'outExpo');
  const chip = prog(t, 14.65, 0.6, 'outExpo'); // on "Critically endangered"
  const credit = windowed(t, 13.6, 17, 0.5, 0.3);
  return (
    <AbsoluteFill style={{ background: COLOR.ground }}>
      <AbsoluteFill style={{ opacity: rise }}>
        <Plate
          flowFile={SHOT.S05.flowFile}
          standIn={{ src: 'reel/standin/bustard.jpg', w: 1458, h: 2592, x: -230, y: -672, label: 'credited photograph, not Flow' }}
          scale={scale}
          origin={`${BIRD.x}px ${BIRD.y}px`}
          blur={exitBlur * 12}
          extraFilter={`brightness(${1 - 0.3 * exitBlur})`}
        >
          <GroundFalloff top={0.7} bottom={0.5} />
        </Plate>
      </AbsoluteFill>
      <div style={{ position: 'absolute', left: SAFE.left, top: SAFE.top + 40, width: SAFE.right - SAFE.left }}>
        <div style={{ ...TYPE.micro, fontSize: 28, color: ink(0.7), opacity: num, transform: `translateY(${(1 - num) * 14}px)` }}>01</div>
        <div style={{ overflow: 'hidden', marginTop: 18 }}>
          <div style={{ ...TYPE.title, fontSize: 104, color: COLOR.ink, transform: `translateY(${(1 - EASE.outExpo(clamp01(name))) * 110}%)` }}>
            Great Indian
            <br />
            Bustard
          </div>
        </div>
        <div style={{ marginTop: 34 }}>
          <StatusChip status={BUSTARD.status} p={chip} scale={2.3} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: SAFE.left, top: SAFE.bottom - 40, ...TYPE.micro, fontSize: 18, letterSpacing: '0.12em', color: ink(0.55), opacity: credit }}>
        Photo: {BUSTARD.image?.credit} · {BUSTARD.image?.license}
      </div>
    </AbsoluteFill>
  );
}
