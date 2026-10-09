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

## 10. Final integration and cross-site QA (9 October 2026)

Starting commit `fe96c40` (checkpoint 5). All five checkpoints (bustard `eec3bc4`, snow leopard `59bf48f`, dolphin `e43a39e`, tiger `9625c63`, rhinoceros `fe96c40`) were present and committed; the tree was clean. Nothing pushed or merged.

### 10.1 Audit, in priority order (measured on a production build, `vite preview`, headless Chromium with GPU)

1. **Content that was out of date.** The five verbs (TRACE, ASCEND, DRAG, REVEAL, TRANSFORM) still named removed devices, and showed in the index list, each index composition, each study's header, the menu strip and the next-study block. The tiger's index title was drawn at 42% opacity ("lost in the dark until the light finds it").
2. **Overlap.** At 1280 × 800, hold chapters scrolled under the progress line, the coordinates and the exit link (bustard 5, snow leopard 6 and 7, tiger 6, rhinoceros 7). The final links sat on the exit link. On a phone the HUD rode up over the final links once the footer arrived.
3. **Navigation.** Next study and a back link existed; no Previous study, no completion state, no route to the map.
4. **Titles.** The word mask clipped the tops of capitals ("Tiger" read as `'Iiger`) on every large title.
5. **Index.** The snow leopard's title sat on the animal's head; the tiger's on its body; the list was weak over the rhinoceros's light scene.
6. **Contrast.** The amber IUCN status name was faint on the four pale worlds.

### 10.2 Changes

| File | Change |
|---|---|
| `src/content/fieldStudies.ts` | `verb` → `habitat` (Grassland, Mountain, River, Forest, Floodplain); `previousStudy()`; header comment. |
| `src/components/field/chapters.tsx` | End state: "Field study 0N complete · 07 / 07", Next (or "Begin again" after study 05), then Previous, All field studies, Open the map, species page; 44 px targets. |
| `src/pages/FieldStudyPage.tsx` | Previous wired through the existing study-to-study transition; HUD steps aside (`data-ended`) once the study's end is on screen; header and index use the habitat label. |
| `src/components/field/field.css` | A foot of the world's ground under the HUD at every width; last chapter ends clear of it; status name takes the ink on pale worlds; word mask no longer clips capitals; index compositions 02 and 04 moved clear of the animals, tiger title at full opacity; veil behind the index list on desktop. |
| `src/components/field/FieldStudiesIndex.tsx`, `src/components/layout/FlowingMenu.tsx` | Habitat label; cursor word "Enter". |

### 10.3 Commands and results

| Command | Result |
|---|---|
| `npx tsc -b` | Pass (exit 0) |
| `npx oxlint` (whole repo) | One **existing** error: `video/src/scenes/himalaya.ts:92` (the apostrophe in "India's", already logged in Master 03; belongs to the video work, not touched). |
| `npx oxlint src` | 0 errors, 17 warnings (the same count as the Master 03 baseline) |
| `npm run build` | Pass; 23 route pages written |

### 10.4 Browser coverage (sequential, one server, one browser; Chromium only)

- **All five studies, every chapter plus the page end:** 1280 × 800 (before and after), 1440 × 900, 390 × 844 (touch), 360 × 800, 768 × 1024, 1024 × 768. Result: no horizontal overflow, no console errors, no failed requests. At 1280 × 800 the screenshots were read for the HUD overlaps above (fixed); at 390 contact sheets of snow leopard and tiger were read. The 1440, 768, 1024 and 360 runs were checked by script only (overflow, errors, requests), not by reading every frame.
- **Routes** at 1440 × 900 and 390 × 844: `/`, `/atlas`, `/species`, `/species/snow-leopard`, `/compare`, `/conservation`, `/documentary`, `/about`, `/sources`, all five `/field/*`, and a 404: no overflow, no errors, no failed requests.
- **Index** (`/#field-studies`), all five studies at 1440 × 900 and 390 × 844, read as screenshots (before and after the fixes).
- **Keyboard** (tiger study): skip link → header → chapter content → next / previous / all / map / species links → chapter ticks; every stop has a visible focus style (computed outline or shadow).
- **History:** chapter tick jump, Previous study, Back, Forward, Esc → the index opens at the study just left (dolphin): all behaved.
- **Reduced motion** (tiger, 1280 × 800): chapters change, no overflow, no errors. **No WebGL** (`--disable-webgl`): the study falls back to its photograph (`data-status="flat"`), the index list renders its five items, no errors.
- End state read as screenshots on desktop (rhinoceros, tiger, snow leopard) and phone (rhinoceros).

