import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { SpecimenCalibration } from '../../content/encounter';

/**
 * THE SPECIMEN VIEWER: one model, turned by hand, in its own small renderer.
 *
 * Loaded only when the encounter's "Specimen" is chosen (its own lazy chunk), and disposed — geometry, materials,
 * textures, the context itself — when the encounter closes or switches back to the footage. It draws only while
 * something moves: a drag, its inertia, the camera settling, an animation clip if the asset has one. Left alone and
 * settled, it stops asking for frames.
 *
 * The viewer adds nothing to the animal: no rig, no pose, no motion the asset does not carry. A clip is played only if
 * the file has one (and not with reduced motion). The turn is the visitor's; the pointer's lean is a few degrees.
 *
 * Its host gets `data-state` (loading, ready, failed), `data-frames` (frames drawn) and `data-yaw` for the checks in
 * scripts/audit/fos-*.mjs.
 */

export interface SpecimenOptions {
  url: string;
  calibration: SpecimenCalibration;
  reduced: boolean;
  /** Where on screen the subject sits, as a fraction of the host's width (the panel takes the rest). */
  centreX?: number;
  /** The element for each pinned adaptation, positioned by the viewer as the model turns. */
  anchorEl?: (id: string) => HTMLElement | null;
  onState?: (state: 'loading' | 'ready' | 'failed') => void;
}

export interface SpecimenScene {
  /** Turn to an adaptation (if the calibration pins it) or back to the whole animal (null). */
  focus(id: string | null): void;
  /** Back to the first view. */
  reset(): void;
  /** Turn by a step (keyboard): radians of yaw and pitch. */
  nudge(yaw: number, pitch: number): void;
  readonly pinned: string[];
  dispose(): void;
}

const PITCH_MIN = -0.06;
const PITCH_MAX = 0.42;
const FIRST = { yaw: -0.5, pitch: 0.12, zoom: 1 };

