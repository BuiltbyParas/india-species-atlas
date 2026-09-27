/**
 * The documentary's narration, written to be spoken.
 *
 * Each entry is one breath: a phrase recorded (or synthesised) on its own,
 * so the pauses between them are designed rather than left to the voice.
 * `pause` is the silence before the phrase, in seconds.
 *
 * Every phrase that states a fact carries a `claim`: the species (or
 * programme) record it rests on, the field, and the exact words that field
 * must contain. QC checks each one against the live dataset before every
 * render. Phrases without a claim are interpretation, and say so in `note`.
 *
 * Sources: src/data/species.ts and src/data/programmes.ts of the India
 * Species Atlas. Nothing here comes from anywhere else.
 *
 * @typedef {{ species?: string, programme?: string, field: string, must: string[] }} Claim
 * @typedef {{ id: string, act: string, pause: number, text: string, claim: Claim | null, note?: string }} Phrase
 */

/** @type {Phrase[]} */
export const SCRIPT = [
  // ACT 1 — the hook: what is a line?
  { id: 'N01', act: 'hook', pause: 2.3, text: 'A line is the simplest thing we draw.', claim: null, note: 'Opening' },
  { id: 'N02', act: 'hook', pause: 1.15, text: 'A stroke of ink.', claim: null },
  { id: 'N03', act: 'hook', pause: 0.5, text: 'A wire between two towers.', claim: null },
  { id: 'N04', act: 'hook', pause: 0.5, text: 'A road through a forest.', claim: null },
  { id: 'N05', act: 'hook', pause: 1.01, text: 'But every line we draw on a map is also drawn across the land.', claim: null },
  { id: 'N06', act: 'hook', pause: 0.76, text: 'And someone already lives there.', claim: null },

  // India
  { id: 'N07', act: 'india', pause: 1.48, text: 'India is not just a country on a map.', claim: null },
  { id: 'N08', act: 'india', pause: 0.43, text: 'It is a network of habitats.', claim: null },
  { id: 'N09', act: 'india', pause: 0.58, text: 'Desert and grassland. Forest. River. Mountain. Floodplain.', claim: null },
  {
    id: 'N10', act: 'india', pause: 0.76, text: 'The India Species Atlas maps twelve threatened species across it:',
    claim: { field: 'SPECIES.length', must: ['12'] }, note: 'Count read from the dataset at render time',
  },
  { id: 'N11', act: 'india', pause: 0.22, text: 'where each one is recorded, what presses on it, and what protects it.', claim: null, note: 'Describes the site’s three map layers' },
  { id: 'N12', act: 'india', pause: 0.65, text: 'Five of them tell this story.', claim: null },

  // Great Indian Bustard — the wire
  { id: 'N13', act: 'bustard', pause: 1.62, text: 'In the Thar, the land runs open to the horizon.', claim: null },
  {
    id: 'N14', act: 'bustard', pause: 0.58, text: 'The Great Indian Bustard needs it that way.',
    claim: { species: 'great-indian-bustard', field: 'habitatNote', must: ['large, undisturbed open areas with good visibility'] },
  },
  {
    id: 'N15', act: 'bustard', pause: 0.36, text: 'One of the heaviest flying birds in the world, it needs to see a long way.',
    claim: { species: 'great-indian-bustard', field: 'summary', must: ['One of the heaviest flying birds in the world'] },
  },
  {
    id: 'N16', act: 'bustard', pause: 0.63, text: 'Once found across much of the subcontinent,',
    claim: { species: 'great-indian-bustard', field: 'description', must: ['Once found across much of the Indian subcontinent'] },
  },
  {
    id: 'N17', act: 'bustard', pause: 0.2, text: 'it now survives in the low hundreds, most of them in Rajasthan.',
    claim: { species: 'great-indian-bustard', field: 'description', must: ['estimated in the low hundreds', 'great majority in Rajasthan'] },
  },
  {
    id: 'N18', act: 'bustard', pause: 1.01, text: 'Across its last grasslands run high-tension power lines.',
    claim: { species: 'great-indian-bustard', field: 'threatNote', must: ['high-tension power lines crossing the Thar'] },
  },
  {
    id: 'N19', act: 'bustard', pause: 0.43, text: 'Collision with them is now the single largest cause of death.',
    claim: { species: 'great-indian-bustard', field: 'threatNote', must: ['single largest cause of mortality'] },
  },
  {
    id: 'N20', act: 'bustard', pause: 0.76, text: 'Some lines are being buried, or moved.',
    claim: { species: 'great-indian-bustard', field: 'conservationActions', must: ['Burying or re-routing power lines'] },
  },
  {
    id: 'N21', act: 'bustard', pause: 0.36, text: 'Eggs from the wild are hatched at breeding centres near Sam and at Sorsan.',
    claim: { programme: 'gib-conservation-breeding', field: 'description', must: ['Eggs are collected from the wild', 'near Sam and at Sorsan'] },
  },
  { id: 'N22', act: 'bustard', pause: 0.63, text: 'Follow its last localities, and every threat against it, in the Atlas.', claim: null, note: 'Atlas' },

  // Bengal Tiger — the road
  { id: 'N23', act: 'tiger', pause: 1.48, text: 'Further east, the lines are roads.', claim: null },
  {
    id: 'N24', act: 'tiger', pause: 0.63, text: 'India is the tiger’s global stronghold.',
    claim: { species: 'bengal-tiger', field: 'description', must: ['India is its global stronghold'] },
  },
  {
    id: 'N25', act: 'tiger', pause: 0.36, text: 'The 2022 estimate placed the country’s tigers at roughly three thousand seven hundred,',
    claim: { species: 'bengal-tiger', field: 'description', must: ['2022 national estimate', 'roughly 3,700'] },
  },
  {
    id: 'N26', act: 'tiger', pause: 0.2, text: 'spread across more than fifty tiger reserves.',
    claim: { species: 'bengal-tiger', field: 'description', must: ['more than 50 tiger reserves'] },
  },
  { id: 'N27', act: 'tiger', pause: 0.76, text: 'But a reserve is an island, unless it connects.', claim: null, note: 'Interpretation of “securing corridors between reserves”' },
  {
    id: 'N28', act: 'tiger', pause: 0.43, text: 'Roads, railways, mines and settlements cut through the forest, and the corridors between.',
    claim: { species: 'bengal-tiger', field: 'threatNote', must: ['fragmentation of forest and corridors by roads, railways, mining and settlement'] },
  },
  { id: 'N29', act: 'tiger', pause: 0.63, text: 'The Atlas maps the landscapes behind that number: the reserves, and the lines between them.', claim: null, note: 'Atlas' },

  // Ganges River Dolphin — the river
  { id: 'N30', act: 'dolphin', pause: 1.48, text: 'Rivers are lines too.', claim: null },
  {
    id: 'N31', act: 'dolphin', pause: 0.58, text: 'The Ganges river dolphin is almost blind.',
    claim: { species: 'ganges-river-dolphin', field: 'description', must: ['functionally blind'] },
  },
  {
    id: 'N32', act: 'dolphin', pause: 0.29, text: 'It finds its way through silt-laden water by sound.',
    claim: { species: 'ganges-river-dolphin', field: 'description', must: ['relies on echolocation to hunt in turbid river water'] },
  },
  {
    id: 'N33', act: 'dolphin', pause: 0.63, text: 'Dams and barrages divide its rivers, and thin them in the dry season.',
    claim: { species: 'ganges-river-dolphin', field: 'threatNote', must: ['Dams and barrages fragment the population and reduce dry-season flow'] },
  },
  {
    id: 'N34', act: 'dolphin', pause: 0.36, text: 'It survives in the low thousands, across India, Nepal and Bangladesh.',
    claim: { species: 'ganges-river-dolphin', field: 'description', must: ['estimated in the low thousands across India, Nepal and Bangladesh'] },
  },
  {
    id: 'N35', act: 'dolphin', pause: 0.63, text: 'Some six hundred million people depend on the same two river basins.',
    claim: { species: 'ganges-river-dolphin', field: 'whyItMatters', must: ['~600 million people who depend on the Ganga and Brahmaputra basins'] },
  },
  {
    id: 'N36', act: 'dolphin', pause: 0.65, text: 'Project Dolphin, announced in 2020, now surveys and protects it.',
    claim: { programme: 'project-dolphin', field: 'description', must: ['Announced on 15 August 2020', 'population surveys'] },
  },
  { id: 'N37', act: 'dolphin', pause: 0.43, text: 'Trace its river network, reach by reach, in the Atlas.', claim: null, note: 'Atlas' },

  // Snow Leopard — the contour
  { id: 'N38', act: 'snow-leopard', pause: 1.91, text: 'Higher still, the lines are contours.', claim: null },
  {
    id: 'N39', act: 'snow-leopard', pause: 0.76, text: 'Above the treeline, between three and five thousand metres, the snow leopard hunts on broken rock.',
    claim: { species: 'snow-leopard', field: 'habitatNote', must: ['Steep, broken terrain above the treeline, typically 3,000–5,000 m'] },
  },
  {
    id: 'N40', act: 'snow-leopard', pause: 0.63, text: 'India’s first nationwide assessment put the count at about seven hundred and eighteen.',
    claim: { species: 'snow-leopard', field: 'description', must: ['India’s first nationwide assessment', 'about 718 snow leopards'] },
  },
  {
    id: 'N41', act: 'snow-leopard', pause: 0.63, text: 'In 2017 it moved from Endangered to Vulnerable.',
    claim: { species: 'snow-leopard', field: 'description', must: ['reassessed from Endangered to Vulnerable in 2017'] },
  },
  {
    id: 'N42', act: 'snow-leopard', pause: 0.36, text: 'Not because it recovered, but because the estimate was revised. It is still thought to be declining.',
    claim: { species: 'snow-leopard', field: 'description', must: ['revised (larger) population estimate rather than any recovery', 'still thought to be declining'] },
  },
  {
    id: 'N43', act: 'snow-leopard', pause: 0.63, text: 'Its alpine world is shrinking as the climate changes.',
    claim: { species: 'snow-leopard', field: 'threatNote', must: ['shrinking alpine zone under climate change'] },
  },
  {
    id: 'N44', act: 'snow-leopard', pause: 0.43, text: 'Here, conservation runs through the herders who share its valleys: livestock insurance, predator-proof corrals, community reserves.',
    claim: { species: 'snow-leopard', field: 'conservationActions', must: ['Livestock insurance and predator-proof corral schemes', 'Community-managed reserves'] },
  },
  { id: 'N44a', act: 'snow-leopard', pause: 0.63, text: 'Follow it, state by state, in the Atlas.', claim: null, note: 'Atlas; the profile lists its states of record' },

  // Greater One-horned Rhinoceros — the boundary
  { id: 'N45', act: 'rhino', pause: 1.62, text: 'On the floodplain of the Brahmaputra, the story turns.', claim: null },
  {
    id: 'N46', act: 'rhino', pause: 0.63, text: 'A century ago, fewer than two hundred greater one-horned rhinos were left.',
    claim: { species: 'indian-rhinoceros', field: 'summary', must: ['fewer than 200 animals a century ago'] },
  },
  {
    id: 'N47', act: 'rhino', pause: 0.58, text: 'Today, around four thousand live across India and Nepal.',
    claim: { species: 'indian-rhinoceros', field: 'description', must: ['around 4,000 animals across India and Nepal'] },
  },
  {
    id: 'N49', act: 'rhino', pause: 0.58, text: 'But more than two-thirds of them live in one park, Kaziranga.',
    claim: { species: 'indian-rhinoceros', field: 'description', must: ['more than two-thirds of the world population is in a single park — Kaziranga'] },
  },
  {
    id: 'N50', act: 'rhino', pause: 0.36, text: 'One flood, one disease, one poaching surge, and much of the species is at risk.',
    claim: { species: 'indian-rhinoceros', field: 'threatNote', must: ['vulnerability to floods, disease or a poaching surge in one site'] },
  },
  {
    id: 'N51', act: 'rhino', pause: 0.63, text: 'So rhinos are being moved, to build new populations in Manas and beyond.',
    claim: { programme: 'indian-rhino-vision', field: 'description', must: ['translocating animals from Kaziranga and Pobitora to Manas National Park'] },
  },
  {
    id: 'N52', act: 'rhino', pause: 0.43, text: 'Highways and embankments still stand between them and higher ground when the river rises.',
    claim: { species: 'indian-rhinoceros', field: 'threatNote', must: ['highways and embankments that cut animals off from higher ground during floods'] },
  },
  { id: 'N52a', act: 'rhino', pause: 0.63, text: 'Explore each of its populations in the Atlas.', claim: null, note: 'Atlas; the profile maps its localities and conservation' },

  // Connectivity
  { id: 'N53', act: 'connect', pause: 1.33, text: 'Put the lines together, and a pattern appears.', claim: null },
  { id: 'N55', act: 'connect', pause: 0.76, text: 'What these animals share is not one threat.', claim: null },
  { id: 'N56', act: 'connect', pause: 0.43, text: 'It is geography: where they live, and whether those places still connect.', claim: null },

  // Conservation response
  {
    id: 'N57', act: 'response', pause: 1.15, text: 'The response is geographic too.', claim: null,
  },
  {
    id: 'N58', act: 'response', pause: 0.43, text: 'Tiger reserves since 1973.',
    claim: { programme: 'project-tiger', field: 'startedYear', must: ['1973'] },
  },
  {
    id: 'N59', act: 'response', pause: 0.29, text: 'Snow leopard landscapes since 2009.',
    claim: { programme: 'project-snow-leopard', field: 'startedYear', must: ['2009'] },
  },
  {
    id: 'N60', act: 'response', pause: 0.29, text: 'New homes for rhinos. New lines drawn to protect, rather than divide.',
    claim: { programme: 'indian-rhino-vision', field: 'description', must: ['spread it across seven protected areas'] },
  },

  // The Atlas
  { id: 'N61', act: 'atlas', pause: 1.15, text: 'Mapping is not just about where species are.', claim: null, note: 'The atlas home page’s closing line, verbatim' },
  { id: 'N62', act: 'atlas', pause: 0.29, text: 'It is about where we choose to protect them.', claim: null, note: 'The atlas home page’s closing line, verbatim' },
  { id: 'N63', act: 'atlas', pause: 1.01, text: 'The India Species Atlas brings this story together:', claim: null, note: 'Atlas' },
  { id: 'N64', act: 'atlas', pause: 0.22, text: 'every species, locality, threat and programme in this film, with the sources behind them.', claim: null, note: 'Atlas; describes the site' },
  { id: 'N65', act: 'atlas', pause: 0.76, text: 'The film shows you the lines.', claim: null },
  { id: 'N66', act: 'atlas', pause: 0.29, text: 'The Atlas lets you follow them.', claim: null },
];
