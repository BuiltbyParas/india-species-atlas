# Home page — night to daylight

> **Superseded in art direction (11–12 October 2026) by `HOMEPAGE_DARK_JOURNEY.md`.** The user rejected the
> paper / mist / stone second half; every daylight ground below is gone. The ink scale, Geist Mono, the motion
> tokens, the `.mo-*` primitives and the field-stage fix described here are kept. Read this file as history.

11 October 2026 · branch `atlas/master-04-visual-quality` · uncommitted, on top of
`HOMEPAGE_TERRAIN.md`, `HOMEPAGE_SCROLL_TRANSITIONS.md` and `HOMEPAGE_ART_DIRECTION.md`.

The brief: the home page reads as one long black page from the end of the field
studies to the footer. Rebuild the design system so the scroll is a deliberate
tonal journey, with typography and motion to match, without touching the
three protected experiences.

---

## 1. Baseline (measured, not assumed)

GPU captures of the dev server at 1440 × 900, 34 positions with real wheel
scrolling (scratchpad `base/`), no console errors.

| px (1440 × 900) | Section | Ground today |
|---|---|---|
| 0 – 3,420 | Hero + descent (protected) | night charcoal, warm relief |
| 3,484 – 4,133 | Ch. 02 *The species* (protected) | night charcoal, warm foot |
| 4,133 – 9,533 | Field studies (approved) | five lit worlds: sand, snow, river mist, forest, floodplain |
| 9,533 – 11,529 | Ch. 03 index + dome | **charcoal** |
| 11,529 – 11,809 | scientific-name loop | **charcoal** |
| 11,809 – 15,949 | Ch. 04 pinned map | **charcoal** |
| 15,949 – 16,849 | Closing plate | **charcoal** |
| 16,849 – 17,600 | Colophon | **charcoal** |

About 8,000 px — the whole second half — sit on the same #0b0e0c. The floodplain
(the brightest world) cuts straight back to it: at y = 9,345 the word
"Rhinoceros" is half-printed under a dark band.

## 2. References (browsed with the GPU on, real wheel scrolling; scratchpad `refs/`, `refs2/`)

| Reference | Observed | Taken | Not taken |
|---|---|---|---|
| **lusion.co** | Black loader with a counter; a pale cool-grey editorial middle (statement, work grid); the 3D sits in inset panels with "+" registration marks; a dark climax where the camera flies *through* giant letters; footer light, then a dark "next page" band. One family (Aeonik, font files confirmed) + IBM Plex Mono for micro labels; hierarchy by size and case, not weight. | The ground changes when the *job* of the section changes; quiet light editorial passages between dark spectacle; a mono for instrument-like labels. | Candy 3D, stickers, rounded cards, the swoosh. |
| **v2.lusion.co** | GT Sectra Fine (editorial serif) 60–144 px with NB Akademie 11 px uppercase labels and 15 px/2.0 body; every project section tints the whole ground a different low-luminance hue (purple, teal, slate, mauve); ends on a misty mountain landscape. | Dark is never one black: each dark passage gets its own hue. A serif display with a light sans for furniture — the pairing this atlas already has. | Particle gems, client cards. |
| **webgl-scroll-sync** | A one-hue world: oxblood ground, vermilion type and photographs, mint frames; DOM-synced WebGL planes. | Atmosphere from one colour family per environment. | The bold condensed face, the duotone. |
| **exp-ion / exp-gemini** | One object in darkness, text in the negative space beside it, alternating sides; a dim right-edge index; a light, fogged studio with depth of field. | Text placed where the object is not; light environments can be atmospheric too. | Product voice, glitch. |
| **Vertex3D** | **Not seen in 3D**: its PlayCanvas scene is blocked by this network's web filter (request redirected to a local `…/ips/block/webcat` page). HTML only: a numbered chapter rail ("01 // Digital Twin"…) over one continuous world, project panels with case-study links. | Numbered stops on one continuous world (already the hero's and the field stage's model). | — |
| **Dribbble video** (6 s, downloaded) | A pale plaster world under raking window light; frosted rings, a rolling coin; headline left, object right. | Light can carry depth: matte plaster under a low sun. | The purple glow, the product. |

