/**
 * Facts about the site itself, taken from the repository rather than typed in:
 * the public address is the one the existing promo pipeline publishes
 * (scripts/promo/config.mjs), and the taglines are the site's own words.
 */
// The existing promo pipeline's config is the single record of the public URL.
// It is plain ESM with no Node imports, so the film's bundle can read it.
import { PUBLIC_URL } from '../../../scripts/promo/config.mjs';

export const SITE_URL: string = PUBLIC_URL;
/** "builtbyparas.github.io/india-species-atlas" — the address as it is said aloud. */
export const SITE_ADDRESS = SITE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
/** The host and base path as a browser's address bar shows them. */
export const PUBLIC_HOST = SITE_ADDRESS;

/** The home page's subtitle (src/components/cinema/CinematicHero.tsx). */
export const HERO_TAGLINE = ['Mapping endangered species.', 'Tracing the lines that shape survival.'] as const;

/** The documentary's closing lines (src/components/cinema/ConservationMap.tsx). */
export const CLOSING_LINES = ['Mapping is not just about where species are.', 'It is about where we choose to protect them.'] as const;
