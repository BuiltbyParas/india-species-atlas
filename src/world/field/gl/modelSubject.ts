import * as THREE from 'three';
import type { Species } from '../../../types';
import { SPECIES_MODELS, type SpeciesModel } from '../../../content/models';
import { GLSL_HASH, GLSL_NOISE } from '../../gl/chunks';
import { GLSL_AIR, GLSL_FIELD_SUN } from './air';
import { GLSL_SUNLIGHT } from './sunlight';
import { Subject, type SubjectOptions } from './subject';

/**
 * The animal as a three-dimensional model, where a licensed model of the species exists (content/models.ts);
 * otherwise, and whenever the model cannot be loaded, the record's cut-out photograph (subject.ts) as before.
 *
 * The model takes the photograph's place exactly: it stands where the card stood, as tall as the card's animal, facing
 * the way it faced, and it is lit the way the card was — the world's sky and sun, the sun read from the world's sun
 * grid where the animal stands (so a ridge's or a canopy's shadow falls on it), a rim where the light comes from
 * behind, the world's air in front of it. Its shadow is the world's own, cast from the bulk the world already stamps
 * into its grid.
 *
 * It moves only as the model itself can: if the file carries a clip that suits a still moment (an idle, a breath) it
 * loops that, slowly, and never with reduced motion; a model without one stands still and the world's camera and
 * light give it depth. Nothing is invented for it.
 *
 * Built with the world, which is built only as its study comes near (stage.prepareInIdle), in the one field stage's
 * WebGL context; disposed with the world.
 */

const VERTEX = /* glsl */ `
  #include <common>
  #include <skinning_pars_vertex>
  varying vec2 vUv;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  void main() {
    vUv = uv;
    #include <beginnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <begin_vertex>
    #include <skinning_vertex>
    vec4 w = modelMatrix * vec4(transformed, 1.0);
    vWorld = w.xyz;
    vNormalW = normalize(mat3(modelMatrix) * objectNormal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const FRAGMENT = /* glsl */ `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  ${GLSL_FIELD_SUN}
  ${GLSL_AIR}
  ${GLSL_SUNLIGHT}
  uniform sampler2D uMap;
  uniform float uHasMap;
  uniform vec3 uBase;
  uniform vec3 uSkyCol;
  uniform vec3 uSubject;
  uniform float uRim;
  uniform float uGain;
  uniform float uKeep;
  uniform float uVeil;
  uniform float uReach;
  varying vec2 vUv;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
  void main() {
    vec3 albedo = uHasMap > 0.5 ? texture2D(uMap, vUv).rgb : uBase;
    vec3 n = normalize(vNormalW);
    if (!gl_FrontFacing) n = -n;
    vec3 sunDir = normalize(uSunDir);
    // The light on the ground just sunward of the animal: whatever shades that ground shades the animal (subject.ts).
    vec2 toward = normalize(uSunDir.xz + 1e-5) * uReach;
    float sun = sunGround(uSubject.xz + toward);
    // Fur and feathers scatter light round the terminator: a wrapped diffuse, not a hard one.
    float facing = clamp((dot(n, sunDir) + 0.35) / 1.35, 0.0, 1.0);
    // The sky from above, less from below (a body's belly is darker than its back), and the lit ground's bounce.
    float sky = 0.65 + 0.35 * n.y;
    vec3 bounce = uSunCol * sun * 0.18 * max(-n.y, 0.0);
    // Sunlit air and ground all round fill the side away from the sun a little (the card's "a body, not a sheet").
    vec3 fill = uSunCol * sun * 0.3;
    vec3 light = uSkyCol * sky + uSunCol * sun * facing + bounce + fill;
    vec3 col = albedo * mix(light, vec3(lum(light)), uKeep) * uGain;
    vec3 v = normalize(cameraPosition - vWorld);
    float rim = pow(1.0 - max(dot(n, v), 0.0), 2.5) * (0.25 + 0.75 * max(dot(-v, sunDir), 0.0)) * sun;
    col += uSunCol * rim * uRim * (0.35 + 0.65 * lum(albedo));
    col = applyAir(col, vWorld);
    gl_FragColor = vec4(col, 1.0 - uVeil);
  }
