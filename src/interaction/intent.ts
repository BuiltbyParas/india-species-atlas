/**
 * What the hand can do here, in seven words.
 *
 * The instrument (`CustomCursor.tsx`) carries a word wherever an element
 * names its action (`data-cursor="Enter"`, `data-cursor-area="Turn"`). The
 * words are free text for the reader, but each belongs to one of a small set
 * of intents, and the intent — not the word — decides the reticle's shape, so
 * the same gesture always looks the same:
 *
 *   discover   look closer; nothing changes yet          the open reticle
 *   enter      go into a page, a species, a chapter      filled, carries the word
 *   trace      follow a line                             contour-coloured, small
 *   locate     a place on the map                        ticks close to a crosshair
 *   turn       rotate an object (the sphere, the relief) a dashed ring
 *   define     read what a term or a figure means        a squared frame
 *   drag       move something sideways                   horizontal ticks only
 *   play       start a film                              filled, like enter
 *
 * Unknown words fall back to `discover`. Add a word here before using it in
 * markup, so the vocabulary stays small enough to learn.
 */
export type CursorIntent = 'discover' | 'enter' | 'trace' | 'locate' | 'turn' | 'define' | 'drag' | 'play';

const WORDS: Record<string, CursorIntent> = {
  discover: 'discover',
  explore: 'discover',
  enter: 'enter',
  open: 'enter',
  return: 'enter',
  compare: 'enter',
  trace: 'trace',
  follow: 'trace',
  locate: 'locate',
  turn: 'turn',
  define: 'define',
  drag: 'drag',
  play: 'play',
  pause: 'play',
  close: 'enter',
  // The field studies' verbs (content/fieldStudies.ts). Trace and Drag keep their own reticles.
  ascend: 'enter',
  reveal: 'enter',
  transform: 'enter',
};

export function intentOf(word: string | null | undefined): CursorIntent {
  return (word && WORDS[word.trim().toLowerCase()]) || 'discover';
}
