# Visual quality pass 2 — the field studies

12 October 2026 · branch `atlas/master-04-visual-quality` (premium worktree) · **uncommitted**, on top of the
uncommitted Raking Light homepage (`LUSION_LEVEL_PASS.md`). Pre-change tree: git ref
`refs/backups/pre-field-pass-2` (tracked files, `git stash create`) plus a tarball of untracked files in the session
scratchpad (`pre-field-pass-untracked.tgz`).

Scope: the five field-study worlds (`src/world/field/**`), their page frame (`src/components/field/**`,
`src/pages/FieldStudyPage.tsx`) and the home page's field-studies index, which shows the same worlds. The homepage
hero, Chapters 03–05 and every other route are out of scope and unchanged.

## 1. Audit — why the field studies look weaker than the homepage

Baseline captured on the running dev server (headless Chromium, `--use-angle=gl`, integrated AMD GPU, 1440 × 900,
`?hold=1`): every chapter of every study plus the home index. 0 console errors. Tier `balanced` on this machine.

| Area | Homepage (Raking Light) | Field studies (before) |
|---|---|---|
| Register | Night; one low lamp; most of the frame allowed to fall into shadow; ivory type on dark grounds | Four of five worlds are pale daylight (parchment, ice-white, sage) with dark type — the "pale ivory/parchment/stone" register the author rejected for the homepage on 11 Oct. Entering Ch.02 from the hero is a jump from night to a bleached day. |
| Light | Directional lamp with **cast shadows** (heightfield pass) and sky occlusion; warm key, cool fill | Hand-written Lambert-ish terms, **no cast shadows anywhere**; every surface lit almost evenly; the sun is high and soft, so form reads weakly |
| Pipeline | HDR target → bloom → exposure → ACES → grade → vignette | No post at all: shaders write display-sRGB straight to the screen. No highlight roll-off, no bloom on sun or glints, no grade, banding in pale skies |
| Atmosphere | Depth haze tuned per act | One uniform fog colour mixed in by distance. Everything recedes into the same flat pale haze; low contrast in every frame |
| Subject | — | Photograph **panels** (bustard, snow leopard, dolphin) dissolve into a soft rectangular halo of their own background — the single most visible "cheap" tell. The two cut-outs (tiger, rhinoceros) read far better but are not lit by the scene: no matched key, no rim, a blob shadow only |
| Geometry | Measured relief | Snow-leopard: needle peaks, white plastic boulders, smeared snow. Thar: scrub domes read as mossy boulders; flat card grass. River: "broccoli" trees. Forest: textured green blobs from above (Ch.04); smeared bark. Floodplain: flat ellipse trees, spiky grass |
| Composition | One subject filling the frame, title in negative space | Openings are reasonable, but the aerial "map" chapters (bustard 05, leopard 06, dolphin 03, tiger 04, rhino 04) are the weakest frames on the site: blobs seen from above in haze |
| Motion | The lamp follows the hand with weight; shadows swing | Camera paths only; the hand nudges a sun whose effect is invisible because nothing casts a shadow |

Root cause in one line: **the field stage has none of the homepage's light model** — no shadows, no HDR/grade, no
directional atmosphere — and its worlds are art-directed for a bright, even daylight that the homepage abandoned.

## 2. Direction — one light model, five hours of the day

The homepage's premise is a place read by one low light. The field studies keep that premise and give each habitat
its own *hour*, chosen for what that habitat looks like in raking light — so the five are not recoloured copies:

| Study | Hour and light | The one thing the light does |
|---|---|---|
| Mountain · snow leopard | First light: the sun a few degrees up, the valley still in blue shadow | Summits catch the sun first and ridges throw long shadows across the snowfields — the homepage's own entrance event, at ground level |
| Grassland · bustard | Last light: the sun low in the west, behind the birds | Grass glows from behind; tussocks and scrub throw long shadows across the plain; dust haze glows around the sun |
| River · dolphin | Early morning: low sun over the water, mist lying on the river | A glitter path on the water; the banks and tree line in silhouette; mist layers |
| Forest · tiger | Morning sun through a broken canopy | Shafts of light in the air; sun flecks on the floor; the tiger in one of them |
| Floodplain · rhinoceros | A break in monsoon cloud: dark slate sky, sun under the cloud from the side | Grass and the animal lit gold against a dark sky |

Shared, so the five read as one studio's work: one sun with real cast shadows worked out over each world's own
ground (the homepage's heightfield technique), one atmosphere model (height fog + forward scatter toward the sun),
one HDR pipeline with the homepage's tone curve (exposure → ACES), one subject treatment (the photograph lit by the
scene's light and casting the scene's shadow), dark grounds and ivory type for every study, and the hand turning the
sun a few degrees, as it turns the lamp on the homepage.

