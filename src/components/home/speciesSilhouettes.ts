/**
 * Profile silhouettes for the hero's species plates.
 *
 * ## Why these are drawn rather than sourced
 *
 * The atlas ships no photographs (see the README), and no openly-licensed 3D
 * model of any of these twelve species exists at a standard this project could
 * cite. What museums have published under open licences is skulls, skeletons
 * and scans of taxidermy — not animals in life posture — and the remaining
 * free assets are stylised game models. Presenting one of those as a depiction
 * of, say, *Ardeotis nigriceps* would be exactly the sort of unsourced claim
 * the rest of the atlas is built to avoid.
 *
 * A silhouette makes a much weaker and therefore honest claim: this is the
 * body plan and posture of the animal, at the level of detail an outline can
 * carry. Each is drawn here from the species' published description — overall
 * proportion, limb length, neck and tail length, horn or bill shape — and
 * nothing more. They are schematic, not to scale between species, and the UI
 * says so. Anatomical features that vary within a species are deliberately
 * left out: the Asian Elephant carries no tusks, because most Indian
 * elephants (all females and many males) have none.
 *
 * ## Format
 *
 * Each silhouette is a set of closed subpaths inside its own `box`, wound the
 * same way and filled with the nonzero rule, so overlapping blobs union rather
 * than cutting holes. That lets legs, ears and tails be authored as separate
 * simple shapes instead of one long self-intersecting outline.
 *
 * A point is `[x, y]` or `[x, y, tension]`, where tension controls the
 * Catmull-Rom smoothing applied at that point: 1 (the default) is fully
 * rounded, 0 is a hard corner. Hooves, wingtips and tail tips want corners;
 * backs and bellies want curves.
 *
 * Subjects face right, except the vulture, which is drawn soaring from below
 * because that is the view the species is actually identified in.
 */

/** A point in silhouette space, with optional smoothing tension (default 1). */
export type SilhouettePoint = readonly [number, number] | readonly [number, number, number];

export interface Silhouette {
  /** Natural bounds the subpaths are drawn in; fitted into the plate by aspect. */
  box: readonly [number, number];
  /** Closed subpaths, unioned under the nonzero fill rule. */
  paths: ReadonlyArray<ReadonlyArray<SilhouettePoint>>;
  /** What the outline depicts, for the credit line and the accessible text. */
  note: string;
}

