/**
 * The plate's veil: while a study's own wild footage is open over its world (the index's living plate,
 * components/field/LivingPlate.tsx), the photograph standing in the world steps back, so the screen holds one animal —
 * the filmed one, moving — rather than the same animal twice. Set by the plate, read and eased by the world each frame.
 * Kept outside the stage: the plate and the world agree on a species id and nothing else.
 */
const target = new Map<string, number>();
const value = new Map<string, number>();

export function setPlateVeil(species: string, on: boolean) {
  target.set(species, on ? 1 : 0);
}

/** The veil for a species this frame, 0 (the photograph stands) → 1 (stepped back), eased over about half a second. */
export function plateVeil(species: string, dt: number): number {
  const to = target.get(species) ?? 0;
  let v = value.get(species) ?? 0;
  v += (to - v) * (1 - Math.exp(-Math.max(0, dt) * 5));
  if (Math.abs(to - v) < 0.002) v = to;
  value.set(species, v);
  return v;
}
