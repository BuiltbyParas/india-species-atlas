# Field-study polish — the remaining weaknesses

12 October 2026 · branch `atlas/master-04-visual-quality` (premium worktree) · **uncommitted**, on top of the
uncommitted field-study visual pass 2 (`FIELD_STUDIES_VISUAL_PASS.md`). A targeted finishing pass, not a new
direction. Pre-change tree: git ref `refs/backups/pre-field-polish` (tracked files, `git stash create`) and a full
copy of the working tree, untracked files included, at `~/.cache/ispa-field3/baseline/` (also the "before" build).

## 1. What was weak, and where it came from

| Weakness | Component responsible | Cause found |
|---|---|---|
| Forest canopy reads as paper | `world/field/worlds/forest.ts` (crowns), `world/field/gl/foliage.ts` (leaf cards) | Each leaf card was one flat-coloured leaf about 7.5 units across (≈ 85 px at the over-canopy chapter's distance): a crown was a few dozen paper cut-outs. All crowns sat in one 10-unit height band, lobes scattered at random, so the roof was a flat field; gaps showed bare, sunlit floor and the open tops of trunks that had no crown over them. |
| Pale edge round the snow leopard | `assets/field/snow-leopard-matted.webp` and the panel shader in `worlds/himalaya.ts` | Not a cut-out: a hand-drawn polygon blurred 34 px, so a margin of the photograph's own snow and rock surrounded the animal. The shader then mixed drawn snow into every partially transparent pixel (`edge * 0.35`), whitening the fur's edge too; and the transparent pixels still held the snow's white, which the texture's smaller mip levels averaged back into the edge in the wide shots. |
| Dolphin under the text at 390 px | `worlds/river.ts` camera path, `world/field/cameraRig.ts` | The opening shot is composed for a wide screen (dolphin upper left, words right). On an upright phone the horizontal field of view is about 25°, so the dolphin is cut by the left edge and lands under the chapter's note; the next chapter's framing loses it entirely. The rig had no way to compose a shot differently for a phone. |
| Flat floodplain cloud | `worlds/floodplain.ts` (`CLOUD` chunk, sky dome and water reflection) | One flat noise layer read in perspective, coloured by a lit-underside term that was strong everywhere near the horizon: an even brown-orange ceiling with soft dark blotches, no masses, no relief, no second plane. |
| No light control on touch | `world/field/stage.ts` | The stage fed the worlds the mouse position only (`pointer.type === 'mouse'`); touch and keyboard had nothing. |

## 2. What was changed

### A. Forest canopy (`worlds/forest.ts`, `gl/foliage.ts`)

- **Sprays, not sheets.** `foliageMaterial({ spray: true })`: each leaf card is cut in the fragment shader into a
  spray of small leaves on a jittered grid (each its own angle, length, width and shade, a sixth of them missing, a
  little hue variation). Same instanced geometry, one triangle per card; the cost is in the fragment, mostly the
  layers seen through the sprays' gaps from above (§5). Compiled in only where asked (`#define SPRAY`,
  `DEPTH_SHADE`): the forest's crowns. Scrub, riverine trees and the floodplain's tree line compile exactly their old
  shader.
- **Fewer leaves, not more.** 111k → 107k leaf cards: crowns behind every camera in the study keep a third of their
  leaves (their light is in the grid all the same), far crowns fewer and larger sprays, and every crown's leaves lie
  in its outer shell (`shell: 0.72`), where they can be seen.
- **Crowns as domes.** One lobe on top, the rest in a ring below it, so a crown seen from above has a lit top and a
  shaded skirt. `depthShade` darkens a clump's underside and interior (its own shade), with the sky's light lifting
  the deepest leaves so a shaded crown reads as dark green rather than as holes.
- **A roof that rises and falls.** Crown heights vary over 16 units instead of 10; about one in eight is an emergent,
  9–15 units above the roof and a fifth larger, breaking the skyline.
- **A midstorey under the gaps.** Every trunk with no crown over it is shortened to 50–72 and given a smaller crown,
  except along the shaft's way down to the tiger, which stays open. Looking down into a gap now finds foliage in shade
  instead of lit floor and open trunk tops. Trunks are stamped into the sun grid at their real height.
- **Ground level kept.** Every new random choice comes from a second stream (`seededRandom(97)`), so the trunks,
  shrubs, logs and grass round the tiger are exactly where they were. The sun flecks on the floor do change (they come
  from the canopy that is drawn): the clearing is now one larger pool of light with a long shadow across the
  foreground.

### B. Snow leopard (`assets/field/snow-leopard-cutout.webp`, `scripts/assets/leopard-matte.py`, `worlds/himalaya.ts`)

