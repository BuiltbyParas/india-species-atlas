/**
 * 01 · Black / signal. Near-black; a crosshair and the atlas's own extent in
 * degrees; a longitude ruler draws across the frame — the film's line — and
 * INDIA rises off it. INDIA then shrinks into the corner label that scene 02
 * keeps, so the two scenes join without a cut.
 */
import { AbsoluteFill } from 'remotion';
import { formatDeg } from '../../../src/geo/india';
import { EXTENT } from '../data/geo';
import { TYPE, COLOR, ink, EASE } from '../styles/tokens';
import { useTime, prog, clamp01, hash01, lerp } from '../utils/anim';
import { Tracked } from '../components/type/Type';
import { INDIA_LABEL } from './shared';

/** Digits settle from seeded noise to their value: a reading being taken. */
function settle(text: string, p: number, seed: number) {
  if (p >= 1) return text;
  return [...text]
    .map((ch, i) => (/[0-9]/.test(ch) && hash01(i * 7 + seed) > p ? String(Math.floor(hash01(i + seed * 13 + Math.floor(p * 18)) * 10)) : ch))
    .join('');
}

const W = 1920;
const H = 1080;
const LINE_Y = 640;

export function S01Signal() {
  const t = useTime();
  const cross = prog(t, 0.4, 0.8, 'outExpo');
  const readP = prog(t, 0.7, 1.2, 'linear');
  const rule = prog(t, 0.9, 1.5, 'cinema');
  const india = prog(t, 2.35, 1.4);
  // The hand-off: INDIA shrinks to scene 02's corner label.
  const shrink = prog(t, 4.15, 1.05, 'cinema');
  const fadeAll = 1 - prog(t, 4.0, 0.7, 'inOutSine');
  const lat = `${formatDeg(EXTENT.minLat, 'lat')} — ${formatDeg(EXTENT.maxLat, 'lat')}`;
  const lng = `${formatDeg(EXTENT.minLng, 'lng')} — ${formatDeg(EXTENT.maxLng, 'lng')}`;

  // Ruler ticks: one per degree of longitude across the atlas's extent.
  const lng0 = Math.floor(EXTENT.minLng);
  const lng1 = Math.ceil(EXTENT.maxLng);
  const ticks = Array.from({ length: lng1 - lng0 + 1 }, (_, i) => lng0 + i);

  const heroSize = lerp(TYPE.hero.fontSize, INDIA_LABEL.size, EASE.cinema(shrink));
  const heroX = lerp(W / 2, INDIA_LABEL.x, shrink);
  const heroY = lerp(LINE_Y, INDIA_LABEL.y, shrink);
  const camera = 1.06 - 0.06 * prog(t, 2.3, 2.6, 'inOutSine');

  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', inset: 0, opacity: fadeAll }}>
        {/* Crosshair at the frame centre */}
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          <g transform={`translate(${W / 2} ${H / 2 - 120})`} opacity={cross * (1 - prog(t, 2.2, 0.6))}>
            <path d={`M${-22 * cross} 0L${22 * cross} 0M0 ${-22 * cross}L0 ${22 * cross}`} stroke={ink(0.7)} strokeWidth={1} />
            <circle r={9} fill="none" stroke={ink(0.35)} strokeWidth={1} opacity={cross} />
          </g>
          {/* The longitude ruler */}
          <g opacity={1 - prog(t, 3.2, 0.9, 'inOutSine')}>
            <line x1={120} x2={120 + (W - 240) * rule} y1={LINE_Y} y2={LINE_Y} stroke={ink(0.55)} strokeWidth={1} />
            {ticks.map((d, i) => {
              const x = 120 + ((W - 240) * i) / (ticks.length - 1);
              const on = clamp01((rule * (ticks.length - 1) - i) * 1.5);
              const major = d % 5 === 0;
              return (
                <g key={d} opacity={on}>
                  <line x1={x} x2={x} y1={LINE_Y} y2={LINE_Y + (major ? 12 : 6)} stroke={ink(major ? 0.55 : 0.3)} strokeWidth={1} />
                  {major && (
                    <text x={x} y={LINE_Y + 34} fill={ink(0.42)} textAnchor="middle" style={{ ...TYPE.micro, fontSize: 12, letterSpacing: '0.12em' }}>
                      {d}°E
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* The atlas's extent, read from the boundary file */}
        <div style={{ position: 'absolute', left: 120, top: 120, ...TYPE.micro, color: ink(0.55), opacity: clamp01(readP * 3) * (1 - prog(t, 3.0, 0.8)) }}>
          <div style={{ color: ink(0.35), marginBottom: 10 }}>Latitude</div>
          <div style={{ fontVariantNumeric: 'tabular-nums' }}>{settle(lat, readP, 3)}</div>
        </div>
        <div style={{ position: 'absolute', right: 120, top: 120, textAlign: 'right', ...TYPE.micro, color: ink(0.55), opacity: clamp01((readP - 0.15) * 3) * (1 - prog(t, 3.0, 0.8)) }}>
          <div style={{ color: ink(0.35), marginBottom: 10 }}>Longitude</div>
          <div style={{ fontVariantNumeric: 'tabular-nums' }}>{settle(lng, readP, 9)}</div>
        </div>
      </div>

      {/* INDIA rises off the line, then becomes scene 02's corner label */}
      {t < INDIA_LABEL.handoff && (
        <div
          style={{
            position: 'absolute',
            left: heroX,
            top: heroY,
            transform: `translate(${-50 * (1 - shrink)}%, -100%) scale(${camera})`,
            transformOrigin: '50% 100%',
            overflow: shrink > 0 ? 'visible' : 'hidden',
            paddingTop: 40,
          }}
        >
          <div style={{ transform: `translateY(${(1 - EASE.outExpo(india)) * 100}%)` }}>
            <Tracked text="INDIA" p={india} from={0.5} to={-0.02 + 0.2 * shrink} style={{ ...TYPE.hero, fontSize: heroSize, color: COLOR.ink, display: 'block', lineHeight: 0.8 }} />
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
}
