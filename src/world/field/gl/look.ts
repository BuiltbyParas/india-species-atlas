import * as THREE from 'three';

/**
 * The field studies' film: how a world's light becomes a picture.
 *
 * The homepage's relief is rendered into a half-float target and finished by one composite (exposure ahead of an
 * ACES curve, a grade, a vignette, bloom on what is brighter than white). The field worlds now use the same curve,
 * so a sunlit snowfield, a glint on a river and the lamp on the homepage relief roll off into white the same way and
 * the five habitats read as one camera's work rather than five palettes.
 *
 * A world opts in by carrying a `grade`; it then writes linear light (lin() in gl/color.ts) into this chain's
 * target, values above 1 allowed for the sun and its glints. Worlds without a grade still draw straight to the screen.
 *
 * Cost: one multisampled half-float target at the canvas size, four quarter-resolution blur draws when bloom is on,
 * one full-screen composite. Stepping down (`setRung`) halves the multisampling (two samples become none), then
 * drops it and the bloom. Multisampling is the largest part on an integrated GPU (about 3 ms at 1440 × 900, two samples).
 */

export interface Grade {
  /** Linear exposure ahead of the tone curve. */
  exposure: number;
  /** White balance: a linear multiplier. */
  tint: THREE.Vector3;
  saturation: number;
  /** Contrast about middle grey, after the curve. */
  contrast: number;
  /** Split tone: added to the shadows and multiplied into the highlights, after the curve. */
  shadows: THREE.Vector3;
  highlights: THREE.Vector3;
  vignette: number;
  /** Strength of the glow around what is brighter than `threshold` (linear, before exposure). */
  bloom: number;
  threshold: number;
}

export function grade(g: Partial<Grade> = {}): Grade {
  return {
    exposure: 1,
    tint: new THREE.Vector3(1, 1, 1),
    saturation: 1,
    contrast: 1,
    shadows: new THREE.Vector3(0, 0, 0),
    highlights: new THREE.Vector3(1, 1, 1),
    vignette: 0.35,
    bloom: 0.5,
    threshold: 1.6,
    ...g,
  };
}

const QUAD_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const BRIGHT_FRAGMENT = /* glsl */ `
  uniform sampler2D tScene;
  uniform vec2 uTexel;
  uniform float uThreshold;
  varying vec2 vUv;
  void main() {
    vec3 c = texture2D(tScene, vUv + vec2(-uTexel.x, -uTexel.y)).rgb;
    c += texture2D(tScene, vUv + vec2(uTexel.x, -uTexel.y)).rgb;
    c += texture2D(tScene, vUv + vec2(-uTexel.x, uTexel.y)).rgb;
    c += texture2D(tScene, vUv + vec2(uTexel.x, uTexel.y)).rgb;
    c *= 0.25;
    // A pixel that is not a number must not spread through the blur.
    if (any(isnan(c)) || any(isinf(c))) c = vec3(0.0);
    float level = max(c.r, max(c.g, c.b));
    // A soft knee: what is a little over the threshold glows a little.
    float k = clamp((level - uThreshold) / max(uThreshold, 1e-3), 0.0, 1.0);
    gl_FragColor = vec4(c * k * k, 1.0);
  }
`;

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
  uniform sampler2D tVolume;
  uniform float uVolume;
  uniform float uBloom;
  uniform float uExposure;
  uniform vec3 uTint;
  uniform float uSaturation;
  uniform float uContrast;
  uniform vec3 uShadows;
  uniform vec3 uHighlights;
  uniform float uVignette;
  uniform float uAspect;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    vec3 color = texture2D(tScene, vUv).rgb;
    if (any(isnan(color)) || any(isinf(color))) color = vec3(0.0);
    color += texture2D(tBloom, vUv).rgb * uBloom;
    // Light scattered in the air between the eye and the surface (a world's shafts), worked out at a quarter size.
    if (uVolume > 0.5) color += texture2D(tVolume, vUv).rgb;
    color *= uExposure * uTint;
    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = mix(vec3(luma), color, uSaturation);
    color = max(color, vec3(0.0));
    // The homepage's curve: ACES (Narkowicz), then to the screen's sRGB.
    color = (color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14);
    color = pow(clamp(color, 0.0, 1.0), vec3(0.4545454545));
    // Grade in display space, where the eye judges it.
    float l = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color += uShadows * (1.0 - smoothstep(0.0, 0.5, l));
    color *= mix(vec3(1.0), uHighlights, smoothstep(0.45, 1.0, l));
    color = (color - 0.5) * uContrast + 0.5;
    vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0) / max(uAspect, 1.0);
    color *= 1.0 - uVignette * smoothstep(0.12, 0.62, dot(q, q) * 2.0);
    // Dither: dark skies band without it.
    color += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  }
