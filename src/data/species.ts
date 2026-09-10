import type { Species } from '../types';
import { iucnSearch } from './sources';

/**
 * Species photographs, sourced from Wikimedia Commons and bundled rather than
 * hot-linked, so the atlas works offline and cannot suffer link rot.
 *
 * The project cites its facts, and its pictures are held to the same standard:
 * every file was checked to carry a licence that permits reuse and to actually
 * depict the species it is filed under. `scripts/images/fetch-species-photos.mjs`
 * performs both checks and can re-run the whole sourcing pass. Photographer,
 * licence and source page travel with each entry below and are shown wherever
 * the picture appears.
 */
import greatIndianBustardPhoto from '../assets/species/great-indian-bustard.jpg';
import bengalTigerPhoto from '../assets/species/bengal-tiger.jpg';
import redPandaPhoto from '../assets/species/red-panda.jpg';
import gangesRiverDolphinPhoto from '../assets/species/ganges-river-dolphin.jpg';
import nilgiriTahrPhoto from '../assets/species/nilgiri-tahr.jpg';
import gharialPhoto from '../assets/species/gharial.jpg';
import whiteRumpedVulturePhoto from '../assets/species/white-rumped-vulture.jpg';
import snowLeopardPhoto from '../assets/species/snow-leopard.jpg';
import indianRhinocerosPhoto from '../assets/species/indian-rhinoceros.jpg';
import dugongPhoto from '../assets/species/dugong.jpg';
import lionTailedMacaquePhoto from '../assets/species/lion-tailed-macaque.jpg';
import asianElephantPhoto from '../assets/species/asian-elephant.jpg';

/**
 * India Species Atlas — species dataset (12 species).
 *
 * Scope: a small, geographically balanced selection of threatened species,
 * chosen to cover India's major biogeographic regions rather than to be
 * exhaustive. Quality over quantity.
 *
 * IUCN status for every species has been checked against the IUCN Red List
 * (via BirdLife International's Data Zone for birds). `statusAssessedYear` is
 * the year of the assessment being cited. `lastVerified` is the date the
 * entry was last checked against its listed sources.
 *
 * Distribution points are INDICATIVE locations within a known range — usually
 * a well-known protected area or landscape. They are not population
 * boundaries. See the map disclaimer in the app.
 */

const wwf = (path: string, label: string) => ({
  label,
  url: `https://www.wwfindia.org/about_wwf/priority_species/threatened_species/${path}/`,
  publisher: 'WWF India',
});

