import type { Species } from '../types';
import { sentenceWith, habitatBand } from '../components/field/studyFacts';
import { ADAPTATIONS, ADAPTATION_SOURCE, type Adaptation } from './encounter';

/**
 * THE FIELD STUDIES AS READING: what each of the five studies on the home page says, beat by beat, once its world
 * has been met.
 *
 * Editorial, not data. Every beat has the same grammar —
 *
 *   Encounter     the animal in its ground: where it lives and what that ground is
 *   Adaptation    one adaptation, behaviour or ecological need
 *   Field note    one measured figure, with what it counts, how and by whom
 *   Threat        what cuts through that ground
 *   Conservation  what is being done, and by whom
 *   Reflection    why it matters, and the way on to the next ground
 *
 * — but each study chooses which of its record's sentences carry the first two. A sentence is found in the record
 * by a phrase it contains (`sentenceWith`), so the prose on screen is always the record's own; if the record is
 * rewritten and the sentence is gone, the beat shows nothing rather than a remembered claim. The headings and the
 * bridges between studies are the only words written here, and each one says nothing the record does not.
 *
 * On the page the six beats are read in three movements (`SECTIONS`), so a short sentence is never given a screen of
 * its own: Encounter (the animal in its ground), Discover (adaptation and field note side by side), Protect (threat
 * and conservation side by side, closing on the reflection). Each beat keeps its own small label inside its movement.
 */

export type BeatId = 'encounter' | 'adaptation' | 'field-note' | 'threat' | 'conservation' | 'reflection';

export const BEATS: Array<{ id: BeatId; label: string }> = [
  { id: 'encounter', label: 'Encounter' },
  { id: 'adaptation', label: 'Adaptation' },
  { id: 'field-note', label: 'Field note' },
  { id: 'threat', label: 'Threat' },
  { id: 'conservation', label: 'Conservation' },
  { id: 'reflection', label: 'Reflection' },
];

export type SectionId = 'encounter' | 'discover' | 'protect';

/** The three movements a study is read in, and the beats each holds. */
export const SECTIONS: Array<{ id: SectionId; label: string; beats: BeatId[] }> = [
  { id: 'encounter', label: 'Encounter', beats: ['encounter'] },
  { id: 'discover', label: 'Discover', beats: ['adaptation', 'field-note'] },
  { id: 'protect', label: 'Protect', beats: ['threat', 'conservation', 'reflection'] },
];

/** The id of a study's movement on the page: the list's links and the reading's sections share it. */
export const sectionId = (study: string, section: SectionId) => `read-${study}-${section}`;

/** The id of a study's beat on the page: the list's links and the reading's sections share it. */
export const beatId = (study: string, beat: BeatId) => `read-${study}-${beat}`;

/** Where in the record a beat's prose is found: the sentence containing each phrase, in order. */
type Find = Array<string | RegExp>;

interface ReadingDef {
  encounter: { title: string; find: Find };
  adaptation: {
    title: string;
    find?: Find;
    /** Quotes from a cited source instead of the record. */ quotes?: string[];
  };
  reflection: { title: string; find: Find };
  /** One line that carries the reader from this ground to the next. */
  bridge: string;
}

const DEFS: Record<string, ReadingDef> = {
  'great-indian-bustard': {
    encounter: {
      title: 'A large bird of open ground',
      find: ['large, ground-dwelling bird', 'Once found across much of', 'The largest surviving population'],
    },
    adaptation: {
      title: 'Why it needs the open',
      find: ['Semi-arid and arid grasslands'],
    },
    reflection: {
      title: 'What its grassland stands for',
      find: ['indicator of the health'],
    },
    bridge: 'From the open grassland of the Thar to the broken slopes above the treeline.',
  },
  'snow-leopard': {
    encounter: {
      title: 'Above the treeline',
      find: ['Steep, broken terrain', 'The higher Himalaya and the trans-Himalayan'],
    },
    adaptation: {
      title: 'Built for cold, steep ground',
      quotes: ['coat', 'tail', 'paws'],
    },
    reflection: {
      title: 'Where the rivers begin',
      find: ['apex predator of Central and South Asia'],
    },
    bridge: 'The rivers begin in these mountains. Downstream, in silt-laden lowland channels, the next animal hunts by sound.',
  },
  'ganges-river-dolphin': {
    encounter: {
      title: 'A dolphin of rivers, not the sea',
      find: ['Deep pools, confluences', 'The main stems and larger tributaries'],
    },
    adaptation: { title: 'Hunting by sound', find: ['relies on echolocation'] },
    reflection: {
      title: 'A measure of the river',
      find: ['sensitive indicator of river health'],
    },
    bridge: 'Up from the river channel, into the forests where rivers rise.',
  },
  'bengal-tiger': {
    encounter: {
      title: 'Many forests, one predator',
      find: ['Populations range from the dry forests', 'Four broad landscapes'],
    },
    adaptation: {
      title: 'What a tiger’s ground must hold',
      find: ['always with sufficient large prey'],
    },
    reflection: {
      title: 'An umbrella over the forest',
      find: ['umbrella species'],
    },
    bridge: 'Out of the forest, onto the tall grass of the Brahmaputra floodplain.',
  },
  'indian-rhinoceros': {
    encounter: {
      title: 'Tall grass and standing water',
      find: ['Tall "elephant grass"', 'The floodplain grasslands of the Brahmaputra'],
    },
    adaptation: {
      title: 'Grazers that keep the grass open',
      find: ['ecosystem engineers'],
    },
    reflection: {
      title: 'A recovery held in one place',
      find: ['It remains Vulnerable because'],
    },
    bridge: 'Five species, five grounds. Next, every species the atlas holds.',
  },
};

export interface ReadingBeatText {
  title: string;
  /** The record's sentences, verbatim. */
  sentences: string[];
}

export interface StudyReading {
  encounter: ReadingBeatText;
  adaptation: ReadingBeatText & {
    quotes: Adaptation[];
    quoteSource: typeof ADAPTATION_SOURCE | null;
  };
  reflection: ReadingBeatText;
  bridge: string;
  /** The habitat band the record gives in metres, for the field note (the snow leopard's). */
  band: string | null;
}

const found = (s: Species, find: Find = []) => {
  const out: string[] = [];
  for (const f of find) {
    const sentence = sentenceWith(s, f);
    if (sentence && !out.includes(sentence)) out.push(sentence);
  }
  return out;
};

export function readingFor(studyId: string, s: Species): StudyReading | null {
  const d = DEFS[studyId];
  if (!d) return null;
  const quotes = (d.adaptation.quotes ?? []).flatMap((id) => ADAPTATIONS.filter((a) => a.id === id));
  return {
    encounter: {
      title: d.encounter.title,
      sentences: found(s, d.encounter.find),
    },
    adaptation: {
      title: d.adaptation.title,
      sentences: found(s, d.adaptation.find),
      quotes,
      quoteSource: quotes.length ? ADAPTATION_SOURCE : null,
    },
    reflection: {
      title: d.reflection.title,
      sentences: found(s, d.reflection.find),
    },
    bridge: d.bridge,
    band: habitatBand(s),
  };
}
