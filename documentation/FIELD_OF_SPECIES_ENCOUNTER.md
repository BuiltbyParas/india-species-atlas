# Field of species — living plates and the flagship encounter (18 Oct 2026)

Branch `atlas/master-04-visual-quality`, premium worktree. **Uncommitted.**

"Field of Species" is the home page's featured field-studies index (`src/components/field/FieldStudiesIndex.tsx`,
`#field-studies`, between the Survey plate and Chapter 03). The five studies, their order, their worlds (the field stage,
`src/world/field/stage.ts`) and their `/field/:id` pages are unchanged. The protected files `src/world/field/stage.ts` and
`src/components/field/useFieldStage.ts` are byte-identical to the start of the pass (sha256 `32cd817f…` and `d78d47f5…`).

## What changed

**Three beats per study.** Each study's screen of scroll now reads as name → field notes → credit and the way on
(`phase` 0/1/2 in the index, written as `data-phase` on the composition only when it changes).

- Beat 1 adds the **scientific name** beside "Field study 0N" (FocusText `sci`) and the record's own `summary` sentence,
  labelled "From the record". Nothing is written for it: both come from `src/data/species.ts`.
- Where wild footage of the animal exists, its **living plate** opens out of the world (a clip-path slit across the
  frame, not a fade). Beat 2 shows its credit.

**Treatments by asset, not decoration.**

| Study | Treatment | Why |
|---|---|---|
| 01 Great Indian Bustard | Living plate: a bird calling, filmed in India (Commons, CC BY-SA 4.0) | The only clip of the species, and it is wild |
| 02 Snow Leopard | Living plate: two wild leopards on a Spiti ledge (NCF India / Snow Leopard Trust, CC BY 3.0), plus the tail adaptation quoted beside it (the hanging tail is visible in the clip), plus the **encounter** | The flagship (below) |
| 03 Ganges River Dolphin | World and record photograph, field notes | No clip exists on Commons |
| 04 Bengal Tiger | World and record photograph, field notes | The wild clips are portrait 480 px on a road beside jeeps, or 360p; the rest are zoo footage |
| 05 Rhinoceros | World and record photograph, field notes | Every clip is zoo footage, which would misplace the animal in a floodplain study |

**The flagship encounter** (`Encounter.tsx`). Chosen species: the **snow leopard** — it is the only study with wild
footage in India at a usable size, and the only one of the five with a credible 3D asset at all (a museum scan; every
other model found was stylised, a game asset, or a skull). The "Encounter" control in its plate caption opens a dialog
over the index's frame: the drawn Himalaya stays faint behind, the page is held (`lockScroll`), the subject is on the
left and the field notes on the right: name, scientific name, Red List status from the record, six adaptations
**quoted verbatim** from the Snow Leopard Trust's "Physical Features" page (read 18 Oct 2026; `src/content/encounter.ts`).
Escape and Close end it; Tab stays inside; focus returns to the control. "Enter the field study" goes on to `/field/snow-leopard`.

**The 3D specimen — built, waiting for its file.** `src/world/encounter/specimenScene.ts` (its own lazy chunk, own small
renderer, DPR ≤ 1.5) loads a GLB, stands it on the ground, lights it like the drawn Himalaya, and offers drag to turn
(inertia; pitch limited to −3°…24°), a few degrees of pointer lean on desktop, touch drag on phones, arrow keys and Home on
the keyboard, "Reset view", and pins for the adaptations when a calibration places them. It draws only while something
moves, and disposes geometry, materials, textures and the context when the encounter closes or switches back to footage.
It plays an animation clip only if the file has one (not with reduced motion), and adds no motion of its own to the animal.

The asset is the Natural History Museum Vienna's scan of a mounted snow leopard, **NHMW-ZOO-MAMM-B5555**, on Sketchfab
under **CC BY-NC 4.0**. Sketchfab serves downloads only to a signed-in account, so it is **not in the repository**. To
install it: download it while signed in, save it as `src/assets/models/snow-leopard-nhmw-b5555.glb` (pack a `.gltf` into one
`.glb`; meshopt is decoded, Draco is not), optionally add `snow-leopard-nhmw-b5555.json` with the calibration (`yaw`,
`anchors` as fractions of the bounding box, measured on the model), rebuild. The encounter then offers "Footage /
Specimen" and says what the model is: a 1943 mounted specimen whose fur has aged — not a live animal. **Decide the licence
first:** NC rules out commercial use of the site.

