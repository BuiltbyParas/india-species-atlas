/**
 * Literal palette values.
 *
 * Use these anywhere a colour is written to an SVG presentation attribute,
 * an HTML canvas, a Leaflet vector style or a Recharts prop — none of those
 * resolve CSS custom properties. Keep them in sync with the `@theme` block
 * in `src/index.css`.
 */
export const PALETTE = {
  forest950: '#0a1710',
  forest900: '#0f1f17',
  forest800: '#14261c',
  forest700: '#1c3a2b',
  forest600: '#285a41',
  forest500: '#347d59',
  forest400: '#5aa47e',
  forest300: '#8fc7aa',
  forest200: '#c3e2d3',
  canvas: '#f6f4ec',
  ink: '#14201b',
  inkSoft: '#3d4a44',
  clay: '#b9764a',
} as const;

export const STATUS_HEX = {
  CR: '#d64545',
  EN: '#e0812b',
  VU: '#e6b800',
  NT: '#7a9e3f',
  LC: '#3f8f5c',
  DD: '#3d4a44',
} as const;
