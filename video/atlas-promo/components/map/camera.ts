/**
 * The map camera: map units → screen pixels, and the drift a state takes
 * when the map fragments. Pure functions, shared by every map layer.
 */
import { BASE_SCALE, type Camera } from '../../timeline';
import { MAP_CENTRE, stateAt, STATES, type StateShape } from '../../data/geo';
import { hash01 } from '../../utils/anim';

export interface Viewport {
  width: number;
  height: number;
}

export const scaleOf = (cam: Camera, vp: Viewport) => BASE_SCALE * cam.z * (vp.height / 1080);

/** The SVG transform that puts map units on screen. */
export function mapTransform(cam: Camera, vp: Viewport): string {
  const s = scaleOf(cam, vp);
  const k = vp.height / 1080;
  return `translate(${vp.width / 2 + cam.ax * k} ${vp.height / 2 + cam.ay * k}) scale(${s}) translate(${-cam.x} ${-cam.y})`;
}

export function toScreen(x: number, y: number, cam: Camera, vp: Viewport): [number, number] {
  const s = scaleOf(cam, vp);
  const k = vp.height / 1080;
  return [vp.width / 2 + cam.ax * k + (x - cam.x) * s, vp.height / 2 + cam.ay * k + (y - cam.y) * s];
}

/**
 * How far a state moves when the map fragments: outward from the centre of
 * the country, with a small seeded variation so the pieces do not move as one
 * rigid explosion. In map units, at fragment = 1.
 */
const DRIFT = new Map<string, [number, number]>(
  STATES.map((s, i) => {
    const dx = s.cx - MAP_CENTRE.x;
    const dy = s.cy - MAP_CENTRE.y;
    const k = 0.075 + 0.05 * hash01(i + 3);
    const j = 6 * (hash01(i + 11) - 0.5);
    return [s.name, [dx * k + j, dy * k - j * 0.6]];
  }),
);

export function driftOf(state: StateShape | string, fragment: number): [number, number] {
  const d = DRIFT.get(typeof state === 'string' ? state : state.name) ?? [0, 0];
  return [d[0] * fragment, d[1] * fragment];
}

/** Drift for a point, by the state it falls in (cached per point). */
const pointState = new Map<string, StateShape>();
export function pointDrift(key: string, x: number, y: number, fragment: number): [number, number] {
  if (fragment <= 0) return [0, 0];
  let s = pointState.get(key);
  if (!s) {
    s = stateAt(x, y);
    pointState.set(key, s);
  }
  return driftOf(s, fragment);
}
