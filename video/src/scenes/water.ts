import * as THREE from 'three';
import type { Scene } from '../engine/film';
import { clamp01, easeInOutCubic, seg } from '../engine/ease';

/**
 * S09 — the river. A silt-laden surface flowing toward camera under a pale
 * sky; the camera tilts to look straight down, the current's streaks gather
 * into one line, and the next shot picks that line up as the Ganga.
 * A full-frame shader, drawn for the film (illustrative); a footage slot.
 */

const material = new THREE.ShaderMaterial({
  uniforms: { uT: { value: 0 }, uTilt: { value: 0 }, uLine: { value: 0 }, uAspect: { value: 16 / 9 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform float uT;
    uniform float uTilt;
    uniform float uLine;
    uniform float uAspect;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
      return v;
    }
    void main() {
      // Screen to water plane: perspective toward a horizon above frame,
      // flattening to an even top-down view as the camera tilts.
      float y = vUv.y;
      float depth = mix(1.0 / max(0.08, 1.32 - y), 1.6, uTilt);
      vec2 p = vec2((vUv.x - 0.5) * uAspect * depth, depth * 2.2);
      // Flow toward camera (down screen): the plane scrolls away from it.
      vec2 q = p * vec2(2.2, 1.1) + vec2(0.0, uT * 0.9);
      vec2 warp = vec2(fbm(q * 0.8 + uT * 0.05), fbm(q * 0.8 + 5.2));
      float h = fbm(q * 1.6 + warp * 1.4);
      float hx = fbm(q * 1.6 + warp * 1.4 + vec2(0.02, 0.0)) - h;
      float hy = fbm(q * 1.6 + warp * 1.4 + vec2(0.0, 0.02)) - h;
      vec3 n = normalize(vec3(-hx * 18.0, 1.0, -hy * 18.0));
      // Silt: grey-ochre water, the Ganga's colour in the dry months.
      vec3 silt = vec3(0.34, 0.33, 0.27);
      vec3 sky = vec3(0.78, 0.8, 0.78);
      vec3 view = normalize(vec3(0.0, mix(0.35, 1.0, uTilt), -1.0 + uTilt));
      float fres = pow(1.0 - max(dot(n, view), 0.0), 3.0);
      vec3 col = mix(silt * (0.75 + 0.35 * n.y), sky, clamp(fres * 0.9 + 0.08, 0.0, 0.85));
      // Glints from a low, hazy sun ahead.
      vec3 sunDir = normalize(vec3(0.2, 0.35, -1.0));
      float spec = pow(max(dot(reflect(-sunDir, n), view), 0.0), 60.0);
      col += vec3(1.0, 0.94, 0.82) * spec * 1.4 * (1.0 - uTilt * 0.7);
      // Current streaks: long, thin, aligned with the flow.
      float streak = smoothstep(0.62, 0.9, fbm(vec2(p.x * 9.0 + warp.x * 2.0, q.y * 0.35)));
      col = mix(col, vec3(0.86, 0.84, 0.78), streak * 0.18 * (1.0 - uTilt));
      // Distance haze near the top of frame.
      col = mix(col, vec3(0.72, 0.74, 0.72), smoothstep(0.55, 1.0, y) * (1.0 - uTilt) * 0.6);
      // Gathering into one line: the water darkens to the map's ground and a
      // single meander remains.
      float cx = 0.5 + 0.06 * sin(vUv.y * 5.0 + 0.6) + 0.025 * sin(vUv.y * 13.0);
      float d = abs(vUv.x - cx) * uAspect;
      float line = smoothstep(0.006, 0.0, d) + 0.25 * smoothstep(0.03, 0.0, d);
      col = mix(col, vec3(0.055, 0.078, 0.067), uLine * 0.92);
      col = mix(col, vec3(0.56, 0.72, 0.8), clamp(line, 0.0, 1.0) * uLine);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
});

export const water: Scene = (f) => {
  const { ctx, t, u, W, H } = f;
  material.uniforms.uT.value = u;
  material.uniforms.uTilt.value = easeInOutCubic(seg(t, 28.4, 29.3));
  material.uniforms.uLine.value = easeInOutCubic(seg(t, 28.9, 29.5));
  const c = f.film.terrain.renderQuad(material);
  ctx.drawImage(c, 0, 0, W, H);
  // Slight vignette to sit with the photographs either side.
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, `rgba(0,0,0,${0.45 * (1 - clamp01((t - 28.9) / 0.6))})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
};
