/**
 * Lines on the Map — the five-minute documentary.
 *
 * The edit is built on the narration. Each phrase in `doc-script.mjs` has a
 * measured length (`doc-voice.timing.mjs`) and a designed pause before it;
 * laid end to end they give every phrase a start time, and every cut below
 * is anchored to one of those times (`V('N23')` is when phrase N23 begins,
 * `E('N23')` when it ends). Re-voice the film and the edit follows.
 *
 * Shots either draw a documentary scene (`scene`) or play the promo's
 * footage at a new speed (`remap`: promo source seconds `from`→`to` spread
 * across the shot), with documentary layers on top (`overlay`).
 *
 * Every shot also records the production fields a storyboard needs — what
 * we see, the camera, 3D, motion graphics, type, VFX, sound, music, the
 * transition, the data behind it, the assets and how it points to the
 * Atlas. `npm run video:storyboard` writes them to storyboard/shots.yaml.
 */
import { SCRIPT } from './doc-script.mjs';
import * as TIMED from './doc-voice.timing.mjs';

/** @type {Record<string, number>} */
const TIMING = TIMED.TIMING;

export const TITLE = 'Lines on the Map';
export const SUBTITLE = 'Mapping Endangered Species & Conservation Status in India';
export const SITE_URL = 'builtbyparas.github.io/india-species-atlas';
export const EXPORT = { dir: 'exports', name: 'Lines_on_the_Map' };
export const DURATION_RANGE = [270, 330];
export const WORD_RANGE = [550, 700];

export const FPS = 60;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const BPM = 84;
export const BAR = (60 / BPM) * 4;

export const FEATURED = ['great-indian-bustard', 'bengal-tiger', 'ganges-river-dolphin', 'snow-leopard', 'indian-rhinoceros'];

/* --- the voiceover timing system --- */

/** Words per second used for a phrase that has not been timed yet. */
const FALLBACK_WPS = 2.3;
let cursor = 0;
/** @type {Array<import('./doc-script.mjs').Phrase & { at: number, end: number }>} */
export const VOICE = SCRIPT.map((p) => {
  cursor += p.pause;
  const at = cursor;
  cursor += TIMING[p.id] ?? p.text.split(/\s+/).length / FALLBACK_WPS;
  return { ...p, at, end: cursor };
});
const byId = new Map(VOICE.map((v) => [v.id, v]));
/** @param {number} t */
const fr = (t) => Math.round(t * FPS) / FPS;
/** Start of a phrase, on a frame. */
/** @param {string} id */
const V = (id, d = 0) => fr(/** @type {any} */ (byId.get(id)).at + d);
/** End of a phrase, on a frame. */
/** @param {string} id */
const E = (id, d = 0) => fr(/** @type {any} */ (byId.get(id)).end + d);

/* --- provenance --- */

/** @type {Record<string, import('./promo.mjs').Layer>} */
const L = {
  relief: { name: 'Relief', provenance: 'real', source: 'NOAA ETOPO1' },
  states: { name: 'State boundaries', provenance: 'real', source: 'India Species Atlas india-states.geojson' },
  rivers: { name: 'Rivers', provenance: 'real', source: 'Natural Earth 1:10m' },
  roads: { name: 'Roads', provenance: 'real', source: 'Natural Earth 1:10m' },
  world: { name: 'World coastlines and borders', provenance: 'real', source: 'Natural Earth 1:50m' },
  localities: { name: 'Indicative localities', provenance: 'real', source: 'species.ts distributionPoints' },
  statesOfRecord: { name: 'States of record', provenance: 'real', source: 'species.ts states' },
  status: { name: 'IUCN category and year', provenance: 'real', source: 'species.ts status, statusAssessedYear' },
  figures: { name: 'Figures quoted on screen', provenance: 'real', source: 'species.ts / programmes.ts (quoted as written)' },
  programmes: { name: 'Programmes and start years', provenance: 'real', source: 'programmes.ts' },
  photo: { name: 'Photograph', provenance: 'real', source: 'Wikimedia Commons, credited on screen' },
  site: { name: 'India Species Atlas screenshots', provenance: 'real', source: 'The live site, captured by scripts/video/capture-site.mjs' },
  illustration: { name: 'Drawn landscape', provenance: 'illustrative', source: 'Drawn for the film' },
  device: { name: 'Drawing device on a map', provenance: 'illustrative', source: 'Labelled “illustrative” on screen' },
  atmosphere: { name: 'Atmosphere (haze, snow, particles)', provenance: 'illustrative', source: 'Drawn for the film' },
};