- A cut along the animal's outline replaces the soft matte: OpenCV GrabCut seeded by the earlier isnet trial mask
  (eroded; its block of snow removed by colour), hand-placed outlines for the tail and the near foreleg (which the trial
  mask lost), every snow-coloured pixel outside the body as background; the outline softened by a guided filter on
  the photograph, so fur keeps partial alpha.
- Kept from the photograph: the snow ledge under the far paws (soft, and turned into the drawn snow by the shader) and
  the rock under the near forepaw (solid at the paw, sinking into the snow below), so the animal still stands on
  something and its tail still hangs over the ledge.
- Decontamination: inside the soft edge the snow's colour is replaced by the fur's own, pulled outward from where the
  animal is solid; every transparent pixel is filled with the nearest fur colour, so the texture's small mip levels
  (the wide chapters) no longer average the background's white into the edge.
- Shader: drawn snow is no longer mixed into every partially transparent pixel — only into snow-coloured ones (the
  ledge); the edge noise applies to the ledge only.
- It is still the photograph, cut out; the page now says so ("cut out with the ledge it stands on").

### C. Dolphin on a phone (`world/field/cameraRig.ts`, `worlds/river.ts`)

- `Shot.narrow`: a shot may carry a second composition for an upright phone, taken over as the screen narrows (aspect
  0.85 → 0.6). Shots without one are unchanged on every screen; the desktop is unchanged.
- The river's opening (two shots) frames the dolphin whole and centred in the band of river between the chapter's
  words above and the title below; the habitat chapter drops it, small, below its words, so the first scroll keeps the
  animal in view as the camera pulls back. Text, wrapping and content are untouched.

### D. Floodplain cloud (`worlds/floodplain.ts`, `CLOUD`)

Still a 2D sky, one pass of the sky dome, no ray marching:

- **Deck**: large masses (low-frequency noise) carrying billows (domain-warped, finer); thicker is darker. The
  pattern is read on a gentler curve than a flat sheet, so billows overhead are round rather than stretched into
  streaks, while toward the horizon they still crowd.
- **Light from beneath**: the deck ends a few of its heights sunward of the camera; the sun, low under that edge,
  lights the underside strongly near it and less the further in, so the ceiling overhead is touched with warm light
  and the far deck goes to slate. Each billow's sunward flank catches it (the field read once more, a step sunward).
- **Second plane**: ragged scud under the deck near the horizon, dark against a lighter strip of air at the horizon
  (the far side of the storm), gold on its sunward edge. Rain curtains away from the sun as before.
- The water's reflection reads the deck only (no flank read, no scud). The pattern is scaled from the direction's
  horizontal part, so it has no seam at the zenith, which steep reflections reach.
- Grass, rhinoceros and water are unchanged; they now stand against a dark slate sky rather than a brown one.

### E. Light by hand on touch and keyboard (`stage.ts`, `types.ts`, five worlds, `FieldLight.tsx`, `field.css`)

See `INTERACTION_SYSTEM.md` §23: one aim on the stage, on the homepage lamp's spring; the worlds read `input.light`
(mouse + aim) for the sun and `input.pointer` for the camera; a range input ("Light") in the study's furniture for the
keyboard and for touch; a sideways drag anywhere on the study for touch; vertical scrolling and pinch-zoom left to the
browser (`touch-action: pan-y pinch-zoom`); a short, once-a-session hint where there is no hover; reduced motion sets
the light without the swing.

## 3. Visual evidence

