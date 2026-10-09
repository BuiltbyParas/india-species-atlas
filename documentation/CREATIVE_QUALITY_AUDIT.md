# Creative quality audit (10 October 2026)

Scope: desktop only. Branch `atlas/master-04-visual-quality`, starting at `16afae0`. One headed Chromium 153 (Playwright), default flags, one session at a time, 1440 × 900 for every capture. The machine is a 6 GB laptop with integrated AMD graphics; see §7 for the load it was under.

Everything below is either marked **observed** (seen in a captured frame or measured in the page) or **interpretation** (my reading, not tested). Screenshots are in `scripts/audit/out/creative/` (untracked, 21 MB, 162 files): `before-1440-*` and `after-1440-*` walks of the home page and every chapter of all five studies, `settled-*` frames taken three seconds after scrolling stopped, `sheet-*` contact sheets. The reference captures are in the session scratchpad and are not kept in the repository.

---

## 1. Reference study

### What I could and could not test

| Site | Loaded | What I actually did | Limits |
|---|---|---|---|
| mariavasilyeva.com | yes | Load, 6 s idle, three wheel steps of 700 px; screenshots at each | Did not test the menu, the sound toggle, project pages, cursor or hover states |
| unitedcarriers.com | yes | Same | Did not test the menu, the buttons or the live tracking portal |
| jesperlandberg.com | yes | Same | Did not click into a project; did not test the grid view ("Featured / Full") |
| edolus.com | yes, slowly | Loader took about 60 s here before "Initiate system"; then entered with the button and scrolled three steps | The loader ran at 0 → 100 % over a minute on this machine and connection; I cannot say how it behaves elsewhere. Audio not enabled |
| santionispirits.com | yes | Passed the age gate (YES), saw the title card and the first two illustrated scenes | Did not go past the second scene |
| lusion.co, xix3d.com/zeno | yes | Loaded, scrolled; used for fonts, canvas and video counts only | Not studied further |

No third-party descriptions were used. No hover, cursor, focus or reduced-motion behaviour on any reference was tested, so none is claimed.

### Reference matrix

| Reference | Observed technique | Why it works (interpretation) | Where it could fit in the Atlas | Risk | Priority |
|---|---|---|---|---|---|
| Maria Vasilyeva | Thin black rails on both edges carry the name, menu, sound state and a vertical credit; the work is a horizontal strip with a centre cursor line, and the image cluster in front of the line grows as it nears it. Scribbled "Scroll", "More details" annotations. Page is light with hairline horizontal rules | The furniture is outside the picture, so the work has the whole centre; a single line tells you where "now" is | The Atlas already has rails (header, progress line, coordinates). The lesson is the one fixed reading line, not the rails | Low | P3 (nothing to add; confirms the progress line is the right idea) |
| United Carriers | Headline set in one heavy extended face; lines reveal by a left-to-right colour sweep tied to scroll; sky-to-white gradient is the section change; big numerals (2,500+, 98.2 %) on hairline rows | The reveal is attached to scroll position, so reading speed is scroll speed. Section change is a colour, not a wipe | The numerals-on-rules pattern already exists in the tiger and rhinoceros chapters. The scroll-tied reveal could be tried on the study title only | Medium: a per-line mask over a WebGL page costs layout work | P3 |
| Jesper Landberg | Projects are curved panels on a perspective grid floor in a black room; a pointer-driven scroll moves the strip; the title sits on the panel, the controls are two 9 px labels at the corners | One metaphor for the whole site; type is tiny and out of the way, so the work is the interface | Not for the Atlas: the grid room would replace the habitat metaphor. Useful only as proof that 9 px corner labels are enough furniture | High if copied | Do not adopt |
| Edolus | Loader is the wordmark with a percentage underneath, then a full-bleed video of the Earth, a single light-weight headline and one boxed button; later scenes are full-bleed renders with chromatic fringing on the edges | One thing on screen at a time; the button gives the user the start | The Atlas intro is already a quiet map sequence. The "user starts the film" button is the idea; sound is not added (see constraints) | Medium: a gate costs a click on every visit | P3 |
| Santioni Spirits | Age gate styled as a title card; the second scene is a hand-inked plate with a stroke reveal; the header shrinks to a small logo and a three-item box once you are in | The gate and the loader are the first scene, not a barrier. The inked plates are consistent: one drawing language | The Atlas photo cut-outs are the one place where two languages meet (photograph and drawn world); the feathered edge is how that seam is handled | n/a | P1 for the seam, below |

