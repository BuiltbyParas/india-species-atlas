import type { Scene } from '../engine/film';
import { cable } from './cable';
import { converge } from './converge';
import { docAtlasPanel, docAtlasReveal, docCredits, docEndcard } from './doc-atlas';
import { docGlobe, docInk, docTitle } from './doc-globe';
import {
  docAlpine, docAtlasLayers, docBasins, docBustardRange, docBustardResponse, docClosingLine, docFragment, docHabitats, docKaziranga, docProgramme, docResponse, docTranslocation,
} from './doc-maps';
import { docKinetic, docPhoto } from './doc-photo';
import { credits } from './credits';
import { himalaya } from './himalaya';
import { indiaReveal } from './india-reveal';
import { MAPS } from './maps';
import { montage } from './montage';
import { photoScene } from './photo';
import { pylons } from './pylons';
import { road } from './road';
import { title } from './title';
import { water } from './water';

/**
 * Scene registry. A shot names its scene in the timeline; `photo:*` is a
 * family whose member is chosen from the shot's scene name. Shots whose
 * scene is not registered draw their slate, and QC lists them.
 */
export const SCENES = new Map<string, Scene>([
  ['photo:*', photoScene],
  ['cable', cable],
  ['pylons', pylons],
  ['india-reveal', indiaReveal],
  ['road', road],
  ['water', water],
  ['himalaya', himalaya],
  ['montage', montage],
  ['converge', converge],
  ['title', title],
  ['credits', credits],
  ...MAPS,
  // The documentary.
  ['doc-globe', docGlobe],
  ['doc-title', docTitle],
  ['doc-ink', docInk],
  ['doc-habitats', docHabitats],
  ['doc-atlas-layers', docAtlasLayers],
  ['doc-photo', docPhoto],
  ['doc-kinetic', docKinetic],
  ['doc-bustard-range', docBustardRange],
  ['doc-bustard-response', docBustardResponse],
  ['doc-atlas-panel', docAtlasPanel],
  ['doc-fragment', docFragment],
  ['doc-basins', docBasins],
  ['doc-programme', docProgramme],
  ['doc-alpine', docAlpine],
  ['doc-kaziranga', docKaziranga],
  ['doc-translocation', docTranslocation],
  ['doc-response', docResponse],
  ['doc-closing-line', docClosingLine],
  ['doc-atlas-reveal', docAtlasReveal],
  ['doc-endcard', docEndcard],
  ['doc-credits', docCredits],
]);
