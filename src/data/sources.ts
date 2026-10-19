import type { SourceRef } from '../types';

/**
 * The IUCN Red List assessment a species' status is drawn from, linked by its DOI.
 *
 * The DOI names one assessment, so a reader can check the category, the date it was assessed and the year it was
 * published (`statusAssessedYear` / `statusPublishedYear`); a search link could not show which assessment was meant.
 * The DOIs and dates were read from Crossref's record of each assessment (api.crossref.org, October 2026).
 */
export function iucnAssessment(scientificName: string, citation: string, doi: string, published: number): SourceRef {
  return {
    label: `IUCN Red List assessment — ${scientificName} (${citation})`,
    url: `https://doi.org/${doi}`,
    publisher: 'IUCN Red List of Threatened Species',
    published: String(published),
  };
}

/** Survey reports and statements the species entries cite for their population figures, each used once. */
export const REPORTS = {
  elephants2025: {
    label: 'Status of Elephants in India: DNA-based Synchronous All India Population Estimation of Elephants (SAIEE) 2021–2025',
    url: 'https://wii.gov.in/news/status_of_elephants_in_india_202_2025',
    publisher: 'Wildlife Institute of India, for Project Elephant, MoEFCC',
    published: '2025-10',
  },
  dolphins2025: {
    label: 'Population Status of River Dolphins in India (survey 2021–23)',
    url: 'https://wii.gov.in/news/population-status-of-river-dolphins-in-india',
    publisher: 'Wildlife Institute of India / MoEFCC',
    published: '2025-03-03',
  },
  bustard2026: {
    label: 'Status and trend of Great Indian Bustard, associated wildlife and habitat in Thar: survey report 2024–25 (PDF)',
    url: 'https://www.wii.gov.in/uploads/media/pdf/GIB_Report_24_25.pdf',
    publisher: 'Wildlife Institute of India, MoEFCC and Rajasthan Forest Department',
    published: '2026',
  },
  dugongs2026: {
    label: 'Population Status of Dugongs in Tamil Nadu: technical report (PDF)',
    url: 'https://www.wii.gov.in/uploads/media/pdf/population-status-of-dugongs-20-3-26.pdf',
    publisher: 'Wildlife Institute of India, for the Tamil Nadu Forest Department',
    published: '2026',
  },
  rhinos2022: {
    label: 'Asian Rhino Specialist Group chair report, Pachyderm 63: 33–37',
    url: 'https://doi.org/10.69649/pachyderm.v63i.511',
    publisher: 'IUCN SSC Asian Rhino Specialist Group (Talukdar, B. K.)',
    published: '2022-12-14',
  },
  tigers2022: {
    label: 'Achievements of the NTCA in 2023, including the All India Tiger Estimation 2022',
    url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=1991620',
    publisher: 'Press Information Bureau, MoEFCC',
    published: '2023-12-29',
  },
  tigerReports: {
    label: 'Status of Tigers, Co-predators and Prey in India 2022 (reports)',
    url: 'https://wii.gov.in/tiger-reports-1',
    publisher: 'NTCA / Wildlife Institute of India',
    published: '2023',
  },
  snowLeopards2024: {
    label: 'Status of Snow Leopards in India released: Snow Leopard Population Assessment in India (SPAI)',
    url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2000545',
    publisher: 'Press Information Bureau, MoEFCC',
    published: '2024-01-30',
  },
  projectElephant: {
    label: 'World Elephant Day 2026 and the Steering Committee of Project Elephant',
    url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2298830',
    publisher: 'Press Information Bureau, MoEFCC',
    published: '2026-08-13',
  },
  tahrProject: {
    label: 'Tamil Nadu launches special project to conserve Nilgiri Tahr',
    url: 'https://www.deccanherald.com/india/tamil-nadu-launches-special-project-to-conserve-nilgiri-tahr-1175910.html',
    publisher: 'Deccan Herald (news report of the Tamil Nadu order)',
    published: '2022-12-28',
  },
  tahrCensus2025: {
    label: 'Nilgiri tahr population rises to 2,668 (joint Kerala–Tamil Nadu census, April 2025)',
    url: 'https://thesouthfirst.com/news-in-brief/nilgiri-tahr-population-rises-to-2668-enp-leads-conservation-efforts/',
    publisher: 'The South First (news report of the state census reports)',
    published: '2025',
  },
  vultureDecline: {
    label: 'Vulture conservation in India: 99.9% decline of the white-rumped vulture, 1992–2007 (Prakash et al. 2007) (PDF)',
    url: 'https://www.bnhs.org/public/pdf_documents/1562761806.pdf',
    publisher: 'Bombay Natural History Society',
  },
  gharialEdge: {
    label: 'Gharial — EDGE of Existence',
    url: 'https://www.edgeofexistence.org/species/gharial/',
    publisher: 'Zoological Society of London',
  },
  bustardUplisting2011: {
    label: 'Big birds lose out in a crowded world (2011 Red List update: Great Indian Bustard to Critically Endangered)',
    url: 'https://iucn.org/content/big-birds-lose-out-a-crowded-world',
    publisher: 'IUCN',
    published: '2011',
  },
} satisfies Record<string, SourceRef>;

