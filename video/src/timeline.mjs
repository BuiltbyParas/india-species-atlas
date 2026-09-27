/**
 * Lines on the Map — the promotional film's running order.
 *
 * This file is the single source of truth for the film. The stage draws from
 * it, the audio is synthesised against it, QC checks it and the production
 * report is written from it. It is plain JavaScript with JSDoc types so that
 * both the browser stage (via Vite) and the Node render scripts can import it.
 *
 * Every frame of the film is a pure function of time, so any shot or sequence
 * can be rendered on its own and will match the full render exactly.
 *
 * Provenance is recorded per layer: `real` means the geometry or fact comes
 * from a cited dataset; `illustrative` means it is a drawing device and is
 * labelled as one, on screen where it could be mistaken for data, and in the
 * credits.
 */

export const TITLE = 'Lines on the Map';
export const SUBTITLE = 'Mapping Endangered Species & Conservation Status in India';
export const SITE_URL = 'builtbyparas.github.io/india-species-atlas';

export const FPS = 60;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** The score's tempo. Shot boundaries sit on the bar grid (one bar = 2.5 s). */
export const BPM = 96;
export const BAR = (60 / BPM) * 4;

/**
 * @typedef {'real' | 'illustrative'} Provenance
 * @typedef {{ name: string, provenance: Provenance, source: string }} Layer
 * @typedef {{ type: 'cut' | 'dissolve' | 'fade-from-black' | 'flash', duration?: number }} Transition
 * @typedef {{
 *   id: string,
 *   seq: string,
 *   start: number,
 *   end: number,
 *   scene: string,
 *   title: string,
 *   camera: string,
 *   assets: string[],
 *   layers: Layer[],
 *   sound: string[],
 *   transitionIn: Transition,
 *   slot?: string,
 *   grade?: string,
 * }} Shot
 */

const FONTS = ['fonts/newsreader.woff2', 'fonts/newsreader-italic.woff2', 'fonts/geist.woff2'];
const STATES = '../public/india-states.geojson';
const ETOPO = ['data/etopo-india.bin', 'data/etopo-india.json'];
const ETOPO_HIMALAYA = ['data/etopo-himalaya.bin', 'data/etopo-himalaya.json'];

/** @type {Record<string, Layer>} */
const L = {
  relief: { name: 'Relief', provenance: 'real', source: 'NOAA ETOPO1 (2 arc-minute subsample)' },
  reliefHimalaya: { name: 'Relief, western Himalaya', provenance: 'real', source: 'NOAA ETOPO1 (1 arc-minute)' },
  states: { name: 'State boundaries', provenance: 'real', source: 'India Species Atlas india-states.geojson' },
  rivers: { name: 'Rivers', provenance: 'real', source: 'Natural Earth 1:10m rivers (public domain)' },
  roads: { name: 'Major roads', provenance: 'real', source: 'Natural Earth 1:10m roads (public domain)' },
  localities: { name: 'Indicative localities', provenance: 'real', source: 'India Species Atlas species.ts distributionPoints' },
  statesOfRecord: { name: 'States of record', provenance: 'real', source: 'India Species Atlas species.ts states' },
  status: { name: 'IUCN status', provenance: 'real', source: 'India Species Atlas species.ts status (IUCN Red List)' },
  photo: { name: 'Photograph', provenance: 'real', source: 'Wikimedia Commons, credited in the film and in CREDITS.md' },
  cable: { name: 'Power line close-up', provenance: 'illustrative', source: 'Drawn for the film' },
  pylons: { name: 'Pylons on grassland', provenance: 'illustrative', source: 'Drawn for the film' },
  road: { name: 'Road at dusk', provenance: 'illustrative', source: 'Drawn for the film' },
  water: { name: 'River surface', provenance: 'illustrative', source: 'Drawn for the film' },
  powerLineOnMap: { name: 'Power line on the map', provenance: 'illustrative', source: 'Drawing device; labelled on screen' },
  reserveLinks: { name: 'Links between reserves', provenance: 'illustrative', source: 'Drawing device joining named reserves; labelled on screen' },
  barrageBreaks: { name: 'Breaks in the river network', provenance: 'illustrative', source: 'Drawing device, not barrage positions; labelled on screen' },
  threads: { name: 'Threads between localities', provenance: 'illustrative', source: 'Reading device used on the atlas home page' },
  snow: { name: 'Falling snow, haze', provenance: 'illustrative', source: 'Atmosphere drawn for the film' },
};

