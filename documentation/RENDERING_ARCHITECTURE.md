# Rendering architecture

As built on 12 October 2026 (`atlas/master-04-visual-quality`). This describes the code that exists; nothing here is
planned work.

## 1. Renderers and who owns them

| Renderer | Owner | Lives | Draws |
|---|---|---|---|
| Atlas world | `components/home/heroScene.ts` (created by `HeroScrollScene.tsx`) | one fixed canvas in `<body>` (`atlasWorld.ts` `mountAtlasLayer`), clipped to "spans" of the home page | the hero and its descent (act `hero`); Chapter 04, the closing and the colophon (act `atlas`); the hand-off flat into the atlas sheet (`toSheet`) |
| Field stage | `world/field/stage.ts` | fixed body layer that survives route changes | the five field-study worlds (home index and `/field/:id`), each finished by the field film (`world/field/gl/look.ts`, §11) |
| Species gallery | `components/species/galleryScene.ts` | `/species` | 3D gallery |
| Conservation view | `components/map/conservationScene.ts` | `/atlas` conservation mode | extruded states |

Each is three.js r182 WebGL, created lazily (three is a separate chunk), rendered **on demand**: `invalidate()`
schedules one rAF; the frame continues only while something is still easing. No renderer runs a permanent loop.

## 2. The atlas world's scene (hero + atlas acts)

```
HeroScrollScene.tsx ──loads──▶ heroScene.ts (lazy) + india-states.geojson + region-relief (ETOPO 2022)
                                      │
             heroTerrain.ts  buildRegion(): one ground mesh over 59–103°E, 1–41°N
                 │            fine blocks (8′) within 1.5° of India, coarse (16′) beyond, crack-free fans
                 │            height texture (half float: signed metres, land gradient, Laplacian)
                 │            India mask (canvas), draped state lines, skirt round the grid
             heroLight.ts    sky visibility (once, full grid) + lamp visibility (half grid, on lamp move)
                 │
             land material   MeshLambertMaterial + onBeforeCompile chunks:
                             RELIEF_PARS + REGION_PARS · REGION_GROUND (tint, neighbours, water, normals, contours)
                             REGION_LIGHTS (lamp × shadow) · REGION_SKY (sky × occlusion)
                             RELIEF_INK · ATLAS_GLAZE · REGION_SURFACE (glint, sheen, edge to black)
             + borders, graticule, Tropic, markers (instanced), halos, plates, probe, motes, atlas-act threads
                 │
             heroPost.ts     MSAA scene target → bright pass → bloom → composite
                             (DoF, exposure, saturation, tint, contrast, vignette, ACES, sRGB)
```

Fallbacks inside the scene: if `region-relief` fails to load, `loadRelief()` gives India's own 3′ grid and the
pre-existing clipped relief path (`buildRelief`, walls, plinth shadow) is used unchanged; if neither loads, the
extruded slab. `relief.region` switches every regional branch.

## 3. Lifecycle

1. `HeroScrollScene` checks capability (WebGL, reduced motion, wide layout), loads the scene module and data in
   parallel, mounts the atlas layer canvas, creates the scene.
2. First visit: `emerge: true` holds the opening in plan view until the loader hands over (`reveal()`), then the
   emergence runs 3.6 s: lamp rises, camera tilts, lines are drawn north → south.
3. Scroll progress (`setProgress`), pointer (`setPointer`), probe (`setProbe`) and momentum are pushed in; the scene
   damps its own copies by time.
4. Chapters 04 / closing push act state (`setAct('atlas')`, `setAtlas`, `setTrace`) through `atlasWorld.ts`.
5. Off screen or in a background tab: `setActive(false)`; nothing renders.
6. `dispose()`: geometries, materials, textures, the plate atlas, the post chain, the light pass's targets and
   materials (`reliefLight.dispose()`), then the renderer.

## 4. Camera

One `PerspectiveCamera`, posed every frame from a spherical offset about a look target, then slid sideways
(`restShift`/`restShiftWide`) so the subject clears the copy. Hero: `openFrame` (plan → three-quarter during the
emergence; `PLAN_PITCH` 1.47, `PLAN_DISTANCE` ×1.16) interpolated to the descent's end pose over the focus locality.
Atlas act: blended poses (`POSE_DARK` → `POSE_PRESSURE` → `POSE_RESPONSE` → `POSE_STATEMENT` → `POSE_REMAIN` →
`POSE_SINK`). `toSheet` lays it straight down at the atlas sheet's scale for the route hand-off.