export function createSpecimenScene(host: HTMLElement, opts: SpecimenOptions): SpecimenScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const canvas = renderer.domElement;
  canvas.className = 'enc-canvas';
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.02, 60);

  // One low, warm sun from the front left, the cold sky over it and a cool edge from behind: the light of the
  // drawn Himalaya behind the encounter, so the specimen does not look lit in a different place from its world.
  scene.add(new THREE.HemisphereLight(0xc9d4e4, 0x2e2822, 1.1));
  const sun = new THREE.DirectionalLight(0xffe0bd, 2.4);
  sun.position.set(-2.4, 2.2, 2.6);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x9fb3d4, 1.4);
  rim.position.set(1.8, 1.4, -2.6);
  scene.add(rim);

  // A soft contact shadow: a disc, darkest under the body, drawn once into a small texture.
  const shadowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(0,0,0,0.55)');
    grd.addColorStop(0.55, 'rgba(0,0,0,0.22)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.renderOrder = -1;
  scene.add(shadow);

  const turntable = new THREE.Group();
  scene.add(turntable);

  let mixer: THREE.AnimationMixer | null = null;
  let radius = 1;
  const centre = new THREE.Vector3();
  const anchors = new Map<string, THREE.Vector3>();
  let disposed = false;
  let frames = 0;
  let raf = 0;
  let last = 0;

  const view = { yaw: FIRST.yaw, pitch: FIRST.pitch, zoom: FIRST.zoom, tx: 0, ty: 0, tz: 0 };
  const goal = { ...view };
  const lean = { x: 0, y: 0 };
  const leanGoal = { x: 0, y: 0 };
  let velocity = 0;

  const setState = (s: 'loading' | 'ready' | 'failed') => {
    host.dataset.state = s;
    opts.onState?.(s);
  };
  setState('loading');

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(
    opts.url,
    (gltf) => {
      if (disposed) {
        disposeObject(gltf.scene);
        return;
      }
      const model = gltf.scene;
      // The calibration's turn first, so the box (and the anchors measured in it) are of the animal as it stands here.
      model.rotation.y = opts.calibration.yaw ?? 0;
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      const scale = 1 / Math.max(sphere.radius, 1e-6);
      const holder = new THREE.Group();
      holder.add(model);
      holder.scale.setScalar(scale);
      // Feet on the ground (y = 0), centred over the turntable's axis.
      const mid = box.getCenter(new THREE.Vector3());
      holder.position.set(-mid.x * scale, -box.min.y * scale, -mid.z * scale);
      turntable.add(holder);
      radius = 1;
      centre.set(0, (size.y * scale) / 2, 0);
      shadow.scale.set(size.x * scale * 1.25, size.z * scale * 1.25 + 0.2, 1);

      for (const [id, frac] of Object.entries(opts.calibration.anchors ?? {})) {
        if (!frac) continue;
        const p = new THREE.Vector3(box.min.x + frac[0] * size.x, box.min.y + frac[1] * size.y, box.min.z + frac[2] * size.z);
        // Into the holder's frame (scaled and moved), which turns with the turntable.
        anchors.set(id, p.multiplyScalar(scale).add(holder.position));
      }

      model.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) m.frustumCulled = true;
      });

      if (gltf.animations.length && !opts.reduced) {
        mixer = new THREE.AnimationMixer(model);
        const clip = THREE.AnimationClip.findByName(gltf.animations, opts.calibration.idle ?? '') ?? gltf.animations[0];
        mixer.clipAction(clip).play();
        // An animated asset draws every frame while open, by design (the checks read this).
        host.dataset.animated = '';
      }
      setState('ready');
      kick();
    },
    undefined,
    (err) => {
      if (disposed) return;
      console.warn('[specimen] could not load', opts.url, err);
      setState('failed');
    },
  );

  // ---- size
  let width = 1;
  let height = 1;
  const resize = () => {
    const r = host.getBoundingClientRect();
    width = Math.max(1, Math.round(r.width));
    height = Math.max(1, Math.round(r.height));
    renderer.setSize(width, height, false);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    camera.aspect = width / height;
    // The subject sits at `centreX` of the host (left of the panel on a wide screen): the view is offset rather than
    // the camera turned, so the animal is not seen from an angle because of where the panel is.
    const cx = opts.centreX ?? 0.5;
    const shift = (0.5 - cx) * width;
    camera.setViewOffset(width, height, shift, 0, width, height);
    camera.updateProjectionMatrix();
    kick();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  // ---- input: drag to turn (with inertia), the pointer's lean, keys
  let drag: { id: number; x: number; y: number; t: number } | null = null;
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
    canvas.setPointerCapture(e.pointerId);
    host.dataset.dragging = '';
    velocity = 0;
    kick();
  };
  const onMove = (e: PointerEvent) => {
    if (drag && e.pointerId === drag.id) {
      const now = performance.now();
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      const k = 5.2 / Math.max(width, 480);
      goal.yaw += dx * k;
      goal.pitch = clamp(goal.pitch + dy * k * 0.6, PITCH_MIN, PITCH_MAX);
      velocity = (dx * k) / Math.max(1, now - drag.t);
      drag.x = e.clientX;
      drag.y = e.clientY;
      drag.t = now;
      kick();
      return;
    }
    if (e.pointerType !== 'mouse' || opts.reduced) return;
    const r = host.getBoundingClientRect();
    leanGoal.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    leanGoal.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    kick();
  };
  const onUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    // Let go after holding still: no throw.
    const held = performance.now() - drag.t > 80;
    drag = null;
    delete host.dataset.dragging;
    if (opts.reduced || held) velocity = 0;
    kick();
  };
  const onLeave = () => {
    leanGoal.x = 0;
    leanGoal.y = 0;
    kick();
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('pointerleave', onLeave);

  // ---- frames
  const clock = new THREE.Clock(false);
  const v3 = new THREE.Vector3();
  const toCam = new THREE.Vector3();
  function kick() {
    if (raf || disposed) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function frame(now: number) {
    raf = 0;
    if (disposed) return;
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
    last = now;

    if (!drag && velocity) {
      goal.yaw += velocity * dt * 1000;
      velocity *= Math.exp(-dt * 4.2);
      if (Math.abs(velocity) < 2e-5) velocity = 0;
    }
    const k = opts.reduced ? 1 : 1 - Math.exp(-dt * 6.5);
    const kl = opts.reduced ? 1 : 1 - Math.exp(-dt * 3);
    let moving = false;
    for (const key of ['yaw', 'pitch', 'zoom', 'tx', 'ty', 'tz'] as const) {
      const d = goal[key] - view[key];
      view[key] += d * k;
      if (Math.abs(d) > 1e-4) moving = true;
    }
    for (const key of ['x', 'y'] as const) {
      const d = leanGoal[key] - lean[key];
      lean[key] += d * kl;
      if (Math.abs(d) > 1e-3) moving = true;
    }

    turntable.rotation.y = view.yaw + lean.x * 0.06;
    const pitch = view.pitch + lean.y * 0.03;
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const fit = (radius / Math.sin(fov / 2)) * (camera.aspect < 1 ? 1.35 / Math.max(camera.aspect, 0.5) : 1.05);
    const dist = fit * view.zoom;
    const target = v3.set(centre.x + view.tx, centre.y + view.ty, centre.z + view.tz);
    camera.position.set(target.x, target.y + Math.sin(pitch) * dist, target.z + Math.cos(pitch) * dist);
    camera.lookAt(target);

    if (mixer) {
      if (!clock.running) clock.start();
      mixer.update(clock.getDelta());
    }

    renderer.render(scene, camera);
    host.dataset.frames = String(++frames);
    host.dataset.yaw = view.yaw.toFixed(3);
    placeAnchors();

    if (moving || drag || velocity || mixer) raf = requestAnimationFrame(frame);
  }

  function placeAnchors() {
    if (!opts.anchorEl) return;
    turntable.updateMatrixWorld(true);
    for (const [id, local] of anchors) {
      const el = opts.anchorEl(id);
      if (!el) continue;
      const world = v3.copy(local).applyMatrix4(turntable.matrixWorld);
      // Facing: the anchor's side of the body against the direction to the camera (seen edge-on, it fades).
      toCam.copy(camera.position).sub(world).normalize();
      const out = new THREE.Vector3(world.x, 0, world.z).normalize();
      const facing = out.lengthSq() ? out.dot(new THREE.Vector3(toCam.x, 0, toCam.z).normalize()) : 1;
      const ndc = world.project(camera);
      const x = (ndc.x * 0.5 + 0.5) * width;
      const y = (-ndc.y * 0.5 + 0.5) * height;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      el.dataset.facing = facing > -0.15 ? 'front' : 'back';
    }
  }

  const visibility = () => document.visibilityState === 'visible' && kick();
  document.addEventListener('visibilitychange', visibility);

  return {
    focus(id) {
      const a = id ? anchors.get(id) : null;
      if (!a) {
        goal.zoom = FIRST.zoom;
        goal.tx = goal.ty = goal.tz = 0;
        kick();
        return;
      }
      // Turn the side the anchor is on towards the camera, and come closer to it.
      const base = Math.atan2(a.x, a.z);
      const want = -base;
      // The nearer way round.
      const turns = Math.round((goal.yaw - want) / (Math.PI * 2));
      goal.yaw = want + turns * Math.PI * 2;
      goal.pitch = clamp(0.1, PITCH_MIN, PITCH_MAX);
      // Turned so, the anchor lies straight towards the camera from the axis: the view's centre moves part of the
      // way to it.
      goal.zoom = 0.62;
      goal.tx = 0;
      goal.ty = (a.y - centre.y) * 0.6;
      goal.tz = Math.hypot(a.x, a.z) * 0.5;
      velocity = 0;
      kick();
    },
    reset() {
      Object.assign(goal, { yaw: FIRST.yaw, pitch: FIRST.pitch, zoom: FIRST.zoom, tx: 0, ty: 0, tz: 0 });
      velocity = 0;
      kick();
    },
    nudge(yaw, pitch) {
      goal.yaw += yaw;
      goal.pitch = clamp(goal.pitch + pitch, PITCH_MIN, PITCH_MAX);
      velocity = 0;
      kick();
    },
    get pinned() {
      return [...anchors.keys()];
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      mixer?.stopAllAction();
      disposeObject(scene);
      shadowTex.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      host.dataset.state = 'disposed';
    },
  };
}

function clamp(v: number, a: number, b: number) {
  return Math.min(b, Math.max(a, v));
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.geometry?.dispose();
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const mat of mats) {
      if (!mat) continue;
      for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose();
      mat.dispose();
    }
  });
}
