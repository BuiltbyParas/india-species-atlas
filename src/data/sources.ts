import type { SourceRef } from '../types';

/**
 * Helper: build a stable IUCN Red List species search URL.
 * The atlas links to the Red List search rather than hard-coding numeric
 * taxon IDs, so links stay valid across Red List updates.
 */
export function iucnSearch(scientificName: string): SourceRef {
  return {
    label: `IUCN Red List assessment — ${scientificName}`,
    url: `https://www.iucnredlist.org/search?query=${encodeURIComponent(scientificName)}&searchType=species`,
    publisher: 'IUCN Red List of Threatened Species',
  };
}

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
        label: 'India state boundary GeoJSON (simplified for this project)',
        url: 'https://github.com/Subhash9325/GeoJson-Data-of-Indian-States',
        publisher: 'OpenData / community dataset',
      },
      {
        label: 'OpenStreetMap standard basemap tiles',
        url: 'https://www.openstreetmap.org/copyright',
        publisher: 'OpenStreetMap contributors',
      },
    ],
  },
];
