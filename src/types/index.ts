/**
 * Domain types for the India Species Atlas.
 * All species/conservation data conforms to these shapes; the UI never
 * hard-codes species information of its own.
 */

/** IUCN Red List categories. The atlas focuses on the three threatened ones. */
export type IucnStatus = 'CR' | 'EN' | 'VU' | 'NT' | 'LC' | 'DD';

/** Broad ecological / geographic regions used for map interaction. */
export type RegionId =
  | 'himalayas'
  | 'northeast'
  | 'western-ghats'
  | 'central-india'
  | 'desert'
  | 'gangetic-plains'
  | 'sundarbans'
  | 'coastal-marine';

/** Habitat categories used by the habitat filter and charts. */
export type HabitatId =
  | 'forest'
  | 'grassland'
  | 'freshwater'
  | 'mountain'
  | 'wetland'
  | 'marine';

/** Threat categories shown in Threats mode. */
export type ThreatId =
  | 'habitat-loss'
  | 'poaching'
  | 'pollution'
  | 'infrastructure'
  | 'power-lines'
  | 'climate-change'
  | 'human-wildlife-conflict'
  | 'bycatch';

export interface SourceRef {
  label: string;
  url: string;
  /** Publisher / issuing body, e.g. "IUCN Red List", "MoEFCC". */
  publisher: string;
}

/**
 * An approximate point used to place a species marker on the map.
 * These are indicative locations within a known range — never exact
 * population boundaries. See the map disclaimer.
 */
export interface DistributionPoint {
  lat: number;
  lng: number;
  /** Short place / landscape label, e.g. "Kaziranga NP, Assam". */
  label: string;
  /** Optional note clarifying what this point represents. */
  note?: string;
}

/**
 * One dated entry in a species' IUCN Red List record: the year from which a
 * category applied, and the source that states it.
 *
 * The atlas records these only where a source could be found that states the
 * year explicitly. A species with no entry here is shown as "not recorded"
 * rather than being given an inferred date — the assessment history published
 * by the Red List is not machine-readable, and a guessed year would be
 * indistinguishable on screen from a checked one.
 */
export interface StatusAssessment {
  year: number;
  status: IucnStatus;
  /** One line saying what the record states. */
  note: string;
  source: SourceRef;
}

export interface SpeciesImage {
  /** Optional raster image (e.g. a Wikimedia Commons file URL). */
  src?: string;
  alt: string;
  credit?: string;
  license?: string;
  licenseUrl?: string;
  sourceUrl?: string;
}

export interface Species {
  id: string;
  commonName: string;
  scientificName: string;
  /** Animal group — drives the placeholder illustration and grouping. */
  group: 'mammal' | 'bird' | 'reptile' | 'fish' | 'amphibian';
  status: IucnStatus;
  statusFullName: string;
  /** Year of the IUCN assessment this status is drawn from. */
  statusAssessedYear: number;
  /** Dated Red List listings, oldest first. Absent where none is recorded. */
  statusHistory?: StatusAssessment[];
  /** Whether the species is endemic to India / the Indian subcontinent. */
  endemicToIndia: boolean;
  regions: RegionId[];
  /** Indian states / UTs where the species occurs (plain names). */
  states: string[];
  habitats: HabitatId[];
  /** One-sentence summary shown on cards. */
  summary: string;
  /** 2–4 sentence description for the profile. */
  description: string;
  /** How the species is distributed in India, in words. */
  indianDistribution: string;
  habitatNote: string;
  majorThreats: ThreatId[];
  threatNote: string;
  conservationActions: string[];
  /** IDs into the conservation programmes dataset. */
  conservationProgrammes: string[];
  protectedAreas: string[];
  /** Why this species matters ecologically / culturally. */
  whyItMatters: string;
  distributionPoints: DistributionPoint[];
  image: SpeciesImage;
  sources: SourceRef[];
  /** ISO date the species entry was last checked against its sources. */
  lastVerified: string;
}

export interface Region {
  id: RegionId;
  name: string;
  blurb: string;
  /** Approximate label anchor for the map. */
  center: { lat: number; lng: number };
  /** Rough bounding polygon (educational approximation). */
  outline: Array<[number, number]>;
  keyStates: string[];
}

export interface ConservationProgramme {
  id: string;
  name: string;
  authority: string;
  startedYear?: number;
  description: string;
  /** Species IDs the programme is generally associated with. */
  speciesIds: string[];
  sources: SourceRef[];
}

export interface ThreatCategory {
  id: ThreatId;
  name: string;
  description: string;
}

export interface StatusInfo {
  code: IucnStatus;
  name: string;
  short: string;
  definition: string;
  /** CSS custom-property reference — safe for HTML `style` and CSS. */
  colorVar: string;
  /** Literal hex — use for SVG attributes, canvas, Leaflet and Recharts. */
  hex: string;
}

export type ConservationMode = 'species' | 'threats' | 'conservation';

export interface SpeciesFilterState {
  query: string;
  statuses: IucnStatus[];
  regions: RegionId[];
  habitats: HabitatId[];
}
