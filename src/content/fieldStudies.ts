import type { Species } from '../types';
import type { Environment } from '../world/environment';
import { SPECIES_BY_ID } from '../data/species';

/**
 * The five featured field studies.
 *
 * Editorial, not data: which species are studied, in what order, what each
 * study's gesture is called and what its chapters are named. Every fact a
 * study shows is read from the species record (`data/species.ts`) and the
 * programmes (`data/programmes.ts`) at render time; nothing numeric is
 * written here.
 *
 * The verb is the study's interaction grammar, and the word the instrument
 * carries over it:
 *
 *   TRACE      the bustard: the Thar's arid grassland, followed on foot
 *   ASCEND     the snow leopard: the camera climbs through a mountain drawn
 *              as contours
 *   DRAG       the river dolphin: the hand moves the water, and drags the
 *              study along the recorded localities
 *   REVEAL     the tiger: a dark forest, a light the hand carries
 *   TRANSFORM  the rhinoceros: a heavy form that becomes its own population,
 *              one point per animal
 */
export type StudyVerb = 'Trace' | 'Ascend' | 'Drag' | 'Reveal' | 'Transform';

export interface StudyStage {
  /** The chapter's name in the running progress, set in capitals by CSS. */
  label: string;
}

export interface FieldStudy {
  id: string;
  n: string;
  verb: StudyVerb;
  species: Species;
  env: Environment;
  /** The landscape, as the record names it. */
  place: string;
  stages: StudyStage[];
  /**
   * The direction the next world sweeps in from when this one gives way
   * (gl/composite.ts): x, y in screen space.
   */
  sweep: [number, number];
}

const s = (label: string): StudyStage => ({ label });

const DEFS: Array<Omit<FieldStudy, 'species' | 'n'> & { speciesId: string }> = [
  {
    id: 'great-indian-bustard',
    speciesId: 'great-indian-bustard',
    verb: 'Trace',
    env: 'thar',
    place: 'The Thar · Rajasthan',
    stages: [s('Thar'), s('Range'), s('Threat'), s('Photograph'), s('Evidence'), s('Protection'), s('Return')],
    sweep: [1, 0.15],
  },
  {
    id: 'snow-leopard',
    speciesId: 'snow-leopard',
    verb: 'Ascend',
    env: 'himalaya',
    place: 'The higher Himalaya',
    stages: [s('Low ground'), s('Contour'), s('Ascent'), s('Habitat'), s('Photograph'), s('Range'), s('Conservation'), s('Descent')],
    sweep: [0, 1],
  },
  {
    id: 'ganges-river-dolphin',
    speciesId: 'ganges-river-dolphin',
    verb: 'Drag',
    env: 'river',
    place: 'The Ganga and the Brahmaputra',
    stages: [s('Source'), s('Flow'), s('Geography'), s('Species'), s('Pressure'), s('Conservation'), s('Flow back')],
    sweep: [1, -0.2],
  },
  {
    id: 'bengal-tiger',
    speciesId: 'bengal-tiger',
    verb: 'Reveal',
    env: 'forest',
    place: 'Central Indian forests',
    stages: [s('Forest'), s('Presence'), s('Evidence'), s('Protection'), s('Estimate'), s('Present'), s('Return')],
    sweep: [0, -1],
  },
  {
    id: 'indian-rhinoceros',
    speciesId: 'indian-rhinoceros',
    verb: 'Transform',
    env: 'floodplain',
    place: 'The Brahmaputra floodplain · Assam',
    stages: [s('Form'), s('Landscape'), s('Pressure'), s('Protection'), s('Recovery'), s('Photograph'), s('Present')],
    sweep: [-1, 0.1],
  },
];

export const FIELD_STUDIES: FieldStudy[] = DEFS.flatMap(({ speciesId, ...d }, i) => {
  const species = SPECIES_BY_ID[speciesId];
  return species ? [{ ...d, species, n: String(i + 1).padStart(2, '0') }] : [];
});

export const STUDY_BY_ID: Record<string, FieldStudy> = Object.fromEntries(FIELD_STUDIES.map((f) => [f.id, f]));

export function nextStudy(id: string): FieldStudy {
  const i = FIELD_STUDIES.findIndex((f) => f.id === id);
  return FIELD_STUDIES[(i + 1) % FIELD_STUDIES.length];
}

/** The record's first sentence of a field, verbatim. */
export function firstSentence(text: string): string {
  return text.split(/(?<=\.)\s/)[0];
}

/**
 * Content a study would use and the dataset does not hold. Shown nowhere as
 * fact; listed in documentation/FIELD_EXPERIENCES.md so it can be sourced.
 */
export const MISSING_CONTENT: Record<string, string[]> = {
  'great-indian-bustard': [
    'The alignment of any transmission line in the Thar (none is drawn; the threat is in the words only).',
    'A dated population series (the record says only "low hundreds").',
  ],
  'snow-leopard': ['A terrain model of a real valley (the mountain is procedural and labelled so).'],
  'ganges-river-dolphin': [
    'River centre-lines (the thread joins recorded localities, not the river’s course).',
    'The sites of dams and barrages (marked schematically).',
  ],
  'bengal-tiger': ['Earlier national estimates, for a sourced recovery series (only the 2022 estimate is in the record).'],
  'indian-rhinoceros': ['The number of animals translocated under IRV2020, and the population split by site beyond "more than two-thirds in Kaziranga".'],
};