### 10.5 Known remaining defects

- The site header's dark gradient over the four pale worlds (Master 03 navigation, left as it was).
- In long hold chapters the top of the text still scrolls under the header; the HUD now has a ground, the header does not on the study pages.
- Per-checkpoint limitations in §8 stand: photograph panels not true 3D, soft shrubs and trees, no cast shadows. The tiger's tail and hindquarters are cut by the left edge in chapter 6.
- The index's list over the rhinoceros's grass is readable but sits over the busiest part of the scene.
- Chapter-by-chapter prev/next arrows were not added: the progress ticks are the chapter navigation (buttons, keyboard-reachable).
- `intent.ts` still lists `ascend`, `reveal`, `transform` as cursor words; harmless and unused now.

### 10.6 Not tested

Real phones and tablets (touch was emulated); Safari and Firefox; a screen reader; the low and balanced quality tiers (only the high tier rendered); the Thar, Himalaya and river worlds under reduced motion and at 360 px by eye (script checks only); performance (no frame-time measurement in this pass; the checkpoints added instanced geometry that has not been profiled on the laptop's idle GPU); Lighthouse.

### 10.7 Recommended next step

Profile the five studies and the home page on an idle machine, as Master 03 did; then test on a real phone. After that, decide whether the header's dark gradient should follow each study's tone.

## 11. Desktop performance and release audit (9 October 2026)

Scope: desktop Chromium only. Phone, tablet, touch emulation and narrow layouts were not tested or changed. Starting commit `ffc2d20`, tree clean. Nothing pushed or merged; `video/` and the main checkout untouched.

### 11.1 Environment

AMD Ryzen 3 7330U (8 threads), integrated Radeon (ANGLE, radeonsi renoir), ~5.7 GB RAM, Chromium 153 (Playwright) with GPU on, 1 device pixel ratio, production build served by `vite preview`. **The laptop was not idle**: a Brave browser and this session were running (about 4.5 GB in use). Numbers are therefore indicative; a before/after pair was taken in the same session with the same procedure (baseline, a second baseline from a clean worktree of `ffc2d20`, then after), and the two baselines agree.

Tools added in `scripts/audit/` (read-only measurement; output goes to the git-ignored `out/`): `desktop-perf.mjs` (frame intervals via rAF, long tasks, JS heap, three.js resource counts, per-scenario), `summarise.py`, `loaf.mjs` (long-animation-frame attribution), `cpuprofile.mjs`, `build-ms.mjs`, `regress.mjs`.

### 11.2 Baseline (1440 × 900, 60 Hz display)

| Scenario | Result |
|---|---|
| Five studies, idle 3 s and a wheel scroll through every chapter | 59.9–60 fps, 0 frames over 33 ms, 0 long tasks, except the rhinoceros scroll (56–57 fps, 2–5 frames of 33–50 ms in both baselines and after). All five load to `data-status="ready"` in 0.6–1.2 s (dolphin slowest). |
| Study-to-study (Next link, one canvas, six hops) | 52–60 fps per hop; one frame of **517 ms** on snow leopard → dolphin (reproduced in the second baseline). |
| Chapter churn (56 chapter jumps, snow leopard and tiger) | Three.js geometries and textures constant (5/2 and 7/2); DOM nodes constant; JS heap after forced GC rose 7.5 → 8.6 MB and 7.4 → 8.4 MB, flattening after the first round. No leak found. |
| Other routes (`/atlas`, `/compare`, `/conservation`, `/species/snow-leopard`, idle) | 60 fps, 0 long tasks, no frame over 17 ms. |
| Home page | Load 310–560 ms, LCP 540–770 ms, 15 requests, 301 KB transferred. Idle 60 fps. Scroll through the whole page: **50–51 fps, p99 66 ms, a 500–517 ms frame, long tasks 713–829 ms in total**. |
| `/#field-studies` scroll | 53–54 fps, 10–11 frames of 33–50 ms (unchanged by the fix below; not investigated further). |

### 11.3 Cause and fix

`loaf.mjs` and `cpuprofile.mjs` traced the 500 ms frame to the dolphin world being built in an idle callback while the reader scrolls the home page (`prepareInIdle`). `createRiver` samples its own `ground()` about 420,000 times synchronously (400 × 294 land vertices, a 1000 × 300 bed texture, reed and tree placement); the world's measured main-thread build is 500–680 ms, one task. Terrain for the other worlds is already built in the worker; the river's ground was not.

Change (`src/world/field/gl/turn.ts`, `worlds/river.ts`, 5 lines): `turn()` returns a function that hands the thread back to the browser once 8 ms have passed; `createRiver` calls it every 1,024 land vertices, once per bed row and every 1,024 reed tries. The loops run in the same order with the same random draws, so the world is the same. Moving the river's ground into the worker (as the others are) would also lift the cost, but needs the reed/tree placement moved too; not done.

| Measurement (same procedure) | Before (two runs) | After |
|---|---|---|
| Home scroll, longest main-thread task | 516 ms, 502 ms | **84 ms** |
| Home scroll, longest frame | 516.6 ms, 500 ms | **83.3 ms** |
| Home scroll, total long-task time | 829 ms, 713 ms | 431 ms |
| Home scroll, frames over 50 ms / p99 / fps | 9, 8 / 66.7, 66.6 / 50.8, 50.0 | 9 / 66.6 / 51.7 (no change) |
| Snow leopard → dolphin hop, longest frame | 516.6 ms | 133.3 ms |
| Dolphin study, direct load to ready | 1077, 1071 ms | 1069 ms (no change) |

Honest reading: the single half-second freeze is gone. The home scroll's general roughness (about 20–28 frames over 33 ms in 12 s, p99 66 ms) is **not** improved; what remains in `loaf.mjs` is 50–150 ms tasks from shader linking (`compileAsync`'s timer, driver work) and the page's own scroll handlers, which I did not change.

