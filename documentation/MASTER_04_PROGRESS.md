# Master 04 — progress (recovery audit)

*Written 9 October 2026, after two Master 04 sessions ended mid-run. This is the record to resume from. Read it before starting any Master 04 work.*

## 1. Where the work stands

| | |
|---|---|
| Worktree | `~/india-species-atlas-premium` |
| Branch | `atlas/master-04-visual-quality`, safe to continue on |
| Checkpoint | `eec3bc4` (checkpoint 1, bustard); checkpoint 2 (snow leopard) follows it. |
| Working tree | Clean at the time of this audit. This file is the only change. |
| Main checkout | `~/india-species-atlas` on `reel-60` holds uncommitted reel work. It is not touched by Master 04. |
| Pushed / merged | Nothing. |

**Summary.** No source file has been changed by Master 04. Everything done so far is investigation, plus scratch assets kept outside the repository (§3). The visual redesign has not started.

## 2. The brief, reconciled

Two Master 04 briefs were given on 9 October. Where they differ, the later one governs.

1. **"Master 04 — Visual art direction, environment detail & complete field-study navigation"** (the long brief). It asks for an audit, then five better habitats, then complete study-to-study navigation, then photography, performance, browser QA and documentation.
2. **"Master 04 — Critical art-direction correction"** (later). It puts wildlife and habitat first, with no forced concepts. It removes these devices:
   - power lines and electrical towers;
   - glowing routes and paths;
   - floating graphics;
   - excessive contour lines;
   - random particles;
   - decorative HUD elements;
   - one gimmick per animal.

   Each animal must be clearly recognisable, in a habitat that is visibly its own.

**Decision already made by the user:** each animal appears as a **cut-out of a licensed Wikimedia Commons photograph**. It is placed in its drawn habitat with matched light and a ground shadow, and labelled as such ("Photograph by X, cut out; the landscape is drawn"). It is not a 3D model or a silhouette figure.

**Standing constraints for every remaining stage:**

- **Power lines.** No power lines, pylons, glowing paths, floating markers, particle clutter or repeated conceptual devices. The bustard's power-line threat stays in the text only, because the record gives no route.
- **The bustard.** The Great Indian Bustard stays in. It is shown in the Thar's open arid grassland: sparse native grass, open ground, a wide horizon. It is not a desert of dunes and lines.
- **Habitats.** Each study gets its own terrain, light, colour grade, foreground and camera language:
  - Thar: warm, open grassland;
  - Himalaya: cold rock and snow;
  - river: banks, water depth, a lowland floodplain;
  - central Indian forest: layered, selectively lit, not black pillars;
  - Brahmaputra floodplain: tall grass, wallows, tree line.
- **Navigation.** Every study ends with a clear completion state. It also needs:
  - a **Previous** study link and a **Next** study link, as real links or buttons;
  - **Back to all field studies**;
  - chapter progress (`07 / 07`);
  - keyboard access and touch support;
  - reduced-motion support.
  - After study 05, the reader gets a meaningful return to the index (and a route to the map).
- **Honesty.** Cut-outs and drawn landscapes are labelled. Photographs are credited with their licence. No figure, status or range is added without a source.
- **Process.** Work in small stages. Commit each one. Do not push or merge. Leave the reel and video work alone.

## 3. What has been done

### 3.1 Investigation (complete)

- **Code read.** All five worlds, `stage.ts`, `cameraRig.ts`, `grounds.ts`, `gl/photo.ts`, `gl/terrain.ts`, `FieldStudyPage.tsx`, and the field docs (`FIELD_EXPERIENCES.md`, `MASTER_03_FINAL_INTEGRATION.md`).
- **Baseline captured.** A production build of `f9c1c92` was screenshotted at 1440 × 900 in headless Chromium (GPU through ANGLE/GL): every chapter of every study, plus the page end. That is 42 frames, with **0 console errors and 0 failed requests**.
- **Defects confirmed in the baseline:**

| Study | Defect seen in the render | Cause in code |
|---|---|---|
| Bustard (Thar) | Dunes read as corrugated stripes. Grass is hairlines. Pylons and wires dominate chapters 3–6. The photograph is a rectangle that rises out of the sand. | `grounds.ts › dunes()`: one regular crescent wavelength, and a hard `smoothstep` terminator in the ground shader. Pylons and wires in `worlds/thar.ts`. |
| Snow leopard (Himalaya) | Dark grey terrain carried by contour lines. No rock or snow definition. The photograph is a vignetted rectangle. | One heightfield, with contour isolines as the main detail. Snow is gated by `uSnow`. Flat `uStone`/`uLit` mix. No background ranges. |
| Dolphin (river) | An abstract blue ribbon in black. No banks or land. The photograph is a blurred rectangle under the water. | `worlds/river.ts`: a single plane, with `uBank` near black. The photo is a rect inside the water shader. Plus the 720 px texture on the balanced tier. |
| Tiger (forest) | Mostly black. Dark cylinders cover the frame. The tiger is visible only in a lantern pool. Chapter 3 ("1973") is an empty dark screen. | `worlds/forest.ts`: bark ambient `* 0.035`, so it is lit only by the lantern. 230 instanced open cylinders. The photo shows only inside the lantern falloff. |
| Rhino (floodplain) | A grey clay figure. Spike grass on a flat brown floor. Black sky. The photograph is pixelated by the point grid. | `buildForm()` inflates the 2D silhouette. Instanced blades on an untextured ground. No sky dome. |
| All | **End of study:** the "Next field study" heading sits at the very bottom of the last chapter and is cut off at the fold (bustard, tiger, rhino, dolphin). There is no Previous link, no completion state, and "Field studies" is a small corner link. | `chapters.tsx`: the next-study block is the last element of the final chapter. `FieldStudyPage.tsx`: the HUD has progress plus exit only. |

