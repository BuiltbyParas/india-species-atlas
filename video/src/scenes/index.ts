import type { Scene } from '../engine/film';

/**
 * Scene registry. A shot names its scene in the timeline; `photo:*` and
 * `map:*` are families whose member is chosen from the shot's scene name.
 * Shots whose scene is not registered draw their slate, and QC lists them.
 */
export const SCENES = new Map<string, Scene>([]);