### 11.4 Rendering architecture review (no change needed)

One `WebGLRenderer` and one frame loop for all five worlds; only the current world (two during a 1.3 s hand-over) is updated and drawn; the loop stops when the host is off screen, the tab is hidden or reduced motion has settled. A `FrameGovernor` steps pixel ratio down and falls back to the photograph if frames stay slow. Worlds are built lazily, compiled with `compileAsync` and warmed in a 16 px target, evicted to 3 on the low tier. Instanced grass, reeds, crowns (up to 27,000 tufts on the rhinoceros) hold 56–60 fps on this iGPU. The render loop reads one rectangle per frame (`place`, 130–200 ms of self time per 3 s in the profile, layout that would happen anyway). The context-loss handler calls `fail()` (flat photograph); there is no restore, which is a defensible choice. Other renderers (hero, gallery, conservation) were measured only through the page frame rates above, not read.

### 11.5 Validation (sequential, after the change)

| Check | Result |
|---|---|
| `npx tsc -b` | Pass |
| `npx oxlint src` | 0 errors, 17 warnings (the same count as before) |
| `npx oxlint` (whole repo) | The one existing error, `video/src/scenes/himalaya.ts:92`, not touched |
| `npm run build` | Pass, 23 route pages |
| `regress.mjs` | 35 of 36 pass; the 36th is a probe false positive (below) |

