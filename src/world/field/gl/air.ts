import * as THREE from 'three';

/**
 * The air the field worlds are seen through: one model for all five.
 *
 * Height fog — dense near the ground and thinning upward, so valleys and river surfaces hold their haze and summits
 * stand clear of it — and light scattered toward the eye by that fog: a cool, even part from the sky and a
 * directional part from the sun (Henyey–Greenstein), so the air glows when the camera looks toward a low sun and
 * stays clear looking away. The sky's horizon is the same colour the fog tends to at that bearing, so the ground
 * runs into the sky without a seam.
 *
 * Linear light throughout; the film (gl/look.ts) brings it to the screen. Every material that draws something in a
 * field world includes GLSL_AIR (after GLSL_FIELD_SUN) and ends with `applyAir(colour, worldPosition)`.
 */

export interface AirSettings {
  /** Fog density at its base height, per world unit. */
  density: number;
  /** How quickly it thins with height, per world unit. */
  falloff: number;
  /** The height the density is given for. */
  base: number;
  /** The fog's own colour: light scattered from the whole sky (linear). */
  colour: THREE.Vector3;
  /** How strongly the fog scatters the sun toward the eye. */
  mie: number;
  /** Forward-scatter anisotropy, 0 → 1. */
  g: number;
  /** The sky straight up (linear). */
  zenith: THREE.Vector3;
  /** Brightness of the sun's disc (linear; above the film's bloom threshold). */
  disc: number;
  /** The sun's angular radius, in radians. */
  discSize: number;
}

export function airUniforms(a: AirSettings) {
  return {
    uAirDensity: { value: a.density },
    uAirFalloff: { value: a.falloff },
    uAirBase: { value: a.base },
    uAirCol: { value: a.colour },
    uAirMie: { value: a.mie },
    uAirG: { value: a.g },
    uSkyZenith: { value: a.zenith },
    uSunDisc: { value: a.disc },
    uSunSize: { value: a.discSize },
  };
}

/** The sun every field shader is lit by: direction towards it, and its light (linear). */
export const GLSL_FIELD_SUN = /* glsl */ `
  uniform vec3 uSunDir;
  uniform vec3 uSunCol;
`;

export const GLSL_AIR = /* glsl */ `
  uniform float uAirDensity;
  uniform float uAirFalloff;
  uniform float uAirBase;
  uniform vec3 uAirCol;
  uniform float uAirMie;
  uniform float uAirG;
  uniform vec3 uSkyZenith;
  uniform float uSunDisc;
  uniform float uSunSize;
  float airPhase(float mu) {
    float g = uAirG;
    float k = 1.0 + g * g - 2.0 * g * mu;
    return (1.0 - g * g) / (k * sqrt(k));
  }
  // The colour the air tends to looking along dir: sky light plus the sun scattered forward.
  vec3 airGlow(vec3 dir) {
    return uAirCol + uSunCol * uAirMie * airPhase(dot(dir, uSunDir)) * 0.08;
  }
  // Optical depth of the height fog between the camera and p.
  float airDepth(vec3 p) {
    vec3 c = cameraPosition;
    float d = distance(p, c);
    float a = exp(-uAirFalloff * (c.y - uAirBase));
    float dy = p.y - c.y;
    float k = uAirFalloff * dy;
    float f = abs(k) > 1e-3 ? (1.0 - exp(-k)) / k : 1.0 - 0.5 * k;
    return uAirDensity * d * a * f;
  }
  float airTransmittance(vec3 p) { return exp(-airDepth(p)); }
  vec3 applyAir(vec3 col, vec3 p) {
    float t = airTransmittance(p);
    vec3 dir = normalize(p - cameraPosition);
    return col * t + airGlow(dir) * (1.0 - t);
  }
  // The sky along dir: the air's own glow at the horizon, the zenith above, the sun's disc.
  vec3 skyAlong(vec3 dir) {
    float y = max(dir.y, 0.0);
    vec3 col = mix(airGlow(normalize(vec3(dir.x, 0.0, dir.z) + vec3(0.0, 1e-4, 0.0))), uSkyZenith, smoothstep(0.0, 0.55, pow(y, 0.7)));
    float mu = dot(dir, uSunDir);
    float r = acos(clamp(mu, -1.0, 1.0));
    col += uSunCol * uSunDisc * (1.0 - smoothstep(uSunSize * 0.8, uSunSize * 1.2, r));
    // Below the horizon the sky is the ground's haze.
    return mix(airGlow(dir), col, smoothstep(-0.04, 0.01, dir.y));
  }
`;

/** A sky dome that draws `skyAlong`, plus whatever `extra` GLSL adds (clouds); `extra` sees `dir` and `col`. */
export function skyDome(radius: number, uniforms: Record<string, THREE.IUniform>, extra = '', pars = ''): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }
    `,
    fragmentShader: /* glsl */ `
      ${GLSL_FIELD_SUN}
      ${GLSL_AIR}
      ${pars}
      varying vec3 vDir;
      void main() {
        vec3 dir = normalize(vDir);
        vec3 col = skyAlong(dir);
        ${extra}
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), material);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return mesh;
}
