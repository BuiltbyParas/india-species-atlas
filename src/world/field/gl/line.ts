import * as THREE from 'three';
import { rgb } from './color';

/**
 * GeoLine, in three dimensions.
 *
 * The atlas has one line (`geo/line/GeoLine.tsx`): drawn by a `draw` value
 * from 0 to 1, carrying a nib while it is being drawn, dashed when it is
 * schematic, a constant pixel weight at any scale. The field studies need the
 * same line laid across a desert, strung between pylons, run down a river and
 * around a map — in a 3D scene, under a moving camera. This is that line.
 *
 * It is a ribbon of two vertices per point, widened in screen space by the
 * vertex shader, so its weight is in screen pixels whatever the depth (the
 * SVG line's `--gl-w`). `draw` discards everything past the drawn length,
 * measured along the path; `dash` cuts it into the schematic's dashes; a
 * short bright head is the nib. Distance fades it into the world's haze.
 * One draw call per line, no per-frame CPU work: the camera moves, the
 * uniforms change, the geometry is built once.
 */
const VERTEX = /* glsl */ `
  attribute vec3 aPrev;
  attribute vec3 aNext;
  attribute float aSide;
  attribute float aT;
  uniform vec2 uResolution;
  uniform float uWidth;
  varying float vT;
  varying float vSide;
  varying float vDepth;
  vec2 screen(vec4 c) { return c.xy / c.w * uResolution * 0.5; }
  void main() {
    mat4 mvp = projectionMatrix * modelViewMatrix;
    vec4 c = mvp * vec4(position, 1.0);
    vec2 sp = screen(mvp * vec4(aPrev, 1.0));
    vec2 sn = screen(mvp * vec4(aNext, 1.0));
    vec2 d = sn - sp;
    if (dot(d, d) < 1e-6) d = vec2(1.0, 0.0);
    vec2 n = normalize(vec2(-d.y, d.x));
    c.xy += n * aSide * uWidth / uResolution * c.w;
    gl_Position = c;
    vT = aT;
    vSide = aSide;
    vDepth = -(modelViewMatrix * vec4(position, 1.0)).z;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uDraw;
  uniform float uStart;
  uniform float uDash;
  uniform float uDashCount;
  uniform float uNib;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;
  varying float vT;
  varying float vSide;
  varying float vDepth;
  void main() {
    if (vT > uDraw || vT < uStart) discard;
    if (uDash > 0.0 && fract(vT * uDashCount) > uDash) discard;
    float edge = 1.0 - smoothstep(0.35, 1.0, abs(vSide));
    // The nib: the last stretch of a line still being drawn burns a little brighter.
    float head = uNib * smoothstep(uDraw - 0.012, uDraw, vT) * step(uDraw, 0.999);
    float fog = smoothstep(uFogNear, uFogFar, vDepth);
    vec3 col = mix(uColor + head * 0.35, uFogColor, fog * 0.85);
    gl_FragColor = vec4(col, uOpacity * edge * (1.0 - fog * 0.6));
  }
`;

export interface GeoLine3D {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  /** World length of the path, for spacing things along it. */
  length: number;
  /** A point at `t` (0 → 1, by length) along the path. */
  at: (t: number, out?: THREE.Vector3) => THREE.Vector3;
  dispose: () => void;
}

export interface LineOptions {
  /** Screen pixels (multiplied by the device pixel ratio by the stage). */
  width?: number;
  color: string;
  opacity?: number;
  /** Schematic dashes: the share of each dash period that is drawn (0 = solid). */
  dash?: number;
  /** How many dash periods along the whole line. */
  dashCount?: number;
  /** Brighten the drawing end, 0 → 1. */
  nib?: number;
  fog?: { color: string; near: number; far: number };
}

export function makeLine(points: THREE.Vector3[], o: LineOptions): GeoLine3D {
  const n = points.length;
  const lengths = new Float32Array(n);
  let total = 0;
  for (let i = 1; i < n; i++) {
    total += points[i].distanceTo(points[i - 1]);
    lengths[i] = total;
  }
  const pos = new Float32Array(n * 6);
  const prev = new Float32Array(n * 6);
  const next = new Float32Array(n * 6);
  const side = new Float32Array(n * 2);
  const ts = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(n - 1, i + 1)];
    for (let s = 0; s < 2; s++) {
      const k = (i * 2 + s) * 3;
      pos.set([p.x, p.y, p.z], k);
      prev.set([a.x, a.y, a.z], k);
      next.set([b.x, b.y, b.z], k);
      side[i * 2 + s] = s === 0 ? -1 : 1;
      ts[i * 2 + s] = total > 0 ? lengths[i] / total : 0;
    }
  }
  const index: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2;
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('aPrev', new THREE.BufferAttribute(prev, 3));
  geometry.setAttribute('aNext', new THREE.BufferAttribute(next, 3));
  geometry.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
  geometry.setAttribute('aT', new THREE.BufferAttribute(ts, 1));
  geometry.setIndex(index);
  geometry.computeBoundingSphere();

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uWidth: { value: o.width ?? 1.4 },
      uColor: { value: rgb(o.color) },
      uOpacity: { value: o.opacity ?? 1 },
      uDraw: { value: 1 },
      uStart: { value: 0 },
      uDash: { value: o.dash ?? 0 },
      uDashCount: { value: o.dashCount ?? 60 },
      uNib: { value: o.nib ?? 1 },
      uFogColor: { value: rgb(o.fog?.color ?? '#000000') },
      uFogNear: { value: o.fog?.near ?? 1e5 },
      uFogFar: { value: o.fog?.far ?? 2e5 },
    },
    transparent: true,
    depthWrite: false,
    // The ribbon turns over as the path turns away from the camera: draw both faces.
    side: THREE.DoubleSide,
  });
  material.userData.lineWidth = o.width ?? 1.4;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;

  const at = (t: number, out = new THREE.Vector3()) => {
    const target = Math.min(1, Math.max(0, t)) * total;
    let i = 1;
    while (i < n - 1 && lengths[i] < target) i++;
    const seg = lengths[i] - lengths[i - 1] || 1;
    return out.lerpVectors(points[i - 1], points[i], (target - lengths[i - 1]) / seg);
  };

  return {
    mesh,
    material,
    length: total,
    at,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}

/** Keep every line in a scene at its pixel weight after a resize (the stage calls this). */
export function sizeLines(root: THREE.Object3D, width: number, height: number, dpr: number) {
  root.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.ShaderMaterial | undefined;
    if (!m || !m.uniforms?.uResolution || m.userData.lineWidth === undefined) return;
    m.uniforms.uResolution.value.set(width * dpr, height * dpr);
    m.uniforms.uWidth.value = m.userData.lineWidth * dpr;
  });
}

/** A smooth curve through control points, sampled evenly (centripetal Catmull–Rom). */
export function curve(points: THREE.Vector3[], samples: number, closed = false): THREE.Vector3[] {
  const c = new THREE.CatmullRomCurve3(points, closed, 'centripetal');
  return c.getSpacedPoints(samples);
}
