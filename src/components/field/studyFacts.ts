import type { Species } from '../../types';

/**
 * Facts the field studies show, read out of the species record.
 *
 * The studies quote the record rather than restating it: a number on screen
 * is found in the record's own sentence, and the sentence is shown with it.
 * If a record is ever rewritten and the sentence is gone, the moment that
 * needed it shows nothing rather than a number from memory.
 */

const sentences = (text: string) => text.split(/(?<=\.)\s+/);

/** The record's sentence (from any of its prose fields) that contains `needle`. */
export function sentenceWith(
  s: Species,
  needle: string | RegExp,
  from: Array<'summary' | 'description' | 'indianDistribution' | 'habitatNote' | 'threatNote' | 'whyItMatters'> = [
    'summary',
    'description',
    'indianDistribution',
    'habitatNote',
    'threatNote',
    'whyItMatters',
  ],
): string | null {
  const fields = from.map((k) => s[k]);
  for (const f of fields) {
    for (const sentence of sentences(f)) {
      if (typeof needle === 'string' ? sentence.includes(needle) : needle.test(sentence)) return sentence;
    }
  }
  return null;
}

const toNumber = (v: string) => Number(v.replace(/,/g, ''));

/** "3,000–5,000 m": the altitude band the habitat note gives, if it gives one. */
export function habitatBand(s: Species): string | null {
  return s.habitatNote.match(/\d[\d,]*\s?[–-]\s?\d[\d,]*\s?m\b/)?.[0] ?? null;
}

/** The band as numbers, for the ascent's ruler. */
export function habitatBandMetres(s: Species): [number, number] | null {
  const m = s.habitatNote.match(/(\d[\d,]*)\s?[–-]\s?(\d[\d,]*)\s?m\b/);
  return m ? [toNumber(m[1]), toNumber(m[2])] : null;
}

/**
 * The rhinoceros record's two population figures, with the sentences that
 * give them: "fewer than 200 animals a century ago", "around 4,000 animals".
 */
export function populationFigures(s: Species): { past: number; pastSentence: string; now: number; nowSentence: string } | null {
  const pastSentence = sentenceWith(s, /fewer than [\d,]+ animals/);
  const nowSentence = sentenceWith(s, /around [\d,]+ animals/);
  const past = pastSentence?.match(/fewer than ([\d,]+) animals/)?.[1];
  const now = nowSentence?.match(/around ([\d,]+) animals/)?.[1];
  if (!pastSentence || !nowSentence || !past || !now) return null;
  return { past: toNumber(past), pastSentence, now: toNumber(now), nowSentence };
}

/** A figure the record gives as "roughly N" or "about N", with its sentence. */
export function approximateFigure(s: Species, word: 'roughly' | 'about'): { value: string; sentence: string } | null {
  const sentence = sentenceWith(s, new RegExp(`${word} [\\d,]+`));
  const value = sentence?.match(new RegExp(`${word} (\\d[\\d,]*\\d|\\d)`))?.[1];
  return sentence && value ? { value, sentence } : null;
}