## 5. Light

- **Lamp** = the scene's first directional light (`key`). Hero act: placed from two `Spring`s (azimuth, elevation;
  `SPRINGS.lamp`) whose targets come from the emergence, the scroll and the pointer (`stepLamp`, `placeLamp`). Atlas
  act: from the pose. Every frame `renderFrame` hands `key.position` to `reliefLight.update()`, which redraws the lamp
  texture only if the direction moved more than ~0.1°.
- **Shadow** (`heroLight.ts`): per texel of a half-resolution target, a ray marched towards the lamp over the
  exaggerated heights, 44 geometric steps (×1.115), soft by a distance-proportional penumbra (tan 0.022). Read by the
  land shader and multiplied into the key's colour only (`REGION_LIGHTS`, `UNROLLED_LOOP_INDEX == 0`).
- **Sky**: hemisphere light (cool sky, dark ground), multiplied by the sky-visibility texture (8 directions × 12
  steps, drawn once).
- **Rim**: dim cool directional fill, unshadowed.

## 6. Shader organisation

All scene shaders are template strings in `heroScene.ts` injected into three's materials with `onBeforeCompile`, so
fog, tone mapping hooks and lights stay three's. Chunks are named for what they draw (`REGION_GROUND`,
`REGION_SURFACE`, …). The light pass's two fragment shaders are in `heroLight.ts`; post shaders in `heroPost.ts`.
Uniform branches (`uProtAmt > 0 || uAtlasDim > 0`) keep act-only reads out of the hero.

## 7. Assets and loading

| Asset | Size | Loaded |
|---|---|---|
| `public/relief/region-relief.{bin,json}` (ETOPO 2022, 660 × 600 at 4′, int16 planar-predictor + zlib) | 432 KB | hero, after the scene module is requested |
| `public/relief/india-relief.{bin,json}` (3′, India only) | 151 KB | flat fallback, closing's sheet version, and the 3D fallback |
| `public/india-states.geojson` | (existing) | every map |
| three.js chunk | 140.6 KB gzip | lazy |

Built by `scripts/geo/build-region.mjs` / `build-relief.mjs` (shared NetCDF reader `scripts/geo/netcdf.mjs`),
reading NOAA's ERDDAP subset; provenance in each sidecar JSON. Decoded with `DecompressionStream`.

## 8. Quality adaptation and measured cost

- Tier (`world/quality.ts`: high / balanced / low) sets mesh step (2, or 3 on coarse pointers and the low tier),
  particle budgets and the device pixel ratio cap (1.5).
- `FrameGovernor` walks two rungs (post quality 1 + DPR ≤ 0.85; post quality 2 + DPR ≤ 0.62), then asks for the
  flat fallback (`onTooSlow`). `?hold=1` (dev) freezes it for captures.

Measured on 12 Oct 2026: headless Chromium, `--use-angle=gl --enable-gpu`, the author's integrated AMD GPU,
1440 × 900 at DPR 1, machine loaded (live wallpaper, a browser, another editor session). Production builds of the
pre-change tree (`refs/backups/pre-lusion-pass` + its untracked files) and this tree, served side by side, measured
interleaved; wheel 90 px every 45 ms down the whole page, then 5 s of pointer movement over the hero.

| Zone | Before (fps, 2 runs) | After (fps, 2 runs) |
|---|---|---|
| Hero, pointer moving (lamp + shadow pass every frame) | 60.0 · 59.7 | 59.9 · 59.9 |
| Descent | 55.0 · 54.0 | 50.9 · 53.2 |
| Ch. 02 + field studies | 48.7 · 47.4 | 48.3 · 46.6 |
| Ch. 04 | 56.6 · 57.6 | 55.5 · 56.7 |
| Closing + colophon | 60 · 60 | 60 · 60 |