The viewer was verified end to end with a stand-in (the Khronos glTF sample "Fox", copied in for the test and deleted
afterwards; nothing of it is in the tree): load, drag, touch drag, keys, reset, pins turning to face the camera, the
idle viewer stopping its frames, disposal (no canvas left) — at 1440 × 900, 390 × 844 touch, and with reduced motion.

## The VP9 finding (and a fix to the existing study clip)

On this laptop (AMD Renoir, Linux), Chrome 155 and Playwright's Chromium with the GPU on crash their GPU process the
moment a **VP9** video decodes in hardware, and every WebGL context on the page is lost — so a clip playing on the index
dropped the field stage to its flat fallback. AV1 and H.264 play there with WebGL intact. All clips are now **AV1 WebM
with an H.264 MP4 fallback** (`footageSources()` in `src/content/footage.ts`); this also gives Safari without AV1 a clip.
The study page's existing Spiti clip (VP9, shipped 9 Oct) had the same problem on this machine and was re-encoded the same
way. `scripts/audit/fos-decode.mjs` plays every shipped clip beside a live WebGL context.

## Loading and performance

- Only the study in view holds a `<video>` (created when the study becomes current, removed 0.9 s after it is left): the
  walk never found more than one on the page. Clips are 0.76–0.80 MB (AV1); the MP4s download only where AV1 cannot play.
- Plates pause off screen and in a hidden tab; with reduced motion they open as stills and wait for their button.
- If a clip cannot load or play, the plate keeps its still (the clip's first frame); the walk checks this with clips refused.
- Measured (`scripts/audit/fos-perf.mjs`, production build, 1440 × 900, GPU, two alternating runs each; this laptop's
  noise is about ±6 fps): Thar world with the bustard's plate playing 40.4 / 42.2 fps (p95 83 / 67 ms) against
  43.5 / 43.4 fps (p95 50 ms) with the plate held as a still — a few fps and some longer frames, from decoding beside the
  heaviest world. Himalaya with the leopard's plate: 60.2 fps either way. Encounter open with footage: 60.2 fps.
  The specimen viewer was not measured with the real model (not installed).

## Checks run (all on the production build unless noted)

- `npm run build` (tsc + vite + postbuild) passes; `oxlint` on the new files: warnings only (the repo's one lint error,
  `video/src/scenes/himalaya.ts`, predates this pass).
- `scripts/audit/data-integrity.mjs` 10/10; `scripts/audit/route-sweep.mjs` (GL=gpu) 100/100.
- `scripts/audit/fos-walk.mjs`, three beats per study: all five at 1440 × 900; 01, 02, 04 at 390 × 844 (touch, DPR 2);
  01, 02 with reduced motion; 01, 02, 05 without WebGL; 01, 02 with the clips refused — no console errors, no failed
  requests of its own, no horizontal overflow, never more than one video element.
- `scripts/audit/fos-encounter.mjs`: 11/11 (footage), 11/11 with no WebGL, 19/19 with the stand-in specimen in dev at
  1440, at 390 touch, and with reduced motion.
- `scripts/audit/footage-check.mjs` (study page clip): hover, keyboard, button, off-screen pause, reduced motion and the
  failure fallback behave as before (its failure case now refuses both sources).
- Captures: `~/.cache/ispa-redesign/fos-before/` (before) and `~/.cache/ispa-redesign/fos-after/` (after).

## Open

- The specimen file and its licence decision (above). Pins need the calibration measured on the real model.
- The tiger, dolphin and rhinoceros have no usable wild footage; if the user has licensed clips, `PLATE_FOOTAGE` takes them.
- The bustard's plate costs a few fps in the Thar on this laptop; if that matters, its clip could drop to 960 px.
