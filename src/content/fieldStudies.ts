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
 * Each study is named for the habitat it is set in, and the label is the word
 * the index, the menu and the study's own header carry:
 *
 *   Grassland   the bustard: the Thar's arid grassland
 *   Mountain    the snow leopard: a drawn Himalayan valley and ranges
 *   River       the river dolphin: a drawn lowland river with banks and sandbars
 *   Forest      the tiger: a drawn central Indian forest in morning light
 *   Floodplain  the rhinoceros: a drawn Brahmaputra floodplain
 */
export type StudyHabitat = 'Grassland' | 'Mountain' | 'River' | 'Forest' | 'Floodplain';

export interface StudyStage {
  /** The chapter's name in the running progress, set in capitals by CSS. */
  label: string;
}

export interface FieldStudy {
  id: string;
  n: string;
  habitat: StudyHabitat;
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
    habitat: 'Grassland',
    env: 'thar',
    place: 'The Thar · Rajasthan',
    stages: [s('Thar'), s('Range'), s('Threat'), s('Photograph'), s('Evidence'), s('Protection'), s('Return')],
    sweep: [1, 0.15],
  },
  {
    id: 'snow-leopard',
    speciesId: 'snow-leopard',
    habitat: 'Mountain',
    env: 'himalaya',
    place: 'The higher Himalaya',
    stages: [s('The mountain'), s('Habitat'), s('Altitude'), s('Distribution'), s('Photograph'), s('Range'), s('Conservation'), s('Why it matters')],
    sweep: [0, 1],
  },
  {
    id: 'ganges-river-dolphin',
    speciesId: 'ganges-river-dolphin',
    habitat: 'River',
    env: 'river',
    place: 'The Ganga and the Brahmaputra',
    stages: [s('The river'), s('Habitat'), s('Distribution'), s('The dolphin'), s('Pressure'), s('Conservation'), s('Why it matters')],
    sweep: [1, -0.2],
  },
  {
    id: 'bengal-tiger',
    speciesId: 'bengal-tiger',
    habitat: 'Forest',
    env: 'forest',
    place: 'Central Indian forests',
    stages: [s('The forest'), s('Habitat'), s('Project Tiger'), s('Reserves'), s('Estimate'), s('Pressure'), s('Why it matters')],
    sweep: [0, -1],
  },
  {
    id: 'indian-rhinoceros',
    speciesId: 'indian-rhinoceros',
    habitat: 'Floodplain',
    env: 'floodplain',
    place: 'The Brahmaputra floodplain · Assam',
    stages: [s('The floodplain'), s('Habitat'), s('Pressure'), s('Protection'), s('Population'), s('Photograph'), s('Why it matters')],
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

export function previousStudy(id: string): FieldStudy {
  const i = FIELD_STUDIES.findIndex((f) => f.id === id);
  return FIELD_STUDIES[(i - 1 + FIELD_STUDIES.length) % FIELD_STUDIES.length];
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
  'snow-leopard': ['A terrain model of a real valley (the mountains are drawn and labelled so).'],
  'ganges-river-dolphin': [
    'River centre-lines (the river drawn is an impression, not the course of the Ganga or the Brahmaputra).',
    'The sites of dams and barrages (none is drawn).',
  ],
  'bengal-tiger': ['Earlier national estimates, for a sourced recovery series (only the 2022 estimate is in the record).'],
  'indian-rhinoceros': ['The number of animals translocated under IRV2020, and the population split by site beyond "more than two-thirds in Kaziranga".'],
};
