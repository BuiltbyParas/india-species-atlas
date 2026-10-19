/**
 * The flagship encounter: the snow leopard, met closer than the index's world allows.
 *
 * Why this animal: it is the one study with real footage of wild animals in
 * India at a usable size (two clips from Spiti, src/assets/field/CREDITS.md),
 * and the only one of the five for which a credible 3D asset exists at all —
 * a museum scan of a mounted specimen. The others have none that is not a
 * stylised or game model, which this atlas does not show as the animal
 * (see documentation/FIELD_OF_SPECIES_ENCOUNTER.md).
 *
 * Editorial, not data: the species' facts still come from its record. The
 * adaptations below are quoted from the Snow Leopard Trust's own page, and
 * each says so where it is shown.
 */

export const ENCOUNTER_STUDY = 'snow-leopard';

export interface Adaptation {
  id: string;
  /** The part of the body, as a short label. */
  part: string;
  /** The source's sentence, verbatim. */
  quote: string;
}

export const ADAPTATION_SOURCE = {
  label: 'Snow Leopard Trust, “Physical Features”',
  url: 'https://snowleopard.org/snow-leopard-facts/physical-features/',
  checked: '18 October 2026',
};

/**
 * Verbatim from ADAPTATION_SOURCE (one sentence, on the ears and the nasal cavity, split in two; a dash set as a
 * dash): nothing paraphrased into a claim the page does not make.
 */
export const ADAPTATIONS: Adaptation[] = [
  {
    id: 'tail',
    part: 'Tail',
    quote: 'Its extra long tail helps the cat keep its balance and provides extra warmth when it’s wrapped around the body.',
  },
  {
    id: 'paws',
    part: 'Paws',
    quote: 'Its extra large paws keep the cat from sinking into the snow — like a pair of natural snow shoes.',
  },
  {
    id: 'limbs',
    part: 'Limbs',
    quote: 'The cat has strong, short front limbs and longer hind limbs.',
  },
  {
    id: 'nose',
    part: 'Nasal cavity',
    quote: 'The wide, short nasal cavity warms the air before it reaches the cat’s lungs.',
  },
  {
    id: 'ears',
    part: 'Ears',
    quote: 'Its round, short ears reduce heat loss.',
  },
  {
    id: 'coat',
    part: 'Coat',
    quote: 'The snow leopard sports excellent camouflage thanks to its grey-white fur with its dark spots and rosettes.',
  },
];

/**
 * THE SPECIMEN — the integration point for the 3D encounter.
 *
 * The asset chosen is the Natural History Museum Vienna's scan of a mounted
 * snow leopard (NHMW-ZOO-MAMM-B5555), published on Sketchfab under CC BY-NC
 * 4.0. Sketchfab serves downloads only to a signed-in account, so the file is
 * not in the repository yet. To install it:
 *
 *   1. Download the glTF (or GLB) from SPECIMEN_META.sourceUrl while signed in.
 *   2. Save it as src/assets/models/snow-leopard-nhmw-b5555.glb (a .gltf with
 *      separate textures should be packed into one .glb first, e.g. with
 *      `npx @gltf-transform/cli copy in.gltf out.glb`; Draco is not decoded,
 *      meshopt is).
 *   3. Optionally add snow-leopard-nhmw-b5555.json beside it with the
 *      calibration (SpecimenCalibration): which way the animal faces and where
 *      each adaptation sits on it, measured on the model, so the notes can be
 *      pinned to the body. Without it the notes are listed, not pinned.
 *   4. Rebuild. The encounter offers "Specimen" as soon as the file is there.
 *
 * Nothing else needs changing. Until then the encounter is the footage.
 */
export interface SpecimenCalibration {
  /** Turn (radians, about the vertical) that brings the animal side-on, head to the right. */
  yaw?: number;
  /** Where each adaptation sits, as fractions of the model's bounding box (0–1 on each axis, y up). */
  anchors?: Partial<Record<string, [number, number, number]>>;
  /** An animation clip to idle on, if the asset has one; otherwise the first clip, if any. */
  idle?: string;
}

export const SPECIMEN_META = {
  title: 'Snow leopard, mounted specimen NHMW-ZOO-MAMM-B5555',
  /** Said wherever the model is on screen: what it is, and what it is not. */
  disclosure:
    'A 3D scan of a mounted museum specimen, a female that died at Schönbrunn Zoo in 1943 — not a live animal, and not posed or animated by this atlas. Its fur has aged in colour since it was mounted.',
  credit: 'Natural History Museum Vienna (scanned by Alba Zuna-Kratky, Anna Haider and Viola Winkler)',
  license: 'CC BY-NC 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-nc/4.0/',
  sourceUrl: 'https://sketchfab.com/3d-models/snow-leopard-nhmw-zoo-mamm-b5555-b1a06e65cff745fc9f64de0f1aacbab4',
};

const files = import.meta.glob<string>('../assets/models/snow-leopard-nhmw-b5555.glb', { query: '?url', import: 'default', eager: true });
const calibrations = import.meta.glob<SpecimenCalibration>('../assets/models/snow-leopard-nhmw-b5555.json', { import: 'default', eager: true });

/** The installed model's URL, or null while it is not installed. */
export const SPECIMEN_URL: string | null = Object.values(files)[0] ?? null;
export const SPECIMEN_CALIBRATION: SpecimenCalibration = Object.values(calibrations)[0] ?? {};