const FONTS = ['fonts/newsreader.woff2', 'fonts/newsreader-italic.woff2', 'fonts/geist.woff2'];
const RELIEF = ['data/etopo-india.bin', 'data/etopo-india.json', '../public/india-states.geojson'];
/** @param {string} id */
const photo = (id) => `species/${id}.jpg`;
/** @param {string} id */
const profile = (id) => `site/profile-${id}.png`;

/**
 * @typedef {import('./promo.mjs').Shot & {
 *   remap?: { from: number, to: number, ease?: 'in' | 'out' | 'inOut' },
 *   overlay?: string[],
 *   params?: Record<string, any>,
 *   visual: string, threeD: string, motionGraphics: string, typography: string, vfx: string,
 *   music: string, dataSource: string, website: string,
 * }} DocShot
 */

/** @type {DocShot[]} */
export const SHOTS = [];
/** @param {Partial<DocShot> & { id: string, seq: string, end: number }} s */
function shot(s) {
  const prev = SHOTS[SHOTS.length - 1];
  SHOTS.push(/** @type {DocShot} */ ({
    start: prev ? prev.end : 0,
    scene: 'remap',
    title: '', camera: '', visual: '', threeD: '—', motionGraphics: '—', typography: '—', vfx: '—', music: '', dataSource: '—', website: '—',
    layers: [], sound: [], transitionIn: { type: 'cut' },
    ...s,
    assets: [...new Set([...(s.assets ?? []), ...FONTS])],
  }));
}

/* ================= ACT 1 · THE HOOK ================= */

shot({
  id: 'S001', seq: 'hook', end: 5.6, scene: 'doc-globe', params: { phase: 'open' },
  title: 'A line is drawn', visual: 'Black; a night Earth turns out of darkness; graticule lines rule themselves across it.',
  camera: 'Locked off, the globe turning slowly', threeD: 'Orthographic globe, coastlines, graticule', motionGraphics: 'Graticule draw-on',
  vfx: 'Starfield, atmosphere rim glow', sound: ['room', 'air', 'tone'], music: 'Silence, then a low drone',
  transitionIn: { type: 'fade-from-black', duration: 2 }, dataSource: 'Natural Earth coastlines', assets: ['data/world-coast.json', 'data/world-borders.json'],
  layers: [L.world, L.atmosphere],
});
shot({
  id: 'S002', seq: 'hook', end: V('N03', -0.15), scene: 'doc-ink',
  title: 'A stroke of ink', visual: 'A single ink line drawn across paper, macro, the nib out of frame.', camera: 'Macro, slight drift',
  motionGraphics: 'The stroke is drawn on by length', vfx: 'Paper grain, depth-of-field falloff', sound: ['ink'], music: 'Drone',
  layers: [L.illustration],
});
shot({
  id: 'S003', seq: 'hook', end: V('N04', -0.15), remap: { from: 0.4, to: 3.0 },
  title: 'A wire between two towers', visual: 'A power-line conductor in macro against dusk; a glint runs along it.', camera: 'Macro drift',
  vfx: 'Rim light, dust motes', sound: ['hum'], music: 'Drone', layers: [L.illustration], slot: 'footage/doc/S003.mp4',
});
shot({
  id: 'S004', seq: 'hook', end: V('N05', -0.2), remap: { from: 20.05, to: 20.9 },
  title: 'A road through a forest', visual: 'A road through tall forest at dusk, centre line rushing toward camera.', camera: 'Vehicle height, forward',
  vfx: 'Speed vignette', sound: ['road'], music: 'Drone', layers: [L.illustration], slot: 'footage/doc/S004.mp4',
});
shot({
  id: 'S005', seq: 'hook', end: V('N07', 0.2), scene: 'doc-globe', params: { phase: 'dive' }, overlay: ['doc-title'],
  title: 'Lines across the land → title', visual: 'The globe turns to Asia; borders and coastlines light; the camera falls toward India. Title card: Lines on the Map.',
  camera: 'Slow orbit becoming a dive', threeD: 'Globe rotation and zoom', motionGraphics: 'Borders drawn on, India outlined',
  typography: 'Title — character reveal, Newsreader Light', vfx: 'Atmosphere glow', sound: ['tone', 'air'], music: 'First pad swell under the title',
  dataSource: 'Natural Earth; India Species Atlas boundaries', assets: ['data/world-coast.json', 'data/world-borders.json', ...RELIEF],
  layers: [L.world, L.states],
});

/* ================= ACT 2 · INDIA ================= */

