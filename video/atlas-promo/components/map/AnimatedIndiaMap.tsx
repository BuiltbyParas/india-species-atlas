/**
 * The India map as the film draws it: one SVG, every layer driven by a
 * MapState (see timeline.ts → mapStateAt). Reusable — give it any state and
 * any viewport size (the 9:16 cut passes a portrait viewport).
 *
 * Geometry: public/india-states.geojson through the site's projection (see
 * data/geo.ts). Strokes use non-scaling-stroke so hairlines stay hairlines at
 * every zoom; markers are drawn in screen space for the same reason.
 */
import { useMemo } from 'react';
import { smoothPath } from '../../../../src/geo/india';
import { staticFile } from 'remotion';
import { STATES, project, useGeoLayers, RASTERS, MAP_WIDTH, MAP_HEIGHT } from '../../data/geo';
import { SPECIES } from '../../data/atlas';
import type { MapState } from '../../timeline';
import { COLOR, MAP_STYLE, withAlpha, ink } from '../../styles/tokens';
import { isOn } from '../../utils/quality';
import { mapTransform, driftOf, toScreen, pointDrift, scaleOf, type Viewport } from './camera';

const NS = { vectorEffect: 'non-scaling-stroke' as const };

/** Graticule: every 1° faint, every 5° stronger, over the map's whole sheet. */
const GRATICULE = (() => {
  let minor = '';
  let major = '';
  for (let lng = 30; lng <= 135; lng++) {
    const [x0, y0] = project(lng, 70);
    const [x1, y1] = project(lng, -30);
    const seg = `M${x0.toFixed(1)} ${y0.toFixed(1)}L${x1.toFixed(1)} ${y1.toFixed(1)}`;
    if (lng % 5 === 0) major += seg;
    else minor += seg;
  }
  for (let lat = -30; lat <= 70; lat++) {
    const [x0, y0] = project(30, lat);
    const [x1, y1] = project(135, lat);
    const seg = `M${x0.toFixed(1)} ${y0.toFixed(1)}L${x1.toFixed(1)} ${y1.toFixed(1)}`;
    if (lat % 5 === 0) major += seg;
    else minor += seg;
  }
  return { minor, major };
})();

/** Each species' localities joined west to east, as the site's drawn lines do. */
const SPECIES_LINES = SPECIES.map((s) => ({
  id: s.id,
  d: smoothPath([...s.distributionPoints].sort((a, b) => a.lng - b.lng).map((p) => project(p.lng, p.lat))),
}));

/** A baked map-sheet raster, placed in map units. */
function Raster({ src, opacity }: { src: string; opacity: number }) {
  return <image href={staticFile(src)} x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} opacity={opacity} preserveAspectRatio="none" />;
}

