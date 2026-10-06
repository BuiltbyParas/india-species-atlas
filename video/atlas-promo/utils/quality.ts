/**
 * Render quality, passed as input props (`--props='{"quality":"draft"}'`).
 *
 *   final  (default) every layer, film grain
 *   draft  no grain, no contour lines — for fast timing previews
 *
 * `skip` switches individual layers off, for profiling.
 */
import { getInputProps } from 'remotion';

export interface Quality {
  quality: 'draft' | 'final';
  skip: string[];
}

let cached: Quality | null = null;

export function quality(): Quality {
  if (cached) return cached;
  let props: Record<string, unknown> = {};
  try {
    props = getInputProps();
  } catch {
    /* Studio before props resolve */
  }
  cached = {
    quality: props.quality === 'draft' ? 'draft' : 'final',
    skip: Array.isArray(props.skip) ? (props.skip as string[]) : [],
  };
  return cached;
}

export const isOn = (layer: string) => {
  const q = quality();
  if (q.skip.includes(layer)) return false;
  if (q.quality === 'draft' && (layer === 'grain' || layer === 'contours')) return false;
  return true;
};
