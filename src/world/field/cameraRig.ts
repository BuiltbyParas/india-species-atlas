import * as THREE from 'three';
import { damp } from '../../interaction/spring';
import { easeInOut } from './noise';

/**
 * The field studies' camera.
 *
 * Master 01 left a note: lift the hero's pose maths into a camera rig when a
 * second 3D camera needs it. Five do now. Each world describes its camera as
 * shots — a position, a point looked at, a lens — and the rig does the rest:
 *
 *   preview   where the camera stands while the study is a featured work on
 *             the index, and `engage`, where it leans to when the hand is
 *             over it (the camera "subtly reframes").
 *   path      a list of shots placed along the study's scroll, 0 → 1. The
 *             camera travels a smooth curve through them (centripetal
 *             Catmull–Rom through positions and targets), eased inside each
 *             leg so it settles on every shot instead of passing it at speed.
 *   enter     0 → 1, the move from the preview into the path's first shot —
 *             the click that takes the reader into the world — and back out
 *             again on the way home. The same number runs both ways, so the
 *             exit is the entry reversed.
 *   pointer   the hand turns the camera a few degrees around what it looks
 *             at, never more; each world says how many.
 *
 * Everything is damped by elapsed time (`damp`, interaction/spring.ts), so the
 * camera feels the same at 60 Hz and 120 Hz. With reduced motion the rig
 * snaps: compositions change, the camera does not travel.
 */
export interface Shot {
  /** Scroll position along the study, 0 → 1 (ignored for preview shots). */
  at: number;
  pos: [number, number, number];
  look: [number, number, number];
  fov?: number;
  /**
   * The same moment composed for a phone held upright, where the words sit above and below the world rather than
   * beside it. Taken over from the wide shot as the screen narrows (aspect 0.85 → 0.6); a shot without one is the
   * wide shot on every screen.
   */
  narrow?: { pos: [number, number, number]; look: [number, number, number]; fov?: number };
}

export interface RigOptions {
  preview: Shot;
  engage: Shot;
  path: Shot[];
  /** Degrees the hand can turn the camera: [yaw, pitch]. */
  sway?: [number, number];
  /** How quickly the camera follows, per second. */
  lambda?: number;
}

const prevPos = new THREE.Vector3();
const prevLook = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const offset = new THREE.Vector3();
const spherical = new THREE.Spherical();

function v(s: [number, number, number], out: THREE.Vector3) {
  return out.set(s[0], s[1], s[2]);
}

function catmull(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number, out: THREE.Vector3) {
  const t2 = t * t;
  const t3 = t2 * t;
  return out.set(
    0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    0.5 * (2 * p1.z + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3),
  );
}

/** A cubic from p1 to p2 that never leaves [p1, p2] (Fritsch–Carlson tangents: flat at a turn, limited elsewhere). */
function monotone(p0: number, p1: number, p2: number, p3: number, t: number) {
  const d0 = p1 - p0;
  const d1 = p2 - p1;
  const d2 = p3 - p2;
  const tangent = (a: number, b: number) => (a * b <= 0 ? 0 : Math.sign(b) * Math.min(Math.abs((a + b) / 2), 3 * Math.abs(a), 3 * Math.abs(b)));
  const m1 = tangent(d0, d1);
  const m2 = tangent(d1, d2);
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * p1 + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2 + (t3 - t2) * m2;
}