export const SPECIES: Species[] = [
  {
    id: 'great-indian-bustard',
    commonName: 'Great Indian Bustard',
    scientificName: 'Ardeotis nigriceps',
    group: 'bird',
    status: 'CR',
    statusFullName: 'Critically Endangered',
    statusAssessedYear: 2021,
    endemicToIndia: true,
    regions: ['desert'],
    states: ['Rajasthan', 'Gujarat'],
    habitats: ['grassland'],
    summary:
      'One of the heaviest flying birds in the world, now reduced to a tiny population in the arid grasslands of western India.',
    description:
      'The Great Indian Bustard is a large, ground-dwelling bird of open grassland and scrub. Once found across much of the Indian subcontinent, it has undergone a catastrophic decline and the wild population is now estimated in the low hundreds, with the great majority in Rajasthan. It has been listed as Critically Endangered on the IUCN Red List since 2011.',
    indianDistribution:
      'The largest surviving population is in and around Desert National Park in Jaisalmer district, Rajasthan. A very small number persist in the Abdasa–Naliya grasslands of Kutch, Gujarat. Historic populations in Maharashtra, Karnataka, Andhra Pradesh and Madhya Pradesh are now effectively lost or functionally extinct.',
    habitatNote:
      'Semi-arid and arid grasslands, thorn scrub and the margins of low-intensity cropland, where the bird needs large, undisturbed open areas with good visibility.',
    majorThreats: ['power-lines', 'habitat-loss', 'poaching', 'infrastructure'],
    threatNote:
      'Collision with high-tension power lines crossing the Thar is now the single largest cause of mortality. This compounds decades of loss and fragmentation of grassland to irrigation, mechanised agriculture, mining, roads and renewable-energy infrastructure, plus historic hunting and disturbance and predation of nests.',
    conservationActions: [
      'Burying or re-routing power lines and installing bird diverters in priority bustard areas',
      'Protection and management of grassland "enclosures" in Desert National Park',
      'Ex-situ conservation breeding to build an insurance population',
      'Predator management and nest protection during the breeding season',
    ],
    conservationProgrammes: ['species-recovery-idwh', 'gib-conservation-breeding'],
    protectedAreas: ['Desert National Park (Rajasthan)', 'Abdasa / Naliya grasslands (Kutch, Gujarat)'],
    whyItMatters:
      'The bustard is an indicator of the health of India’s much-neglected grassland and desert ecosystems, which are treated as "wasteland" in land-use policy despite supporting distinctive wildlife and pastoral livelihoods.',
    distributionPoints: [
      { lat: 26.83, lng: 70.72, label: 'Desert National Park, Jaisalmer, Rajasthan', note: 'Largest surviving population and conservation-breeding focus.' },
      { lat: 27.55, lng: 71.35, label: 'Pokhran field firing range area, Rajasthan', note: 'Part of the core Thar bustard landscape.' },
      { lat: 23.34, lng: 68.84, label: 'Abdasa / Naliya grasslands, Kutch, Gujarat', note: 'A remnant population of only a few birds.' },
    ],
    image: {
      src: greatIndianBustardPhoto,
      alt: 'Two Great Indian Bustards on dry grassland at the edge of thorn scrub, their white necks and dark crowns visible.',
      credit: 'Dr. Raju Kasambe',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Great_Indian_Bustard_Ardeotis_nigriceps_by_Raju_Kasambe_DSCN9716_09.jpg',
    },
    sources: [
      iucnSearch('Ardeotis nigriceps'),
      { label: 'Great Indian Bustard — species factsheet', url: 'https://datazone.birdlife.org/species/factsheet/great-indian-bustard-ardeotis-nigriceps', publisher: 'BirdLife International Data Zone' },
      { label: 'Bustard Recovery Project', url: 'https://wii.gov.in/bustard_recovery_project', publisher: 'Wildlife Institute of India' },
    ],
    lastVerified: '2026-08-29',
  },

  {
    id: 'bengal-tiger',
    commonName: 'Bengal Tiger',
    scientificName: 'Panthera tigris',
    group: 'mammal',
    status: 'EN',
    statusFullName: 'Endangered',
    statusAssessedYear: 2022,
    endemicToIndia: false,
    regions: ['central-india', 'western-ghats', 'sundarbans', 'gangetic-plains', 'northeast'],
    states: ['Madhya Pradesh', 'Maharashtra', 'Karnataka', 'Uttarakhand', 'Tamil Nadu', 'Assam', 'West Bengal', 'Rajasthan', 'Kerala'],
    habitats: ['forest', 'grassland', 'wetland'],
    summary:
      'India holds the majority of the world’s wild tigers; the species as a whole is assessed as Endangered by the IUCN.',
    description:
      'The tiger (Panthera tigris) is assessed as Endangered on the IUCN Red List (2022). India is its global stronghold: the 2022 national estimate placed the country’s tiger population at roughly 3,700, spread across more than 50 tiger reserves. Populations range from the dry forests of central India to the Western Ghats, the Terai grasslands and the Sundarbans mangroves.',
    indianDistribution:
      'Four broad landscapes hold most Indian tigers: the Central Indian highlands and Eastern Ghats (Madhya Pradesh, Maharashtra, Chhattisgarh), the Western Ghats (Karnataka, Tamil Nadu, Kerala), the Shivalik–Gangetic plains (Uttarakhand, Uttar Pradesh, Bihar) and the Brahmaputra floodplain and hills of the Northeast. The Sundarbans supports a distinct mangrove-dwelling population.',
    habitatNote:
      'Dry and moist deciduous forest, evergreen forest, alluvial grassland and mangrove — always with sufficient large prey, water and cover, and secure breeding areas.',
    majorThreats: ['habitat-loss', 'poaching', 'human-wildlife-conflict', 'infrastructure'],
    threatNote:
      'Poaching of tigers and their prey for the illegal wildlife trade, loss and fragmentation of forest and corridors by roads, railways, mining and settlement, and conflict with people living around reserves.',
    conservationActions: [
      'A network of tiger reserves with core and buffer zones under the NTCA',
      'Quadrennial all-India tiger estimation using camera traps',
      'Voluntary relocation of villages from core areas, with compensation',
      'Anti-poaching patrolling and Special Tiger Protection Forces',
      'Securing corridors between reserves',
    ],
    conservationProgrammes: ['project-tiger'],
    protectedAreas: ['Jim Corbett NP (Uttarakhand)', 'Kanha & Bandhavgarh NP (Madhya Pradesh)', 'Tadoba–Andhari TR (Maharashtra)', 'Nagarhole & Bandipur (Karnataka)', 'Sundarbans NP (West Bengal)'],
    whyItMatters:
      'As a wide-ranging apex predator, the tiger is an umbrella species: protecting viable tiger landscapes conserves whole forest ecosystems, the rivers that rise in them and the carbon they store.',
    distributionPoints: [
      { lat: 23.7, lng: 81.03, label: 'Bandhavgarh Tiger Reserve, Madhya Pradesh' },
      { lat: 22.33, lng: 80.61, label: 'Kanha Tiger Reserve, Madhya Pradesh' },
      { lat: 20.26, lng: 79.35, label: 'Tadoba–Andhari Tiger Reserve, Maharashtra' },
      { lat: 29.53, lng: 78.95, label: 'Jim Corbett Tiger Reserve, Uttarakhand' },
      { lat: 11.9, lng: 76.35, label: 'Nagarhole Tiger Reserve, Karnataka (Western Ghats)' },
      { lat: 21.95, lng: 88.9, label: 'Sundarbans Tiger Reserve, West Bengal', note: 'Mangrove-dwelling population.' },
      { lat: 26.5, lng: 76.42, label: 'Ranthambhore Tiger Reserve, Rajasthan' },
    ],
    image: {
      src: bengalTigerPhoto,
      alt: 'A tiger walking through dry grass in open forest, seen side-on with its head turned towards the camera. Photographed in Sanjay Dubri Tiger Reserve.',
      credit: 'Tisha Mukherjee',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Bengal_tiger_in_Sanjay_Dubri_Tiger_Reserve_December_2024_by_Tisha_Mukherjee_11.jpg',
    },
    sources: [
      iucnSearch('Panthera tigris'),
      { label: 'Status of Tigers, Co-predators & Prey in India, 2022', url: 'https://ntca.gov.in/', publisher: 'NTCA / Wildlife Institute of India' },
    ],
    lastVerified: '2026-08-29',
  },

  {
    id: 'red-panda',
    commonName: 'Red Panda',
    scientificName: 'Ailurus fulgens',
    group: 'mammal',
    status: 'EN',
    statusFullName: 'Endangered',
    statusAssessedYear: 2015,
    endemicToIndia: false,
    regions: ['himalayas', 'northeast'],
    states: ['Sikkim', 'West Bengal', 'Arunachal Pradesh', 'Meghalaya', 'Nagaland'],
    habitats: ['forest', 'mountain'],
    summary:
      'A small, bamboo-eating carnivore of the eastern Himalayan temperate forest; the state animal of Sikkim.',
    description:
      'The Red Panda (Ailurus fulgens) is assessed as Endangered on the IUCN Red List (2015), with a global population thought to number fewer than 10,000 mature individuals and declining. In India it is confined to the temperate broadleaf and conifer forests of the eastern Himalaya, between roughly 2,400 and 4,000 m.',
    indianDistribution:
      'Sikkim, the hills of northern West Bengal (Singalila and Neora Valley), Arunachal Pradesh, and parts of Meghalaya and Nagaland. Sikkim and West Bengal support the best-studied Indian populations.',
    habitatNote:
      'Temperate forest with a dense bamboo understorey and old trees for shelter and nesting; strongly dependent on unbroken canopy and bamboo.',
    majorThreats: ['habitat-loss', 'poaching', 'human-wildlife-conflict', 'climate-change'],
    threatNote:
      'Loss and fragmentation of forest to logging, grazing, firewood collection and infrastructure; killing by free-ranging dogs and incidental capture in snares set for other animals; poaching for pelts and the pet trade; and an upslope squeeze of suitable habitat under climate change.',
    conservationActions: [
      'Protected areas across the Indian range and a conservation-breeding programme at the Padmaja Naidu Himalayan Zoological Park, Darjeeling',
      'Community-based forest protection and anti-poaching networks',
      'Control of free-ranging dogs around red panda forests',
      'Habitat corridor restoration between forest fragments',
    ],
    conservationProgrammes: [],
    protectedAreas: ['Khangchendzonga NP (Sikkim)', 'Singalila NP & Neora Valley NP (West Bengal)', 'Namdapha NP (Arunachal Pradesh)'],
    whyItMatters:
      'The Red Panda is a flagship for the eastern Himalayan temperate forest, a biodiverse and water-rich zone that also sustains downstream agriculture and hydropower.',
    distributionPoints: [
      { lat: 27.6, lng: 88.55, label: 'Khangchendzonga National Park, Sikkim' },
      { lat: 27.13, lng: 88.02, label: 'Singalila National Park, West Bengal' },
      { lat: 27.05, lng: 88.73, label: 'Neora Valley National Park, West Bengal' },
      { lat: 27.5, lng: 96.38, label: 'Namdapha National Park, Arunachal Pradesh' },
    ],
    image: {
      src: redPandaPhoto,
      alt: 'A red panda curled on a mossy branch with its ringed tail wrapped around it.',
      credit: 'Sunuwargr',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Red_Panda,_Gentle_Tree-Dweller_of_the_Himalayas.jpg',
    },
    sources: [
      iucnSearch('Ailurus fulgens'),
      wwf('red_panda', 'Red Panda'),
    ],
    lastVerified: '2026-08-29',
  },

  {
    id: 'ganges-river-dolphin',
    commonName: 'Ganges River Dolphin',
    scientificName: 'Platanista gangetica',
    group: 'mammal',
    status: 'EN',
    statusFullName: 'Endangered',
    statusAssessedYear: 2022,
    endemicToIndia: false,
    regions: ['gangetic-plains', 'northeast'],
    states: ['Uttar Pradesh', 'Bihar', 'West Bengal', 'Assam', 'Jharkhand'],
    habitats: ['freshwater'],
    summary:
      'India’s National Aquatic Animal, an almost-blind dolphin that navigates the Ganga and Brahmaputra rivers by echolocation.',
    description:
      'The Ganges River Dolphin (Platanista gangetica) is assessed as Endangered on the IUCN Red List (2022). It is functionally blind and relies on echolocation to hunt in turbid river water. It was declared India’s National Aquatic Animal in 2009. The population is fragmented by dams and barrages and is estimated in the low thousands across India, Nepal and Bangladesh.',
    indianDistribution:
      'The main stems and larger tributaries of the Ganga (including the Chambal, Ghaghara, Gandak and Kosi) through Uttar Pradesh, Bihar and West Bengal, and the Brahmaputra and its tributaries in Assam.',
    habitatNote:
      'Deep pools, confluences and eddy counter-currents in large, silt-laden lowland rivers; the species cannot survive where rivers are reduced to shallow braided channels for long periods.',
    majorThreats: ['infrastructure', 'bycatch', 'pollution', 'habitat-loss'],
    threatNote:
      'Dams and barrages fragment the population and reduce dry-season flow; accidental entanglement and drowning in fishing nets; deliberate killing for oil used as fish bait; and industrial, agricultural and urban pollution of the rivers.',
    conservationActions: [
      'Project Dolphin: population surveys, habitat protection and awareness',
      'The Vikramshila Gangetic Dolphin Sanctuary on the Ganga in Bihar',
      'Promotion of dolphin-safe fishing practices and alternatives to dolphin oil',
      'Maintaining environmental flows below barrages',
    ],
    conservationProgrammes: ['project-dolphin', 'species-recovery-idwh'],
    protectedAreas: ['Vikramshila Gangetic Dolphin Sanctuary (Bihar)', 'National Chambal Sanctuary (MP / Rajasthan / UP)'],
    whyItMatters:
      'As a top predator restricted to river channels, the dolphin is a sensitive indicator of river health for the ~600 million people who depend on the Ganga and Brahmaputra basins.',
    distributionPoints: [
      { lat: 25.25, lng: 87.0, label: 'Vikramshila Gangetic Dolphin Sanctuary, Bhagalpur, Bihar' },
      { lat: 25.31, lng: 83.0, label: 'Ganga near Varanasi, Uttar Pradesh' },
      { lat: 26.5, lng: 78.35, label: 'Chambal river, National Chambal Sanctuary' },
      { lat: 26.2, lng: 91.7, label: 'Brahmaputra near Guwahati, Assam' },
    ],
    image: {
      src: gangesRiverDolphinPhoto,
      alt: 'A Ganges river dolphin surfacing in a silt-laden river, its long narrow beak clear of the water. Photographed at Koshi Barrage.',
      credit: 'Anant.wildlife',
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Ganges_River_Dolphin_sighted_in_Koshi_Barrage_(cropped).jpg',
    },
    sources: [
      iucnSearch('Platanista gangetica'),
      { label: 'Project Dolphin', url: 'https://riverdolphin.in/about-the-project/', publisher: 'National Mission for Clean Ganga / MoEFCC' },
      wwf('ganges_river_dolphin', 'Ganges River Dolphin'),
    ],
    lastVerified: '2026-08-29',
  },

  {
    id: 'nilgiri-tahr',
    commonName: 'Nilgiri Tahr',
    scientificName: 'Nilgiritragus hylocrius',
    group: 'mammal',
    status: 'EN',
    statusFullName: 'Endangered',
    statusAssessedYear: 2008,
    endemicToIndia: true,
    regions: ['western-ghats'],
    states: ['Tamil Nadu', 'Kerala'],
    habitats: ['mountain', 'grassland'],
    summary:
      'A stocky wild goat endemic to the high grasslands of the southern Western Ghats; the state animal of Tamil Nadu.',
    description:
      'The Nilgiri Tahr (Nilgiritragus hylocrius) is assessed as Endangered on the IUCN Red List (criterion C2a(i), Alempath & Rice 2008). It is endemic to the montane grassland ("sholas and grasslands" mosaic) of the southern Western Ghats, in a fragmented range across roughly 100 localities. The total population is a few thousand animals, with the largest single population in Eravikulam National Park, Kerala.',
    indianDistribution:
      'The higher hills of the Western Ghats from the Nilgiris southward: the Nilgiri plateau, the Anamalai and Palni hills, the High Range around Eravikulam, and southward to the Ashambu (Agasthyamalai) hills, spanning the Tamil Nadu–Kerala border.',
    habitatNote:
      'Open montane grassland and cliffs above about 1,200 m, interspersed with shola forest patches; the tahr uses steep, rocky ground to escape predators.',
    majorThreats: ['habitat-loss', 'poaching', 'human-wildlife-conflict'],
    threatNote:
      'Conversion of montane grassland to tea, wattle, eucalyptus and pine plantations and to reservoirs; a highly fragmented range with small, isolated subpopulations; poaching; and competition and disease risk from domestic livestock.',
    conservationActions: [
      'Project Nilgiri Tahr (Tamil Nadu, 2023): surveys, habitat restoration and reintroduction planning',
      'Long-term monitoring of the Eravikulam population',
      'Removal of invasive wattle and restoration of native grassland',
    ],
    conservationProgrammes: ['species-recovery-idwh', 'project-nilgiri-tahr'],
    protectedAreas: ['Eravikulam NP (Kerala)', 'Anamalai Tiger Reserve (Tamil Nadu)', 'Mukurthi NP (Tamil Nadu)', 'Grass Hills NP (Tamil Nadu)'],
    whyItMatters:
      'The tahr depends on the Western Ghats’ montane grasslands, the "water towers" whose catchments feed rivers and reservoirs across Tamil Nadu and Kerala; these grasslands are among the most threatened habitats in the Ghats.',
    distributionPoints: [
      { lat: 10.2, lng: 77.05, label: 'Eravikulam National Park, Kerala', note: 'Largest single population.' },
      { lat: 11.2, lng: 76.5, label: 'Mukurthi National Park, Nilgiris, Tamil Nadu' },
      { lat: 10.35, lng: 76.95, label: 'Anamalai Tiger Reserve, Tamil Nadu' },
      { lat: 8.55, lng: 77.32, label: 'Kalakkad–Mundanthurai (Ashambu hills), Tamil Nadu' },
    ],
    image: {
      src: nilgiriTahrPhoto,
      alt: 'A Nilgiri Tahr on a grassy slope, showing its short curved horns and coarse grey-brown coat. Photographed in Eravikulam National Park.',
      credit: 'Aveek Bandyopadhyay',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Nilgiri_Tahr_at_Eravikulam_National_Park.jpg',
    },
    sources: [
      iucnSearch('Nilgiritragus hylocrius'),
      wwf('nilgiri_tahr', 'Nilgiri Tahr'),
    ],
    lastVerified: '2026-08-29',
  },

  {
    id: 'gharial',
    commonName: 'Gharial',
    scientificName: 'Gavialis gangeticus',
    group: 'reptile',
    status: 'CR',
    statusFullName: 'Critically Endangered',
    statusAssessedYear: 2019,
    endemicToIndia: false,
    regions: ['gangetic-plains', 'central-india'],
    states: ['Madhya Pradesh', 'Uttar Pradesh', 'Rajasthan', 'Bihar'],
    habitats: ['freshwater'],
    summary:
      'A fish-eating crocodilian with a distinctive narrow snout; the world population collapsed by an estimated 98% over the 20th century.',
    description:
      'The Gharial (Gavialis gangeticus) is assessed as Critically Endangered on the IUCN Red List (2019). It is one of the largest crocodilians and is highly specialised for catching fish, with a slender snout and needle-like teeth. The number of breeding adults in the wild is very small; the National Chambal Sanctuary holds the single largest population.',
    indianDistribution:
      'Now largely confined to the Chambal river (across Madhya Pradesh, Rajasthan and Uttar Pradesh), with smaller populations on the Girwa (Katarniaghat, UP), the Son (Madhya Pradesh) and the Gandak (Bihar). It is regionally extinct across most of its former Indus, Ganga, Brahmaputra and Mahanadi range.',
    habitatNote:
      'Clean, deep, fast-flowing stretches of large rivers with sandy banks and mid-channel sandbars for basking and nesting; adults rarely leave the water except to bask and breed.',
    majorThreats: ['bycatch', 'infrastructure', 'habitat-loss', 'pollution'],
    threatNote:
      'Drowning in fishing nets, illegal sand mining that destroys nesting banks, dams and barrages that fragment rivers and alter flow, reduced dry-season water, egg collection and loss of prey fish.',
    conservationActions: [
      'Egg collection, captive rearing and release ("grow-out") into the Chambal and other rivers since the 1970s',
      'The National Chambal Sanctuary, a tri-state protected river stretch',
      'Nest protection and community guards during the breeding season',
      'Monitoring of released animals',
    ],
    conservationProgrammes: ['crocodile-conservation-project'],
    protectedAreas: ['National Chambal Sanctuary (MP / Rajasthan / UP)', 'Katarniaghat Wildlife Sanctuary (Uttar Pradesh)', 'Son Gharial Sanctuary (Madhya Pradesh)'],
    whyItMatters:
      'The gharial survives only where rivers still run clean, connected and seasonally full, so a recovering gharial population is a sign that a river is functioning as an ecosystem rather than only as a water-supply channel.',
    distributionPoints: [
      { lat: 26.62, lng: 78.6, label: 'National Chambal Sanctuary (near Dholpur), Rajasthan / MP' },
      { lat: 28.35, lng: 81.15, label: 'Girwa river, Katarniaghat WS, Uttar Pradesh' },
      { lat: 24.6, lng: 81.3, label: 'Son Gharial Sanctuary, Madhya Pradesh' },
      { lat: 26.85, lng: 84.5, label: 'Gandak river, Bihar' },
    ],
    image: {
      src: gharialPhoto,
      alt: 'A male gharial at the water’s edge, its very narrow snout and the bulbous growth on the tip clearly visible.',
      credit: 'Charles J. Sharp',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Gharial_(Gavialis_gangeticus)_male.jpg',
    },
    sources: [
      iucnSearch('Gavialis gangeticus'),
      { label: 'Gharial conservation research', url: 'https://wii.gov.in/', publisher: 'Wildlife Institute of India' },
    ],
    lastVerified: '2026-08-29',
  },

  {
    id: 'white-rumped-vulture',
    commonName: 'White-rumped Vulture',
    scientificName: 'Gyps bengalensis',
    group: 'bird',
    status: 'CR',
    statusFullName: 'Critically Endangered',
    statusAssessedYear: 2021,
    endemicToIndia: false,
    regions: ['central-india', 'gangetic-plains', 'northeast'],
    states: ['Madhya Pradesh', 'Rajasthan', 'Assam', 'Haryana', 'Uttar Pradesh', 'Gujarat'],
    habitats: ['grassland', 'forest'],
    summary:
      'Once possibly the most abundant large raptor on Earth; its population fell by more than 99% in the 1990s and 2000s.',
    description:
      'The White-rumped Vulture (Gyps bengalensis) is assessed as Critically Endangered on the IUCN Red List (listed CR since 2000). Its collapse was one of the fastest declines ever recorded in a bird, driven by poisoning from the veterinary anti-inflammatory drug diclofenac, which causes fatal kidney failure in vultures that feed on the carcasses of treated cattle.',
    indianDistribution:
      'Formerly across almost the whole of India; now patchy, with relatively better populations in parts of central India (Madhya Pradesh), Rajasthan, Gujarat, the Terai and the Northeast (Assam). Conservation-breeding centres hold assurance populations.',
    habitatNote:
      'Open and lightly wooded country near people and livestock; nests colonially in tall trees. As an obligate scavenger it depends entirely on carcasses of large animals.',
    majorThreats: ['pollution', 'habitat-loss'],
    threatNote:
      'Poisoning by veterinary NSAIDs — diclofenac and, more recently, other drugs such as aceclofenac, ketoprofen and nimesulide that remain legal and are also toxic to vultures. Secondary poisoning from carcasses laced to kill feral dogs or carnivores, reduced carcass availability, and collision and electrocution on power infrastructure.',
    conservationActions: [
      'Ban on veterinary diclofenac (2006) and restriction of human-formulation vial sizes',
      'Vulture Conservation Breeding Centres led by BNHS (e.g. Pinjore, Haryana)',
      'Establishment of "Vulture Safe Zones" with drug advocacy and monitoring',
      'Safety testing of alternative anti-inflammatory drugs (meloxicam is vulture-safe)',
    ],
    conservationProgrammes: ['vulture-action-plan', 'species-recovery-idwh'],
    protectedAreas: ['Jatayu Conservation Breeding Centre, Pinjore (Haryana)', 'Bandhavgarh & Panna NP (Madhya Pradesh)', 'Ranthambhore NP (Rajasthan)'],
    whyItMatters:
      'Vultures strip carcasses within hours, limiting the spread of disease and the numbers of feral dogs and rats. Their loss has been linked to public-health and sanitation costs across South Asia.',
    distributionPoints: [
      { lat: 30.8, lng: 76.9, label: 'Jatayu Conservation Breeding Centre, Pinjore, Haryana', note: 'Assurance / breeding population.' },
      { lat: 23.7, lng: 81.0, label: 'Bandhavgarh landscape, Madhya Pradesh' },
      { lat: 26.5, lng: 76.42, label: 'Ranthambhore National Park, Rajasthan' },
      { lat: 26.6, lng: 93.2, label: 'Kaziranga–Karbi Anglong landscape, Assam' },
    ],
    image: {
      src: whiteRumpedVulturePhoto,
      alt: 'A white-rumped vulture standing in short grassland, seen in profile. Photographed in Chitwan National Park.',
      credit: 'Prasan Shrestha',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:White_rumped_vulture_in_chitwan_national_park.jpg',
    },
    sources: [
      iucnSearch('Gyps bengalensis'),
      { label: 'White-rumped Vulture — species factsheet', url: 'https://datazone.birdlife.org/species/factsheet/white-rumped-vulture-gyps-bengalensis', publisher: 'BirdLife International Data Zone' },
      { label: 'Action Plan for Vulture Conservation in India 2020–2025 (PDF)', url: 'https://save-vultures.org/wp-content/uploads/2020/11/20-11-India-National-Vulture-Action-Plan-2020-25.pdf', publisher: 'MoEFCC, Government of India (hosted by SAVE)' },
    ],
    lastVerified: '2026-08-29',
  },

  {
    id: 'snow-leopard',
    commonName: 'Snow Leopard',
    scientificName: 'Panthera uncia',
    group: 'mammal',
    status: 'VU',
    statusFullName: 'Vulnerable',
    statusAssessedYear: 2017,
    endemicToIndia: false,
    regions: ['himalayas'],
    states: ['Ladakh', 'Jammu and Kashmir', 'Himachal Pradesh', 'Uttarakhand', 'Sikkim', 'Arunachal Pradesh'],
    habitats: ['mountain'],
    summary:
      'The elusive big cat of the high mountains; reassessed from Endangered to Vulnerable in 2017, but still declining.',
    description:
      'The Snow Leopard (Panthera uncia) was reassessed from Endangered to Vulnerable in 2017, on the basis of a revised (larger) population estimate rather than any recovery — the population is still thought to be declining. India’s first nationwide assessment (SPAI, reported 2024) estimated about 718 snow leopards in the country.',
    indianDistribution:
      'The higher Himalaya and the trans-Himalayan cold deserts: Ladakh, the upper valleys of Himachal Pradesh (Spiti, Lahaul, Kinnaur) and Uttarakhand, and the high country of Sikkim and Arunachal Pradesh.',
    habitatNote:
      'Steep, broken terrain above the treeline, typically 3,000–5,000 m, in alpine meadow, dwarf-scrub and rocky slopes with wild sheep and goats as principal prey.',
    majorThreats: ['human-wildlife-conflict', 'poaching', 'climate-change', 'habitat-loss'],
    threatNote:
      'Retaliatory killing after livestock depredation, poaching for pelts and bones, depletion of wild prey by competition with livestock, poorly planned infrastructure and mining in mountain valleys, and a shrinking alpine zone under climate change.',
    conservationActions: [
      'Project Snow Leopard: landscape-level planning with local communities',
      'Livestock insurance and predator-proof corral schemes to reduce conflict',
      'Community-managed reserves and conservancies (e.g. in Ladakh and Spiti)',
      'The nationwide Snow Leopard Population Assessment in India (SPAI)',
    ],
    conservationProgrammes: ['project-snow-leopard', 'species-recovery-idwh'],
    protectedAreas: ['Hemis NP (Ladakh)', 'Kibber & Pin Valley (Himachal Pradesh)', 'Gangotri NP & Nanda Devi Biosphere Reserve (Uttarakhand)', 'Khangchendzonga NP (Sikkim)'],
    whyItMatters:
      'The snow leopard is the apex predator of Central and South Asia’s mountains, whose glaciers and snowfields are the source of major rivers including the Indus, Ganga and Brahmaputra.',
    distributionPoints: [
      { lat: 34.0, lng: 77.3, label: 'Hemis National Park, Ladakh' },
      { lat: 32.33, lng: 78.01, label: 'Kibber Wildlife Sanctuary, Spiti, Himachal Pradesh' },
      { lat: 30.9, lng: 79.15, label: 'Gangotri National Park, Uttarakhand' },
      { lat: 27.7, lng: 88.6, label: 'Khangchendzonga National Park, Sikkim' },
    ],
    image: {
      src: snowLeopardPhoto,
      alt: 'A snow leopard standing on snow-covered rock, its thick pale spotted coat and long tail visible.',
      credit: 'Irbis1983',
      license: 'Public domain',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Irbis4.JPG',
    },
    sources: [
      iucnSearch('Panthera uncia'),
      { label: 'Statement on the IUCN Red List status change of the snow leopard', url: 'https://snowleopard.org/statement-iucn-red-list-status-change-snow-leopard/', publisher: 'Snow Leopard Trust' },
      { label: 'Snow Leopard Population Assessment in India (SPAI)', url: 'https://wii.gov.in/', publisher: 'Wildlife Institute of India / MoEFCC' },
    ],
    lastVerified: '2026-08-29',
  },

  {
    id: 'indian-rhinoceros',
    commonName: 'Greater One-horned Rhinoceros',
    scientificName: 'Rhinoceros unicornis',
    group: 'mammal',
    status: 'VU',
    statusFullName: 'Vulnerable',
    statusAssessedYear: 2019,
    endemicToIndia: false,
    regions: ['northeast', 'gangetic-plains'],
    states: ['Assam', 'West Bengal', 'Uttar Pradesh'],
    habitats: ['grassland', 'wetland'],
    summary:
      'A conservation success story recovering from fewer than 200 animals a century ago, but still Vulnerable because of its small, concentrated range.',
    description:
      'The Greater One-horned Rhinoceros (Rhinoceros unicornis) is assessed as Vulnerable on the IUCN Red List. Intensive protection has brought the population back from near-extinction to around 4,000 animals across India and Nepal, but it remains Vulnerable because it occupies a very small total area, is highly fragmented, and more than two-thirds of the world population is in a single park — Kaziranga.',
    indianDistribution:
      'The floodplain grasslands of the Brahmaputra in Assam (Kaziranga, Pobitora, Orang, Manas), the Terai of northern West Bengal (Jaldapara, Gorumara), and Dudhwa National Park in Uttar Pradesh, where the species was reintroduced.',
    habitatNote:
      'Tall "elephant grass" floodplain grassland, reed beds, swamps and adjacent riverine forest, with wallows and year-round water.',
    majorThreats: ['poaching', 'habitat-loss', 'infrastructure', 'human-wildlife-conflict'],
    threatNote:
      'Poaching for horn, the very small and concentrated range (vulnerability to floods, disease or a poaching surge in one site), loss of grassland to invasive plants and encroachment, and highways and embankments that cut animals off from higher ground during floods.',
    conservationActions: [
      'Armed anti-poaching protection and intelligence-led enforcement in Kaziranga and Pobitora',
      'Indian Rhino Vision 2020: translocation to re-establish rhinos in Manas National Park',
      'Grassland management and control of invasive species',
      'Highlands and corridors to give rhinos refuge during Brahmaputra floods',
    ],
    conservationProgrammes: ['indian-rhino-vision', 'species-recovery-idwh'],
    protectedAreas: ['Kaziranga NP (Assam)', 'Pobitora WS (Assam)', 'Manas NP (Assam)', 'Jaldapara & Gorumara NP (West Bengal)', 'Dudhwa NP (Uttar Pradesh)'],
    whyItMatters:
      'Rhinos are ecosystem engineers of the Brahmaputra and Terai grasslands — their grazing and movement maintain the short-grass patches that many other threatened species, such as the Bengal florican and hog deer, also need.',
    distributionPoints: [
      { lat: 26.58, lng: 93.17, label: 'Kaziranga National Park, Assam', note: 'Holds the large majority of the world population.' },
      { lat: 26.23, lng: 92.05, label: 'Pobitora Wildlife Sanctuary, Assam' },
      { lat: 26.72, lng: 91.0, label: 'Manas National Park, Assam', note: 'Population re-established by translocation.' },
      { lat: 26.68, lng: 89.28, label: 'Jaldapara National Park, West Bengal' },
      { lat: 28.52, lng: 80.7, label: 'Dudhwa National Park, Uttar Pradesh', note: 'Reintroduced population in a fenced area.' },
    ],
    image: {
      src: indianRhinocerosPhoto,
      alt: 'A greater one-horned rhinoceros standing in shallow water, its single horn and folded, plated skin visible.',
      credit: 'Payamfarahani',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Payamfarahani_-_Rhinoceros_unicornis_(26).jpg',
    },
    sources: [
      iucnSearch('Rhinoceros unicornis'),
      { label: 'Indian Rhino Vision 2020', url: 'https://www.wwfindia.org/about_wwf/priority_species/threatened_species/one_horned_rhinoceros/', publisher: 'WWF India' },
    ],
    lastVerified: '2026-08-29',
  },

  {
    id: 'dugong',
    commonName: 'Dugong',
    scientificName: 'Dugong dugon',
    group: 'mammal',
    status: 'VU',
    statusFullName: 'Vulnerable',
    statusAssessedYear: 2015,
    endemicToIndia: false,
    regions: ['coastal-marine'],
    states: ['Tamil Nadu', 'Gujarat', 'Andaman & Nicobar Islands'],
    habitats: ['marine'],
    summary:
      'The only strictly herbivorous marine mammal — a "sea cow" that grazes seagrass meadows; globally Vulnerable, and very rare in Indian waters.',
    description:
      'The Dugong (Dugong dugon) is assessed as Vulnerable on the IUCN Red List at the global scale (2015; some regional subpopulations are separately assessed as Endangered or Critically Endangered). In India the species is now confined to three areas and its national population is estimated at only around 200–250 animals, making it one of the country’s most endangered marine mammals in practice.',
    indianDistribution:
      'The Gulf of Mannar and Palk Bay off Tamil Nadu (the largest Indian population), the Gulf of Kutch in Gujarat, and the waters around the Andaman and Nicobar Islands.',
    habitatNote:
      'Shallow, sheltered coastal waters with extensive seagrass meadows, which are the dugong’s sole food; it may travel long distances between meadows.',
    majorThreats: ['bycatch', 'habitat-loss', 'pollution', 'infrastructure'],
    threatNote:
      'Accidental capture and drowning in gill nets and trawls, loss and degradation of seagrass from trawling, coastal development, sedimentation and pollution, boat strikes, and historic hunting for meat and oil.',
    conservationActions: [
      'India’s first Dugong Conservation Reserve, declared in Palk Bay, Tamil Nadu (2022)',
      'Seagrass-meadow mapping and restoration',
      'Work with fishing communities on safe gear and rapid-release protocols',
      'Coverage under the Species Recovery Programme and the CMS Dugong MoU',
    ],
    conservationProgrammes: ['species-recovery-idwh'],
    protectedAreas: ['Dugong Conservation Reserve, Palk Bay (Tamil Nadu)', 'Gulf of Mannar Marine National Park (Tamil Nadu)', 'Gulf of Kachchh Marine National Park (Gujarat)'],
    whyItMatters:
      'Dugong grazing keeps seagrass meadows healthy and productive; those meadows are nursery habitat for fish and prawns that coastal fisheries depend on, and they store large amounts of "blue carbon".',
    distributionPoints: [
      { lat: 9.1, lng: 79.12, label: 'Gulf of Mannar, Tamil Nadu' },
      { lat: 9.7, lng: 79.4, label: 'Palk Bay / Dugong Conservation Reserve, Tamil Nadu' },
      { lat: 22.5, lng: 69.7, label: 'Gulf of Kachchh, Gujarat' },
      { lat: 12.0, lng: 93.0, label: 'Ritchie’s Archipelago, Andaman Islands' },
    ],
    image: {
      src: dugongPhoto,
      alt: 'A dugong swimming in open blue water, seen from above with its broad fluked tail.',
      credit: 'Gejuni',
      license: 'CC BY-SA 3.0 de',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/de/deed.en',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Dugong.JPG',
    },
    sources: [
      iucnSearch('Dugong dugon'),
      { label: 'Dugong Recovery Programme / seagrass work', url: 'https://wii.gov.in/', publisher: 'Wildlife Institute of India' },
      { label: 'Dugong — mammals of India', url: 'https://www.mammalsofindia.org/dugong-dugon', publisher: 'Mammals of India (NCF / IISc)' },
    ],
    lastVerified: '2026-08-29',
  },

  {
    id: 'lion-tailed-macaque',
    commonName: 'Lion-tailed Macaque',
    scientificName: 'Macaca silenus',
    group: 'mammal',
    status: 'EN',
    statusFullName: 'Endangered',
    statusAssessedYear: 2020,
    endemicToIndia: true,
    regions: ['western-ghats'],
    states: ['Karnataka', 'Kerala', 'Tamil Nadu'],
    habitats: ['forest'],
    summary:
      'A rainforest monkey with a silver mane, endemic to the Western Ghats and one of the rarest primates in the world.',
    description:
      'The Lion-tailed Macaque (Macaca silenus) is assessed as Endangered on the IUCN Red List. It is endemic to the tropical wet evergreen forests of the Western Ghats, where fewer than about 2,500 mature individuals survive in a highly fragmented set of subpopulations, none large.',
    indianDistribution:
      'The wet evergreen forests of the Western Ghats in Karnataka (e.g. around Sirsi–Honnavara and the Sharavathi valley), Kerala (Silent Valley and the surrounding Nilgiri forests) and the Anamalai and Kalakkad hills of Tamil Nadu.',
    habitatNote:
      'Undisturbed tropical wet evergreen ("sholas" at low and mid elevations) forest, where the macaque forages high in the canopy for fruit, and is reluctant to cross open ground.',
    majorThreats: ['habitat-loss', 'human-wildlife-conflict', 'infrastructure'],
    threatNote:
      'Historic clearance of rainforest for tea, coffee, cardamom and teak; fragmentation of remaining forest by roads, power lines, reservoirs and plantations; and, in fragments near people, a shift to raiding crops and refuse that leads to road kills and conflict.',
    conservationActions: [
      'Protected areas across the range, including Silent Valley and the Anamalai and Kalakkad–Mundanthurai Tiger Reserves',
      'Canopy bridges over roads and power lines in key corridors',
      'Restoration and reconnection of rainforest fragments, including on private plantation land',
    ],
    conservationProgrammes: [],
    protectedAreas: ['Silent Valley NP (Kerala)', 'Anamalai Tiger Reserve (Tamil Nadu)', 'Kalakkad–Mundanthurai Tiger Reserve (Tamil Nadu)', 'Sharavathi Valley WS (Karnataka)'],
    whyItMatters:
      'As a canopy fruit-eater the macaque disperses the seeds of many rainforest trees; its persistence is a test of whether the fragmented rainforests of the Ghats can still function.',
    distributionPoints: [
      { lat: 11.08, lng: 76.44, label: 'Silent Valley National Park, Kerala' },
      { lat: 10.35, lng: 76.9, label: 'Anamalai Tiger Reserve, Tamil Nadu' },
      { lat: 14.2, lng: 74.75, label: 'Sharavathi Valley, Karnataka' },
      { lat: 8.55, lng: 77.32, label: 'Kalakkad–Mundanthurai Tiger Reserve, Tamil Nadu' },
    ],
    image: {
      src: lionTailedMacaquePhoto,
      alt: 'A lion-tailed macaque seated, showing the silver-grey mane framing its black face. Photographed in a zoo.',
      credit: 'Chris huh',
      license: 'CC BY-SA 3.0',
      licenseUrl: 'http://creativecommons.org/licenses/by-sa/3.0/',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Lion-tailed_Macaque_in_Bristol_Zoo.jpg',
    },
    sources: [
      iucnSearch('Macaca silenus'),
      { label: 'Lion-tailed Macaque — mammals of India', url: 'https://www.mammalsofindia.org/macaca-silenus', publisher: 'Mammals of India (NCF / IISc)' },
    ],
    lastVerified: '2026-08-29',
  },

  {
    id: 'asian-elephant',
    commonName: 'Asian Elephant',
    scientificName: 'Elephas maximus',
    group: 'mammal',
    status: 'EN',
    statusFullName: 'Endangered',
    statusAssessedYear: 2019,
    endemicToIndia: false,
    regions: ['western-ghats', 'northeast', 'central-india', 'gangetic-plains'],
    states: ['Karnataka', 'Kerala', 'Tamil Nadu', 'Assam', 'Odisha', 'Uttarakhand', 'West Bengal', 'Jharkhand'],
    habitats: ['forest', 'grassland'],
    summary:
      'India holds the majority of the world’s wild Asian elephants; the species has been Endangered on the IUCN Red List since 1986.',
    description:
      'The Asian Elephant (Elephas maximus) has been assessed as Endangered on the IUCN Red List since 1986, reflecting a long-term population decline of at least 50% over three generations. India’s wild population is the largest of any country, on the order of 27,000–30,000 animals, distributed across four broad landscapes.',
    indianDistribution:
      'Southern India (the Western Ghats and adjoining Eastern Ghats of Karnataka, Kerala, Tamil Nadu), the Northeast (Assam and neighbouring states), east-central India (Odisha, Jharkhand, Chhattisgarh) and the northern foothills (Uttarakhand and northern West Bengal).',
    habitatNote:
      'A wide-ranging generalist using dry and moist forest, grassland and the forest–farmland edge; a single herd may move over hundreds of square kilometres and needs connectivity between habitat blocks.',
    majorThreats: ['habitat-loss', 'human-wildlife-conflict', 'infrastructure', 'poaching'],
    threatNote:
      'Loss and fragmentation of habitat and the blocking of traditional corridors by settlements, farms, plantations, mines, roads and railway lines; escalating crop and property damage that causes several hundred human and around 100 elephant deaths a year; electrocution on sagging power lines; train collisions; and poaching of tuskers for ivory.',
    conservationActions: [
      'Project Elephant: funding to states, and designation of Elephant Reserves',
      'Identification and securing of elephant corridors',
      'Early-warning systems, trenches, solar fencing and rapid-response teams to reduce conflict',
      'Realignment or mitigation of railway lines and power lines in elephant landscapes',
    ],
    conservationProgrammes: ['project-elephant'],
    protectedAreas: ['Nagarhole & Bandipur NP (Karnataka)', 'Wayanad WS (Kerala)', 'Kaziranga NP (Assam)', 'Similipal Tiger Reserve (Odisha)', 'Rajaji NP (Uttarakhand)'],
    whyItMatters:
      'Elephants shape forests on a landscape scale — opening clearings, dispersing large seeds and creating water holes — and Project Elephant’s corridor work benefits many co-occurring species; the scale of human–elephant conflict also makes coexistence a central question for Indian conservation.',
    distributionPoints: [
      { lat: 11.9, lng: 76.35, label: 'Nagarhole–Bandipur, Karnataka (Western Ghats)' },
      { lat: 11.7, lng: 76.4, label: 'Wayanad, Kerala' },
      { lat: 26.6, lng: 93.4, label: 'Kaziranga–Karbi Anglong, Assam' },
      { lat: 21.6, lng: 86.4, label: 'Similipal Tiger Reserve, Odisha' },
      { lat: 30.0, lng: 78.2, label: 'Rajaji National Park, Uttarakhand' },
    ],
    image: {
      src: asianElephantPhoto,
      alt: 'A tusked Asian elephant standing in green scrub forest. Photographed in Bandipur.',
      credit: 'Yathin S Krishnappa',
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Elephas_maximus_(Bandipur).jpg',
    },
    sources: [
      iucnSearch('Elephas maximus'),
      { label: 'Project Elephant — PIB release', url: 'https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1884356', publisher: 'Press Information Bureau, Government of India' },
    ],
    lastVerified: '2026-08-29',
  },
];

export const SPECIES_BY_ID: Record<string, Species> = Object.fromEntries(
  SPECIES.map((s) => [s.id, s]),
);
