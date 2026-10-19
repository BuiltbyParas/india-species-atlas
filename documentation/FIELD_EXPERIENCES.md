# Field experiences

*Master 02. Branch `atlas/field-studies`, cut from `atlas/experience-system` (0061f8e). October 2026.*

The five flagship species are no longer five pinned scenes on the home page. They are five **featured field studies**: interactive worlds, previewed on the home page as featured works, entered by pressing one, moved through by scrolling, and left by retreating back to the index. This document describes what was built, how it is put together, and where it stops.

Read alongside `INTERACTION_SYSTEM.md` (Master 01). Everything here is built on what that document lists.

---

## 1. The five studies

| | Study | Verb | World | Grammar |
|---|---|---|---|---|
| 01 | Great Indian Bustard | **TRACE** | The Thar: sand under a low sun, dry grass, dust | A **line**. A survey GeoLine laid across the dunes becomes a power line (pylons rise, wires are strung), then the record's answer is carried out on it: diverters, the wires buried, a protected route. |
| 02 | Snow Leopard | **ASCEND** | The high Himalaya: dark stone, cold light, snow | **Altitude**. The mountain is drawn as contour isolines that form from the valley up. The camera climbs instead of advancing, through the record's habitat band, and rises straight above the range, where the contours become a topographic sheet. |
| 03 | Ganges River Dolphin | **DRAG** | The Ganga and Brahmaputra: moving water seen from above | **Touch**. A ripple field simulated on the GPU that the hand writes into. Dragging a band moves the camera along the thread of the record's localities, west to east. |
| 04 | Bengal Tiger | **REVEAL** | A central Indian forest at night | **Light**. Near-black trunks and a lantern the hand carries. The photograph is found only where the light falls. Seen from above, the forest collapses onto the map of the reserves. |
| 05 | Greater One-horned Rhinoceros | **TRANSFORM** | The Brahmaputra floodplain: wet earth, tall grass, wallows | **Mass → number**. A heavy, folded form breaks into one point per animal of the record's figure. The points knot at Kaziranga, lay out as "fewer than 200" → "around 4,000", and resolve into the photograph. |

**Anti-template test.** Remove the names and each study is still recognisable by what the hand and the scroll do: a line that changes meaning, a climb through isolines, water that answers the hand, a light that finds things, a mass that becomes a count. Their grounds also differ in colour family (sand, slate, deep blue, black, earth), in camera language (lateral follow, vertical climb, top-down drift, slow walk-in, low orbit) and in what the photograph does (rises from sand, inked band by band, surfaces through water, found by a lantern, assembled from points).

### 1.1 Chapters (scroll choreography)

Each study is a run of chapters. Each chapter is one stretch of the page and one moment in the world. The world's timeline is 0 → 1, and chapter *i* owns *i/N → (i+1)/N* however tall its block is (§3.3).

**01 TRACE: 7 chapters**

1. THAR: wide establishing shot; the line has begun.
2. RANGE: the camera drops onto the line and follows it into the distance as it draws to its end. Shows the localities and coordinates.
3. POWER LINE: pylons rise in sequence along the line; three dashed (schematic) wires are strung between them. Quotes the record's threat sentence.
4. PHOTOGRAPH: the print rises out of the sand beside the line, along the grain of the ground, and holds. Credit shown.
5. EVIDENCE: the camera lifts to an aerial view; the ground dims. Shows the status record, the "low hundreds" sentence, the threats and the atlas map (threat layer).
6. PROTECTION: orange bird diverters run along the wires; the wires and pylons go down into the ground; a protected route (the `protect` colour) draws along the old line. Shows actions, programmes and protected areas.
7. RETURN: the camera pulls back over the desert as the sun drops. Shows why it matters, sources, and the next study.