shot({
  id: 'S006', seq: 'india', end: V('N09', -0.1), remap: { from: 9.3, to: 12.4 }, overlay: ['doc-title'], transitionIn: { type: 'dissolve', duration: 0.6 },
  title: 'India', visual: 'Top-down over the Thar, pulling out to the whole relief of India; boundaries rule in; “India” with its extent.',
  camera: 'Fast pull-out, easing', threeD: 'ETOPO1 relief', motionGraphics: 'Boundary draw-on', typography: '“India” — tracking reveal; coordinates — line reveal',
  sound: ['air', 'tone'], music: 'Discovery: pad opens', dataSource: 'ETOPO1; boundary extent', assets: RELIEF, layers: [L.relief, L.states],
});
shot({
  id: 'S007', seq: 'india', end: E('N09', 0.35), scene: 'doc-habitats',
  title: 'A network of habitats', visual: 'Five cuts, one per habitat word, each a flight over its real relief: Thar, central Indian forest, Gangetic plain, Himalaya, Brahmaputra floodplain.',
  camera: 'Five short FPV-style glides', threeD: 'ETOPO1 relief at five locations', typography: 'One word per cut — mask reveal',
  vfx: 'Haze per landscape', sound: ['air', 'ticks'], music: 'A beat per word', dataSource: 'ETOPO1', assets: RELIEF, layers: [L.relief, L.atmosphere],
});
shot({
  id: 'S008', seq: 'india', end: V('N13', -0.8), scene: 'doc-atlas-layers', transitionIn: { type: 'dissolve', duration: 0.5 },
  title: 'The Atlas: twelve species, three layers', visual: 'India as the Atlas draws it: all twelve species’ localities appear, counted; then the three layers — where recorded, what presses, what protects; then five anchors are joined by one route: this film.',
  camera: 'Slow push, top-down', threeD: 'Relief in map mode', motionGraphics: 'Locality markers by IUCN colour; counter 12; the route line',
  typography: 'Counter; the three layer names', sound: ['tone', 'ticks'], music: 'Pulse enters softly',
  dataSource: 'species.ts (all 12): distributionPoints, status; count computed', website: 'The Atlas named; its map legend drawn in the site’s style',
  assets: [...RELIEF, 'site/atlas.png'], layers: [L.relief, L.localities, L.status, L.site],
});

/* ================= ACT 2 · GREAT INDIAN BUSTARD ================= */

shot({
  id: 'S009', seq: 'bustard', end: V('N14', -0.1), remap: { from: 5.0, to: 7.45 }, transitionIn: { type: 'dissolve', duration: 0.8 },
  title: 'The Thar at dawn', visual: 'Transmission towers across open grassland at dawn; grass moving in the foreground.', camera: 'Slow lateral track (slowed)',
  vfx: 'Low sun, motes', sound: ['wind', 'grass', 'hum'], music: 'Observational', layers: [L.illustration], slot: 'footage/doc/S009.mp4',
});
shot({
  id: 'S010', seq: 'bustard', end: V('N16', -0.3), scene: 'doc-photo', params: { species: 'great-indian-bustard', name: V('N14', 0.3) },
  title: 'Great Indian Bustard', visual: 'The photograph: two bustards at the scrub edge. Slow push; rack focus in.', camera: 'Push-in, rack focus',
  typography: 'Species block: chapter, name (mask), scientific name, IUCN category and year', sound: ['wind', 'grass'], music: 'A held chord',
  dataSource: 'species.ts: name, status CR, statusAssessedYear', assets: [photo('great-indian-bustard')], layers: [L.photo, L.status],
});
shot({
  id: 'S011', seq: 'bustard', end: V('N18', -0.3), scene: 'doc-bustard-range', transitionIn: { type: 'dissolve', duration: 0.5 },
  title: 'Once across the subcontinent', visual: 'India; the states where historic populations are now effectively lost light and fade; Rajasthan and Gujarat remain.',
  camera: 'Slow push toward the Thar', threeD: 'Relief in map mode', motionGraphics: 'State highlights fading out; the remaining range',
  typography: '“Low hundreds” — kinetic, quoted from the record', sound: ['air'], music: 'Minor turn',
  dataSource: 'species.ts indianDistribution, states, description (“low hundreds”)', assets: RELIEF, layers: [L.relief, L.statesOfRecord, L.figures],
});
shot({
  id: 'S012', seq: 'bustard', end: V('N20', -0.3), remap: { from: 16.1, to: 19.95 }, overlay: ['doc-kinetic'],
  params: { lines: [{ at: V('N19'), text: 'The single largest cause of death', sub: 'Collision with power lines — species.ts, threatNote' }] },
  title: 'The wire on the map', visual: 'The bustard’s range in 3D; an illustrative power line is ruled across it; localities pulse.', camera: 'Slow orbit (slowed)',
  threeD: 'Relief', motionGraphics: 'Power line draw-on with pylons, tagged illustrative', typography: 'Kinetic statement, then its source',
  sound: ['hum', 'impact-soft'], music: 'Tension', grade: 'threat', dataSource: 'species.ts threatNote', assets: RELIEF,
  layers: [L.relief, L.statesOfRecord, L.localities, L.device, L.figures],
});
shot({
  id: 'S013', seq: 'bustard', end: V('N22', -0.3), scene: 'doc-bustard-response',
  title: 'Buried lines, hatched eggs', visual: 'The illustrative line sinks from solid to buried (dotted); the breeding programme appears as a record, not a map point.',
  camera: 'Held', motionGraphics: 'Line changes state; programme card', typography: 'Programme name, start year, places as written',
  sound: ['tone'], music: 'Restrained hope', grade: 'warm', dataSource: 'species.ts conservationActions; programmes.ts gib-conservation-breeding (2016)',
  assets: RELIEF, layers: [L.relief, L.device, L.programmes],
});
shot({
  id: 'S014', seq: 'bustard', end: V('N23', -0.6), scene: 'doc-atlas-panel', params: { species: 'great-indian-bustard', verb: 'Follow its last localities' },
  title: 'In the Atlas', visual: 'The map softens; the real Atlas profile for the bustard slides in beside it.', camera: 'Slow push on the panel',
  motionGraphics: 'Screenshot plate with depth', typography: 'Small “India Species Atlas · Species profile” label and URL',
  sound: ['ui'], music: 'Resolve', dataSource: 'The live site', website: 'Real species-profile screenshot; URL shown small',
  assets: [profile('great-indian-bustard'), ...RELIEF], layers: [L.site],
});