/** @type {Shot[]} */
export const SHOTS = [
  {
    id: 'S01', seq: 'hook', start: 0, end: 5, scene: 'cable', title: 'The line',
    camera: 'Macro, slow drift; the cable pulls taut and flattens into a map line',
    assets: [...FONTS], layers: [L.cable], sound: ['room', 'hum'],
    transitionIn: { type: 'fade-from-black', duration: 1.2 }, slot: 'footage/S01.mp4', grade: 'dusk',
  },
  {
    id: 'S02', seq: 'world', start: 5, end: 7.5, scene: 'pylons', title: 'Pylons on grassland',
    camera: 'Low-angle lateral track, foreground parallax',
    assets: [], layers: [L.pylons], sound: ['hum', 'wind', 'grass'],
    transitionIn: { type: 'cut' }, slot: 'footage/S02.mp4', grade: 'dawn',
  },
  {
    id: 'S03', seq: 'world', start: 7.5, end: 12.5, scene: 'india-reveal', title: 'India',
    camera: 'Top-down over the Thar, fast pull-out to the whole subcontinent',
    assets: [...ETOPO, STATES, ...FONTS], layers: [L.relief, L.states], sound: ['wind', 'tone'],
    transitionIn: { type: 'dissolve', duration: 0.5 }, grade: 'map',
  },
  {
    id: 'S04', seq: 'bustard', start: 12.5, end: 16, scene: 'photo:great-indian-bustard', title: 'Great Indian Bustard',
    camera: 'Slow push-in, rack focus in',
    assets: ['species/great-indian-bustard.jpg', ...FONTS], layers: [L.photo, L.status], sound: ['wind', 'grass'],
    transitionIn: { type: 'cut' }, grade: 'photo',
  },
  {
    id: 'S05', seq: 'bustard', start: 16, end: 20, scene: 'map:bustard', title: 'Where the bustard lives',
    camera: 'Oblique over western Rajasthan and Kutch, slow orbit',
    assets: [...ETOPO, STATES, 'data/roads.geojson', ...FONTS],
    layers: [L.relief, L.statesOfRecord, L.localities, L.powerLineOnMap], sound: ['hum', 'wind'],
    transitionIn: { type: 'dissolve', duration: 0.4 }, grade: 'map',
  },
  {
    id: 'S06', seq: 'tiger', start: 20, end: 21.75, scene: 'road', title: 'The road',
    camera: 'Vehicle level, then tilt down to top-down',
    assets: [], layers: [L.road], sound: ['road', 'impact'],
    transitionIn: { type: 'cut' }, slot: 'footage/S06.mp4', grade: 'night',
  },
  {
    id: 'S07', seq: 'tiger', start: 21.75, end: 25, scene: 'map:tiger', title: 'Roads through tiger country',
    camera: 'Top-down resolving to oblique over the central Indian highlands',
    assets: [...ETOPO, STATES, 'data/roads.geojson', ...FONTS],
    layers: [L.relief, L.roads, L.localities, L.reserveLinks], sound: ['road', 'tone'],
    transitionIn: { type: 'cut' }, grade: 'map',
  },
  {
    id: 'S08', seq: 'tiger', start: 25, end: 27.5, scene: 'photo:bengal-tiger', title: 'Bengal Tiger',
    camera: 'Slow lateral drift',
    assets: ['species/bengal-tiger.jpg', ...FONTS], layers: [L.photo, L.status], sound: [],
    transitionIn: { type: 'dissolve', duration: 0.35 }, grade: 'photo',
  },
  {
    id: 'S09', seq: 'dolphin', start: 27.5, end: 29.5, scene: 'water', title: 'The river',
    camera: 'Follows the current, tilts up',
    assets: [], layers: [L.water], sound: ['water'],
    transitionIn: { type: 'dissolve', duration: 0.5 }, slot: 'footage/S09.mp4', grade: 'river',
  },
  {
    id: 'S10', seq: 'dolphin', start: 29.5, end: 32.5, scene: 'map:dolphin', title: 'The river network divides',
    camera: 'Follows the Ganga downstream, oblique',
    assets: [...ETOPO, STATES, 'data/rivers.geojson', ...FONTS],
    layers: [L.relief, L.rivers, L.localities, L.barrageBreaks], sound: ['water', 'tone'],
    transitionIn: { type: 'dissolve', duration: 0.5 }, grade: 'map',
  },
  {
    id: 'S11', seq: 'dolphin', start: 32.5, end: 35, scene: 'photo:ganges-river-dolphin', title: 'Ganges River Dolphin',
    camera: 'Slow push-in',
    assets: ['species/ganges-river-dolphin.jpg', ...FONTS], layers: [L.photo, L.status], sound: ['water'],
    transitionIn: { type: 'dissolve', duration: 0.35 }, grade: 'photo',
  },
  {
    id: 'S12', seq: 'snow-leopard', start: 35, end: 39.5, scene: 'himalaya', title: 'The high Himalaya',
    camera: 'Low oblique along the ridges, slow push through haze',
    assets: [...ETOPO_HIMALAYA, ...FONTS], layers: [L.reliefHimalaya, L.snow], sound: ['mountain'],
    transitionIn: { type: 'dissolve', duration: 0.8 }, grade: 'cold',
  },
  {
    id: 'S13', seq: 'snow-leopard', start: 39.5, end: 42, scene: 'map:snow-leopard', title: 'Contours become the map',
    camera: 'Rises to top-down; contours resolve into the map',
    assets: [...ETOPO_HIMALAYA, ...ETOPO, STATES, ...FONTS],
    layers: [L.reliefHimalaya, L.statesOfRecord, L.localities], sound: ['mountain', 'tone'],
    transitionIn: { type: 'cut' }, grade: 'cold',
  },
  {
    id: 'S14', seq: 'snow-leopard', start: 42, end: 45, scene: 'photo:snow-leopard', title: 'Snow Leopard',
    camera: 'Very slow push, held',
    assets: ['species/snow-leopard.jpg', ...FONTS], layers: [L.photo, L.status], sound: ['mountain'],
    transitionIn: { type: 'dissolve', duration: 0.6 }, grade: 'cold-photo',
  },
  {
    id: 'S15', seq: 'rhino', start: 45, end: 47.5, scene: 'photo:indian-rhinoceros', title: 'Greater One-horned Rhinoceros',
    camera: 'Slow push-in',
    assets: ['species/indian-rhinoceros.jpg', ...FONTS], layers: [L.photo, L.status], sound: ['impact'],
    transitionIn: { type: 'cut' }, grade: 'photo',
  },
  {
    id: 'S16', seq: 'rhino', start: 47.5, end: 50, scene: 'montage', title: 'Kaziranga, then the five',
    camera: 'Floodplain map, then match cuts on a single line, accelerating',
    assets: [...ETOPO, STATES, 'data/rivers.geojson',
      'species/great-indian-bustard.jpg', 'species/bengal-tiger.jpg', 'species/ganges-river-dolphin.jpg',
      'species/snow-leopard.jpg', 'species/indian-rhinoceros.jpg', ...FONTS],
    layers: [L.relief, L.rivers, L.localities, L.photo], sound: ['ticks'],
    transitionIn: { type: 'cut' }, grade: 'map',
  },
  {
    id: 'S17', seq: 'idea', start: 50, end: 56, scene: 'converge', title: 'Every line on one map',
    camera: 'Oblique over the whole country, settling to top-down',
    assets: [...ETOPO, STATES, 'data/rivers.geojson', 'data/roads.geojson', ...FONTS],
    layers: [L.relief, L.states, L.rivers, L.roads, L.localities, L.threads, L.status], sound: ['impact', 'tone'],
    transitionIn: { type: 'cut' }, grade: 'map',
  },
  {
    id: 'S18', seq: 'title', start: 56, end: 64, scene: 'title', title: 'Title',
    camera: 'Locked off; the map quiets under the title',
    assets: [...ETOPO, STATES, ...FONTS], layers: [L.relief, L.states], sound: ['impact'],
    transitionIn: { type: 'cut' }, grade: 'map',
  },
  {
    id: 'S19', seq: 'credits', start: 64, end: 69, scene: 'credits', title: 'Credits',
    camera: 'Locked off',
    assets: [...FONTS], layers: [], sound: ['room'],
    transitionIn: { type: 'cut' },
  },
];

