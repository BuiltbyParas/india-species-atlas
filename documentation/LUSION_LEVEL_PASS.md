# Lusion-level pass — audit, references, direction

12 October 2026 · branch `atlas/master-04-visual-quality` (premium worktree) · uncommitted, on top of the
uncommitted dark-journey work (`HOMEPAGE_DARK_JOURNEY.md`). Pre-change tree: git ref
`refs/backups/pre-lusion-pass` (tracked files) plus a tarball in the session scratchpad.

## 1. Baseline (captured, GPU on: headless Chromium `--use-angle=gl`, AMD integrated, machine loaded)

Captures: 1920 × 1080 cold load at 1.5 / 3 / 5 / 8 s, the descent at 0.5 / 1 / 1.6 / 2.4 viewports, and the
whole home page at 1.5-viewport steps.

| Area | What works | What is weak |
|---|---|---|
| Loader | Short, honest (it lists what is actually loading), sets the "sheet" idiom | An empty black frame with one crosshair for ~3 s |
| Hero, settled | Real ETOPO relief, title hung on the Tropic of Cancer, quiet type system | **India is a cut-out**: the relief is clipped to the boundary (heights are 0 elsewhere), so the country floats in a black void and the Himalaya ends in vertical walls. **Flat light**: Lambert from one key, no cast shadows, so the peninsula reads as an olive sheet with lines on it — a map behind text, not ground under light. The title sits over Gujarat. |
| Hero, entrance (t = 5 s) | — | Letters half-masked mid-reveal read as broken glyphs; the land arrives as a brown blur |
| Descent | Captions counted from the data; ends over a real locality | Markers are 8×6 / 6×4 spheres — octagons with additive halos at close range; the land goes murky; the walls of the slab show |
| Ch. 02–05 | Field studies, selection index + dome, Ch. 04 trace, closing on the Tropic, colophon | Field-study habitats are procedural low-poly (out of scope here, protected by earlier briefs) |

Technical: one hero renderer (`heroScene.ts`, 2.7 k lines) drives the hero *and* Chapter 04 / closing through
`atlasWorld.ts`; render on demand; adaptive quality with a flat fallback; bloom/DOF/grade post chain
(`heroPost.ts`); GSAP ScrollTrigger + Lenis on the home page only. No physics engine, no WebGPU — none needed.

## 2. References (studied live, GPU on, wheel-scrolled; case-study pages read)

| Site | Seen | Documented (case study) vs observed |
|---|---|---|
| lusion.co | Inset rounded 3D panel with registration "+" marks; glossy connector pieces you push with the pointer (rigid-body feel); pale editorial body; project thumbnails as image **+ depth map** pairs | Observed only. Assets requested: `home.webp` + `home_depth.webp` per project, SMAA textures, audio (`cinematic_*.ogg`). Virtual scroll (document height = 1 viewport). |
| Of the Oak (oftheoak.co.uk) | One subject fills the frame (the oak), title centred on it, fireflies; day/night | Documented: "Houdini to WebGL pipeline … custom web format … 3.5 MB … WebGL instancing". Observed requests: `bg.webp` + `bg_nor.webp` + `bg_depth.jpg` (a relit 2.5D backdrop), day/night diffuse + specular env maps, LUT, blue-noise, SMAA |
| Zero Tech (client-zero-tech.lusion.co) | Loader ring → one focal light (a black hole, then an orb) that persists through every section; particles reorganise around it | Documented: only "realtime 3D visuals and scroll navigation", WebGL |
| Synthetic Humans | Monochrome tinted world, heavy depth of field, camera dollies through a crowd and pulls focus to one figure | Documented: "Houdini FX based workflow" for real-time assets; procedural animation and VFX. Observed: baked camera/animation buffers per scene, matcap EXR |
| Infinite Passerella | Dark hall; a runway that is the light source; spotlights, haze, silhouettes for scale | Observed: LTC area-light tables (`ltc_mats.buf`), per-garment animation buffers |