export function AnimatedIndiaMap({ state, viewport }: { state: MapState; viewport: Viewport }) {
  const layers = useGeoLayers();
  const { camera: cam, fragment } = state;
  const transform = mapTransform(cam, viewport);
  const s = scaleOf(cam, viewport);

  const tints = useMemo(() => {
    const m = new Map<string, { hex: string; a: number }>();
    for (const t of state.tints) {
      const prev = m.get(t.name);
      if (!prev || t.a > prev.a) m.set(t.name, { hex: t.hex, a: t.a });
    }
    return m;
  }, [state.tints]);

  if (state.alpha <= 0.001) return null;

  const outlineDash = Math.max(0, Math.min(1, state.outlineDraw));
  const pieces = fragment > 0.001;

  return (
    <svg width={viewport.width} height={viewport.height} style={{ position: 'absolute', inset: 0, opacity: state.alpha }}>
      <defs>
        {/* A soft-edged wipe would need a mask; a clip rect is far cheaper and the river line hides the edge. */}
        <clipPath id="rivers-wipe">
          <rect x={0} y={0} width={MAP_WIDTH * state.riversDraw} height={MAP_HEIGHT} />
        </clipPath>
      </defs>

      <g transform={transform}>
        {/* Graticule */}
        {state.graticule > 0 && (
          <g opacity={state.graticule}>
            <path d={GRATICULE.minor} fill="none" stroke={MAP_STYLE.graticule.color} strokeWidth={0.5} style={NS} />
            <path d={GRATICULE.major} fill="none" stroke="rgba(134,165,147,0.2)" strokeWidth={0.7} style={NS} />
          </g>
        )}

        {/* Land, one path per state so the map can come apart and back together */}
        {state.fill > 0 &&
          STATES.map((st) => {
            const [dx, dy] = driftOf(st, fragment);
            const tint = tints.get(st.name);
            return (
              <g key={st.name} transform={pieces ? `translate(${dx} ${dy})` : undefined}>
                <path d={st.d} fill={withAlpha(COLOR.panel, 0.92 * state.fill)} />
                {tint && <path d={st.d} fill={withAlpha(tint.hex, tint.a)} />}
              </g>
            );
          })}

        {/* Relief: NOAA ETOPO1 hillshade, baked and clipped to India by prep-geo.mjs */}
        {isOn('relief') && state.relief > 0 && !pieces && <Raster src={RASTERS.relief} opacity={state.relief} />}

        {/* Tinted states' own edges, so a highlight reads as a shape, not a wash */}
        {state.tints.length > 0 &&
          [...tints.entries()].map(([name, tint]) => {
            const st = STATES.find((x) => x.name === name);
            if (!st) return null;
            const [dx, dy] = driftOf(st, fragment);
            return (
              <path
                key={`edge-${name}`}
                d={st.d}
                transform={pieces ? `translate(${dx} ${dy})` : undefined}
                fill="none"
                stroke={withAlpha(tint.hex, Math.min(1, tint.a * 3.2))}
                strokeWidth={1.1}
                strokeLinejoin="round"
                style={NS}
              />
            );
          })}

        {/* Relief: NOAA ETOPO1 isolines; the ≥3,000 m set lifted on its own for the Himalaya */}
        {isOn('contours') && state.contours > 0 && fragment < 0.6 && (
          <g opacity={1 - fragment / 0.6}>
            <Raster src={RASTERS.contoursLow} opacity={Math.min(1, state.contours * 0.55)} />
            <Raster src={RASTERS.contoursHigh} opacity={Math.min(1, state.contours * (0.6 + 0.4 * state.highContours))} />
          </g>
        )}

        {/* Rivers: Natural Earth, traced on west to east in the river beat */}
        {isOn('rivers') && state.riversAlpha > 0 && state.riversDraw > 0 && !pieces && (
          <g clipPath={state.riversDraw < 1 ? 'url(#rivers-wipe)' : undefined}>
            <Raster src={RASTERS.rivers} opacity={state.riversAlpha} />
          </g>
        )}

        {/* State borders: faint inside the country; the pieces' own edges when fragmented */}
        {state.borders > 0 &&
          STATES.map((st) => {
            const [dx, dy] = driftOf(st, fragment);
            return (
              <path
                key={st.name}
                d={st.d}
                transform={pieces ? `translate(${dx} ${dy})` : undefined}
                fill="none"
                stroke={pieces ? ink(0.16 + 0.4 * fragment) : MAP_STYLE.border.color}
                strokeWidth={pieces ? 0.8 : MAP_STYLE.border.width}
                strokeLinejoin="round"
                opacity={state.borders}
                style={NS}
              />
            );
          })}

        {/* The outer outline: derived from the same file, traced on as one line */}
        {layers && state.outlineAlpha > 0 && (
          <g opacity={state.outlineAlpha * (1 - Math.min(1, fragment * 1.6))}>
            {layers.outline.map((o, i) => (
              <path
                key={i}
                d={o.d}
                fill="none"
                stroke={COLOR.ink}
                strokeWidth={i === 0 ? MAP_STYLE.outline.width : 1}
                strokeLinejoin="round"
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray="1 1"
                strokeDashoffset={1 - outlineDash}
                style={NS}
              />
            ))}
          </g>
        )}

        {/* Species lines: localities joined; dashed apart while the map fragments */}
        {state.lines.alpha > 0 && state.lines.draw > 0 && (
          <g opacity={state.lines.alpha}>
            {SPECIES_LINES.map((l) => {
              const sp = SPECIES.find((x) => x.id === l.id)!;
              const broken = state.lines.broken;
              const dash = broken > 0.01 ? `${(0.05 * (1 - 0.7 * broken)).toFixed(4)} ${(0.012 + 0.07 * broken).toFixed(4)}` : '1 1';
              const offset = broken > 0.01 ? 0 : 1 - state.lines.draw;
              return (
                <path
                  key={l.id}
                  d={l.d}
                  fill="none"
                  stroke={withAlpha(COLOR.status[sp.status], 0.9)}
                  strokeWidth={0.9}
                  pathLength={1}
                  strokeDasharray={dash}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  style={NS}
                />
              );
            })}
          </g>
        )}
      </g>

      {/* Screen-space marks: constant size at every zoom */}
      <g>
        {state.programmes.map((p) => {
          if (p.p <= 0.001) return null;
          const [dx, dy] = pointDrift(p.key, p.x, p.y, fragment);
          const [sx, sy] = toScreen(p.x + dx, p.y + dy, cam, viewport);
          const r = 10 * Math.min(1.3, Math.max(0.9, s));
          return (
            <g key={p.key} transform={`translate(${sx} ${sy})`} opacity={p.p}>
              {p.ripple >= 0 && <circle r={r + 34 * p.ripple} fill="none" stroke={withAlpha(COLOR.protect, 0.9 * (1 - p.ripple))} strokeWidth={1.2} />}
              <rect x={-r / 2} y={-r / 2} width={r} height={r} transform="rotate(45)" fill={withAlpha(COLOR.protect, 0.28)} stroke={COLOR.protect} strokeWidth={1.6} />
            </g>
          );
        })}
        {state.markers.map((m) => {
          if (m.p <= 0.001) return null;
          const [dx, dy] = pointDrift(m.key, m.x, m.y, fragment);
          const [sx, sy] = toScreen(m.x + dx, m.y + dy, cam, viewport);
          const r = (3.2 + 2.2 * m.focus) * (0.6 + 0.4 * m.p);
          return (
            <g key={m.key} transform={`translate(${sx} ${sy})`} opacity={Math.min(1, m.p * 1.2)}>
              {m.ripple >= 0 && (
                <circle r={r + 30 * m.ripple} fill="none" stroke={withAlpha(m.hex, 0.85 * (1 - m.ripple))} strokeWidth={1} />
              )}
              {m.focus > 0.01 && <circle r={r + 7} fill="none" stroke={withAlpha(m.hex, 0.55 * m.focus)} strokeWidth={1} />}
              <circle r={r} fill={m.hex} stroke={COLOR.ground} strokeWidth={1.2} />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