**02 ASCEND: 8 chapters.** LOW GROUND (valley, looking up) → CONTOUR (isolines form upward) → ASCENT (vertical climb into the band; the altitude scale appears) → HABITAT (band contours brighter, snow on gentle slopes) → PHOTOGRAPH (the print fills in by bands of its own luminance, darkest first, inked like contours) → RANGE (straight above: the mountain becomes a contour map; the atlas map's range layer) → CONSERVATION (status record including the 2017 reassessment note, SPAI sentence, threats, actions, programmes) → DESCENT.

**03 DRAG: 7 chapters.** SOURCE (the river as one line, drawn from the west) → FLOW (the channel widens to fill the screen) → GEOGRAPHY (camera straight above; the water gives way to the map: states of record, the four localities, the thread; the drag band) → SPECIES (the photograph under the surface, refracted, then surfacing) → PRESSURE (schematic barrages across the channel; the current slows) → CONSERVATION (the flow returns, the barrages redrawn in the protected colour) → FLOW BACK (the river narrows back to its line).

**04 REVEAL: 7 chapters.** FOREST (dark; only the lantern) → PRESENCE (the camera walks in between trunks to the tiger; the photograph opens) → EVIDENCE (the light steadies; Project Tiger · 1973 from the programme record) → PROTECTION (camera above the canopy; every trunk travels to its reserve and lies down as a mark; the map's recorded states) → ESTIMATE (the 2022 national estimate, quoted, with a slow pulse on the reserves) → PRESENT (back in the forest, the tiger lit) → RETURN (the light goes out).

**05 TRANSFORM: 7 chapters.** FORM (the form; the hand moves the light) → LANDSCAPE (grass and mud rise around it) → PRESSURE (the form dissolves into its points; more than two-thirds knot into one dense cluster) → PROTECTION (the five sites appear; protected routes draw from Kaziranga and from Pobitora to Manas) → RECOVERY (a field of marks; first only the past figure lit, then the present one) → PHOTOGRAPH (the points rise into a grid coloured by the photograph, square-cornered, until the photograph itself replaces them) → PRESENT (the form standing in the grass).

---

## 2. The journey through a study

```
preview  →  engage  →  entry  →  study (scroll)  →  exit / next
index       hover       press      chapters          Esc, "Field studies", or next study
```

- **Preview** (home page). One pinned screen, one viewport of scroll per study. The field stage shows the active study's world behind its composition. Each composition places the same few facts (number, name, place, status, anchor coordinates, verb) where its world puts weight:
  - the bustard on the horizon;
  - the leopard high on the mountain, with a vertical verb;
  - the dolphin's words stepping downstream;
  - the tiger small and dim, centred in the dark;
  - the rhino low, heavy, in a firmer weight.

  The list at the side names all five. Moving between studies, by scroll or by hovering the list, dissolves one world into the next (§4.3).
- **Engage** (hover). `engage` rises on a spring and each world answers in its own way:
  - the line traces;
  - the contours form further up and brighten;
  - the river widens and the hand writes ripples into it;
  - the lantern grows;
  - the form turns and the light swings across it.

  The camera leans to an engaged shot, and the instrument carries the verb.
- **Entry** (press). The composition's words lift out (masked, 0.9 s, `atlas.cinema`) while the camera travels from the preview into the study's first shot (`enter` 0 → 1, 1.25 s). The stage is then held over the screen, the route changes underneath, and the study page arrives with the world already standing there: the same camera, still moving. The study title rises in, word by word.
- **Study.** Scroll drives everything (§3).
- **Exit.** Esc or "Field studies":
  1. the frame's type fades;
  2. the stage is held;
  3. `enter` runs 1 → 0, so the camera retreats from wherever the reader is to the preview shot (the entry reversed);
  4. the route changes;
  5. the index reopens at the same study, pinned, and the world never left the screen.
- **Next.** The last chapter offers the next study. Pressing it holds the stage, dissolves this world into the next one's first shot, then changes the route. The order is a loop: 05 → 01.

Opened directly (a link, a refresh), a study runs its own entry: the world appears at its preview and the camera comes in.

---

## 3. Architecture

### 3.1 Files

```
src/content/fieldStudies.ts         the five studies: verb, environment, place, chapter names, sweep; flagged missing content
src/components/field/
  FieldStudiesIndex.tsx             the home page index: the pinned stage, compositions, list, scroll → active study
  chapters.tsx                      each study's chapters (text from the record) and its instrument (drag band, ascent scale)
  StudyProgress.tsx                 GeoLine progress with a tick per chapter (also chapter navigation)
  studyFacts.ts                     facts read out of the record's own sentences (band, figures, estimate)
  fieldNav.ts                       entry, exit and next-study choreography; the hand-over to RouteTransition
  useFieldStage.ts                  lazy-loads the stage and attaches a host
  field.css                         the frame language for all five
src/pages/FieldStudyPage.tsx        /field/:id: the pinned world, the frame, the chapter runway
src/world/field/
  stage.ts                          FieldStage: the one renderer, worlds, transitions, quality, the layer
  cameraRig.ts                      CameraRig: preview / engage / path shots, Catmull–Rom, pointer sway, time-damped
  types.ts                          FieldWorld, FieldInput, WorldFactory
  noise.ts                          CPU noise (seeded value noise, fbm, ridged), easing helpers
  grounds.ts                        the grounds as pure height functions + grid builder
  ground.worker.ts                  builds grounds off the main thread
  gl/line.ts                        GeoLine in 3D: screen-space ribbon, draw, dash, nib, haze
  gl/drift.ts                       drifting particle fields (dust, snow, motes, silt), light-masked option
  gl/photo.ts                       photograph textures (cached), cover-fit GLSL
  gl/composite.ts                   the world-to-world ink-edge dissolve
  gl/mapLines.ts                    India's state boundaries and place rings on a world's ground
  gl/terrain.ts                     heightfield geometry from the worker
  gl/color.ts                       sRGB palette helper
  worlds/thar.ts, himalaya.ts, river.ts, forest.ts, floodplain.ts
```

Changed elsewhere:

- `HomePage.tsx`: the index replaces the bustard prologue and the five pinned species scenes;
- `App.tsx`: the `/field/:id` route; Lenis on field pages;
- `Navbar.tsx`: the header floats on field pages;
- `environment.ts` and `index.css`: a `floodplain` environment;
- `intent.ts`: the verbs;
- `world/gl/chunks.ts`: `inkEdge` corrected (it ran backwards; nothing used it before);
- `scripts/postbuild.mjs`: `/field/*` routes are materialised.

Removed: `components/cinema/BustardPrologue.tsx` and its CSS. Its schematic power line and shutter-to-photograph now live, larger, in study 01.

### 3.2 One renderer (the FieldStage)

Master 01 asked that the field studies get one renderer between them, not five. `world/field/stage.ts` is that renderer:

- **One canvas, one context, one rAF loop, one FrameGovernor.** The canvas lives in a fixed layer of its own appended to `<body>`, outside React. It therefore survives route changes, which is what makes index → study → index continuous.
- **Hosts.** A component that shows the stage *attaches* a host element: the index's pinned screen or the study's pinned screen. The layer follows the host's rectangle (one `getBoundingClientRect` per frame, written as a transform) at `z-index: 1`, behind the host's content (`z-index: 2+`). During a hand-over the stage is **held**: brought to the front over the whole screen until the next host is in place, and released on `navigation:end` (with a safety timeout).
- **Worlds.** Built lazily from per-world chunks (`import('./worlds/thar')` …), one at a time in idle moments, nearest first (`prepareInIdle`). Each world is compiled (`compileAsync`) and **warmed**: one frame into a 16 × 16 target uploads its buffers, textures and targets off the critical path. Exactly one world is updated and drawn per frame. During a dissolve there are two, rendered into two targets and joined by the compositor. On the low tier at most three worlds are kept (LRU).
- **Inputs.** The stage smooths every input by elapsed time and hands each world a `FieldInput`:
  - `progress`, `enter`, `engage`, `drag`;
  - pointer, smoothed and raw;
  - pointer speed and press;
  - `reduced` and `snap`.

  A world maps those numbers onto its scene and owns nothing else.
- **Lifecycle.** The stage registers with `sceneRegistry` as `field`, so it pauses off screen, in a hidden tab, under the cinema and during page turns, like every other scene. With no host it stops. With reduced motion it renders only when something changed.
- **Diagnostics.** `window.__atlasField()` returns:
  - the layer mode and the world showing;
  - draw calls, triangles, geometries and textures;
  - per-world build times.

### 3.3 Scroll → progress

`FieldStudyPage` subscribes to the shared scroll signal (`interaction/scroll.ts`; no new listener). It measures the chapter blocks once (and again on resize), finds the chapter under the middle of the screen, and computes `progress = (i + local) / N`. Chapters can therefore be different heights (a chapter carrying a map holds longer) without the world's timeline drifting from the words. React hears only chapter changes. The study title's fade is a CSS variable on the small title element, never on `:root` or a large subtree.

### 3.4 Camera (CameraRig)

The rig Master 01 deferred until a second 3D camera existed (`world/field/cameraRig.ts`):

- **Shots.** `preview` and `engage` for the index; `path`, a list of shots placed along the study.
- **Interpolation.**
  - Positions and targets follow centripetal Catmull–Rom through the shots.
  - Each leg is eased, so the camera settles on every shot.
  - The lens is interpolated too.
- **Entry and exit.** `enter` blends preview → path, so the exit is the entry reversed.
- **Pointer sway.** A few degrees of yaw and pitch around the look target; each world sets its own.
- **Damping.** By elapsed time (`damp`), the same at 60 and 120 Hz.
- **Reduced motion.** Snaps.

The hero keeps its own camera. Moving it onto the rig is a Master 03 refactor (§10).

### 3.5 Shared vs. per-world

**Shared:**

- type, spacing and the frame (number · verb, chapter label, progress line, coordinates, exit);
- the cursor (verbs in `intent.ts`) and GeoLine (SVG in the frame, `gl/line.ts` in the worlds, the same roles and colours);
- the camera rig, inputs and physics;
- the transition philosophy (enter/exit as one move; world-to-world dissolve);
- notes in the same dashed-rule small print;
- accessibility and performance rules.

**Per world:**

- ground, light, palette and shaders;
- camera shots;
- the gesture;
- how the photograph appears.

---

## 4. Shaders and GPU techniques

All shaders are `ShaderMaterial`s writing the palette's sRGB values directly (`outputColorSpace = Linear`, no tone mapping), so a WebGL line and an SVG line with the same token match. There is no post-processing pass except the dissolve, which exists only during a dissolve.

| Technique | Where | Notes |
|---|---|---|
| Screen-space ribbon line (GeoLine 3D) | all | Two vertices per point, widened in the vertex shader by screen pixels. `draw` by arc length, dashes, nib, haze. One draw call per line. |
| Low-sun terminator shading + wind-ripple normal bend | Thar | Hard `smoothstep` terminator for long shadows. Clay in hollows from fbm. Paper grain. |
| Per-pixel contour isolines (`fwidth`) | Himalaya | Constant on-screen width, index contour every fifth. They "form" upward with a uniform. Habitat band highlight. Slope-masked snow. Valley fog. |
| Luminance-band reveal | Himalaya photo | The print inks in by bands of its own light, with its own isolines. |
| GPU wave simulation (ping-pong, half-float) | River | 256² / 192² / 128² by tier. Height + velocity. Pointer drops raycast onto the water. Normals → specular, sky fresnel and refraction of the photograph. Flow streaks advected by an integrated phase, so slowing the current never jumps. |
| Instanced trunks with a map morph | Forest | Each instance carries its reserve's position. A uniform flattens the trunk and carries it to its mark. Reserves keep a mark's width; the others shrink away. |
| Point-light falloff mask | Forest | Bark, floor, motes and the photograph are all lit by the same lantern. The photograph shows only where it falls. |
| Noise dissolve of a solid | Floodplain | The form discards by an fbm field (`inkEdge`) as its points take over. |
| Four-state point morph | Floodplain | `aForm → aCluster → aField → aPhoto` per point, staggered by seed. Colours sampled from the photograph in the vertex shader. Perspective-correct cell size, so the grid tiles into a picture. |
| Instanced grass with wind and push | Floodplain | 16k / 9k / 4k blades by tier. |
| Drift fields | Thar dust, Himalaya snow, river silt, forest motes | One uniform moves thousands of points; wrapping in a box; optional light mask. |
| Ink-edge dissolve between worlds | stage | The direction is chosen per destination (snow from below, the river from the side, the forest's dark from above). A hairline of the incoming world's line colour marks the front. |

Reused from Master 01: `world/gl/chunks.ts` (hash, value noise, fbm, paper grain, `inkEdge`), `particles.ts` (`seededRandom`, `particleBudget`), `quality.ts` (tier, `pixelRatio`, `FrameGovernor`), `sceneRegistry.ts`, `spring.ts` (`damp`), `pointer.ts`, `scroll.ts`, `events.ts`, `environment.ts`, `geo/india.ts` (projection, boundary file), `GeoLine`, `SpeciesMap`, `StatusIndicator`, `PhotoCredit`, `RouteTransition` (it still announces the page, moves focus and emits `navigation:end`).

---

## 5. Assets

- **Photographs.** The dataset's own five (Wikimedia Commons, licensed and credited): the 720 px WebP on the balanced and low tiers, the 1400 px master on the high tier. Loaded once and cached; the credit is printed in the chapter that shows each photograph.
- **Geography.** `public/india-states.geojson` (already shared with every map), projected with the atlas's own projection.
- **No 3D models, no generated imagery, no new textures, no audio.** Everything else is procedural: grounds from seeded noise, pylons, trunks, grass, the rhino's form.

## 6. Honesty (scientific content dependencies)

Every figure on screen is read out of the record's own sentence (`studyFacts.ts`) and shown with that sentence. If the sentence ever changes, the moment shows nothing rather than a remembered number.

| Study | From the record | Drawn but not data, and labelled so on screen |
|---|---|---|
| Bustard | summary, distribution, habitat, three localities, the threat's first sentence, status (CR since 2011, assessed 2021), "low hundreds", actions, two programmes, protected areas, sources | Procedural dunes ("an impression of the Thar, not a terrain model"). The power line ("schematic: the dataset records the threat for the species, not the route of any line"). The survey line ("stands for the record's range in words; not a mapped boundary"). |
| Snow leopard | habitat band "3,000–5,000 m" (parsed from the habitat note), distribution, four localities, status VU 2017 with the "revised estimate, not recovery" note, SPAI sentence, threats, actions, programmes | Procedural mountain. The ascent and the scale ("schematic; the band is the record's; the mountain's heights are not measured"). |
| Dolphin | summary, habitat, distribution, four localities (sorted west → east), echolocation and National Aquatic Animal sentences, threats, actions, Project Dolphin, protected areas | Procedural channel. The thread ("joins recorded localities; not the course of the river"). Barrages ("marked schematically: the record names dams and barrages, not their sites"). |
| Tiger | habitat, seven reserves, Project Tiger and 1973 (programme record), the 2022 estimate sentence ("roughly 3,700 … more than 50 tiger reserves"), status, threats, actions | The forest (abstract trunks). Reserve marks at anchor coordinates ("not reserve boundaries"). "The record holds the 2022 estimate only, so no trend is drawn." |
| Rhino | summary, "fewer than 200 animals a century ago", "around 4,000 animals", "more than two-thirds … in a single park — Kaziranga", habitat, five sites, IRV2020 (Kaziranga and Pobitora → Manas), status, why it matters | The form ("an abstract form, not a model of the animal"). Points (one per animal of the figure; the past figure drawn at its upper bound, 200). "Two figures, two states. Nothing between them is drawn." The knot holds ⌊⅔N⌋+1 points; the other third is loose and assigned to no site. |

**Missing content, flagged** (`MISSING_CONTENT` in `content/fieldStudies.ts`):

- a sourced transmission-line alignment;
- a dated bustard population series;
- river centre-lines and barrage sites;
- earlier tiger estimates for a sourced recovery series;
- IRV2020 translocation numbers and a rhino population split by site;
- a real terrain model for any of the grounds.

Each visual moment that would have used these was built without the claim.

---

## 7. Performance

Measured on production builds served by `vite preview`, in headless Chromium through ANGLE/GL on the laptop's Radeon (`--use-angle=gl --enable-gpu`), 1440 × 900, idle machine (load about 1). Each study: 140 wheel steps of 160 px through the whole study. Index: 70 steps of 120 px through all five panels.

**Studies** (frames over 33 ms / 50 ms; p50 and p95 in ms):

| study | high tier | balanced tier (the headless default) |
|---|---|---|
| 01 Thar | 863 frames: 0–1 / 0, p50 16.7, p95 16.8 | 861 frames: 0 / 0, p95 16.7 |
| 02 Himalaya | 860: 0 / 0, p95 16.8 | 829: 2 / 0, p95 16.7 |
| 03 River | 862: 0 / 0, p95 16.7 | 862: 0 / 0, p95 16.7 |
| 04 Forest | 862: 0 / 0, p95 16.7 | 862: 0 / 0, p95 16.8 |
| 05 Floodplain | 862: 0 / 0, p95 16.7 | 862: 0 / 0, p95 16.7 |

**Index** (all five panels, including four world-to-world dissolves): three runs on the high tier after the fixes gave 1 / 1, 3 / 0 and 0 / 0 frames over 33 / 50 ms, max 67, 50 and 33 ms. Before the worker, the warm-up and the reduced-resolution dissolve, the same run gave 11 / 5 (max 183 ms). JS heap during a study: 11–16 MB.

Notes:

- **Draw calls per frame:** 3 (Himalaya) to 9 (river). **Triangles:** Thar 183k, Himalaya 206k, floodplain 89k (high tier), forest 4k, river 2k.
- **World builds** happen one per idle moment, nearest first. The grounds are built in a worker (`ground.worker.ts`). Each world is compiled and warmed into a 16 × 16 target, so no world's first frame stalls. Before the worker and warm-up, the index showed long tasks of 55–183 ms as each world first appeared; after, none were recorded during the index scroll (PerformanceObserver `longtask`). One task of about 70 ms remains when the stage first starts, a screen and a half before the index.
- **Off screen** the stage renders nothing (`__atlasScenes()` shows `field` inactive while the hero is on screen).
- **Textures:** at most five photographs (one per world); 720 px on balanced/low. **Render targets:** the river's two simulation targets (≤ 256 × 171 half-float) and the compositor's two full-resolution targets.
- **Bundle:** everything the home page loads eagerly (JS + CSS, gzipped) is **232.8 kB, against 236.1 kB** at Master 01 (0061f8e): 3.3 kB smaller, because the pinned scenes left the home page. The stage is a lazy 5.9 kB chunk; each world is 3.5–6.5 kB; the worker is 1.9 kB; three.js is the existing shared lazy chunk.
- **Adaptive quality** (`world/quality.ts` tier, mapped to the brief's HIGH / MEDIUM / LOW as high / balanced / low):

  | | high | balanced | low |
  |---|---|---|---|
  | pixel ratio | ≤ 1.75 | ≤ 1.25 | 1 |
  | ground resolution | 300–320² | 210–220² | 140–150² |
  | river simulation | 256² | 192² | 128² |
  | trunks | 230 | 160 | 110 |
  | grass blades (floodplain) | 16k | 9k | 4k |
  | particles (`particleBudget`) | 100 % | 60 % | 30 % |
  | photograph | 1400 px | 720 px | 720 px |
  | worlds held | 5 | 5 | 3 |
  | antialias | on | on | off |

  The governor then steps down at runtime:
  - **rung 1:** DPR ≤ 1.25, half the Thar grass and floodplain blades, no forest halo;
  - **rung 2:** DPR 1, no drift particles, no grass, no river simulation (flat water);
  - **too slow:** the flat fallback (§9).

  The **rhino's 4,000 points are never reduced**: they are the record's figure.

## 8. Mobile

- **Touch.**
  - Hover becomes a tap: a tap on a composition enters it; the list collapses to a row of numbers.
  - The river's band is dragged by touch with `touch-action: pan-y`, so the page still scrolls vertically. The water also takes touch ripples.
  - The forest's lantern follows the touch point, and hangs and drifts when there is none.
- **Layout.**
  - Compositions stack to one column with the name above the facts.
  - Chapters sit full width on a soft scrim.
  - The altitude scale shrinks to the right edge.
  - The coordinates readout and the vertical place name are dropped.
- **Pointer sway** is mouse-only (touch has no hover position).
- **Device defaults.** Phones start on the `balanced` tier (coarse pointer): lower DPR, smaller grounds, fewer particles.

## 9. Reduced motion and fallbacks

- **Reduced motion.**
  - The scroll still moves through the chapters, but each chapter is one composition held at its middle (`progress = (i + 0.5) / N`). The camera **snaps** to it, so compositions change and the camera does not travel.
  - Nothing moves by itself: time stops, so dust, snow, water, grass and motes hold still.
  - The entry, the exit and the world dissolves are cuts.
  - The page's own transitions are near-instant.
  - Every chapter, figure and note is the same.
- **No WebGL, data saver, or the governor giving up.** Each composition and study stands over its photograph in its ground colour (`FlatGround`), and every chapter reads the same: the text, maps and facts are DOM. Entry and exit become ordinary navigations.

## 10. Accessibility

- **Headings and structure.**
  - The index is a section with an `h2` and a real list of links: Tab reaches all five, focus previews the world, Enter goes in.
  - The active composition's name is also a link; inactive ones are hidden and not focusable.
  - A study has an `h1` (the name) and an `h2` per chapter, with "chapter i of N" for screen readers.
- **Navigation.**
  - The chapter ticks are buttons (`aria-current="step"`).
  - A polite live region announces the chapter.
  - Esc exits, unless the menu or a dialog is open.
- **Controls.**
  - The drag band is a `role="slider"` with arrow keys and `aria-valuetext` naming the locality.
  - Every control has a name and a 44 px target on touch.
- **Canvas and announcements.** The canvas is `aria-hidden`: nothing is only in WebGL. RouteTransition still announces each page and moves focus to `main`.

## 11. QA

Inspected at 1440 × 900 (desktop, every chapter of every study, hover, entry, next-study, exit) and 390 × 844 (touch: index and study), and with reduced motion. Also captured at 1920 × 1080, 1280 × 800, 1024 × 768, 768 × 1024 (touch), 430 × 932 (touch) and 375 × 812 (touch): the index, and the first and a middle chapter of every study. Flows were tested by script:

- index → study (click, and keyboard: focus the list, Enter);
- chapter ticks;
- the drag band by keys;
- study → next study;
- Esc → index, which reopens at the same study.

No console errors and no failed requests. Without WebGL (`--disable-webgl`), studies and the index fall back to their photographs and enter by plain navigation.

Not done: real-device testing (phones were emulated); a screen-reader pass beyond the structure checks above.

---

## 12. Creative scores

Self-assessed, 1–10, after the fixes listed in the commit. These are a builder's scores, not a review.

| | Bustard | Snow leopard | Dolphin | Tiger | Rhino |
|---|---|---|---|---|---|
| Art direction | 8 | 9 | 8 | 9 | 8 |
| UX | 8 | 8 | 8 | 8 | 8 |
| UI | 8 | 8 | 8 | 8 | 8 |
| 3D | 8 | 9 | 8 | 8 | 7 |
| WebGL | 8 | 9 | 9 | 8 | 9 |
| Motion | 8 | 9 | 8 | 9 | 8 |
| Interaction | 8 | 8 | 9 | 9 | 8 |
| Typography | 8 | 8 | 8 | 8 | 8 |
| Photography | 8 | 9 | 8 | 9 | 9 |
| Storytelling | 9 | 8 | 8 | 8 | 9 |
| Technical craft | 8 | 8 | 9 | 8 | 9 |
| Performance | 9 | 9 | 9 | 9 | 9 |
| Originality | 8 | 9 | 8 | 8 | 9 |

The one score below 8 is the rhino's form (3D: 7). It was reshaped twice: smooth normals, a forward mass, two folds. It still reads more as a heavy boulder than as an animal's mass. That is defensible under the honesty rule (it is labelled abstract), but it is the weakest object in the five.

## 13. Known weaknesses and next steps (Master 03)

- **The rhino's form** (above). Next: a sculpted, still-abstract form built from the species' published silhouette (the hero's silhouette data), extruded and softened, instead of a displaced ellipsoid.
- **Photographs are flat planes.** Depth is faked by a luminance shift. Subject masks (an open decision in HOMEPAGE_CREATIVE_DECONSTRUCTION §16) would let the animal separate from its ground.
- **The dolphin's under-water photograph** is soft (720 px stretched across a large plane on the balanced tier, refracted).
- **Long chapters** (lists, maps) scroll rather than hold. On a short landscape screen a reader scrolls past the middle of a list while its world moment plays.
- **Procedural grounds are impressions.** Real terrain or river data, once sourced (§6), would let the worlds be places rather than likenesses.
- **The hero still has its own camera and renderer.** Master 03 should move it onto `CameraRig` and decide whether the hero and the field stage share one renderer (one context for the whole home page).
- **Sound:** none, by design. The interaction stream (`events.ts`) is ready for a sound layer if a project-wide audio direction is ever set.
- **Not tested on real phones or a real low-end GPU.** The governor and the tiers are designed for it but were exercised only by forcing `?quality=`.
- **The homepage direction document** (§16 decisions) is still open. The index was built inside today's home page, not the proposed recomposition.