export const SPECIES_SILHOUETTES: Readonly<Record<string, Silhouette>> = {
  'snow-leopard': {
    box: [134, 80],
    note: 'Standing profile: a stocky mountain cat with a short deep muzzle, heavy limbs and a tail as long as its head and body.',
    paths: [
      [[100, 25], [88, 21], [70, 23], [52, 21], [42, 26], [38, 35], [43, 46], [60, 50], [82, 49], [96, 43]],
      [[92, 26], [104, 22], [112, 26], [112, 40], [100, 43]],
      [[103, 20], [117, 18], [128, 23], [133, 31], [132, 39], [121, 43], [107, 42], [100, 31]],
      [[113, 20], [110, 8, 0.3], [102, 17], [107, 23]],
      [[42, 28], [30, 26], [18, 20], [8, 10], [2, 4, 0.2], [8, 15], [19, 27], [31, 35], [43, 40]],
      [[45, 43], [42, 58], [40, 70], [36, 76, 0], [49, 77, 0], [51, 60], [54, 45]],
      [[57, 45], [55, 60], [53, 72], [49, 77, 0], [62, 78, 0], [64, 60], [66, 45]],
      [[85, 43], [84, 58], [83, 70], [79, 76, 0], [91, 77, 0], [93, 60], [94, 43]],
      [[97, 41], [96, 58], [95, 71], [91, 76, 0], [104, 77, 0], [105, 58], [106, 41]],
    ],
  },

  'bengal-tiger': {
    box: [136, 82],
    note: 'Standing profile: a deep-chested cat, heavier through the shoulder than the snow leopard and carrying a much slimmer tail.',
    paths: [
      [[102, 24], [88, 19], [70, 21], [52, 20], [41, 25], [37, 35], [42, 47], [60, 52], [84, 51], [98, 44]],
      [[94, 25], [106, 21], [114, 25], [114, 40], [102, 44]],
      [[105, 19], [119, 17], [130, 22], [135, 30], [134, 39], [123, 43], [109, 42], [102, 31]],
      [[115, 19], [112, 8, 0.3], [104, 16], [109, 22]],
      [[41, 28], [29, 27], [17, 22], [8, 14], [3, 8, 0.2], [8, 19], [18, 29], [30, 36], [42, 40]],
      [[44, 45], [41, 60], [39, 72], [35, 78, 0], [48, 79, 0], [50, 62], [53, 46]],
      [[56, 47], [54, 62], [52, 74], [48, 79, 0], [61, 80, 0], [63, 62], [65, 46]],
      [[86, 45], [85, 60], [84, 72], [80, 78, 0], [92, 79, 0], [94, 62], [95, 45]],
      [[98, 43], [97, 60], [96, 73], [92, 78, 0], [105, 79, 0], [106, 60], [107, 42]],
    ],
  },

  'red-panda': {
    box: [122, 76],
    note: 'Standing profile: a low, short-legged carnivore with a pointed face, rounded ears and a tail as thick as its body.',
    paths: [
      [[92, 29], [80, 25], [64, 25], [50, 27], [42, 33], [40, 41], [46, 49], [62, 53], [80, 51], [90, 45]],
      [[86, 28], [98, 23], [110, 28], [112, 39], [104, 46], [90, 45]],
      [[104, 31], [119, 35], [119, 43], [104, 44]],
      [[100, 24], [97, 13, 0.3], [89, 22], [94, 28]],
      [[110, 26], [108, 15, 0.3], [100, 23], [104, 29]],
      [[44, 31], [32, 29], [19, 26], [8, 21], [1, 17, 0.25], [5, 29], [16, 39], [30, 46], [44, 49]],
      [[48, 47], [46, 58], [44, 66], [40, 71, 0], [52, 72, 0], [53, 58], [55, 48]],
      [[58, 49], [57, 61], [55, 68], [51, 72, 0], [63, 73, 0], [64, 59], [65, 49]],
      [[80, 47], [79, 59], [78, 66], [74, 71, 0], [86, 72, 0], [87, 59], [88, 47]],
      [[90, 45], [89, 60], [88, 68], [84, 72, 0], [96, 73, 0], [97, 59], [98, 44]],
    ],
  },

  'great-indian-bustard': {
    box: [86, 122],
    note: 'Standing profile: a heavy-bodied grassland bird carried high on long legs, with a long upright neck and a short stout bill.',
    paths: [
      [[58, 42], [46, 41], [32, 45], [19, 52], [9, 60], [6, 67, 0.3], [18, 75], [32, 80], [47, 81], [58, 76], [64, 65], [64, 51]],
      [[50, 20], [64, 20], [66, 50], [52, 53]],
      [[73, 13], [63, 7], [53, 11], [52, 21], [61, 27], [72, 23]],
      [[70, 15], [84, 18, 0], [70, 22]],
      [[36, 76], [33, 97], [31, 110], [23, 115, 0], [34, 118, 0], [43, 115, 0], [39, 99], [42, 76]],
      [[49, 76], [47, 97], [45, 110], [37, 115, 0], [48, 118, 0], [57, 115, 0], [53, 99], [54, 76]],
    ],
  },

  gharial: {
    box: [144, 50],
    note: 'Profile: an exceptionally slender-snouted crocodilian on sprawling limbs, drawn with the bulbous ghara of an adult male.',
    paths: [
      [[26, 21], [17, 21], [9, 24], [3, 30], [1, 37, 0.25], [8, 37], [17, 33], [25, 30], [32, 29], [42, 32], [56, 33], [70, 33], [82, 32], [92, 29], [102, 27], [116, 26], [130, 25], [139, 25, 0.3], [137, 20], [126, 19], [114, 20], [104, 20], [95, 17], [86, 14], [74, 13], [60, 13], [46, 14], [34, 17]],
      [[133, 19], [130, 11, 0.4], [124, 17], [129, 21]],
      [[34, 30], [31, 39], [26, 44, 0], [39, 45, 0], [42, 38], [44, 31]],
      [[70, 32], [67, 41], [62, 46, 0], [75, 47, 0], [78, 39], [80, 33]],
    ],
  },

  'white-rumped-vulture': {
    box: [152, 62],
    note: 'Soaring outline seen from below — the view the species is identified in: long plank-like wings, deeply splayed primaries, a short square tail and a small head on a bare neck.',
    paths: [
      [[76, 7], [82, 15], [84, 25], [83, 41], [79, 47], [73, 47], [69, 41], [68, 25], [70, 15]],
      [[76, 2, 0.4], [81, 7], [80, 15], [72, 15], [71, 7]],
      [[68, 39], [84, 39], [83, 52], [81, 55, 0], [71, 55, 0], [69, 52]],
      [[83, 17], [104, 14], [126, 15], [142, 18], [149, 21, 0], [140, 24], [146, 28, 0], [136, 30], [141, 35, 0], [129, 35], [133, 41, 0], [121, 40], [123, 47, 0], [112, 43], [99, 40], [85, 39]],
      [[69, 17], [48, 14], [26, 15], [10, 18], [3, 21, 0], [12, 24], [6, 28, 0], [16, 30], [11, 35, 0], [23, 35], [19, 41, 0], [31, 40], [29, 47, 0], [40, 43], [53, 40], [67, 39]],
    ],
  },

  'indian-rhinoceros': {
    box: [138, 88],
    note: 'Standing profile: a heavy grazer on pillar legs, with a single horn set on the nose and the pronounced shoulder and flank folds of the species.',
    paths: [
      [[110, 30], [100, 24], [88, 22], [70, 24], [54, 28], [44, 37], [47, 52], [63, 61], [85, 62], [103, 58], [112, 48]],
      [[100, 30], [113, 33], [113, 53], [100, 53]],
      [[106, 36], [118, 34], [130, 41], [135, 50], [129, 57], [114, 57], [104, 48]],
      [[124, 41], [130, 26, 0.2], [137, 45], [129, 47]],
      [[101, 26], [100, 16, 0.5], [95, 25], [99, 30]],
      [[45, 37], [39, 45], [37, 58, 0.35], [42, 55], [47, 44]],
      [[51, 54], [49, 70], [47, 80], [43, 86, 0], [56, 87, 0], [58, 70], [60, 55]],
      [[63, 56], [61, 72], [60, 82], [56, 87, 0], [70, 88, 0], [71, 72], [72, 56]],
      [[90, 56], [89, 70], [88, 80], [84, 86, 0], [97, 87, 0], [98, 70], [99, 55]],
      [[103, 54], [102, 70], [101, 81], [97, 86, 0], [111, 87, 0], [112, 70], [113, 50]],
    ],
  },

  'asian-elephant': {
    box: [136, 94],
    note: 'Standing profile: a domed forehead, convex back and the small ear of the Asian species. Drawn without tusks, which most Indian elephants lack.',
    paths: [
      [[110, 28], [96, 22], [78, 23], [58, 26], [45, 33], [39, 44], [44, 58], [60, 66], [82, 67], [102, 62], [112, 50]],
      [[104, 30], [112, 19], [124, 19], [130, 30], [130, 44], [122, 52], [108, 50], [102, 40]],
      [[120, 44], [128, 48], [132, 60], [131, 74], [128, 86], [125, 90, 0.2], [118, 86], [121, 72], [122, 58], [114, 50]],
      [[106, 28], [95, 32], [93, 46], [98, 58], [108, 59], [112, 48], [110, 32]],
      [[42, 42], [36, 52], [34, 66], [32, 76, 0.3], [38, 72], [40, 56], [45, 48]],
      [[48, 58], [46, 74], [45, 84], [41, 90, 0], [55, 91, 0], [57, 74], [59, 58]],
      [[63, 60], [62, 76], [61, 86], [57, 91, 0], [72, 92, 0], [73, 76], [74, 60]],
      [[92, 60], [91, 74], [90, 84], [86, 90, 0], [99, 91, 0], [100, 74], [101, 58]],
      [[105, 58], [104, 74], [103, 85], [99, 90, 0], [113, 91, 0], [114, 74], [114, 54]],
    ],
  },

  'ganges-river-dolphin': {
    box: [138, 58],
    note: 'Profile: a long-beaked river dolphin with a low triangular ridge in place of a dorsal fin, and broad paddle-like flippers.',
    paths: [
      [[112, 22], [98, 17], [82, 16], [66, 18], [52, 22], [40, 28], [33, 33], [37, 39], [50, 42], [68, 42], [86, 39], [100, 34], [110, 30], [116, 26]],
      [[110, 24], [126, 26], [137, 27, 0.15], [126, 31], [110, 32]],
      [[76, 18], [68, 8, 0.4], [58, 18], [68, 21]],
      [[84, 36], [92, 45], [88, 53, 0.3], [76, 45], [76, 36]],
      [[36, 30], [24, 25], [13, 17], [7, 14, 0.2], [16, 26], [19, 34], [16, 42], [9, 51, 0.2], [20, 44], [35, 38]],
    ],
  },

  dugong: {
    box: [136, 58],
    note: 'Profile: a fusiform sirenian with a down-turned muzzle, no dorsal fin and a whale-like fluked tail.',
    paths: [
      [[114, 22], [98, 15], [80, 15], [62, 18], [46, 23], [35, 29], [39, 36], [56, 43], [78, 45], [96, 43], [110, 36]],
      [[106, 22], [118, 21], [128, 28], [127, 38], [116, 42], [104, 38], [102, 29]],
      [[98, 37], [102, 47], [96, 54, 0.3], [86, 46], [88, 37]],
      [[38, 30], [26, 24], [14, 17], [8, 14, 0.2], [17, 26], [20, 34], [17, 42], [10, 51, 0.2], [22, 44], [36, 38]],
    ],
  },

  'lion-tailed-macaque': {
    box: [122, 86],
    note: 'Quadrupedal profile: a slender macaque whose broad facial mane and tufted tail are the features the species is named for.',
    paths: [
      [[92, 34], [80, 29], [64, 29], [50, 33], [42, 42], [47, 54], [63, 60], [80, 58], [92, 50]],
      [[90, 26], [100, 19], [110, 25], [113, 37], [107, 46], [95, 47], [87, 40], [86, 30]],
      [[106, 31], [120, 34], [120, 43], [105, 44]],
      [[44, 40], [32, 38], [21, 34], [13, 28], [8, 21], [6, 14, 0.3], [11, 22], [18, 31], [28, 39], [40, 45]],
      [[10, 18], [3, 7, 0.25], [13, 14], [13, 22]],
      [[52, 52], [49, 66], [47, 75], [43, 80, 0], [53, 81, 0], [56, 67], [58, 54]],
      [[62, 54], [60, 68], [58, 77], [54, 81, 0], [65, 82, 0], [67, 68], [69, 55]],
      [[80, 52], [79, 66], [78, 75], [74, 80, 0], [84, 81, 0], [86, 67], [87, 53]],
      [[89, 50], [88, 66], [87, 76], [83, 80, 0], [94, 81, 0], [95, 66], [96, 48]],
    ],
  },

  'nilgiri-tahr': {
    box: [118, 84],
    note: 'Standing profile: a stocky mountain ungulate with short, thick horns sweeping back in an arc over the neck.',
    paths: [
      [[94, 32], [80, 26], [62, 26], [46, 29], [37, 36], [40, 46], [56, 56], [76, 55], [90, 47]],
      [[90, 30], [100, 27], [110, 33], [113, 42], [105, 47], [94, 45], [88, 38]],
      [[106, 34], [116, 37], [115, 45], [104, 45]],
      [[100, 29], [104, 21], [102, 14], [95, 11, 0], [91, 16], [95, 21], [97, 26], [97, 30]],
      [[95, 36], [86, 33], [83, 40], [92, 43]],
      [[40, 32], [32, 34], [33, 44], [41, 41]],
      [[46, 50], [44, 64], [42, 73], [38, 78, 0], [49, 79, 0], [51, 65], [53, 52]],
      [[57, 52], [55, 66], [53, 75], [49, 79, 0], [60, 80, 0], [62, 66], [63, 53]],
      [[78, 50], [77, 64], [76, 73], [72, 78, 0], [83, 79, 0], [85, 65], [86, 51]],
      [[87, 48], [86, 64], [85, 74], [81, 78, 0], [92, 79, 0], [93, 64], [94, 46]],
    ],
  },
};
