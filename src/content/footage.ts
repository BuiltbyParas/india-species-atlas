import snowLeopardSpiti from '../assets/field/snow-leopard-spiti.webm';
import snowLeopardSpitiMp4 from '../assets/field/snow-leopard-spiti.mp4';
import snowLeopardSpitiPoster from '../assets/field/snow-leopard-spiti-poster.webp';
import bustardCall from '../assets/field/great-indian-bustard-call.webm';
import bustardCallMp4 from '../assets/field/great-indian-bustard-call.mp4';
import bustardCallPoster from '../assets/field/great-indian-bustard-call-poster.webp';
import snowLeopardPair from '../assets/field/snow-leopard-spiti-pair.webm';
import snowLeopardPairMp4 from '../assets/field/snow-leopard-spiti-pair.mp4';
import snowLeopardPairPoster from '../assets/field/snow-leopard-spiti-pair-poster.webp';

/**
 * Moving footage for the field studies (src/assets/field/CREDITS.md keeps the full record).
 *
 * Only clips whose place, author and licence are known are here: a study
 * without an entry keeps its photograph. Every clip is silent, trimmed and
 * looped from the original, and says so in its credit.
 *
 * Each clip is AV1 in WebM, with an H.264 MP4 for browsers without AV1. Not
 * VP9: on this project's own test machine (AMD Renoir, Linux, Chrome 155 with
 * its GPU on) decoding VP9 in hardware crashed the GPU process and took every
 * WebGL context on the page with it — the field stage included. AV1 and H.264
 * play there without touching the stage (scripts/audit/fos-decode.mjs).
 */
export interface Footage {
  /** AV1 in WebM. */
  src: string;
  /** H.264 in MP4, for browsers without AV1. */
  fallback: string;
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
    fallback: snowLeopardSpitiMp4,
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

/**
 * The living plates on the home page's field-studies index (LivingPlate.tsx): the animal itself, filmed in the wild in
 * India, set into its drawn world. Only the two studies with such footage have one; the others keep their world and
 * the record's photograph in it. `focus` is where the animal is in the frame (CSS object-position), so a narrow plate
 * crops around it rather than through it.
 */
export interface PlateFootage extends Footage {
  focus: string;
  /** What the animal is doing, in a few words: the plate's label. */
  behaviour: string;
}

export const PLATE_FOOTAGE: Record<string, PlateFootage> = {
  'great-indian-bustard': {
    src: bustardCall,
    fallback: bustardCallMp4,
    poster: bustardCallPoster,
    width: 1280,
    height: 720,
    focus: '50% 40%',
    behaviour: 'Standing in the grassland, calling',
    title: 'A Great Indian Bustard calling, filmed in India by the uploader (published February 2026)',
    credit: 'Shiv’s fotografia',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Great_Indian_Bustard_call.webm',
    note: 'Ten seconds of the eleven, cropped closer, silent and looped.',
  },
  'snow-leopard': {
    src: snowLeopardPair,
    fallback: snowLeopardPairMp4,
    poster: snowLeopardPairPoster,
    width: 1280,
    height: 720,
    focus: '58% 55%',
    behaviour: 'Two wild snow leopards resting on a cliff ledge',
    title: 'Two wild snow leopards on a cliff ledge, Spiti Valley, Himachal Pradesh, filmed by Tanzin Thinley',
    credit: 'Tanzin Thinley, Nature Conservation Foundation India and Snow Leopard Trust',
    license: 'CC BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0',
    sourceUrl: "https://commons.wikimedia.org/wiki/File:A_New_Year%27s_Snow_Leopard_Encounter_in_India.webm",
    note: 'Eleven seconds (from 0:16) of the original, without its titles, silent and looped.',
  },
};

/** The <source> list for a clip, best first. */
export function footageSources(f: Footage): Array<{ src: string; type: string }> {
  return [
    { src: f.src, type: 'video/webm; codecs="av01.0.04M.08"' },
    { src: f.fallback, type: 'video/mp4; codecs="avc1.4D401F"' },
  ];
}
