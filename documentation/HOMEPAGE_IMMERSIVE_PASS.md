# Homepage immersive pass (18 Oct 2026)

Brief: "Immersive creative redesign, Lusion-level ambition, original wildlife identity". Priorities in order: the
lifeless horizontal Fragments run, living wildlife in Field of Species, chapter transitions, a black-and-green system
with emerald used only as a signal, then performance and regressions. Protected files (`src/world/field/stage.ts`,
`src/components/field/useFieldStage.ts`) are unchanged. Nothing is committed.

## Diagnosis

- **Fragments.** The run was ten side-by-side cards on a track that only translated. Each piece "lifted" by 14 px
  with a ±0.65° turn, the relief was one static image, the marks never animated, and no camera, light or ground
  changed with the scroll. It read as a carousel of maps.
- **Field of Species.** All five worlds already move: wind in the grass and the forest, water, mist and camera sway
  (measured with `imm-world-motion.mjs`, idle pixel change 8–29 %). Wild footage exists only for the bustard and the
  snow leopard. Their living plates were hard-edged rectangles floating over the world, next to a still cut-out of
  the same animal, so the animal appeared twice. Tiger, dolphin and rhino have no licensed wild clip of usable
  quality (see `FIELD_OF_SPECIES_ENCOUNTER.md`). They stay as photographs in moving worlds, with no faked motion.
- **Transitions.** The Fragments frame met the chapters on either side as a hard box, and it covered the route map's
  route line.

## What was built

### Fragments: a camera-driven atlas stage (`fragmentsStage.ts`, `RegionFragments.tsx`)

The wide layout with motion now runs on one 2D canvas. The eight region pieces are cut from the ETOPO 2022 relief
along their key states and baked once as sprites: the top in two lights, plus the side and the shadow. Every frame
depends on one value, the stop position `s`, which `stopAt(p)` takes from the scroll progress:

| `s` | state |
|---|---|
| −1 | The whole sheet, tilted like a table, with the regions numbered. |
| −1 → −0.4 | The sheet comes apart. Pieces drift outward, turn slightly, and sink below the plane. |
| 0 … 7 | The camera flies to each region and pulls back mid-flight so the country is seen on the way. The active piece stands up: lift, its own shadow away from the sun, a visible thickness, local contrast and an emerald edge. Its localities surface one by one, then its reference point and coordinates are read. The other pieces recede but stay in place. |
| 7.6 → 8 | The pieces settle back, and every recorded locality returns to the whole sheet. |

- **Dwell and drift.** Each stop holds for about 40 % of its leg. During the hold the camera keeps pushing in slowly
  (`raw − s`), so the frame is never frozen while you scroll.
- **Light.** The sun moves across the whole run, from north-east to west-north-west, by crossfading two shadings of
  the relief (`shadeRelief(…, light)`). The terrain's own shadows move. A soft-light wash follows the same azimuth.
- **Depth layers.** A far degree grid (parallax 0.82) sits behind the sheet. In front are two near fog sheets that
  drift with time, parallax 1.25–1.6, and thicken while the camera travels. The frame ends in a vignette, with its
  top and foot feathered into the page ground (`--color-forest-950`).
- **Words.** The text passes sideways in two planes: the heading leads and the list trails. Halfway between stops
  neither stop's words are shown, so the ground travels alone. Off-frame words are never hidden. When focus lands in
  them, the page scrolls to their stop.
- **Interaction.**
  - Pointer: a soft emerald lamp follows it and leans the camera a few pixels.
  - Region hover: the region under the pointer answers with an edge glow, a slight lift and a small brightening,
    and the others dim. The site cursor reads "Go to 0N", and a click flies there.
  - Species rows: hovering or focusing one enlarges its marks and names its places on the sheet. Labels that would
    collide step down, with leaders.
  - Rail: the eight numbered stops are real buttons. Focus or hover makes their region answer, and Enter or a click
    travels to it. The active stop expands to its name, with an emerald ruler.
  - Touch: tapping a region selects it (travels there). Hover is never required.