One session, runs interleaved cur / base / cur / base. Earlier sessions gave the same picture; the descent gap was
6–7 fps before the overdraw and half-resolution-lamp fixes, 2–3 fps after. The descent now fills the whole frame with
lit ground where it used to be mostly black, which is where the remaining cost is.

GPU time (dev build, 1440 × 900, `readPixels` sync): whole frame ≈ 9.9 ms at rest, 10.4–10.9 ms in the descent;
the ground ≈ 4.3 ms of it; the lamp pass ≈ 0.6 ms when it runs. Not measured: DPR 2, other GPUs, real phones.

## 9. Fallbacks

| Condition | Result |
|---|---|
| No WebGL / `prefers-reduced-motion` / narrow-and-coarse as before | flat hero: SVG + 2D-canvas shaded relief from India's grid, same type composition |
| Region grid fails | India's 3′ clipped relief (pre-existing path) |
| No `DecompressionStream` | extruded slab |
| Governor's last rung too slow | flat hero (`onTooSlow`) |

## 10. Instrumentation

Dev only: `window.__heroScene` — `info()` (draw calls, triangles, programs), `mesh` (vertices, triangles, fine
blocks), `rung()`, `tune(fn)` (live art direction: the opening frame, lamp, region uniforms, lights, post, render a
frame). `window.__lenis` for exact scroll positions.

## 11. The field stage's pipeline (12 October 2026)

```
world.update(input)            camera rig, sun direction (progress + hand), grade values
world.prerender(renderer)      Sunlight.update(): sun texture redrawn if the sun moved > 0.2° (half the grid's size)
FieldLook.render(scene, camera, grade, clear, target, volume?)
  scene → half-float target (2 samples balanced, 4 high, 0 low) + depth texture
  volume (forest only): shafts marched along each view ray through the canopy's flecks, half size, blurred once
  bloom: bright pass → two blur pairs at quarter size
  composite: + bloom + volume → exposure, white balance, saturation → ACES → sRGB → split tone, contrast,
             vignette, dither → screen (or the dissolve compositor's targets)
```

Every world's materials share three GLSL chunks: `GLSL_FIELD_SUN` (sun direction and colour), `GLSL_AIR` (height fog
with forward scatter; grass and leaves evaluate it per vertex) and `GLSL_SUNLIGHT` (reads of the world's sun grid).
Sun grids per world: mountain near 241 × 169 (outer: the far sheet's 271 × 190); grassland 561² fine + 211² coarse;
river 1000 × 300 (the bed it already samples) + the land mesh; forest ≈ 412 × 536 with a canopy band (sun texture
at 0.75); floodplain ≈ 462 × 401 + 334 × 168. Sky visibility is drawn once per world.

Measured cost (production builds, this machine, details in `FIELD_STUDIES_VISUAL_PASS.md` §6): grassland, mountain
and river at the old frame rates; forest ≈ 53 fps while scrolling (was 60); floodplain ≈ 49 (was 52). The governor's
first step drops multisampling (the largest single cost, ≈ 3 ms at 1440 × 900); the second drops bloom and thins grass.

Field-study polish (12 October 2026, `FIELD_STUDIES_POLISH.md`): `FieldInput.light` (mouse + hand-set aim on the lamp
spring) turns each world's sun; `CameraRig` takes an optional `narrow` pose per shot for upright phones (the river's
opening and first chapter use it); `foliage.ts` gains `spray` (each card a spray of small leaves, cut in the fragment
shader — same geometry) and `depthShade` (a clump's underside and interior in its own shade), used by the forest's
crowns, which are now domed, varied in height, with emergents and a midstorey under gaps; the floodplain's sky is a
warped two-scale deck lit from beneath its sunward edge plus a scud sheet near the horizon, still one pass in the sky
dome (the water's reflection reads the deck only); the snow leopard is a cut-out (`scripts/assets/leopard-matte.py`).

Whole-experience review (12 October 2026, `WHOLE_EXPERIENCE_REVIEW.md`): `FieldStage.show()` returns without acting when a
later request has replaced its world while that world was being built (`this.wanted !== id` after each `prepare`); the
study page does not push scroll progress while the stage is held in front. Measured on the reader-paced home scroll under
load: the hero's scene gives up at Ch. 03 → 04 (page 18,575 → 15,461 px) — unchanged, recorded as the top remaining weakness.