### Principles taken (not copied)

1. **One fixed reading line, furniture at the edge.** The Atlas has it; what was wrong is that the furniture did not always stay out of the way of the words (§3.2).
2. **The header must belong to the picture behind it.** Every reference keeps its header the same tone as its current section. The Atlas did it for one habitat only (§3.1).
3. **The seam between two media is the whole quality of the page.** Santioni's plates and the Atlas photo cut-outs both live or die on the edge (§3.3).
4. **Nothing is added to make it look expensive.** Edolus and Maria Vasilyeva are quiet for most of the scroll.

---

## 2. What the Atlas already does well (preserve)

- The five habitats are distinct in light and colour (sand, snow-blue, grey-green river, dark forest, floodplain), and share one type system (a high-contrast serif for words, a small grotesque for labels).
- The chapter structure (title, numbered kicker, one paragraph, sources) reads the same in all five studies.
- The progress line, anchor coordinates and "Field studies" exit are the same four pieces of furniture everywhere.
- The bustard study's header was already tuned to its world (ink type on a sand veil); that is the pattern §3.1 extends.
- Stage behaviour under hard use is good: 10/10 probes in the five-study sequence; fast, reversed and zig-zag scrolling leave every study on its own world with the chapter following the page (§6).

---

## 3. Reproduced problems

Ratings: V = visual impact, U = user-experience impact, R = technical risk of fixing, E = effort, C = confidence the fix helps. H/M/L.

### 3.1 The header does not follow the world (P1, **fixed**)

- **Observed:** on the snow leopard, dolphin and rhinoceros studies (all light worlds) the header keeps pale type. At the top of the page the wordmark and links are pale on a pale sky (`before-1440-ganges-river-dolphin-a0.jpg`). After 40 px of scroll a near-black veil (`forest-950`) drops in, a hard dark bar across a light world (`before-1440-snow-leopard-c3.jpg`). The bustard study does not do this because `field.css` flipped the header to ink only for `data-env='thar'`.
- **Cause (code):** `field.css` had one rule, for `thar`.
- **V H · U H · R L · E S · C H.**
- **Change:** `src/components/field/field.css`. The same rule now covers `himalaya`, `river` and `floodplain`, each with that world's own ink and ground (`#14222e`/`#dfe8f1`, `#16221f`/`#dde0cf`, `#1f2417`/`#d8dabe`). The forest keeps its dark veil. It applies on the home page index too, where these environments are declared per panel.
- **Verified:** `after-1440-*` frames for snow leopard and dolphin; computed header colour is ink under reduced motion (`rgb(20, 34, 46)` and `rgb(22, 34, 31)`).

### 3.2 Fixed furniture overprints the chapter text (P1, **fixed**)

- **Observed (settled, three seconds after the scroll stopped):** in the tiger "Reserves" chapter the fixed anchor caption ("Bandhavgarh Tiger Reserve, 23°42′N 81°02′E") prints directly over the last row of the reserves list (`settled-tiger3-b1.jpg`). In the rhinoceros "Pressure" chapter, body text runs through the progress label and line (`settled-rhino2-after.jpg` before the change). The existing foot gradient was about 60 % opaque at the label's height and covers the whole width only 6 rem high.
- **Measured:** `scripts/audit/creative-collide.mjs` found text boxes meeting the progress line, HUD or exit in dolphin ch 2, 4, 5; tiger ch 3, 4, 5; rhinoceros ch 2, 3, 4, 6; snow leopard ch 3, 6. I only claim the two I looked at in a settled frame. The "below-fold" lines that script prints are not defects (chapters are taller than the screen) and the credit hits were the credit overlapping itself; both are ignored.
- **V M · U H · R L · E S · C H.**
- **Change:** `field.css`, `.fs-hud-layer::before`. The foot is now denser (solid to 68 % of 6.4 rem, 0.97 opacity) and a soft corner plate (34 rem × 14 rem radial) sits behind the coordinates and the exit link, so a list scrolling through that corner is gone before it reaches them.
- **Trade-off:** the foot band is a little heavier. On the tiger it reads as the forest floor; on the light worlds it is the world's own ground colour. Text passing under it now fades earlier by design, which was already the intent of the existing comment.
- **Not fixed:** a chapter arrives low (its first lines sit around y = 730 at the moment it becomes current) so on short viewports its second line is already in the fade. This is chapter choreography, not a collision, and changing it affects all five studies; recorded as P2.