`regress.mjs` covered: all five `/field/*` studies × 1920 × 1080, 1440 × 900, 1280 × 800 and 1024 × 768 (ready, every chapter tick reached in order, no horizontal overflow, 0 console errors, 0 failed requests; 7 chapters, 8 for the snow leopard); Next → Back → Forward through browser history; Esc returns to the home page; reduced motion on all five (last chapter reached, no errors); `--disable-webgl` on all five (`data-status="flat"`, title present, no errors) and on the home page; losing the stage's WebGL context mid-study (falls back to `data-status="flat"`, title kept, no errors). Keyboard: the header, menu and links showed a focus ring; the range-map markers (`g.sm-point`) use a dot style (`index.css:2691`) which my computed-outline probe does not see, so that "fail" is a probe limit, not a defect; the markers were not inspected by eye.

### 11.6 Remaining defects and unverified

- Home scroll and the `/#field-studies` scroll are not smooth by this measure (above). Not investigated beyond the river stall.
- The dolphin world still costs 500–680 ms of CPU in total, now spread over many frames; direct entry to the study is the slowest (1.07 s).
- Measured on a non-idle machine, one browser, 60 Hz, headless Chromium, DPR 1. Not measured: DPR 2 displays, 120/144 Hz, discrete GPUs, Chrome headed, Firefox, Safari, the low and balanced tiers, long sessions beyond 56 chapter jumps, memory in the GPU process.
- The compare map and conservation scene were only measured at idle and scroll (60 fps); their interactions were not driven.
- Screenshots were not re-read in this pass; the river change does not alter the drawn output (same loops and random draws) but I did not compare images.
- Existing defects from §10.5 stand.

### 11.7 Verdict

**Ready for desktop acceptance testing**, with one fix applied. The five studies, their transitions and the route changes hold 60 fps on this integrated GPU without leaks or errors across 1024–1920 px wide viewports. The home page's scroll smoothness is the item to watch in acceptance, and is measured but not fixed.

## 12. Master 05: the rhinoceros blank screen, and field footage (9 October 2026)

### 12.1 The defect: reproduced, cause found, fix verified

Reproduced on the production build at `localhost:4200` (Chromium, GPU on, 1440 × 900) by walking the studies in order with the *Next* link and scrolling each to its end (`scripts/audit/rhino-repro.mjs`). From the dolphin onward the stage stops drawing: `window.__atlasField()` reports `showing: "bengal-tiger"` (later `"indian-rhinoceros"`), `mode: "host"`, `failed: false`, but the WebGL draw-call count freezes and the canvas keeps the last frame of the previous world (the dolphin, under the tiger's and the rhinoceros's titles). No console error, no failed request.

Cause (`src/world/field/stage.ts`): when a session's frames are slow the frame governor lowers the session to the `low` tier (`noteStrain`). `low` allows only three worlds in memory (`evict`). `prepare()` called `evict()` straight after storing a new world; the world just built has never been used (`used` empty), so by age it is the oldest and is the one evicted and disposed. `show()` then makes it current, `draw()` finds no world and returns silently. After bustard, snow leopard and dolphin the fourth world (tiger) is evicted on arrival, and so is the fifth (rhinoceros). Seen on this laptop: the tier read `balanced` at the start and `low` from the dolphin's arrival.

Fix written: `evict(fresh)` never evicts the world just built or the one `show()` is waiting for (`wanted`). Second change, found on the way: `show()` returned silently when a world could not be built (a failed chunk), leaving an empty layer with `data-status="ready"`; it now retries once and then calls `fail()` with a `console.error`, so the study shows its photograph (verified: with module loads failing, every study fell back to `data-status="flat"`).

**Verified** (production build, Chromium, GPU on, 1440 × 900, after the environment was cleared, see 12.4):

