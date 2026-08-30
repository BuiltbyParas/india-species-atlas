import type { IucnStatus, StatusInfo } from '../types';
import { STATUS_HEX } from '../theme';

/**
 * IUCN Red List category definitions.
 * Wording is a plain-language paraphrase of the official IUCN category
 * descriptions (IUCN Red List Categories and Criteria, version 3.1).
 * Source: https://www.iucnredlist.org/resources/categories-and-criteria
 */
export const STATUS_INFO: Record<IucnStatus, StatusInfo> = {
  CR: {
    code: 'CR',
    name: 'Critically Endangered',
    short: 'Extremely high risk of extinction in the wild.',
    definition:
      'The species faces an extremely high risk of extinction in the wild in the immediate future, based on criteria such as severe population reduction, a very small or restricted range, or a very small population.',
    colorVar: 'var(--color-status-cr)',
    hex: STATUS_HEX.CR,
  },
  EN: {
    code: 'EN',
    name: 'Endangered',
    short: 'Very high risk of extinction in the wild.',
    definition:
      'The species faces a very high risk of extinction in the wild in the near future, based on population decline, small range or small population size.',
    colorVar: 'var(--color-status-en)',
    hex: STATUS_HEX.EN,
  },
  VU: {
    code: 'VU',
    name: 'Vulnerable',
    short: 'High risk of extinction in the wild.',
    definition:
      'The species faces a high risk of extinction in the wild in the medium-term future. It is closer to being threatened with extinction than a Near Threatened or Least Concern species.',
    colorVar: 'var(--color-status-vu)',
    hex: STATUS_HEX.VU,
  },
  NT: {
    code: 'NT',
    name: 'Near Threatened',
    short: 'Close to qualifying as threatened.',
    definition:
      'The species does not currently qualify as Critically Endangered, Endangered or Vulnerable, but is close to qualifying, or is likely to qualify, for a threatened category in the near future.',
    colorVar: 'var(--color-status-nt)',
    hex: STATUS_HEX.NT,
  },
  LC: {
    code: 'LC',
    name: 'Least Concern',
    short: 'Not currently at risk.',
    definition:
      'The species has been evaluated and does not qualify for a threatened or Near Threatened category. Widespread and abundant taxa are included here.',
    colorVar: 'var(--color-status-lc)',
    hex: STATUS_HEX.LC,
  },
  DD: {
    code: 'DD',
    name: 'Data Deficient',
    short: 'Not enough information to assess risk.',
    definition:
      'There is inadequate information to make a direct or indirect assessment of the species’ risk of extinction based on its distribution or population status.',
    colorVar: 'var(--color-ink-soft)',
    hex: STATUS_HEX.DD,
  },
};

/** The three threatened categories the atlas focuses on, in order of severity. */
export const THREATENED_ORDER: IucnStatus[] = ['CR', 'EN', 'VU'];

export function statusColor(code: IucnStatus): string {
  return STATUS_INFO[code].colorVar;
}