Not added: particles, lens flares, depth-of-field gimmicks, new 3D models, new libraries.

## 3. The shared system (what makes the five one studio's work)

| File | What it does |
|---|---|
| `src/world/field/gl/look.ts` (new) | **The film.** A world that carries a `grade` writes linear light into a multisampled half-float target; the film adds bloom (what is brighter than `threshold`), an optional volume (below), exposure, white balance, saturation, then the homepage's ACES curve and sRGB, then split-tone, contrast, vignette and dither. Steps down with the frame governor: rung 1 halves the samples (2 → 0 on the balanced tier), rung 2 drops multisampling and bloom. A NaN/Inf guard keeps one bad pixel from smearing through the blur. |
| `src/world/field/gl/sunlight.ts` (new) | **The sun.** The homepage's heightfield light (`heroLight.ts`) generalised: a world stamps what stands in the light into a grid — `solid` (ground, rock, scrub, trunks, the animal's bulk), an optional `band` of foliage above open air (a canopy), an optional coarser `outer` grid (far ranges). One GPU pass marches each texel toward the sun (visibility at the solid's top, under the canopy plane, and at the canopy's top); one pass works out sky visibility once. Redrawn only when the sun moves more than 0.2°, at half the grid's resolution by default. `withFar()` pairs a fine grid near the subject with a coarse one over the whole ground. GLSL readers: `sunGround`, `sunGroundSoft` (4 taps, for near ground), `sunAbove`, `sunUnder`, `sunCanopy`, `skyGround`. Stamping helpers: `stampSolid`, `stampBand`. |
| `src/world/field/gl/air.ts` (new) | **The air.** Exponential height fog with forward scatter toward the sun (Henyey–Greenstein) and a sky whose horizon is the fog's own colour at that bearing (`skyAlong`), so ground meets sky without a seam; `skyDome()` for each world's sky with its own clouds. |
| `src/world/field/gl/subject.ts` (new) | **The animal.** One treatment for every photograph: the light that reaches the ground just sunward of the animal's bulk (so it shares the shadow of a ridge, a tree, a grass stand), half of that light's colour kept (the fur keeps its own), a rim where the cut's outline faces the sun (from the alpha's gradient, strongest when backlit), darker feet, the same air, and depth written where it is solid (so a forest's shafts are measured to it). Turns toward the camera within a limit and gives way when seen steeply from above. |
| `src/world/field/gl/foliage.ts` (new) | **Leaves.** A clump is thousands of small cards scattered through an ellipsoid and cut to a rounded leaf, shaded by the clump's normal, darkened with depth into the clump, lit through when backlit, and reading the sun grid per leaf. Used for thorn scrub, riverine trees, forest crowns and understorey, and the floodplain's tree line. |
| `src/world/field/stage.ts`, `types.ts` | `FieldWorld.grade` and `FieldWorld.volume`; the stage renders a graded world through the film (into the screen or the dissolve's targets); its own canvas no longer multisamples. Dev only: `window.__fieldStage()` (worlds, film) for per-layer cost measurement. |
| `src/world/field/gl/terrain.ts`, `ground.worker.ts`, `grounds.ts` | `groundGrid()` samples a ground's heights on a finer grid in the worker, for the sun grid. `mountains()` reshaped (warped ridgelines blended with a smoother field; no needle peaks). |
| `src/content/fieldStudies.ts`, `FieldStudyPage.tsx`, `FieldStudiesIndex.tsx`, `field.css`, `index.css` | One `studyTone()`: every study is now on a dark ground with ivory type (the light-world header overrides and per-study light tones are gone); per-study grounds, lines and scrims; the chapter and index veils fade long before their edge so they never print as a shape over a bright sky; on the index the whole stage (type too) takes the world's feather, so a study's name leaves with its world. |
| `src/components/field/chapters.tsx` | The honesty notes now say what is drawn (including the chosen hour or weather) and that each animal is a photograph cut out (or, for the leopard, matted) and toned to the drawn light. |
| `src/assets/field/` | New: `great-indian-bustard-cutout.webp`, `ganges-river-dolphin-cutout.webp`, `snow-leopard-matted.webp` (see `CREDITS.md`). No segmentation model was run: the bustard and dolphin cuts come from the earlier 1400 px trial masks scaled onto the full-size originals; the leopard's is a hand-drawn feathered matte (a soft crop, not a cut-out). |

**Shared rules.** One low sun per world, from a side that models the subject; most of the frame allowed to fall into
shadow; shadows cast by what is drawn; the hand turns the sun a few degrees (mouse; as the homepage's lamp) and the
shadows move with it; the photograph takes the world's light, never the reverse; type sits in the darker part of
the frame. No particles, lens flares, depth-of-field or new libraries.

## 4. The five, as built

| Study | Hour | What the light does | Technique chosen for this habitat | Subject |
|---|---|---|---|---|
| **Mountain** (representative, built first) | First light: sun 4–11° up from the east, climbing through the study | Summits and east faces lit gold, valley and terrace in blue shadow, ridges' shadows across the snowfields; the light reaches the terrace by the end | Two sun grids (near sheet, far ranges as the near grid's `outer`), snow with wrap lighting and sparkle, couloirs down the fall line, wind ripples near the camera, reshaped ranges, chiselled boulders (convex blocks cut by planes, flat-shaded) | The record's photograph with a hand-drawn soft matte; its snow is given the terrace's snow in the same light, the fur keeps its colour |
| **Grassland** | Last light: sun 4° → 2° in the west, behind the birds' right | Long shadows of every tussock, scrub clump and swell comb the plain; grass glows from behind; dust glows round the sun | Fine grid (0.5–1 unit) with every tussock stamped as a cone; foliage scrub; grass translucency; high cloud lit from below | Cut-out pair, rim-lit; their bulk casts long shadows |
| **River** | Early morning: sun 6° → 11°, ahead-right over the water | Glitter path of twinkling facets (each fleck of chop tilted its own way); the far tree line in silhouette and reflected; tree shadows across the water; mist drifting downstream | The river's own bed grid reused as the sun grid; water with swell (reflection) and chop (glints) separated; geometric reflection of the far bank; two mist sheets moving with the current | Cut-out at the photograph's own waterline, rim along the back, a ring spreading from it |
| **Forest** | Mid-morning: sun ~32° behind the tiger | Shafts through canopy gaps, flecks on the floor and trunks, the tiger standing in a shaft | Layered grid: trunks as columns, crowns as a canopy band with an opening placed over the clearing; volumetric shafts marched per pixel at half size through the canopy's flecks (the film's volume pass); trunk normals corrected for the instance scale | Cut-out lit by its shaft, rim along the back, writing depth so the shafts stop at it |
| **Floodplain** | Storm light: sun 6° under the western edge of a cloud deck, behind the camera | Grass heads, tree line and animal lit gold against a slate sky; long shadows of the tall stands; wallows and beel hold the dark sky; rain hanging from the deck away from the sun; wind waves through the grass | Cloud deck shared by sky and water reflection; tall and mid stands stamped in the grid (short turf deliberately not: it printed as a checker); stronger, gusting wind | Cut-out (Mukherjee photograph, not the record's), mud on the legs, lit by the low sun |

Camera paths were kept (the chapters' text positions depend on them); openings were recomposed where the new light
needed it (the grassland's camera moved to eye level and closer to the birds; the forest's reserves shot is now an
oblique view across the canopy instead of straight down, which showed bare ground and trunk tops).

## 5. Checks actually run

All on this machine: integrated AMD GPU, headless Chromium with `--use-angle=gl`, about 0.7–1.4 GB RAM free with
swap in use, a live wallpaper and other sessions running (so not an idle machine).

- `npx tsc -b`: pass. `npm run build` (tsc, Vite, postbuild — 23 route pages): pass. `npx oxlint src`: only
  warnings in files this pass did not touch (`SpeciesScene.tsx`, `PresentationSection.tsx`, `HeroScrollScene.tsx`,
  `SpeciesWorldPage.tsx`).
- Captures, 1440 × 900, dev server with `?hold=1` (governor frozen), every chapter of every study plus the opening:
  before (`~/.cache/ispa-field2/before/`) and after (`…/after/`), contact sheets `…/sheet-before-*.jpg` and
  `…/sheet-after-*.jpg`; the home page's index before and after (`sheet-before-home.jpg`, `sheet-home2.jpg`,
  `sheet-home3.jpg`). Final after set: **0 console errors** (one three.js warning found and removed afterwards).
- Pointer: the sun follows the mouse in every world; checked by capture at left/right positions (the mountain's
  ridge behind the leopard catches the light when the hand moves right). Touch: no sun movement (unchanged from
  before; the homepage's tap-to-swing was not carried over).
- Reduced motion (`reducedMotion: 'reduce'`): forest and mountain render static compositions, no errors.
- Phone (390 × 844): bustard, dolphin and rhinoceros openings and chapter 2 render, type readable over the veils.
- No WebGL (`--disable-3d-apis`): bustard and tiger fall back to the photograph on the new dark grounds, readable.
- Defects found in review and fixed during the pass (each seen in a capture first): photograph striped by per-pixel
  sun reads; bright snow margin round the leopard; needle peaks and faceted far ranges; NaN pixels from grass
  extrapolated past 0–1 under multisampling (smeared into black squares by bloom); grass hiding the birds and
  knee-height camera; birds shadowed by their own stamped bulk; scrub as boulders, then as torn foil, then as visible
  triangles (now rounded leaf cards); river and forest washed out by over-dense air; the dolphin's glitter as one
  blob; tree reflections speckled by chop; the tiger erased by shafts drawn over it (no depth); trunks lit like the
  floor (normals scaled by the instance's height); trunks poking above the canopy; checkered turf shadows; the
  rhinoceros black in its own shadow, then blown white.

## 6. Performance (measured, not estimated)

Production builds of the pre-change tree (`refs/backups/pre-field-pass-2` plus its untracked files) and this tree,
served side by side, measured in alternation, a fresh page per run: 7 s scrolling down the study and 3 s back up,
then 4 s of the hand circling (the sun grid redrawn every frame). Governor live (it may step down). Two runs each.

| Study | Before: scroll / hand (fps) | After: scroll / hand (fps) | After: governor |
|---|---|---|---|
| Grassland | 59.9 · 60 / 60 · 60 | 59.0 · 59.4 / 60 · 59.5 | full quality |
| Mountain | 59.7 · 59.9 / 60 · 59.8 | 59.1 · 60 / 60 · 60 | full, or one step (no visible change at DPR 1) |
| River | 60 · 60 / 60 · 60 | 60 · 60 / 60 · 60 | one step, as before |
| Forest | 60 · 60 / 60 · 60 | **53.8 · 53.0** / 58.5 · 58.0 | full quality |
| Floodplain | 52.7 · 51.7 / 56.3 · 56.3 | **48.8 · 49.6** / 53.8 · 54.0 | full quality |

The forest costs about 6 fps while scrolling on this GPU and the floodplain about 3 (it was already the heaviest
study). Getting there: half-resolution sun textures, 0.2° redraw threshold, two samples instead of four on the
balanced tier, per-vertex air for grass and leaves, one sun read per grass tuft, the floodplain's water shaded only
where there is water, fewer leaves on distant trees, a forest sun that moves with the hand but not the scroll, and
a half-size, blurred shaft pass. Not measured: DPR 2, other GPUs, real phones, an idle machine.

## 7. Honest assessment — what still falls short

*Follow-up (same day): `FIELD_STUDIES_POLISH.md` addresses the forest roof, the leopard's margin, the dolphin on a phone, the floodplain's cloud and touch light; what it did and did not fix is recorded there.*

- **Forest**: the best single frames on the site outside the hero, but the costliest (≈53 fps scrolling here). Its
  over-canopy chapter still reads as a field of paper leaves, and its floor flecks are blobs at the grid's
  resolution rather than the round sun-flecks a real canopy makes.
- **Mountain**: the leopard is a matted photograph, not a cut-out; seen wide (the last chapter) a soft lighter
  margin still shows. The chiselled boulders are low-poly at close range.
- **River**: the dolphin is one photograph in one pose, larger than life in the opening; on a phone the opening
  puts it under the text. Mist is two drifting sheets, not a volume.
- **Floodplain**: the cloud deck is convincing as a mood, not as cloud structure (streaky noise, no real cumulus
  forms); the rhinoceros reads a little pale and flat against the saturated grass.
- **Grassland**: the strongest of the five in motion; up close the scrub's leaf cards are visible at its edges.
- **All**: the animals are photographs on cards, so very steep or side views still give way (by design); touch has
  no light interaction; nothing was checked on a real phone or a second GPU.

Not done: the homepage hero (out of scope), committing (not asked), a reduced-motion pass on all five, a real
idle-machine measurement.

## 8. Development aids

`?hold=1` freezes the governor (dev); `?novol=1` turns the forest's shafts off (dev), to judge the rest of its light;
`window.__fieldStage()` exposes the stage's worlds and film (dev). Scripts used in this pass (run with
`TMPDIR` on disk; see the header of each): `scripts/audit/field-pass-capture.mjs` (every chapter; env `IDS`, `CH`,
`W`/`H`, `RM`, `NOGL`, `OUT`), `field-pass-home.mjs` (hero and index), `field-pass-perf.mjs` (baseline vs current
frame timing; serve the two builds on :4302 and :4301), `field-pass-ablate.mjs` (cost of each scene layer, dev
server), `field-pass-pointer.mjs` (the sun under the hand).
