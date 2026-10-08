import { SPECIES } from '../data/species';
import { formatDeg } from '../geo/india';

export interface Caption {
  eyebrow: string;
  title: string;
  note: string;
}

const LOCALITIES = SPECIES.reduce((n, s) => n + s.distributionPoints.length, 0);

/** What the line says about where it leads. Every word is read from the dataset or the page itself. */
export function describeRoute(path: string): Caption {
  const species = path.match(/^\/species\/([^/?#]+)/);
  if (species) {
    const i = SPECIES.findIndex((s) => s.id === species[1]);
    const s = SPECIES[i];
    if (s) {
      const a = s.distributionPoints[0];
      return {
        eyebrow: `Species ${String(i + 1).padStart(2, '0')} of ${SPECIES.length}`,
        title: s.commonName,
        note: a ? `${a.label.split(',')[0]} · ${formatDeg(a.lat, 'lat')} ${formatDeg(a.lng, 'lng')}` : s.scientificName,
      };
    }
  }
  const base = path.split(/[?#]/)[0];
  switch (base) {
    case '/':
      return { eyebrow: 'The atlas', title: 'The documentary', note: 'Five species, five kinds of ground' };
    case '/atlas':
      return { eyebrow: 'Map', title: 'The atlas', note: `${LOCALITIES} indicative localities` };
    case '/species':
      return { eyebrow: 'Directory', title: 'The species', note: `${SPECIES.length} species` };
    case '/compare':
      return { eyebrow: 'Compare', title: 'Side by side', note: 'Two or three species at a time' };
    case '/conservation':
      return { eyebrow: 'Data', title: 'Conservation', note: 'Status, threats and programmes' };
    case '/about':
      return { eyebrow: 'About', title: 'Method and limits', note: 'How the selection was made and checked' };
    case '/sources':
      return { eyebrow: 'References', title: 'Sources', note: 'General and per-species references' };
    default:
      return { eyebrow: 'Atlas', title: 'Not on the sheet', note: 'Page not found' };
  }
}