### 3.2 Assets, sourced and checked for licence (not yet in the repository)

Higher-resolution originals were downloaded from Wikimedia Commons. All carry licences that allow reuse and modification, with attribution (and share-alike where marked).

| Study | File on Commons | Size | Licence | Note |
|---|---|---|---|---|
| Bustard | `Great_Indian_Bustard_Ardeotis_nigriceps_by_Raju_Kasambe_DSCN9716_09.jpg` (Dr. Raju Kasambe) | 4608 × 3456 | CC BY-SA 4.0 | The dataset's own photograph, at full size. The birds are small in the frame, so it needs a crop. |
| Snow leopard | `Irbis4.JPG` (Irbis1983) | 1575 × 1181 | Public domain | The dataset's own photograph. This is the largest version that exists. |
| Dolphin | `Ganges_River_Dolphin_sighted_in_Koshi_Barrage_(cropped).jpg` (Anant.wildlife) | 2441 × 2011 | CC BY 4.0 | The dataset's own photograph. |
| Tiger | `Bengal_tiger_in_Sanjay_Dubri_Tiger_Reserve_December_2024_by_Tisha_Mukherjee_11.jpg` | 4391 × 2927 | CC BY-SA 4.0 | The dataset's own photograph. |
| Rhino | **New:** `Indian_rhinoceros_in_Kaziranga_National_Park_March_2025_by_Tisha_Mukherjee_08.jpg` | 3927 × 2805 | CC BY-SA 4.0 | A clean full side profile on open grass. Chosen because the dataset photograph (Payamfarahani) has branches across the neck and a signature watermark, so it cannot be cut out cleanly. It would be a **field-study-only** asset. The species record's own photograph would stay unchanged unless the user decides otherwise. |

### 3.3 Subject masks (trial results)

Made with `rembg` 2.0.85 on the CPU, model `isnet-general-use`, with alpha matting:

- **Rhino:** clean and well edged. Usable.
- **Tiger:** good. Some grass is kept around the lower legs, which foreground grass in the scene will cover. Usable.
- **Snow leopard:** **not usable.** The mask keeps a block of snow, loses most of the tail, and leaves a dark hole.
- **Bustard, dolphin:** not yet masked with this pipeline. The other session made low-resolution trial masks of the dataset's 1400 px files.
- **BiRefNet:** a second model was tried. Both runs ended the session before finishing. The likely cause is running out of memory: the machine has 5.7 GB, with about 1.7 GB free, and two sessions were each loading a model. **Run masks one at a time, with a small model, and nothing else heavy running.**

**Where these files are** (temporary, in `/tmp`, lost on reboot):

- Session 87ad008a scratchpad:
  - `orig/` holds the five originals (`bustard.jpg`, `leopard.jpg`, `dolphin.jpg`, `tiger.jpg`, `rhino.jpg`) and `rhino-meta.txt`;
  - `masks/` holds the three ISNet cut-outs;
  - `mask.py` is the mask script;
  - `cap.mjs` is the chapter capture script;
  - `base/` holds the baseline screenshots and contact sheets;
  - `baseline-dist/` is the baseline build;
  - `venv/` contains rembg.
- Session 2f45a6f0 scratchpad:
  - `before/` and `sheet-before-*.jpg` are a second baseline set;
  - `hi/` and `hi/crop/` are hand-cropped subjects;
  - `cut/` holds low-resolution ISNet masks for all 12 species.

If `/tmp` has been cleared, all of this can be re-made: the Commons file names are listed above.

### 3.4 Recovery (9 October 2026, after a third session ended mid-run)

The session that was re-cutting the snow leopard ended before it saved a result (no `leopard-bf.png` exists). **No new cut-out was produced.** The sources and the successful trial masks were copied out of `/tmp` into **`exports/master04-sources/`**. That folder is inside the project, git-ignored (`/exports/`), and nothing was overwritten (`cp -n`). Every file was opened and decoded successfully.