Production builds of the pre-change tree (`~/.cache/ispa-field3/baseline`, served on :4302) and this tree (:4301),
headless Chromium with `--use-angle=gl` on the integrated AMD GPU, `?quality=balanced`, frame governor live (its rung
is logged with each study; most "after" desktop captures ran at rung 1, so without multisampling, and the
floodplain's sky at its first detail step, without scud). Captures in `~/.cache/ispa-field3/{before,after}/`, contact
sheets beside them; the before/after page published for review (https://claude.ai/artifact/Uw7X1nz3HrJMhpCzv4pRPL) collects the comparisons:

- forest roof at its weakest angle (Ch. 04, over the canopy) and at 100 %; the ground-level opening for coherence;
- the snow leopard close (Ch. 05) and wide (Ch. 08) against its final background;
- the dolphin opening at 390 × 844 and 430 × 932, and the first scroll as six settled frames at 390;
- the floodplain sky, opening and closing;
- the light turned by touch (phone) and by keyboard (desktop);
- the five openings side by side at 390, and the home page's field-studies index.

## 4. Checks

All on the production build unless stated.

- `npx tsc -b`, `npm run build` (23 route pages): pass. `npx oxlint` on `src/components/field`, `src/world/field`,
  `src/pages/FieldStudyPage.tsx`: nothing reported.
- Routes (`scripts/audit/field-polish-checks.mjs`): 14 routes × 1440 × 900 and 390 × 844 (touch), each study scrolled
  to its end — no horizontal overflow, no console errors. One failed request on the snow leopard study, the footage
  clip's `net::ERR_ABORTED` when it is scrolled past; the baseline build does exactly the same.
- No WebGL (`NOGL=1`): all five studies `flat` (the photograph), no light control, no overflow, no errors.
- Reduced motion: forest and floodplain render static compositions; the light still turns (at once).
- Touch and keyboard (`scripts/audit/field-polish-touch.mjs`, Chromium touch emulation over CDP): see §23 of
  `INTERACTION_SYSTEM.md`; all assertions passed.
- Home page: hero code untouched (no file under `components/home` changed); the field-studies index shows the new
  worlds (the leopard cut-out).

## 5. Performance

Measured on this machine only: integrated AMD GPU, headless Chromium `--use-angle=gl`, 1440 × 900, DPR 1, heavily
loaded (swap almost full, other sessions and a live wallpaper running). Frame rates swung widely
between runs here (the unchanged grassland world: 14 to 50 fps), so only differences that repeat count.

- **Controlled** (`field-pass-perf.mjs` with `Q='?hold=1&quality=balanced'`): both trees on dev servers (baseline copy
  :5180, this tree :5181), governor frozen at full quality, alternating runs, two sessions; 7 s scrolling down and 3 s
  back, then 4 s of the hand circling (sun grid redrawn every frame). Medians of four runs.
- **Held** (`field-polish-hold.mjs`): the forest with the camera held on one chapter and the sun turning, three
  alternating pairs.
- **Production** (`field-pass-perf.mjs`, production previews :4302 / :4301, governor live): rung shown, since a run
  that stepped down is not comparable with one that did not.

| Study | Scroll before (runs) | Scroll after (runs) | Δ median | Hand before | Hand after | Δ median |
|---|---|---|---|---|---|---|
| Grassland · bustard | 38.1 · 34.5 · 39.9 · 50.4 → **39.0** | 20.7 · 14.3 · 36.4 · 47.3 → **28.5** | -10.5 | 46.3 | 48.3 | +2.0 |
| Mountain · snow leopard | 21.7 · 51.8 · 48.3 · 49.2 → **48.8** | 47.8 · 27.1 · 53.5 · 37.7 → **42.8** | -6.0 | 59.0 | 41.8 | -17.2 |
| River · dolphin | 51.9 · 56.2 · 59.8 · 59.9 → **58.0** | 46.7 · 57.3 · 59.4 · 60 → **58.3** | +0.3 | 58.6 | 59.9 | +1.2 |
| Forest · tiger | 34 · 38.9 · 60 · 42.2 → **40.5** | 37.5 · 39.3 · 57.7 · 43.4 → **41.3** | +0.8 | 41.2 | 50.3 | +9.1 |
| Floodplain · rhinoceros | 38.5 · 42.4 · 39.9 · 44.9 → **41.1** | 38.3 · 42.4 · 42.1 · 41.6 → **41.9** | +0.7 | 46.3 | 45.8 | -0.5 |

| Forest, held on one chapter, sun turning | Before (runs) | After (runs) | Δ mean |
|---|---|---|---|
| 01 · ground level | 41.3 · 48.2 · 25.4 → **38.3** | 45.8 · 51.3 · 44.6 → **47.2** | +8.9 |
| 04 · over the canopy | 46.1 · 47.6 · 45.7 → **46.5** | 37 · 33.4 · 37.1 → **35.8** | -10.6 |

| Study | Run | Before: scroll / hand (rung) | After: scroll / hand (rung) |
|---|---|---|---|
| Grassland · bustard | 1 | 50.1 / 60 (rung 1) | 54.5 / 59.5 (rung 1) |
|  | 2 | 56.7 / 57.3 (rung 0) | 56.9 / 58.3 (rung 0) |
| Mountain · snow leopard | 1 | 59.8 / 60 (rung 1) | 59.5 / 59.3 (rung 1) |
|  | 2 | 58.6 / 60 (rung 0) | 58.2 / 60 (rung 0) |
| River · dolphin | 1 | 59.8 / 60 (rung 1) | 59.9 / 60 (rung 1) |
|  | 2 | 60 / 60 (rung 1) | 60 / 60 (rung 1) |
| Forest · tiger | 1 | 59.9 / 60 (rung 1) | 60 / 60 (rung 1) |
|  | 2 | 58.9 / 60 (rung 1) | 52.9 / 60 (rung 1) |
| Floodplain · rhinoceros | 1 | 60 / 60 (rung 1) | 60 / 60 (rung 1) |
|  | 2 | 60 / 59.8 (rung 1) | 60 / 60 (rung 1) |

Reading: river, forest and floodplain are level over the whole study. The grassland and mountain medians came out
lower, but neither world's drawing changed (after the foliage options moved behind compile-time defines the grassland
compiles exactly its old shader), their paired runs disagree in direction — a third grassland session, after the
defines change: 23.5 → 38.7, 50.1 → 50.1, 45.8 → 32.8 — and the production runs show them level. No cause was found
and none is claimed either way. The one repeated cost is the forest seen from above — about 10 fps at its
over-canopy chapter at full quality, from the sprays' see-through layers (an on-page toggle of the spray alone shows
it). Cheaper spray variants (dense centres, fuller leaves) either looked like dotted discs or saved nothing and were
dropped. In production that chapter stays under the governor's step threshold on this GPU (a step needs 45 % of
frames over 32 ms). The floodplain's deck is at parity after its noise reads were cut, and it gives up its scud and
then its relief at the governor's first and second steps. Not measured: DPR 2, another GPU, a phone, an idle machine.