/** General bibliography shown on the Sources page. */
export const BIBLIOGRAPHY: Array<{
  category: string;
  entries: SourceRef[];
}> = [
  {
    category: 'Conservation status',
    entries: [
      {
        label: 'The IUCN Red List of Threatened Species',
        url: 'https://www.iucnredlist.org/',
        publisher: 'International Union for Conservation of Nature (IUCN)',
      },
      {
        label: 'IUCN Red List Categories and Criteria (version 3.1)',
        url: 'https://www.iucnredlist.org/resources/categories-and-criteria',
        publisher: 'IUCN Species Survival Commission',
      },
      {
        label: 'BirdLife International Data Zone (species factsheets)',
        url: 'https://datazone.birdlife.org/',
        publisher: 'BirdLife International',
      },
    ],
  },
  {
    category: 'Government of India — policy & programmes',
    entries: [
      {
        label: 'Ministry of Environment, Forest and Climate Change — Wildlife Division',
        url: 'https://moef.gov.in/wildlife-wl',
        publisher: 'MoEFCC, Government of India',
      },
      {
        label: 'National Tiger Conservation Authority (Project Tiger)',
        url: 'https://ntca.gov.in/',
        publisher: 'NTCA, MoEFCC',
      },
      {
        label: 'Press Information Bureau — environment releases',
        url: 'https://pib.gov.in/',
        publisher: 'Press Information Bureau, Government of India',
      },
      {
        label: 'Wild Life (Protection) Act, 1972 (searchable text)',
        url: 'https://www.indiacode.nic.in/',
        publisher: 'India Code, Government of India',
      },
    ],
  },
  {
    category: 'Research & technical institutions',
    entries: [
      {
        label: 'Wildlife Institute of India',
        url: 'https://wii.gov.in/',
        publisher: 'Wildlife Institute of India (WII), Dehradun',
      },
      {
        label: 'National Centre for Biological Sciences — Mammals / Birds of India',
        url: 'https://www.mammalsofindia.org/',
        publisher: 'NCF / IISc / citizen-science databases',
      },
      {
        label: 'Zoological Survey of India',
        url: 'https://zsi.gov.in/',
        publisher: 'Zoological Survey of India (ZSI)',
      },
      {
        label: 'Bombay Natural History Society',
        url: 'https://bnhs.org/',
        publisher: 'Bombay Natural History Society (BNHS)',
      },
    ],
  },
  {
    category: 'Conservation organisations',
    entries: [
      {
        label: 'WWF India — Threatened Species',
        url: 'https://www.wwfindia.org/about_wwf/priority_species/threatened_species/',
        publisher: 'WWF India',
      },
      {
        label: 'SAVE — Saving Asia’s Vultures from Extinction',
        url: 'https://www.save-vultures.org/',
        publisher: 'SAVE consortium',
      },
      {
        label: 'Snow Leopard Trust',
        url: 'https://snowleopard.org/',
        publisher: 'Snow Leopard Trust',
      },
    ],
  },
  {
    category: 'Map & boundary data',
    entries: [
      {
        label: 'India state and Union Territory boundaries, updated January 2020 (Survey of India layer; Jammu & Kashmir and Ladakh joined into one political-map territory, simplified for this project)',
        url: 'https://github.com/AnujTiwari/India-State-and-Country-Shapefile-Updated-Jan-2020',
        publisher: 'Survey of India records, via a community repository (no licence stated)',
      },
      {
        label: 'Shaksgam Valley outline (Natural Earth, public domain)',
        url: 'https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-breakaway-disputed-areas/',
        publisher: 'Natural Earth',
      },
      {
        label: 'Esri World Ocean Base (basemap tiles with no political boundaries)',
        url: 'https://www.arcgis.com/home/item.html?id=5ae9e138a17842688b0b79283a4353f6',
        publisher: 'Esri, Garmin, GEBCO, NOAA NGDC and other contributors',
      },
    ],
  },
];