What carries over, in one line: **a ground per job, never one black; light passages
lit like matter, not like a white page; a mono for the instrument; type placed where
the object is not.**

## 3. Direction — the atlas runs from night to daylight

The opening is the relief at night (protected). The page then moves through one
day of a survey:

| # | Section | Ground | Why here |
|---|---|---|---|
| 1 | Hero, descent | **night** #0b0e0c | protected |
| 2 | Ch. 02 | night, warm foot | protected |
| 3 | Field studies | the five worlds | approved; daylight |
| 4 | Ch. 03 index + dome | **paper** #e8e2d5 | the floodplain's daylight continues onto the register: the twelve as a printed list, the dome as prints in a pale room |
| 5 | Names loop → | paper, then **nightfall** | the scientific names close the register; the ground darkens under them |
| 6 | Ch. 04 pressure | **dusk** #18120d (umber) | threats on dark earth |
| 7 | Ch. 04 response | **slate** #0c1518 (river) | the threads turn water-blue; the ground cools with them |
| 8 | Ch. 04 statement | **mist** #d9ddd5 | "where we choose to protect them" arrives at first light |
| 9 | Closing plate | **stone** #d4cfc3 | the opening's twin in daylight: the same relief, shaded as a plaster cast |
| 10 | Colophon | stone, deeper | the last printed page |

Rules: dark→dark changes are hue tints (v2.lusion); dark↔light crossings happen as a
horizon that moves with the page, never as a uniform mid-grey screen; no text sits in a
crossing.

## 4. Implementation checklist

- [x] Ground tokens + semantic ink levels (`--ink`, `--ink-2`, `--ink-3`, `--rule`) per ground, as `data-ground` scopes
- [x] Type: Geist Mono for instrument labels; statement / meta tokens
- [x] Motion tokens; one vocabulary (line, meta, rule, media, ink, plate, ground)
- [x] Ch. 03 on paper; field → paper dissolve
- [x] Dome on paper (aerial perspective instead of darkness)
- [x] Names loop on paper; the paper → night crossing is Ch. 04's plate (not a fade: see §6)
- [x] Ch. 04 grounds driven by its own timeline (`--prot`, `--close`)
- [x] Closing plate on stone, plaster relief
- [x] Colophon on the home page in stone
- [x] Header + route map + cursor legible on every ground
- [x] Checks: build, typecheck, lint; captures at 1440 and 1920, reverse, jump, reload; reduced motion; no WebGL; perf

## 5. The design system (index.css)

**Grounds.** A section declares its light with `data-ground`. The scope re-points the tokens every component
already draws with — `--color-canvas` (ink), `--color-forest-950/900/800` (the page and its surfaces),
`--color-contour`, `--color-river` — so existing components set dark-on-light without a second stylesheet.

| Ground | Value | Ink | Used for |
|---|---|---|---|
| night (default) | #0b0e0c | ivory #e8e1cf | hero, Ch. 02 (unchanged) |
| `paper` | #e8e2d5 | print #171a16 | Ch. 03, dome, names loop, the margin Ch. 04's plate lands on |
| `dusk` | #18120d | ivory | Ch. 04 pressure; stacked Ch. 04 |
| `slate` | #0c1518 | ivory | Ch. 04 response (a tint, driven by `--prot`) |
| `mist` | #d9ddd5 | print | Ch. 04 statement (driven by `--close`) |
| `stone` | #d4cfc3 | print | closing plate |
| `stone-deep` | #c9c3b5 | print | the home page's colophon |

Accents: terracotta #a85d42 (rules on night) / #8e4a33 (text and line on daylight, 5.1:1 on paper); river
#7ea3b5 on night / #2f5a6e on daylight (5.8:1); sandstone, moss and slate olive are in `@theme` for surfaces.

