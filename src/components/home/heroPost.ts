/**
 * Post-processing for the hero scene.
 *
 * Hand-rolled rather than assembled from three's `EffectComposer`, for two
 * reasons. First, depth: the composer ping-pongs between two render targets
 * whose `clone()` gives each its *own* depth texture, so there is no reliable
 * way to know which one holds the depth the focus pass needs. Rendering the
 * scene into one target we own sidesteps that entirely. Second, cost: this
 * chain is four small draws (bright-pass and two blur pairs at quarter
 * resolution, then one full-resolution composite) against `UnrealBloomPass`'s
 * five mip levels, and the composite folds depth-of-field, bloom, vignette,
 * colour grade and tone mapping into a single pass.
 *
 * The scene target is half-float so marker colours can exceed 1.0 and the
 * bright-pass can threshold just below it — that is what makes the bloom
 * *selective*, picking up the species markers while leaving the terrain,
 * which is nowhere near that bright, completely untouched.
 */
import * as THREE from 'three';

/** Bloom is computed at a quarter of the canvas resolution in each axis. */
const BLOOM_DIVISOR = 4;

const QUAD_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/**
 * Isolates pixels brighter than the threshold. Uses the max channel rather
 * than luminance so a saturated red marker blooms as strongly as a yellow one
 * — Critically Endangered is exactly the category that has to glow hardest,
 * and its red has barely half the luminance of the Vulnerable yellow.
 */
const BRIGHT_FRAGMENT = /* glsl */ `
  uniform sampler2D tScene;
  uniform vec2 uTexel;
  uniform float uThreshold;
  uniform float uKnee;
  varying vec2 vUv;
  void main() {
    vec3 c = texture2D(tScene, vUv + vec2(-uTexel.x, -uTexel.y)).rgb;
    c += texture2D(tScene, vUv + vec2(uTexel.x, -uTexel.y)).rgb;
    c += texture2D(tScene, vUv + vec2(-uTexel.x, uTexel.y)).rgb;
    c += texture2D(tScene, vUv + vec2(uTexel.x, uTexel.y)).rgb;
    c *= 0.25;
    float level = max(c.r, max(c.g, c.b));
    gl_FragColor = vec4(c * smoothstep(uThreshold, uThreshold + uKnee, level), 1.0);
  }
`;

/** Separable 9-tap gaussian, five samples wide using linear filtering. */
const BLUR_FRAGMENT = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uDirection;
  varying vec2 vUv;
  void main() {
    vec3 sum = texture2D(tDiffuse, vUv).rgb * 0.2270270270;
    sum += texture2D(tDiffuse, vUv + uDirection * 1.3846153846).rgb * 0.3162162162;
    sum += texture2D(tDiffuse, vUv - uDirection * 1.3846153846).rgb * 0.3162162162;
    sum += texture2D(tDiffuse, vUv + uDirection * 3.2307692308).rgb * 0.0702702703;
    sum += texture2D(tDiffuse, vUv - uDirection * 3.2307692308).rgb * 0.0702702703;
    gl_FragColor = vec4(sum, 1.0);
  }
`;

const COMPOSITE_FRAGMENT = /* glsl */ `
  uniform sampler2D tScene;
  uniform sampler2D tBloom;
  uniform sampler2D tDepth;
  uniform float uNear;
  uniform float uFar;
  uniform float uFocus;
  uniform float uFocusRange;
  uniform float uMaxCoc;
  uniform float uBloom;
  uniform float uVignette;
  uniform vec3 uTint;
  uniform float uSaturation;
  uniform float uContrast;
  uniform float uLift;
  varying vec2 vUv;

  #ifdef USE_DOF
  float viewDistance(vec2 uv) {
    float depth = texture2D(tDepth, uv).x;
    float viewZ = (uNear * uFar) / ((uFar - uNear) * depth - uFar);
    return -viewZ;
  }
  #endif

  void main() {
    vec3 color = texture2D(tScene, vUv).rgb;

    #ifdef USE_DOF
      // Circle of confusion grows with distance from the focal plane, which
      // tracks whatever the camera is looking at as it descends.
      float coc = clamp(abs(viewDistance(vUv) - uFocus) / uFocusRange, 0.0, 1.0);
      coc = coc * coc * uMaxCoc;
      vec3 blurred = color;
      for (int i = 0; i < 6; i++) {
        float a = float(i) * 1.0471975512;
        blurred += texture2D(tScene, vUv + vec2(cos(a), sin(a)) * coc).rgb;
      }
      color = blurred / 7.0;
    #endif

    color += texture2D(tBloom, vUv).rgb * uBloom;

    // Atmospheric grade. Saturation and tint travel with the journey: cool and
    // desaturated out in the dark, warmer and fuller as the camera descends.
    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = mix(vec3(luma), color, uSaturation);
    color *= uTint;
    color = (color - 0.5) * uContrast + 0.5 + uLift;
    color = max(color, vec3(0.0));

    vec2 q = vUv - 0.5;
    color *= 1.0 - uVignette * smoothstep(0.18, 0.80, dot(q, q) * 2.2);

    // ACES filmic approximation, then linear -> sRGB. Done here rather than by
    // three, because the composite draws straight to the default framebuffer.
    color = (color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14);
    gl_FragColor = vec4(pow(clamp(color, 0.0, 1.0), vec3(0.4545454545)), 1.0);
  }
