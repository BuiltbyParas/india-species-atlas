/**
 * The finishing pass: a vignette and a fine luma grain. Both are subtle by
 * design — the film's look is composition, type and timing, not effects.
 *
 * The grain is one 256 px noise tile drawn once with a seeded generator and
 * shifted to a new seeded offset each frame: cheap, and deterministic. It is
 * composited with a plain alpha blend — a blend mode over the whole frame
 * costs more than everything else in it on a software renderer.
 */
import { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { hash01 } from '../../utils/anim';

function noiseTile(size = 256): string {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const img = g.createImageData(size, size);
  let seed = 1337;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  // Zero-mean luma grain as light and dark specks, so a plain alpha blend
  // (cheap) adds texture without lifting or crushing the blacks.
  for (let i = 0; i < size * size; i++) {
    const v = rnd() + rnd() + rnd() - 1.5;
    const lum = v > 0 ? 255 : 0;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = lum;
    img.data[i * 4 + 3] = Math.min(255, Math.abs(v) * 170);
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}

export function Finish({ grain = 0.05, vignette = 0.55 }: { grain?: number; vignette?: number }) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const tile = useMemo(() => noiseTile(), []);
  const ox = Math.floor(hash01(frame) * 256);
  const oy = Math.floor(hash01(frame + 977) * 256);
  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `radial-gradient(ellipse ${width * 0.75}px ${height * 0.8}px at 50% 48%, rgba(0,0,0,0) 55%, rgba(4,7,5,${vignette}) 100%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage: `url(${tile})`,
          backgroundPosition: `${ox}px ${oy}px`,
          opacity: grain,
        }}
      />
    </>
  );
}
