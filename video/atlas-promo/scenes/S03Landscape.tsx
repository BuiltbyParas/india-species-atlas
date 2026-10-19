/**
 * 03 · The landscape. Five fast camera moves across the map — Thar, the
 * central highlands, the Ganga, the Brahmaputra floodplain, the Himalaya —
 * each with its word, the region's name from src/data/regions.ts and its
 * centre in degrees. A leader line runs from the word to the place.
 */
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { formatDeg } from '../../../src/geo/india';
import { FEATURED, regionOf } from '../data/atlas';
import { TYPE, COLOR, ink, EASE } from '../styles/tokens';
import { useTime, prog, clamp01 } from '../utils/anim';
import { Chars, Label, MaskLine } from '../components/type/Type';
import { LANDSCAPE, SCENE_START, cameraAt } from '../timeline';
import { project } from '../data/geo';
import { toScreen } from '../components/map/camera';

const WORD_Y = 470;

export function S03Landscape() {
  const t = useTime();
  const { width, height } = useVideoConfig();
  const T = SCENE_START.landscape + t;

  return (
    <AbsoluteFill>
      {FEATURED.map((f, i) => {
        const b0 = LANDSCAPE.lead + i * LANDSCAPE.beat;
        const local = t - b0;
        if (local < -0.1 || local > LANDSCAPE.beat + 0.5) return null;
        const r = regionOf(f.region);
        const inP = prog(local, 0.25, 0.8);
        const out = prog(local, LANDSCAPE.beat - 0.25, 0.4, 'inExpo');
        // Leader: from the end of the word to the region's centre on screen.
        const [sx, sy] = toScreen(...project(r.center.lng, r.center.lat), cameraAt(T), { width, height });
        const lineP = prog(local, 0.55, 0.7, 'cinema');
        const x0 = 640;
        const x1 = x0 + (sx - 14 - x0) * lineP;
        const yL = WORD_Y + 12;
        return (
          <div key={f.id} style={{ position: 'absolute', inset: 0 }}>
            <div style={{ position: 'absolute', left: 120, top: WORD_Y - 210 }}>
              <Label p={prog(local, 0.1, 0.7)} style={{ opacity: 1 - out }}>
                {`${String(i + 1).padStart(2, '0')} / ${String(FEATURED.length).padStart(2, '0')}  ·  Landscape`}
              </Label>
            </div>
            <div style={{ position: 'absolute', left: 112, top: WORD_Y - 150 }}>
              <div style={{ ...TYPE.title, fontSize: 148, color: COLOR.ink, transform: `translateY(${-out * 40}px)`, opacity: 1 - out }}>
                <Chars text={f.word} t={local} start={0.18} stagger={0.03} dur={0.6} />
              </div>
            </div>
            <div style={{ position: 'absolute', left: 120, top: WORD_Y + 40, width: 500 }}>
              <MaskLine p={inP} out={out}>
                <div style={{ ...TYPE.italic, fontSize: 34, color: ink(0.82) }}>{r.name}</div>
              </MaskLine>
              <div style={{ ...TYPE.micro, fontSize: 13, color: ink(0.5), marginTop: 16, opacity: clamp01(inP * 1.5) * (1 - out), fontVariantNumeric: 'tabular-nums' }}>
                {formatDeg(r.center.lat, 'lat')}&nbsp;&nbsp;{formatDeg(r.center.lng, 'lng')}
              </div>
            </div>
            <svg width={width} height={height} style={{ position: 'absolute', inset: 0, opacity: 1 - out }}>
              <path d={`M${x0} ${yL}L${x1} ${yL}L${x1 + (sx - x1) * EASE.outExpo(lineP)} ${yL + (sy - yL) * EASE.outExpo(lineP)}`} fill="none" stroke={ink(0.5)} strokeWidth={1} />
              <circle cx={sx} cy={sy} r={5 + 10 * (1 - lineP)} fill="none" stroke={ink(0.8 * lineP)} strokeWidth={1} />
              <circle cx={sx} cy={sy} r={2.2} fill={COLOR.ink} opacity={lineP} />
            </svg>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
