/**
 * Literal palette values.
 *
 * Use these anywhere a colour is written to an SVG presentation attribute,
 * an HTML canvas, a Leaflet vector style or a Recharts prop — none of those
 * resolve CSS custom properties. Keep them in sync with the `@theme` block
 * in `src/index.css`.
 */
export const PALETTE = {
  forest950: '#0e1411',
  forest900: '#131a16',
  forest800: '#1a231e',
  forest700: '#27332c',
  forest600: '#3a4a40',
  forest500: '#50705e',
  forest400: '#86a593',
  forest300: '#afc5b7',
  forest200: '#d6e1d9',
  canvas: '#e8e1cf',
  ink: '#121814',
  inkSoft: '#3d4a44',
  clay: '#b07a52',
  contour: '#b07a52',
  river: '#7ea3b5',
} as const;

export const STATUS_HEX = {
  CR: '#d64545',
  EN: '#e0812b',
  VU: '#e6b800',
  NT: '#7a9e3f',
  LC: '#3f8f5c',
  DD: '#3d4a44',
} as const;