| Folder | Contents | Status |
|---|---|---|
| `originals/` | Full-size Commons originals: `great-indian-bustard.jpg` (4608×3456), `snow-leopard.jpg` (1575×1181), `ganges-river-dolphin.jpg` (2441×2011), `bengal-tiger.jpg` (4391×2927), `indian-rhinoceros-kaziranga-mukherjee-08.jpg` (3927×2805), plus `rhino-meta.txt` (URL, author, licence of the rhino) | Recovered |
| `masks/` | `bengal-tiger-isnet.png` (2400×1600 RGBA), `indian-rhinoceros-isnet.png` (2400×1714 RGBA): the two **good** cut-outs, reusable as they are. `snow-leopard-isnet-DEFECTIVE.png`: kept for reference only, **do not ship** (snow block kept, tail lost). | Tiger, rhino: recovered. Leopard: defective. |
| `crops/` | The other session's hand crops, made from 3840 px Commons renditions: bustard 2300×1150, dolphin 1300×800, snow leopard 1100×1181, tiger 3000×1700. | Recovered. **Caution:** its rhino crop (1900×1200) is of the *dataset's* Payamfarahani photograph, not the chosen Mukherjee photograph. Do not use it. The leopard crop trims the tail. |
| `lowres-trial-masks/` | 1400 px greyscale trial masks for all five from the dataset's own files | Reference only |

**Missing (still to make):** the snow leopard's mask, the bustards' cut-out, the dolphin's cut-out, and every final WebP. The tiger and rhino masks still have to be converted to WebP and checked over dark and light grounds.

**Source files not copied** (they can all be re-downloaded from the Commons URLs in §3.2): the other session's `hi/` renditions, baseline screenshots (`base/`, `before/`, contact sheets) and the baseline build (`baseline-dist/`). Everything else in `/tmp` can be left to expire. The Python environment with `rembg` is in the 87ad008a scratchpad; the model files are already in `~/.rembg/models/` (`isnet-general-use`, `birefnet-general-lite`, `birefnet-general`).

**Memory at the time of the audit:** 5.76 GB total, about 4.6 GB used and 1.1 GB available (a browser and the desktop account for most of it). No model, browser or server process was running. Before the next model run, close the browser and other apps and check `free -m` shows at least 2.5 GB available.

## 4. Files modified

None in the repository, apart from this document (`documentation/MASTER_04_PROGRESS.md`).

## 5. Tests and checks run

| Check | Result |
|---|---|
| `npm run build` on `f9c1c92` | Passed (tsc + vite + postbuild; 23 route pages written) |
| Baseline capture, 5 studies × all chapters, 1440 × 900 | 42 screenshots; 0 console errors; 0 failed requests |
| Typecheck / lint after changes | Not run: there are no changes yet |
| Performance baseline | Not run in Master 04. The last figures are in `MASTER_03_FINAL_INTEGRATION.md` §3: studies run at 0 slow frames; the home page drops frames on a fast scroll. |

## 6. Remaining tasks (in order, each one small and committed on its own)

1. **Make the subject assets durable.** Run the five cut-outs one at a time, re-doing the snow leopard and adding the bustard crop and the dolphin. Check each over a dark and a light ground. Write them as WebP with alpha (a large and a small size) to `src/assets/field/`. Record the source, author, licence and "cut out from the original" for each in a manifest. Commit.
2. **The field-study navigation and end of study** (functional; independent of the art). Each study gets:
   - a completion section with `Field study 0N complete · 07 / 07`;
   - a prominent **Continue to <next animal>** button;
   - **Previous study** and **Back to all field studies**;
   - for study 05, a return to the index plus **Open the map**;
   - a small, consistent previous/next control beside the progress line.

   Check it with the keyboard, on touch, under reduced motion, and at 390 px. Commit.
3. **A shared subject layer** (`world/field/gl/subject.ts`): the cut-out as a camera-facing plane standing on the ground, with:
   - a contact shadow;
   - a colour match to the world's light;
   - atmospheric depth;
   - one gentle reveal (no per-animal trick).

   Commit.
4. **Rhino / floodplain.** Remove the clay form and the point morph. Place the rhino cut-out in tall elephant grass with wallows, a distant tree line and a hazy sky. Commit.
5. **Tiger / forest.** Add moonlit or dawn ambient light so the bark has form. Use fewer, varied trunks clear of the subject lane, plus undergrowth and leaf litter. Remove the lantern mechanic. Give the tiger a clear key light. The 1973 chapter keeps the tiger in view. Commit.
6. **Bustard / Thar.** Replace the corrugated dunes with open arid grassland: gentle ground, clumped grass and scrub, a long horizon and a warm low sun. Remove the pylons, wires, diverters and the survey line. Commit.
7. **Snow leopard / Himalaya.** Give the rock and snow real definition: lit faces, strata, snow on gentle slopes. Add background ranges with atmospheric perspective. Contours become faint or are removed. The leopard goes on a ledge. Commit.
8. **Dolphin / river.** Add banks, sandbars (char), a land and vegetation strip, depth colour and reflections in the water. The dolphin surfaces in the channel. Remove the glowing threads and markers that do not earn their place. Commit.
9. **Copy and honesty notes.** Update each study's notes and credits for the cut-outs, the drawn landscapes and the removed devices. Update `content/fieldStudies.ts` and the chapters where the removed devices were described.
10. **Performance:** measure the studies and the home page against the baseline, on an idle machine with one browser.
11. **Final QA and documentation:**
    - screenshots at 1440, 1280, 768 and 390;
    - build, typecheck and lint;
    - `MASTER_04_VISUAL_AUDIT.md` and `MASTER_04_VISUAL_RESULTS.md`;
    - final commits.

    Do not push or merge.

**Run constraints learned:** one heavy process at a time on this 5.7 GB machine: no parallel mask models, no parallel browsers, no second dev server.