### 3.3 Hard vertical seam on the snow leopard photograph (P1, **improved**)

- **Observed:** in the Distribution chapter the photograph ends in a straight vertical edge at about x = 800 against the drawn slope (`before-1440-snow-leopard-c3.jpg`). The right feather in the panel shader was 17 % of the width.
- **V M · U L · R M (shader, one number) · E S · C M.**
- **Change:** `src/world/field/worlds/himalaya.ts`, `sideR` feather 0.17 → 0.27 and its jitter 0.4 → 0.5. The tail still runs whole (the foot rule at `vUv.x > 0.6` is unchanged). Checked in chapters 2 and 4 (`settled-leopard1-feather.jpg`, `settled-leopard3-feather.jpg`): the edge dissolves into the slope.
- **Not tested:** the other chapters of this study at other camera positions beyond the two above. The bustard, dolphin and rhinoceros panels have their own shaders and were not changed.

### 3.4 The stage gives up and never comes back (P0/P1, **fixed in the lifecycle checkpoint, 10 October: see MASTER_04_PROGRESS §15**)

> **Update:** the cause is understood and fixed (the governor judged the dissolve's frames). The idle retry proposed below was **not** built: the evidence shows no retry is needed. The text that follows is the earlier, superseded analysis.

- **Observed:** `MODE=video node scripts/audit/accept.mjs` (play and pause the snow leopard clip, go home, come back, play, Next to the dolphin, Back). On this machine, as loaded now (§7), the final two probes failed in most runs (six of eight in total), on unmodified `16afae0` as well as after my changes: after Next the stage reports `status=flat`, `failed=true`, `rung=2`, and after Back the snow leopard page shows the dolphin's last frame with `mode=off`. Console output: none. Context losses: 0. In the runs that pass, `rung` is 1 before the clip plays and 2 while it plays.
- **Cause (code):** the frame governor steps the stage down twice and then, on persistently slow windows, calls `fail()`. After `fail()` the stage never recovers in that page session; `getFieldStage()` returns null. That is by design (the page shows photographs), but a transient load (video decode plus a river-world build) can end the WebGL experience permanently.
- **I tried:** ignoring the frames after a world build (`governor.reset(6)` once the world is compiled and warmed). Pass rate was no better (1 of 3 runs passed with it; 1 of 4 without), so the change was reverted. I am not claiming a fix.
- **V H · U H · R H · E M · C unknown.**
- **Proposal (not implemented, trade-off documented):** let a failed governor retry once after the page has been idle (no scroll for 4 s and the video paused) by reinstating the layer at the lowest rung. This touches the stage's lifecycle and the five studies' `status` handling, so it needs its own checkpoint. A smaller option is to drop to a lower pixel ratio floor before giving up. Neither is tested.
- **What I did change:** `window.__atlasField()` now also reports `rung`, and the acceptance scripts print it; the video mode asserts play/pause state and exits non-zero on a problem.
- **Correction to earlier documentation:** `MASTER_04_PROGRESS.md` §13 reported "Next to the dolphin and Back while the clip had just played: Both stages draw their own world". The script then only logged; it did not assert. That row should be read as "passed once, not reproducible".

### 3.5 Other observations (P2/P3, recorded not changed)

- **P2 · Chapter text enters low.** See 3.2. The arrival position is a choreography choice; changing it should be done for all five at once with the progress calculation in `FieldStudyPage.tsx`.
- **P2 · Home index composites.** The home index panels reuse the study stage; the snow leopard panel's title is behind the cut-out in one frame (`before-1440-home-s5.jpg` family) and the index is the only place the five worlds are seen together. Not investigated beyond the screenshot.
- **P3 · Tiger corner ghost.** After the fix a very faint trace of the list's last coordinate row remains under the anchor caption; it is below legibility but not zero.
- **Not reproduced (and so not listed as defects):** a header sitting 340 px down the page and a dark band above it (`before-1440-home-s6.jpg`) appeared in one frame of a headed capture while Lenis was still moving. Re-run with 2.2 s settle times the header was at `top: 0` in all fourteen steps. A study opening on chapter 3 after a long home scroll appeared in one frame; direct navigation from a scrolled home page gave `scrollY = 0` and chapter 0 in every test.

---

## 4. Ranked opportunities

| # | Change | Class | V | U | R | E | C | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | Header follows the world on all light habitats | P1 | H | H | L | S | H | Done |
| 2 | HUD and progress stay clear of chapter text | P1 | M | H | L | S | H | Done |
| 3 | Snow leopard photograph edge | P1 | M | L | M | S | M | Done (two chapters checked) |
| 4 | Stage retries after give-up when idle | P0/P1 | H | H | H | M | ? | Proposed, not built |
| 5 | Chapter arrives higher on short screens | P2 | M | M | M | M | M | Proposed |
| 6 | Study title reveal tied to scroll (United Carriers idea, one element only) | P3 | M | L | M | M | L | Not proposed for now |
| 7 | Hero "start" gate as on Edolus | P3 | L | L | M | S | L | No: costs a click per visit |

Real wildlife media: the one clip (snow leopard camera trap, CC BY 3.0, 313 KB, panel in the Photograph chapter) stays as it is. No other clip was found that is suitable and licensed for the dolphin or rhinoceros (see `src/assets/field/CREDITS.md`). I did not add video.

---

## 5. Performance and regression risks

- CSS only for 1 and 2: the HUD foot is one pseudo-element with a radial and a linear gradient; no layout or JavaScript added.
- Shader change for 3 is one constant in one fragment shader; no extra texture or pass.
- No dependencies added. No change to the stage's lifecycle.
- Risk I have not closed: item 4. Results under load differ run to run, so any change to the governor needs measurement on an idle machine (§7).

## 6. Verification run (after changes)

All at 1440 × 900, headed Chromium 153, default flags, `vite preview` serving the fresh build:

| Check | Result |
|---|---|
| `tsc -b` | 0 errors |
| `npm run build` | passes |
| Five studies in sequence with Next and scroll to the end (`accept.mjs seq`) | 10/10 probes OK, 0 context losses, no console output. `rung` reached 2 on the rhinoceros step |
| Fast down, fast up, zig-zag, with settles, bustard / rhinoceros / tiger (`creative-scroll.mjs`) | 15/15 OK; chapter follows the page; no failed stage |
| Direct entry to each study, then the walk of every chapter (`creative-walk.mjs`) | All five render; console empty |
| Rhinoceros revisit | In the sequence and in the scroll test: shows its own world, not failed |
| Snow leopard clip play/pause ×4, away and back, play again | Each probe OK; clip `PLAYING`, `err=0` in the runs where it was asserted |
| Same run, last step (Next to the dolphin and Back) | **Fails in most runs** on this machine under load (also on `16afae0`); see 3.4 |
| Reduced motion | Header flips to ink on the snow leopard and the dolphin; study stays `ready`; no console output |

Not verified: Chrome stable, other GPUs, DPR 2, any run on an idle machine, the 1280 × 800 and 1920 × 1080 sizes (captured only at 1440 × 900), media-failure fallback beyond what §12.3 of the progress doc already recorded.

## 7. Environment during this work

Swap was in use (about 2.4 GB of 5.7 GB), load average about 3.4 with nothing of mine running, and a live-video wallpaper process (`hidamari-player-1`) was running on the same integrated GPU. I did not stop it. Frame-rate-dependent results (the governor's `rung`, any "failed" stage) must be read with that in mind.

## 8. Staged plan from here

1. Re-run `MODE=video accept.mjs` three times on an idle machine and record the pass rate. If it passes cleanly, item 4 drops to P2; if not, build the idle retry in its own branch.
2. Chapter arrival height (item 5), all five studies together, measured with `creative-collide.mjs`.
3. Capture 1280 × 800 and 1920 × 1080 of the same chapters (`W=1280 H=800 node scripts/audit/creative-walk.mjs`) and compare.
