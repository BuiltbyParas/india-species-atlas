import { useState } from 'react';
import type { Species } from '../../types';
import { STATUS_INFO } from '../../data/statusInfo';
import { localityCoords } from '../../geo/india';
import { PALETTE } from '../../theme';
import { cn } from '../../utils/cn';
import { photoSources } from '../../utils/photo';

/**
 * Species imagery.
 *
 * Every species has a bundled, credited photograph (see `src/data/species.ts`
 * and `scripts/images/`). It is served responsively — a 720 px WebP for small
 * slots, the 1400 px master where the slot is large — with its intrinsic size
 * set so the box is reserved before it loads. If a photograph is missing or
 * fails to load, a field card that says so stands in; it never pretends to
 * be a picture of the animal.
 * Credits are rendered beside the image by `PhotoCredit`.
 */

/**
 * The photograph that is not there. It is set like a field card with the
 * picture missing: a frame with crop marks, the species, and where it was
 * recorded. It says plainly that the photograph is unavailable, so it is never
 * mistaken for one.
 */
function Placeholder({ species, className }: { species: Species; className?: string }) {
  const status = STATUS_INFO[species.status];
  const a = species.distributionPoints[0];
  return (
    <div
      className={cn('photo-missing relative overflow-hidden bg-forest-900', className)}
      role="img"
      aria-label={`${species.commonName}: photograph unavailable`}
    >
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.12]"
        viewBox="0 0 200 200"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        {[18, 40, 62, 84, 106, 128, 150].map((r) => (
          <circle key={r} cx="150" cy="160" r={r} fill="none" stroke={PALETTE.forest300} strokeWidth="1" />
        ))}
      </svg>
      <span className="photo-missing-crop" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 h-px" style={{ backgroundColor: status.colorVar }} aria-hidden="true" />
      <div className="relative flex h-full flex-col justify-between p-[clamp(0.75rem,6%,1.5rem)]">
        <span className="caps">Photograph unavailable</span>
        <span>
          <span className="block font-serif text-[clamp(1rem,2.2vw,1.35rem)] font-light leading-tight text-canvas/85">
            {species.commonName}
          </span>
          {a && (
            <span className="mt-1 block text-micro tabular-nums text-canvas/62">
              {localityCoords(a)}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

export function SpeciesImage({
  species,
  className,
  imgClassName,
  sizes = '(min-width: 1024px) 33vw, 100vw',
}: {
  species: Species;
  className?: string;
  imgClassName?: string;
  /** How wide the slot is, so the browser can choose between the WebP and the master. */
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  const photo = photoSources(species);

  if (!photo || failed) {
    return <Placeholder species={species} className={className} />;
  }

  return (
    <div className={cn('relative overflow-hidden bg-forest-800', className)}>
      <img
        src={photo.src}
        srcSet={photo.srcSet}
        sizes={sizes}
        width={photo.width}
        height={photo.height}
        alt={species.image.alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={cn('h-full w-full object-cover', imgClassName)}
      />
    </div>
  );
}
