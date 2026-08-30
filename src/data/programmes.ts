import type { ConservationProgramme } from '../types';

/**
 * Government and partner conservation programmes.
 * A programme is only linked to a species where public government or IUCN
 * sources describe that species as a focus of the programme.
 */
export const PROGRAMMES: ConservationProgramme[] = [
  {
    id: 'project-tiger',
    name: 'Project Tiger',
    authority: 'National Tiger Conservation Authority (NTCA), MoEFCC',
    startedYear: 1973,
    description:
      'A centrally sponsored scheme that funds and administers India’s network of tiger reserves. It was placed on a statutory footing in 2006 with the creation of the NTCA, which coordinates reserve management, all-India tiger estimation and anti-poaching work.',
    speciesIds: ['bengal-tiger'],
    sources: [
      { label: 'National Tiger Conservation Authority', url: 'https://ntca.gov.in/', publisher: 'NTCA, MoEFCC' },
    ],
  },
  {
    id: 'project-elephant',
    name: 'Project Elephant',
    authority: 'MoEFCC, Government of India',
    startedYear: 1992,
    description:
      'A centrally sponsored scheme providing financial and technical support to elephant-range states for the protection of elephants, their habitats and migratory corridors, and for managing human–elephant conflict. It also designates Elephant Reserves.',
    speciesIds: ['asian-elephant'],
    sources: [
      {
        label: 'Project Elephant — PIB release',
        url: 'https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1884356',
        publisher: 'Press Information Bureau, Government of India',
      },
    ],
  },
  {
    id: 'project-dolphin',
    name: 'Project Dolphin',
    authority: 'MoEFCC, Government of India',
    startedYear: 2020,
    description:
      'Announced on 15 August 2020, Project Dolphin aims to conserve riverine and coastal dolphins through population surveys, habitat restoration, reduction of pollution and bycatch, and community engagement, with the Ganges river dolphin as its flagship.',
    speciesIds: ['ganges-river-dolphin'],
    sources: [
      { label: 'Project Dolphin', url: 'https://riverdolphin.in/about-the-project/', publisher: 'National Mission for Clean Ganga / MoEFCC' },
    ],
  },
  {
    id: 'project-snow-leopard',
    name: 'Project Snow Leopard',
    authority: 'MoEFCC, Government of India',
    startedYear: 2009,
    description:
      'A landscape-level, participatory programme to conserve snow leopards and high-altitude wildlife across the Himalayan and trans-Himalayan states, working with local communities and the Global Snow Leopard & Ecosystem Protection Program.',
    speciesIds: ['snow-leopard'],
    sources: [
      {
        label: 'National Snow Leopard Ecosystem Protection Priorities, India',
        url: 'https://globalsnowleopard.org/wp-content/uploads/2018/12/India_NSLEP-2.pdf',
        publisher: 'MoEFCC / Global Snow Leopard & Ecosystem Protection Program',
      },
    ],
  },
  {
    id: 'species-recovery-idwh',
    name: 'Species Recovery Programme (Integrated Development of Wildlife Habitats)',
    authority: 'MoEFCC, Government of India',
    startedYear: 2009,
    description:
      'A component of the Integrated Development of Wildlife Habitats scheme that provides dedicated support for the recovery of critically endangered species and their habitats. The list of covered taxa includes the Great Indian Bustard, Nilgiri Tahr, dugong, vultures, Ganges river dolphin, snow leopard, Kashmir stag (Hangul), Manipur brow-antlered deer, Asiatic lion and the greater one-horned rhinoceros, among others.',
    speciesIds: [
      'great-indian-bustard',
      'nilgiri-tahr',
      'dugong',
      'white-rumped-vulture',
      'ganges-river-dolphin',
      'snow-leopard',
      'indian-rhinoceros',
    ],
    sources: [
      {
        label: 'Wildlife Division — Integrated Development of Wildlife Habitats',
        url: 'https://moef.gov.in/wildlife-wl',
        publisher: 'MoEFCC, Government of India',
      },
    ],
  },
  {
    id: 'gib-conservation-breeding',
    name: 'Great Indian Bustard — habitat improvement & conservation breeding',
    authority: 'MoEFCC, Wildlife Institute of India & Rajasthan Forest Department',
    startedYear: 2016,
    description:
      'An integrated recovery effort combining protection of remaining bustard habitat in the Thar with a conservation-breeding programme. Eggs are collected from the wild and incubated at breeding centres near Sam and at Sorsan, with the aim of building an insurance population and eventual reintroduction.',
    speciesIds: ['great-indian-bustard'],
    sources: [
      {
        label: 'Bustard Recovery Project',
        url: 'https://wii.gov.in/bustard_recovery_project',
        publisher: 'Wildlife Institute of India',
      },
    ],
  },
  {
    id: 'vulture-action-plan',
    name: 'Action Plan for Vulture Conservation (2020–2025) & conservation breeding',
    authority: 'MoEFCC, with BNHS and state forest departments',
    startedYear: 2006,
    description:
      'Following catastrophic declines caused by the veterinary drug diclofenac, India banned veterinary diclofenac in 2006 and established Vulture Conservation Breeding Centres (led by the Bombay Natural History Society, e.g. at Pinjore, Haryana). The Action Plan for Vulture Conservation 2020–2025 continues breeding, release, advocacy for safe drugs and monitoring of "Vulture Safe Zones".',
    speciesIds: ['white-rumped-vulture'],
    sources: [
      {
        label: 'Action Plan for Vulture Conservation in India 2020–2025 (PDF)',
        url: 'https://save-vultures.org/wp-content/uploads/2020/11/20-11-India-National-Vulture-Action-Plan-2020-25.pdf',
        publisher: 'MoEFCC, Government of India (hosted by SAVE)',
      },
      { label: 'SAVE — Saving Asia’s Vultures from Extinction', url: 'https://save-vultures.org/', publisher: 'SAVE consortium' },
    ],
  },
  {
    id: 'crocodile-conservation-project',
    name: 'Crocodile Conservation Project & gharial rearing',
    authority: 'Government of India (with FAO/UNDP support) and state forest departments',
    startedYear: 1975,
    description:
      'Launched in 1975, initially with UN support, the project established rear-and-release ("grow-out") programmes and sanctuaries for India’s three crocodilians. For the gharial this includes egg collection, captive rearing and release into rivers such as the Chambal, and the designation of the National Chambal Sanctuary.',
    speciesIds: ['gharial'],
    sources: [
      {
        label: 'Gharial conservation research',
        url: 'https://wii.gov.in/',
        publisher: 'Wildlife Institute of India',
      },
    ],
  },
  {
    id: 'indian-rhino-vision',
    name: 'Indian Rhino Vision 2020 (IRV2020)',
    authority: 'Assam Forest Department, with WWF India, IUCN, Bodoland Territorial Council & partners',
    startedYear: 2005,
    description:
      'A programme to increase the greater one-horned rhino population in Assam and spread it across seven protected areas by translocating animals from Kaziranga and Pobitora to Manas National Park and elsewhere, reducing the risk of a single-site catastrophe.',
    speciesIds: ['indian-rhinoceros'],
    sources: [
      {
        label: 'Indian Rhino Vision 2020',
        url: 'https://www.wwfindia.org/about_wwf/priority_species/threatened_species/one_horned_rhinoceros/indian_rhino_vision_2020/',
        publisher: 'WWF India',
      },
    ],
  },
  {
    id: 'project-nilgiri-tahr',
    name: 'Project Nilgiri Tahr',
    authority: 'Tamil Nadu Forest Department',
    startedYear: 2023,
    description:
      'A state programme launched by Tamil Nadu in 2023 to conserve the Nilgiri Tahr through population and habitat surveys, reintroduction planning, disease monitoring, and restoration of shola-grassland habitat in the Western Ghats.',
    speciesIds: ['nilgiri-tahr'],
    sources: [
      {
        label: 'Project Nilgiri Tahr — Tamil Nadu',
        url: 'https://www.forests.tn.gov.in/',
        publisher: 'Tamil Nadu Forest Department',
      },
    ],
  },
];

export const PROGRAMME_BY_ID: Record<string, ConservationProgramme> = Object.fromEntries(
  PROGRAMMES.map((p) => [p.id, p]),
);
