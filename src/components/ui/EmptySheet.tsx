import type { ReactNode } from 'react';
import { MAP_VIEWBOX, project, useIndiaGeo } from '../../geo/india';
import { GeoLine } from '../../geo/line/GeoLine';
import { cn } from '../../utils/cn';

// The sheet's middle; the ring marks a search, not a place.
const [CX, CY] = project(79, 22.5);

/**
 * An empty result, drawn as the atlas draws everything else: the sheet of
 * India with a survey ring that found nothing inside it. Used wherever a view
 * can come back empty (no matching species, an unknown page), so an empty
 * state reads as part of the instrument rather than an error box.
 */
export function EmptySheet({
  eyebrow,
  title,
  children,
  actions,
  as: Title = 'p',
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  as?: 'p' | 'h1' | 'h2';
  className?: string;
}) {
  const geo = useIndiaGeo();
  return (
    <div className={cn('empty-sheet grid items-center gap-8 py-10 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-12', className)}>
      <div className="relative mx-auto w-40 sm:w-full" aria-hidden="true">
        <svg viewBox={MAP_VIEWBOX} className="w-full overflow-visible">
          {geo && <GeoLine d={geo.all} role="survey" still className="es-country" />}
          <circle cx={CX} cy={CY} r="90" className="es-ring" />
          <path d={`M${CX - 22} ${CY}h44M${CX} ${CY - 22}v44`} className="es-cross" />
        </svg>
      </div>
      <div>
        <p className="caps">{eyebrow}</p>
        <Title className="mt-3 font-serif text-[clamp(1.6rem,3vw,2.4rem)] font-light leading-tight tracking-[-0.015em] text-canvas">
          {title}
        </Title>
        {children && <div className="mt-3 max-w-md text-small leading-relaxed text-canvas/60">{children}</div>}
        {actions && <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">{actions}</div>}
      </div>
    </div>
  );
}