## 7. (Superseded: see §9) The earlier next task

**Task 1, resumed: make the subject assets durable.** The sources are in `exports/master04-sources/originals/` and the two good masks are in `masks/`. Do not redo the tiger or the rhino mask.

1. Close the browser and other apps. Confirm `free -m` shows at least 2.5 GB available. Run **one** `rembg` inference at a time, with `OMP_NUM_THREADS=2`, no alpha matting, and the session released after each run.
2. Cut out the **snow leopard** with `birefnet-general-lite` on `originals/snow-leopard.jpg` (full frame, so the tail is kept). Remove any leftover snow by hand if the model keeps it.
3. Crop and cut out the **bustards** (`originals/great-indian-bustard.jpg`, around the two birds with margin) and the **dolphin** (around the dolphin, keeping the whole body and the tail).
4. Review all five over a dark and a light ground.
5. Save them as WebP with alpha, about 1600 px and 800 px on the long side, in `src/assets/field/`. Use names like `bengal-tiger.cutout.webp` and `bengal-tiger.cutout-800.webp`.
6. Add `src/assets/field/CREDITS.md` with the source URL, author, licence and "cut out" for each. The rhino's source URL, author and licence are in `rhino-meta.txt`.
7. Commit the assets and the credits file only. Do not touch any world code.

If a model cannot be run safely, stop and record the exact stopping point here.

## 8. Change of strategy: environment first (9 October 2026)

Background-removal inference is **no longer a prerequisite**. Three sessions ended while running segmentation models on a 5.7 GB machine. From here:

- **No segmentation model is run.** The tiger and rhino cut-outs in `exports/master04-sources/masks/` stay available for later use. Animals without a good cut-out use their photograph as an **integrated habitat panel**: the photograph is cropped to the animal and its real surroundings, stands in the drawn ground, dissolves into the haze at its edges and has its foot hidden by foreground vegetation.
- **Each species is one small checkpoint**, in this order: bustard (done), snow leopard, dolphin, tiger, rhino. After the five, the navigation and end-of-study state, then the build, type checks and a full visual QA.
- A single, sequential browser check is allowed per species (one server, one headless browser, a few screenshots) when memory shows at least 2 GB available. Nothing else runs at the same time.
- No power lines, contour gimmicks, lanterns, point morphs, glowing paths, particles or decorative overlays. The animal and its habitat set the art direction, and each habitat has its own ground, light, grade and camera.

### 8.1 Checkpoint 1: Great Indian Bustard (Thar arid grassland) — done

What changed (files):

| File | Change |
|---|---|
| `src/world/field/worlds/thar.ts` | Rewritten. Removed: the corrugated dune ground, the survey line, pylons, wires, bird diverters, the protected-route line, the dust particles and the rising-photograph effect. Added: open arid grassland (patches of buff sand, red-brown earth and pale gravel, straw where the grass is thick, tussock footprints, pebbles); 9,500 / 6,200 / 3,200 instanced dry-grass tussocks (high / balanced / low) with wind sway and low-sun backlight, plus a taller row in front of the birds; thorn-scrub clumps (60 / 42 / 24) on the flanks and far out; a pale sky with high thin cloud and a low sun that drops as the study closes; a new camera path (wide open, low walk, the birds from the other side, close, aerial for the evidence, down in the grass, pull-back). |
| `src/world/field/grounds.ts` | New `grassland()` height function (gentle swells and low hummocks, no crests); added to `GROUNDS`. `dunes()` is kept but now unused. |
| `src/assets/field/great-indian-bustard-habitat.webp` | New (175 KB, 2000 × 1038): the record's photograph cropped to the birds and their scrub. |
| `src/assets/field/CREDITS.md` | New: source URL, author, licence and modification. |
| `src/components/field/chapters.tsx` | Bustard notes rewritten: the grassland is drawn, the birds are the record's photograph; the survey-line note is removed; the threat note says the record gives no route, so none is drawn. |
| `src/content/fieldStudies.ts` | Chapter label "Power line" → "Threat"; header comment and missing-content note updated. |

Validation:

- `npx tsc -b`: pass. `npx oxlint src/world/field src/components/field src/content`: pass (exit 0). `npm run build`: pass.
- One sequential headless Chromium pass at 1280 × 800 (GPU through ANGLE/GL), all seven chapters, reviewed as screenshots: **0 console errors, 0 failed requests**. Habitat distinct from the other four: yes (warm, open, buff and straw, pale sky). Bird visible and recognisable in every chapter except the aerial and pull-back shots, where it is small by design. No decorative elements.
- Defects found in the first renders and fixed: birds too small and washed in haze; chapter text sitting on the birds; a scrub dome poking in front of the panel; the panel's top and side edges showing as a faint window; scrub reading as smooth green hills.

Known limitations after this checkpoint:

- The birds are a **photograph panel, not a cut-out**. At the oblique "threat" angle and from the aerial shots it is visibly a standing panel. The edges are feathered and flanked by scrub, but it is not a true 3D bird.
- The scrub clumps are smooth domes with a procedural leaf pattern; at close range they still read a little like low hills or boulders.
- Chapters 2 and 5 are "hold" chapters; their lists and map overlap the progress bar at 1280 × 800. This is a Master 03 layout problem that affects every study and is left for the navigation task.
- The verb labels (TRACE, ASCEND, DRAG, REVEAL, TRANSFORM) and the index previews still describe the old gimmicks. They are changed together in the copy task for all five studies.
- Only 1280 × 800 was checked. Phone, tablet, reduced motion and the no-WebGL fallback have not been re-tested for this world. No performance measurement was taken.

### 8.2 Checkpoint 2: Snow Leopard (the high Himalaya) — done

What changed (files):

| File | Change |
|---|---|
| `src/world/field/worlds/himalaya.ts` | Rewritten. Removed: contour isolines, the habitat-band wash, falling snow, the contour-ink photograph reveal, the altitude-driven camera climb. Added: a lit terrain shader (rock in grey, brown and slate fields with strata; snow on gentle slopes and ledges, off the steep faces; a low side sun, blue shadow; fine relief from noise; aerial perspective that goes paler and bluer with distance); a clear sky with thin cirrus; a near ground sheet (1000 × 560) and a far sheet (5200 × 2400) so ranges stand behind the valley; 12 faceted boulders (snow only on their upward faces) around the panel's edges and foot; the leopard as a habitat panel on a snowy terrace; a new camera path; the sun warms and lowers as the study closes. |
| `src/world/field/grounds.ts` | `mountains()` rewritten (valley that meanders, rising walls, massifs, spurs and gullies that fade with distance so the far sheet does not alias, broken crags across the middle ground, and a flat-ish terrace for the leopard). New export `LEDGE`. `MOUNTAIN_MAX` removed (nothing else used it). |
| `src/assets/field/snow-leopard-habitat.webp` | New (158 KB, 1955 × 1381): the record's whole photograph (Irbis4.JPG, public domain), padded with blurred, snow-tinted reflection on the left, right and top so the panel's edges can fade without touching the animal. The bottom is not padded, so the tail is kept to the frame's edge. |
| `src/assets/field/CREDITS.md` | Row for the new asset. |
| `src/components/field/chapters.tsx` | Removed the altitude scale (`AscentScale`) and the study-instrument entry. Chapter 1 note and chapter 3 copy rewritten (no contours, no "the camera climbs"; the band is stated as the record's and the drawn heights as not measured). |
| `src/content/fieldStudies.ts` | Chapter labels (The mountain, Habitat, Altitude, Distribution, Photograph, Range, Conservation, Why it matters); header comment and missing-content note updated. |
| `src/components/field/field.css` | Snow-leopard colours for a light tone; all `.fs-ascent*` rules removed. |
| `src/pages/FieldStudyPage.tsx`, `src/components/field/FieldStudiesIndex.tsx` | The snow leopard now uses the light tone (dark ink on a pale world). |

Validation:

- `npx tsc -b`: pass. `npx oxlint src/world/field src/components/field src/content src/pages`: pass (one existing warning in `SpeciesWorldPage.tsx`, not touched). `npm run build`: pass.
- One sequential headless Chromium pass at 1280 × 800 over all eight chapters (GPU through ANGLE/GL): **0 console errors, 0 failed requests**. Reviewed as screenshots:
  - leopard visible, recognisable and whole in chapters 1–5, 7 and 8, tail included; small by design in the aerial chapter 6;
  - mountains: three planes (terrace, valley walls, ranges) with snow, exposed rock and strata; the far ranges are paler and bluer; no contour lines, scale, particles or overlays;
  - chapter text sits beside the leopard and not on it in every frame.
- Defects found in the first renders and fixed: needle-like peaks (aliasing on the far sheet's coarse cells: detail now fades with distance); a rectangular card around the photograph (padding, longer fades, rock and snow terrain around it, boulders on its flanks); the leopard too large and cut off in the close-up; the title overlapping the head; boulders that read as white plastic (snow now only on upward faces, darker rock); a GLSL reserved word (`flat`).

Known limitations after this checkpoint:

- The leopard is a **photograph panel, not a cut-out**. From a steep or side angle it is a standing picture, and its top edge shows a faint pale haze where the padding fades.
- The boulders are soft and lumpy rather than hard-edged; the foreground snow is smooth and bright, with little texture beyond a noise bump.
- The mid-ground is mostly desaturated grey and brown: the rock reads as rock but has little colour variety. The aerial "Range" chapter is hazy and low in contrast.
- There is no cast shadow from the mountains: shading is from the surface normal only.
- Only 1280 × 800 was checked. Phone, tablet, reduced motion, the no-WebGL fallback, the index preview and performance were not re-tested for this world.
- The site header's dark gradient over the light world is the Master 03 navigation, left alone.

**Environment lesson (browser checks).** Headless Chromium failed (`ERR_INSUFFICIENT_RESOURCES`, lost WebGL contexts, "Page crashed", truncated screenshots) once `/tmp` was 80% full: `/tmp` is a RAM-backed tmpfs and holds about 2.2 GB of earlier sessions' scratch folders. What worked: run the browser with `TMPDIR` on disk (`TMPDIR=$HOME/.cache/ispa-tmp node cap.mjs …`) and write screenshots to disk (`~/.cache/…`), not to `/tmp`. Nothing in `/tmp` belonging to earlier sessions was deleted.

### 8.3 Checkpoint 3: Ganges River Dolphin (a lowland river) — done

What changed (files):

| File | Change |
|---|---|
| `src/world/field/worlds/river.ts` | Rewritten. Removed: the ripple simulation and the hand-writes-into-the-water gesture, the river line, the dashed barrages, the silt particles, the thread and rings of localities, the map lines, the photograph refracted under the water, and the black ground. Added: a drawn lowland river (a meandering channel of changing width) with a long gentle sand beach and a green levee on the near side, a steeper layered-silt cut bank and a tree line on the far side, six sandbars in the channel, and open floodplain behind; water shaded by the depth of the bed beneath each point (pale and sandy where it shoals, darker olive where deep; turbid, grey-green), reflecting a soft sky and the dark far bank, with fine current streaks and a quiet low-sun glint; reed and grass at the water's edge, on the bars and on the levee (7,000 / 4,600 / 2,600); 560 / 400 / 230 trees; a hazy sky with soft layered cloud; the light lowers and warms as the study closes; a new camera path (low on the water, a wider habitat view, the whole bend from above for the record's localities, in close, wide, and a pull-back). The dolphin is a photograph panel that turns to face the camera; its waterline is the drawn surface, the part below is hidden by the water, and a faint ring spreads from it. |
| `src/assets/field/ganges-river-dolphin-habitat.webp` | New (126 KB, 1700 × 730): the record's photograph cropped to the animal and its water. No background-removal model was run. |
| `src/assets/field/CREDITS.md` | Row for the new asset (Anant.wildlife, CC BY 4.0). |
| `src/components/field/chapters.tsx` | Dolphin chapters: the gesture note, the drag band text and the schematic-barrage note replaced by notes that the river is drawn, that the thread is gone and the localities are listed, and that no barrage is drawn. The `RiverBand` drag control and `StudyInstrument` removed. |
| `src/pages/FieldStudyPage.tsx`, `src/components/field/FieldStudiesIndex.tsx` | The dolphin uses the light tone. `StudyInstrument` no longer rendered. |
| `src/components/field/field.css` | River colours for a light tone; the unused `.fs-band*` rules removed; the IUCN status mark takes the study's ink (it was pale on a light ground, illegible on this world; this also helps the bustard and snow leopard, whose scenes are untouched). |
| `src/content/fieldStudies.ts` | Chapter labels (The river, Habitat, Distribution, The dolphin, Pressure, Conservation, Why it matters); header comment and missing-content note updated. |

Validation:

- `npx tsc -b`: pass. `npx oxlint src/world/field src/components/field src/content src/pages`: pass (the one existing warning in `SpeciesWorldPage.tsx`, not touched). `npm run build`: pass.
- Sequential headless Chromium pass at 1280 × 800 (TMPDIR and screenshots on disk; 2.1 GB available beforehand), all seven chapters plus the page end, repeated after each fix: **0 console errors, 0 failed requests**, no lost WebGL context.
- Reviewed as screenshots: the dolphin is recognisable and whole in chapters 1, 2, 4, 5, 6 and 7 (small by design in 2, 6 and 7); hidden by design in chapter 3, the aerial view. The title in chapter 1 sits below the dolphin, and the chapter text sits beside it in every frame. The water has depth colour, shoaling over the bars and a reflected sky; banks, bars and a tree line give three planes; the scene does not resemble the grassland or the mountains.
- Defects found in the first renders and fixed: a shader reserved word (`patch`); trees that read as boulders (smaller, many more, diagonal striping removed); sand too bright and cream; a pale halo around the photograph (tighter oval; the photograph's own water is recoloured to the river's, keyed on a blurred copy so the animal is not speckled); the title over the dolphin; the dolphin cut by the screen edge; the last chapter's text covering the dolphin; the IUCN mark unreadable.

Known limitations after this checkpoint:

- The dolphin is a **photograph panel, not a cut-out**. A faint lighter patch of the picture's water is still visible around it, most in the close chapter. Seen from the side the billboard turns only up to about 70°, so the animal is slightly rotated in the wide shots; from above the panel fades out.
- The photograph is one pose (the head and back above water). It is the record's only picture.
- The trees are soft, smooth blobs of leaf noise; the reeds are flat blades. At the aerial height the trees are dots.
- The water has no refraction, no seabed texture and no shoreline foam; the far bank's silt layers are subtle at distance. There is no cast shadow.
- Chapters 3 and 5 are "hold" chapters: their lists overlap the progress bar at 1280 × 800 (the Master 03 layout problem noted in 8.1, left for the navigation task).
- The verb label "DRAG" and the index preview still describe the old gesture, and the dolphin's index preview was not re-checked. Both are changed together in the copy task.
- Only 1280 × 800 was checked. Phone, tablet, reduced motion, the no-WebGL fallback and the index preview were not tested for this world. No performance measurement was taken. The two lower quality tiers were not rendered.

### 8.4 Checkpoint 4: Bengal Tiger (a central Indian forest) — done

Causes of the pillar-like look in the old scene (`forest.ts` at `59bf48f`/`e43a39e`): bark lit only by a hand-carried lantern (ambient 0.035), so the forest was black; 230 identical open cylinders as the only vegetation (no canopy, understory, litter or grass); a near-black floor; the photograph visible only inside the lantern's falloff, as a rectangle; and trunks that collapsed into map marks.

What changed (files):

| File | Change |
|---|---|
| `src/world/field/worlds/forest.ts` | Rewritten. Removed: the lantern and the hand light, the motes and halo, the trunk-to-map collapse, rings and map lines, the photograph in the dark. Added: morning sun, low and warm, from the camera's side, broken by the canopy into patches of light on the floor, trunks and grass, with cool green shade between; 440 / 310 / 190 tapering trunks with buttress feet, fissured bark and per-tree colour, in clumps and gaps, with a clear lane for the camera and a small clearing for the tiger; a roof of 460 / 320 / 190 crowns (seen from above in the Reserves chapter); 120 / 85 / 50 low shrubs; 6,000 / 4,000 / 2,300 grass tufts, dry at the tip, and a row in front of the tiger's feet; six fallen logs; a leaf-litter floor with bare earth and green cover; haze for distance (thinner when the camera is high); a new camera path (eye level in the clearing, alongside, above the crowns, back). The tiger is the earlier cut-out, a camera-facing panel that stands in the clearing with a soft ground shadow, colour-matched to the light, with its faint feet hidden in grass. |
| `src/assets/field/bengal-tiger-cutout.webp` | New (290 KB, 1500 × 750, transparent): the earlier ISNet cut-out (`exports/master04-sources/masks/bengal-tiger-isnet.png`) cropped to the animal. Edges checked over a mid-green ground: clean; the lower legs are faint and are covered by grass in the scene. No segmentation model was run in this checkpoint. |
| `src/assets/field/CREDITS.md` | Row for the cut-out (Tisha Mukherjee, CC BY-SA 4.0). |
| `src/components/field/chapters.tsx` | Tiger chapter 1 note ("Move the light") replaced by a note that the forest is drawn and the tiger is a cut-out photograph; chapter 4 lede and note rewritten (the reserves are listed, not drawn). The 1973 Project Tiger chapter is unchanged. |
| `src/components/field/field.css` | Tiger ground and line colours; the title sits lower (13svh; 12svh on narrow screens) so the tiger stands above it. |
| `src/content/fieldStudies.ts` | Chapter labels (The forest, Habitat, Project Tiger, Reserves, Estimate, Pressure, Why it matters); header comment updated. |

Validation:

- `npx tsc -b`: pass. `npx oxlint src/world/field src/components/field src/content src/pages`: pass (the one existing warning in `SpeciesWorldPage.tsx`). `npm run build`: pass.
- Sequential headless Chromium pass at 1280 × 800 (TMPDIR and screenshots on disk; about 2.1 GB available beforehand), all seven chapters plus the end, repeated after each fix: **0 console errors, 0 failed requests**, no lost WebGL context.
- Reviewed as screenshots: the tiger is recognisable, whole and above the title in chapter 1; it stands beside the text in chapters 2, 3, 5 and 7 and sits in the left of the frame in chapter 6. The forest has trunks at several distances in haze, understory, grass, litter and patches of light; it looks nothing like the grassland, mountains or river. No lantern, particles, marks or overlays.
- Defects found and fixed along the way: a fallen log scaled to a wall by the trunk shader's foot flare (logs now share the same footing); trunks and crowns drawn into the camera's lane; floating foliage blobs (removed); flat-faceted crowns (welded and smoothed); crowns melting into smears (coarser leaf pattern, higher up); a trunk beside the camera in chapter 6; the tiger cut by the frame in chapter 5.

Known limitations after this checkpoint:

- The tiger is a **photograph cut-out on a flat panel**. It turns to face the camera (not past about 35°) and fades from above, so from a steep or side angle it is a standing picture. The cut leaves its lower legs and paws faint; grass hides them, but in close frames they look soft. Its light is the photograph's own, only tinted.
- The crowns seen from above (chapter 4) read as a carpet of green blobs with a hatched leaf pattern; there is no individual tree structure, and a few shrubs read as smooth domes.
- Trunks have no branches; bark is a fissure pattern, and nearer trunks smear a little vertically. No cast shadows: the patches of light are a noise mask.
- In chapter 6 the tiger is cropped by the left edge (its tail and hindquarters); in chapter 5 its face is large.
- "Hold" chapters (4, 5, 6) overlap the progress bar at 1280 × 800 (the Master 03 layout issue, left for the navigation task).
- The verb label "REVEAL" and the index preview still describe the old lantern; changed in the copy task. The index preview was not re-checked.
- Only 1280 × 800 was checked. Phone, tablet, reduced motion, the no-WebGL fallback and the lower quality tiers were not tested; no performance measurement was taken (the scene draws about 7,000 grass blades-tufts, 500 trunks and 500 crown meshes on the high tier).

### 8.5 Checkpoint 5: Greater One-horned Rhinoceros (the Brahmaputra floodplain) — done

Causes of the weak old scene (`floodplain.ts` at `9625c63`): the animal was a heavy matte form raised from the atlas's schematic silhouette (grey-boulder / clay look, by construction), on dark wet earth; the story was told by a point morph (one point per animal), a route, rings and map lines instead of a habitat; the ground was near-black; and the real photograph appeared only at the end as a flat plane.

What changed (files):

| File | Change |
|---|---|
| `src/world/field/worlds/floodplain.ts` | Rewritten. Removed: the clay form, the point morph and its figures, the route, rings, map lines, the photograph plane, the heightfield. Added: a sky dome (haze at the horizon, pale zenith, thin cloud, hazy low sun); a ground shader of turf, trodden earth and dark wet mud, with three wallows and a long shallow beel behind (turbid olive water that takes the sky at low angles, with a reflected far tree line); short turf (9,000 / 6,200 / 3,600 tufts), medium grass, tall elephant-grass stands standing over the animal (6,500 / 4,600 / 2,800), reeds at the wallows and the beel edge; a low line of riverine-forest canopy on the far shore (260 / 180 / 110 broad crowns), softened by haze; a new camera path (eye level beside the animal, the whole floodplain from a raised view for the programme and sites, close, pull-back). The rhinoceros is the cut-out, a camera-facing panel (turn limited to about 29°) that fades when seen steeply from above, with a soft ground shadow, a warm light match, mud tint on legs and belly, and its feet in short grass. |
| `src/assets/field/indian-rhinoceros-cutout.webp` | New (252 KB, 1400 × 711, transparent): the earlier ISNet cut-out (`exports/master04-sources/masks/indian-rhinoceros-isnet.png`) cropped to the animal. Edges checked over a green ground before use and in the scene: clean, no halo; feet complete. No segmentation model was run. |
| `src/assets/field/CREDITS.md` | Row for the cut-out: **Tisha Mukherjee, CC BY-SA 4.0** (Kaziranga, March 2025). This is *not* the species record's photograph (Payamfarahani). |
| `src/components/field/chapters.tsx` | Rhino chapters rewritten without the point morph: the note that the floodplain is drawn and the animal is a cut-out photograph; the record's two population figures shown as text only ("the record: fewer than / around"); the sites listed, not drawn; the Photograph chapter now describes and credits the Mukherjee photograph (the record's own photograph is not what is on screen, and the chapter says so). |
| `src/components/field/field.css`, `src/pages/FieldStudyPage.tsx`, `src/components/field/FieldStudiesIndex.tsx` | The rhinoceros uses the light tone (new ink/scrim); title sits at 12svh. |
| `src/content/fieldStudies.ts` | Chapter labels (The floodplain, Habitat, Pressure, Protection, Population, Photograph, Why it matters). |