Principles taken (not copied): **the camera is in a world, not looking at a diagram**; **one dominant light** and
most of the frame allowed to fall into shadow; **the subject fills the frame** with a real silhouette; atmosphere and
depth carry scale; type is large and simple and stands in the negative space; a single visual event, then rest.
Not claimed: anything about Lusion's engine, shaders or physics beyond the requests and pages above.

## 3. Capability map (what this subject needs; what it does not)

| Capability | Effect here | Verdict |
|---|---|---|
| Heightfield **cast shadows** (GPU pass over the elevation grid) | The Himalaya throws its shadow on Tibet and the plains; the Ghats shade the Deccan; relief reads as ground | **Build** — the single biggest missing quality |
| Sky-visibility AO from the grid (static, one pass) | Valleys and gorges darken, ridges hold light | **Build** — free after the first frame |
| Continuous regional relief + bathymetry (ETOPO 2022, unclipped) | India stands in its geography; the shelf and the Bay of Bengal fan under water | **Build** — removes the cut-out |
| Water: depth-tinted sea floor, sun glint | Sea reads as water, not void | **Build** (cheap, in the land shader) |
| Raking lamp under the pointer (spring-damped) | The visitor reads the relief by moving the light — a cartographer's hill-shading made physical | **Build** (replaces "light turns a little towards the probe") |
| Bloom / DOF / grade | Exists (`heroPost.ts`) | Keep, retune |
| Rigid-body physics (Rapier / cannon) | Nothing in an atlas collides | **No** — would be an effect for its own sake |
| GPU particles / flow fields | Monsoon winds would need a sourced wind climatology | **No** for now (not sourced) |
| WebGPU compute | Not needed at this grid size | **No** |
| Audio | Not requested by the content | **No** |

## 4. Three directions

| | A · Raking Light | B · Monsoon Field | C · Specimen Cabinet |
|---|---|---|---|
| Premise | One relief of the subcontinent and its sea floor, at night, read by a single low lamp | Particles advected by the south-west monsoon over the relief | The country as a cast object on a plinth under a museum spotlight, turned by drag |
| Opening | Oblique from the south, long lens: the peninsula in the sea, the Himalaya a lit wall at the top | Dark relief, streams of light arriving from the Arabian Sea | Object centred in a dark room, spot from above |
| Event | The lamp rises from the horizon: summits catch it first, then the plateaus, then the plains | The monsoon "arrives" | The light switches on |
| Interaction | Pointer moves the lamp; shadows swing | Pointer disturbs the flow | Drag to rotate with inertia |
| First scroll | Lamp climbs to the cartographic north-west light, camera lowers into the descent | Particles settle into localities | Object flips flat into the map |
| Honesty | ETOPO data, stated ×20 | Needs a wind climatology we do not have — would be decorative | Keeps the cut-out problem |
| Perf | One shadow pass when the lamp moves; one AO pass once | 50–100 k particles per frame | Cheap |
| Fit | The land itself, lit — "lines on the map" become ridges and shadows | Strong but unsourced | Generic "rotating object" |

**Chosen: A.** It fixes the two largest visible faults (cut-out, flat light) with the data already sourced, keeps
every system downstream (descent, captions, markers, Chapter 04 and the closing reuse the same relief), and its one
event — light arriving on the summits first — is physically what a low light does to a relief.

## 5. What was built