/* ================= ACT 2/3 · BENGAL TIGER ================= */

shot({
  id: 'S015', seq: 'tiger', end: V('N24', -0.2), remap: { from: 20.0, to: 21.72, ease: 'in' },
  title: 'The road', visual: 'Hard cut to the forest road at speed; the camera tilts down until the centre line is a single vertical line.',
  camera: 'Vehicle height, then tilt to top-down (speed ramp)', vfx: 'Speed vignette', sound: ['impact', 'road'], music: 'Pulse', layers: [L.illustration],
  transitionIn: { type: 'cut' }, slot: 'footage/doc/S015.mp4',
});
shot({
  id: 'S016', seq: 'tiger', end: V('N25', -0.2), remap: { from: 22.35, to: 24.2 },
  title: 'The road becomes the map', visual: 'The line becomes the real road network of central India, drawing outward.', camera: 'Top-down rising',
  threeD: 'Relief', motionGraphics: 'Roads draw-on', sound: ['road', 'tone'], music: 'Pulse', dataSource: 'Natural Earth roads', assets: RELIEF,
  layers: [L.relief, L.roads],
});
shot({
  id: 'S017', seq: 'tiger', end: V('N27', -0.35), scene: 'doc-photo', params: {
    species: 'bengal-tiger', name: V('N25', -0.1),
    counter: { at: V('N25', 1.2), label: 'Tigers in India, 2022 national estimate', value: 3700, prefix: '~', note: 'roughly 3,700 — species.ts, description', second: { at: V('N26'), text: 'more than 50 tiger reserves' } },
  },
  title: 'Bengal Tiger', visual: 'The photograph: a tiger turning toward camera in dry grass.', camera: 'Slow lateral drift',
  motionGraphics: 'Counter rising to ~3,700; second line', typography: 'Species block; counter in Geist tabular figures',
  sound: ['forest'], music: 'Observational', dataSource: 'species.ts description (2022 estimate; reserves)', assets: [photo('bengal-tiger')],
  layers: [L.photo, L.status, L.figures],
});
shot({
  id: 'S018', seq: 'tiger', end: V('N29', -0.35), scene: 'doc-fragment', transitionIn: { type: 'dissolve', duration: 0.4 },
  title: 'Islands', visual: 'Reserves as islands of forest; the illustrative links between them; real roads, railways-in-kind, cut through; the links break.',
  camera: 'Oblique orbit over the central highlands', threeD: 'Relief', motionGraphics: 'Reserve islands, links breaking',
  typography: 'HABITAT → FRAGMENTATION → CONNECTIVITY (the last breaks)', sound: ['road', 'impact-soft'], music: 'Tension', grade: 'threat',
  dataSource: 'species.ts localities and threatNote; Natural Earth roads', assets: RELIEF, layers: [L.relief, L.roads, L.localities, L.device],
});
shot({
  id: 'S019', seq: 'tiger', end: V('N30', -0.7), scene: 'doc-atlas-panel', params: { species: 'bengal-tiger', verb: 'The landscapes behind the number' },
  title: 'In the Atlas', visual: 'The Atlas’s interactive map, then the tiger’s profile.', camera: 'Push', website: 'Real map and profile screenshots',
  sound: ['ui'], music: 'Resolve', assets: ['site/atlas.png', profile('bengal-tiger'), ...RELIEF], layers: [L.site],
});

