/**
 * THREE-DIMENSIONAL MODELS OF THE FIVE FIELD-STUDY ANIMALS — the slot, and why it is empty.
 *
 * A field study's world can stand its animal as a 3D model instead of the record's cut-out photograph
 * (world/field/gl/modelSubject.ts). Only a model whose species, author and licence are known may go here, and a
 * model claims nearly what a photograph does — "this is what the animal looks like" — so it is credited wherever it
 * is shown, and a stylised or generic model is never put in for a specific species (the atlas's standing rule).
 *
 * As of 19 October 2026 no entry qualifies for shipping:
 *
 *   - Great Indian Bustard (Ardeotis nigriceps): no 3D model of the species was found under any licence. The one
 *     "bustard" on Sketchfab (486 faces) is a generic low-poly great bustard, a different species.
 *   - Ganges river dolphin (Platanista gangetica): none found. The river dolphins that exist (Amazon, Irrawaddy,
 *     Yangtze skull) are other species; standing one in the Ganga would be false.
 *   - Bengal tiger: the only downloadable CC BY model is a cartoon ("Stylized Bengal Tiger", Jungle Jim); rejected.
 *   - Snow leopard: two plausible candidates, both behind a Sketchfab login (the API refuses an anonymous download,
 *     HTTP 401), so neither could be fetched or inspected here:
 *       · "Snow leopard" by Chenzoss, 19,455 faces, CC BY 4.0, not rigged —
 *         https://sketchfab.com/3d-models/snow-leopard-2d162ddb415449b697fe19db8258a02e
 *       · "Snow Leopard (NHMW-ZOO-MAMM-B5555)", Naturhistorisches Museum Wien scan of a mounted specimen, 200,000
 *         faces, CC BY-NC 4.0 (non-commercial only) —
 *         https://sketchfab.com/3d-models/snow-leopard-nhmw-zoo-mamm-b5555-b1a06e65cff745fc9f64de0f1aacbab4
 *   - Greater one-horned rhinoceros: "Indian Rhinoceros" by planeta-elefante, CC BY 4.0, 1,928 faces with 24
 *     animation clips, but untextured grey low-poly — below the worlds' standard, and behind the same login —
 *     https://sketchfab.com/3d-models/indian-rhinoceros-dd9e26696bd84211ae4b09f0d5dfb162
 *
 * To install one: download the glTF with your own Sketchfab account, confirm the species and the licence on the
 * model's page, compress it (`npx gltfpack -i in.glb -o model.glb -cc -tc -si 0.5`, meshopt geometry and KTX-free
 * textures under ~2 MB), put it in src/assets/models/, import its URL here and add an entry. The world builds it when
 * the study comes near and falls back to the photograph if it cannot load. documentation/SPECIES_3D_AND_READING.md
 * keeps the full search record.
 */
export interface SpeciesModel {
  /** The .glb's URL (an `import x from '../assets/models/….glb?url'`). */
  url: string;
  /** The model's height in the world, as a share of the cut-out photograph's (1: the same as the card it replaces). */
  scale?: number;
  /** Radians to turn the model about its up axis so it faces the way the photograph's animal faced. */
  yaw?: number;
  /** The clip to loop, if the model has one that suits a still moment (an idle, a breath); none: it stands still. */
  clip?: RegExp;
  title: string;
  credit: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
}

/** Keyed by field-study id (the species id). Empty: see above. */
export const SPECIES_MODELS: Record<string, SpeciesModel> = {};
