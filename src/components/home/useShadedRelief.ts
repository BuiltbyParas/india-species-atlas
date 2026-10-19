import { useEffect, useState } from 'react';
import { project } from '../../geo/india';
import { loadRelief, RELIEF_EXAGGERATION, shadeRelief } from './heroRelief';

export interface ShadedRelief {
  href: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The same elevation model the 3D relief stands on, shaded once into a printed
 * relief (light from the north-west) and placed on the flat map's sheet, in the
 * map's own projection. Null until it has loaded (and until `enabled`), and for
 * good if it cannot: the flat map stands without it.
 */
export function useShadedRelief(enabled = true): ShadedRelief | null {
  const [shaded, setShaded] = useState<ShadedRelief | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    let href = '';
    loadRelief()
      .then((grid) => {
        if (!live) return;
        shadeRelief(grid, RELIEF_EXAGGERATION).toBlob((blob) => {
          if (!live || !blob) return;
          href = URL.createObjectURL(blob);
          const [x, y] = project(grid.west, grid.north);
          const [x1, y1] = project(grid.east, grid.south);
          setShaded({ href, x, y, w: x1 - x, h: y1 - y });
        });
      })
      .catch(() => undefined);
    return () => {
      live = false;
      if (href) URL.revokeObjectURL(href);
    };
  }, [enabled]);
  return shaded;
}
