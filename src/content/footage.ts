import snowLeopardSpiti from '../assets/field/snow-leopard-spiti.webm';
import snowLeopardSpitiPoster from '../assets/field/snow-leopard-spiti-poster.webp';

/**
 * Moving footage for the field studies (src/assets/field/CREDITS.md keeps the full record).
 *
 * Only clips whose place, author and licence are known are here: a study
 * without an entry keeps its photograph. Every clip is silent, trimmed and
 * looped from the original, and says so in its credit.
 */
export interface Footage {
  src: string;
  poster: string;
  width: number;
  height: number;
  /** What the clip is, in one line, for the caption and the accessible name. */
  title: string;
  credit: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
  /** What was done to the original, said plainly. */
  note: string;
}

export const FOOTAGE: Record<string, Footage> = {
  'snow-leopard': {
    src: snowLeopardSpiti,
    poster: snowLeopardSpitiPoster,
    width: 720,
    height: 512,
    title: 'A snow leopard and her two cubs, camera-trap footage, Upper Spiti, Himachal Pradesh, 17 August 2012',
    credit: 'Rishi Sharma, Nature Conservation Foundation',
    license: 'CC BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Snow_leopard_family,_Spiti,_Himachal_Pradesh,_India.webm',
    note: 'Eight seconds of the original, cropped to the frame without the camera’s overlay, silent and looped.',
  },
};
