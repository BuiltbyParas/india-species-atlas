import { useState } from 'react';
import { Bird, Fish, PawPrint, Shell, Turtle } from 'lucide-react';
import type { Species } from '../../types';
import { STATUS_INFO } from '../../data/statusInfo';
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
 * fails to load, a placeholder tinted by IUCN status and marked with the
 * animal group stands in; it never pretends to be a picture of the animal.
 * Credits are rendered beside the image by `PhotoCredit`.
 */

const GROUP_ICON = {
  mammal: PawPrint,
  bird: Bird,
  reptile: Turtle,
  fish: Fish,
  amphibian: Shell,
} as const;

function Placeholder({ species, className }: { species: Species; className?: string }) {
  const Icon = GROUP_ICON[species.group];
  const status = STATUS_INFO[species.status];
  return (
    <div
      className={cn('relative flex items-center justify-center overflow-hidden bg-forest-800', className)}
      role="img"
      aria-label={species.image.alt}
    >
      {/* soft contour-line texture */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.14]"
        viewBox="0 0 200 200"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        {[18, 40, 62, 84, 106, 128, 150].map((r) => (
          <circle key={r} cx="60" cy="150" r={r} fill="none" stroke={PALETTE.forest300} strokeWidth="1.5" />
        ))}
      </svg>
      <div
        className="absolute inset-x-0 bottom-0 h-1.5"
        style={{ backgroundColor: status.colorVar }}
        aria-hidden="true"
      />
      <div className="relative flex flex-col items-center gap-2 text-forest-200">
        <span
          className="grid h-16 w-16 place-items-center rounded-full border"
          style={{ borderColor: status.colorVar, color: status.colorVar }}
        >
          <Icon className="h-8 w-8" strokeWidth={1.6} aria-hidden="true" />
        </span>
        <span className="max-w-[85%] text-center text-xs font-medium leading-tight text-forest-200/80">
          {species.commonName}
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
