import type { Species } from '../types';
import meta from '../assets/species/photo-meta.json';

/**
 * Responsive sources for a species photograph.
 *
 * The bundled 1400 px JPG stays the master. A 720 px WebP of the same picture
 * (`scripts/images/make-derivatives.mjs`) serves the small slots, and the
 * master's intrinsic size lets each <img> reserve its box before it arrives.
 * Files are matched by the master's file name, so the dataset is untouched.
 */
const SMALL = import.meta.glob<string>('../assets/species/*-720.webp', { eager: true, query: '?url', import: 'default' });
const SIZES = meta as Record<string, { w: number; h: number }>;

const IDS = Object.keys(SIZES).sort((a, b) => b.length - a.length);

function stem(src: string): string | undefined {
  // Built URLs carry a hash (/assets/great-indian-bustard-Ab12Cd34.jpg), so
  // match the longest master name the file begins with.
  const file = src.split('/').pop() ?? '';
  return IDS.find((id) => file.startsWith(`${id}.`) || file.startsWith(`${id}-`));
}

export interface PhotoSources {
  src: string;
  srcSet?: string;
  /** The small WebP alone, for places that want one modest file (textures, blurred backdrops). */
  small: string;
  width?: number;
  height?: number;
}

export function photoSources(species: Species): PhotoSources | null {
  const src = species.image.src;
  if (!src) return null;
  const id = stem(src);
  const small = id ? SMALL[`../assets/species/${id}-720.webp`] : undefined;
  const size = id ? SIZES[id] : undefined;
  return {
    src,
    srcSet: small && size ? `${small} 720w, ${src} ${size.w}w` : undefined,
    small: small ?? src,
    width: size?.w,
    height: size?.h,
  };
}