| Where | Change |
|---|---|
| `scripts/geo/build-region.mjs` (new), `scripts/geo/netcdf.mjs` (new, shared reader), `build-relief.mjs` | ETOPO 2022 subset 59–103°E, 1–41°N, 2′ → 4′ cells, signed (sea floor kept), land to 1 m, sea to 10 m → `public/relief/region-relief.{bin,json}` (432 KB) |
| `home/heroRelief.ts` | `loadRegion()` beside `loadRelief()`; grids carry `kind` |
| `home/heroTerrain.ts` | `buildRegion()`: one continuous ground mesh, fine 8′ near India / coarse 16′ beyond with crack-free fans (two triangles where no fine neighbour), skirt, signed height texture, India mask |
| `home/heroLight.ts` (new) | GPU heightfield shadow for the lamp (half grid, on lamp move) and sky visibility (once) |
| `home/heroScene.ts` | regional shading chunks (India lit, neighbours in stone, water with sea floor, glint), lamp shadows into the key only, sky occlusion into the fill; the lamp on `SPRINGS.lamp` (pointer, emergence, descent); plan → three-quarter entrance; per-scene opening frame; exposure; grid edge to black and black open sea; soft fresnel halos and finer markers; atlas act retints the water per pose; overdraw cuts; dev `tune()` hook |
| `home/heroPost.ts` | exposure before the tone curve |
| `home/HeroScrollScene.tsx` | loads the region (India grid as fallback); `data-relief="region"`; probe reports sea-floor depth; a tap swings the lamp on touch; screen-reader description |
| `cinema/CinematicHero.tsx`, `index.css` | margin note for the regional relief, hint "Move to turn the light", elevation key shown for it; reveal mask hides tall glyphs (pre-existing glitch) |
| `interaction/spring.ts` | `SPRINGS.lamp` tuning |
| docs | this file, `VISUAL_BIBLE.md`, `RENDERING_ARCHITECTURE.md`, `INTERACTION_SYSTEM.md` §22 |

Unchanged: field studies, Ch. 02, Ch. 03, the dome, the data, every route but `/`.

## 6. Checks actually run

- `tsc -b` passes; `vite build` passes; `oxlint src` reports only pre-existing warnings.
- GPU captures (headless Chromium, ANGLE GL, AMD integrated): entrance as a time series (3.3–9 s), rest, pointer at
  three positions, descent at six depths, Ch. 04 pressure / response / statement, closing, colophon; at 1920 × 1080,
  1440 × 900, 1280 × 800, 1024 × 768, 768 × 1024, 390 × 844 (touch, tap tested).
- Reduced motion and `--disable-3d-apis`: flat hero, no console or page errors.
- A/B frame rates and GPU timings: `RENDERING_ARCHITECTURE.md` §8.

## 7. Quality gate (honest)

- **First viewport art-directed?** Yes: a lit, three-quarter relief of the subcontinent and its seas, the Himalaya a
  range, India the brightest ground, the title on the Tropic. It no longer reads as a map behind text.
- **Compelling without the text?** Yes; the entrance (light reaching the summits first) is one clear event.
- **Materials and light convincing?** The light is (cast shadows, sky occlusion, warm/cool); the ground material is
  matte and simple by choice. At 4′ (≈7 km) the grid cannot show dunes or valleys finer than that.
- **Motion intentional, interaction responsive?** The lamp follows the hand with weight; the camera's plan → tilt
  entrance lands the loader's outline exactly.
- **First scroll connected?** Yes, the same camera continues into the descent; Ch. 04 and the closing stand on the
  same continuous ground.
- **Consistent beyond the opening?** Not yet. See §8.
- **Performance:** hero at rest and with the pointer unchanged; descent 2–3 fps below the old one under load.

## 8. Remaining weaknesses, highest impact first

1. **Field-study worlds** (Ch. 02 index and `/field/:id`): procedural low-poly habitats (blobby snow rocks, smeared
   forest trunks) now sit well below the hero's standard. They were protected by earlier briefs and need their own
   pass (and probably better source assets). *Addressed 12 Oct 2026: `FIELD_STUDIES_VISUAL_PASS.md`.*
2. **The end of the descent** over the Thar: at 4′ the plains read as smooth olive; a finer local grid around the focus
   locality (1′, ~50 KB) would give it real ground texture.
3. **ETOPO 2022 is still not listed on `/sources`** (open since `HOMEPAGE_TERRAIN.md`); the hero now relies on it more
   (the sea floor too). Adding it is a content change to confirm with the author.