/* ================= ACT 3 · GANGES RIVER DOLPHIN ================= */

shot({
  id: 'S020', seq: 'dolphin', end: V('N31', -0.1), remap: { from: 27.5, to: 28.75 }, transitionIn: { type: 'dissolve', duration: 0.7 },
  title: 'Rivers are lines too', visual: 'A silt-laden river surface flowing toward camera.', camera: 'Low, following the current', vfx: 'Glints, streaks',
  sound: ['water'], music: 'Fluid arpeggio', layers: [L.illustration], slot: 'footage/doc/S020.mp4',
});
shot({
  id: 'S021', seq: 'dolphin', end: V('N33', -0.2), scene: 'doc-photo', params: { species: 'ganges-river-dolphin', name: V('N31', 0.2) },
  title: 'Ganges River Dolphin', visual: 'The photograph: a dolphin surfacing, beak clear, at the Koshi barrage.', camera: 'Push-in',
  typography: 'Species block', sound: ['water'], music: 'Observational', assets: [photo('ganges-river-dolphin')], layers: [L.photo, L.status],
});
shot({
  id: 'S022', seq: 'dolphin', end: V('N35', -0.3), remap: { from: 29.3, to: 32.5 }, overlay: ['doc-kinetic'],
  params: { lines: [{ at: V('N34'), text: 'Low thousands', sub: 'India · Nepal · Bangladesh — species.ts, description' }] },
  transitionIn: { type: 'dissolve', duration: 0.5 },
  title: 'The network divides', visual: 'The Ganga network drawn downstream, then broken into reaches (illustrative breaks).', camera: 'Follows the river east (slowed)',
  threeD: 'Relief', motionGraphics: 'River draw-on; breaks with bars', typography: 'Kinetic figure', sound: ['water', 'tone'], music: 'Tension',
  grade: 'threat', dataSource: 'Natural Earth rivers; species.ts threatNote, description', assets: [...RELIEF, 'data/rivers.geojson'],
  layers: [L.relief, L.rivers, L.localities, L.device, L.figures],
});
shot({
  id: 'S023', seq: 'dolphin', end: V('N36', -0.3), scene: 'doc-basins',
  title: 'Six hundred million', visual: 'Pull back: the Ganga and Brahmaputra systems glow across the north and east.', camera: 'Pull-out',
  threeD: 'Relief', motionGraphics: 'Two river systems highlighted by name', typography: '~600 million people — quoted with its field',
  sound: ['water', 'air'], music: 'Scale', dataSource: 'species.ts whyItMatters; Natural Earth rivers', assets: [...RELIEF, 'data/rivers.geojson'],
  layers: [L.relief, L.rivers, L.figures],
});
shot({
  id: 'S024', seq: 'dolphin', end: V('N37', -0.3), scene: 'doc-programme', params: { programme: 'project-dolphin', species: 'ganges-river-dolphin' },
  title: 'Project Dolphin', visual: 'The dolphin’s localities, Vikramshila named; the programme appears as a record with its date.', camera: 'Held, slow push',
  motionGraphics: 'Programme card; localities pulse', typography: 'Programme name and announcement date', sound: ['tone'], music: 'Restrained hope', grade: 'warm',
  dataSource: 'programmes.ts project-dolphin; species.ts protectedAreas', assets: [...RELIEF, 'data/rivers.geojson'], layers: [L.relief, L.localities, L.programmes],
});
shot({
  id: 'S025', seq: 'dolphin', end: V('N38', -1.0), scene: 'doc-atlas-panel', params: { species: 'ganges-river-dolphin', verb: 'Trace its river, reach by reach' },
  title: 'In the Atlas', visual: 'The dolphin’s real Atlas profile.', website: 'Real species-profile screenshot', sound: ['ui'], music: 'Resolve',
  assets: [profile('ganges-river-dolphin'), ...RELIEF], layers: [L.site],
});