export interface RigInput {
  engage: number;
  enter: number;
  progress: number;
  pointer: { x: number; y: number };
  dt: number;
  snap: boolean;
}

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  private readonly o: RigOptions;
  private readonly pos: THREE.Vector3[];
  private readonly look: THREE.Vector3[];
  private readonly fovs: number[];
  private readonly cur = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 40 };
  private readonly want = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 40 };
  private first = true;
  /** 0 on a wide screen, 1 on an upright phone: how much of each shot's `narrow` composition is used. */
  private narrowness = -1;

  constructor(camera: THREE.PerspectiveCamera, options: RigOptions) {
    this.camera = camera;
    this.o = options;
    this.pos = options.path.map((s) => v(s.pos, new THREE.Vector3()));
    this.look = options.path.map((s) => v(s.look, new THREE.Vector3()));
    this.fovs = options.path.map((s) => s.fov ?? 40);
  }

  /** The path's poses for this screen's shape (only shots that have a narrow composition change). */
  private fit() {
    const k = THREE.MathUtils.smoothstep(0.85 - this.camera.aspect, 0, 0.25);
    if (Math.abs(k - this.narrowness) < 1e-3) return;
    this.narrowness = k;
    this.o.path.forEach((s, i) => {
      v(s.pos, this.pos[i]);
      v(s.look, this.look[i]);
      this.fovs[i] = s.fov ?? 40;
      if (!s.narrow || k <= 0) return;
      this.pos[i].lerp(v(s.narrow.pos, tmpB), k);
      this.look[i].lerp(v(s.narrow.look, tmpB), k);
      this.fovs[i] += ((s.narrow.fov ?? this.fovs[i]) - this.fovs[i]) * k;
    });
  }

  /** The path's pose at `p`, into `out`. */
  private along(p: number, out: { pos: THREE.Vector3; look: THREE.Vector3; fov: number }) {
    const path = this.o.path;
    const n = path.length;
    if (n === 1 || p <= path[0].at) {
      out.pos.copy(this.pos[0]);
      out.look.copy(this.look[0]);
      out.fov = this.fovs[0];
      return;
    }
    let i = 0;
    while (i < n - 2 && p > path[i + 1].at) i++;
    const a = path[i];
    const b = path[i + 1];
    const t = easeInOut(Math.min(1, Math.max(0, (p - a.at) / Math.max(1e-6, b.at - a.at))));
    const i0 = Math.max(0, i - 1);
    const i3 = Math.min(n - 1, i + 2);
    catmull(this.pos[i0], this.pos[i], this.pos[i + 1], this.pos[i3], t, out.pos);
    // Height never overshoots the two shots it travels between. Next to a shot far above the others (the forest's view
    // over the crowns) the uniform curve's tangent is steep enough to carry the camera through the ground on the
    // following leg; a monotone curve in height keeps the swoop and lands on the ground's side of it.
    out.pos.y = monotone(this.pos[i0].y, this.pos[i].y, this.pos[i + 1].y, this.pos[i3].y, t);
    // What the camera looks at never overshoots either: next to the crowns shot, whose target lies far up the forest,
    // the uniform curve swung the target back past the camera, which then stared at its own feet.
    const l0 = this.look[i0];
    const l1 = this.look[i];
    const l2 = this.look[i + 1];
    const l3 = this.look[i3];
    out.look.set(monotone(l0.x, l1.x, l2.x, l3.x, t), monotone(l0.y, l1.y, l2.y, l3.y, t), monotone(l0.z, l1.z, l2.z, l3.z, t));

    out.fov = this.fovs[i] + (this.fovs[i + 1] - this.fovs[i]) * t;
  }

  update(input: RigInput) {
    const { preview, engage } = this.o;
    // Preview pose, leaning towards the engaged shot as the hand arrives.
    const e = input.engage;
    const pPos = v(preview.pos, prevPos).lerp(v(engage.pos, tmpB), e);
    const pLook = v(preview.look, prevLook).lerp(v(engage.look, tmpB), e);
    const pFov = (preview.fov ?? 40) + ((engage.fov ?? 40) - (preview.fov ?? 40)) * e;

    this.fit();
    this.along(input.progress, this.want);
    const k = easeInOut(Math.min(1, Math.max(0, input.enter)));
    this.want.pos.lerpVectors(pPos, this.want.pos, k);
    this.want.look.lerpVectors(pLook, this.want.look, k);
    this.want.fov = pFov + (this.want.fov - pFov) * k;

    // The hand turns the camera around what it is looking at.
    const [yaw, pitch] = this.o.sway ?? [3, 2];
    offset.subVectors(this.want.pos, this.want.look);
    spherical.setFromVector3(offset);
    spherical.theta += THREE.MathUtils.degToRad(-input.pointer.x * yaw);
    spherical.phi = THREE.MathUtils.clamp(spherical.phi + THREE.MathUtils.degToRad(input.pointer.y * pitch), 0.02, Math.PI - 0.02);
    offset.setFromSpherical(spherical);
    this.want.pos.addVectors(this.want.look, offset);

    if (this.first || input.snap) {
      this.cur.pos.copy(this.want.pos);
      this.cur.look.copy(this.want.look);
      this.cur.fov = this.want.fov;
      this.first = false;
    } else {
      const l = this.o.lambda ?? 7;
      const dt = input.dt;
      this.cur.pos.set(
        damp(this.cur.pos.x, this.want.pos.x, l, dt),
        damp(this.cur.pos.y, this.want.pos.y, l, dt),
        damp(this.cur.pos.z, this.want.pos.z, l, dt),
      );
      this.cur.look.set(
        damp(this.cur.look.x, this.want.look.x, l, dt),
        damp(this.cur.look.y, this.want.look.y, l, dt),
        damp(this.cur.look.z, this.want.look.z, l, dt),
      );
      this.cur.fov = damp(this.cur.fov, this.want.fov, l, dt);
    }
    this.camera.position.copy(this.cur.pos);
    this.camera.lookAt(this.cur.look);
    // A portrait screen keeps more of the width each shot was composed for: the lens widens a little.
    const portrait = this.camera.aspect < 1 ? (1 - this.camera.aspect) * 0.55 : 0;
    const fov = Math.min(80, this.cur.fov * (1 + portrait));
    if (Math.abs(this.camera.fov - fov) > 1e-3) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }

  /** Where the camera is looking now (for lights and labels that follow it). */
  get target(): THREE.Vector3 {
    return this.cur.look;
  }
}
