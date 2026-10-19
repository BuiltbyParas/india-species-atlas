# Final creative review (18 Oct 2026)

Brief: a visual review against lusion.co and a few targeted refinements, not a rewrite. Protected files
(`src/world/field/stage.ts`, `src/components/field/useFieldStage.ts`) are unchanged. Nothing is committed.

## Lusion, as observed (headless Chrome, GPU on, 1440 × 900)

- **Opening.** A loader counts up over a thin bar on black. Then a light page opens with one dense, physical
  object: a cluster of glossy 3D pieces in a rounded dark frame. The pointer pushes them, and they visibly
  rearrange between rest frames. A short statement sits above, and "scroll to explore" sits on a ruled foot.
- **Scroll.** Nothing is cut. The hero frame scrolls away as one plate. A headline ("Bold Ideas, Brought to Life")
  takes the screen. A single blue ribbon draws itself with the scroll, threading through the type and the media.
  The reel card bends as it grows from a thumbnail to full width, and its two words ("PLAY" / "REEL") part and
  rejoin around it.
- **Quiet and dense.** Long light stretches (big type, one small paragraph, a work grid with plain captions)
  alternate with one dense dark sequence: an astronaut in a lit grid tunnel, colour washes and a lens ring. Its
  line of type spreads across the width, then gathers to the centre as the camera pulls back.
- **What carries it.** Something always connects one moment to the next: the ribbon, a plate that changes shape,
  words that move apart and back. Every move lands on a composed frame with type in it. The frame is never empty
  while the scroll is moving.

The atlas keeps its own identity (black, forest green, emerald as a signal, data-first). What it takes from Lusion
is that last point.

## Gaps found

1. **Fragments' flights were empty.** About 60 % of every leg is flight, by design: the words leave so the ground
   travels alone. In those frames the screen held a dim sheet with no heading, no destination and no words. The
   camera arrived without anticipation, and on the way you could not tell where it was going. Western Ghats and
   Sundarbans were hard to make out mid-flight.
2. **Marks without names.** At a stop, the dots on the ground could not be read as species: their colours encode
   status, not species. They were named only by hovering a list row.
3. **The coastal fragment drew none of its places.** All four Dugong localities lie at sea (Gulf of Mannar, Palk
   Bay, Gulf of Kachchh, Ritchie's Archipelago). `marksOf` kept only points inside a state, so "Coastal & Marine
   India" said "1 of 12 species recorded here" and showed no mark. This was true of both the canvas stage and the
   stacked fallback.
4. **The tiger study's camera went through the ground.** After the view over the crowns, the Estimate chapter
   dipped below the forest floor: grass hung upside-down in the air, the tiger stood on a visible slab, and then
   the camera stared at its own feet. Cause: the rig's uniform Catmull–Rom. A shot 140 units up between
   eye-level shots gives its neighbours a tangent of about −68 in height, so the next leg dips to about −7. The
   look target's tangent (+128 in z) swung the target back past the camera (pitch −63°, 7 units away). The river,
   floodplain and Himalaya paths have the same aerial-between-ground pattern.

Checked and left alone:
- Hover: an emerald rim, a lift, "Go to 0N" on the cursor, the others dimmed. It is clear without being loud.
- The terrain light: the sun moves across the relief's own shading, with a lit pool on the active piece.
- The rail and the keyboard.
- The bustard and snow leopard footage.

## Changes

- **`fragmentsStage.ts`: the flight.**
  - Leaving a region, a dotted emerald line runs out ahead of the camera, from the reference point it leaves
    toward the next one, with a bright head.
  - The destination is ringed and named ("03  WESTERN GHATS") from about 6 % into the flight. The ring closes as
    the camera lands, and the name hands over to the crosshair reading.
  - The line draws back into the destination on arrival, and it is gone at every stop. It is the camera's path,
    not a route or a corridor, and the code says so.
  - Leaving the opening sheet, there is no line, but the first destination is named.
- **`fragmentsStage.ts`: names on arrival.**
  - Once the camera has landed, each species in the region is named once, at its recorded locality nearest the
    region's reference point (always in the frame at its stop).
  - Names sit on a faint tab and step clear of each other and of the reference reading, with leaders.
  - Hovering or focusing a species row hands over to that species' place names, as before.
  - One shared `labelMarks()` places both kinds of name.
- **`RegionFragments.tsx`.**
  - Marks carry the species' common name.
  - `marksOf` attaches a locality that lies in no state at all (at sea) to a cut whose coast it lies within
    0.5°. Land points are unchanged.
  - The coastal fragment now shows its four Dugong places, in both the stage and the stacked fallback. The
    "52 places" count comes from the dataset and is unchanged.
- **`world/field/cameraRig.ts`** (shared by the five studies; not a protected file).
  - Camera height and the look target now use a monotone cubic (Fritsch–Carlson tangents) between shots.
  - The path still passes exactly through every shot. Only overshoot between shots is removed, so the swoops
    remain but no longer go below the ground or turn the view back on itself.
  - Probe of the forest path: pitch now stays between −3° and −11° through the descent (it was −63°), and the
    target never comes closer than 16 units (it was 7).

## Checks

See the final report of this pass (numbers recorded there).

## Recovery

`~/.cache/ispa-redesign/pre-final-review-18oct.patch` (tracked diff) and `pre-final-review-18oct-untracked.tgz`
(untracked files) hold the state before this pass.
