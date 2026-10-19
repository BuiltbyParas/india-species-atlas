/**
 * 02 · India emerges. The coast is traced from the canonical boundary file
 * (the map layer does that); this scene sets the words beside it: INDIA as a
 * corner label, two lines of section type, and the map's own metadata —
 * its extent, its source and its projection.
 */
import { AbsoluteFill } from 'remotion';
import { formatDeg } from '../../../src/geo/india';
import { EXTENT } from '../data/geo';
import { TYPE, COLOR, ink } from '../styles/tokens';
import { useTime, prog } from '../utils/anim';
import { MaskLine, Label } from '../components/type/Type';
import { INDIA_LABEL, INDIA_LABEL_TAKEOVER, Col, sectionStyle } from './shared';
import { SCENE_DUR } from '../timeline';

const META: Array<[string, string]> = [
  ['Extent', `${formatDeg(EXTENT.minLat, 'lat')} – ${formatDeg(EXTENT.maxLat, 'lat')}`],
  ['', `${formatDeg(EXTENT.minLng, 'lng')} – ${formatDeg(EXTENT.maxLng, 'lng')}`],
  ['Boundaries', 'States and union territories'],
  ['', 'One political map, one file'],
  ['Projection', 'Equirectangular, scaled by cos 22°'],
];

export function IndiaWord({ opacity = 1, y = 0 }: { opacity?: number; y?: number }) {
  return (
    <div style={{ position: 'absolute', left: INDIA_LABEL.x, top: INDIA_LABEL.y, transform: `translate(0, calc(-100% + ${y}px))`, paddingTop: 40, opacity }}>
      <span style={{ ...TYPE.hero, fontSize: INDIA_LABEL.size, letterSpacing: '0.18em', lineHeight: 0.8, display: 'block', color: COLOR.ink }}>INDIA</span>
    </div>
  );
}

export function S02India() {
  const t = useTime();
  const dur = SCENE_DUR.india;
  const out = prog(t, dur - 0.9, 0.8, 'inExpo');
  return (
    <AbsoluteFill>
      {t >= INDIA_LABEL_TAKEOVER && <IndiaWord opacity={1 - out} y={-out * 30} />}
      <Col y={286}>
        <Label p={prog(t, 0.9, 0.9)} style={{ opacity: 1 - out }}>
          The subcontinent
        </Label>
      </Col>
      <Col y={346} width={560}>
        <MaskLine p={prog(t, 2.1, 1.0)} out={out}>
          <div style={sectionStyle}>One country.</div>
        </MaskLine>
        <MaskLine p={prog(t, 3.1, 1.0)} out={out}>
          <div style={{ ...sectionStyle, fontStyle: 'italic', color: ink(0.8) }}>Many landscapes.</div>
        </MaskLine>
      </Col>
      <Col x={1440} y={330} width={360}>
        {META.map(([k, v], i) => {
          const p = prog(t, 1.6 + i * 0.22, 0.9);
          return (
            <div key={i} style={{ marginTop: k && i ? 26 : 6, opacity: p * (1 - out), transform: `translateY(${(1 - p) * 10}px)` }}>
              {k && <div style={{ ...TYPE.micro, fontSize: 12, color: ink(0.38), marginBottom: 8 }}>{k}</div>}
              <div style={{ ...TYPE.micro, fontSize: 14, letterSpacing: '0.12em', color: ink(0.7), textTransform: 'none', fontVariantNumeric: 'tabular-nums' }}>{v}</div>
            </div>
          );
        })}
      </Col>
    </AbsoluteFill>
  );
}
