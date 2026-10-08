/**
 * GLSL the scenes share, as plain strings to paste into a shader.
 *
 * Deliberately few. Each chunk is here because the atlas's visual language
 * has a use for it — paper grain, ink edges, a material turning to the light —
 * and none of them is a look by itself: no chromatic split, no glow for its
 * own sake. A scene concatenates what it needs:
 *
 *   fragmentShader: `${GLSL_HASH}${GLSL_NOISE}${GLSL_DISSOLVE} … main() { … }`
 *
 * Every function is pure and cheap (no texture reads), so a chunk never
 * changes a scene's cost class. `GLSL_NOISE` depends on `GLSL_HASH`.
 */

/** `hash12(p)`: a stable 0 → 1 value per 2D cell. */
export const GLSL_HASH = /* glsl */ `
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
`;

/** `valueNoise(p)`: smooth 0 → 1 noise; `fbm3(p)`: three octaves of it. */
export const GLSL_NOISE = /* glsl */ `
  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
               mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm3(vec2 p) {
    return 0.5 * valueNoise(p) + 0.25 * valueNoise(p * 2.03) + 0.125 * valueNoise(p * 4.01);
  }
`;

/**
 * `paperGrain(fragCoord, amount)`: a static −amount → +amount offset per
 * screen pixel, the printed-sheet texture. Static on purpose: animated grain
 * reads as video noise, not paper.
 */
export const GLSL_GRAIN = /* glsl */ `
  float paperGrain(vec2 fragCoord, float amount) {
    return (hash12(floor(fragCoord)) - 0.5) * 2.0 * amount;
  }
`;

/**
 * `inkEdge(value, progress, softness)`: 0 → 1 coverage for a reveal that
 * advances through a field (noise, a distance, a luminance) the way ink runs
 * along paper fibres. `progress` 0 shows nothing, 1 everything.
 */
export const GLSL_DISSOLVE = /* glsl */ `
  float inkEdge(float value, float progress, float softness) {
    float p = progress * (1.0 + softness) - softness;
    return smoothstep(p, p + softness, 1.0 - value);
  }
`;

/** `fresnel(normal, viewDir, power)`: how much a surface turns away from the eye, 0 → 1. */
export const GLSL_FRESNEL = /* glsl */ `
  float fresnel(vec3 normal, vec3 viewDir, float power) {
    return pow(1.0 - clamp(dot(normalize(normal), normalize(viewDir)), 0.0, 1.0), power);
  }
`;
