import type { Species } from '../types';
import { SPECIES_BY_ID } from '../data/species';
import { MAP_HEIGHT, MAP_WIDTH, project } from '../geo/india';
import { camAt, fitCam, INDIA_CAM, type GeoCam } from './geoCamera';
import { sceneNamed, type Pausable } from './sceneRegistry';
import { getWorld, type AtlasView, type GeoOrigin } from './worldState';

/**
 * Which page changes are journeys through the world, and from where to where.
 *
 * A journey is a camera move on the shared sheet, so it only makes sense
 * between views of the geography:
 *
 *   anything → a species      DESCEND: from wherever the reader was looking,
 *                             down onto the species' anchor locality; the
 *                             ground gains depth, a line opens into its
 *                             photograph, and the photograph becomes the page.
 *   species  → species        TRAVEL: the same, but the route leg between the
 *                             two anchors is drawn as the camera follows it.
 *   anything → the atlas      ASCEND: up from the current ground to the
 *                             map's own framing, landing in the map's frame.
 *
 * Every other change (About, Sources, the directory…) keeps the page turn:
 * a ruled line, not a camera, because there is no place to move to. The plan
 * is computed from the dataset and the world state; it never invents a place.
 */
export type JourneyKind = 'descend' | 'travel' | 'ascend';

export interface Journey {
  kind: JourneyKind;
  from: GeoCam;
  /** Null for the atlas, whose framing is only known once its panel is on screen (`atlasLanding`). */
  to: GeoCam | null;
  /** A screen box the start view sits in (the atlas map's panel), instead of the whole screen. */
  fromBox: DOMRect | null;
  /** On the next page, the box the end view should land in. */
  toSelector: string | null;
  /** The locality the reader chose, ringed at the start. */
  origin: GeoOrigin | null;
  /** The destination species, for its photograph, states and caption. */
  species: Species | null;
  /** Species → species: the leg between the two anchors, in sheet units. */
  leg: [[number, number], [number, number]] | null;
  /** Species → atlas: the photograph on screen now, which closes into a line first. */
  closeFrom: HTMLImageElement | null;
  /**
   * Home → atlas from the hero: the live relief, which is laid flat into the
   * sheet first (TERRAIN → MAP) with the hero's own renderer.
   */
  fromHero: Pausable | null;
}

const ATLAS_PANEL = '#atlas-map-panel';

/**
 * The live atlas map, while it is mounted: a journey that starts on it first
 * moves the map's own camera to the chosen marker (MARKER → COORDINATE →
 * CAMERA on the real map), and only then hands over to the sheet.
 */
export interface AtlasCamera {
  /** Ease the map towards a locality; resolves when it has settled (or soon after). */
  approach: (lng: number, lat: number) => Promise<void>;
}
let atlasCamera: AtlasCamera | null = null;
export function registerAtlasCamera(cam: AtlasCamera | null) {
  atlasCamera = cam;
}
export function liveAtlasCamera(): AtlasCamera | null {
  return atlasCamera;
}

function speciesIn(path: string): Species | null {
  const m = path.match(/^\/species\/([^/?#]+)/);
  return m ? (SPECIES_BY_ID[m[1]] ?? null) : null;
}

function onScreen(el: Element | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  const r = el.getBoundingClientRect();
  return r.width > 40 && r.height > 40 && r.bottom > 0 && r.top < window.innerHeight;
}

/**
 * The atlas map's camera, from a stored Leaflet view and the panel it fills.
 * Leaflet's zoom is Web Mercator pixels: 256·2^z per 360° of longitude.
 */
export function camFromAtlasView(view: AtlasView, panelWidth: number): GeoCam {
  const spanLng = (panelWidth * 360) / (256 * 2 ** view.zoom);
  const [x0, y] = project(view.lng - spanLng / 2, view.lat);
  const [x1] = project(view.lng + spanLng / 2, view.lat);
  return { x: (x0 + x1) / 2, y, w: x1 - x0 };
}

export function planJourney(fromPath: string, toPath: string, origin: GeoOrigin | null): Journey | null {
  const world = getWorld();
  const fromSpecies = speciesIn(fromPath);
  const toSpecies = speciesIn(toPath);
  const toAtlas = toPath.split(/[?#]/)[0] === '/atlas';
  if (!toSpecies && !toAtlas) return null;
  if (toSpecies && fromSpecies?.id === toSpecies.id) return null;

  // Where the reader is looking now. On the atlas that is the live map, in its panel.
  const panel = document.querySelector(ATLAS_PANEL);
  const fromAtlas = fromPath.split(/[?#]/)[0] === '/atlas' && onScreen(panel);
  const fromBox = fromAtlas ? panel.getBoundingClientRect() : null;
  const from = world.camera;

  if (toSpecies) {
    const a = toSpecies.distributionPoints[0];
    const leg: Journey['leg'] =
      fromSpecies && fromSpecies.distributionPoints[0]
        ? [
            project(fromSpecies.distributionPoints[0].lng, fromSpecies.distributionPoints[0].lat),
            project(a.lng, a.lat),
          ]
        : null;
    return {
      kind: leg ? 'travel' : 'descend',
      from,
      to: camAt(a.lng, a.lat),
      fromBox,
      toSelector: null,
      // A next / previous link names where it goes, not where the reader stands: the ring is the start.
      origin: (origin && origin.kind !== 'leg' ? origin : null) ?? (fromSpecies ? { ...fromSpecies.distributionPoints[0], kind: 'leg' } : null),
      species: toSpecies,
      leg,
      closeFrom: null,
      fromHero: null,
    };
  }

  // To the atlas: up to where the map was left, or the whole country.
  const photo = fromSpecies ? document.querySelector<HTMLImageElement>('.sw-photo img') : null;
  // From the hero, while its relief fills the screen, the journey starts from
  // the relief itself: over the whole country, or over the region the
  // descent has come down to.
  const hero = fromPath === '/' ? sceneNamed('hero') : null;
  const heroRect = hero?.element.getBoundingClientRect();
  const heroFills = Boolean(
    hero?.scene.toSheet && heroRect && heroRect.top <= 1 && heroRect.bottom >= window.innerHeight - 1,
  );
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const heroCam =
    from === INDIA_CAM || from.w >= INDIA_CAM.w * 0.9 ? fitCam([0, 0, MAP_WIDTH, MAP_HEIGHT], aspect, 0.04) : from;
  return {
    kind: 'ascend',
    from: heroFills ? heroCam : from,
    to: null,
    fromBox,
    toSelector: ATLAS_PANEL,
    origin: fromSpecies ? { ...fromSpecies.distributionPoints[0], kind: 'leg' } : null,
    species: fromSpecies,
    leg: null,
    closeFrom: onScreen(photo) ? photo : null,
    fromHero: heroFills ? hero!.scene : null,
  };
}

/** The end camera for the atlas, once its panel's size is known. */
export function atlasLanding(panel: DOMRect): GeoCam {
  const view = getWorld().atlasView;
  if (view) return camFromAtlasView(view, panel.width);
  // The map fits India's bounds the same way (AtlasMap's FitIndia).
  const [x0, y0] = project(66.5, 37.6);
  const [x1, y1] = project(98.5, 5.5);
  return fitCam([x0, y0, x1, y1], panel.width / panel.height, 0);
}