/* ================= ACT 3 · SNOW LEOPARD ================= */

shot({
  id: 'S026', seq: 'snow-leopard', end: V('N40', -0.4), remap: { from: 35.0, to: 39.3 }, transitionIn: { type: 'dissolve', duration: 1.2 },
  title: 'Higher still', visual: 'Low over the ridges of Spiti in cold haze, snow falling; contours rise out of the rock.', camera: 'Slow push along the ridges (slowed)',
  threeD: 'ETOPO1 1′ relief, snow, haze', motionGraphics: 'Contours at a real 250 m interval', vfx: 'Haze, falling snow, crag shading',
  sound: ['mountain'], music: 'The pulse drops out; high cold air', grade: 'cold', dataSource: 'ETOPO1', assets: ['data/etopo-himalaya.bin', 'data/etopo-himalaya.json', ...RELIEF],
  layers: [L.relief, L.atmosphere],
});
shot({
  id: 'S027', seq: 'snow-leopard', end: V('N41', -0.3), remap: { from: 39.3, to: 42.3 }, overlay: ['doc-kinetic'],
  params: { lines: [{ at: V('N40', 0.6), text: 'About 718', sub: 'India’s first nationwide assessment (SPAI) — species.ts, description' }] },
  title: 'Contours become the map', visual: 'The camera lifts; the contours become the map; states of record and localities.', camera: 'Crane up to top-down',
  motionGraphics: 'States of record, localities', typography: 'Kinetic figure', sound: ['mountain', 'tone'], music: 'Held', grade: 'cold',
  dataSource: 'species.ts', assets: ['data/etopo-himalaya.bin', ...RELIEF], layers: [L.relief, L.statesOfRecord, L.localities, L.figures],
});
shot({
  id: 'S028', seq: 'snow-leopard', end: V('N43', -0.3), scene: 'doc-photo', params: {
    species: 'snow-leopard', name: V('N41', -0.5),
    status: { at: V('N41', 1.2), from: 'Endangered', to: 'Vulnerable', year: 2017, note: 'revised estimate — not recovery · still thought to be declining', noteAt: V('N42', 0.6) },
  },
  title: 'Snow Leopard', visual: 'The photograph: the cat on snow-covered rock. Almost still.', camera: 'Very slow push',
  typography: 'Species block; the category change Endangered → Vulnerable, 2017, with its caveat', sound: ['mountain'], music: 'Emotional, sparse piano',
  grade: 'cold-photo', dataSource: 'species.ts statusHistory, description', assets: [photo('snow-leopard')], layers: [L.photo, L.status, L.figures],
});
shot({
  id: 'S029', seq: 'snow-leopard', end: V('N44', -0.3), scene: 'doc-alpine',
  title: 'A shrinking alpine world', visual: 'The high relief with its snow line drawn; the line climbs, the alpine band narrows (illustrative).', camera: 'Held oblique',
  threeD: 'Relief', motionGraphics: 'Alpine band, tagged illustrative', sound: ['mountain'], music: 'Held', grade: 'cold',
  dataSource: 'species.ts threatNote (qualitative only)', assets: ['data/etopo-himalaya.bin', ...RELIEF], layers: [L.relief, L.device],
});
shot({
  id: 'S030', seq: 'snow-leopard', end: V('N45', -1.2), scene: 'doc-atlas-panel',
  params: { species: 'snow-leopard', verb: 'Conservation with communities', actions: true },
  title: 'People and the Atlas', visual: 'The three community measures from the record appear as a list; then the snow leopard’s Atlas profile.', camera: 'Slow push',
  typography: 'Conservation actions, as written in the record', website: 'Real species-profile screenshot', sound: ['ui', 'mountain'], music: 'Warmth returns',
  dataSource: 'species.ts conservationActions', assets: [profile('snow-leopard'), ...RELIEF], layers: [L.site, L.programmes],
});

/* ================= ACT 3/4 · RHINOCEROS ================= */