`;

export class FieldLook {
  private scene: THREE.WebGLRenderTarget;
  private readonly bloomA: THREE.WebGLRenderTarget;
  private readonly bloomB: THREE.WebGLRenderTarget;
  private readonly volumeTarget: THREE.WebGLRenderTarget;
  private readonly volumeBlur: THREE.WebGLRenderTarget;
  private readonly invProj = new THREE.Matrix4();
  private readonly bright: THREE.ShaderMaterial;
  private readonly blur: THREE.ShaderMaterial;
  private readonly composite: THREE.ShaderMaterial;
  private readonly quad: THREE.Mesh;
  private readonly quadScene = new THREE.Scene();
  private readonly quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private samples: number;
  private bloomOn = true;
  private texel = new THREE.Vector2();
  private bloomTexel = new THREE.Vector2();

  private readonly renderer: THREE.WebGLRenderer;
  private readonly fullSamples: number;

  constructor(renderer: THREE.WebGLRenderer, fullSamples: number) {
    this.renderer = renderer;
    this.fullSamples = fullSamples;
    this.samples = fullSamples;
    this.scene = this.makeSceneTarget(1, 1);
    const bloomOptions = { type: THREE.HalfFloatType, depthBuffer: false, stencilBuffer: false } as const;
    this.bloomA = new THREE.WebGLRenderTarget(1, 1, bloomOptions);
    this.bloomB = new THREE.WebGLRenderTarget(1, 1, bloomOptions);
    this.volumeTarget = new THREE.WebGLRenderTarget(1, 1, bloomOptions);
    this.volumeBlur = new THREE.WebGLRenderTarget(1, 1, bloomOptions);
    const flat = { depthTest: false, depthWrite: false } as const;
    this.bright = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERTEX,
      fragmentShader: BRIGHT_FRAGMENT,
      uniforms: { tScene: { value: this.scene.texture }, uTexel: { value: this.texel }, uThreshold: { value: 1.6 } },
      ...flat,
    });
    this.blur = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERTEX,
      fragmentShader: BLUR_FRAGMENT,
      uniforms: { tDiffuse: { value: null }, uDirection: { value: new THREE.Vector2() } },
      ...flat,
    });
    this.composite = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERTEX,
      fragmentShader: COMPOSITE_FRAGMENT,
      uniforms: {
        tScene: { value: this.scene.texture },
        tBloom: { value: this.bloomA.texture },
        tVolume: { value: this.volumeTarget.texture },
        uVolume: { value: 0 },
        uBloom: { value: 0.5 },
        uExposure: { value: 1 },
        uTint: { value: new THREE.Vector3(1, 1, 1) },
        uSaturation: { value: 1 },
        uContrast: { value: 1 },
        uShadows: { value: new THREE.Vector3() },
        uHighlights: { value: new THREE.Vector3(1, 1, 1) },
        uVignette: { value: 0.35 },
        uAspect: { value: 1 },
      },
      ...flat,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.bright);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
  }

  private makeSceneTarget(w: number, h: number) {
    const t = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType,
      depthBuffer: true,
      depthTexture: new THREE.DepthTexture(w, h, THREE.UnsignedIntType),
      samples: this.samples,
    });
    t.texture.minFilter = THREE.LinearFilter;
    t.texture.magFilter = THREE.LinearFilter;
    return t;
  }

  setSize(width: number, height: number) {
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    if (this.scene.width !== w || this.scene.height !== h) this.scene.setSize(w, h);
    const bw = Math.max(1, Math.floor(w / 4));
    const bh = Math.max(1, Math.floor(h / 4));
    this.bloomA.setSize(bw, bh);
    this.bloomB.setSize(bw, bh);
    this.volumeTarget.setSize(Math.max(1, Math.floor(w / 2)), Math.max(1, Math.floor(h / 2)));
    this.volumeBlur.setSize(this.volumeTarget.width, this.volumeTarget.height);
    this.texel.set(1 / w, 1 / h);
    this.bloomTexel.set(1 / bw, 1 / bh);
    this.composite.uniforms.uAspect.value = w / h;
  }

  /** 0: full; 1: half the samples (none where there were two); 2: no multisampling and no bloom. */
  setRung(rung: number) {
    const samples = rung >= 2 ? 0 : rung >= 1 ? (this.fullSamples > 2 ? 2 : 0) : this.fullSamples;
    this.bloomOn = rung < 2;
    if (samples === this.samples) return;
    this.samples = samples;
    const { width, height } = this.scene;
    this.scene.depthTexture?.dispose();
    this.scene.dispose();
    this.scene = this.makeSceneTarget(width, height);
    this.bright.uniforms.tScene.value = this.scene.texture;
    this.composite.uniforms.tScene.value = this.scene.texture;
  }

  private draw(material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.quadScene, this.quadCamera);
  }

  private pass(from: THREE.WebGLRenderTarget, to: THREE.WebGLRenderTarget, x: number, y: number) {
    this.blur.uniforms.tDiffuse.value = from.texture;
    this.blur.uniforms.uDirection.value.set(x, y);
    this.draw(this.blur, to);
  }

  /**
   * Render `scene` through the film into `target` (null: the screen). A world that scatters light in its air
   * passes `volume`: a material drawn over the frame at half its size and blurred once, given the scene's depth (`tDepth`),
   * the camera (`uInvProj`, `uCamWorld`, `uCamPos`) and the near/far planes, whose output is added before the curve.
   */
  render(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    g: Grade,
    clear: THREE.ColorRepresentation,
    target: THREE.WebGLRenderTarget | null,
    volume?: THREE.ShaderMaterial | null,
  ) {
    const r = this.renderer;
    r.setRenderTarget(this.scene);
    r.setClearColor(clear, 1);
    r.clear();
    r.render(scene, camera);

    if (volume) {
      const u = volume.uniforms;
      u.tDepth.value = this.scene.depthTexture;
      u.uInvProj.value.copy(this.invProj.copy(camera.projectionMatrix).invert());
      u.uCamWorld.value.copy(camera.matrixWorld);
      u.uCamPos.value.setFromMatrixPosition(camera.matrixWorld);
      u.uSize.value.set(this.volumeTarget.width, this.volumeTarget.height);
      this.draw(volume, this.volumeTarget);
      // One soft blur: the march is jittered per pixel and runs at half size, so a silhouette against lit air
      // would otherwise show its steps and its noise.
      const vx = 1 / this.volumeTarget.width;
      const vy = 1 / this.volumeTarget.height;
      this.pass(this.volumeTarget, this.volumeBlur, vx, 0);
      this.pass(this.volumeBlur, this.volumeTarget, 0, vy);
    }
    this.composite.uniforms.uVolume.value = volume ? 1 : 0;

    const bloom = this.bloomOn && g.bloom > 0;
    if (bloom) {
      this.bright.uniforms.uThreshold.value = g.threshold;
      this.draw(this.bright, this.bloomA);
      const t = this.bloomTexel;
      this.pass(this.bloomA, this.bloomB, t.x, 0);
      this.pass(this.bloomB, this.bloomA, 0, t.y);
      this.pass(this.bloomA, this.bloomB, t.x * 2.6, 0);
      this.pass(this.bloomB, this.bloomA, 0, t.y * 2.6);
    }
    const u = this.composite.uniforms;
    u.uBloom.value = bloom ? g.bloom : 0;
    u.uExposure.value = g.exposure;
    u.uTint.value.copy(g.tint);
    u.uSaturation.value = g.saturation;
    u.uContrast.value = g.contrast;
    u.uShadows.value.copy(g.shadows);
    u.uHighlights.value.copy(g.highlights);
    u.uVignette.value = g.vignette;
    this.draw(this.composite, target);
  }

  /** Compile every pass now, so none stalls on the first frame a world is shown. */
  warmUp() {
    const tiny = new THREE.WebGLRenderTarget(1, 1);
    this.draw(this.bright, tiny);
    this.pass(this.bloomA, tiny, 0, 0);
    this.draw(this.composite, tiny);
    this.renderer.setRenderTarget(null);
    tiny.dispose();
  }

  dispose() {
    this.scene.depthTexture?.dispose();
    this.scene.dispose();
    this.volumeTarget.dispose();
    this.volumeBlur.dispose();
    this.bloomA.dispose();
    this.bloomB.dispose();
    this.bright.dispose();
    this.blur.dispose();
    this.composite.dispose();
    this.quad.geometry.dispose();
  }
}