`;

export interface PostUniforms {
  focus: number;
  focusRange: number;
  maxCoc: number;
  bloom: number;
  vignette: number;
  tint: THREE.Color;
  saturation: number;
  contrast: number;
  lift: number;
}

/** 0 = everything, 1 = no depth of field, 2 = no bloom either. */
export type PostQuality = 0 | 1 | 2;

export interface PostChain {
  render: (scene: THREE.Scene, camera: THREE.PerspectiveCamera) => void;
  setSize: (width: number, height: number, pixelRatio: number) => void;
  apply: (uniforms: PostUniforms) => void;
  setQuality: (quality: PostQuality) => void;
  /** Compiles every shader variant up front, so none stalls mid-scroll. */
  warmUp: () => void;
  dispose: () => void;
}

/**
 * Returns null when the device cannot give us a half-float target, in which
 * case the caller renders the scene directly with no post at all.
 */
export function createPostChain(renderer: THREE.WebGLRenderer, samples: number): PostChain | null {
  const gl = renderer.getContext();
  const isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
  if (!isWebGL2 && !renderer.extensions.has('EXT_color_buffer_half_float')) return null;

  const depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
  const sceneTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    depthBuffer: true,
    depthTexture,
    samples,
  });
  sceneTarget.texture.minFilter = THREE.LinearFilter;
  sceneTarget.texture.magFilter = THREE.LinearFilter;

  const bloomOptions = { type: THREE.HalfFloatType, depthBuffer: false, stencilBuffer: false };
  const bloomA = new THREE.WebGLRenderTarget(1, 1, bloomOptions);
  const bloomB = new THREE.WebGLRenderTarget(1, 1, bloomOptions);

  const brightMaterial = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERTEX,
    fragmentShader: BRIGHT_FRAGMENT,
    uniforms: {
      tScene: { value: sceneTarget.texture },
      uTexel: { value: new THREE.Vector2() },
      uThreshold: { value: 0.85 },
      uKnee: { value: 0.5 },
    },
    depthTest: false,
    depthWrite: false,
  });

  const blurMaterial = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERTEX,
    fragmentShader: BLUR_FRAGMENT,
    uniforms: {
      tDiffuse: { value: null },
      uDirection: { value: new THREE.Vector2() },
    },
    depthTest: false,
    depthWrite: false,
  });

  const compositeUniforms = {
      tScene: { value: sceneTarget.texture },
      tBloom: { value: bloomA.texture },
      tDepth: { value: depthTexture },
      uNear: { value: 0.5 },
      uFar: { value: 120 },
      uFocus: { value: 10 },
      uFocusRange: { value: 30 },
      uMaxCoc: { value: 0.004 },
      uBloom: { value: 1 },
      uVignette: { value: 0.5 },
      uTint: { value: new THREE.Color(1, 1, 1) },
      uSaturation: { value: 1 },
      uContrast: { value: 1 },
      uLift: { value: 0 },
  };

  // Two materials sharing one uniform block, rather than one material whose
  // defines change. Toggling a define forces a shader relink, and a relink
  // mid-scroll is a visible stall — several hundred milliseconds even on a
  // warm machine, and far worse under software rendering. Both are compiled
  // during setup instead, so stepping quality down is a pointer swap.
  const makeComposite = (withDof: boolean) =>
    new THREE.ShaderMaterial({
      vertexShader: QUAD_VERTEX,
      fragmentShader: COMPOSITE_FRAGMENT,
      defines: withDof ? { USE_DOF: '' } : {},
      uniforms: compositeUniforms,
      depthTest: false,
      depthWrite: false,
    });
  const compositeWithDof = makeComposite(true);
  const compositeNoDof = makeComposite(false);
  let compositeMaterial = compositeWithDof;

  // One quad, three materials swapped through it.
  const quadGeometry = new THREE.PlaneGeometry(2, 2);
  const quad = new THREE.Mesh(quadGeometry, brightMaterial);
  quad.frustumCulled = false;
  const quadScene = new THREE.Scene();
  quadScene.add(quad);
  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  let quality: PostQuality = 0;
  let bloomTexel = new THREE.Vector2();

  function drawQuad(material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) {
    quad.material = material;
    renderer.setRenderTarget(target);
    renderer.render(quadScene, quadCamera);
  }

  function blur(from: THREE.WebGLRenderTarget, to: THREE.WebGLRenderTarget, x: number, y: number) {
    blurMaterial.uniforms.tDiffuse.value = from.texture;
    blurMaterial.uniforms.uDirection.value.set(x, y);
    drawQuad(blurMaterial, to);
  }

  return {
    render(scene, camera) {
      const previousTarget = renderer.getRenderTarget();
      renderer.setRenderTarget(sceneTarget);
      renderer.clear();
      renderer.render(scene, camera);

      if (quality < 2) {
        drawQuad(brightMaterial, bloomA);
        // Two blur pairs: a tight pass for the core, a wider one for the haze.
        blur(bloomA, bloomB, bloomTexel.x, 0);
        blur(bloomB, bloomA, 0, bloomTexel.y);
        blur(bloomA, bloomB, bloomTexel.x * 2.4, 0);
        blur(bloomB, bloomA, 0, bloomTexel.y * 2.4);
      }

      drawQuad(compositeMaterial, null);
      renderer.setRenderTarget(previousTarget);
    },

    setSize(width, height, pixelRatio) {
      const w = Math.max(1, Math.round(width * pixelRatio));
      const h = Math.max(1, Math.round(height * pixelRatio));
      sceneTarget.setSize(w, h);
      const bw = Math.max(1, Math.floor(w / BLOOM_DIVISOR));
      const bh = Math.max(1, Math.floor(h / BLOOM_DIVISOR));
      bloomA.setSize(bw, bh);
      bloomB.setSize(bw, bh);
      brightMaterial.uniforms.uTexel.value.set(1 / w, 1 / h);
      bloomTexel = new THREE.Vector2(1 / bw, 1 / bh);
    },

    apply(u) {
      const c = compositeUniforms;
      c.uFocus.value = u.focus;
      c.uFocusRange.value = u.focusRange;
      c.uMaxCoc.value = u.maxCoc;
      c.uBloom.value = quality < 2 ? u.bloom : 0;
      c.uVignette.value = u.vignette;
      c.uTint.value.copy(u.tint);
      c.uSaturation.value = u.saturation;
      c.uContrast.value = u.contrast;
      c.uLift.value = u.lift;
    },

    setQuality(next) {
      if (next === quality) return;
      quality = next;
      // Depth of field lives in a define, so the no-DoF variant genuinely has
      // the six taps removed rather than scaled to zero.
      compositeMaterial = quality === 0 ? compositeWithDof : compositeNoDof;
    },

    /**
     * Draws one throwaway frame through every material so the GPU driver does
     * its compiling during setup instead of partway down the page.
     */
    warmUp() {
      const tiny = new THREE.WebGLRenderTarget(1, 1);
      drawQuad(brightMaterial, tiny);
      blur(bloomA, tiny, 0, 0);
      drawQuad(compositeWithDof, tiny);
      drawQuad(compositeNoDof, tiny);
      renderer.setRenderTarget(null);
      tiny.dispose();
    },

    dispose() {
      sceneTarget.dispose();
      depthTexture.dispose();
      bloomA.dispose();
      bloomB.dispose();
      quadGeometry.dispose();
      brightMaterial.dispose();
      blurMaterial.dispose();
      compositeWithDof.dispose();
      compositeNoDof.dispose();
    },
  };
}