shot({
  id: 'S031', seq: 'rhino', end: V('N46', -0.1), remap: { from: 47.5, to: 48.38 }, transitionIn: { type: 'dissolve', duration: 1.0 },
  title: 'The floodplain', visual: 'The Brahmaputra and its floodplain in relief; Kaziranga named.', camera: 'Slow drift (slowed)', threeD: 'Relief',
  sound: ['air', 'water'], music: 'The story turns: major colour', grade: 'warm', dataSource: 'Natural Earth rivers; species.ts', assets: [...RELIEF, 'data/rivers.geojson'],
  layers: [L.relief, L.rivers, L.localities],
});
shot({
  id: 'S032', seq: 'rhino', end: V('N49', -0.3), scene: 'doc-photo', params: {
    species: 'indian-rhinoceros', name: V('N46', -0.1),
    counter: { at: V('N46', 1.0), label: 'Greater one-horned rhinos, India and Nepal', from: 200, fromPrefix: 'fewer than ', value: 4000, prefix: 'around ', riseAt: V('N47'), note: 'species.ts — summary and description' },
  },
  title: 'Greater One-horned Rhinoceros', visual: 'The photograph: a rhino standing in shallow water.', camera: 'Push-in',
  motionGraphics: 'Counter: fewer than 200 → around 4,000', typography: 'Species block; counter', sound: ['water'], music: 'Hope',
  dataSource: 'species.ts summary, description', assets: [photo('indian-rhinoceros')], layers: [L.photo, L.status, L.figures],
});
shot({
  id: 'S033', seq: 'rhino', end: V('N51', -0.3), scene: 'doc-kaziranga', transitionIn: { type: 'dissolve', duration: 0.4 },
  title: 'One park', visual: 'The rhino’s localities; Kaziranga swells; then three risks strike the one place.', camera: 'Push into Kaziranga',
  motionGraphics: 'Locality emphasis', typography: 'More than two-thirds · FLOOD · DISEASE · POACHING', sound: ['impact-soft', 'ticks'], music: 'Tension',
  grade: 'threat', dataSource: 'species.ts description, threatNote', assets: [...RELIEF, 'data/rivers.geojson'], layers: [L.relief, L.localities, L.figures],
});
shot({
  id: 'S034', seq: 'rhino', end: V('N53', -0.9), scene: 'doc-translocation',
  title: 'New populations', visual: 'Arcs from Kaziranga and Pobitora to Manas (Indian Rhino Vision 2020); then real highways along the floodplain edge; then the rhino’s Atlas profile.',
  camera: 'Slow orbit', threeD: 'Relief', motionGraphics: 'Translocation arcs between real localities; roads highlighted', typography: 'Programme name and start year',
  website: 'Rhino profile screenshot', sound: ['tone', 'road'], music: 'Hope with weight', grade: 'warm',
  dataSource: 'programmes.ts indian-rhino-vision (2005); species.ts localities, threatNote; Natural Earth roads', assets: [...RELIEF, 'data/roads.geojson', 'data/rivers.geojson', profile('indian-rhinoceros')],
  layers: [L.relief, L.localities, L.roads, L.programmes, L.site],
});

/* ================= ACT 4 · CONNECTIVITY & RESPONSE ================= */

shot({
  id: 'S035', seq: 'connect', end: V('N57', -0.3), remap: { from: 50.0, to: 55.9 }, overlay: ['doc-kinetic'],
  params: { lines: [{ at: V('N55'), text: 'Not one threat.' }, { at: V('N56', 0.5), text: 'Geography.', sub: 'Where they live — and whether those places still connect.' }] },
  transitionIn: { type: 'dissolve', duration: 0.6 },
  title: 'Every line on one map', visual: 'Rivers, roads, boundaries and every species’ localities draw together on one India, brighten, and settle.',
  camera: 'Oblique settling to top-down (slowed)', threeD: 'Relief', motionGraphics: 'All layers; legend', typography: 'Two kinetic statements',
  sound: ['impact', 'tone'], music: 'Geographic revelation: the fullest passage', dataSource: 'All real layers', assets: [...RELIEF, 'data/rivers.geojson', 'data/roads.geojson'],
  layers: [L.relief, L.rivers, L.roads, L.states, L.localities, L.status],
});
shot({
  id: 'S036', seq: 'response', end: V('N61', -0.4), scene: 'doc-response',
  title: 'Lines drawn to protect', visual: 'A timeline ruled across the frame: Project Tiger 1973, Indian Rhino Vision 2005, Project Snow Leopard 2009, species recovery 2009, bustard breeding 2016, Project Dolphin 2020; protected localities glow on the map beneath.',
  camera: 'Slow lateral track along the timeline', motionGraphics: 'Timeline line, year ticks, programme labels', typography: 'Years in tabular figures; programme names',
  sound: ['tone', 'ticks'], music: 'Restrained hope', grade: 'warm', dataSource: 'programmes.ts startedYear, name', assets: RELIEF,
  layers: [L.programmes, L.relief, L.localities],
});

/* ================= ACT 5 · THE ATLAS ================= */

