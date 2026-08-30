import type { HabitatId, Region, RegionId } from '../types';

/**
 * Broad ecological regions used for map interaction.
 * Outlines are deliberately coarse rectangles/polygons — they are visual
 * catchments for grouping species, NOT biogeographic boundaries.
 */
export const REGIONS: Region[] = [
  {
    id: 'himalayas',
    name: 'Himalayas & Trans-Himalaya',
    blurb:
      'High mountains and cold deserts from Ladakh east to Arunachal Pradesh — alpine meadows, conifer forest and rock above the treeline.',
    center: { lat: 33.6, lng: 77.5 },
    outline: [
      [37.1, 74.0],
      [36.0, 79.5],
      [32.0, 88.0],
      [27.8, 95.8],
      [27.2, 91.5],
      [30.2, 79.0],
      [32.6, 75.5],
      [34.8, 73.6],
    ],
    keyStates: ['Ladakh', 'Jammu and Kashmir', 'Himachal Pradesh', 'Uttarakhand', 'Sikkim', 'Arunachal Pradesh'],
  },
  {
    id: 'northeast',
    name: 'Northeast India',
    blurb:
      'The Brahmaputra valley and the forested hills of the seven sister states — one of the most biodiverse parts of the country.',
    center: { lat: 26.0, lng: 92.9 },
    outline: [
      [28.3, 89.7],
      [28.2, 97.4],
      [24.0, 95.2],
      [22.8, 92.3],
      [24.6, 89.8],
      [26.9, 88.6],
    ],
    keyStates: ['Assam', 'Meghalaya', 'Nagaland', 'Manipur', 'Mizoram', 'Tripura', 'Arunachal Pradesh'],
  },
  {
    id: 'western-ghats',
    name: 'Western Ghats',
    blurb:
      'A 1,600 km chain of hills along the west coast, from Gujarat to Kerala — a global biodiversity hotspot with high endemism.',
    center: { lat: 12.5, lng: 75.7 },
    outline: [
      [21.2, 73.0],
      [20.0, 74.4],
      [15.6, 74.6],
      [11.5, 77.2],
      [8.3, 77.3],
      [8.4, 76.6],
      [12.9, 74.8],
      [16.8, 73.4],
      [19.9, 72.7],
    ],
    keyStates: ['Maharashtra', 'Goa', 'Karnataka', 'Kerala', 'Tamil Nadu'],
  },
  {
    id: 'central-india',
    name: 'Central Indian Highlands',
    blurb:
      'The Satpura–Maikal and Vindhya ranges and the Deccan — dry and moist deciduous forest that holds much of India’s tiger population.',
    center: { lat: 22.0, lng: 80.5 },
    outline: [
      [24.6, 74.5],
      [24.8, 84.5],
      [21.0, 84.0],
      [18.5, 79.5],
      [19.6, 75.0],
      [22.2, 73.6],
    ],
    keyStates: ['Madhya Pradesh', 'Chhattisgarh', 'Maharashtra', 'Odisha', 'Jharkhand'],
  },
  {
    id: 'desert',
    name: 'Thar Desert & Arid Grasslands',
    blurb:
      'The arid west — the Thar Desert, the Rann of Kutch and the semi-arid grasslands of Rajasthan and Gujarat.',
    center: { lat: 26.5, lng: 71.5 },
    outline: [
      [29.9, 69.5],
      [29.4, 74.6],
      [26.0, 75.0],
      [23.0, 74.0],
      [22.8, 68.4],
      [26.7, 68.2],
    ],
    keyStates: ['Rajasthan', 'Gujarat'],
  },
  {
    id: 'gangetic-plains',
    name: 'Indo-Gangetic Plains',
    blurb:
      'The flat, densely farmed and populated basin of the Ganga, Yamuna and their tributaries, with large rivers and remnant grassland.',
    center: { lat: 26.3, lng: 82.5 },
    outline: [
      [30.5, 76.0],
      [29.6, 84.5],
      [25.0, 88.0],
      [24.6, 83.0],
      [25.6, 78.0],
      [28.7, 75.7],
    ],
    keyStates: ['Punjab', 'Haryana', 'Uttar Pradesh', 'Bihar', 'West Bengal'],
  },
  {
    id: 'sundarbans',
    name: 'Sundarbans & Eastern Delta',
    blurb:
      'The world’s largest contiguous mangrove forest, in the delta of the Ganga–Brahmaputra–Meghna along the Bay of Bengal.',
    center: { lat: 21.9, lng: 88.9 },
    outline: [
      [22.6, 88.0],
      [22.5, 89.9],
      [21.5, 89.6],
      [21.5, 88.2],
    ],
    keyStates: ['West Bengal'],
  },
  {
    id: 'coastal-marine',
    name: 'Coastal & Marine India',
    blurb:
      'The ~7,500 km coastline and island territories — seagrass meadows, coral reefs, estuaries and shallow seas.',
    center: { lat: 10.5, lng: 76.0 },
    outline: [
      [23.0, 68.0],
      [22.0, 70.0],
      [15.0, 73.5],
      [8.0, 77.0],
      [9.5, 79.5],
      [13.5, 80.5],
      [19.5, 85.0],
      [21.6, 87.5],
    ],
    keyStates: ['Gujarat', 'Tamil Nadu', 'Andaman & Nicobar Islands', 'Kerala', 'Odisha'],
  },
];

export const REGION_BY_ID: Record<RegionId, Region> = Object.fromEntries(
  REGIONS.map((r) => [r.id, r]),
) as Record<RegionId, Region>;

export const REGION_LABELS: Record<RegionId, string> = Object.fromEntries(
  REGIONS.map((r) => [r.id, r.name]),
) as Record<RegionId, string>;

export const HABITAT_LABELS: Record<HabitatId, string> = {
  forest: 'Forest',
  grassland: 'Grassland',
  freshwater: 'River / Freshwater',
  mountain: 'Mountain',
  wetland: 'Wetland',
  marine: 'Marine',
};
