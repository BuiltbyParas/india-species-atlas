import * as THREE from 'three';
import { GLSL_DISSOLVE, GLSL_HASH, GLSL_NOISE } from '../../gl/chunks';
import { rgb } from './color';

/**
 * One world becoming another.
 *
 * Only while two worlds are on screen at once — the index moving from one
 * field study to the next, or a reader walking straight from one study into
 * another — both are rendered into targets and joined here; the rest of the
 * time the active world renders straight to the screen and this pass does
 * not exist. The join is the atlas's ink edge (`inkEdge`, world/gl/chunks.ts)
 * run across a noise field leaning in a direction chosen for the pair: sand
 * gives way to snow from below, a river's blue runs in from the side along
 * its current, a forest's dark closes from above. A hairline of the incoming
 * world's line colour marks the front, like a contour being drawn.
 */
const FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  ${GLSL_DISSOLVE}
  uniform sampler2D uA;
  uniform sampler2D uB;
  uniform float uP;
  uniform vec2 uDir;
  uniform vec3 uEdge;
  uniform float uAspect;
  varying vec2 vUv;
  void main() {
    vec2 q = vec2((vUv.x - 0.5) * uAspect, vUv.y - 0.5);
    float sweep = dot(q, normalize(uDir)) * 0.7 + 0.5;
    float field = clamp(sweep * 0.72 + fbm3(q * 3.2 + uDir) * 0.28, 0.0, 1.0);
    float m = inkEdge(field, uP, 0.08);
    float front = inkEdge(field, uP + 0.008, 0.008) - m;
    vec3 a = texture2D(uA, vUv).rgb;
    vec3 b = texture2D(uB, vUv).rgb;
    vec3 col = mix(a, b, m);
    col = mix(col, uEdge, clamp(front, 0.0, 1.0) * 0.55);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export class Compositor {
  readonly a: THREE.WebGLRenderTarget;
  readonly b: THREE.WebGLRenderTarget;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly material: THREE.ShaderMaterial;
  private readonly mesh: THREE.Mesh;

  constructor(width: number, height: number) {
    const opts = { depthBuffer: true, stencilBuffer: false, type: THREE.UnsignedByteType } as const;
    this.a = new THREE.WebGLRenderTarget(width, height, opts);
    this.b = new THREE.WebGLRenderTarget(width, height, opts);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uA: { value: this.a.texture },
        uB: { value: this.b.texture },
        uP: { value: 0 },
        uDir: { value: new THREE.Vector2(0, 1) },
        uEdge: { value: rgb('#e8e1cf') },
        uAspect: { value: width / Math.max(1, height) },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  setSize(width: number, height: number) {
    if (this.a.width === width && this.a.height === height) return;
    this.a.setSize(width, height);
    this.b.setSize(width, height);
    this.material.uniforms.uAspect.value = width / Math.max(1, height);
  }

  draw(renderer: THREE.WebGLRenderer, p: number, dir: [number, number], edge: THREE.Vector3) {
    const u = this.material.uniforms;
    u.uP.value = p;
    u.uDir.value.set(dir[0], dir[1]);
    u.uEdge.value.copy(edge);
    renderer.setRenderTarget(null);
    renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.a.dispose();
    this.b.dispose();
    this.material.dispose();
    this.mesh.geometry.dispose();
  }
}
