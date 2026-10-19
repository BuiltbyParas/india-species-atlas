/**
 * The map sheet's margin, kept on screen while the map is: crop marks, the
 * camera's centre in degrees, a true scale bar, and the chapter index. It is
 * the toposheet's furniture rather than a HUD — quiet, factual, and always
 * computed from the camera (the coordinates and the scale bar are real).
 */
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { formatDeg } from '../../../../src/geo/india';
import { cameraAt, at, SCENES, SCENE_START, type SceneId } from '../../timeline';
import { unproject, UNITS_PER_KM } from '../../data/geo';
import { scaleOf } from './camera';
import { TYPE, ink } from '../../styles/tokens';
import { track, type Key } from '../../utils/anim';

const HUD: Key[] = [
  [at('india', 0.8), 0],
  [at('india', 2.0), 1, 'inOutSine'],
  [at('atlas', 0), 1],
  [at('atlas', 0.6), 0, 'inOutSine'],
  [at('system', 0.6), 0],
  [at('system', 1.6), 1, 'inOutSine'],
  [at('brand', 0), 1],
  [at('brand', 1.0), 0, 'inOutSine'],
];

const NICE_KM = [50, 100, 200, 250, 500, 1000];

function sceneAt(t: number) {
  let idx = 0;
  SCENES.forEach((s, i) => {
    if (t >= SCENE_START[s.id as SceneId]) idx = i;
  });
  return { idx, scene: SCENES[idx] };
}

export function SheetFrame() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const a = track(t, HUD);
  if (a <= 0.001) return null;

  const cam = cameraAt(t);
  const [lng, lat] = unproject(cam.x, cam.y);
  const pxPerKm = UNITS_PER_KM * scaleOf(cam, { width, height });
  const km = NICE_KM.reduce((best, k) => (Math.abs(k * pxPerKm - 180) < Math.abs(best * pxPerKm - 180) ? k : best), NICE_KM[0]);
  const bar = km * pxPerKm;
  const { idx, scene } = sceneAt(t);
  const inset = 56;
  const tick = 18;
  const mark = (x: number, y: number, sx: number, sy: number) => `M${x} ${y + sy * tick}L${x} ${y}L${x + sx * tick} ${y}`;

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: a, pointerEvents: 'none' }}>
      <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
        <path
          d={[mark(inset, inset, 1, 1), mark(width - inset, inset, -1, 1), mark(inset, height - inset, 1, -1), mark(width - inset, height - inset, -1, -1)].join('')}
          fill="none"
          stroke={ink(0.32)}
          strokeWidth={1}
        />
        <g transform={`translate(${width - inset - 24 - bar} ${height - inset - 30})`}>
          <path d={`M0 -5L0 0L${bar} 0L${bar} -5M${bar / 2} -3L${bar / 2} 0`} fill="none" stroke={ink(0.5)} strokeWidth={1} />
        </g>
      </svg>
      <div style={{ ...TYPE.micro, fontSize: 13, position: 'absolute', left: inset + 24, bottom: inset + 18, color: ink(0.5), fontVariantNumeric: 'tabular-nums' }}>
        {formatDeg(lat, 'lat')}&nbsp;&nbsp;{formatDeg(lng, 'lng')}
      </div>
      <div style={{ ...TYPE.micro, fontSize: 13, position: 'absolute', right: inset + 24, bottom: inset + 40, color: ink(0.5), textAlign: 'right' }}>
        {km} km
      </div>
      <div style={{ ...TYPE.micro, fontSize: 13, position: 'absolute', left: inset + 24, top: inset + 14, color: ink(0.5) }}>
        India Species Atlas
      </div>
      <div style={{ ...TYPE.micro, fontSize: 13, position: 'absolute', right: inset + 24, top: inset + 14, color: ink(0.5), fontVariantNumeric: 'tabular-nums' }}>
        {String(idx + 1).padStart(2, '0')}&nbsp;/&nbsp;{String(SCENES.length).padStart(2, '0')}&nbsp;&nbsp;·&nbsp;&nbsp;{scene.name}
      </div>
    </div>
  );
}