- `scripts/audit/rhino-low-tier.mjs` forces the lowest tier (`?quality=low`) so the condition is deterministic, and walks bustard → snow leopard → dolphin → tiger → rhinoceros with *Next*. **Before the fix** (the committed `stage.ts`, rebuilt for the test) the tiger and the rhinoceros stopped drawing: 1 draw call each instead of 8 and 6, and the canvas kept the dolphin's frame (mean luminance 123 and 169 against 63 and 150). **After the fix** every arrival draws its own world, with no console error.
- `scripts/audit/rhino-repro.mjs` modes A (direct entry), B (the whole sequence) and C (fast wheel into the rhinoceros), and `scripts/audit/rhino-cycle.mjs` (slow scroll, away and back three times by history, refresh, scroll after refresh): all `ready`, every frame the right world (tiger about 48, rhinoceros about 129–150), no `CONTEXT_LOST_WEBGL`, no module-load failure, no console error. The rhinoceros was looked at in screenshots on arrival and at the end.

Not reproduced: a literal white screen. What was seen is a stale or empty canvas (the previous world's frame); under a lost WebGL context the stage falls back to the photograph. The user's white frame is most likely the same stall on a machine where the first frame was never drawn.

### 12.2 Field footage

Project-owned wildlife video: none (`public/media` holds only the promotional film). One clip added, for the snow leopard, in its "Photograph" chapter as a small panel (`FieldFootage`, `content/footage.ts`): poster shown at once; the clip is fetched when the panel is within a screen of the viewport (`preload="metadata"`), plays on pointer hover or keyboard focus and via a Play/Pause button, pauses off screen or when the chapter is not current; nothing plays by itself under reduced motion; a failed load or refused play leaves the photograph. The Three.js world is untouched. The clip is not set into the 3D world because a rectangular video cannot be cut out without a background-removal model.

| Clip | Source | Licence | Size |
|---|---|---|---|
| `snow-leopard-spiti.webm`, 8 s, 720 × 512, VP9, silent, looped | Commons: Snow leopard family, Spiti, Himachal Pradesh, India.webm; Rishi Sharma, Nature Conservation Foundation (camera trap, 17 Aug 2012) | CC BY 3.0 | 313 KB (poster 40 KB) |

Credits are in `src/assets/field/CREDITS.md` and in the panel's caption. Candidates checked and not used (portrait, low resolution, single behaviour, or zoo footage): see CREDITS. No suitable clip for the dolphin or rhinoceros.

### 12.3 Footage: verified in the rendered page

`scripts/audit/footage-check.mjs` and `footage-controls.mjs`, desktop Chromium 1440 × 900, default flags:

- **Poster and load:** the photograph (720 px) is on screen with the chapter; the video element does not exist until the panel is within a screen of the viewport. Transfer for the clip once played: about 300 KB in three range requests (313 KB file) plus the 40 KB poster. The one `ERR_ABORTED` on the clip is the browser dropping its metadata request before resuming with ranges; it is not a failure.
- **Control:** hover plays and shows "Pause"; leaving pauses; Tab to the button plays and tabbing away pauses; Enter and Space toggle; a click while hovering pauses (the label says Pause) and re-entering plays again; pressing Play without hover keeps it playing after the pointer leaves. Scrolling to the next chapter pauses it. Reduced motion: hover does nothing, the button plays it. A blocked clip: the poster stays, the video and button are removed, one console warning.
- **Two defects found and fixed:** (1) a tap on a touch screen did nothing, because Chrome focuses the button on tap and focus counted as "wanted", so the click then switched it off; focus now counts only when it is `:focus-visible`. The toggle was also invisible without hover; on `(hover: none)` it now stays visible (tap Play, tap Pause verified with touch emulation). (2) The chapter sat low and the panel ran into the progress line with its credit below the fold; with footage it now uses the default position. Checked at 1440 × 900, 1280 × 720 and 390 × 844 (on a phone the frame is 15 rem wide so the credit clears the progress line). **Remaining:** on a 360 × 640 screen the credit still extends below the fold.
- **Not a product defect, but worth knowing:** with Chromium forced onto the GPU (`--enable-gpu --use-angle=gl-egl`, as `rhino-repro.mjs` does) starting the video lost the WebGL context on this laptop, the media element errored and the component fell back to the photograph, as designed. With default flags and with SwiftShader the same page plays correctly. Not reproduced without forced flags, so not investigated further.

### 12.4 Validation

`tsc -b` pass; `npm run build` pass. `oxlint` reports one error, in `video/src/scenes/himalaya.ts:92` (a syntax error from an earlier commit, untouched here) and warnings that were already there; none is in the files changed in this section.

### 12.5 Environment

Earlier in the session `/tmp` held 2.2 GB of scratch from older sessions, swap was about 85 % used and Chromium failed every module load with `net::ERR_INSUFFICIENT_RESOURCES`. Two inactive session directories (1.5 GB) were removed; `/tmp` went from 2.3 GB to 0.7 GB used and the failures stopped. That pressure is a likely reason the stage dropped to the `low` tier in the first place.

## 13. Final desktop acceptance: rhinoceros and snow-leopard footage (9 October 2026)

### 13.1 Setup

- Git: branch `atlas/master-04-visual-quality`, HEAD `16afae0`, working tree clean at the start; `f6c62b9` (rhino) and `16afae0` (footage) present. No source change was made.
- Build: `npm run build` re-run; output identical to the existing `dist` (entry `index-D1z3Zdiq.js`), and `localhost:4200` (`vite preview`) serves that same entry.
- Browser: Playwright's installed Chromium 153.0.8010.12, **headed** (Wayland session), default flags: no `--enable-gpu`, `--use-angle` or `--use-gl`. Renderer reported by WebGL2: `ANGLE (AMD, AMD Radeon Graphics (radeonsi renoir ACO), OpenGL ES 3.2)`, i.e. the integrated hardware GPU. (Headless Chromium on the same machine reports SwiftShader; it was not used for any result below.)
- Script: `scripts/audit/accept.mjs` (`MODE=seq|low|video`), 1440 × 900. Each probe reads `window.__atlasField()` and the `data-status` attribute, counts `webglcontextlost`/`restored` events on every canvas, and samples the screenshot luminance. A probe passes only if the stage shows its own world, has not failed, issues at least 3 draw calls, is not `flat`, and no context loss has occurred.

### 13.2 Results

| Check | Result |
|---|---|
| Five-animal sequence, Next, scrolled to the end of each (bustard → snow leopard → dolphin → tiger → rhinoceros) | 10/10 probes pass. Draw calls 5, 5/3, 6, 8, 6; each canvas has its own luminance (tiger darkest, 60–66). 0 context losses, 0 console errors or warnings. |
| Same with `?quality=low` | 10/10 pass; tiger 8 calls, rhinoceros 6 calls, as at default quality. 0 losses, 0 console output. |
| Snow-leopard clip: play and pause four times | Each Play: `PLAYING`, `error` null, time advancing, loops past 8 s; each Pause: paused. Stage probe after every step passes (5 calls, same luminance). 0 losses. |
| Away (home page) and back by history, then play again | Stage returns to the snow leopard with its own world, clip plays again. |
| Next to the dolphin and Back while the clip had just played | Both stages draw their own world. **Corrected 10 October:** the script only logged this step; once it asserted it, the step failed in most runs on this machine under load (see §14.3). |
| Console output across all three runs | None (no errors, warnings, or `CONTEXT_LOST_WEBGL`). |

### 13.3 The earlier context loss

The loss recorded in 12.3 happened only with Chromium forced onto the GPU (`--enable-gpu --use-angle=gl-egl`). It did not occur here with default flags on the real GPU, across four play/pause cycles, navigation away and back, and the full sequence. This does not show that the forced-flag configuration is safe, and nothing in this run explains it; no part of the result is inferred from SwiftShader. Left uninvestigated and unmasked: the stage already falls back to the photograph on a lost context (§11.5) and the footage panel falls back to its poster on a media error.

### 13.4 Not covered

One machine, one GPU, one Chromium build, 60 Hz, DPR 1, 1440 × 900 only. Not tested: Chrome stable, Firefox, Safari, discrete or other GPUs, DPR 2, long sessions. The 360 × 640 credit overflow (12.3) stands.

### 13.5 Verdict

Both fixes hold on desktop Chromium with the default configuration. No further code change was required, so nothing was committed; `scripts/audit/accept.mjs`, `accept-env.mjs` and this section are uncommitted.

## 14. Creative quality audit and desktop polish (10 October 2026)

Full audit, reference matrix and plan: `documentation/CREATIVE_QUALITY_AUDIT.md`. Headed Chromium 153, default flags, 1440 × 900; `tsc -b` and `npm run build` pass.

### 14.1 References

All five supplied sites and the two extra ones loaded and were scrolled in the real browser. No hover, cursor, menu, audio or reduced-motion behaviour was tested on them. Edolus' loader took about a minute on this machine.

### 14.2 Changes

| Change | File | Why | Checked |
|---|---|---|---|
| The header turns to ink on a pale veil over the Himalaya, river and floodplain worlds, as it already did over the Thar | `src/components/field/field.css` | Pale type on a pale sky at the top of the page; a black bar over a light world after 40 px | Frames of the snow leopard, dolphin and rhinoceros studies; computed colour under reduced motion |
| The frame's foot is denser and a soft plate sits behind the anchor coordinates and the exit link | `field.css` | The fixed coordinates printed over the tiger's reserve list; body text ran through the rhinoceros progress label | Settled frames, before and after (tiger "Reserves", rhinoceros "Pressure") |
| The snow leopard photograph's right edge dissolves over 27 % of its width, not 17 % | `src/world/field/worlds/himalaya.ts` | A straight vertical seam against the drawn slope | Habitat and Distribution chapters; the tail is still whole |
| `window.__atlasField()` reports the governor's `rung`; the acceptance script asserts clip play/pause, prints the rung, and exits 1 on a problem | `src/world/field/stage.ts`, `scripts/audit/accept.mjs` | Review findings on the earlier script; to see why the stage gives up | Ran |
| New scripts: `creative-walk.mjs` (home and every chapter), `creative-collide.mjs` (settled text-against-furniture measure), `creative-scroll.mjs` (fast, reversed, zig-zag) | `scripts/audit/` | Repeatable evidence | Ran |

### 14.3 Open: the stage gives up under load

`MODE=video accept.mjs` (play the clip, go home and back, Next to the dolphin, Back) failed in most runs here, on `16afae0` as well as after these changes: after Next the frame governor has stepped to its lowest rung and then abandoned the stage (`status=flat`, `failed=true`), and it does not come back until the page is reloaded. No console output; no context loss. An attempt to ignore the frames after a world build did not improve the pass rate and was reverted. The machine was swapping (about 2.4 GB) with a live-video wallpaper using the same iGPU, so this is not a clean measurement of the site. Proposal (idle retry of the stage) is in the audit, §3.4; not built.

### 14.4 Not verified

1280 × 800 and 1920 × 1080 captures; an idle-machine run of any of the above; Chrome stable; other GPUs. The earlier "both fixes hold" verdict in §13.5 should be read with §14.3.

## 15. WebGL lifecycle recovery checkpoint (10 October 2026)

Branch `atlas/master-04-visual-quality`, from `4d04b93`. Headed Chromium 153.0.8010.12, default flags, 1440 × 900, one browser at a time, `vite preview` on :4200 (rebuilt for each variant).

### 15.1 What `mode=off` means

`mode` goes to `off` in two ways only. Normal: the host releases (`attach()`'s release function) with no hand-over in progress. Terminal: `fail()`, which sets `failed = true`, sets `off` and never clears; `getFieldStage()` then returns `null` for the page's lifetime. `fail()` has three callers: the frame governor's `onTooSlow`, `webglcontextlost`, and a world that failed to build twice. The stage now records which (`failReason`), its mode changes (`modeLog`), the governor's last windows and the render-loop state, all in `window.__atlasField()`.

### 15.2 Failure modes, against the evidence

| # | Mode | Verdict |
|---|---|---|
| 1 | Governor disables rendering | **Confirmed.** `failReason=too-slow` in every failing run |
| 2 | Active world evicted or disposed | Not it: 2 worlds held, `evict` protects current, wanted and transition worlds; at `?quality=low` all five studies still arrive |
| 3 | Render loop stops and never resumes | Not it: `raf` is false only because `fail()` stopped it |
| 4 | Context lost | Not it: 0 `webglcontextlost` events in every run |
| 5 | World build fails | Not it: no console output; dolphin was built (`worlds=2`) |
| 6 | Stage alive, wrong world | Not it in the failing runs (`showing` was right; it was `failed`) |
| 7 | Video / GPU interaction | Contributing load only: the clip plays at about 17 ms/frame before the dissolve; no error, no loss |

### 15.3 Root cause

The failing run's governor windows at the dissolve (rung 2, the lowest): `0.00 24f 400ms` (clip playing, healthy) then `0.26 19f 717ms`, `0.80 10f 750ms`, `0.73 22f 717ms`. Two consecutive windows with at least 60 % slow frames abandon the stage. They fall inside the 1.5 s Next dissolve, which by design draws two worlds and the compositor. At rung 2 with the iGPU shared with the video wallpaper those frames take about 75 ms. The governor was written to catch a device that cannot hold one world; it was also judging a bounded, deliberately heavier transition, and abandonment is terminal. The earlier §14.3 guess (a world build) was wrong; the build had already finished.

### 15.4 Why no idle retry

The transition to `off` was a correct response to a wrong measurement, not a stage that needed resurrecting. Not measuring the dissolve removes the failure with no timer, no second render loop and no new GPU allocation. A retry would also have meant re-creating a stage after `getFieldStage()` returned `null` to components that had already fallen back to the photograph. Genuine persistent slowness, a lost context and a failed build still call `fail()` and still show the photograph.

### 15.5 Change

`src/world/field/stage.ts`: while a transition is running `frame()` calls `governor.reset()` instead of `sample()`, so no dissolve frame is counted and the first frame after it is ignored. Plus diagnostics: `failReason`, `modeLog`, `diagnostics` (governor windows, loop state, world count), `tier` in `__atlasField()`. `src/world/quality.ts`: `FrameGovernor.windows` (last eight closed windows). New `scripts/audit/lifecycle.mjs` (snow leopard clip, Next, Back, repeated, polling for a settled stage, dumping diagnostics on failure). No art, HUD or copy change.

### 15.6 Results

Reproduction: `ROUNDS=4 node scripts/audit/lifecycle.mjs`. Test conditions for **all** runs below: **stressed** (user's normal desktop: Brave open, `hidamari-player` live wallpaper running, about 1 GB RAM available, 2.4-3 GB swap in use, load 0.8-4.4). `tier=low` / `rung=2` by the time the clip is playing.

| Variant | Result |
|---|---|
| Before (unmodified governor, with diagnostics) | **4 of 4 runs failed** at the first Next: `failed=true(too-slow)`, `mode=off`, `status=flat` |
| After | 4 + 8 + 3 = **15 of 15 rounds** of play, Next, Back passed; 0 context losses, 0 console output |
| After: `accept.mjs` seq / low / video | all OK (video: Next and Back now pass) |
| After: `creative-scroll.mjs` (bustard, rhino, tiger; fast, reversed, zig-zag) and dolphin direct entry | all OK |
| After: `rhino-low-tier.mjs` | all five arrive with their own world at `?quality=low` |
| `tsc -b`, `npm run build` | pass |

### 15.7 Not done, and limits

- **The clean baseline was not run.** It needs the wallpaper stopped and other applications closed, which was not authorised here. The result is stressed-machine only; it shows the governor mis-judged a transition under load, not that the site fails on every machine.
- Unfixed and not observed: after a long idle, the first sampled frame can carry a stale timestamp and register as one slow window (needs two in a row to abandon). No failure seen; left alone.
- A device on which one world is genuinely too slow still ends on the photograph, by design. The tier is still lowered permanently by `noteStrain` and never raised.
- One machine, GPU, browser build, 60 Hz, DPR 1. No Chrome stable, Firefox, Safari, DPR 2.