shot({
  id: 'S037', seq: 'atlas', end: V('N63', -0.3), scene: 'doc-closing-line',
  title: 'Where we choose to protect them', visual: 'The quiet map; the Atlas’s own closing line, set in its type.', camera: 'Locked off',
  typography: 'The site’s closing line, verbatim — line reveal', sound: ['air'], music: 'Reflective', dataSource: 'src/pages/HomePage (closing line)', assets: RELIEF,
  website: 'The Atlas’s words', layers: [L.relief, L.states],
});
shot({
  id: 'S038', seq: 'atlas', end: V('N65', -0.25), scene: 'doc-atlas-reveal',
  title: 'The Atlas', visual: 'The map lifts into the real site: home, map, species, profile, conservation — pages floating in depth; the camera passes through them.',
  camera: 'Dolly through planes in 3D', threeD: 'Screenshot planes in a three.js scene', motionGraphics: 'Planes, depth of field',
  typography: 'Explore the species · the maps · the conservation story', vfx: 'Depth of field, soft light', sound: ['ui', 'air'], music: 'Warm swell',
  website: 'Real screenshots of every section', assets: ['site/home.png', 'site/atlas.png', 'site/species.png', 'site/conservation.png', profile('great-indian-bustard')],
  layers: [L.site],
});
shot({
  id: 'S039', seq: 'atlas', end: fr(E('N66') + 6.2), scene: 'doc-endcard',
  title: 'Explore the full Atlas', visual: 'INDIA SPECIES ATLAS; the three invitations; “Explore the full Atlas” with the real URL; then the film title.',
  camera: 'Locked off', typography: 'Wordmark, invitations, URL', sound: ['tone'], music: 'Resolve, and hold',
  website: 'URL from the repository (scripts/promo/config.mjs)', assets: ['site/home.png'], layers: [L.site],
});
shot({
  id: 'S040', seq: 'credits', end: fr(E('N66') + 6.2 + 13), scene: 'doc-credits',
  title: 'Credits', visual: 'Credits on black, read from the data the film used.', camera: 'Locked off', sound: ['room'], music: 'Reverb tail',
  dataSource: 'species.ts sources, photos.json, programmes.ts', layers: [],
});

export const DURATION = SHOTS[SHOTS.length - 1].end;
export const SEQUENCES = [...new Set(SHOTS.map((s) => s.seq))];

/** Beats the score and sound design hit. */
/** @param {string} id */
const startOf = (id) => /** @type {DocShot} */ (SHOTS.find((s) => s.id === id)).start;

export const CUES = {
  titleCard: V('N06', 2.5),
  indiaReveal: V('N07', 2.6),
  habitatWords: [], // filled from the narration's own silences by doc-habitats (see WORD_CUES)
  bustardHit: V('N19'),
  roadCut: startOf('S015'),
  fragment: V('N28'),
  riverBreak: V('N33', 1.4),
  himalaya: startOf('S026'),
  statusChange: V('N41', 1.2),
  rhinoTurn: V('N45'),
  rhinoRisk: V('N50'),
  converge: startOf('S035'),
  response: startOf('S036'),
  atlas: startOf('S038'),
  endcard: startOf('S039'),
  credits: startOf('S040'),
};

/**
 * Where each habitat word of N09 falls, found from the silences in its
 * recording (see scripts/video/voice-timing.mjs). Seconds from the phrase's start.
 */
/** @type {Record<string, number[]>} */
export const WORDS = /** @type {any} */ (TIMED).WORDS ?? {};

export const CREDITS = {
  voiceSource: 'tts',
  musicSource: 'synthesised',
  voice: 'Synthetic voice: Microsoft Edge neural text-to-speech (en-IN-PrabhatNeural), via edge-tts.',
  music: 'Original score and sound design, synthesised in code for this film. No samples or library music.',
  geography: [
    'Relief: NOAA ETOPO1 1 Arc-Minute Global Relief Model.',
    'Rivers, roads, world coastlines and borders: Natural Earth (public domain).',
    'State boundaries: the Atlas’s own boundary file, which predates the 2019 reorganisation of Jammu and Kashmir.',
  ],
  illustration: [
    'The power line, pylons, road, ink and river-surface shots are computer-generated illustrations, as are the snow and haze.',
    'Lines marked “illustrative” on the maps are drawing devices, not data. No AI-generated footage or imagery is used.',
  ],
  site: 'Website shown: India Species Atlas, captured from the live site. Map tiles © OpenStreetMap contributors.',
  software: 'three.js · Vite · TypeScript · Playwright · FFmpeg · edge-tts',
};
