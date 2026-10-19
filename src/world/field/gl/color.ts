import * as THREE from 'three';

/**
 * Colours for the field studies' shaders, as plain sRGB triples.
 *
 * The field stage renders with no colour management: its shaders write the
 * palette's sRGB values straight to the screen, the way the CSS does, so a
 * line drawn in WebGL and a line drawn in SVG with the same token are the
 * same colour. `THREE.Color` would convert to linear on the way in, which is
 * right for lit PBR scenes and wrong for this. Hence this helper.
 */
export function rgb(hex: string): THREE.Vector3 {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/**
 * A colour as linear light, times `k`. Worlds that render through the film (gl/look.ts) light their scenes in
 * linear values — a sun of 3, a snowfield's albedo of 0.8 — and the film's curve brings them to the screen.
 */
export function lin(hex: string, k = 1): THREE.Vector3 {
  const c = rgb(hex);
  const f = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)) * k;
  return c.set(f(c.x), f(c.y), f(c.z));
}

/** The atlas palette the worlds draw with (index.css tokens and environment lines). */
export const PALETTE = {
  canvas: '#e8e1cf',
  night: '#0e1411',
  contour: '#b07a52',
  river: '#7ea3b5',
  protect: '#7ea3b5',
  tharLine: '#d1a06a',
  ice: '#a9c6d3',
  moss: '#86a593',
  statusCR: '#d64545',
} as const;