`;

/** Where and how a model stands: the card's options, less the photograph. */
export type ModelPlacement = Omit<SubjectOptions, 'texture' | 'width'>;

/** What a world holds of its animal, whether card or model. */
export interface FieldSubject {
  readonly mesh: THREE.Object3D;
  readonly height: number;
  update(camera: THREE.Camera, sunDir: THREE.Vector3, dt?: number): void;
  setVeil(v: number): void;
  dispose(): void;
}

export class ModelSubject implements FieldSubject {
  readonly mesh: THREE.Group;
  readonly height: number;
  readonly model: SpeciesModel;
  private readonly materials: THREE.ShaderMaterial[] = [];
  private readonly textures: THREE.Texture[] = [];
  private readonly mixer: THREE.AnimationMixer | null = null;

  constructor(gltf: { scene: THREE.Group; animations: THREE.AnimationClip[] }, model: SpeciesModel, card: { height: number }, o: ModelPlacement) {
    this.model = model;
    const root = gltf.scene;
    // As tall as the photograph's animal, its feet on the card's ground point.
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const tall = card.height * (1 - o.feet) * (model.scale ?? 1);
    const k = tall / Math.max(size.y, 1e-6);
    root.scale.setScalar(k);
    const centre = box.getCenter(new THREE.Vector3());
    root.position.set(-centre.x * k, -box.min.y * k, -centre.z * k);
    this.height = tall;

    this.mesh = new THREE.Group();
    this.mesh.add(root);
    this.mesh.position.copy(o.at);
    const facing = (o.facing ?? new THREE.Vector3(0, 0, 1)).clone().setY(0).normalize();
    this.mesh.rotation.y = Math.atan2(facing.x, facing.z) + (model.yaw ?? 0);
    this.mesh.renderOrder = 3;

    const shared = {
      ...o.uniforms,
      uSkyCol: { value: o.skyCol },
      uSubject: { value: new THREE.Vector3(o.at.x, o.at.y + tall * 0.45, o.at.z) },
      uRim: { value: o.rim ?? 1.2 },
      uGain: { value: o.gain ?? 1.2 },
      uKeep: { value: o.keep ?? 0.45 },
      uVeil: { value: 0 },
      // Read the light clear of the model's own bulk, which the world's sun pass sees as solid: past half its footprint.
      uReach: { value: Math.max(o.lightReach ?? 0, Math.max(size.x, size.z) * k * 0.6) },
    };
    root.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      const source = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
      const map = source.map ?? null;
      // The worlds write the palette's sRGB values directly (gl/color.ts): the photograph's texture is read raw, so is this.
      if (map) {
        map.colorSpace = THREE.NoColorSpace;
        map.needsUpdate = true;
        this.textures.push(map);
      }
      const material = new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
          ...shared,
          uMap: { value: map },
          uHasMap: { value: map ? 1 : 0 },
          uBase: { value: new THREE.Vector3(source.color?.r ?? 0.6, source.color?.g ?? 0.6, source.color?.b ?? 0.6) },
        },
        side: source.side,
        transparent: true,
      });
      // The veil is one value for the whole animal.
      material.uniforms.uVeil = shared.uVeil;
      source.dispose();
      mesh.material = material;
      mesh.frustumCulled = false;
      this.materials.push(material);
    });

    const clip = model.clip ? gltf.animations.find((a) => model.clip!.test(a.name)) : undefined;
    if (clip) {
      this.mixer = new THREE.AnimationMixer(root);
      const action = this.mixer.clipAction(clip);
      // A still moment, slowly: an idle at its own pace reads as fidgeting at the world's scale.
      action.timeScale = 0.8;
      action.play();
    }
  }

  get animated() {
    return this.mixer !== null;
  }

  update(_camera: THREE.Camera, _sunDir: THREE.Vector3, dt = 0) {
    this.mixer?.update(dt);
  }

  setVeil(v: number) {
    if (this.materials[0]) this.materials[0].uniforms.uVeil.value = v;
  }

  dispose() {
    this.mixer?.stopAllAction();
    this.mesh.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh) mesh.geometry.dispose();
    });
    for (const m of this.materials) m.dispose();
    for (const t of this.textures) t.dispose();
  }
}

/**
 * The licensed model's glTF. The loader and its decoder arrive only if a model is registered. Not cached: a world is
 * built once and disposes the model's geometry and textures with itself, so a world rebuilt after eviction loads afresh.
 */
async function loadModel(url: string) {
  const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/libs/meshopt_decoder.module.js'),
  ]);
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(url);
  return { scene: gltf.scene, animations: gltf.animations };
}

/**
 * The species' licensed model, `height` tall, standing as `o` describes; null if none is registered or it cannot load
 * (the caller keeps its photograph).
 */
export async function modelFor(species: Species, o: ModelPlacement, height: number): Promise<ModelSubject | null> {
  const model = SPECIES_MODELS[species.id];
  if (!model) return null;
  try {
    return new ModelSubject(await loadModel(model.url), model, { height }, o);
  } catch (err) {
    console.warn('[field] the model could not be loaded; the photograph stands in', species.id, err);
    return null;
  }
}

/**
 * The world's animal: the species' licensed model if there is one and it loads, otherwise the cut-out photograph.
 * The photograph's card is built first in either case, so the model can take its size; it is disposed when the model
 * replaces it.
 */
export async function subjectFor(species: Species, o: SubjectOptions): Promise<FieldSubject> {
  const card = new Subject(o);
  const model = await modelFor(species, o, card.height);
  if (!model) return card;
  card.dispose();
  return model;
}
