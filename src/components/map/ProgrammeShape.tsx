import type { ProgrammeIdentity } from './programmeSites';

/**
 * A programme's plan outline, drawn flat.
 *
 * The 3D view stands these same polygons as prisms, so the legend and the
 * stage agree by construction rather than by a table someone has to keep in
 * step: both read their sides and rotation from `identityFor`.
 */
export function ProgrammeShape({
  identity,
  size = 14,
  className,
}: {
  identity: ProgrammeIdentity;
  size?: number;
  className?: string;
}) {
  const r = size / 2 - 1;
  const points = Array.from({ length: identity.sides }, (_, i) => {
    const angle = identity.rotation + (i / identity.sides) * Math.PI * 2;
    // SVG's y axis points down, so the outline is mirrored to keep the same
    // orientation the scene shows.
    return `${size / 2 + Math.cos(angle) * r},${size / 2 - Math.sin(angle) * r}`;
  }).join(' ');

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      className={className}
    >
      <polygon points={points} fill={identity.hex} stroke="rgba(0,0,0,0.35)" strokeWidth="0.5" />
    </svg>
  );
}
