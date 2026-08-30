import { useState } from 'react';
import { Bird, Fish, PawPrint, Shell, Turtle } from 'lucide-react';
import type { Species } from '../../types';
import { STATUS_INFO } from '../../data/statusInfo';
import { PALETTE } from '../../theme';
import { cn } from '../../utils/cn';

/**
 * Species imagery.
 *
 * The project ships with no bundled photographs: instead of using an
 * uncredited copyrighted image, each species is shown with a tasteful,
 * generated placeholder tinted by IUCN status and marked with its animal
 * group. If a legally-usable image URL is added to a species' `image.src`
 * (e.g. a Wikimedia Commons file), it is used and falls back to the
 * placeholder if it fails to load. See the README for how to add photos.
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
}: {
  species: Species;
  className?: string;
  imgClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const { src, alt } = species.image;

  if (!src || failed) {
    return <Placeholder species={species} className={className} />;
  }

  return (
    <div className={cn('relative overflow-hidden bg-forest-800', className)}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={cn('h-full w-full object-cover', imgClassName)}
      />
    </div>
  );
}