**Ink scale**, each level mixed at the alpha that holds on its own ground (computed, WCAG 2.x): `--ink`
≥ 11:1, `--ink-2` ≥ 7:1, `--ink-3` ≥ 4.5:1 (meta and small labels), `--ink-4` ≥ 3:1 (large or non-essential),
`--rule` / `--rule-2` hairlines. The night alphas (80/60/46 %) fail on paper (46 % = 2.8:1), so daylight uses
84/70/56 %. `.ink-print` gives type the daylight ink without a ground (Ch. 04's statement over the turning sheet).

**Type.** Newsreader stays the display and narrative face (the hero is set in it and is protected; v2.lusion's
serif + light-sans pairing is the same idea). Geist stays the interface sans. **Geist Mono** (OFL, Google Fonts,
400/500) is new: the instrument's hand for catalogue numbers, coordinates, counts and the short uppercase
labels over them (`.meta-caps`, `.plate-label`, the register's head, the plate caption, the colophon's
headings). `--text-statement` (clamp 2.9–6.6 rem, 0.94, −0.04 em) for chapter statements.

**Material.** `--grain-print`: a fixed ink grain at 6 % on paper and stone (`.ground-print`), one 160 px tile.

**Motion tokens.** `--mo-line-dur` 1.1 s, `--mo-meta-dur` 0.7 s, `--mo-rule-dur` 1.4 s, `--mo-media-dur`
1.4 s, `--mo-step` 55 ms, `--mo-meta-delay` 260 ms, `--mo-rise` 106 %, `--mo-meta-y` 8 px, eases
`--mo-ease-line` (out-expo) and `--mo-ease-rule` (cinema). The `.mo-*` primitives read them.

**Environments.** `paper`, `dusk`, `slate`, `mist`, `stone` join the existing ones (`world/environment.ts`).
The running head's ink and veil follow `data-under`: print ink and a veil of the ground's own colour on
daylight, the ground's own dark (never charcoal) on dusk and slate. The cursor and route map take print ink
over daylight grounds.

## 6. Motion: the sequences

| Sequence | Initial | Range | Intermediate | Final | Backwards / jump |
|---|---|---|---|---|---|
| Floodplain → paper | the world held | host's last screen | the world's own feather (26 % of the distance) plus a 42 svh paper mist rising from the register into its foot (`.sel-mist`, above the stage layer) | paper; register head printed | position-derived both ways |
| Register | rows ruled, names masked | first view | line rise, meta, rule, tally strokes in turn (55 ms step) | the index | plays once; reduced motion shows it |
| Statement ink | 26 % ink | line top 90 % → 51 % | words fill left to right | full ink | scrubbed |
| **Plate** (Ch. 04 arrives) | a night sheet inset 4 vw at the sides and 10 svh at the top, "+" marks at its corners, its caption in the paper margin | `--draw` 0 → 0.8 (section top 85 % → ~25 %) | inset eases out (quadratic), caption lifts and fades | full bleed when the pin holds | `--draw` is ScrollTrigger-scrubbed; identical down, up and after a jump (measured) |
| **Ground** (Ch. 04) | dusk | `--prot` 0.46–0.62, `--close` 0.76–0.94 of the pin | umber → river slate (oklab mix); then first light over `--close` 0.06–0.40, while the lists step back | mist; land lightened, edge inked, protected states in deep river blue; statement in print ink | timeline values; reverses |
| Mist → stone | the plate's mist | the closing's first 42 svh | gradient | stone; neatline, Tropic, name | static |

A uniform screen-wide fade from paper to night was rejected: halfway it is a mid-grey on which neither ink
reads (contrast ≈ 2:1 either way). The crossing is a plate instead — Lusion's inset panel growing to full
bleed, translated into an atlas plate with its registration marks — so every frame has ink on its own ground.

## 7. What was built

| Section | Change |
|---|---|
| Ch. 03 (`SelectionChapter.tsx`) | On paper. A running head ("Plate 03 — 12 species · 3 IUCN categories · 52 indicative localities", counted). Mono catalogue numbers and category labels, serif names, italic binomials, a **tally** of one stroke per indicative locality beside each count. The rising mist. |
| Dome (`DomeGallery.tsx`, index.css, editorial.css) | Caption and furniture on the ink scale; on paper the far side recedes by aerial perspective (lighter, flatter, less saturated) instead of into darkness; a contact shadow under the facing print; names over photographs stay light. |
| Names loop (`HomePage.tsx`) | On paper; closes the register. |
| Ch. 04 (`ConservationMap.tsx`, editorial.css) | The plate (inset sheet, marks, caption with counted figures), its ground through dusk → slate → mist, the map turning to day with it, the statement printed; the hinge moves the sheet 2.5 % west (was 9 %) so the statement keeps to the open sea. Environment follows the phase (`data-env`). Stacked layout: dusk. |
| Closing (`FinalChapter.tsx`, `usePlasterRelief.ts`) | On stone. The ETOPO grid shaded as a pale cast (no tint for height; NW sun at 32°), with the country's own offset shadow; neatline, Tropic, margin note and labels in the mono. The name capped at 6.1 rem so it never outgrows its six columns. |
| Colophon (`Footer.tsx`, editorial.css) | On the home page only: stone-deep, mono headings, links and facts on the ink scale. Other routes unchanged. |
| Field stage (`world/field/stage.ts`) | **Defect fix** (pre-existing, found here): after a "too slow" verdict and its recovery, the layer came back on with its stale position and last frame over whatever the reader had reached (the floodplain printed over Ch. 04). `setMode('host')` now places the layer against the host at once. Reproduced with CPU throttling before the fix (layer visible at y 12,150), hidden after. |

Not touched: the hero, the descent, Ch. 02, the field-study worlds and their compositions.

## 8. Checks (actually run)

- `tsc -b` passes; `npm run build` passes (23 route pages). `oxlint src`: warnings only, none in a file changed here.
- **Captures, GPU on**: 1440 × 900 (34 baseline positions; the new half at 22, then the hand-offs at fine steps);
  1920 × 1080 (28 positions, whole page). No console or page errors in any run.
- **Protected zones**: no protected file modified this session (mtimes). Opening frame: 0 px differ from the
  session baseline (6 % fuzz); descent and Ch. 02 frames 0.3–0.7 % differ, on glyph edges (1–2 px scroll offset)
  and the animated birds and grass only.
- **Reversibility**: at 7 positions from the field hand-off to the closing, scrolling down, scrolling up from the
  footer and a direct jump give the same environment, ground colour, plate inset, ink fill and field-layer state.
- **Reload**: the app returns to the top on every route mount (`App.tsx` `ScrollToTop`, pre-existing, by design),
  so a mid-page reload restarts the documentary at its title; a jump into the middle is the case covered above.
- **Reduced motion** (stacked Ch. 04) and **no WebGL** (`--disable-3d-apis`): all grounds present, text legible,
  photograph fallbacks dissolve into the paper; no errors.

## 9. Cost (measured)

Production build, 1440 × 900, wheel 90 px every 45 ms, rAF intervals per zone, six interleaved runs: the new
layers as shipped vs switched off in the same build (grain, mist, the plate's clipped and tinted ground). The
machine was busy (dev server, browser, live wallpaper; load ≈ 1.7), so absolute rates are lower than the earlier
passes recorded; compare the columns, not the passes.

| Zone | As shipped (fps) | New layers off |
|---|---|---|
| Floodplain → paper | 33.3–37.3 | 36.3–36.8 |
| Ch. 03 index | 35.9–46.4 | 43.6–44.6 |
| Dome | 37.2–41.5 | 40.4–42.7 |
| Ch. 04 plate arriving | 26.3–37.5 | 26.7–29.5 |
| Ch. 04 dusk → slate | 44.6–48.5 | 42.6–48.6 |
| Ch. 04 dawn | 31.9–35.6 | 33.9–36.8 |
| Closing | 38.1–40.0 | 35.0–39.4 |

Within run-to-run spread everywhere; the dome (≈ 1–3 fps) and the dawn (≈ 1–2 fps) may cost a little. Not
measured: an idle machine, other GPUs, DPR 2, phones.

## 10. Limits and left open

- **No new WebGL scene.** The closing relief was considered as a third world on the field stage (no second
  renderer), but the stage holds one host at a time and the closing was already the page's slowest arrival;
  the daylight cast is shaded once in 2D from the same grid instead. WebGL remains the hero and the field worlds.
- Reduced-motion / stacked Ch. 04 meets the closing's stone on a straight edge (dusk → light).
- The ETOPO source is still not listed on `/sources` (open since `HOMEPAGE_TERRAIN.md`).
- Vertex3D's 3D was not seen (network filter); the Dribbble video is 6 s and was read frame by frame.
