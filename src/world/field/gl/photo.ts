import * as THREE from 'three';
import type { Species } from '../../../types';
import { photoSources } from '../../../utils/photo';
import type { QualityTier } from '../../quality';

/**
 * A species photograph as a material.
 *
 * In the field studies a photograph is evidence that arrives inside a place:
 * it rises out of the Thar's ground, fills in band by band between a
 * mountain's contours, surfaces through moving water, is found by a lantern
 * between trees, or is resolved from a field of points. Each world writes its
 * own reveal; what they share is here — the texture (the 720 px WebP, or the
 * 1400 px master on the high tier), its aspect, and a cover-fit so a plane of
 * any proportion shows the picture uncropped where it can and never stretched.
 *
 * Photographs are the dataset's own, credited wherever they appear: the study
 * page prints the credit beside the stage that shows it.
 */
export interface PhotoTexture {
  texture: THREE.Texture;
  aspect: number;
}

const cache = new Map<string, Promise<PhotoTexture>>();

export function loadPhoto(species: Species, tier: QualityTier): Promise<PhotoTexture | null> {
  const p = photoSources(species);
  if (!p) return Promise.resolve(null);
  const url = tier === 'high' ? p.src : p.small;
  let job = cache.get(url);
  if (!job) {
    job = new THREE.TextureLoader().loadAsync(url).then((texture) => {
      texture.colorSpace = THREE.NoColorSpace;
      texture.anisotropy = 4;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.generateMipmaps = true;
      const img = texture.image as { width: number; height: number };
      return { texture, aspect: img.width / Math.max(1, img.height) };
    });
    job.catch(() => cache.delete(url));
    cache.set(url, job);
  }
  return job.catch(() => null);
}

/** GLSL: map a plane's uv onto a picture of `imageAspect` so it covers a plane of `planeAspect`. */
export const GLSL_COVER = /* glsl */ `
  vec2 coverUv(vec2 uv, float planeAspect, float imageAspect) {
    vec2 s = planeAspect > imageAspect ? vec2(1.0, imageAspect / planeAspect) : vec2(planeAspect / imageAspect, 1.0);
    return (uv - 0.5) * s + 0.5;
  }
  float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
`;
