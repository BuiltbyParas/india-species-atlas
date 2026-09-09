/**
 * Whether it is reasonable to spend a WebGL context and the three.js bundle on
 * decoration for this visitor.
 *
 * Shared by the hero and the species gallery so that a device gets one answer,
 * not two. Anything short of a clear yes falls back to the flat layout, which
 * is the layout the site is designed around: the 3D is an enhancement on top
 * of a page that already works without it.
 */

/** The WebGL probe is a device fact and cannot change within a session. */
let webglSupported: boolean | null = null;

export function hasWebGL(): boolean {
  if (webglSupported !== null) return webglSupported;
  // Probe for a real context rather than trusting feature detection, then hand
  // it straight back — some devices advertise WebGL and fail to allocate.
  try {
    const probe = document.createElement('canvas');
    const gl = (probe.getContext('webgl2') ?? probe.getContext('webgl')) as WebGLRenderingContext | null;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    webglSupported = Boolean(gl);
  } catch {
    webglSupported = false;
  }
  return webglSupported;
}

export function canRender3D(): boolean {
  if (typeof window === 'undefined') return false;
  // Re-read every time: unlike the device facts below, this one can be changed
  // by the visitor while the page is open.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;

  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
    deviceMemory?: number;
  };
  if (nav.connection?.saveData) return false;
  if (nav.connection?.effectiveType && /^(slow-)?2g$/.test(nav.connection.effectiveType)) return false;
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2) return false;
  if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 2) return false;

  return hasWebGL();
}
