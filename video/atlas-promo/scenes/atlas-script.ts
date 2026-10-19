/**
 * The product scene's script: which real interface plate is on screen when,
 * where the camera looks inside it, and where the cursor goes. Times are in
 * seconds from the start of the Atlas scene.
 *
 * Every plate is a screenshot of a real state of the site (see
 * scripts/video/atlas-promo/capture-ui.mjs), and every cursor target names a
 * rectangle recorded from the real element in that screenshot — so the film
 * clicks exactly where the site's own button is.
 */
import type { EaseName } from '../styles/tokens';

export type PlateId =
  | 'home'
  | 'atlas'
  | 'atlas-popup'
  | 'profile-overview'
  | 'profile-distribution'
  | 'profile-threats'
  | 'profile-conservation'
  | 'atlas-threats'
  | 'atlas-conservation';

/** Plates in order, each from its start time until the next one's. */
export const PLATES: Array<{ t: number; id: PlateId; via?: 'cut' | 'fade' | 'drawer' }> = [
  { t: 0.0, id: 'home' },
  { t: 2.2, id: 'atlas', via: 'fade' },
  { t: 3.85, id: 'atlas-popup', via: 'cut' },
  { t: 4.95, id: 'profile-overview', via: 'drawer' },
  { t: 7.35, id: 'profile-distribution', via: 'cut' },
  { t: 8.95, id: 'profile-threats', via: 'cut' },
  { t: 10.55, id: 'profile-conservation', via: 'cut' },
  { t: 11.7, id: 'atlas', via: 'fade' },
  { t: 12.25, id: 'atlas-threats', via: 'cut' },
  { t: 13.0, id: 'atlas-conservation', via: 'cut' },
];

/**
 * A point in plate CSS pixels (1920×1080): literal, or the centre of a rect
 * recorded in ui.json, named `<plate>.<rect>` (e.g. `atlas.pin`).
 */
export type Target = { x: number; y: number } | { rect: string; dx?: number; dy?: number };

export interface CursorKey {
  t: number;
  at: Target;
  ease?: EaseName;
}

export const CURSOR_IN = 2.5;
export const CURSOR_OUT = 13.6;

export const CURSOR: CursorKey[] = [
  { t: 2.5, at: { x: 1700, y: 760 } },
  { t: 3.6, at: { rect: 'atlas.pin', dy: -4 }, ease: 'cinema' },
  { t: 4.15, at: { rect: 'atlas.pin', dy: -4 } },
  { t: 4.75, at: { rect: 'atlas-popup.open' }, ease: 'cinema' },
  { t: 5.3, at: { rect: 'atlas-popup.open' } },
  { t: 6.6, at: { x: 1500, y: 560 }, ease: 'inOutSine' },
  { t: 7.2, at: { rect: 'profile-overview.tabDistribution' }, ease: 'cinema' },
  { t: 8.4, at: { rect: 'profile-overview.tabDistribution' } },
  { t: 8.85, at: { rect: 'profile-overview.tabThreats' }, ease: 'cinema' },
  { t: 10.0, at: { rect: 'profile-overview.tabThreats' } },
  { t: 10.45, at: { rect: 'profile-overview.tabConservation' }, ease: 'cinema' },
  { t: 11.4, at: { rect: 'profile-overview.tabConservation' } },
  { t: 12.1, at: { rect: 'atlas.tabThreats' }, ease: 'cinema' },
  { t: 12.45, at: { rect: 'atlas.tabThreats' } },
  { t: 12.9, at: { rect: 'atlas.tabConservation' }, ease: 'cinema' },
];

/** Presses: the site's cursor splash, and a UI click in the sound design. */
export const CLICKS = [3.75, 4.85, 7.3, 8.9, 10.5, 12.2, 12.95];

/** Camera inside the browser: a focus point in plate px, and a zoom (1 = plate fits the frame's width). */
export interface UiCamKey {
  t: number;
  x: number;
  y: number;
  z: number;
  ease?: EaseName;
}

export const UI_CAMERA: UiCamKey[] = [
  { t: 0.0, x: 960, y: 540, z: 1.0 },
  { t: 2.0, x: 960, y: 520, z: 1.04, ease: 'inOutSine' },
  { t: 2.2, x: 1118, y: 610, z: 1.12 },
  { t: 3.7, x: 1080, y: 600, z: 1.45, ease: 'inOutSine' },
  { t: 4.9, x: 1090, y: 570, z: 1.55, ease: 'inOutSine' },
  { t: 5.8, x: 1640, y: 400, z: 1.9, ease: 'cinema' },
  { t: 7.2, x: 1640, y: 430, z: 1.95, ease: 'inOutSine' },
  { t: 7.9, x: 1640, y: 820, z: 2.0, ease: 'cinema' },
  { t: 11.2, x: 1640, y: 840, z: 2.02, ease: 'linear' },
  { t: 11.75, x: 1000, y: 560, z: 1.12, ease: 'cinema' },
  { t: 14.0, x: 1000, y: 600, z: 1.2, ease: 'inOutSine' },
];

/** The kinetic label beside the browser: what the viewer is looking at. */
export const LABELS: Array<{ t: number; index: string; word: string; line: string }> = [
  { t: 0.4, index: '01', word: 'The Atlas', line: 'A working map of threatened species' },
  { t: 2.2, index: '02', word: 'Map', line: 'Every locality, coloured by status' },
  { t: 3.85, index: '03', word: 'Species', line: 'Press a pin to open the record' },
  { t: 4.95, index: '04', word: 'Profile', line: 'Status, habitat and why it matters' },
  { t: 7.35, index: '05', word: 'Distribution', line: 'Where it lives, in words and places' },
  { t: 8.95, index: '06', word: 'Threats', line: 'What presses on it, and why' },
  { t: 10.55, index: '07', word: 'Conservation', line: 'Measures, programmes, protected areas' },
  { t: 11.7, index: '08', word: 'Layers', line: 'Species · Threats · Conservation' },
];
