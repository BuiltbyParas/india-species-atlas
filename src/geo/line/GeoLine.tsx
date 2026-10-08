import { useId, type CSSProperties, type Ref } from 'react';
import { isSingleRun } from './paths';

/**
 * The atlas's one line.
 *
 * Every line that joins places — a species' thread, the route the reader
 * travels, the protected outline, the finale's convergence, a schematic that
 * stands for something the data does not map — is this component. A line has:
 *
 *  role      what it means, which decides its colour, weight and dash. Five
 *            roles, so the reader learns one vocabulary for the whole atlas
 *            (see documentation/PREMIUM_MOTION_SYSTEM.md):
 *              survey     the neutral ruled line: frames, extents, guides
 *              thread     joins a species' recorded localities
 *              route      the reader's own path through the story
 *              protect    what is protected
 *              schematic  stands in for something not mapped; always dashed
 *                         and always labelled as schematic by its caller
 *  draw      how much of it is drawn, 0 → 1, as a CSS value. Usually it is
 *            inherited from the `--draw` custom property a scroll timeline,
 *            a transition or the documentary clock writes on an ancestor;
 *            pass e.g. `var(--range)` to follow another variable.
 *  nib       a small mark at the drawing end while the line is being drawn —
 *            the pen. It shows only between 0 and 1, so a finished line is
 *            just a line. Needs a single continuous path.
 *  label     words set along the line, like a river's name on a sheet map.
 *
 * Drawing is a dash offset on a unit `pathLength`, and the stroke never
 * scales with the map, so a line keeps its weight at any zoom. Nothing here
 * runs per frame in JavaScript.
 */
export type LineRole = 'survey' | 'thread' | 'route' | 'protect' | 'schematic';

export function GeoLine({
  d,
  role,
  draw,
  nib,
  label,
  className,
  style,
  pathRef,
  ref,
}: {
  d: string;
  role: LineRole;
  /** A CSS value for `--draw`; omit to inherit it. */
  draw?: string | number;
  /** Nib radius in the SVG's user units; omit for none. */
  nib?: number;
  label?: { text: string; at?: number; size: number; side?: 'above' | 'below' };
  className?: string;
  style?: CSSProperties;
  pathRef?: Ref<SVGPathElement>;
  /** The line's group, for a driver that writes `--draw` straight onto it. */
  ref?: Ref<SVGGElement>;
}) {
  const id = useId().replace(/:/g, '');
  const vars = { ...(draw !== undefined ? { '--draw': draw } : null), ...style } as CSSProperties;
  const dashed = role === 'schematic';
  return (
    <g ref={ref} className={['gl', className].filter(Boolean).join(' ')} data-role={role} style={vars}>
      {dashed ? (
        // A dashed line cannot also be drawn with its dash offset, so it is
        // revealed through a mask that is drawn instead.
        <>
          <mask id={`${id}-m`} maskUnits="userSpaceOnUse">
            <path d={d} pathLength={1} className="gl-reveal" />
          </mask>
          <path ref={pathRef} id={`${id}-p`} d={d} className="gl-path gl-dashes" mask={`url(#${id}-m)`} />
        </>
      ) : (
        <path ref={pathRef} id={`${id}-p`} d={d} pathLength={1} className="gl-path" />
      )}
      {nib !== undefined && isSingleRun(d) && (
        <circle r={nib} className="gl-nib" style={{ offsetPath: `path('${d}')` }} />
      )}
      {label && (
        <text className="gl-label" style={{ fontSize: label.size }} dy={label.side === 'below' ? label.size * 1.15 : -label.size * 0.55}>
          <textPath href={`#${id}-p`} startOffset={`${(label.at ?? 0.5) * 100}%`} textAnchor="middle">
            {label.text}
          </textPath>
        </text>
      )}
    </g>
  );
}
