import type * as THREE from 'three';
import type { Species } from '../../types';
import type { QualityTier } from '../quality';
import type { Grade } from './gl/look';

/**
 * What the stage tells a world every frame.
 *
 * All values arrive already smoothed by the stage (time-damped), so a world
 * only maps them onto its scene. `progress` is the study's scroll, 0 → 1;
 * `enter` is the preview → study move; `engage` the hand over a featured
 * work on the index; `drag` whatever the world's own gesture holds (the
 * river's position between localities).
 */
export interface FieldInput {
  time: number;
  dt: number;
  /** −1 → 1 across the viewport, y up; smoothed. */
  pointer: { x: number; y: number };
  /** Unsmoothed, for things that should track the hand exactly. */
  pointerRaw: { x: number; y: number };
  /** Screen pixels per second of hand movement. */
  pointerSpeed: number;
  /**
   * The hand on the sun, −1 → 1: the mouse (smoothed, as `pointer`) plus what the visitor set with the light
   * control or by dragging across the scene on a touch screen (on the lamp's spring). Worlds turn their sun by this,
   * and their camera by `pointer`, so a finger turns the light without swinging the view.
   */
  light: { x: number; y: number };
  pointerDown: boolean;
  engage: number;
  enter: number;
  progress: number;
  drag: number;
  /** Compositions change instead of the camera travelling. */
  reduced: boolean;
  /** Jump straight to the pose: the world has just come on screen, or motion is reduced. */
  snap: boolean;
}

export interface FieldWorld {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** The colour the world clears to. */
  clear: string;
  /**
   * A world that carries a grade writes linear light and is finished by the stage's film (gl/look.ts): exposure,
   * the homepage's tone curve, bloom, a grade. A world without one draws straight to the screen.
   */
  grade?: Grade;
  /** Light scattered in the air (the forest's shafts): drawn by the film over the frame, given its depth. */
  volume?: THREE.ShaderMaterial;
  update(input: FieldInput): void;
  resize(width: number, height: number, dpr: number): void;
  /** Step down: 1, then 2. The world drops its most expensive layers first. */
  setRung(rung: number): void;
  /** A pre-pass rendered before the scene (the river's ripple field). */
  prerender?(renderer: THREE.WebGLRenderer): void;
  dispose(): void;
}

export interface WorldContext {
  species: Species;
  tier: QualityTier;
  dpr: number;
}

export type WorldFactory = (ctx: WorldContext) => Promise<FieldWorld>;