export const DURATION = SHOTS[SHOTS.length - 1].end;

/** Sequence names in running order, for `video:sequence`. */
export const SEQUENCES = [...new Set(SHOTS.map((s) => s.seq))];

/**
 * @typedef {{ species: string, field: string, must: string[] }} Claim
 * @typedef {{ id: string, at: number, text: string, claim: Claim | null, note?: string }} VoiceLine
 */

/**
 * The narration: 86 words. Every factual line names the dataset field it is
 * taken from and phrases that field must contain; QC checks them against the
 * live data, so if the dataset changes the film fails its check rather than
 * saying something the atlas no longer says.
 *
 * @type {VoiceLine[]}
 */
export const VOICE = [
  { id: 'V1', at: 1.5, text: 'Every line changes a landscape.', claim: null, note: 'Hook line from the brief' },
  {
    id: 'V2', at: 12.9, text: 'In the Thar, power lines are now the biggest killer of the Great Indian Bustard.',
    claim: { species: 'great-indian-bustard', field: 'threatNote', must: ['power lines crossing the Thar', 'single largest cause of mortality'] },
  },
  {
    id: 'V3', at: 20.35, text: 'Roads, railways and mines cut through the tiger’s forests.',
    claim: { species: 'bengal-tiger', field: 'threatNote', must: ['fragmentation of forest', 'roads, railways, mining'] },
  },
  {
    id: 'V4', at: 28.1, text: 'Dams and barrages split the river dolphin’s population.',
    claim: { species: 'ganges-river-dolphin', field: 'threatNote', must: ['Dams and barrages fragment the population'] },
  },
  {
    id: 'V5', at: 36.3, text: 'Above the treeline, the snow leopard’s alpine zone is shrinking.',
    claim: { species: 'snow-leopard', field: 'threatNote', must: ['shrinking alpine zone'] },
  },
  {
    id: 'V6', at: 45.2, text: 'More than two-thirds of the world’s one-horned rhinos live in a single park.',
    claim: { species: 'indian-rhinoceros', field: 'description', must: ['more than two-thirds of the world population is in a single park'] },
  },
  {
    id: 'V7', at: 50.35, text: 'Mapping is not just about where species are. It is about where we choose to protect them.',
    claim: null, note: 'The atlas home page’s closing line, verbatim',
  },
  { id: 'V8', at: 57.2, text: 'Lines on the Map.', claim: null, note: 'Title' },
];

/** The five featured species, in running order. */
export const FEATURED = ['great-indian-bustard', 'bengal-tiger', 'ganges-river-dolphin', 'snow-leopard', 'indian-rhinoceros'];

/**
 * Shot at time t (the last shot owns t = DURATION).
 * @param {number} t
 * @returns {Shot}
 */
export function shotAt(t) {
  for (const s of SHOTS) if (t >= s.start && t < s.end) return s;
  return SHOTS[SHOTS.length - 1];
}

/**
 * Frame index range [first, last) for a time span, at the film's rate.
 * @param {number} start
 * @param {number} end
 * @returns {[number, number]}
 */
export function frameRange(start, end, fps = FPS) {
  return [Math.round(start * fps), Math.round(end * fps)];
}
