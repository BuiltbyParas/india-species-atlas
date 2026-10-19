/**
 * Design tokens for the promotional film.
 *
 * Every colour comes from the site's own palette (src/theme.ts, mirrored from
 * the @theme block in src/index.css). Colour carries meaning, as it does on
 * the site:
 *
 *   neutral       forest ground, canvas ink, burnt-sienna contour lines
 *   species       the IUCN status colours, only on a species' own marks
 *   threat        the Critically Endangered red, used sparingly
 *   conservation  the prussian "river" blue — on the site, water is "kept for
 *                 what is protected"
 */
import { Easing } from 'remotion';
import { PALETTE, STATUS_HEX } from '../../../src/theme';

export const COLOR = {
  ground: PALETTE.forest950,
  groundRaised: PALETTE.forest900,
  panel: PALETTE.forest800,
  hairline: PALETTE.forest700,
  muted: PALETTE.forest600,
  sage: PALETTE.forest400,
  sageLight: PALETTE.forest300,
  ink: PALETTE.canvas,
  contour: PALETTE.contour,
  river: PALETTE.river,
  /** Land fill on the dark ground: the forest scale, one step up. */
  land: PALETTE.forest900,
  threat: STATUS_HEX.CR,
  protect: PALETTE.river,
  status: STATUS_HEX,
} as const;

/** Ink at an opacity, for hairlines and secondary type. */
export const ink = (a: number) => `rgba(232, 225, 207, ${a})`;
export const withAlpha = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

export const FONT = {
  display: "'Newsreader', Georgia, serif",
  sans: "'Geist', system-ui, sans-serif",
} as const;

/**
 * Type scale at 1920×1080. Display type is Newsreader Light, never bold, with
 * the site's tight heading tracking; labels are Geist 500 uppercase with wide
 * tracking, as on the site's section labels.
 */
export const TYPE = {
  hero: { fontFamily: FONT.display, fontWeight: 300, fontSize: 360, letterSpacing: '-0.045em', lineHeight: 0.84 },
  title: { fontFamily: FONT.display, fontWeight: 300, fontSize: 132, letterSpacing: '-0.03em', lineHeight: 0.92 },
  section: { fontFamily: FONT.display, fontWeight: 300, fontSize: 84, letterSpacing: '-0.02em', lineHeight: 1 },
  heading: { fontFamily: FONT.display, fontWeight: 330, fontSize: 56, letterSpacing: '-0.015em', lineHeight: 1.04 },
  italic: { fontFamily: FONT.display, fontWeight: 300, fontStyle: 'italic', fontSize: 30, letterSpacing: '0', lineHeight: 1.2 },
  body: { fontFamily: FONT.sans, fontWeight: 400, fontSize: 24, letterSpacing: '0', lineHeight: 1.45 },
  data: { fontFamily: FONT.sans, fontWeight: 500, fontSize: 20, letterSpacing: '0.24em', textTransform: 'uppercase' as const },
  micro: { fontFamily: FONT.sans, fontWeight: 500, fontSize: 15, letterSpacing: '0.28em', textTransform: 'uppercase' as const },
  number: { fontFamily: FONT.display, fontWeight: 300, fontSize: 168, letterSpacing: '-0.04em', lineHeight: 0.9, fontVariantNumeric: 'tabular-nums' as const },
} as const;

/** Layout at 1920×1080: a 12-column grid with generous margins. */
export const GRID = {
  width: 1920,
  height: 1080,
  margin: 120,
  marginY: 96,
  columns: 12,
  gutter: 24,
} as const;

export const colX = (col: number) => GRID.margin + col * ((GRID.width - 2 * GRID.margin + GRID.gutter) / GRID.columns);

/** The site's three curves (src/index.css), plus two for camera moves. */
export const EASE = {
  emphasis: Easing.bezier(0.2, 0.75, 0.25, 1),
  cinema: Easing.bezier(0.7, 0, 0.2, 1),
  outExpo: Easing.bezier(0.16, 1, 0.3, 1),
  inExpo: Easing.bezier(0.7, 0, 0.84, 0),
  inOutSine: Easing.bezier(0.37, 0, 0.63, 1),
  linear: (t: number) => t,
} as const;

export type EaseName = keyof typeof EASE;

/** Map drawing styles shared by every map layer in the film. */
export const MAP_STYLE = {
  outline: { color: PALETTE.canvas, width: 1.4 },
  border: { color: 'rgba(232, 225, 207, 0.16)', width: 0.7 },
  graticule: { color: 'rgba(134, 165, 147, 0.10)', width: 0.6 },
  contour: { color: PALETTE.contour, width: 0.7 },
  river: { color: PALETTE.river, width: 1.1 },
} as const;