- **Integrity.** The cuts follow real state boundaries. The note that the eight regions are groupings, not
  biogeographic boundaries, stays in the frame. Captive records are drawn as rings. No coordinate is printed except
  each region's own reference point (`data/regions.ts`). The section is `data-geo-quiet`, so the route map does not
  print over it.
- **Fallbacks.** Narrow screens, reduced motion, or no 2D canvas get the previous stacked SVG fragments
  (`FragmentsStacked`). The stage needs no WebGL. Its relief is shaded only once the section is on screen, in idle
  callbacks. The loop runs only while the canvas is on screen and the tab is visible, at half rate when only the air
  is moving. DPR is `pixelRatio(1.5)`, and sprites are 1.2 px/unit on the low tier and 2 otherwise.

### Field of Species: the footage as a window into the world

- `LivingPlate.tsx` / `encounter.css`: the plate is now a window, not a print.
  - Its edges are feathered by intersecting masks, it is graded with the world's ground (soft-light, plus a foot that
    sinks into the ground), and it is larger.
  - The camera behind it drifts slowly (24 s) and leans with the pointer. The footage itself is never warped.
  - Reduced motion removes the drift.
- `world/field/plateVeil.ts`: while the clip is actually playing, the world's photograph of the same animal steps
  back (Thar `Subject.setVeil`, Himalaya panel `uVeil`), so the screen holds one animal, the filmed one, moving in
  its own place.
  - It returns when the plate closes or the clip pauses or fails.
  - The stage is untouched. The plate and the world share only a species id.

### System and micro-interactions

- Emerald tokens are defined in `index.css` (`--color-emerald-200…700`, `--color-obsidian`) and used only for what
  answers the reader:
  - the global `:focus-visible` ring;
  - the primary nav's pointer underline;
  - `.text-link`: the ink line leaves and an emerald one follows in;
  - the Fragments rail, the ruler, the cue, and the species rows (ring on the dot, the name steps in).

## Checks (production build, `vite preview` :4301)

- `npm run build` (tsc + vite + postbuild) passes. `data-integrity.mjs` passes 10/10.
- `imm-frag-journey.mjs`: 35/35 at both 1440×900 and 1920×1080. It covers:
  - 19 forward rests, where the stage agrees with `stopAt`, the live words and the rail name the stop, and nothing
    scrolls sideways;
  - visible drawing change at every step (mean |Δ| 3.1–7.8 per step);
  - backward landing on the forward states;
  - a fling down and up, and a reversal mid-glide;
  - hover lift with the cursor label, and restore on leave;
  - rail focus and Enter;
  - a click on a region;
  - no console errors.

  Frame timing over a steady pass: 59.3 fps (1.2 % slow frames) at 1440, and 54.8 fps (3.4 % slow) at 1920.
- `route-sweep.mjs` (GL=gpu): 100/100 route×width checks clean, including `/atlas`.
- `fos-walk.mjs`: every beat is correct, at most one clip decodes at a time, with no console errors and no failed
  requests. `fos-decode.mjs`: all clips play with WebGL intact.
- `imm-world-motion.mjs`: every field world changes at rest.
- `imm-shots.mjs` captures were reviewed for:
  - phone (390), reduced motion, and no WebGL;
  - the seams into and out of Fragments;
  - both plates.
- `oxlint` on the changed files reports one warning, which already existed (`LivingPlate` `setMounted` in an
  effect).
- The protected files' hashes are unchanged.

Superseded: `fragmap-states.mjs` tested the old sideways track. Wide screens now use `imm-frag-journey.mjs`.

## Recovery

- `~/.cache/ispa-redesign/pre-immersive-18oct.patch`: the full diff before this pass.
- `pre-immersive-18oct-untracked.tgz`: untracked files before this pass.
- `RegionFragments.pre-immersive.tsx` and `editorial.pre-immersive.css`: copies of those two files before this pass.
