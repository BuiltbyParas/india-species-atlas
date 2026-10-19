import * as THREE from 'three';
import { loadIndiaGeoJson, project } from '../../../geo/india';
import { ringsOf } from '../../../utils/geoExtrude';
import { GEOJSON_STATE_ALIASES } from '../../../utils/stateCounts';
import { rgb } from './color';

/**
 * India's state boundaries, laid on a world's ground as hairlines.
 *
 * Three studies turn their world into the atlas's map at some moment — the
 * river's localities, the tiger's reserves, the rhinoceros's sites — and they
 * need the same sheet the flat maps draw, in the same projection
 * (`geo/india.ts`), placed on their own ground plane. `MapFrame` maps sheet
 * units onto the plane; every point the world places (a locality, a reserve)
 * goes through the same frame, so marks and boundaries always agree.
 */
export interface MapFrame {
  /** Sheet units → plane (x, z). */
  toPlane: (lng: number, lat: number) => [number, number];
  scale: number;
}

/** A frame that fits these places into `span` plane units, centred on the origin. */
export function frameAround(points: Array<{ lng: number; lat: number }>, span: number, pad = 0.18): MapFrame {
  const xy = points.map((p) => project(p.lng, p.lat));
  const xs = xy.map((p) => p[0]);
  const ys = xy.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const size = Math.max(maxX - minX, maxY - minY, 40) * (1 + pad * 2);
  const scale = span / size;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return {
    scale,
    toPlane: (lng, lat) => {
      const [x, y] = project(lng, lat);
      return [(x - cx) * scale, (y - cy) * scale];
    },
  };
}

const VERTEX = /* glsl */ `
  attribute float aOn;
  varying float vOn;
  void main() {
    vOn = aOn;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uRecorded;
  uniform float uOpacity;
  varying float vOn;
  void main() {
    gl_FragColor = vec4(mix(uColor, uRecorded, vOn), uOpacity * mix(0.4, 1.0, vOn));
  }
`;

export interface MapLines {
  lines: THREE.LineSegments;
  material: THREE.ShaderMaterial;
  dispose: () => void;
}

/**
 * Build the boundaries (async: the boundary file is shared and fetched once).
 * States in `recorded` (the species' states of record) are drawn in `recordedColor`.
 */
export async function makeMapLines(
  frame: MapFrame,
  y: number,
  o: { color: string; recordedColor: string; recorded: string[]; within?: number },
): Promise<MapLines | null> {
  let geo;
  try {
    geo = await loadIndiaGeoJson();
  } catch {
    return null;
  }
  const recorded = new Set(o.recorded.map((s) => GEOJSON_STATE_ALIASES[s] ?? s));
  const pos: number[] = [];
  const on: number[] = [];
  const limit = o.within ?? Infinity;
  for (const f of geo.features) {
    const name = String(f.properties?.state ?? '');
    const flag = recorded.has(name) ? 1 : 0;
    for (const polygon of ringsOf(f)) {
      for (const ring of polygon) {
        let prev: [number, number] | null = null;
        for (let i = 0; i < ring.length; i += 2) {
          const [lng, lat] = ring[i];
          const p = frame.toPlane(lng, lat);
          if (prev && Math.abs(p[0]) < limit && Math.abs(p[1]) < limit) {
            pos.push(prev[0], y, prev[1], p[0], y, p[1]);
            on.push(flag, flag);
          }
          prev = p;
        }
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute('aOn', new THREE.Float32BufferAttribute(on, 1));
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: { uColor: { value: rgb(o.color) }, uRecorded: { value: rgb(o.recordedColor) }, uOpacity: { value: 0 } },
    transparent: true,
    depthWrite: false,
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.frustumCulled = false;
  return {
    lines,
    material,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}

/** Rings at places: one sprite each, sized in pixels, for localities, reserves and sites. */
export function makeRings(points: Array<[number, number, number]>, color: string): { points: THREE.Points; material: THREE.ShaderMaterial } {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
  geometry.setAttribute('aI', new THREE.Float32BufferAttribute(points.map((_, i) => i), 1));
  const material = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      attribute float aI;
      uniform float uPixelRatio;
      uniform float uSize;
      uniform float uFocus;
      varying float vFocus;
      void main() {
        vFocus = 1.0 - smoothstep(0.0, 0.6, abs(aI - uFocus));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = uSize * uPixelRatio * (1.0 + vFocus * 0.6);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vFocus;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float ring = 1.0 - smoothstep(0.0, 0.12, abs(d - 0.78));
        float core = 1.0 - smoothstep(0.18, 0.3, d);
        float a = max(ring, core);
        if (a < 0.01) discard;
        gl_FragColor = vec4(uColor, a * uOpacity * (0.65 + 0.35 * vFocus));
      }
    `,
    uniforms: {
      uPixelRatio: { value: 1 },
      uSize: { value: 22 },
      uFocus: { value: -10 },
      uColor: { value: rgb(color) },
      uOpacity: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const pts = new THREE.Points(geometry, material);
  pts.frustumCulled = false;
  pts.renderOrder = 5;
  return { points: pts, material };
}
