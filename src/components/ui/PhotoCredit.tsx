import type { Species } from '../../types';
import { cn } from '../../utils/cn';

/**
 * Attribution for a species photograph.
 *
 * Not decoration and not optional: every picture in the atlas is used under a
 * Creative Commons licence that requires the photographer, the licence and a
 * route back to the source to travel with it. Rendered wherever a photograph
 * is, in one component, so no view can quietly drop the credit.
 */
export function PhotoCredit({ species, className }: { species: Species; className?: string }) {
  const { credit, license, licenseUrl, sourceUrl } = species.image;
  if (!credit) return null;

  const link = 'underline decoration-forest-700 underline-offset-2 hover:text-canvas/75 hover:decoration-forest-400';

  return (
    <p className={cn('text-[11px] leading-snug text-canvas/40', className)}>
      Photograph:{' '}
      {sourceUrl ? (
        <a href={sourceUrl} target="_blank" rel="noreferrer" className={link}>
          {credit}
        </a>
      ) : (
        credit
      )}
      {license && (
        <>
          {' · '}
          {licenseUrl ? (
            <a href={licenseUrl} target="_blank" rel="noreferrer" className={link}>
              {license}
            </a>
          ) : (
            license
          )}
        </>
      )}
      {sourceUrl?.includes('commons.wikimedia.org') && ' · via Wikimedia Commons'}
    </p>
  );
}