## 6. Honest assessment

**Fixed.**

- *Snow leopard edge*: the pale margin is gone in the close and the wide chapters; the fur's own outline meets the
  drawn terrace. It remains the record's photograph, cut out, and the page says so.
- *Dolphin on a phone*: whole and centred in the band between the words at 390 × 844 and 430 × 932; it stays in view
  through the first scroll. Desktop is unchanged; no text was hidden.
- *Touch and keyboard light*: every study can be lit by hand without a mouse; vertical scrolling and pinch-zoom are
  left to the page; listeners are cleaned up.

**Improved, not solved.**

- *Forest canopy*: no longer paper — sprays of small leaves, domed crowns, a broken skyline, foliage instead of floor
  in the gaps. But it costs frame rate in the over-canopy chapter (§5), and shaded crowns facing the camera can show
  their sprays as a pattern of dark leaf shapes.
- *Floodplain cloud*: a slate deck with billowed masses, lit from beneath its sunward edge, a second plane of scud
  and a lighter strip at the horizon; the grass and the rhinoceros stand against a dark sky. It is still a 2D sky
  read in perspective: no true cumulus volumes. Ray marching was not tried — the deck is at parity in cost, and a
  volume would not be. On a machine where the frame governor steps down (as this one often did) the scud goes
  first, then the relief.

**Remaining, and why.**

- The touch light's visible effect differs by world (strong in the forest, subtle in the floodplain and the river),
  because each world keeps the few degrees of reach it already gave the mouse; widening them would change the
  desktop behaviour, which the brief asked to keep.
- Not tested: a real phone or tablet (Chromium touch emulation only), iOS Safari's handling of
  `touch-action: pan-y pinch-zoom`, a second GPU, an idle machine. The machine was swapping throughout (5.2 of 5.7 GB
  swap used), which is why the production numbers swing.
- Pre-existing and left alone: the snow leopard's footage clip is aborted (`net::ERR_ABORTED`) when scrolled past, in
  both builds; on the floodplain's desktop opening the vertical place label sits close to the chapter's first line.

**Regressions found.** In this pass's own work, each fixed before the end: the first spray version cost about 13 fps
over the canopy (cut by fewer leaves and smaller cards; a dense-centre variant was cheaper but read as dotted discs
and was dropped); the touch hint printed over the rhinoceros's scientific name on a phone (moved onto the control's
row); the light's row touched the tiger's and rhinoceros's names on a phone (their names now clear it); the cloud
pattern pinched at the zenith, which the water's reflection reaches (rescaled). The forest floor's sun-flecks changed
with the canopy (one larger pool of light round the tiger, a darker foreground): an intended consequence of the light
coming from what is drawn, noted here because the ground-level opening looks different.

## 7. Scripts

Run with `TMPDIR` on disk. `scripts/audit/field-pass-capture.mjs` (now `MOBILE=1` for a touch phone; production
builds ignore `?hold=1`), `field-pass-perf.mjs` (now `BASE_URL`, `CUR_URL`, `Q`), `field-pass-ablate.mjs` (now `BASE`),
`field-polish-touch.mjs` (touch, keyboard, Tab order, listeners, reduced motion), `field-polish-checks.mjs` (routes,
overflow, errors, home screenshots; `NOGL`, `RM`, `ONLY`), `field-polish-sequence.mjs` (a scroll as settled frames),
`field-polish-hold.mjs` (one chapter held, sun turning, two servers interleaved). The leopard's matte:
`scripts/assets/leopard-matte.py` (needs numpy and OpenCV).