Validation:

- `npx tsc -b`: pass. `npx oxlint src/world/field src/components/field src/content src/pages`: pass (the one existing warning in `SpeciesWorldPage.tsx`). `npm run build`: pass.
- Sequential headless Chromium pass at 1280 × 800 (TMPDIR and screenshots on disk; about 1.7 GB available), all seven chapters plus the end, repeated after each fix (5 passes): **0 console errors, 0 failed requests**.
- Reviewed as screenshots: the rhinoceros is recognisable and whole in chapters 1, 2, 3, 5, 6, 7; small by design in 4 (raised view). Chapter text sits beside the animal, not on it. The habitat (tall grass, turf, wet mud, wallow and beel, low far tree line, pale hazy sky) does not resemble the grassland, mountains, river or forest.
- Defects found and fixed: far trees reading as mossy boulders (now flat, broad, low-contrast crowns); a bare, paddy-like foreground (denser turf and more ground cover); a white water slab at the horizon (reflection capped); rhino cut by the frame in chapters 2, 3, 6; the aerial shot fading the animal to a ghost (lowered the camera); the chapter 1 note colliding with the coordinates mark (moved to chapter 2).

Known limitations after this checkpoint:

- The rhinoceros is a **photograph cut-out on a flat panel**; from a steep angle it is a standing picture (fades above ~24° elevation). Its light is the photograph's own, only tinted. The animal shows no horn in this photograph (the cut-out is of the animal as photographed).
- The tall grass is flat-shaded blades with no seed heads; the short turf reads as separate tufts in the near foreground. The far-shore canopy is smooth blobs; the beel has no refraction, foam or birds. No cast shadows other than the soft one under the animal.
- Wallow and beel positions are an impression, not a place; nothing claims Kaziranga's layout.
- "Hold" chapters (3, 4, 5, 7) overlap the progress bar / coordinates mark at 1280 × 800 (the Master 03 layout issue, left for the navigation task).
- The verb "Transform" and the index preview still describe the old morph; changed in the copy task. The index preview was not re-checked.
- Only 1280 × 800 was checked. Phone, tablet, reduced motion, the no-WebGL fallback and the lower quality tiers were not tested; no performance measurement (the scene draws about 27,000 grass tufts and 260 crowns on the high tier).

## 9. The exact next task

**Navigation and end-of-study state** (shared header/progress, the hold-chapter overlap with the progress bar, the end screen), then the copy task (verbs and index previews: "Transform", "Reveal", "Drag"), performance, and final QA across all five studies and at phone/tablet sizes. All five environments are now rebuilt.
